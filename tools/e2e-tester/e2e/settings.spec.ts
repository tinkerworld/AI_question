import { test, expect, Page } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

let page: Page;

test.describe.serial('Phase 11: System Settings & AI Gateway Configuration', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('admin can access Settings tab and configure AI Gateway multi-provider cascade', async () => {
    // 1. Log in as Main Admin
    await loginAs(page, 'admin');

    // 2. Navigate to Settings module
    const settingsNavTab = page.locator('#nav-tab-settings');
    await expect(settingsNavTab).toBeVisible({ timeout: 10_000 });
    await goToTab(page, 'settings');

    // 3. Verify Settings page header and subtab switcher
    await expect(page.getByText('System Settings & Administration')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#settings-subtab-ai')).toBeVisible();
    await expect(page.locator('#settings-subtab-appearance')).toBeVisible();
    await expect(page.locator('#settings-subtab-exam-themes')).toBeVisible();

    // 4. Verify AI Configuration subtab loads real provider cards from database
    const cloudCard = page.locator('#provider-card-prov_cloud_01');
    const localCard = page.locator('#provider-card-prov_local_01');
    const mockCard = page.locator('#provider-card-prov_mock_01');

    await expect(mockCard).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#toggle-provider-prov_mock_01')).toBeVisible();
    await expect(page.locator('#priority-provider-prov_mock_01')).toBeVisible();
    await expect(page.locator('#model-provider-prov_mock_01')).toBeVisible();

    // 5. Test live connection to deterministic mock provider
    const testBtn = page.locator('#test-provider-btn-prov_mock_01');
    await expect(testBtn).toBeVisible();
    await testBtn.click();

    // Confirm live connection test outputs success and latency
    await expect(mockCard.getByText(/Connection operational|Successfully connected/i)).toBeVisible({ timeout: 10_000 });
    await expect(mockCard.getByText(/Latency:/i)).toBeVisible();

    // 6. Test Appearance Subtab
    await page.locator('#settings-subtab-appearance').click();
    await expect(page.getByText('UI Color Scheme')).toBeVisible();
    await expect(page.locator('#theme-card-light')).toBeVisible();
    await expect(page.locator('#theme-card-gray')).toBeVisible();
    await expect(page.locator('#theme-card-dark')).toBeVisible();

    // Click Slate Theme
    await page.locator('#theme-card-gray').click();
    await expect(page.locator('#theme-card-gray').getByText('Active')).toBeVisible();

    // 7. Test Exam Paper Themes Subtab (Placeholder/Stub)
    await page.locator('#settings-subtab-exam-themes').click();
    await expect(page.getByText('Exam Paper Presentation Themes')).toBeVisible();
    await expect(page.getByText('COMING SOON', { exact: true })).toBeVisible();
    await expect(page.getByText('NTA / JEE Standard')).toBeVisible();
    await expect(page.getByText('CBSE Board Style')).toBeVisible();
  });
});
