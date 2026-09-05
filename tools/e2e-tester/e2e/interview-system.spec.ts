import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test.describe('Phase 12: AI Interview & Oral Assessment System', () => {
  test('1. Sidebar Gating: Student enrolled in IELTS sees AI Interview tab and catalog', async ({ page }) => {
    // 1. Log in as Student 1 (student@examos.com - enrolled in IELTS)
    await loginAs(page, 'student');

    // Wait for sidebar navigation to load
    await expect(page.locator('#nav-tab-student_exams')).toBeVisible({ timeout: 10000 });

    // Assert that Interview tab IS visible for student 1
    const interviewTabStudent1 = page.locator('#nav-tab-interview');
    await expect(interviewTabStudent1).toBeVisible({ timeout: 10000 });

    // 2. Log in as Student 2 (student2@examos.com - enrolled in IELTS)
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
    test.setTimeout(120000);

    // 1. Log in as Student 2 (Interview eligible)
    await loginAs(page, 'student2');

    // Ensure Student 2 has active PREMIUM_PLUS plan for sufficient interview quota across repeated test runs
    await page.request.post('http://localhost:4043/api/v1/subscriptions', {
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

    // 4. Open Instructions Modal and Start Interview Session
    const openInstructionsBtn = page.locator('[id^="btn-open-instructions-"]').first();
    await expect(openInstructionsBtn).toBeVisible({ timeout: 10000 });
    await openInstructionsBtn.click();

    // Agree to instructions terms
    const agreeCheckbox = page.locator('#chk-agree-interview-instructions');
    await expect(agreeCheckbox).toBeVisible({ timeout: 5000 });
    await agreeCheckbox.check();

    // Confirm Begin Interview
    const beginBtn = page.locator('#btn-confirm-begin-interview');
    await expect(beginBtn).toBeEnabled();
    await beginBtn.click();

    // 5. Verify Live Interview Room mounts and active provider badge is displayed
    await expect(page.locator('#interview-main-counter')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('🤖 AI Examiner').first()).toBeVisible();
    await expect(page.locator('#active-provider-badge')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#active-provider-badge')).toContainText(/Cloud: nvidia\/llama-3.1-nemotron-70b-instruct|Cloud:|Local:/i);

    // 6. Submit Candidate Turn 1 Answer
    const inputField = page.locator('#input-interview-response');
    await expect(inputField).toBeVisible();
    await inputField.fill('My core framework prioritizes communicative fluency, lexical precision, and coherent discourse organization.');

    const submitTurnBtn = page.locator('#btn-submit-turn');
    await expect(submitTurnBtn).toBeEnabled();
    await submitTurnBtn.click();

    // 7. Verify finish early button becomes available
    const evaluateEarlyBtn = page.locator('#btn-evaluate-early');
    await expect(evaluateEarlyBtn).toBeVisible({ timeout: 60000 });
    await evaluateEarlyBtn.click();

    // 8. Verify Scorecard, IELTS Band Scores & Rubric Breakdown
    await expect(page.locator('#interview-final-score')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Multi-Criterion Rubric Breakdown')).toBeVisible();
    await expect(page.getByText('Key Demonstrations & Strengths')).toBeVisible();
    await expect(page.getByText('Full Conversation Transcript Review')).toBeVisible();

    // Verify IELTS 4 Criteria score rows are displayed
    await expect(page.getByText('Fluency & Coherence').first()).toBeVisible();
    await expect(page.getByText('Lexical Resource').first()).toBeVisible();
    await expect(page.getByText('Grammatical Range & Accuracy').first()).toBeVisible();
    await expect(page.getByText('Pronunciation').first()).toBeVisible();

    // 9. View My Attempts History
    const historyBtn = page.getByRole('button', { name: /My Attempts/i });
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    await expect(page.getByText('Past Interview Attempts & Evaluated Transcripts')).toBeVisible();
  });
});
