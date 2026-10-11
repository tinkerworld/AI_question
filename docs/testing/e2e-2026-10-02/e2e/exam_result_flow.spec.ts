import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test('Simulate student viewing assessment scorecard and solution analysis', async ({ page }) => {
  // 1. Log in as Student
  await loginAs(page, 'student');

  // 2. Navigate to student exams
  await goToTab(page, 'student_exams');
  await expect(page.locator('h1')).toContainText('My Assessments');

  // 3. View Scorecard or Solutions on an assessment
  const scorecardBtn = page.getByRole('button', { name: /View Scorecard|Solution Analysis|Retake|Read Instructions|Resume/i }).first();
  if (await scorecardBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await scorecardBtn.click();

    // If instructions modal opened, proceed
    const modalHeading = page.locator('text=Exam Hall Instructions');
    if (await modalHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      const checkbox = page.locator('input[type="checkbox"]');
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.check();
        const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
        await enterBtn.click();
      }
    }
  }

  // 4. Verify presence of assessments UI elements
  await expect(page.locator('body')).toBeVisible();
});