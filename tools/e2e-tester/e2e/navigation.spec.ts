import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

/**
 * THIS FILE EXISTS BECAUSE OF A SPECIFIC PAST BUG:
 * Tasks 2.5 and 3.7 were marked "done" in the build tracker while their nav
 * tabs (Courses, Question Bank) silently rendered the generic
 * "Welcome to ExamOS" placeholder - the same fallback shown for tabs that
 * were never built at all. No automated test caught this; it was only found
 * by direct code review. This spec makes that failure mode impossible to
 * reintroduce silently again: if a future change accidentally routes a tab
 * back to the placeholder, this test fails immediately and names which tab.
 */

const PLACEHOLDER_TEXT = 'Use the sidebar to navigate';

// Tabs that should have real, built pages right now.
const BUILT_TABS = [
  { id: 'exams', expectHeading: /exam/i },
  { id: 'exam_patterns', expectHeading: /pattern/i },
  { id: 'question_bank', expectHeading: /question/i },
  { id: 'courses', expectHeading: /course|academic/i },
] as const;

test.describe('Navigation - no silently-empty tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  for (const tab of BUILT_TABS) {
    test(`"${tab.id}" tab renders a real page, not the placeholder`, async ({ page }) => {
      await goToTab(page, tab.id);

      // The actual regression check: this exact string must NOT appear
      // once a tab is supposedly built. If it does, the tab is a fake.
      await expect(page.getByText(PLACEHOLDER_TEXT)).not.toBeVisible();

      // And something meaningful for this specific page should be visible -
      // not just "not the placeholder", but "something real is here".
      await expect(page.locator('body')).toContainText(tab.expectHeading);
    });
  }

  test('unbuilt tabs (dashboard/users/analytics) are honestly still placeholders', async ({ page }) => {
    // This is an intentional inverse check. If these ever silently become
    // "not the placeholder" without a corresponding real page being built,
    // that would mean someone routed them to render *something* without it
    // being tracked - equally worth catching.
    for (const tab of ['dashboard', 'users', 'analytics'] as const) {
      await goToTab(page, tab);
      await expect(page.getByText(PLACEHOLDER_TEXT)).toBeVisible();
    }
  });
});
