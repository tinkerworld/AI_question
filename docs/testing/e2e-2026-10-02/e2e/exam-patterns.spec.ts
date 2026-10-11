import { test, expect, Page } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';
import { selectOptionByText, selectNearLabel } from './helpers/select';

/**
 * Restructured to avoid database clutter: two fixture patterns are
 * created once each (not per-test) and deleted in test.afterAll. Two
 * fixtures, not one, because the sub-admin test specifically verifies
 * SUB-ADMIN'S OWN create permission (exams.create) - reusing the admin's
 * pattern there would remove real coverage of that permission check, so
 * it still needs its own genuine create action. Cleanup runs as admin
 * (full permissions) regardless of which persona created each pattern.
 *
 * Covers two specific past bugs directly (unchanged from before):
 *   1. The "Create" button used to set React state but render nothing
 *      (dead modal).
 *   2. Edit UI for exam patterns didn't exist at all despite the backend
 *      fully supporting it.
 * Also covers Sub-Admin's exams.create permission, missing until fixed
 * mid-review (found via an "atomic permission" error).
 */

let page: Page;
const patternAName = `E2E Pattern A ${Date.now()}`;
let patternAEditedName: string;
const patternBName = `E2E Pattern B ${Date.now()}`;

async function fillPatternNameAndCourse(p: Page, name: string) {
  const courseSelect = selectNearLabel(p, 'Course');
  await selectOptionByText(courseSelect, /Engineering|Medical/i);
  await p.locator('input').first().fill(name);
}

test.describe.serial('Exam Patterns workbench', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    // Cleanup as admin - full permissions, works regardless of which
    // persona created which fixture. Best-effort per pattern so one
    // missing fixture (e.g. an earlier test failed before creating it)
    // doesn't prevent cleaning up the other.
    try {
      await loginAs(page, 'admin');
      await goToTab(page, 'exam_patterns');

      for (const name of [patternAEditedName || patternAName, patternBName]) {
        try {
          const row = page.locator('tr').filter({ has: page.getByText(name, { exact: true }) });
          if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
            page.once('dialog', (dialog) => dialog.accept());
            await row.getByRole('button', { name: /delete/i }).click();
            await expect(page.getByText(name, { exact: true })).not.toBeVisible({ timeout: 10_000 });
          }
        } catch {
          // Best-effort cleanup - don't let teardown mask a real test result.
        }
      }
    } catch {}

    await page.close();
  });

  test('admin can create a pattern via the UI and see it in the list', async () => {
    await loginAs(page, 'admin');
    await goToTab(page, 'exam_patterns');

    await page.getByText('+ Create Exam Pattern').click();
    // Regression check: the modal must actually render, not just toggle
    // hidden React state.
    await expect(page.locator('input').first()).toBeVisible({ timeout: 5000 });

    await fillPatternNameAndCourse(page, patternAName);
    const durationField = page.locator('input[type="number"]').first();
    if (await durationField.isVisible().catch(() => false)) {
      await durationField.fill('180');
    }
    await page.getByRole('button', { name: /create|save|submit/i }).last().click();

    await expect(page.getByText(patternAName, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('admin can edit an existing pattern and the change persists', async () => {
    await goToTab(page, 'exam_patterns');

    // Edits the SAME pattern created above rather than creating a new one.
    const row = page.getByText(patternAName, { exact: true }).locator('../..');
    await row.getByRole('button', { name: /edit/i }).click();

    // Creating a pattern auto-opens its "Builder" details panel, which has
    // its own "Section Name" input rendered earlier in DOM order than the
    // Edit modal - scoped via nearest-ancestor-with-input rather than a
    // fixed level count, since exact nesting depth has been miscounted
    // before.
    const editModal = page
      .getByRole('heading', { name: 'Edit Exam Pattern' })
      .locator('xpath=ancestor::div[.//input][1]');
    const nameInput = editModal.locator('input').first();
    await nameInput.fill('');
    patternAEditedName = `${patternAName} (edited)`;
    await nameInput.fill(patternAEditedName);

    const patchResponse = page.waitForResponse(
      (res) => res.url().includes('/exam-patterns/') && res.request().method() === 'PATCH'
    );
    await editModal.getByRole('button', { name: /save/i }).click();
    await patchResponse;

    await expect(page.getByText(patternAEditedName, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('sub-admin has exams.create permission and can create a pattern', async () => {
    // Genuine separate fixture, not a reuse - this test's whole point is
    // verifying sub-admin's OWN create action succeeds, not just that a
    // pattern exists.
    await loginAs(page, 'subAdmin');
    await goToTab(page, 'exam_patterns');

    await page.getByText('+ Create Exam Pattern').click();
    await fillPatternNameAndCourse(page, patternBName);
    await page.getByRole('button', { name: /create|save|submit/i }).last().click();

    // \b403\b, not a bare 403: a bare substring match can spuriously match
    // the pattern's own auto-generated name if its Date.now() timestamp
    // happens to contain "403" digits in sequence (confirmed this
    // happened previously).
    await expect(page.getByText(/permission|forbidden|\b403\b/i)).not.toBeVisible();
    await expect(page.getByText(patternBName, { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});