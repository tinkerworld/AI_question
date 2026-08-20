import { test, expect } from '@playwright/test';
import { loginAs, goToTab, PERSONAS } from './helpers/auth';

/**
 * Role-based access control coverage.
 *
 * WHY THIS EXISTS: every other spec in this suite logs in as 'admin' (or
 * 'subAdmin' for one permission check). Nothing exercises what a Teacher or
 * Student actually gets - or should be prevented from getting - which is
 * the whole point of this app having four distinct personas at all.
 *
 * IMPORTANT SCOPING NOTE, checked directly against source before writing
 * these tests:
 *   - Backend permission enforcement is real and correctly scoped
 *     (packages/permissions/src/index.ts): TEACHER has courses.read,
 *     questions.read/create/update, exams.read/create - no course or user
 *     management. STUDENT has courses.read, exams.read/attempt only -
 *     nothing else. requirePermission() middleware gates every route that
 *     matters. The tests below that hit the API directly should PASS now.
 *   - The frontend does NOT currently gate anything by role. App.tsx's
 *     sidebar renders the identical tab list (dashboard, exams,
 *     exam_patterns, question_bank, courses, users, analytics) regardless
 *     of who's logged in - role only shows up as a colored badge, never as
 *     an access check. The tests below marked TARGET: are written against
 *     the correct, intended behavior and are EXPECTED TO FAIL until that
 *     gap is closed - they are not testing something already broken (that
 *     would be REGRESSION:), they're specifying something not yet built.
 *   - A dedicated student exam-taking interface is Phase 6 (Exam-Taking
 *     Frontend, task 6.8), not yet built. Nothing here assumes it exists -
 *     these tests only check that a Student does NOT get the ADMIN
 *     interface, not that they get a student-specific one instead.
 */

test.describe('Role-based access control', () => {
  test('all four personas can log in successfully', async ({ page }) => {
    for (const persona of Object.keys(PERSONAS) as (keyof typeof PERSONAS)[]) {
      await loginAs(page, persona);
      await expect(page.locator('#nav-tab-dashboard')).toBeVisible();
      await page.evaluate(() => localStorage.clear());
    }
  });

  test('backend: student is rejected from course/pattern/user creation (403)', async ({ page }) => {
    await loginAs(page, 'student');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const courseRes = await page.request.post('http://localhost:4000/api/v1/courses', {
      headers,
      data: { name: 'Should Be Rejected', code: 'REJ-001', durationMonths: 6 },
    });
    expect(courseRes.status()).toBe(403);

    const patternRes = await page.request.post('http://localhost:4000/api/v1/exam-patterns', {
      headers,
      data: { name: 'Should Be Rejected', courseId: 'c1', durationMinutes: 60, type: 'SINGLE' },
    });
    expect(patternRes.status()).toBe(403);

    const userRes = await page.request.post('http://localhost:4000/api/v1/users', {
      headers,
      data: { email: 'rejected@examos.com', password: 'Test@123', roleIds: [] },
    });
    expect(userRes.status()).toBe(403);
  });

  test('backend: teacher can create questions but is rejected from user management (403)', async ({ page }) => {
    await loginAs(page, 'teacher');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Teacher has questions.create - this should NOT 403 (may still fail
    // validation for other reasons, but never on permission grounds).
    const questionRes = await page.request.post('http://localhost:4000/api/v1/questions', {
      headers,
      data: {
        subjectId: 'sub_phy',
        topicId: 'top_mech',
        type: 'MCQ',
        difficulty: 'EASY',
        marks: 1,
        content: `RBAC test question ${Date.now()}`,
        options: [
          { id: 'a', text: '1', isCorrect: true },
          { id: 'b', text: '2', isCorrect: false },
        ],
        correctOptionId: 'a',
      },
    });
    expect(questionRes.status()).not.toBe(403);

    // Teacher has no users.create - this should 403.
    const userRes = await page.request.post('http://localhost:4000/api/v1/users', {
      headers,
      data: { email: 'rejected@examos.com', password: 'Test@123', roleIds: [] },
    });
    expect(userRes.status()).toBe(403);
  });

  test('TARGET: student does not see admin-only nav tabs (question bank, courses, users)', async ({ page }) => {
    await loginAs(page, 'student');

    // A Student has no business seeing Question Bank, Academic Structure,
    // User Management, or Exam Administration (exams/exam_patterns) - these
    // are pure admin/teacher tooling. This is not about Phase 6's not-yet-built
    // student exam UI; it's about the CURRENT admin UI being shown to a role
    // that can't use most of it.
    await expect(page.locator('#nav-tab-exams')).not.toBeVisible();
    await expect(page.locator('#nav-tab-exam_patterns')).not.toBeVisible();
    await expect(page.locator('#nav-tab-question_bank')).not.toBeVisible();
    await expect(page.locator('#nav-tab-courses')).not.toBeVisible();
    await expect(page.locator('#nav-tab-users')).not.toBeVisible();
  });

  test('TARGET: teacher does not see user management or course administration', async ({ page }) => {
    await loginAs(page, 'teacher');

    // Teacher has questions.create/update and exams.create - Question Bank
    // and Exams are legitimately theirs. Courses (course/subject creation)
    // and Users are not - TEACHER has courses.read only, no create/update,
    // and no users.* at all.
    await expect(page.locator('#nav-tab-users')).not.toBeVisible();
    await expect(page.locator('#nav-tab-courses')).not.toBeVisible();
  });
});
