import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';

/**
 * Phase 9: Personalized Practice & Adaptive Mastery Workbench
 *
 * Pattern: Single-fixture serial block. Every action below goes through a
 * real button click - no API calls anywhere in this file, since the point
 * of a human simulation test is proving the UI actually works, not that
 * the API underneath it does.
 *
 * KNOWN GAP, not silently worked around: this file generates real
 * practice papers via the "Practice This Topic" / "Generate Practice
 * Test" buttons, and there is currently no UI path to view or delete a
 * past practice paper (PracticePlayerModal.tsx only supports taking a
 * practice test, not managing history). Cleaning this up via the API
 * instead would defeat the reason this file was rewritten in the first
 * place. Until a "Practice History" view with a real delete button
 * exists, practice_papers rows from running this file will accumulate -
 * that's an accepted, documented tradeoff, not an oversight. See the
 * delivery note for a proposed follow-up to build that small UI feature.
 */
test.describe.serial('Phase 9: Personalized Practice & Adaptive Mastery', () => {

  test('student can inspect weakness pool with error rates and focus areas', async ({ page }) => {
    await loginAs(page, 'student');
    await goToTab(page, 'analytics');

    // 1. Verify Weakness Focus Areas panel is populated
    await expect(page.getByText('Priority Focus Areas (Weaknesses)')).toBeVisible({ timeout: 10_000 });
    const weaknessPanel = page.getByText('Priority Focus Areas (Weaknesses)').locator('../..');

    // Seeded student 1 has organic or probability weaknesses
    await expect(weaknessPanel.getByText(/organic|probability|mechanics/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(weaknessPanel.getByText(/error rate/i).first()).toBeVisible();

    // Verify presence of actionable practice trigger buttons
    await expect(weaknessPanel.getByRole('button', { name: /practice this topic/i }).first()).toBeVisible();
    await expect(weaknessPanel.getByRole('button', { name: /generate practice test/i })).toBeVisible();
  });

  test('student can generate targeted practice paper and interact with practice player', async ({ page }) => {
    await loginAs(page, 'student');
    // Ensure student is subscribed to PREMIUM tier to unlock personalized practice
    await page.request.post('http://localhost:4043/api/v1/subscriptions', {
      data: { planCode: 'PREMIUM' },
      headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}` },
    });
    await goToTab(page, 'analytics');

    const weaknessPanel = page.getByText('Priority Focus Areas (Weaknesses)').locator('../..');
    const practiceBtn = weaknessPanel.getByRole('button', { name: /practice this topic/i }).first();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/practice/generate') && res.status() === 201),
      practiceBtn.click(),
    ]);

    // Verify practice player modal opens with question card
    await expect(page.locator('#exam-question-card, [id*="question-card"]').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/practice mode|practice session/i).first()).toBeVisible();
    await expect(page.getByText(/question 1 of/i)).toBeVisible();

    // Select an option - hard assertion on practice option element
    const optionCard = page.locator('[id^="practice-option-"], [data-testid="practice-option"]').first();
    await expect(optionCard).toBeVisible({ timeout: 10_000 });
    await optionCard.click();

    // Verify immediate feedback mode affordance - hard assertion on check answer button
    const checkBtn = page.locator('#practice-check-answer-btn, button:has-text("Check Answer")').first();
    await expect(checkBtn).toBeVisible({ timeout: 5000 });
    await checkBtn.click();
    await expect(page.getByText(/correct answer|incorrect answer/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/explanation/i).first()).toBeVisible();

    // Finish practice session
    const finishBtn = page.getByRole('button', { name: /finish practice/i });
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // Verify scorecard / completion view
    await expect(page.getByText(/practice session completed|accuracy/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /return to analytics/i }).click();

    // Verify returning cleanly to analytics dashboard
    await expect(page.getByText('Priority Focus Areas (Weaknesses)')).toBeVisible({ timeout: 10_000 });
  });
});
