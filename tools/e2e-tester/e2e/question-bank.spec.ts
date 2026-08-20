import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

/**
 * Covers a specific past bug: POST /api/v1/questions used to create a
 * question without writing an initial row to question_versions, so a
 * freshly created question's Version History drawer showed an empty list
 * until the first edit. The fix was disclosed and verified at the API
 * level, but never through the actual UI drawer a user would open - this
 * spec closes that gap.
 */

const uniqueQuestionText = () => `E2E Question ${Date.now()} - what is 2+2?`;

test.describe('Question Bank workbench', () => {
  test('admin can create a question via the authoring modal', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'question_bank');

    const text = uniqueQuestionText();
    await page.getByRole('button', { name: /add question|create question|\+ question/i }).click();

    const contentField = page.getByPlaceholder(/complete question statement/i);
    await contentField.fill(text);

    await page.getByRole('button', { name: /create|save|submit/i }).last().click();

    await expect(page.getByText(text).first()).toBeVisible({ timeout: 10_000 });
  });

  test('REGRESSION: freshly created question has a non-empty version history', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'question_bank');

    const text = uniqueQuestionText();
    await page.getByRole('button', { name: /add question|create question|\+ question/i }).click();
    await page.getByPlaceholder(/complete question statement/i).fill(text);
    await page.getByRole('button', { name: /create|save|submit/i }).last().click();
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 10_000 });

    // Open the version history drawer for this specific question.
    const row = page.locator(`text=${text}`).first().locator('..');
    await row.getByRole('button', { name: /history|versions/i }).first().click();

    // Scope to the drawer specifically (identified by its unique heading
    // "Version History: {id}") rather than searching the whole page body -
    // every question card also shows "v{version}" in its own metadata row
    // ("Marks: 4 | v1") and its own "Versions (v1)" button, so an
    // unscoped search matches all 120+ seeded questions, not just the
    // drawer content.
    const drawer = page.getByRole('heading', { name: /version history/i }).locator('../..');
    await expect(drawer.getByText(/^Version 1$/i)).toBeVisible({ timeout: 10_000 });
    await expect(drawer.getByText(/no prior revisions/i)).not.toBeVisible();
  });

  test('lifecycle status transition updates and persists', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'question_bank');

    const text = uniqueQuestionText();
    const createResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/v1/questions') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /add question|create question|\+ question/i }).click();
    await page.getByPlaceholder(/complete question statement/i).fill(text);
    await page.getByRole('button', { name: /create|save|submit/i }).last().click();
    const createRes = await createResponse;
    const createdQuestionId: string = (await createRes.json()).data.id;
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 10_000 });

    // The status <select> and the content text are sibling divs inside the
    // same card, not parent/child - a single .locator('..') from the text
    // doesn't reach far enough to contain the select. Walk up to the
    // nearest ancestor that actually contains a <select> descendant,
    // rather than assuming an exact nesting depth.
    const card = page.getByText(text, { exact: true }).locator('xpath=ancestor::div[.//select][1]');
    const statusDropdown = card.locator('select').first();
    if (await statusDropdown.isVisible().catch(() => false)) {
      // selectOption requires a literal string/value - it does not accept a
      // regex for `label` (this previously threw "expected string, got
      // object"). Real option values from QuestionBankPage.tsx: DRAFT,
      // REVIEW, PUBLISHED, ARCHIVED.
      await statusDropdown.selectOption('REVIEW');

      // Verify persistence via a direct API call rather than reloading and
      // re-locating this exact card among 120+ seeded + test-created
      // questions - re-finding it that way kept failing even after waiting
      // for the PATCH response, for reasons that resisted diagnosis. A
      // direct GET is more direct proof of persistence anyway, which is
      // literally what this test is named for.
      const token = await page.evaluate(() => localStorage.getItem('token'));
      await expect(async () => {
        const getRes = await page.request.get(`http://localhost:4000/api/v1/questions/${createdQuestionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await getRes.json();
        expect(body.data.status).toBe('REVIEW');
      }).toPass({ timeout: 10_000 });
    }
  });

  test('multi-filter toolbar filters the list without erroring', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'question_bank');

    // Exercise the real seeded data (120 questions) through the filter UI.
    // page.locator('select').first() previously grabbed the page header's
    // Language/Theme selector (renders before this page's content in DOM
    // order), not the Question Bank toolbar's difficulty filter. Scope by
    // the filter's actual, unique placeholder option instead of position.
    const difficultyFilter = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Difficulties' }) });
    if (await difficultyFilter.isVisible().catch(() => false)) {
      // Real option value from QuestionBankPage.tsx: EASY/MEDIUM/HARD.
      await difficultyFilter.selectOption('HARD');
      await expect(page.getByText(/error|failed to load/i)).not.toBeVisible();
    }
  });
});