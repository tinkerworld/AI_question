import { test, expect } from '@playwright/test';
import { loginAs, PERSONAS } from './helpers/auth';

/**
 * Role-based access control coverage - UI-visible behavior only.
 *
 * WHY THIS EXISTS: every other spec in this suite logs in as 'admin' (or
 * 'subAdmin' for one permission check). Nothing exercises what a Teacher or
 * Student actually gets - or should be prevented from getting - which is
 * the whole point of this app having four distinct personas at all.
 *
 * The backend API-level permission checks that used to live in this file
 * (student/teacher hitting endpoints directly and asserting 403s) have
 * moved to backend-permission-checks.spec.ts - those are genuinely
 * testing the API, not the UI, so they belong in a file that says so
 * rather than being mixed into a human-simulation suite. Everything below
 * is driven purely through visible page state - real navigation, real
 * button visibility - proving what a user actually sees, not what the
 * API returns.
 */

test.describe('Role-based access control', () => {
  test('all four personas can log in successfully', async ({ page }) => {
    for (const persona of Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]) {
      await loginAs(page, persona);
      await expect(page.locator('#nav-tab-dashboard')).toBeVisible();
      await page.evaluate(() => localStorage.clear());
    }
  });

  test('TARGET: student does not see admin-only nav tabs (question bank, courses, users)', async ({ page }) => {
    await loginAs(page, 'student');

    // A Student has no business seeing Question Bank, Academic Structure,
    // User Management, or Exam Administration (exams/exam_patterns) - these
    // are pure admin/teacher tooling.
    await expect(page.locator('#nav-tab-exams')).not.toBeVisible();
    await expect(page.locator('#nav-tab-exam_patterns')).not.toBeVisible();
    await expect(page.locator('#nav-tab-question_bank')).not.toBeVisible();
    await expect(page.locator('#nav-tab-courses')).not.toBeVisible();
    await expect(page.locator('#nav-tab-users')).not.toBeVisible();
  });

  test('TARGET: teacher does not see user management or course administration', async ({ page }) => {
    await loginAs(page, 'teacher');

    // Teacher has questions.create/update and exams.create - Question Bank
    // and Exams are legitimately theirs. Courses (course/subject creation)
    // and Users are not - TEACHER has courses.read only, no create/update,
    // and no users.* at all.
    await expect(page.locator('#nav-tab-users')).not.toBeVisible();
    await expect(page.locator('#nav-tab-courses')).not.toBeVisible();
  });
});
