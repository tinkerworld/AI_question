/**
 * ExamOS Human Simulation Agent
 * Runs realistic persona-driven test scenarios and monitors for UI, UX, and functional defects.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PERSONAS } = require('./personas');
const { Humanizer } = require('./humanizer');

async function runSimulation(options = {}) {
  const {
    targetUrl = 'http://localhost:3000',
    personaId = 'careful',
    headless = true,
    email = 'student@examos.com',
    password = 'Student@123',
    maxQuestions = 5,
    onEvent = () => {},
    simId = `sim_${Date.now()}`
  } = options;

  const persona = PERSONAS[personaId] || PERSONAS.careful;
  const reportsDir = path.join(__dirname, 'reports', simId);
  const screenshotsDir = path.join(reportsDir, 'screenshots');

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const report = {
    simulationId: simId,
    persona: persona.id,
    targetUrl,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'RUNNING',
    metrics: {
      questionsAttempted: 0,
      totalQuestions: 0,
      deadClicks: 0,
      consoleErrors: [],
      networkFailures: [],
      proctoringAlertsTriggered: 0
    },
    issues: [],
    timeline: [],
    screenshots: []
  };

  const broadcastEvent = (event) => {
    report.timeline.push(event);
    onEvent(event);
  };

  broadcastEvent({
    type: 'SIM_START',
    message: `Starting human simulation using persona: ${persona.name}`,
    persona: persona.id
  });

  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 30
  });

  const context = await browser.newContext({
    viewport: persona.viewport,
    recordVideo: { dir: path.join(reportsDir, 'video') }
  });

  const page = await context.newPage();
  const human = new Humanizer(page, persona, broadcastEvent);

  // Monitor Console Errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      report.metrics.consoleErrors.push({ text, timestamp: new Date().toISOString() });
      broadcastEvent({ type: 'CONSOLE_ERROR', message: text, severity: 'ERROR' });
    }
  });

  // Monitor Page Crashes / Uncaught Exceptions
  page.on('pageerror', (err) => {
    report.issues.push({
      type: 'UNCAUGHT_EXCEPTION',
      severity: 'CRITICAL',
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    broadcastEvent({ type: 'CRASH', message: err.message, severity: 'CRITICAL' });
  });

  // Monitor Failed Network Requests
  page.on('requestfailed', (req) => {
    report.metrics.networkFailures.push({
      url: req.url(),
      failure: req.failure() ? req.failure().errorText : 'Failed',
      timestamp: new Date().toISOString()
    });
  });

  try {
    // Step 1: Open Target URL
    broadcastEvent({ type: 'NAVIGATE', message: `Navigating to ${targetUrl}` });
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
      await page.goto(targetUrl);
    });

    // Step 2: Login Flow
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const isLoginVisible = await emailInput.isVisible({ timeout: 4000 }).catch(() => false);

    if (isLoginVisible) {
      broadcastEvent({ type: 'AUTH', message: `Logging in as ${email}` });
      await human.humanType(emailInput, email, 'Email Field');
      const passInput = page.locator('input[type="password"], input[name="password"]').first();
      await human.humanType(passInput, password, 'Password Field');

      const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first();
      await human.humanClick(submitBtn, 'Sign In Button');
      await page.waitForTimeout(1500);
    }

    // Step 3: Navigate to Student Exams / Assessment Tab
    const examTab = page.locator('#nav-tab-student_exams, a:has-text("My Exams"), button:has-text("Exams"), [data-tab="exams"]').first();
    if (await examTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await human.humanClick(examTab, 'Exams Tab');
      await page.waitForTimeout(1000);
    }

    // Step 4: Open Exam Instructions / Start Assessment
    const startBtn = page.getByRole('button', { name: /Read Instructions|Resume In-Progress|Take Exam|Start/i }).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await human.humanClick(startBtn, 'Start / Resume Exam');
      await page.waitForTimeout(1000);
    }

    // Step 5: Handle Instructions Modal
    const modalHeading = page.locator('text=Exam Hall Instructions, text=Instructions').first();
    if (await modalHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      broadcastEvent({ type: 'INSTRUCTIONS', message: 'Reading exam instructions modal...' });
      await human.humanReadingPause(modalHeading);

      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await human.humanClick(checkbox, 'Terms Agreement Checkbox');
      }

      const enterBtn = page.getByRole('button', { name: /Enter Exam Hall|Begin Exam|Continue/i }).first();
      if (await enterBtn.isVisible().catch(() => false)) {
        await human.humanClick(enterBtn, 'Enter Exam Hall Button');
        await page.waitForTimeout(1500);
      }
    }

    // Step 6: Verify Exam Hall UI Elements
    await page.waitForSelector('#exam-header, #exam-question-card, .question-container', { timeout: 8000 }).catch(() => {});

    // Step 7: Answer Questions with Human Behavior
    for (let qIndex = 1; qIndex <= maxQuestions; qIndex++) {
      broadcastEvent({ type: 'QUESTION_START', message: `Examining Question ${qIndex}` });

      // Read question text
      const questionTextEl = page.locator('#exam-question-pane, .question-text, .prompt-text').first();
      if (await questionTextEl.isVisible().catch(() => false)) {
        await human.humanReadingPause(questionTextEl);
      }

      // Check if user is testing Proctoring / Cheating triggers
      if (persona.testTabSwitch && qIndex === 2) {
        await human.simulateTabDefocus(2500);
        report.metrics.proctoringAlertsTriggered++;
      }

      if (persona.testCopyPaste && qIndex === 3) {
        await human.simulateForbiddenShortcut();
      }

      // Interact with Answer Options (MCQ Radio, Checkbox, or Text Area)
      const options = page.locator('input[type="radio"], input[type="checkbox"], label:has(input[type="radio"]), .option-item');
      const optionCount = await options.count().catch(() => 0);

      if (optionCount > 0) {
        if (persona.optionFlipCount && persona.optionFlipCount > 1) {
          // Hesitant user: Selects option A, hesitates, then changes to option B
          const firstChoice = options.first();
          await human.humanClick(firstChoice, 'First Option Choice (Hesitation Test)');
          await page.waitForTimeout(1000);

          const secondChoice = options.nth(Math.min(1, optionCount - 1));
          await human.humanClick(secondChoice, 'Final Option Choice');
        } else {
          // Choose random option
          const chosenIdx = Math.floor(Math.random() * optionCount);
          const chosenOption = options.nth(chosenIdx);
          await human.humanClick(chosenOption, `Option ${chosenIdx + 1}`);
        }
      } else {
        // Look for text response input
        const textarea = page.locator('textarea, [contenteditable="true"]').first();
        if (await textarea.isVisible().catch(() => false)) {
          await human.humanType(textarea, 'ExamOS automated response verifying answer state persistence.', 'Answer Text Area');
        }
      }

      report.metrics.questionsAttempted++;

      // Take snapshot of question state
      const snapPath = path.join(screenshotsDir, `q_${qIndex}_answered.png`);
      await page.screenshot({ path: snapPath });
      report.screenshots.push(snapPath);

      // Click "Next" or "Save & Next"
      const nextBtn = page.getByRole('button', { name: /Save & Next|Next Question|Next/i }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await human.humanClick(nextBtn, 'Save & Next Button');
        await page.waitForTimeout(1000);
      } else {
        broadcastEvent({ type: 'INFO', message: 'No Next button found; may have reached end of exam section.' });
        break;
      }
    }

    // Step 8: Complete & Submit
    const submitExamBtn = page.getByRole('button', { name: /Submit Exam|Finish Test|Complete/i }).first();
    if (await submitExamBtn.isVisible().catch(() => false)) {
      broadcastEvent({ type: 'SUBMIT', message: 'Submitting finalized exam...' });
      await human.humanClick(submitExamBtn, 'Submit Exam Button');
      await page.waitForTimeout(1500);

      const confirmModalBtn = page.getByRole('button', { name: /Yes, Submit|Confirm/i }).first();
      if (await confirmModalBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await human.humanClick(confirmModalBtn, 'Confirm Submission Dialog Button');
      }
    }

    report.status = report.issues.length === 0 ? 'PASSED' : 'PASSED_WITH_ANOMALIES';
    broadcastEvent({ type: 'SIM_FINISH', message: `Simulation completed with status: ${report.status}` });

  } catch (error) {
    report.status = 'FAILED';
    report.issues.push({
      type: 'SIMULATION_ERROR',
      severity: 'HIGH',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    const errorScreenshot = path.join(screenshotsDir, 'failure_state.png');
    await page.screenshot({ path: errorScreenshot }).catch(() => {});
    report.screenshots.push(errorScreenshot);

    broadcastEvent({ type: 'SIM_ERROR', message: `Simulation error: ${error.message}`, severity: 'HIGH' });
  } finally {
    report.completedAt = new Date().toISOString();
    await context.close();
    await browser.close();

    // Save JSON report file
    const reportFile = path.join(reportsDir, 'report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    broadcastEvent({ type: 'REPORT_SAVED', reportPath: reportFile });
  }

  return report;
}

// Allow CLI direct execution: node exam-simulation-agent.js --persona=careful
if (require.main === module) {
  const args = process.argv.slice(2);
  const personaArg = args.find(a => a.startsWith('--persona='))?.split('=')[1] || 'careful';
  const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1] || 'http://localhost:3000';
  const headlessArg = !args.includes('--headful');

  console.log(`\nLaunching ExamOS Human Simulation Agent [Persona: ${personaArg}]...`);
  runSimulation({
    targetUrl: targetArg,
    personaId: personaArg,
    headless: headlessArg,
    onEvent: (e) => console.log(`[${e.timestamp.slice(11, 19)}] [${e.type}] ${e.message}`)
  }).then((rep) => {
    console.log(`\nSimulation Finished with Status: ${rep.status}`);
    console.log(`Questions Attempted: ${rep.metrics.questionsAttempted}`);
    console.log(`Issues Encountered: ${rep.issues.length}`);
  });
}

module.exports = { runSimulation };
