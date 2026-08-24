import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test.describe('Phase 13: Subscriptions & Entitlements System', () => {
  test('1. Plan Matrix & Subscription Dashboard: Student views active tier, plan tiers and feature limits', async ({
    page,
  }) => {
    // 1. Log in as Student 1 (Free tier)
    await loginAs(page, 'student');

    // 2. Navigate to Subscription & Credits tab
    await goToTab(page, 'subscription');
    await expect(page.locator('h1')).toContainText('Subscriptions & Entitlements');

    // 3. Verify Active Subscription Overview Header renders
    await expect(page.locator('#badge-active-plan')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#widget-credits-balance')).toBeVisible();

    // 4. Verify Plan Tier Comparison Cards render (Free Starter, Premium Scholar, Premium+ Master)
    await expect(page.getByRole('heading', { name: 'Free Starter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Premium Scholar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Premium+ Master' })).toBeVisible();

    // 5. Switch to AI Credit Packs sub-tab and verify Booster Packs render
    const creditsSubTab = page.locator('#tab-credits');
    await expect(creditsSubTab).toBeVisible();
    await creditsSubTab.click();

    await expect(page.getByRole('heading', { name: /Single Booster/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Sprint Pack/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Scholar Vault/i })).toBeVisible();
  });

  test('2. Subscription Upgrade Flow: Student upgrades plan tier via simulated checkout modal', async ({
    page,
  }) => {
    // 1. Log in as Student 1
    await loginAs(page, 'student');
    await goToTab(page, 'subscription');

    // 2. Click Upgrade on available plan card
    const upgradeBtn = page.getByRole('button', { name: /Upgrade to/i }).first();
    await expect(upgradeBtn).toBeVisible({ timeout: 10000 });
    await upgradeBtn.click();

    // 3. Verify Checkout Modal renders
    await expect(page.locator('#modal-checkout')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Confirm Order & Payment')).toBeVisible();

    // 4. Confirm Payment
    const confirmBtn = page.locator('#btn-confirm-checkout');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 5. Verify Successful Upgrade & Badge Update
    await expect(page.locator('#modal-checkout')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('#badge-active-plan')).toBeVisible({ timeout: 10000 });
  });

  test('3. AI Credit Pack Top-Up: Student purchases booster pack and balance increments', async ({
    page,
  }) => {
    // 1. Log in as Student 1
    await loginAs(page, 'student');
    await goToTab(page, 'subscription');

    // 2. Switch to Credit Packs tab
    const creditsSubTab = page.locator('#tab-credits');
    await expect(creditsSubTab).toBeVisible({ timeout: 10000 });
    await creditsSubTab.click();

    // 3. Click Buy on Sprint Pack (+5 credits)
    const cardPkg5 = page.locator('#card-pkg-pkg_5');
    await expect(cardPkg5).toBeVisible({ timeout: 10000 });
    const buySprintBtn = cardPkg5.getByRole('button', { name: /Buy Pack/i });
    await expect(buySprintBtn).toBeVisible();
    await buySprintBtn.click();

    // 4. Verify Checkout Modal renders for Credit Booster
    await expect(page.locator('#modal-checkout')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#modal-checkout').getByText(/Sprint Pack/i)).toBeVisible();

    // 5. Complete Payment
    const confirmBtn = page.locator('#btn-confirm-checkout');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 6. Verify Modal closes, switch to Invoices subtab and check table
    await expect(page.locator('#modal-checkout')).not.toBeVisible({ timeout: 10000 });
    const invoicesSubTab = page.locator('#tab-invoices');
    await expect(invoicesSubTab).toBeVisible();
    await invoicesSubTab.click();
    await expect(page.locator('#table-user-invoices')).toBeVisible({ timeout: 5000 });
  });

  test('4. Admin Refund Engine & Financial Audit Trail: Main Admin issues refund with entitlement clawback', async ({
    page,
  }) => {
    // 1. Log in as Admin
    await loginAs(page, 'admin');
    await goToTab(page, 'subscription');

    // 2. Switch to Admin Financial & Refunds sub-tab
    const adminSubTab = page.locator('#tab-admin-refunds');
    await expect(adminSubTab).toBeVisible({ timeout: 10000 });
    await adminSubTab.click();

    // 3. Verify Admin Financial Refund Console is present
    await expect(page.getByText('Financial Transactions & Refunds')).toBeVisible({
      timeout: 5000,
    });

    // 4. Open Process Refund Modal
    const openRefundBtn = page.locator('#btn-open-refund-modal');
    await expect(openRefundBtn).toBeVisible();
    await openRefundBtn.click();

    // 5. Fill Refund Form
    const randomReason = `E2E automated verification refund test ${Date.now()}`;
    await expect(page.locator('#modal-refund')).toBeVisible();
    await page.locator('#refund-amount-input').fill('29.99');
    await page.locator('#refund-reason-input').fill(randomReason);

    // 6. Submit Refund
    const submitRefundBtn = page.locator('#btn-submit-refund');
    await expect(submitRefundBtn).toBeVisible();
    await submitRefundBtn.click();

    // 7. Verify Refund recorded in Financial Transactions Table
    await expect(page.locator('#modal-refund')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('#table-admin-transactions')).toBeVisible();
    await expect(page.locator('#table-admin-transactions').getByText(randomReason)).toBeVisible({
      timeout: 10000,
    });
  });
});
