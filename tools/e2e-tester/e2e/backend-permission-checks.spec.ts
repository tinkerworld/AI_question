import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/**
 * Backend API permission enforcement checks - deliberately separate from
 * the human-simulation UI suite.
 *
 * These tests hit the API directly (page.request) to verify server-side
 * authorization independent of the UI - a legitimate thing to test, but a
 * different thing than "does the button work", so it lives in its own
 * clearly-named file rather than mixed into role-based-access.spec.ts or
 * any other file that simulates a real user clicking through the app.
 * Login still goes through the real UI (loginAs) to obtain a genuine
 * token - only the assertions themselves are API-level.
 */

test.describe('Backend permission enforcement (API-level, not UI simulation)', () => {
  test('student is rejected from course/pattern/user creation (403)', async ({ page }) => {
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

  test('teacher can create questions but is rejected from user management (403)', async ({ page }) => {
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

    // Cleanup: this file is explicitly API-only (see file header), so an
    // API-based delete here is consistent with the file's own purpose,
    // unlike in the human-simulation suite where the same thing would be
    // wrong.
    const createdQuestion = await questionRes.json().catch(() => null);
    if (createdQuestion?.data?.id) {
      await page.request.delete(`http://localhost:4000/api/v1/questions/${createdQuestion.data.id}`, {
        headers,
      }).catch(() => {});
    }

    // Teacher has no users.create - this should 403.
    const userRes = await page.request.post('http://localhost:4000/api/v1/users', {
      headers,
      data: { email: 'rejected@examos.com', password: 'Test@123', roleIds: [] },
    });
    expect(userRes.status()).toBe(403);
  });
});
