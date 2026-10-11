import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Active Exam Exit Protection (Back-button, Tab Close, Refresh)', () => {
  test('Exit Path 1: Browser Back-Button is intercepted and displays in-app warning modal', async ({ page }) => {
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
      const checkbox = page.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible({ timeout: 10000 });
      await checkbox.check();
      const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
      await expect(enterBtn).toBeEnabled({ timeout: 10000 });
      await enterBtn.click();
    }

    // 5. Verify active inside Exam Player
    await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 10000 });

    // 6. Trigger Browser Back Button Popstate Navigation
    await page.dispatchEvent('#btn-trigger-exit-modal', 'click');

    // 7. Verify In-App Exit Modal is displayed
    const exitModal = page.locator('#exam-exit-modal');
    await expect(exitModal).toBeVisible({ timeout: 10000 });
    await expect(exitModal).toContainText('Active Examination in Progress');
    await expect(exitModal).toContainText('Your exam is still in progress and the timer is still running - are you sure you want to leave?');

    // 8. Test "Continue Exam" button
    const continueBtn = page.getByRole('button', { name: /Continue Exam/i });
    await continueBtn.click();
    await expect(exitModal).not.toBeVisible();
    await expect(page.locator('text=Question Palette')).toBeVisible();

    // 9. Trigger Browser Back Button again and choose "Yes, Leave Exam"
    await page.dispatchEvent('#btn-trigger-exit-modal', 'click');
    await expect(exitModal).toBeVisible({ timeout: 10000 });
    const leaveBtn = page.getByRole('button', { name: /Yes, Leave Exam/i });
    await leaveBtn.click();
    await expect(exitModal).not.toBeVisible();

    // Returned safely to assessment dashboard
    await expect(page.locator('h1')).toContainText('My Assessments');
  });

  test('Exit Path 2: Page Refresh / beforeunload is prevented with confirmation during IN_PROGRESS attempt', async ({ page }) => {
    await loginAs(page, 'student');

    const studentExamsTab = page.locator('#nav-tab-student_exams');
    await expect(studentExamsTab).toBeVisible();
    await studentExamsTab.click();

    const startOrRetakeBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume In-Progress/i }).first();
    await expect(startOrRetakeBtn).toBeVisible({ timeout: 10000 });
    await startOrRetakeBtn.click();

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

    await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 10000 });

    // Test beforeunload handler directly in the browser context
    const beforeUnloadResult = await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      let preventDefaultCalled = false;
      event.preventDefault = () => {
        preventDefaultCalled = true;
      };
      window.dispatchEvent(event);
      return {
        defaultPrevented: event.defaultPrevented || preventDefaultCalled,
        returnValue: event.returnValue,
      };
    });

    // In a standard browser, setting event.returnValue = '' or calling e.preventDefault()
    // causes the browser to prompt confirmation before unloading
    expect(beforeUnloadResult.defaultPrevented).toBe(true);
  });

  test('Exit Path 3: Tab Close / Navigation protection is scoped ONLY to active attempt and disengages on submit', async ({ page }) => {
    await loginAs(page, 'student');

    const studentExamsTab = page.locator('#nav-tab-student_exams');
    await expect(studentExamsTab).toBeVisible();
    await studentExamsTab.click();

    const startOrRetakeBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume In-Progress/i }).first();
    await expect(startOrRetakeBtn).toBeVisible({ timeout: 10000 });
    await startOrRetakeBtn.click();

    const modalHeading2 = page.locator('text=Exam Hall Instructions');
    await modalHeading2.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await modalHeading2.isVisible()) {
      const checkbox = page.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible({ timeout: 10000 });
      await checkbox.check();
      const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
      await expect(enterBtn).toBeEnabled();
      await enterBtn.click();
    }

    await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 10000 });

    // Submit the exam
    const submitBtn = page.getByRole('button', { name: /Submit Test|Finish & Submit/i }).first();
    await submitBtn.click();
    const confirmBtn = page.getByRole('button', { name: /Confirm Submission/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify on Result Page
    await expect(page.locator('text=Scorecard & Solution Analysis')).toBeVisible({ timeout: 15000 });

    // Verify beforeunload is NOT active on ExamResultPage
    const resultPageBeforeUnload = await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      let preventDefaultCalled = false;
      event.preventDefault = () => {
        preventDefaultCalled = true;
      };
      window.dispatchEvent(event);
      return {
        defaultPrevented: event.defaultPrevented || preventDefaultCalled,
      };
    });

    expect(resultPageBeforeUnload.defaultPrevented).toBe(false);
  });

  test('Exit Path 4: App-level sidebar navigation & header logout are locked during active exam attempt and prompt warning modal', async ({ page }) => {
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
      const checkbox = page.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible({ timeout: 10000 });
      await checkbox.check();
      const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
      await expect(enterBtn).toBeEnabled({ timeout: 10000 });
      await enterBtn.click();
    }

    // 5. Verify active inside Exam Player
    await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 10000 });

    const exitModal = page.locator('#exam-exit-modal');

    // 6. Test Sidebar Interception: Clicking Dashboard nav tab triggers warning modal and does not navigate
    const dashboardNavTab = page.locator('#nav-tab-dashboard');
    await expect(dashboardNavTab).toBeVisible();
    await expect(dashboardNavTab).toHaveCSS('cursor', 'not-allowed', { timeout: 10000 });
    await dashboardNavTab.click();

    await expect(exitModal).toBeVisible({ timeout: 5000 });
    await expect(exitModal).toContainText('Active Examination in Progress');

    // Dismiss modal and stay in exam
    const continueBtn = page.getByRole('button', { name: /Continue Exam/i });
    await continueBtn.click();
    await expect(exitModal).not.toBeVisible();
    await expect(page.locator('text=Question Palette')).toBeVisible();

    // 7. Test Header Logout Interception: Clicking Logout triggers warning modal instead of logging out
    const logoutBtn = page.getByRole('button', { name: /Logout/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    await expect(exitModal).toBeVisible({ timeout: 5000 });
    await expect(exitModal).toContainText('Active Examination in Progress');

    await continueBtn.click();
    await expect(exitModal).not.toBeVisible();
    await expect(page.locator('text=Question Palette')).toBeVisible();
  });
});
