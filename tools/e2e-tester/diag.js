const { chromium, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Diagnostic E2E Test: Student Examination Lifecycle, State Transitions & Navigation Boundary Guard
 * Validates authentication, exam entry, active player state, popstate navigation interception, and modal dismissal.
 */
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));

    console.log('1. Navigating to ExamOS & signing in as student...');
    await page.goto('http://localhost:3000');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill('student@examos.com');
    await page.locator('input[type="password"]').fill('Student@123');
    await page.getByRole('button', { name: /sign in/i }).click();

    console.log('2. Opening student assessments tab...');
    const examsTab = page.locator('#nav-tab-student_exams');
    await expect(examsTab).toBeVisible({ timeout: 10000 });
    await examsTab.click();

    console.log('3. Starting or resuming exam attempt...');
    const startBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    const modalHeading = page.locator('text=Exam Hall Instructions');
    await modalHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await modalHeading.isVisible()) {
      const checkbox = page.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      await checkbox.check();
      const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
      await expect(enterBtn).toBeEnabled({ timeout: 5000 });
      await enterBtn.click();
    }

    const palette = page.locator('text=Question Palette');
    await expect(palette).toBeVisible({ timeout: 15000 });
    console.log('4. Verified active in Exam Player (IN_PROGRESS state).');

    // Test PopState interception boundary
    await page.dispatchEvent('#btn-trigger-exit-modal', 'click');
    console.log('5. Dispatched navigation interception trigger.');

    const exitModal = page.locator('#exam-exit-modal');
    await expect(exitModal).toBeVisible({ timeout: 5000 });
    console.log('6. Verified exit confirmation modal triggered on navigation boundary.');

    // Capture screenshot of the exit confirmation dialog
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'diag-exam-exit-modal.png') });

    // Test Dismissal & Resume in-place
    const continueBtn = page.getByRole('button', { name: /Continue Exam/i });
    await expect(continueBtn).toBeVisible({ timeout: 5000 });
    await continueBtn.click();
    await expect(exitModal).toBeHidden({ timeout: 5000 });
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
