const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log(`[CONSOLE ${msg.type()}]:`, msg.text()));

  await page.goto('http://localhost:3000');
  await page.locator('input[type="email"]').fill('student@examos.com');
  await page.locator('input[type="password"]').fill('Student@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForSelector('#nav-tab-student_exams');

  await page.click('#nav-tab-student_exams');
  await page.waitForTimeout(1000);

  const startOrRetakeBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume In-Progress/i }).first();
  await startOrRetakeBtn.click();
  await page.waitForTimeout(1000);

  const modalHeading = page.locator('text=Exam Hall Instructions');
  if (await modalHeading.isVisible().catch(() => false)) {
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: /Enter Exam Hall & Start/i }).click();
  }

  await page.waitForSelector('text=Question Palette');
  console.log('Inside Exam Player');

  const lockInfo = await page.evaluate(() => {
    const dashTab = document.getElementById('nav-tab-dashboard');
    return {
      hasTriggerFn: typeof (window).__triggerExamExitModal === 'function',
      dashTabOpacity: dashTab ? getComputedStyle(dashTab).opacity : null,
      dashTabCursor: dashTab ? getComputedStyle(dashTab).cursor : null,
      dashTabTitle: dashTab ? dashTab.getAttribute('title') : null,
    };
  });
  console.log('Lock Info before click:', lockInfo);

  console.log('Clicking #nav-tab-dashboard...');
  await page.click('#nav-tab-dashboard');
  await page.waitForTimeout(1000);

  const modalVisible = await page.locator('#exam-exit-modal').isVisible();
  console.log('Is #exam-exit-modal visible after dashboard click?', modalVisible);

  await browser.close();
})();
