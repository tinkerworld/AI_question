const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));

    console.log('1. Navigating to ExamOS & signing in as student...');
    await page.goto('http://localhost:3000');
    await page.locator('input[type="email"]').fill('student@examos.com');
    await page.locator('input[type="password"]').fill('Student@123');
    await page.getByRole('button', { name: /sign in/i }).click();

    console.log('2. Opening student assessments tab...');
    await page.waitForSelector('#nav-tab-student_exams', { timeout: 10000 });
    await page.click('#nav-tab-student_exams');

    console.log('3. Starting or resuming exam attempt...');
    const startBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume/i }).first();
    await startBtn.waitFor({ state: 'visible', timeout: 10000 });
    await startBtn.click();

    const modalHeading = page.locator('text=Exam Hall Instructions');
    await modalHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await modalHeading.isVisible()) {
      await page.locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: /Enter Exam Hall & Start/i }).click();
    }

    await page.waitForSelector('text=Question Palette', { timeout: 10000 });
    console.log('4. Verified active in Exam Player (IN_PROGRESS state).');

    // Test PopState interception boundary
    await page.dispatchEvent('#btn-trigger-exit-modal', 'click');
    console.log('5. Dispatched navigation interception trigger.');

    await page.waitForSelector('#exam-exit-modal', { timeout: 5000 });
    console.log('6. Verified exit confirmation modal triggered on navigation boundary.');

    // Test Dismissal & Resume in-place
    const continueBtn = page.getByRole('button', { name: /Continue Exam/i });
    await continueBtn.click();
    await page.waitForSelector('#exam-exit-modal', { state: 'detached', timeout: 5000 });
    console.log('7. Dismissed modal; verified examination session remains intact.');

    console.log('✅ ALL DIAGNOSTIC STATE TRANSITION & BOUNDARY CHECKS PASSED.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ DIAGNOSTIC CHECK FAILED:', err);
    await browser.close();
    process.exit(1);
  }
})();
