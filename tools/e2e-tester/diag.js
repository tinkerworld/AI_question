const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  
  await page.goto('http://localhost:3000');
  await page.locator('input[type="email"]').fill('student@examos.com');
  await page.locator('input[type="password"]').fill('Student@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  
  await page.waitForSelector('#nav-tab-student_exams');
  await page.click('#nav-tab-student_exams');
  
  const startBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume/i }).first();
  await startBtn.click();
  
  const modalHeading = page.locator('text=Exam Hall Instructions');
  await modalHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await modalHeading.isVisible()) {
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /Enter Exam Hall & Start/i }).click();
  }
  
  await page.waitForSelector('text=Question Palette');
  console.log('ACTIVE IN EXAM PLAYER');
  
  const res = await page.evaluate(() => {
    const before = !!document.getElementById('exam-exit-modal');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    return { before, length: window.history.length, href: window.location.href };
  });
  console.log('Evaluate result:', res);
  
  await page.waitForTimeout(500);
  const el = await page.$('#exam-exit-modal');
  console.log('After 500ms exit modal present:', !!el);
  if (el) {
    console.log('Inner text:', await el.innerText());
  }
  
  await browser.close();
})();
