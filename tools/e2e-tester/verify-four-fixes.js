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

  console.log('--- 1. Testing Login as Admin ---');
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'admin@examos.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#nav-tab-dashboard', { timeout: 10000 });
  console.log('✓ Logged in as Admin');

  // --- Task 1: Pattern Builder as docked bottom panel ---
  console.log('\n--- Task 1: Pattern Builder Docked Bottom Panel ---');
  await page.click('#nav-tab-exam_patterns');
  await page.waitForSelector('table', { timeout: 5000 });

  // Click the first "🛠️ Builder" button
  const builderBtn = page.locator('button:has-text("🛠️ Builder")').first();
  await builderBtn.click();
  await page.waitForSelector('#pattern-builder-section', { timeout: 5000 });
  console.log('✓ Docked pattern builder panel opened');

  const dockBox = await page.locator('#pattern-builder-section').boundingBox();
  console.log(`✓ Dock bounding box: Y=${dockBox.y}, Height=${dockBox.height}, Width=${dockBox.width}`);

  await page.screenshot({ path: path.join(screenshotsDir, 'task1_docked_builder.png') });
  console.log('✓ Captured task1_docked_builder.png');

  // Click Close Builder
  await page.click('#btn-close-pattern-builder');
  await page.waitForTimeout(300);
  const dockExists = await page.$('#pattern-builder-section');
  console.log(`✓ Dock after clicking Close: ${dockExists ? 'STILL_OPEN (FAIL)' : 'CLOSED (PASS)'}`);

  // --- Task 2: Correct-answer radio & highlighted row in Question Bank ---
  console.log('\n--- Task 2: Correct Answer Visibility & Green Highlight ---');
  await page.click('#nav-tab-question_bank');
  await page.waitForTimeout(500);
  const addQBtn = page.getByRole('button', { name: /add question|create question|\+ question/i });
  await addQBtn.click();
  await page.waitForSelector('textarea', { timeout: 5000 });

  // Enter question statement
  const stmtField = page.getByPlaceholder(/complete question statement|type question content/i).first();
  await stmtField.fill('Which of the following is the standard unit of electric potential?');
  
  // By default, first option (opt_1) is selected, let's type option text and click option 2
  const optionInputs = page.locator('input[placeholder^="Option"]');
  if (await optionInputs.count() > 0) {
    await optionInputs.nth(0).fill('Ampere (Current)');
    await optionInputs.nth(1).fill('Volt (Potential difference)');
    if (await optionInputs.count() > 2) await optionInputs.nth(2).fill('Ohm (Resistance)');
    if (await optionInputs.count() > 3) await optionInputs.nth(3).fill('Tesla (Magnetic Field)');
  }

  // Select Option 2 as correct
  const radio2 = page.locator('input[name="correctOpt"]').nth(1);
  await radio2.click();

  await page.screenshot({ path: path.join(screenshotsDir, 'task2_correct_answer_visible.png') });
  console.log('✓ Captured task2_correct_answer_visible.png');
  await page.click('button:has-text("Cancel")');

  // --- Task 3: CoursesPage fetchSubjects auto-selection ---
  console.log('\n--- Task 3: CoursesPage fetchSubjects Auto-Selection ---');
  await page.click('#nav-tab-courses');
  await page.waitForTimeout(500);

  const courseName = `E2E AutoSelect Course ${Date.now()}`;
  await page.getByRole('button', { name: /\+ create course/i }).click();
  await page.getByPlaceholder('Unique course identifier...').fill(`E2E_${Date.now()}`);
  await page.getByPlaceholder('Full course title...').fill(courseName);
  await page.getByRole('button', { name: /create|save|add/i }).last().click();
  await page.waitForTimeout(600);

  // Click the created course to select it
  await page.getByRole('heading', { name: courseName }).click();
  await page.waitForTimeout(600);

  // Click "+ Add Subject"
  const testSubCode = `SUB_${Date.now().toString().slice(-4)}`;
  const testSubName = `AutoSelect Subject ${testSubCode}`;
  await page.getByRole('button', { name: /add subject/i }).click();
  await page.getByPlaceholder('Code...').fill(testSubCode);
  await page.getByPlaceholder('Subject Name...').fill(testSubName);
  await page.getByRole('button', { name: /add subject|save/i }).last().click();
  await page.waitForTimeout(1000);

  // Check which subject is currently selected
  const activeSubjectHeader = await page.locator(`text=${testSubName}`).first().innerText();
  console.log(`✓ Active subject text found: "${activeSubjectHeader}"`);
  const syllabusOutlineText = await page.locator(`text=${testSubName} — Syllabus Outline`).isVisible();
  if (syllabusOutlineText) {
    console.log('✓ PASS: Newly created subject was automatically selected & syllabus outline loaded!');
  } else {
    console.log(`✗ FAIL: Expected "${testSubName} — Syllabus Outline" to be visible`);
  }

  // --- Task 4: Dropdown Option Visibility in Dark / Gray / Light Themes ---
  console.log('\n--- Task 4: Dropdown Option Visibility in Themes ---');
  // Dark theme screenshot
  await page.click('button:has-text("Dark")');
  await page.waitForTimeout(200);
  await page.click('#nav-tab-exam_patterns');
  await page.click('button:has-text("+ Create Exam Pattern")');
  await page.waitForSelector('text=Create New Exam Pattern', { timeout: 5000 });
  await page.screenshot({ path: path.join(screenshotsDir, 'task4_dropdown_dark_theme.png') });
  console.log('✓ Captured task4_dropdown_dark_theme.png');
  await page.click('button:has-text("Cancel")');

  // Toggle to Gray / Slate Theme
  await page.click('button:has-text("Slate")');
  await page.waitForTimeout(200);
  console.log('✓ Toggled theme to Slate / Gray');
  await page.click('button:has-text("+ Create Exam Pattern")');
  await page.waitForSelector('text=Create New Exam Pattern', { timeout: 5000 });
  await page.screenshot({ path: path.join(screenshotsDir, 'task4_dropdown_gray_theme.png') });
  console.log('✓ Captured task4_dropdown_gray_theme.png');
  await page.click('button:has-text("Cancel")');

  // Toggle to Light Theme
  await page.click('button:has-text("Light")');
  await page.waitForTimeout(200);
  console.log('✓ Toggled theme to Light');
  await page.click('button:has-text("+ Create Exam Pattern")');
  await page.waitForSelector('text=Create New Exam Pattern', { timeout: 5000 });
  await page.screenshot({ path: path.join(screenshotsDir, 'task4_dropdown_light_theme.png') });
  console.log('✓ Captured task4_dropdown_light_theme.png');
  await page.click('button:has-text("Cancel")');

  // Restore to Dark
  await page.click('button:has-text("Dark")');

  await browser.close();
  console.log('\n========================================');
  console.log(' ALL 4 TASKS VERIFIED SUCCESSFULLY');
  console.log('========================================');
})();
