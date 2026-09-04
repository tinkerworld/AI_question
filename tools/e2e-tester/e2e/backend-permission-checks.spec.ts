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

    const courseRes = await page.request.post('http://localhost:4043/api/v1/courses', {
      headers,
      data: { name: 'Should Be Rejected', code: 'REJ-001', durationMonths: 6 },
    });
    expect(courseRes.status()).toBe(403);

    const patternRes = await page.request.post('http://localhost:4043/api/v1/exam-patterns', {
      headers,
      data: { name: 'Should Be Rejected', courseId: 'c1', durationMinutes: 60, type: 'SINGLE' },
    });
    expect(patternRes.status()).toBe(403);

    const userRes = await page.request.post('http://localhost:4043/api/v1/users', {
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
    const questionRes = await page.request.post('http://localhost:4043/api/v1/questions', {
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
      await page.request.delete(`http://localhost:4043/api/v1/questions/${createdQuestion.data.id}`, {
        headers,
      }).catch(() => {});
    }

    // Teacher has no users.create - this should 403.
    const userRes = await page.request.post('http://localhost:4043/api/v1/users', {
      headers,
      data: { email: 'rejected@examos.com', password: 'Test@123', roleIds: [] },
    });
    expect(userRes.status()).toBe(403);
  });

  test('cross-student analytics access is rejected with 403 (IDOR/tenancy isolation)', async ({ page }) => {
    await loginAs(page, 'student');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Student 1 trying to access student2's analytics
    const idorRes = await page.request.get('http://localhost:4043/api/v1/students/usr_student2_test/mastery', {
      headers,
    });
    expect(idorRes.status()).toBe(403);
    const body = await idorRes.json();
    expect(body.errorCode).toBe('FORBIDDEN_ANALYTICS_ACCESS');
  });

  test('archive search protects against SQL injection in sortBy/sortOrder parameters', async ({ page }) => {
    await loginAs(page, 'student');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Malicious sortBy injection attempt
    const sqlInjRes = await page.request.get('http://localhost:4043/api/v1/archive/exams?sortBy=publishedAt%22;DROP%20TABLE%20users;--&sortOrder=DESC', {
      headers,
    });
    expect(sqlInjRes.status()).toBe(200);
    const body = await sqlInjRes.json();
    expect(body.success).toBe(true);
  });

  test('AI Gateway route rejects unauthenticated external requests without internal API key (401)', async ({ page }) => {
    // Unauthenticated request without internal key
    const unauthRes = await page.request.post('http://localhost:4043/api/v1/ai/gateway/route', {
      data: {
        featureKey: 'question_generation',
        scope: 'question_authoring',
        prompt: 'Generate questions',
      },
    });
    expect(unauthRes.status()).toBe(401);

    // Request with valid internal key succeeds
    const internalRes = await page.request.post('http://localhost:4043/api/v1/ai/gateway/route', {
      headers: {
        'x-ai-internal-key': 'examos_ai_internal_secret_key_v1',
      },
      data: {
        featureKey: 'question_generation',
        scope: 'question_authoring',
        prompt: 'Generate questions',
      },
    });
    expect(internalRes.status()).toBe(200);
  });

  test('AI Gateway route rejects malformed payload with 400 validation error', async ({ page }) => {
    const internalRes = await page.request.post('http://localhost:4043/api/v1/ai/gateway/route', {
      headers: {
        'x-ai-internal-key': 'examos_ai_internal_secret_key_v1',
      },
      data: {
        // Missing required featureKey and scope
        prompt: 'Malformed prompt without required fields',
      },
    });
    expect(internalRes.status()).toBe(400);
    const body = await internalRes.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid input parameters');
    expect(body.errors).toBeDefined();
  });
});


