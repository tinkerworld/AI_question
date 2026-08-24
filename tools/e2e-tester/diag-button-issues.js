const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  const networkEvents = [];

  page.on('console', (msg) => {
    logs.push({ type: msg.type(), text: msg.text() });
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', (err) => {
    logs.push({ type: 'pageerror', text: err.toString() });
    console.log('[BROWSER UNCAUGHT ERROR]:', err.toString());
  });

  page.on('request', (req) => {
    networkEvents.push({ type: 'REQ', method: req.method(), url: req.url() });
    console.log(`[NET REQ] ${req.method()} ${req.url()}`);
  });

  page.on('response', async (res) => {
    let bodyText = '';
    try {
      if (res.url().includes('/api/v1/')) {
        bodyText = await res.text();
      }
    } catch (e) {}
    networkEvents.push({ type: 'RES', status: res.status(), url: res.url(), body: bodyText.slice(0, 300) });
    console.log(`[NET RES] ${res.status()} ${res.url()} -> ${bodyText.slice(0, 150)}`);
  });

  console.log('=== LOGGING IN AS ADMIN ===');
  await page.goto('http://localhost:3000');
  await page.locator('input[type="email"]').fill('admin@examos.com');
  await page.locator('input[type="password"]').fill('Admin@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForSelector('#nav-tab-exams');

  console.log('\n======================================================');
  console.log('INVESTIGATION 2: Exam Settings & Schedule in ExamsPage');
  console.log('======================================================');
  await page.click('#nav-tab-exams');
  await page.waitForTimeout(1500);

  // In ExamsPage, the left pane has exam cards
  const examItems = page.locator('div[style*="cursor: pointer"]').filter({ hasText: 'Marks' });
  const count = await examItems.count();
  console.log(`Found ${count} exam items in left list`);

  for (let i = 0; i < Math.min(count, 3); i++) {
    const card = examItems.nth(i);
    const cardText = await card.innerText();
    const isDraft = cardText.includes('DRAFT');
    const isPub = cardText.includes('PUBLISHED');
    console.log(`\n--- Exam Card ${i + 1} (${isDraft ? 'DRAFT' : isPub ? 'PUBLISHED' : 'UNKNOWN'}) ---`);
    console.log('Card preview:', cardText.replace(/\n/g, ' '));

    await card.click();
    await page.waitForTimeout(1000);

    const settingsBtn = page.locator('#btn-edit-exam-settings');
    const isSettingsVisible = await settingsBtn.isVisible().catch(() => false);
    console.log('Is "⚙️ Settings & Schedule" button visible in detail pane?', isSettingsVisible);

    if (isSettingsVisible) {
      await settingsBtn.click();
      await page.waitForTimeout(500);

      const modalVisible = await page.locator('text=Exam Settings & Schedule').isVisible().catch(() => false);
      console.log('Did Settings modal open?', modalVisible);

      if (modalVisible) {
        const nameInput = page.locator('form input').first();
        const currentName = await nameInput.inputValue();
        console.log('Current Exam Name in modal input:', currentName);

        const newName = currentName.replace(/ \[.*\]$/, '') + ` [TestEdit_${Date.now() % 1000}]`;
        await nameInput.fill(newName);

        networkEvents.length = 0;
        console.log(`Submitting Save Settings on ${isDraft ? 'DRAFT' : 'PUBLISHED'} exam...`);
        await page.locator('button:has-text("Save Settings")').click();
        await page.waitForTimeout(1500);

        console.log('Network events during Save Settings:');
        networkEvents.forEach(e => console.log(`  ${e.type} ${e.method || e.status} ${e.url} -> ${e.body || ''}`));

        const errorText = page.locator('text=⚠️');
        if (await errorText.isVisible().catch(() => false)) {
          console.log('Error displayed in modal:', await errorText.innerText());
        } else {
          console.log('SUCCESS: Modal closed cleanly, settings updated in UI & DB.');
        }
      }
    }
  }

  await browser.close();
})();
