import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';
import { selectOptionByText, selectNearLabel } from './helpers/select';

/**
 * Covers two specific past bugs directly:
 *   1. The "Create" button used to set React state but render nothing
 *      (dead modal) - the create flow here asserts the modal actually
 *      appears AND that submitting actually creates a visible row.
 *   2. Edit UI for exam patterns didn't exist at all despite the backend
 *      fully supporting it - the edit flow asserts a real PATCH round-trips
 *      to a visibly updated value, not just that a modal opens.
 * Also covers Sub-Admin's exams.create permission, which was missing until
 * fixed mid-review (found via an "atomic permission" error).
 *
 * NOTE: the Create Exam Pattern modal now requires selecting a Course
 * (added as a fix for a real bug: courseId used to stay '' for the entire
 * create flow with no selector at all, so every UI-driven creation failed
 * server-side validation). Every test below selects a course before
 * submitting - the Create button is legitimately disabled without one.
 */

const uniqueName = () => `E2E Pattern ${Date.now()}`;

async function fillPatternNameAndCourse(page: import('@playwright/test').Page, name: string) {
  const courseSelect = selectNearLabel(page, 'Course');
  // Seeded course from prisma/seed.ts - either seeded course works, this
  // just needs *a* valid course selected to satisfy the required field.
  await selectOptionByText(courseSelect, /Engineering|Medical/i);
  await page.locator('input').first().fill(name);
}

test.describe('Exam Patterns workbench', () => {
  test('admin can create a pattern via the UI and see it in the list', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'exam_patterns');

    const name = uniqueName();
    await page.getByText('+ Create Exam Pattern').click();

    // Regression check: the modal must actually render, not just toggle
    // hidden React state.
    await expect(page.locator('input').first()).toBeVisible({ timeout: 5000 });

    await fillPatternNameAndCourse(page, name);
    // Duration / description fields are filled defensively - selectors are
    // best-effort by placeholder/label since the form has no test ids yet.
    const durationField = page.locator('input[type="number"]').first();
    if (await durationField.isVisible().catch(() => false)) {
      await durationField.fill('180');
    }

    await page.getByRole('button', { name: /create|save|submit/i }).last().click();

    // Real assertion: the pattern actually appears in the list afterward,
    // not just that the modal closed. { exact: true } because getByText(name)
    // alone also matches the success toast ("Created pattern "[name]"
    // successfully.") - the toast's full text isn't an exact match for the
    // bare name, so this disambiguates without needing a heading role
    // (this page uses a plain <div> for the name, not <h3>).
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('admin can edit an existing pattern and the change persists', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'exam_patterns');

    // Create a fixture pattern to edit, so this test doesn't depend on
    // seeded data existing in a particular state.
    const originalName = uniqueName();
    await page.getByText('+ Create Exam Pattern').click();
    await fillPatternNameAndCourse(page, originalName);
    await page.getByRole('button', { name: /create|save|submit/i }).last().click();
    await expect(page.getByText(originalName, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Now edit it. The name and the Edit button live in sibling <td> cells
    // within the same <tr>, not parent/child - one .locator('..') only
    // reaches the name's own <td>. Go up to the shared <tr>.
    const row = page.getByText(originalName, { exact: true }).locator('../..');
    await row.getByRole('button', { name: /edit/i }).click();

    // Creating a pattern auto-opens its "Builder" details panel
    // (handleCreatePattern calls fetchPatternDetails on success), which
    // has its own "Section Name" input rendered earlier in DOM order than
    // the Edit modal - page.locator('input').first() was grabbing that
    // one instead of the modal's actual Pattern Name field.
    //
    // Scoped via nearest-ancestor-with-input rather than manually counting
    // JSX levels from the heading - the previous attempt
    // (.locator('../..')) miscounted the actual nesting (heading -> its
    // wrapper div -> the modal's header row div is only 2 levels; the
    // form/input live in a THIRD sibling div one level further up), which
    // timed out finding any input at all. This pattern is depth-agnostic.
    const editModal = page
      .getByRole('heading', { name: 'Edit Exam Pattern' })
      .locator('xpath=ancestor::div[.//input][1]');
    const nameInput = editModal.locator('input').first();
    await nameInput.fill('');
    const updatedName = `${originalName} (edited)`;
    await nameInput.fill(updatedName);

    const patchResponse = page.waitForResponse(
      (res) => res.url().includes('/exam-patterns/') && res.request().method() === 'PATCH'
    );
    await editModal.getByRole('button', { name: /save/i }).click();
    await patchResponse;

    // Regression check: this used to have no Edit UI at all. Confirm the
    // updated value actually shows up, not just that the request fired.
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('sub-admin has exams.create permission and can create a pattern', async ({ page }) => {
    await loginAs(page, 'subAdmin');
    await goToTab(page, 'exam_patterns');

    const name = uniqueName();
    await page.getByText('+ Create Exam Pattern').click();
    await fillPatternNameAndCourse(page, name);
    await page.getByRole('button', { name: /create|save|submit/i }).last().click();

    // Regression check: this specific permission was missing before and
    // surfaced as an "atomic permission" error rather than a UI failure -
    // confirm no error banner appears and the pattern is created.
    //
    // \b403\b, not a bare 403: a bare substring match can spuriously match
    // the pattern's own auto-generated name if its Date.now() timestamp
    // happens to contain "403" digits in sequence (confirmed this
    // happened: timestamp 1787204033528 contains "403" at index 6-8).
    // \b requires a non-digit boundary on both sides, which a run of
    // consecutive digits in a timestamp never has internally.
    await expect(page.getByText(/permission|forbidden|\b403\b/i)).not.toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});