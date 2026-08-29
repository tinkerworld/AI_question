import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';
import { Page } from '@playwright/test';

async function randomThinkTime(page: Page) {
  // Random delay between 1 and 5 seconds to simulate human reading/deciding time
  const delay = Math.floor(Math.random() * 4000) + 1000;
  await page.waitForTimeout(delay);
}

test('Simulates a student taking an exam', async ({ page }) => {
  // Login as a student
  await loginAs(page, 'student');
  
  // Navigate to the student exams tab
  await goToTab(page, 'student_exams');
  await randomThinkTime(page);
  
  // Click on an exam to start it
  const examLink = page.locator('a[href*="/exam/"]');
  if (await examLink.isVisible().catch(() => false)) {
    await examLink.click();
    await randomThinkTime(page);
    
    // Start the exam
    const startButton = page.getByRole('button', { name: /start exam/i });
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
      await randomThinkTime(page);
      
      // Simulate answering questions
      const questionElements = page.locator('.question');
      const questionCount = await questionElements.count();
      
      for (let i = 0; i < questionCount; i++) {
        await randomThinkTime(page);
        
        // Select an answer (randomly for now)
        const answerOptions = page.locator('.answer-option');
        const answerCount = await answerOptions.count();
        
        if (answerCount > 0) {
          const randomAnswerIndex = Math.floor(Math.random() * answerCount);
          await answerOptions.nth(randomAnswerIndex).click();
        }
        
        // Move to next question or submit if last
        if (i < questionCount - 1) {
          const nextButton = page.getByRole('button', { name: /next/i });
          if (await nextButton.isVisible().catch(() => false)) {
            await nextButton.click();
          }
        }
      }
      
      // Submit the exam
      const submitButton = page.getByRole('button', { name: /submit/i });
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        await randomThinkTime(page);
        
        // Confirm submission
        const confirmButton = page.getByRole('button', { name: /confirm/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }
      }
    }
  }
  
  // Verify exam submission was successful
  await expect(page.getByText(/exam submitted/i)).toBeVisible({ timeout: 10_000 });
});