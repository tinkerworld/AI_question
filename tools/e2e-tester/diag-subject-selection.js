const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const networkLog = [];

  // Capture all network calls
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/')) {
      networkLog.push({
        type: 'REQUEST',
        method: req.method(),
        url: req.url(),
        postData: req.postData(),
        time: new Date().toISOString(),
      });
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/v1/')) {
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch (e) {
        bodyText = '<unreadable>';
      }
      networkLog.push({
        type: 'RESPONSE',
        status: res.status(),
        method: res.request().method(),
        url: res.url(),
        body: bodyText,
        time: new Date().toISOString(),
      });
    }
  });

  console.log('=== STEP 1: Admin Login ===');
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'admin@examos.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#nav-tab-dashboard', { timeout: 10000 });
  console.log('✓ Logged in as Admin');

  console.log('\n=== STEP 2: Navigate to Academic Structure & Select Course ===');
  await page.click('#nav-tab-courses');
  await page.waitForSelector('button:has-text("+ Create Course")', { timeout: 8000 });

  // Click on the first course card
  const firstCourseCard = page.locator('div[style*="cursor: pointer"]').filter({ hasText: /Click to view Subjects/i }).first();
  await firstCourseCard.click();
  await page.waitForSelector('text=SUBJECTS', { timeout: 5000 });

  const initialSubjects = await page.locator('div[style*="border-radius: 6px"]').allInnerTexts();
  console.log('Initial subjects in course before creation:\n', initialSubjects);

  // Record initial selected subject
  const initialSyllabusHeader = await page.locator('h3').filter({ hasText: /Syllabus Outline/i }).innerText().catch(() => '<none>');
  console.log(`Initial active syllabus outline: "${initialSyllabusHeader}"`);

  console.log('\n=== STEP 3: Create New Subject ===');
  const testSubCode = `QO_${Date.now().toString().slice(-4)}`;
  const testSubName = `Quantum_Optics_${Date.now().toString().slice(-4)}`;

  const networkStartIndex = networkLog.length;

  // Click "+ Add" button in Subject Navigator
  await page.click('#btn-add-subject');
  await page.waitForSelector('#subject-modal-title', { timeout: 5000 });

  await page.getByPlaceholder('Code...').fill(testSubCode);
  await page.getByPlaceholder('Subject Name...').fill(testSubName);
  await page.getByRole('button', { name: /add subject|save|create/i }).last().click();

  await page.waitForTimeout(1500);

  console.log('\n=== STEP 4: Immediate Post-Creation Inspection ===');
  // 1. Does the new subject appear in the list?
  const subjectListItems = await page.locator('div[style*="border-radius: 6px"]').allInnerTexts();
  console.log('Current Subject List in UI:\n', subjectListItems);

  const isNewSubInList = subjectListItems.some((s) => s.includes(testSubName));
  console.log(`\n1. Does the new subject appear in the list at all? -> ${isNewSubInList ? 'YES (CONFIRMED)' : 'NO'}`);

  // 2. Which subject's syllabus tree is actually showing right after creation?
  const activeSyllabusHeading = await page.locator('h3').filter({ hasText: /Syllabus Outline/i }).innerText().catch(() => '<not found>');
  console.log(`\n2. Which subject's syllabus tree is actually showing right after creation? -> "${activeSyllabusHeading}"`);

  // Check if active syllabus tree is empty or has nodes
  const emptyStateText = await page.locator('text=No syllabus topics created yet').isVisible().catch(() => false);
  console.log(`   Is the active syllabus tree empty (as expected for a brand new subject)? -> ${emptyStateText ? 'YES (EMPTY)' : 'NO (HAS NODES)'}`);

  // Capture screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'live_diag_1_immediate_after_create.png') });
  console.log('✓ Captured live_diag_1_immediate_after_create.png');

  // 3. Paste actual network activity for POST and subsequent GET
  console.log('\n3. Network Requests & Responses for Creation Flow:');
  const postCall = networkLog.find((n) => n.type === 'REQUEST' && n.method === 'POST' && n.url.includes('/subjects'));
  const postResp = networkLog.find((n) => n.type === 'RESPONSE' && n.method === 'POST' && n.url.includes('/subjects'));
  const getCall = networkLog.find((n) => n.type === 'REQUEST' && n.method === 'GET' && n.url.includes('/subjects') && networkLog.indexOf(n) > networkLog.indexOf(postCall));
  const getResp = networkLog.find((n) => n.type === 'RESPONSE' && n.method === 'GET' && n.url.includes('/subjects') && networkLog.indexOf(n) > networkLog.indexOf(postCall));

  if (postCall) {
    console.log(`\n--- POST /courses/:id/subjects REQUEST ---`);
    console.log(`URL: ${postCall.url}`);
    console.log(`Payload: ${postCall.postData}`);
  }
  if (postResp) {
    console.log(`\n--- POST /courses/:id/subjects RESPONSE ---`);
    console.log(`Status: ${postResp.status}`);
    console.log(`Body: ${postResp.body}`);
  }
  if (getCall) {
    console.log(`\n--- Subsequent GET /courses/:id/subjects REQUEST ---`);
    console.log(`URL: ${getCall.url}`);
  }
  if (getResp) {
    console.log(`\n--- Subsequent GET /courses/:id/subjects RESPONSE ---`);
    console.log(`Status: ${getResp.status}`);
    console.log(`Body: ${getResp.body}`);
  }

  // === STEP 5: Scenario 2: Switch Course and Switch Back ===
  console.log('\n=== STEP 5: Scenario 2: Switch Course and Return ===');
  // Click "Courses" in breadcrumb
  await page.locator('span:has-text("Courses")').first().click();
  await page.waitForSelector('button:has-text("+ Create Course")', { timeout: 5000 });

  // Get all course cards
  const allCourses = page.locator('div[style*="cursor: pointer"]').filter({ hasText: /Click to view Subjects/i });
  const courseCount = await allCourses.count();
  console.log(`Total courses available: ${courseCount}`);

  if (courseCount > 1) {
    console.log('Selecting Second Course (Course B)...');
    await allCourses.nth(1).click();
    await page.waitForSelector('text=SUBJECTS', { timeout: 5000 });

    const course2Subjects = await page.locator('div[style*="border-radius: 6px"]').allInnerTexts();
    console.log('Course 2 Subjects:\n', course2Subjects);

    const course2SyllabusHeading = await page.locator('h3').filter({ hasText: /Syllabus Outline/i }).innerText().catch(() => '<none>');
    console.log(`Course 2 default selected subject outline: "${course2SyllabusHeading}"`);

    // Go back to course list
    console.log('Navigating back to course list...');
    await page.locator('span:has-text("Courses")').first().click();
    await page.waitForSelector('button:has-text("+ Create Course")', { timeout: 5000 });

    // Click back to First Course (where we created the subject)
    console.log('Returning to First Course (Course A)...');
    await allCourses.first().click();
    await page.waitForSelector('text=SUBJECTS', { timeout: 5000 });

    const course1ReopenedSubjects = await page.locator('div[style*="border-radius: 6px"]').allInnerTexts();
    console.log('Course 1 Subjects on return:\n', course1ReopenedSubjects);

    const course1ReturnSyllabusHeading = await page.locator('h3').filter({ hasText: /Syllabus Outline/i }).innerText().catch(() => '<none>');
    console.log(`Course 1 Active Syllabus Outline on return: "${course1ReturnSyllabusHeading}"`);

    await page.screenshot({ path: path.join(screenshotsDir, 'live_diag_2_course_switch_return.png') });
    console.log('✓ Captured live_diag_2_course_switch_return.png');
  }

  await browser.close();
  console.log('\n=== Live Investigation Complete ===');
})();
