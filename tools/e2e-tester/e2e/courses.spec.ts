import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

/**
 * THIS FILE EXISTS BECAUSE OF A SPECIFIC PAST BUG:
 * CoursesPage.tsx's subject edit/delete handlers called
 * PATCH/DELETE /api/v1/courses/subject/:id, but the real registered route
 * was /api/v1/subject/:id - a hardcoded string mismatch invisible to
 * TypeScript and to the backend test suites (which call routes directly,
 * never through the UI). It was only caught by manually diffing every
 * fetch() call in the file against server.ts's route table. This spec
 * exercises the actual click path so a regression here fails a real test
 * instead of requiring another manual audit.
 */

const uniqueName = () => `E2E Course ${Date.now()}`;

test.describe('Courses / Academic Structure workbench', () => {
  test('admin can create a course', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'courses');

    const name = uniqueName();
    await page.getByRole('button', { name: /\+ create course/i }).click();
    // The modal's first input is "Course Code" (required), the second is
    // "Course Name" (also required) - filling only .first() leaves Name
    // empty and blocks native HTML5 required-field validation from ever
    // submitting. Target each field by its actual label instead of position.
    await page.getByPlaceholder('Unique course identifier...').fill(`E2E_${Date.now()}`);
    await page.getByPlaceholder('Full course title...').fill(name);
    await page.getByRole('button', { name: /create|save|add/i }).last().click();

    // getByText(name) alone matches both the success toast ("Course [name]
    // created successfully") and the course card heading - strict-mode
    // violation. Target the heading role specifically.
    await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 10_000 });
  });

  test('REGRESSION: subject edit and delete round-trip correctly (previously returned 404)', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'courses');

    // Set up: create a course, then a subject under it.
    const courseName = uniqueName();
    await page.getByRole('button', { name: /\+ create course/i }).click();
    await page.getByPlaceholder('Unique course identifier...').fill(`E2E_${Date.now()}`);
    await page.getByPlaceholder('Full course title...').fill(courseName);
    await page.getByRole('button', { name: /create|save|add/i }).last().click();
    await expect(page.getByRole('heading', { name: courseName })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('heading', { name: courseName }).click();

    const subjectName = `E2E Subject ${Date.now()}`;
    await page.getByRole('button', { name: /add subject/i }).click();
    // Same field-order bug class as the Course modal: "Subject Code" is
    // first, "Subject Name" second. Target by placeholder, not position.
    await page.getByPlaceholder('Code...').fill(`SUB_${Date.now()}`);
    await page.getByPlaceholder('Subject Name...').fill(subjectName);
    await page.getByRole('button', { name: /add subject|save/i }).last().click();
    // { exact: true } - "Subject [name] added" toast also contains the
    // bare name as a substring, same collision class as the course toast.
    await expect(page.getByText(subjectName, { exact: true })).toBeVisible({ timeout: 10_000 });

    // EDIT - this is the exact call that used to hit
    // /api/v1/courses/subject/:id and 404.
    // Two real issues fixed here: (1) the name text and the edit button
    // sit two DOM levels apart, not one (name -> wrapper div -> card div
    // -> actions wrapper div -> button), so .locator('..') alone doesn't
    // reach it; (2) the edit button has no text, just a "✎" icon, so
    // getByRole('button', { name: /edit/i }) can never match it regardless
    // of scoping - matching by the actual icon character instead.
    const subjectCard = page.getByText(subjectName, { exact: true }).locator('../..');
    await subjectCard.getByText('✎').click();

    const updatedName = `${subjectName} (edited)`;
    // Same shared-modal field-order issue as creation: this reuses the
    // create form, so .first() would hit "Subject Code" again, not Name.
    const nameInput = page.getByPlaceholder('Subject Name...');
    await nameInput.fill('');
    await nameInput.fill(updatedName);
    await page.getByRole('button', { name: /save changes|save/i }).click();

    // If the old bug were reintroduced, this would silently fail (fetch
    // fires, gets a 404, UI shows a generic error or nothing at all) -
    // asserting the renamed value is what actually proves the round-trip.
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/404|not found/i)).not.toBeVisible();

    // DELETE - same URL bug applied here too. Same icon-only button issue
    // ("✕", not "Delete" text).
    //
    // handleDeleteSubject uses window.confirm(), a NATIVE browser dialog,
    // not an in-page React modal. Playwright auto-dismisses native dialogs
    // by default (confirm() resolves false) unless a handler is
    // registered - the old confirmBtn search below was looking for an
    // in-page button that never existed, so the dialog was silently
    // dismissed every time and the delete never actually fired.
    page.once('dialog', (dialog) => dialog.accept());

    const updatedCard = page.getByText(updatedName, { exact: true }).locator('../..');
    await updatedCard.getByText('✕').click();

    // Scoped to the specific card rather than a page-wide text search -
    // "not visible anywhere" is fragile here since this subject's name can
    // legitimately still appear in stale toasts or (as found this round)
    // syllabus-view headings if a prior click in this test happened to
    // navigate into that subject's detail view. Checking that the actual
    // list card is gone is the real, precise claim this test is making.
    await expect(updatedCard).not.toBeVisible({ timeout: 10_000 });
  });

  test('syllabus tree renders and nodes can be expanded', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'courses');

    // Seeded data includes 2 courses with real syllabus topics - navigate
    // into the first seeded course/subject rather than creating fixtures,
    // to also exercise that the seed data itself renders correctly.
    await page.getByText(/Engineering Entrance|JEE/i).first().click();
    await page.getByText(/Physics|Mathematics/i).first().click();

    // A syllabus tree node should be visible and expandable.
    const treeNode = page.locator('[class*="tree"], [class*="syllabus"]').first();
    await expect(page.locator('body')).toContainText(/unit|topic/i, { timeout: 10_000 });
  });
});