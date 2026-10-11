import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Student Exam-Taking & Results Portal', () => {
  test('student logs in, views assessment list, reads instructions, takes exam, submits, and views scorecard', async ({ page }) => {
    // 1. Log in as Student
    await loginAs(page, 'student');

    // 2. Verify "My Assessments & Tests" tab is present and visible
    const studentExamsTab = page.locator('#nav-tab-student_exams');
    await expect(studentExamsTab).toBeVisible();
    await studentExamsTab.click();

    // 3. Verify student assessment portal renders
    await expect(page.locator('h1')).toContainText('My Assessments');

    // 4. Start, resume, or view an assessment
    const startOrResumeBtn = page.getByRole('button', { name: /Read Instructions|Resume In-Progress|Retake/i }).first();
    await expect(startOrResumeBtn).toBeVisible({ timeout: 10000 });
    await startOrResumeBtn.click();

    // If instructions modal opens, accept agreement and enter exam hall
    const modalHeading = page.locator('text=Exam Hall Instructions');
    await modalHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await modalHeading.isVisible()) {
      const checkbox = page.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible({ timeout: 10000 });
      await checkbox.check();
      const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
      await expect(enterBtn).toBeEnabled();
      await enterBtn.click();
    }

    // Wait for Exam Hall to mount
    await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 15000 });

    // Interact with question: choose first option if available
    const firstOption = page.locator('input[type="radio"]').first();
    if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOption.click();
    }

    // Submit the examination
    await page.locator('#btn-open-submit-modal').click();
    const confirmBtn = page.locator('#btn-confirm-submit-exam');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Verify landing on Scorecard & Solution Analysis page
    await expect(page.locator('body')).toContainText(/Scorecard|TOTAL SCORE/i, { timeout: 30000 });
  });

  test('question card maintains stable layout and minimum height across questions of varying length', async ({ page }) => {
    // 1. Log in as Student
    await loginAs(page, 'student');

    // 2. Navigate to assessments tab
    const studentExamsTab = page.locator('#nav-tab-student_exams');
    await expect(studentExamsTab).toBeVisible();
    await studentExamsTab.click();

    // 3. Start or Retake an exam
    const startOrRetakeBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume In-Progress/i }).first();
    await expect(startOrRetakeBtn).toBeVisible({ timeout: 10000 });
    await startOrRetakeBtn.click();

    // 4. Accept instructions if modal opens
    const modalHeading = page.locator('text=Exam Hall Instructions');
    await modalHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await modalHeading.isVisible()) {
      await page.locator('input[type="checkbox"]').check();
      await page.getByRole('button', { name: /Enter Exam Hall & Start/i }).click();
    }

    // 5. Verify active inside Exam Player
    const questionCard = page.locator('#exam-question-card');
    await expect(questionCard).toBeVisible({ timeout: 10000 });

    // 6. Record timer position and verify stability across question navigation
    const timer = page.locator('text=⏱').first();
    await expect(timer).toBeVisible();
    const initialTimerBox = await timer.boundingBox();

    // 7. Click through several questions and verify layout floor and stability
    const questionButtons = [1, 2, 3, 4, 5];
    for (const qNum of questionButtons) {
      const paletteBtn = page.getByRole('button', { name: String(qNum), exact: true });
      if (await paletteBtn.isVisible()) {
        await paletteBtn.click();
        await page.waitForTimeout(200);

        // Verify question card bounding box satisfies stable minimum floor >= 480px
        const cardBox = await questionCard.boundingBox();
        expect(cardBox).not.toBeNull();
        expect(cardBox!.height).toBeGreaterThanOrEqual(480);

        // Verify timer position did not shift
        const currentTimerBox = await timer.boundingBox();
        expect(currentTimerBox!.y).toBe(initialTimerBox!.y);

        // Verify navigation buttons remain visible and properly positioned at bottom of card
        const saveNextBtn = page.getByRole('button', { name: /Save & Next/i });
        await expect(saveNextBtn).toBeVisible();
        const btnBox = await saveNextBtn.boundingBox();
        expect(btnBox!.y).toBeGreaterThanOrEqual(cardBox!.y + 350);
      }
    }
  });
});
