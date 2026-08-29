import { test } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';
import { Page } from '@playwright/test';

async function randomThinkTime(page: Page) {
  // Random delay between 1 and 5 seconds to simulate human reading/deciding time
  const delay = Math.floor(Math.random() * 4000) + 1000;
  await page.waitForTimeout(delay);
}

test('Simulate human user flow through Exam Result Page', async ({ page }) => {
  // Login as a student
  await loginAs(page, 'student');

  // Navigate to the dashboard
  await goToTab(page, 'dashboard');
  await randomThinkTime(page);

  // Navigate to student exams
  await goToTab(page, 'student_exams');
  await randomThinkTime(page);

  // Click on an exam to view results
  const examLink = page.locator('a[href*="/exam-result/"]');
  if (await examLink.isVisible().catch(() => false)) {
    await examLink.click();
    await randomThinkTime(page);

    // On the exam result page, simulate reading the content
    await expect(page.getByText('Exam Result')).toBeVisible({ timeout: 10_000 });
    await randomThinkTime(page);

    // Simulate user reviewing the result details
    const resultDetails = page.locator('.result-details');
    if (await resultDetails.isVisible().catch(() => false)) {
      await randomThinkTime(page);
    }

    // Simulate user navigating away or closing the page
    await page.goBack();
    await randomThinkTime(page);
  } else {
    // If no exam result link is found, check if there are any exams
    const noExamsText = page.getByText(/no exams/i);
    if (await noExamsText.isVisible().catch(() => false)) {
      console.log('No exams available for this student');
    }
  }

  // Return to dashboard
  await goToTab(page, 'dashboard');
  await randomThinkTime(page);

  // Logout
  const logoutBtn = page.getByRole('button', { name: /logout/i });
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
  }
});