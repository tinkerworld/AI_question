import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test.describe('Users Page Navigation and Access Control', () => {
  test('admin can access users page and see user list', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'users');

    // Verify the page title
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 10_000 });

    // Verify user list is visible
    await expect(page.getByText('User List')).toBeVisible();

    // Verify at least one user is displayed
    await expect(page.getByText('admin@examos.com')).toBeVisible();
    await expect(page.getByText('teacher@examos.com')).toBeVisible();
    await expect(page.getByText('student@examos.com')).toBeVisible();
  });

  test('subadmin can access users page and see user list', async ({ page }) => {
    await loginAs(page, 'subAdmin');
    await goToTab(page, 'users');

    // Verify the page title
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 10_000 });

    // Verify user list is visible
    await expect(page.getByText('User List')).toBeVisible();

    // Verify at least one user is displayed
    await expect(page.getByText('admin@examos.com')).toBeVisible();
    await expect(page.getByText('teacher@examos.com')).toBeVisible();
    await expect(page.getByText('student@examos.com')).toBeVisible();
  });

  test('teacher cannot access users page', async ({ page }) => {
    await loginAs(page, 'teacher');
    await goToTab(page, 'users');

    // Verify that the user is redirected or an access denied message is shown
    await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 10_000 });
  });

  test('student cannot access users page', async ({ page }) => {
    await loginAs(page, 'student');
    await goToTab(page, 'users');

    // Verify that the user is redirected or an access denied message is shown
    await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 10_000 });
  });
});