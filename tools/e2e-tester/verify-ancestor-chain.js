const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('================================================================');
  console.log('  APP.TSX ANCESTOR CHAIN & EXAM PLAYER COMPUTED HEIGHT VERIFICATION');
  console.log('================================================================\n');

  // 1. Log in as Student
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'student@examos.com');
  await page.fill('input[type="password"]', 'Student@123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#nav-tab-student_exams', { timeout: 10000 });

  // 2. Open assessment and enter exam hall
  await page.click('#nav-tab-student_exams');
  await page.waitForTimeout(1000);

  const startOrResumeBtn = page.getByRole('button', { name: /Read Instructions|Resume In-Progress|Retake/i }).first();
  await startOrResumeBtn.click();
  await page.waitForTimeout(800);

  const modalHeading = page.locator('text=Exam Hall Instructions');
  if (await modalHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
    await enterBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.waitForSelector('#app-root', { timeout: 10000 });
  await page.waitForSelector('#app-dashboard-row', { timeout: 10000 });
  await page.waitForSelector('#app-main', { timeout: 10000 });
  await page.waitForSelector('#exam-header', { timeout: 10000 });
  await page.waitForSelector('#exam-question-card', { timeout: 10000 });
  await page.waitForSelector('#exam-palette-sidebar', { timeout: 10000 });

  async function inspectFullChain(label) {
    const data = await page.evaluate(() => {
      function getComputed(selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          selector,
          computedHeight: style.height,
          computedMinHeight: style.minHeight,
          computedMaxHeight: style.maxHeight,
          boundingHeight: rect.height,
          boundingWidth: rect.width,
          x: rect.x,
          y: rect.y,
        };
      }

      return {
        appRoot: getComputed('#app-root'),
        dashboardRow: getComputed('#app-dashboard-row'),
        appMain: getComputed('#app-main'),
        examHeader: getComputed('#exam-header'),
        questionCard: getComputed('#exam-question-card'),
        metaRow: getComputed('#exam-question-meta-row'),
        actionBar: getComputed('#exam-action-bar'),
        palette: getComputed('#exam-palette-sidebar'),
      };
    });

    console.log(`\n--- [${label}] ---`);
    console.log(`  1. #app-root (App.tsx Root):          computedHeight = ${data.appRoot.computedHeight}, bounding = ${data.appRoot.boundingHeight.toFixed(1)}px x ${data.appRoot.boundingWidth.toFixed(1)}px`);
    console.log(`  2. #app-dashboard-row (Dashboard Row): computedHeight = ${data.dashboardRow.computedHeight}, minHeight = ${data.dashboardRow.computedMinHeight}, bounding = ${data.dashboardRow.boundingHeight.toFixed(1)}px`);
    console.log(`  3. #app-main (<main>):                 computedHeight = ${data.appMain.computedHeight}, minHeight = ${data.appMain.computedMinHeight}, bounding = ${data.appMain.boundingHeight.toFixed(1)}px`);
    console.log(`  4. #exam-header (Exam Header):         bounding = ${data.examHeader.boundingHeight.toFixed(1)}px x ${data.examHeader.boundingWidth.toFixed(1)}px`);
    console.log(`  5. #exam-question-card (Card):         bounding = ${data.questionCard.boundingHeight.toFixed(1)}px x ${data.questionCard.boundingWidth.toFixed(1)}px`);
    console.log(`  6. #exam-question-meta-row (Meta Row): bounding = ${data.metaRow.boundingHeight.toFixed(1)}px`);
    console.log(`  7. #exam-action-bar (Action Bar):      bounding = ${data.actionBar.boundingHeight.toFixed(1)}px`);
    console.log(`  8. #exam-palette-sidebar (Palette):    bounding = ${data.palette.boundingHeight.toFixed(1)}px x ${data.palette.boundingWidth.toFixed(1)}px`);

    return data;
  }

  // --- MEASUREMENT 1: Short (1-line) Question ---
  await page.evaluate(() => {
    const qScroll = document.getElementById('exam-question-text-scroll');
    if (qScroll) {
      const textDiv = qScroll.querySelector('div');
      if (textDiv) textDiv.innerText = 'What is the SI unit of power?';
    }
  });
  await page.waitForTimeout(200);
  const shortChain = await inspectFullChain('SHORT QUESTION');
  await page.screenshot({ path: path.join(screenshotsDir, 'ancestor_short_question.png') });

  // --- MEASUREMENT 2: Extreme (20-paragraph) Question ---
  await page.evaluate(() => {
    const qScroll = document.getElementById('exam-question-text-scroll');
    if (qScroll) {
      const p = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.';
      const textDiv = qScroll.querySelector('div');
      if (textDiv) textDiv.innerText = Array(20).fill(p).join('\n\n');
    }
  });
  await page.waitForTimeout(200);
  const extremeChain = await inspectFullChain('EXTREME 20-PARAGRAPH QUESTION');
  await page.screenshot({ path: path.join(screenshotsDir, 'ancestor_extreme_question.png') });

  // --- COMPARISON VERIFICATION ---
  console.log('\n================================================================');
  console.log('  DELTA / VARIANCE ANALYSIS (SHORT vs EXTREME)');
  console.log('================================================================');

  const appRootDiff = Math.abs(shortChain.appRoot.boundingHeight - extremeChain.appRoot.boundingHeight);
  const dashboardRowDiff = Math.abs(shortChain.dashboardRow.boundingHeight - extremeChain.dashboardRow.boundingHeight);
  const appMainDiff = Math.abs(shortChain.appMain.boundingHeight - extremeChain.appMain.boundingHeight);
  const cardHeightDiff = Math.abs(shortChain.questionCard.boundingHeight - extremeChain.questionCard.boundingHeight);
  const cardWidthDiff = Math.abs(shortChain.questionCard.boundingWidth - extremeChain.questionCard.boundingWidth);
  const paletteWidthDiff = Math.abs(shortChain.palette.boundingWidth - extremeChain.palette.boundingWidth);
  const metaRowDiff = Math.abs(shortChain.metaRow.boundingHeight - extremeChain.metaRow.boundingHeight);
  const actionBarDiff = Math.abs(shortChain.actionBar.boundingHeight - extremeChain.actionBar.boundingHeight);

  console.log(`  1. #app-root Height Delta:          ${appRootDiff.toFixed(2)}px (must be 0.00px)`);
  console.log(`  2. #app-dashboard-row Height Delta: ${dashboardRowDiff.toFixed(2)}px (must be 0.00px)`);
  console.log(`  3. #app-main Height Delta:          ${appMainDiff.toFixed(2)}px (must be 0.00px)`);
  console.log(`  4. #exam-question-card Height Delta:${cardHeightDiff.toFixed(2)}px (must be 0.00px)`);
  console.log(`  5. #exam-question-card Width Delta: ${cardWidthDiff.toFixed(2)}px (must be 0.00px)`);
  console.log(`  6. #exam-palette-sidebar Width Delta:${paletteWidthDiff.toFixed(2)}px (must be 0.00px)`);
  console.log(`  7. Meta Row Height Delta:           ${metaRowDiff.toFixed(2)}px (must be 0.00px)`);
  console.log(`  8. Action Bar Height Delta:         ${actionBarDiff.toFixed(2)}px (must be 0.00px)`);

  if (
    appRootDiff === 0 &&
    dashboardRowDiff === 0 &&
    appMainDiff === 0 &&
    cardHeightDiff === 0 &&
    cardWidthDiff === 0 &&
    paletteWidthDiff === 0 &&
    metaRowDiff === 0 &&
    actionBarDiff === 0
  ) {
    console.log('\n✓✓✓ SUCCESS: All ancestor containers (#app-root, #app-dashboard-row, #app-main) and all 5 exam containers maintain 100% exact pixel stability (0.00px delta) across short vs extreme question length!');
  } else {
    console.log('\n✗✗✗ FAILURE: Computed height variance detected in ancestor chain.');
  }

  await browser.close();
})();
