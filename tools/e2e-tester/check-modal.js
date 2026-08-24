const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('[LOG]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[ERROR]', err));
  
  await page.goto('http://localhost:3000');
  await page.locator('input[type="email"]').fill('student@examos.com');
  await page.locator('input[type="password"]').fill('Student@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForSelector('#nav-tab-student_exams');
  await page.click('#nav-tab-student_exams');
  
  const btn = page.locator('button:has-text("Read Instructions"), button:has-text("Retake"), button:has-text("Resume")').first();
  await btn.waitFor({ state: 'visible' });
  await btn.click();
  
  const modal = page.locator('text=Exam Hall Instructions');
  if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('input[type="checkbox"]').check();
    await page.click('button:has-text("Enter Exam Hall & Start")');
  }
  
  await page.waitForSelector('text=Question Palette');
  console.log('ACTIVE IN PLAYER');
  
  await page.evaluate(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  });
  
  await page.waitForTimeout(500);
  const modalEl = await page.$('#exam-exit-modal');
  console.log('Exit modal found:', !!modalEl);
  if (modalEl) {
    console.log('Modal text:', await modalEl.innerText());
  }
  await browser.close();
})();
