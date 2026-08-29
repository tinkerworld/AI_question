import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('LoginPage', () => {
  test('should display login form with email and password fields', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Sign in to ExamOS')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should allow admin user to login successfully', async ({ page }) => {
    await loginAs(page, 'admin');
    
    await expect(page.locator('#nav-tab-dashboard')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Admin')).toBeVisible();
  });

  test('should allow teacher user to login successfully', async ({ page }) => {
    await loginAs(page, 'teacher');
    
    await expect(page.locator('#nav-tab-dashboard')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Teacher')).toBeVisible();
  });

  test('should allow student user to login successfully', async ({ page }) => {
    await loginAs(page, 'student');
    
    await expect(page.locator('#nav-tab-dashboard')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Student')).toBeVisible();
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('should logout user successfully', async ({ page }) => {
    await loginAs(page, 'admin');
    
    const logoutBtn = page.getByRole('button', { name: /logout/i });
    await logoutBtn.click();
    
    await expect(page.getByText('Sign in to ExamOS')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});