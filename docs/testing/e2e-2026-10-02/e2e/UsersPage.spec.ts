import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test.describe('Users Page Navigation and Access Control', () => {
  test('admin can access users page and see user list', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'users');

    // Verify the page title
    await expect(page.getByText(/User Management & Security Audit Center/i)).toBeVisible({ timeout: 10_000 });

    // Verify user list is visible
    await expect(page.getByText(/User Roster & Access Control/i)).toBeVisible();

    // Verify seeded users are displayed
    await expect(page.getByText('admin@examos.com', { exact: true })).toBeVisible();
    await expect(page.getByText('teacher@examos.com', { exact: true })).toBeVisible();
    await expect(page.getByText('student@examos.com', { exact: true })).toBeVisible();
  });

  test('subadmin can access users page and see user list', async ({ page }) => {
    await loginAs(page, 'subadmin');
    await goToTab(page, 'users');

    // Verify the page title
    await expect(page.getByText(/User Management & Security Audit Center/i)).toBeVisible({ timeout: 10_000 });

    // Verify user list is visible
    await expect(page.getByText(/User Roster & Access Control/i)).toBeVisible();

    // Verify seeded users are displayed
    await expect(page.getByText('admin@examos.com', { exact: true })).toBeVisible();
    await expect(page.getByText('teacher@examos.com', { exact: true })).toBeVisible();
    await expect(page.getByText('student@examos.com', { exact: true })).toBeVisible();
  });

  test('teacher cannot access users page', async ({ page }) => {
    await loginAs(page, 'teacher');
    // Verify that the users nav tab is completely hidden for teachers
    await expect(page.locator('#nav-tab-users')).not.toBeVisible();
  });

  test('student cannot access users page', async ({ page }) => {
    await loginAs(page, 'student');
    // Verify that the users nav tab is completely hidden for students
    await expect(page.locator('#nav-tab-users')).not.toBeVisible();
  });
});