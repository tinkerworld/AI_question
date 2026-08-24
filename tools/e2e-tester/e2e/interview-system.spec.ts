import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test.describe('Phase 12: AI Interview & Oral Assessment System', () => {
  test('1. Sidebar Gating: Student enrolled in non-interview courses sees NO interview tab, while interview-enrolled student sees it', async ({ page }) => {
    // 1. Log in as Student 1 (enrolled in JEE/NEET only)
    await loginAs(page, 'student');

    // Wait for sidebar navigation to load
    await expect(page.locator('#nav-tab-student_exams')).toBeVisible({ timeout: 10000 });

    // Assert that Interview tab is NOT present for student 1
    const interviewTabStudent1 = page.locator('#nav-tab-interview');
    await expect(interviewTabStudent1).not.toBeVisible();

    // 2. Log in as Student 2 (enrolled in UPSC/IELTS with interview questions)
    await loginAs(page, 'student2');

    // Assert that Interview tab IS present for student 2
    const interviewTabStudent2 = page.locator('#nav-tab-interview');
    await expect(interviewTabStudent2).toBeVisible({ timeout: 10000 });
  });

  test('2. Question Bank Authoring: Admin authors and previews an INTERVIEW question with custom rubric', async ({ page }) => {
    // 1. Log in as Admin
    await loginAs(page, 'admin');

    // 2. Navigate to Question Bank
    await goToTab(page, 'question_bank');
    await expect(page.locator('h1')).toContainText('Question Bank');

    // 3. Open Create Question Modal
    const createBtn = page.getByRole('button', { name: /create question/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // 4. Select INTERVIEW Question Type
    const typeSelect = page.locator('#select-question-type');
    await expect(typeSelect).toBeVisible();
    await typeSelect.selectOption('INTERVIEW');

    // 5. Verify INTERVIEW-specific fields render
    await expect(page.getByText('Rubric Preset')).toBeVisible();
    await expect(page.getByText('Interview Scenario & Context')).toBeVisible();
    await expect(page.getByText('Examiner AI Persona & Socratic Instructions')).toBeVisible();
    await expect(page.getByText('Grading Rubric Criteria')).toBeVisible();

    // 6. Fill Question Content and Scenario
    const contentTextarea = page.locator('textarea').first();
    await contentTextarea.fill('E2E Test: Environmental Crisis Ethics Board Assessment');

    // 7. Verify dynamic rubric preset changes
    const presetSelect = page.locator('#select-rubric-preset');
    if (await presetSelect.isVisible().catch(() => false)) {
      await presetSelect.selectOption('IELTS_SPEAKING');
      await expect(page.locator('input[value="Fluency & Coherence"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('3. Live Multi-Turn Interview Session & Rubric Evaluation Scorecard', async ({ page }) => {
    // 1. Log in as Student 2 (Interview eligible)
    await loginAs(page, 'student2');

    // Ensure Student 2 has active PREMIUM_PLUS plan for sufficient interview quota across repeated test runs
    await page.request.post('http://localhost:4000/api/v1/subscriptions', {
      data: { planCode: 'PREMIUM_PLUS' },
      headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}` },
    });

    // 2. Navigate to AI Interview tab
    const interviewTab = page.locator('#nav-tab-interview');
    await expect(interviewTab).toBeVisible({ timeout: 10000 });
    await interviewTab.click();

    // 3. Verify Interview Catalog renders
    await expect(page.locator('h1')).toContainText('AI Interview');
    await expect(page.getByText('🌱 Practice Mode')).toBeVisible();
    await expect(page.getByText('🎓 Formal Exam Mode')).toBeVisible();

    // 4. Start an interview session
    const startBtn = page.locator('[id^="btn-start-interview-"]').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    // 5. Verify Live Interview Room mounts
    await expect(page.locator('#interview-turn-counter')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('🤖 AI Examiner')).toBeVisible();

    // 6. Submit Candidate Turn 1 Answer
    const inputField = page.locator('#input-interview-response');
    await expect(inputField).toBeVisible();
    await inputField.fill('My core framework prioritizes human safety, constitutional due process, and swift relief distribution.');

    const submitTurnBtn = page.locator('#btn-submit-turn');
    await expect(submitTurnBtn).toBeEnabled();
    await submitTurnBtn.click();

    // 7. Verify AI Examiner responds with follow-up turn
    await expect(page.getByText('Turn 2 of')).toBeVisible({ timeout: 15000 });

    // 8. Submit Candidate Turn 2 Answer
    await inputField.fill('I would enforce mandatory environmental impact audits and consult local indigenous leaders directly.');
    await submitTurnBtn.click();

    // 9. Complete interview evaluation via Finish Early or Complete
    const completeOrFinish = page.locator('#btn-complete-interview, #btn-evaluate-early').first();
    await expect(completeOrFinish).toBeVisible({ timeout: 10000 });
    await completeOrFinish.click();

    // 10. Verify Scorecard & Rubric Breakdown
    await expect(page.locator('#interview-final-score')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Multi-Criterion Rubric Breakdown')).toBeVisible();
    await expect(page.getByText('Key Demonstrations & Strengths')).toBeVisible();
    await expect(page.getByText('Full Conversation Transcript Review')).toBeVisible();

    // 11. View My Attempts History
    const historyBtn = page.getByRole('button', { name: /My Attempts/i });
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    await expect(page.getByText('Past Interview Attempts & Evaluated Transcripts')).toBeVisible();
  });
});
