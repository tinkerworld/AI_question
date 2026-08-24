const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async (dialog) => {
    console.log('Dialog opened:', dialog.message());
    await dialog.accept();
  });

  console.log('1. Logging in as Admin (admin@examos.com)...');
  await page.goto('http://localhost:3000');
  await page.locator('input[type="email"]').fill('admin@examos.com');
  await page.locator('input[type="password"]').fill('Admin@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForSelector('#nav-tab-dashboard', { timeout: 10000 });

  console.log('2. Navigating to Exams Workbench to ensure a published exam exists...');
  await page.click('#nav-tab-exams');
  await page.waitForSelector('#btn-generate-exam', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Check if published exam exists
  const publishedCount = await page.locator('[id^="exam-card-"]:has-text("PUBLISHED")').count();
  if (publishedCount === 0) {
    console.log('Generating an exam from JEE Main blueprint...');
    await page.getByRole('button', { name: /generate|new exam|create exam/i }).first().click();
    await page.waitForSelector('select', { timeout: 10000 });
    
    // Select JEE Main Grand Blueprint
    const blueprintSelect = page.locator('select').first();
    const targetOption = blueprintSelect.locator('option').filter({ hasText: /JEE Main Grand Blueprint/i });
    await targetOption.waitFor({ state: 'attached', timeout: 10000 });
    const value = await targetOption.getAttribute('value');
    if (value) {
      await blueprintSelect.selectOption(value);
    }
    
    await page.getByRole('button', { name: /generate paper/i }).click();
    await page.waitForSelector('[id^="exam-card-"]', { timeout: 15000 });

    const draftCard = page.locator('[id^="exam-card-"]:has-text("DRAFT")').first();
    await draftCard.click();
    await page.waitForSelector('#btn-publish-exam', { timeout: 10000 });
    await page.click('#btn-publish-exam');
    await page.waitForTimeout(2000);
    console.log('Exam successfully generated and published!');
  } else {
    console.log('Published exam already present on workbench.');
  }

  console.log('3. Navigating to Published Archive & Question Vault...');
  await page.click('#nav-tab-archive');
  await page.waitForSelector('text=Published Exam Archive & Question Vault', { timeout: 10000 });
  await page.waitForTimeout(1500);

  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('4. Capturing Published Archive Table with real data...');
  const tablePath = path.join(screenshotDir, 'archive_table_real_data.png');
  await page.screenshot({ path: tablePath, fullPage: true });
  console.log('Saved:', tablePath);

  console.log('5. Opening Frozen Paper Snapshot Viewer...');
  const snapshotBtn = page.getByRole('button', { name: /snapshot/i }).first();
  await snapshotBtn.click();
  await page.waitForSelector('text=Snapshot (Read-Only)', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const snapPath = path.join(screenshotDir, 'archive_snapshot_modal_real_data.png');
  await page.screenshot({ path: snapPath, fullPage: true });
  console.log('Saved:', snapPath);

  await page.getByRole('button', { name: /Close|✕/i }).first().click();
  await page.waitForTimeout(500);

  console.log('6. Opening Preserved Official Answer Key Viewer...');
  const keyBtn = page.getByRole('button', { name: /answer key/i }).first();
  await keyBtn.click();
  await page.waitForSelector('text=Preserved Official Answer Key', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const keyPath = path.join(screenshotDir, 'archive_answer_key_modal_real_data.png');
  await page.screenshot({ path: keyPath, fullPage: true });
  console.log('Saved:', keyPath);

  await page.getByRole('button', { name: /Close|✕/i }).first().click();
  await page.waitForTimeout(500);

  console.log('7. Opening Version & Errata History Viewer...');
  const historyBtn = page.getByRole('button', { name: /history/i }).first();
  await historyBtn.click();
  await page.waitForSelector('text=Exam Version & Errata History', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const historyPath = path.join(screenshotDir, 'archive_history_modal_real_data.png');
  await page.screenshot({ path: historyPath, fullPage: true });
  console.log('Saved:', historyPath);

  await browser.close();
  console.log('Visual verification complete!');
})();
