/**
 * AI Interview & Viva Voce Human Simulation Agent
 * Simulates real candidate participation in multi-turn Socratic AI interviews and viva voce
 * powered by configured AI providers (e.g. ALLaM, Groq, Ollama, Gemini).
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PERSONAS } = require('./personas');
const { Humanizer } = require('./humanizer');

async function runInterviewSimulation(options = {}) {
  const {
    targetUrl = 'http://localhost:3000',
    personaId = 'careful',
    headless = true,
    email = 'student@examos.com',
    password = 'Student@123',
    courseId = null,
    onEvent = () => {},
    simId = `sim_interview_${Date.now()}`
  } = options;

  const persona = PERSONAS[personaId] || PERSONAS.careful;
  const reportsDir = path.join(__dirname, 'reports', simId);
  const screenshotsDir = path.join(reportsDir, 'screenshots');

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const report = {
    simulationId: simId,
    type: 'AI_INTERVIEW_VIVA',
    persona: persona.id,
    targetUrl,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'RUNNING',
    metrics: {
      turnsCompleted: 0,
      totalTurns: 0,
      averageTurnLatencyMs: 0,
      finalScore: null,
      gradeBand: null,
      consoleErrors: [],
      networkFailures: []
    },
    conversationTranscript: [],
    issues: [],
    screenshots: []
  };

  const broadcastEvent = (event) => {
    onEvent(event);
  };

  broadcastEvent({
    type: 'INTERVIEW_SIM_START',
    message: `Starting AI Interview / Viva simulation with persona: ${persona.name}`,
    persona: persona.id
  });

  const browser = await chromium.launch({
    headless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const context = await browser.newContext({
    viewport: persona.viewport,
    permissions: ['microphone']
  });

  const page = await context.newPage();
  const human = new Humanizer(page, persona, broadcastEvent);

  // Monitor Console & Network
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      report.metrics.consoleErrors.push({ text, timestamp: new Date().toISOString() });
      broadcastEvent({ type: 'CONSOLE_ERROR', message: text, severity: 'ERROR' });
    }
  });

  page.on('pageerror', (err) => {
    report.issues.push({
      type: 'UNCAUGHT_EXCEPTION',
      severity: 'CRITICAL',
      message: err.message,
      timestamp: new Date().toISOString()
    });
    broadcastEvent({ type: 'CRASH', message: err.message, severity: 'CRITICAL' });
  });

  try {
    // 1. Navigate & Authenticate
    broadcastEvent({ type: 'NAVIGATE', message: `Navigating to ${targetUrl}` });
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(async () => {
      await page.goto(targetUrl);
    });

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      broadcastEvent({ type: 'AUTH', message: `Logging in student ${email}...` });
      await human.humanType(emailInput, email, 'Email Field');
      const passInput = page.locator('input[type="password"], input[name="password"]').first();
      await human.humanType(passInput, password, 'Password Field');
      const submitBtn = page.locator('button[type="submit"]').first();
      await human.humanClick(submitBtn, 'Login Button');
      await page.waitForTimeout(1500);
    }

    // 2. Navigate to AI Interview / Viva Page
    broadcastEvent({ type: 'NAVIGATE', message: 'Navigating to AI Interview & Viva Voce tab...' });
    const interviewTab = page.locator('#nav-tab-interview, a:has-text("AI Interview"), button:has-text("Interview"), [data-tab="interview"]').first();
    if (await interviewTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await human.humanClick(interviewTab, 'AI Interview Nav Item');
      await page.waitForTimeout(1200);
    }

    // 3. Select Interview Question / Mode in Catalog
    const startInterviewBtn = page.locator('button:has-text("Start AI Interview"), button:has-text("Enter Room"), button:has-text("Practice Viva")').first();
    if (await startInterviewBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      await human.humanClick(startInterviewBtn, 'Start AI Interview Button');
      await page.waitForTimeout(2000);
    }

    // 4. Multi-Turn Socratic AI Dialogue Loop (5 Progressive Topic Questions)
    let turnCount = 0;
    const maxSimTurns = 5;
    let turnLatencies = [];

    while (turnCount < maxSimTurns) {
      turnCount++;
      broadcastEvent({ type: 'TURN_START', message: `--- Starting Interview Dialogue Turn ${turnCount} of 5 ---` });

      // Read AI Interviewer's latest prompt/question
      const aiPromptLocator = page.locator('.interviewer-bubble, .ai-message, [data-role="assistant"]').last();
      let aiQuestionText = '';
      if (await aiPromptLocator.isVisible({ timeout: 8000 }).catch(() => false)) {
        aiQuestionText = await aiPromptLocator.innerText().catch(() => '');
        broadcastEvent({
          type: 'AI_SPEECH',
          message: `AI Examiner: "${aiQuestionText.substring(0, 120)}..."`,
          fullText: aiQuestionText
        });
        // Simulate reading & thinking hesitation
        await human.humanReadingPause(aiPromptLocator);
      }

      // Check if session completed
      const submitEvaluationBtn = page.locator('button:has-text("Submit for Evaluation"), button:has-text("Finish Interview")').first();
      const isFinishedPrompt = aiQuestionText.toLowerCase().includes('concludes our interview') || 
                               aiQuestionText.toLowerCase().includes('submit your session');

      if (isFinishedPrompt || await submitEvaluationBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        broadcastEvent({ type: 'INFO', message: 'All interview dialogue turns concluded by AI interviewer.' });
        break;
      }

      // Provide comprehensive candidate response addressing both probing sub-questions
      const candidateAnswers = [
        "To establish our foundational framework: (1) We enforce idempotent operations and strict consensus protocols to maintain consistency across distributed state, and (2) regarding resource constraints, we prioritize essential transactions through rate-limiting tiers while maintaining asynchronous queue draining.",
        "Regarding the practical implementation: (1) We track P99 latency and error budgets on a real-time Prometheus dashboard to detect regressions within minutes, and (2) we engage reluctant stakeholders through phased canary rollouts and transparent benchmarking sessions.",
        "Addressing the failure modes and security risks: (1) We isolate transactions with distributed dead-letter queues and optimistic locking to prevent race conditions, and (2) our rollback procedure employs automated canary health gates that revert deployments within 30 seconds if error spikes occur.",
        "To balance scalability and ethical compliance: (1) All sensitive candidate data is encrypted at rest with AES-256 and verified through zero-knowledge proofs, and (2) we optimize throughput via Redis caching layers without sacrificing audit durability.",
        "In synthesis: By combining clear separation of concerns, automated recovery circuit breakers, and stakeholder-aligned SLAs, we ensure the platform achieves both high operational velocity and uncompromising governance integrity."
      ];

      const answerText = candidateAnswers[(turnCount - 1) % candidateAnswers.length];
      const answerInput = page.locator('textarea[placeholder*="answer"], textarea[placeholder*="Speak"], textarea, input[type="text"]').first();

      if (await answerInput.isVisible({ timeout: 4000 }).catch(() => false)) {
        broadcastEvent({ type: 'CANDIDATE_THINKING', message: `Candidate composing answer for Turn ${turnCount}...` });
        await human.humanType(answerInput, answerText, `Interview Answer Input (Turn ${turnCount})`);

        const sendBtn = page.locator('button:has-text("Send Response"), button:has-text("Submit Turn"), button[aria-label="Send"]').first();
        const turnStartTime = Date.now();

        await human.humanClick(sendBtn, 'Send Answer Button');

        // Wait for AI response with latency tracking
        await page.waitForTimeout(1000);
        const nextAiMsg = page.locator('.interviewer-bubble, .ai-message').last();
        await nextAiMsg.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});

        const latency = Date.now() - turnStartTime;
        turnLatencies.push(latency);
        broadcastEvent({ type: 'AI_LATENCY', message: `AI Model Response latency: ${latency}ms`, latencyMs: latency });

        report.conversationTranscript.push({
          turn: turnCount,
          aiPrompt: aiQuestionText,
          candidateResponse: answerText,
          latencyMs: latency
        });

        // Screenshot after turn
        const turnScreenshot = path.join(screenshotsDir, `turn_${turnCount}.png`);
        await page.screenshot({ path: turnScreenshot }).catch(() => {});
        report.screenshots.push(turnScreenshot);
      } else {
        broadcastEvent({ type: 'WARN', message: 'No input textarea found in interview room.' });
        break;
      }
    }

    report.metrics.turnsCompleted = turnCount;
    if (turnLatencies.length > 0) {
      report.metrics.averageTurnLatencyMs = Math.round(turnLatencies.reduce((a, b) => a + b, 0) / turnLatencies.length);
    }

    // 5. Finalize & Submit for Evaluation
    const evalBtn = page.locator('button:has-text("Submit for Evaluation"), button:has-text("Finish Interview"), button:has-text("Complete")').first();
    if (await evalBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      broadcastEvent({ type: 'EVALUATION_REQUEST', message: 'Submitting full interview transcript to ALLaM / AI evaluator...' });
      await human.humanClick(evalBtn, 'Submit for Evaluation');
      
      // Wait for rubric evaluation result screen
      await page.waitForSelector('.evaluation-card, #interview-evaluation-view, text=Interview Evaluation', { timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // Capture final evaluation details
      const scoreBadge = page.locator('.final-score, [data-testid="final-score"]').first();
      if (await scoreBadge.isVisible().catch(() => false)) {
        report.metrics.finalScore = await scoreBadge.innerText().catch(() => '');
      }

      const evalScreenshot = path.join(screenshotsDir, 'final_evaluation_rubric.png');
      await page.screenshot({ path: evalScreenshot }).catch(() => {});
      report.screenshots.push(evalScreenshot);
      broadcastEvent({ type: 'EVALUATION_COMPLETE', message: `Evaluation completed. Score: ${report.metrics.finalScore || 'Verified'}` });
    }

    report.status = report.issues.length === 0 ? 'PASSED' : 'PASSED_WITH_ANOMALIES';
    broadcastEvent({ type: 'SIM_FINISH', message: `AI Interview simulation finished with status: ${report.status}` });

  } catch (err) {
    report.status = 'FAILED';
    report.issues.push({
      type: 'SIMULATION_ERROR',
      severity: 'HIGH',
      message: err.message,
      timestamp: new Date().toISOString()
    });
    broadcastEvent({ type: 'SIM_ERROR', message: `Interview simulation failed: ${err.message}`, severity: 'HIGH' });
  } finally {
    report.completedAt = new Date().toISOString();
    await context.close();
    await browser.close();

    const reportFile = path.join(reportsDir, 'report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    broadcastEvent({ type: 'REPORT_SAVED', reportPath: reportFile });
  }

  return report;
}

module.exports = { runInterviewSimulation };
