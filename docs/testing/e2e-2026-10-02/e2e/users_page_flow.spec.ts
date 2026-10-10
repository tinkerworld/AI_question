import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

// Simulate a realistic human user journey to the UsersPage
// Start from login, go through dashboard, then navigate to UsersPage

test('User navigates to UsersPage via dashboard', async ({ page }) => {
  // Step 1: Login as a user with appropriate permissions (e.g. admin)
  await loginAs(page, 'admin');

  // Randomized think time after login
  await page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000);

  // Step 2: Navigate to the Users tab from the dashboard
  await goToTab(page, 'users');

  // Randomized think time after clicking tab
  await page.waitForTimeout(Math.floor(Math.random() * 1500) + 500);

  // Step 3: Verify we are on the UsersPage
  await expect(page.locator('[data-testid="users-page-container"]')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible({ timeout: 5000 });
});
