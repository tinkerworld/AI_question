import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test.describe('Systemic Scrollbar Verification & Modal Safety', () => {
  test('1. Student Assessments tab is scrollable', async ({ page }) => {
    await loginAs(page, 'student');
    await goToTab(page, 'student_exams');
    await expect(page.locator('h1')).toContainText('My Assessments');

    const mainElement = page.locator('#app-main');
    const scrollInfo = await mainElement.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: window.getComputedStyle(el).overflowY,
      overflowX: window.getComputedStyle(el).overflowX,
    }));

    expect(scrollInfo.overflowY).toBe('auto');
    expect(scrollInfo.overflowX).toBe('hidden');
    console.log('Student Exams Scroll Info:', scrollInfo);
  });

  test('2. Admin Question Bank tab is scrollable', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'question_bank');
    await expect(page.locator('h1')).toContainText('Question Bank');

    const mainElement = page.locator('#app-main');
    const scrollInfo = await mainElement.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: window.getComputedStyle(el).overflowY,
      overflowX: window.getComputedStyle(el).overflowX,
    }));

    expect(scrollInfo.overflowY).toBe('auto');
    expect(scrollInfo.overflowX).toBe('hidden');
    console.log('Question Bank Scroll Info:', scrollInfo);

    // Verify Create Question modal opens cleanly without clipping or broken fixed positioning
    const createBtn = page.getByRole('button', { name: /create question/i });
    await createBtn.click();
    await expect(page.locator('#select-question-type')).toBeVisible({ timeout: 5000 });
  });

  test('3. Analytics tab is scrollable', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'analytics');

    const mainElement = page.locator('#app-main');
    const scrollInfo = await mainElement.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: window.getComputedStyle(el).overflowY,
      overflowX: window.getComputedStyle(el).overflowX,
    }));

    expect(scrollInfo.overflowY).toBe('auto');
    expect(scrollInfo.overflowX).toBe('hidden');
    console.log('Analytics Scroll Info:', scrollInfo);
  });
});
