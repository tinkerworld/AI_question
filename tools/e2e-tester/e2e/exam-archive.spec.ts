import { test, expect } from '@playwright/test';
import { loginAs, goToTab } from './helpers/auth';
import { selectNearLabel } from './helpers/select';

async function generateExamFromBlueprint(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /generate|new exam|create exam/i }).click();

  const blueprintSelect = selectNearLabel(page, 'Select Pattern Blueprint');
  await blueprintSelect.waitFor({ state: 'visible', timeout: 10_000 });
  const targetOption = blueprintSelect.locator('option').filter({ hasText: /JEE Main Grand Blueprint/i });
  await targetOption.waitFor({ state: 'attached', timeout: 10_000 });
  const value = await targetOption.getAttribute('value');
  if (value) {
    await blueprintSelect.selectOption(value);
  }

  await page.getByRole('button', { name: /generate paper/i }).click();
  await expect(page.getByRole('heading', { name: 'Generate Exam Paper' })).not.toBeVisible({ timeout: 15_000 });

  const examCard = page.locator('[id^="exam-card-"]').first();
  await expect(examCard).toBeVisible({ timeout: 15_000 });
  return examCard;
}

async function ensurePublishedExam(page: import('@playwright/test').Page) {
  await goToTab(page, 'archive');
  const snapshotBtn = page.getByRole('button', { name: /snapshot/i }).first();
  if (await snapshotBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    return;
  }

  await goToTab(page, 'exams');
  const draftCard = page.locator('[id^="exam-card-"]').filter({ hasText: 'DRAFT' }).first();
  if (!await draftCard.isVisible({ timeout: 1500 }).catch(() => false)) {
    await generateExamFromBlueprint(page);
  }

  const targetDraft = page.locator('[id^="exam-card-"]').filter({ hasText: 'DRAFT' }).first();
  await targetDraft.click();

  const publishBtn = page.locator('#btn-publish-exam');
  await publishBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await publishBtn.click();
  await expect(page.getByText(/published/i).first()).toBeVisible({ timeout: 10_000 });
  await goToTab(page, 'archive');
}

test.describe('Phase 7: Published Exam Archive & Immutability Workbench', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
  });

  test('admin can navigate to Published Archive, search, and view global vault statistics', async ({ page }) => {
    await loginAs(page, 'admin');
    await ensurePublishedExam(page);
    await goToTab(page, 'archive');

    await expect(page.getByText('Published Exam Archive & Question Vault')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('IMMUTABILITY ENGINE ACTIVE')).toBeVisible();
    await expect(page.getByText('Published Exams', { exact: true })).toBeVisible();
    await expect(page.getByText('Archived Questions', { exact: true })).toBeVisible();
    await expect(page.locator('[id^="archived-exam-"], tr, div').filter({ hasText: /JEE Main/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('admin can open frozen snapshot viewer and inspect read-only question paper', async ({ page }) => {
    await loginAs(page, 'admin');
    await ensurePublishedExam(page);
    await goToTab(page, 'archive');

    const snapshotBtn = page.getByRole('button', { name: /snapshot/i }).first();
    await expect(snapshotBtn).toBeVisible({ timeout: 10_000 });
    await snapshotBtn.click();
    await expect(page.getByText(/Snapshot \(Read-Only\)/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Section [A-Z]:|Section \d|Physics|Biology|Reading|Writing/i).first()).toBeVisible({ timeout: 10_000 });
    const closeBtn = page.getByRole('button', { name: /Close|✕/i }).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByText(/Snapshot \(Read-Only\)/i)).not.toBeVisible();
  });

  test('teacher can view preserved answer keys and explanations', async ({ page }) => {
    await loginAs(page, 'teacher');
    await goToTab(page, 'archive');

    const keyBtn = page.getByRole('button', { name: /answer key/i }).first();
    await expect(keyBtn).toBeVisible({ timeout: 10_000 });
    await keyBtn.click();
    await expect(page.getByText(/Preserved Official Answer Key/i)).toBeVisible({ timeout: 10_000 });
    const closeBtn = page.getByRole('button', { name: /Close|✕/i }).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByText(/Preserved Official Answer Key/i)).not.toBeVisible();
  });

  test('admin can open version history and post-publish errata correction', async ({ page }) => {
    await loginAs(page, 'admin');
    await ensurePublishedExam(page);
    await goToTab(page, 'archive');

    const historyBtn = page.getByRole('button', { name: /history/i }).first();
    await expect(historyBtn).toBeVisible({ timeout: 10_000 });
    await historyBtn.click();
    await expect(page.getByText(/Exam Version & Errata History/i)).toBeVisible({ timeout: 10_000 });
    const closeBtn = page.getByRole('button', { name: /Close|✕/i }).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.getByText(/Exam Version & Errata History/i)).not.toBeVisible();
  });
});
