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

  console.log('=== PART 1: Verify syllabus.routes.ts subjectId Fix ===');
  // 1. Login as Admin
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'admin@examos.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#nav-tab-dashboard', { timeout: 10000 });

  // 2. Fetch syllabus tree via API with dummy/new subjectId
  const dummySubjectId = 'sub_dummy_nonexistent_12345';
  const treeResp = await page.request.get(`http://localhost:4000/api/v1/syllabus/tree?subjectId=${dummySubjectId}`, {
    headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}` },
  });
  const treeJson = await treeResp.json();
  console.log(`GET /api/v1/syllabus/tree?subjectId=${dummySubjectId} -> Status: ${treeResp.status()}, Count: ${treeJson.data?.length}`);
  if (treeJson.data?.length === 0) {
    console.log('✓ PASS: Tree query correctly scoped by subjectId query parameter (returns 0 nodes for non-existent/empty subject)');
  } else {
    console.log(`✗ FAIL: Tree query returned ${treeJson.data?.length} nodes instead of 0`);
  }

  console.log('\n=== PART 2: Verify Exam Player Width Stability ===');
  // Logout and login as Student
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'student@examos.com');
  await page.fill('input[type="password"]', 'Student@123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#nav-tab-student_exams', { timeout: 10000 });

  // Open first available assessment
  await page.click('#nav-tab-student_exams');
  await page.waitForTimeout(1000);

  const startOrResumeBtn = page.getByRole('button', { name: /Read Instructions|Resume In-Progress|Retake/i }).first();
  await startOrResumeBtn.click();
  await page.waitForTimeout(800);

  // If instruction modal appears, click Start Now
  const modalHeading = page.locator('text=Exam Hall Instructions');
  if (await modalHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
    await enterBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.waitForSelector('#exam-question-card', { timeout: 10000 });
  await page.waitForSelector('#exam-palette-sidebar', { timeout: 10000 });

  // --- MEASUREMENT 1: Short / Normal Question ---
  console.log('\n--- Measurement 1: Short Question ---');
  const shortCardBox = await page.locator('#exam-question-card').boundingBox();
  const shortPaletteBox = await page.locator('#exam-palette-sidebar').boundingBox();
  const shortRightEdge = shortCardBox.x + shortCardBox.width;
  const shortDistanceToPalette = shortPaletteBox.x - shortRightEdge;

  console.log(`Short Question Card Dimensions: x=${shortCardBox.x}px, width=${shortCardBox.width}px, rightEdge=${shortRightEdge}px`);
  console.log(`Palette Sidebar Dimensions: x=${shortPaletteBox.x}px, width=${shortPaletteBox.width}px`);
  console.log(`Exact Pixel Distance between Question Card and Palette: ${shortDistanceToPalette}px`);

  await page.screenshot({ path: path.join(screenshotsDir, 'width_short_question.png') });
  console.log('✓ Captured width_short_question.png');

  // --- MEASUREMENT 2: Very Long Question (Injecting 10 paragraphs into content container) ---
  console.log('\n--- Measurement 2: Long 10-Paragraph Question ---');
  await page.evaluate(() => {
    const scrollContainer = document.getElementById('exam-question-content-scroll');
    if (scrollContainer) {
      const longText = Array(12).fill(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
      ).join('\n\n');
      const textDiv = scrollContainer.querySelector('div');
      if (textDiv) {
        textDiv.innerText = longText;
      }
    }
  });
  await page.waitForTimeout(500);

  const longCardBox = await page.locator('#exam-question-card').boundingBox();
  const longPaletteBox = await page.locator('#exam-palette-sidebar').boundingBox();
  const longRightEdge = longCardBox.x + longCardBox.width;
  const longDistanceToPalette = longPaletteBox.x - longRightEdge;

  console.log(`Long Question Card Dimensions: x=${longCardBox.x}px, width=${longCardBox.width}px, rightEdge=${longRightEdge}px`);
  console.log(`Palette Sidebar Dimensions: x=${longPaletteBox.x}px, width=${longPaletteBox.width}px`);
  console.log(`Exact Pixel Distance between Question Card and Palette: ${longDistanceToPalette}px`);

  await page.screenshot({ path: path.join(screenshotsDir, 'width_long_question.png') });
  console.log('✓ Captured width_long_question.png');

  // Comparison verification
  console.log('\n=== PIXEL MEASUREMENT COMPARISON ===');
  console.log(`Width Diff: ${Math.abs(shortCardBox.width - longCardBox.width)}px (Short: ${shortCardBox.width}px, Long: ${longCardBox.width}px)`);
  console.log(`Right Edge Diff: ${Math.abs(shortRightEdge - longRightEdge)}px (Short: ${shortRightEdge}px, Long: ${longRightEdge}px)`);
  console.log(`Distance to Palette Diff: ${Math.abs(shortDistanceToPalette - longDistanceToPalette)}px (Short: ${shortDistanceToPalette}px, Long: ${longDistanceToPalette}px)`);

  if (
    shortCardBox.width === longCardBox.width &&
    shortRightEdge === longRightEdge &&
    shortDistanceToPalette === longDistanceToPalette
  ) {
    console.log('\n✓✓✓ PERFECT SUCCESS: Width and Palette Distance are 100% IDENTICAL to the exact pixel (0px delta)!');
  } else {
    console.log('\n✗✗✗ MISMATCH: Width or Distance shifted based on scrollbar reflow.');
  }

  await browser.close();
})();
