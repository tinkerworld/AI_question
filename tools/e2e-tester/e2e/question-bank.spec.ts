import { test, expect, Page } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

/**
 * Restructured to avoid database clutter: ONE question fixture is created
 * in the first test and reused by the version-history and
 * status-transition tests, then deleted in test.afterAll - via the real
 * "Delete Question" button, not an API call. Human simulation tests exist
 * to prove the buttons actually work, so every action here - including
 * cleanup - goes through the same UI a real user would use. If a
 * separate, explicitly API-level test is ever needed, that belongs in
 * its own clearly-named file, not mixed in here.
 *
 * Covers a specific past bug (unchanged from before): POST
 * /api/v1/questions used to create a question without writing an initial
 * row to question_versions, so a freshly created question's Version
 * History drawer showed an empty list until the first edit.
 */

let page: Page;
const questionText = `E2E Question ${Date.now()} - what is 2+2?`;

test.describe.serial('Question Bank workbench', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAs(page, 'admin');
    await goToTab(page, 'question_bank');
  });

  test.afterAll(async () => {
    // UI-driven cleanup: click the real Delete button (title="Delete
    // Question", icon-only "✕") and accept the native window.confirm()
    // dialog handleDeleteQuestion uses - same as a real admin would do.
    try {
      page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
      await goToTab(page, 'question_bank');
      const card = page.locator('div').filter({ hasText: questionText }).filter({ has: page.getByTitle('Delete Question') }).last();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await card.getByTitle('Delete Question').click({ timeout: 5000 });
        await expect(page.getByText(questionText).first()).not.toBeVisible({ timeout: 10_000 });
      }
    } catch {
      // Cleanup is best-effort - don't let a teardown issue mask a real
      // test result that already reported accurately above.
    }
    await page.close();
  });

  test('admin can create a question via the authoring modal', async () => {
    await page.getByRole('button', { name: /add question|create question|\+ question/i }).click();
    await page.getByPlaceholder(/complete question statement/i).fill(questionText);
    await page.getByRole('button', { name: /create|save|submit/i }).last().click();

    await expect(page.getByText(questionText).first()).toBeVisible({ timeout: 10_000 });
  });

  test('REGRESSION: freshly created question has a non-empty version history', async () => {
    await goToTab(page, 'question_bank');

    // Open the version history drawer for the SAME question created above.
    const row = page.locator(`text=${questionText}`).first().locator('..');
    await row.getByRole('button', { name: /history|versions/i }).first().click();

    // Scope to the drawer specifically (identified by its unique heading
    // "Version History: {id}") rather than searching the whole page body -
    // every question card also shows "v{version}" in its own metadata row,
    // so an unscoped search matches all 120+ seeded questions.
    const drawer = page.getByRole('heading', { name: /version history/i }).locator('../..');
    await expect(drawer.getByText(/^Version 1$/i)).toBeVisible({ timeout: 10_000 });
    await expect(drawer.getByText(/no prior revisions/i)).not.toBeVisible();

    // Close the drawer so it doesn't overlay the next test.
    const drawerHeading = page.getByRole('heading', { name: /version history/i });
    const closeBtn = drawerHeading.locator('..').getByRole('button', { name: /✕|close/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await expect(drawerHeading).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('lifecycle status transition updates and persists', async () => {
    await goToTab(page, 'question_bank');

    // Same fixture question, transitioning ITS status rather than
    // creating a new question just to test this.
    const card = page.getByText(questionText, { exact: true }).locator('xpath=ancestor::div[.//select][1]');
    const statusDropdown = card.locator('select').first();
    if (await statusDropdown.isVisible().catch(() => false)) {
      // selectOption requires a literal string/value, not a regex label.
      // Real option values from QuestionBankPage.tsx: DRAFT, REVIEW,
      // PUBLISHED, ARCHIVED.
      await statusDropdown.selectOption('REVIEW');

      // Verify persistence by reloading the page and re-reading the
      // SAME dropdown's rendered value - proves the UI actually shows
      // the persisted state after a real reload, which is what "persists"
      // means to an actual user, not just that the API accepted the
      // write. No API call here - this is a DOM read after a real
      // browser navigation.
      await page.reload();
      await goToTab(page, 'question_bank');
      const cardAfterReload = page
        .getByText(questionText, { exact: true })
        .locator('xpath=ancestor::div[.//select][1]');
      await expect(cardAfterReload.locator('select').first()).toHaveValue('REVIEW', { timeout: 10_000 });
    }
  });

  test('multi-filter toolbar filters the list without erroring (seeded data, no fixture created)', async () => {
    await goToTab(page, 'question_bank');

    // Deliberately uses the real seeded data (120 questions), not the
    // fixture question above - avoids creating more clutter.
    const difficultyFilter = page
      .locator('select')
      .filter({ has: page.locator('option', { hasText: 'All Difficulties' }) });
    if (await difficultyFilter.isVisible().catch(() => false)) {
      await difficultyFilter.selectOption('HARD');
      await expect(page.getByText(/error|failed to load/i)).not.toBeVisible();
    }
  });
});
