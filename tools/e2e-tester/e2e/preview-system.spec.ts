import { test, expect, Page } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';
import { selectNearLabel } from './helpers/select';

let page: Page;

test.describe.serial('Phase 10: Preview System & Impersonation Workbench', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    // If still in impersonation, exit cleanly
    try {
      const exitBtn = page.locator('#exit-preview-btn');
      if (await exitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await exitBtn.click();
      }
    } catch {}
    await page.close();
  });

  test('staff can configure and launch Preview mode with simulated plans and visual banner', async () => {
    await loginAs(page, 'admin');

    // 1. Click "Preview as Student" from header
    const previewBtn = page.locator('#header-preview-mode-btn, button:has-text("Preview as Student")');
    await expect(previewBtn).toBeVisible({ timeout: 10_000 });
    await previewBtn.click();

    // 2. Preview Configuration Modal appears
    const modal = page.locator('#preview-config-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Configure Preview Persona/i)).toBeVisible();

    // 3. Select "Premium Student" preset
    const premiumPresetBtn = page.locator('#preset-premium, button:has-text("Premium Student")');
    await expect(premiumPresetBtn).toBeVisible();
    await premiumPresetBtn.click();

    // 4. Launch Preview
    const launchBtn = page.locator('#start-preview-btn');
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // 5. Verify Persistent Preview Banner appears
    const banner = page.locator('#preview-banner');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/PREVIEW MODE/i);
    await expect(banner).toContainText(/Simulated Plan:\s*PREMIUM/i);

    // 6. Verify student navigation is accessible under preview mode
    await goToTab(page, 'student_exams');
    await expect(page.getByText(/Assessment List|Available Assessments|No scheduled assessments|My Assessments/i).first()).toBeVisible({ timeout: 10_000 });

    // 7. Verify banner remains sticky and visible across page switches
    await expect(banner).toBeVisible();

    // 8. Open Quick Config flyout from banner
    const quickConfigBtn = page.locator('#preview-quick-config-btn');
    await expect(quickConfigBtn).toBeVisible();
    await quickConfigBtn.click();
    await expect(modal).toBeVisible();

    // 9. Switch plan to FREE
    const freePresetBtn = page.locator('#preset-free, button:has-text("Free Student")');
    await expect(freePresetBtn).toBeVisible();
    await freePresetBtn.click();
    await launchBtn.click();

    // 10. Verify banner updates to reflect FREE plan
    await expect(banner).toContainText(/Simulated Plan:\s*FREE/i);

    // 11. Exit Preview
    const exitBtn = page.locator('#exit-preview-btn');
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // 12. Confirm banner is gone and staff header restored
    await expect(banner).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#header-preview-mode-btn')).toBeVisible({ timeout: 10_000 });
  });

  test('per-row impersonate button is visible for student rows but strictly hidden for teacher and admin rows', async () => {
    await loginAs(page, 'admin');
    await goToTab(page, 'users');

    // 1. Ensure user roster table has loaded
    const userTable = page.locator('table');
    await expect(userTable).toBeVisible({ timeout: 10_000 });

    // 2. Check Student row (student@examos.com) -> Impersonate button MUST be visible
    const studentRow = page.locator('tr').filter({ hasText: 'student@examos.com' }).first();
    await expect(studentRow).toBeVisible();
    const studentImpersonateBtn = studentRow.locator('button[id^="impersonate-user-"], button:has-text("Impersonate")');
    await expect(studentImpersonateBtn).toBeVisible();

    // 3. Check Teacher row (teacher@examos.com) -> Impersonate button MUST NOT be visible
    const teacherRow = page.locator('tr').filter({ hasText: 'teacher@examos.com' }).first();
    await expect(teacherRow).toBeVisible();
    const teacherImpersonateBtn = teacherRow.locator('button[id^="impersonate-user-"], button:has-text("Impersonate")');
    await expect(teacherImpersonateBtn).not.toBeVisible();

    // 4. Check Admin row (admin@examos.com) -> Impersonate button MUST NOT be visible
    const adminRow = page.locator('tr').filter({ hasText: 'admin@examos.com' }).first();
    await expect(adminRow).toBeVisible();
    const adminImpersonateBtn = adminRow.locator('button[id^="impersonate-user-"], button:has-text("Impersonate")');
    await expect(adminImpersonateBtn).not.toBeVisible();

    // 5. Check Sub-Admin row (subadmin@examos.com) -> Impersonate button MUST NOT be visible
    const subAdminRow = page.locator('tr').filter({ hasText: 'subadmin@examos.com' }).first();
    if (await subAdminRow.isVisible().catch(() => false)) {
      const subAdminImpersonateBtn = subAdminRow.locator('button[id^="impersonate-user-"], button:has-text("Impersonate")');
      await expect(subAdminImpersonateBtn).not.toBeVisible();
    }
  });

  test('admin can impersonate real student with mandatory justification and inspect entry in Security Audit Trail', async () => {
    await loginAs(page, 'admin');
    await goToTab(page, 'users');

    const uniqueAuditReason = `Investigating reported physics scorecard discrepancy - ${Date.now()}`;

    // 1. Find student row in users table and click Impersonate
    const studentRow = page.locator('tr').filter({ hasText: 'student@examos.com' }).first();
    await expect(studentRow).toBeVisible({ timeout: 10_000 });
    const impersonateBtn = studentRow.locator('button[id^="impersonate-user-"], button:has-text("Impersonate")');
    await expect(impersonateBtn).toBeVisible();
    await impersonateBtn.click();

    // 2. Impersonation Confirmation Modal appears
    const modal = page.locator('#impersonation-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Confirm Real Student Impersonation/i)).toBeVisible();

    // 3. Confirm button is disabled without valid reason (min 10 chars)
    const confirmBtn = page.locator('#confirm-impersonation-btn');
    await expect(confirmBtn).toBeDisabled();

    // 4. Enter unique audit justification
    const reasonInput = page.locator('#impersonation-reason-input');
    await expect(reasonInput).toBeVisible();
    await reasonInput.fill(uniqueAuditReason);
    await expect(confirmBtn).toBeEnabled();

    // 5. Submit impersonation
    await confirmBtn.click();

    // 6. Verify Impersonation Banner renders with distinct warning styling
    const banner = page.locator('#preview-banner');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/IMPERSONATION ACTIVE/i);
    await expect(banner).toContainText(/Acting As:/i);

    // 7. Exit Impersonation
    const exitBtn = page.locator('#exit-preview-btn');
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // 8. Confirm banner is removed and admin returned to staff dashboard
    await expect(banner).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#header-preview-mode-btn')).toBeVisible({ timeout: 10_000 });

    // 9. Navigate to Security & Impersonation Audit Trail viewer in UI
    await goToTab(page, 'users');
    const auditTabBtn = page.locator('#users-subtab-audit-trail');
    await expect(auditTabBtn).toBeVisible({ timeout: 5000 });
    await auditTabBtn.click();

    // 10. Verify Audit Trail Table renders on screen
    const auditTable = page.locator('#preview-audit-table');
    await expect(auditTable).toBeVisible({ timeout: 10_000 });

    // 11. Verify that the newly performed session entry is actually visible in the UI
    await expect(page.getByText(uniqueAuditReason).first()).toBeVisible({ timeout: 10_000 });
    const matchingRow = page.locator('tr.audit-log-row').filter({ hasText: uniqueAuditReason }).first();
    await expect(matchingRow).toBeVisible();
    await expect(matchingRow).toContainText(/REAL STUDENT|IMPERSONATE_REAL_STUDENT/i);
  });

  test('staff can click Preview as Student on a draft exam, land directly in the exam player, answer questions, submit, and exit cleanly back to exam editor', async () => {
    await loginAs(page, 'admin');
    await goToTab(page, 'exams');

    // 1. Ensure an exam card is available and selected (or generate one)
    let examCard = page.locator('[id^="exam-card-"]').first();
    if (!await examCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByRole('button', { name: /generate|new exam|create exam/i }).click();
      const blueprintSelect = selectNearLabel(page, 'Select Pattern Blueprint');
      await blueprintSelect.waitFor({ state: 'visible', timeout: 10_000 });
      const targetOption = blueprintSelect.locator('option').filter({ hasText: /JEE Main Grand Blueprint/i });
      await targetOption.waitFor({ state: 'attached', timeout: 10_000 });
      const value = await targetOption.getAttribute('value');
      if (value) await blueprintSelect.selectOption(value);
      await page.getByRole('button', { name: /generate paper/i }).click();
      examCard = page.locator('[id^="exam-card-"]').first();
      await expect(examCard).toBeVisible({ timeout: 15_000 });
    }

    await examCard.click();

    // 2. Draft exam details inspector is open with "⚡ Preview as Student" button
    const previewExamBtn = page.locator('#btn-preview-exam');
    await expect(previewExamBtn).toBeVisible({ timeout: 10_000 });

    // 3. Click "⚡ Preview as Student"
    await previewExamBtn.click();

    // 4. Verify preview banner appears AND user lands directly inside the ExamPlayerPage
    const banner = page.locator('#preview-banner');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/PREVIEW MODE/i);

    // Exam Player Page must be visible immediately (no manual navigation needed)
    await expect(page.getByRole('heading', { name: /Question Palette/i })).toBeVisible({ timeout: 15_000 });
    const submitModalBtn = page.locator('#btn-open-submit-modal, button:has-text("Submit Test"), button:has-text("Finish & Submit")').first();
    await expect(submitModalBtn).toBeVisible({ timeout: 10_000 });

    // 5. Interact with question in preview session (select an option)
    const optionInput = page.locator('input[type="radio"], [role="radio"]').first();
    if (await optionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await optionInput.click();
    }

    // 6. Submit the exam
    await submitModalBtn.click();

    const confirmSubmitBtn = page.locator('#btn-confirm-submit-exam, button:has-text("Confirm & Submit"), button:has-text("Yes, Submit")').first();
    if (await confirmSubmitBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await confirmSubmitBtn.click();
    }

    // 7. Results scorecard or confirmation is shown
    await expect(page.getByText(/Scorecard|Assessment Evaluation|Assessment Completed|Performance Summary|Total Score|Results/i).first()).toBeVisible({ timeout: 15_000 });

    // 8. Exit Preview via the top banner
    const exitBtn = page.locator('#exit-preview-btn');
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // 9. Confirm banner is gone and reviewer is returned back to the Exams workbench
    await expect(banner).not.toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-preview-exam, [id^="exam-card-"]').first()).toBeVisible({ timeout: 10_000 });
  });
});
