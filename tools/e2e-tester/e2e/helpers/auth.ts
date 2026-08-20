import { Page, expect } from '@playwright/test';

/**
 * Baseline personas from packages/database/prisma/seed.ts.
 * Kept here (not imported) deliberately - this file should still catch a
 * regression if someone changes seeded credentials without updating both
 * places, since the UI login would then fail loudly.
 */
export const PERSONAS = {
  admin: { email: 'admin@examos.com', password: 'Admin@123', role: 'MAIN_ADMIN' },
  subAdmin: { email: 'subadmin@examos.com', password: 'SubAdmin@123', role: 'SUB_ADMIN' },
  teacher: { email: 'teacher@examos.com', password: 'Teacher@123', role: 'TEACHER' },
  student: { email: 'student@examos.com', password: 'Student@123', role: 'STUDENT' },
} as const;

/**
 * Logs in through the real UI (not an API shortcut) - the whole point of
 * this suite is simulating an actual human, and LoginPage.tsx itself is one
 * of the things worth continuously verifying (Phase 1 found it missing
 * entirely once already).
 */
export async function loginAs(page: Page, persona: keyof typeof PERSONAS) {
  const { email, password } = PERSONAS[persona];
  await page.goto('/');

  // If already logged in from a previous test in this run, log out first
  // so each test starts from a known state.
  const emailField = page.locator('input[type="email"]');
  if (!(await emailField.isVisible().catch(() => false))) {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
  }

  await expect(page.getByText('Sign in to ExamOS')).toBeVisible({ timeout: 10_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Confirm login actually succeeded - the sidebar nav only renders once
  // authenticated, so its presence is the real assertion, not just "no error
  // shown".
  await expect(page.locator('#nav-tab-dashboard')).toBeVisible({ timeout: 10_000 });
}

export async function goToTab(
  page: Page,
  tab: 'dashboard' | 'exams' | 'exam_patterns' | 'question_bank' | 'courses' | 'users' | 'analytics'
) {
  await page.locator(`#nav-tab-${tab}`).click();
}