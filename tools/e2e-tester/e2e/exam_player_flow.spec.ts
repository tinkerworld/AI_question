import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test('Simulates a student taking an exam and submitting', async ({ page }) => {
  // 1. Log in as Student
  await loginAs(page, 'student');

  // 2. Navigate to student exams tab
  await goToTab(page, 'student_exams');
  await expect(page.locator('h1')).toContainText('My Assessments');

  // 3. Start or resume an assessment
  const startBtn = page.getByRole('button', { name: /Read Instructions|Resume In-Progress|Retake|Take Assessment/i }).first();
  await expect(startBtn).toBeVisible({ timeout: 10_000 });
  await startBtn.click();

  // 4. Instructions agreement modal
  const modalHeading = page.locator('text=Exam Hall Instructions');
  if (await modalHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    await checkbox.check();
    const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
    await expect(enterBtn).toBeEnabled();
    await enterBtn.click();
  }

  // 5. Verify Exam Hall mounts
  await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 15_000 });

  // 6. Answer first question option if present
  const firstOption = page.locator('input[type="radio"]').first();
  if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstOption.click();
  }

  // 7. Submit exam
  const submitModalBtn = page.locator('#btn-open-submit-modal');
  if (await submitModalBtn.isVisible().catch(() => false)) {
    await submitModalBtn.click();
    const confirmBtn = page.locator('#btn-confirm-submit-exam');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();
  }

  // 8. Verify landing on Scorecard & Solution Analysis
  await expect(page.locator('body')).toContainText(/Scorecard|TOTAL SCORE|Assessment Scorecard/i, { timeout: 30_000 });
});