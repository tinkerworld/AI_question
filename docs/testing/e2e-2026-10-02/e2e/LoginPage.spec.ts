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
  });

  test('should allow teacher user to login successfully', async ({ page }) => {
    await loginAs(page, 'teacher');
    await expect(page.locator('#nav-tab-dashboard')).toBeVisible({ timeout: 10_000 });
  });

  test('should allow student user to login successfully', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.locator('#nav-tab-student_exams')).toBeVisible({ timeout: 10_000 });
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.goto('/');
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i }).first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
    } else {
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.goto('/');
    }

    await expect(page.getByText('Sign in to ExamOS')).toBeVisible({ timeout: 10_000 });
    const emailInput = page.locator('#input-login-email');
    const passwordInput = page.locator('#input-login-password');

    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await page.locator('#btn-login-submit').click();
    
    await expect(page.locator('#login-error-alert')).toBeVisible({ timeout: 10_000 });
  });

  test('should logout user successfully', async ({ page }) => {
    await loginAs(page, 'admin');
    
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i }).first();
    await logoutBtn.click();
    
    await expect(page.getByText('Sign in to ExamOS')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});