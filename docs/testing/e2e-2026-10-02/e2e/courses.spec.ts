import { test, expect, Page } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

/**
 * Restructured to avoid database clutter: instead of each test creating
 * its own throwaway course (leaving dozens of "E2E Course 1787..." rows
 * behind after every run), this file creates ONE shared course + subject
 * in test.beforeAll, runs every test against that same fixture in order
 * (test.describe.serial), and deletes both in test.afterAll - regardless
 * of whether an earlier test failed, since afterAll always runs.
 *
 * THIS FILE ALSO EXISTS BECAUSE OF A SPECIFIC PAST BUG (unchanged from
 * before): CoursesPage.tsx's subject edit/delete handlers called
 * PATCH/DELETE /api/v1/courses/subject/:id, but the real registered route
 * was /api/v1/subject/:id - only caught by manually diffing every
 * fetch() call against server.ts's route table. That regression coverage
 * is preserved below, just restructured to clean up after itself.
 */

let page: Page;
const courseName = `E2E Course ${Date.now()}`;
let subjectName: string;
let editedSubjectName: string;

test.describe.serial('Courses / Academic Structure workbench', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAs(page, 'admin');
    await goToTab(page, 'courses');
  });

  test.afterAll(async () => {
    // Cleanup runs even if a test above failed - this is the actual point.
    // Best-effort: if the course was never created (setup itself failed),
    // there's nothing to clean up, so failures here are swallowed rather
    // than masking the real test failure that already happened above.
    try {
      page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
      await goToTab(page, 'courses');
      const breadcrumb = page.locator('span:has-text("Courses")').first();
      if (await breadcrumb.isVisible().catch(() => false)) {
        await breadcrumb.click().catch(() => {});
      }
      const courseCard = page.locator('div[style*="border"]').filter({ hasText: courseName }).first();
      if (await courseCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await courseCard.locator('button:has-text("✕")').click({ timeout: 5000 }).catch(async () => {
          await courseCard.getByRole('button', { name: /delete/i }).click({ timeout: 5000 });
        });
        await expect(courseCard).not.toBeVisible({ timeout: 10_000 });
      }
    } catch {
      // Cleanup is best-effort - don't fail the whole suite over a
      // teardown issue when the real tests already reported their own
      // pass/fail accurately.
    }

    await page.close();
  });

  test('admin can create a course', async () => {
    await page.getByRole('button', { name: /\+ create course/i }).click();
    // The modal's first input is "Course Code" (required), the second is
    // "Course Name" (also required) - filling only .first() leaves Name
    // empty and blocks native HTML5 required-field validation from ever
    // submitting. Target each field by its actual label instead of position.
    await page.getByPlaceholder('Unique course identifier...').fill(`E2E_${Date.now()}`);
    await page.getByPlaceholder('Full course title...').fill(courseName);
    await page.getByRole('button', { name: /create|save|add/i }).last().click();

    // getByText(name) alone matches both the success toast ("Course [name]
    // created successfully") and the course card heading - strict-mode
    // violation. Target the heading role specifically.
    await expect(page.getByRole('heading', { name: courseName })).toBeVisible({ timeout: 10_000 });
  });

  test('syllabus tree renders and nodes can be expanded (seeded data, no fixture created)', async () => {
    // Deliberately uses SEEDED data, not the fixture course above - this
    // both avoids creating more clutter and exercises that the seed data
    // itself renders correctly, which the fixture course (freshly created,
    // empty syllabus) can't demonstrate.
    await goToTab(page, 'courses');
    await page.getByText(/Engineering Entrance|JEE/i).first().click();
    await page.getByText(/Physics|Mathematics/i).first().click();
    await expect(page.locator('body')).toContainText(/unit|topic/i, { timeout: 10_000 });
  });

  test('REGRESSION: subject create/edit/delete round-trip correctly (previously returned 404)', async () => {
    await goToTab(page, 'courses');
    const coursesBreadcrumb = page.getByText(/^Courses$/).first();
    if (await coursesBreadcrumb.isVisible().catch(() => false)) {
      await coursesBreadcrumb.click();
    }
    await page.getByRole('heading', { name: courseName }).click();

    subjectName = `E2E Subject ${Date.now()}`;
    await page.getByRole('button', { name: /add subject/i }).click();
    await page.getByPlaceholder('Code...').fill(`SUB_${Date.now()}`);
    await page.getByPlaceholder('Subject Name...').fill(subjectName);
    await page.getByRole('button', { name: /add subject|save/i }).last().click();
    await expect(page.getByText(subjectName, { exact: true })).toBeVisible({ timeout: 10_000 });

    // EDIT - this is the exact call that used to hit
    // /api/v1/courses/subject/:id and 404.
    const subjectCard = page.getByText(subjectName, { exact: true }).locator('../..');
    await subjectCard.getByText('✎').click();

    editedSubjectName = `${subjectName} (edited)`;
    const nameInput = page.getByPlaceholder('Subject Name...');
    await nameInput.fill('');
    await nameInput.fill(editedSubjectName);
    await page.getByRole('button', { name: /save changes|save/i }).click();

    // If the old bug were reintroduced, this would silently fail (fetch
    // fires, gets a 404, UI shows a generic error or nothing at all) -
    // asserting the renamed value is what actually proves the round-trip.
    await expect(page.getByText(editedSubjectName, { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/\b404\b|not found/i)).not.toBeVisible();

    // DELETE - same URL bug applied here too. handleDeleteSubject uses
    // window.confirm(), a NATIVE browser dialog, not an in-page React
    // modal - Playwright auto-dismisses native dialogs by default unless
    // a handler is registered.
    page.once('dialog', (dialog) => dialog.accept());
    const editedCard = page.getByText(editedSubjectName, { exact: true }).locator('../..');
    await editedCard.getByText('✕').click();

    // Scoped to the specific card rather than a page-wide text search -
    // this subject's name could still appear in a stale toast otherwise.
    await expect(editedCard).not.toBeVisible({ timeout: 10_000 });
  });
});