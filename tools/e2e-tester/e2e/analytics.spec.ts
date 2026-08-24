import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

test.describe('Phase 8: Student Analytics, Mastery Engine & Institutional Dashboards', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
  });

  test('student can navigate to Analytics & Mastery, view summary metric cards, strengths, and weaknesses panels', async ({ page }) => {
    await loginAs(page, 'student');
    await goToTab(page, 'analytics');

    // Heading verification
    await expect(page.getByText('Student Mastery & Learning Analytics')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Real-time proficiency scoring, syllabus mastery mapping')).toBeVisible();

    // Summary Metric Cards
    await expect(page.getByText('Overall Mastery')).toBeVisible();
    await expect(page.getByText('Exams Completed')).toBeVisible();
    await expect(page.getByText('Questions Attempted')).toBeVisible();

    // Strengths & Weaknesses Panels
    await expect(page.getByText(/Top Strengths/i)).toBeVisible();
    await expect(page.getByText(/Priority Focus Areas/i)).toBeVisible();
  });

  test('student can view Syllabus Proficiency Map with color status badges and progress trends', async ({ page }) => {
    await loginAs(page, 'student');
    await goToTab(page, 'analytics');

    // Performance Trend Section
    await expect(page.getByText('Performance Trend & Progress History')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Last 7 Days' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last 30 Days' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All Time' })).toBeVisible();

    // Syllabus Proficiency Map Section & Legend
    await expect(page.getByText('Syllabus Proficiency Map')).toBeVisible();
    await expect(page.getByText(/Mastered \(>85%\)/i)).toBeVisible();
    await expect(page.getByText(/Strong \(70-85%\)/i)).toBeVisible();
    await expect(page.getByText(/Developing \(50-70%\)/i)).toBeVisible();
    await expect(page.getByText(/Weak \(<30%\)/i)).toBeVisible();
  });

  test('teacher/admin can view Faculty & Institutional Analytics, cohort common weaknesses, and student performance roster', async ({ page }) => {
    await loginAs(page, 'teacher');
    await goToTab(page, 'analytics');

    // Faculty Dashboard View
    await expect(page.getByText('Faculty & Institutional Analytics')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Class Average Mastery', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Enrolled Students', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Course Pass Rate', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Cohort Weaknesses & Student Roster
    await expect(page.getByText('Cohort Common Weaknesses & Problem Topics', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Student Performance Roster' })).toBeVisible();

    // Verify real enrolled student rows render in the roster table
    await expect(page.getByText('Student Learner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('student@examos.com')).toBeVisible();
    await expect(page.getByText('Priya Patel')).toBeVisible();
    await expect(page.getByText('student2@examos.com')).toBeVisible();
  });

  test('student 1 (student@examos.com) displays Mechanics & Physical Chem strengths, and Organic & Probability weaknesses', async ({ page }) => {
    await loginAs(page, 'student');
    await goToTab(page, 'analytics');

    await expect(page.getByText('Student Mastery & Learning Analytics')).toBeVisible({ timeout: 10_000 });

    // Strengths assertion
    const strengthsSection = page.locator('div').filter({ has: page.getByRole('heading', { name: /Top Strengths/i }) }).first();
    await expect(strengthsSection.getByText('Mechanics & Dynamics').first()).toBeVisible({ timeout: 10_000 });
    await expect(strengthsSection.getByText('Physical Chemistry & Kinetics').first()).toBeVisible({ timeout: 10_000 });

    // Weaknesses assertion
    const weaknessesSection = page.locator('div').filter({ has: page.getByRole('heading', { name: /Priority Focus Areas/i }) }).first();
    await expect(weaknessesSection.getByText('Organic Reactions & Mechanisms').first()).toBeVisible({ timeout: 10_000 });
    await expect(weaknessesSection.getByText('Probability, Permutations & Statistics').first()).toBeVisible({ timeout: 10_000 });

    // Capture visual snapshot
    await page.screenshot({ path: 'C:/Users/Shekhar/.gemini/antigravity-cli/brain/174fe062-7fed-402e-814f-2a491ab1b424/student1_analytics.png', fullPage: true });
  });

  test('student 2 (student2@examos.com) displays contrasting Organic & Probability strengths, and Mechanics & Physical Chem weaknesses', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    await expect(page.getByText('Sign in to ExamOS')).toBeVisible({ timeout: 10_000 });
    await page.locator('input[type="email"]').fill('student2@examos.com');
    await page.locator('input[type="password"]').fill('Student2@123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.locator('#nav-tab-dashboard')).toBeVisible({ timeout: 10_000 });
    await page.locator('#nav-tab-analytics').click();

    await expect(page.getByText('Student Mastery & Learning Analytics')).toBeVisible({ timeout: 10_000 });

    // Strengths assertion (inverse)
    const strengthsSection = page.locator('div').filter({ has: page.getByRole('heading', { name: /Top Strengths/i }) }).first();
    await expect(strengthsSection.getByText('Organic Reactions & Mechanisms').first()).toBeVisible({ timeout: 10_000 });
    await expect(strengthsSection.getByText('Probability, Permutations & Statistics').first()).toBeVisible({ timeout: 10_000 });

    // Weaknesses assertion (inverse)
    const weaknessesSection = page.locator('div').filter({ has: page.getByRole('heading', { name: /Priority Focus Areas/i }) }).first();
    await expect(weaknessesSection.getByText('Mechanics & Dynamics').first()).toBeVisible({ timeout: 10_000 });
    await expect(weaknessesSection.getByText('Physical Chemistry & Kinetics').first()).toBeVisible({ timeout: 10_000 });

    // Capture visual snapshot
    await page.screenshot({ path: 'C:/Users/Shekhar/.gemini/antigravity-cli/brain/174fe062-7fed-402e-814f-2a491ab1b424/student2_analytics.png', fullPage: true });
  });

  test('teacher can open student drilldown modal to inspect individual student mastery tree', async ({ page }) => {
    await loginAs(page, 'teacher');
    await goToTab(page, 'analytics');

    await expect(page.getByRole('heading', { name: 'Student Performance Roster' })).toBeVisible({ timeout: 10_000 });

    // Capture visual snapshot of teacher roster
    await page.screenshot({ path: 'C:/Users/Shekhar/.gemini/antigravity-cli/brain/174fe062-7fed-402e-814f-2a491ab1b424/teacher_analytics.png', fullPage: true });

    const modalHeading = page.getByRole('heading', { name: 'Individual Student Analytics Drilldown' });

    // 1. Drilldown into Student Learner (student@examos.com)
    const student1Row = page.locator('tr').filter({ hasText: 'Student Learner' });
    await expect(student1Row).toBeVisible({ timeout: 10_000 });
    await student1Row.getByRole('button', { name: /View Drilldown/i }).click();

    await expect(modalHeading).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Student: Student Learner (student@examos.com)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Student Mastery & Learning Analytics' })).toBeVisible();

    await page.getByRole('button', { name: /Close Drilldown/i }).click();
    await expect(modalHeading).not.toBeVisible();

    // 2. Drilldown into Priya Patel (student2@examos.com)
    const student2Row = page.locator('tr').filter({ hasText: 'Priya Patel' });
    await expect(student2Row).toBeVisible({ timeout: 10_000 });
    await student2Row.getByRole('button', { name: /View Drilldown/i }).click();

    await expect(modalHeading).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Student: Priya Patel (student2@examos.com)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Student Mastery & Learning Analytics' })).toBeVisible();

    await page.getByRole('button', { name: /Close Drilldown/i }).click();
    await expect(modalHeading).not.toBeVisible();
  });

  test('admin can view pre-published exams in Exam Archive vault', async ({ page }) => {
    await loginAs(page, 'admin');
    await goToTab(page, 'archive');

    await expect(page.getByText('Published Exam Archive & Question Vault')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('JEE Main Grand Mock Exam 1').first()).toBeVisible({ timeout: 10_000 });

    // Capture visual snapshot of exam archive
    await page.screenshot({ path: 'C:/Users/Shekhar/.gemini/antigravity-cli/brain/174fe062-7fed-402e-814f-2a491ab1b424/exam_archive.png', fullPage: true });
  });
});
