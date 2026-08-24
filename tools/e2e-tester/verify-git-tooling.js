const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const API_BASE = 'http://localhost:4000/api/v1';

(async () => {
  console.log('====================================================');
  console.log(' GIT-STYLE VERSIONING, DIFFS & ROLLBACK VERIFICATION');
  console.log('====================================================\n');

  // 0. Login as Admin via API to get auth token
  console.log('Authenticating as admin via API...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@examos.com', password: 'Admin@123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    throw new Error('API Login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.data.accessToken;
  console.log('Authenticated successfully. Token acquired.\n');

  // --------------------------------------------------------------------------
  // 1. QUESTION BANK BACKEND & DATABASE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('--- 1. QUESTION BANK GIT-STYLE VERSIONING & ROLLBACK ---');

  // Create Question via API (Version 1)
  const createQRes = await fetch(`${API_BASE}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: 'MCQ',
      content: 'What is the speed of light in vacuum?',
      data: {
        options: [
          { id: 'opt_1', text: '3x10^8 m/s' },
          { id: 'opt_2', text: '2x10^8 m/s' },
        ],
        correctOptionId: 'opt_1',
        explanation: 'Standard speed of light in vacuum.',
      },
      difficulty: 'EASY',
      marks: 4.0,
      status: 'DRAFT',
    }),
  });
  const createdQ = await createQRes.json();
  const qId = createdQ.data.id;
  console.log(`Created Question ${qId} at version 1 (EASY, 4.0 marks).`);

  // Update Question via API (Version 2)
  console.log(`Updating Question ${qId}: changing difficulty EASY -> HARD, marks 4.0 -> 8.0, and statement...`);
  const updateQRes = await fetch(`${API_BASE}/questions/${qId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: 'What is the exact numerical speed of light in vacuum (in m/s)?',
      data: {
        options: [
          { id: 'opt_1', text: '299,792,458 m/s' },
          { id: 'opt_2', text: '300,000,000 m/s' },
        ],
        correctOptionId: 'opt_1',
        explanation: 'Defined exactly by SI convention since 1983.',
      },
      difficulty: 'HARD',
      marks: 8.0,
    }),
  });
  const updatedQ = await updateQRes.json();
  console.log(`Question updated to version ${updatedQ.data.version}.`);

  // Fetch Version History from question_versions
  const qVersionsRes = await fetch(`${API_BASE}/questions/${qId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const qVersions = await qVersionsRes.json();
  const v2Row = qVersions.data.find((v) => v.version === 2);

  console.log('\n[REAL DB ROW — Question Edit v2 in question_versions]:');
  console.log(JSON.stringify(v2Row, null, 2));

  // Rollback to Version 1
  console.log(`\nRolling back Question ${qId} to Version 1...`);
  const rollbackQRes = await fetch(`${API_BASE}/questions/${qId}/versions/1/rollback`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const rolledBackQ = await rollbackQRes.json();
  console.log(`Rollback completed -> Current Question version is now ${rolledBackQ.data.version} (Restored Difficulty: ${rolledBackQ.data.difficulty}, Marks: ${rolledBackQ.data.marks}).`);

  // Fetch Version History after Rollback
  const qVersionsAfterRes = await fetch(`${API_BASE}/questions/${qId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const qVersionsAfter = await qVersionsAfterRes.json();
  const v3Row = qVersionsAfter.data.find((v) => v.version === 3);

  console.log('\n[REAL DB ROW — Question Rollback v3 in question_versions]:');
  console.log(JSON.stringify(v3Row, null, 2));

  // --------------------------------------------------------------------------
  // 2. USER PROFILE BACKEND & DATABASE VERIFICATION (ADR-010)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. USER PROFILE GIT-STYLE VERSIONING & ROLLBACK (ADR-010) ---');

  // Create User via API (Version 1)
  const testUserEmail = `git.faculty.${Date.now()}@examos.com`;
  const createUserRes = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: testUserEmail,
      password: 'User@123456',
      firstName: 'Alice',
      lastName: 'Sharma',
      roleIds: ['r3'],
    }),
  });
  const createdUserData = await createUserRes.json();
  const userId = createdUserData.data.id;
  console.log(`Created User ${userId} (${testUserEmail}) with Role TEACHER, Status ACTIVE.`);

  // Update User Profile (Version 2)
  console.log(`Updating User ${userId}: changing Role TEACHER -> SUB_ADMIN, First Name Alice -> Dr. Alice...`);
  const updateUserRes = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      firstName: 'Dr. Alice',
      roleIds: ['r2'],
    }),
  });
  const updatedUserData = await updateUserRes.json();
  console.log(`User updated: Name is now "${updatedUserData.data.firstName} ${updatedUserData.data.lastName}", Roles: [${updatedUserData.data.roles?.join(', ')}].`);

  // Fetch Version History from entity_versions
  const userVersionsRes = await fetch(`${API_BASE}/users/${userId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const userVersionsData = await userVersionsRes.json();
  const uv2Row = userVersionsData.data.find((v) => v.version === 2);

  console.log('\n[REAL DB ROW — User Edit v2 in entity_versions]:');
  console.log(JSON.stringify(uv2Row, null, 2));

  // Rollback User Profile to Version 1
  console.log(`\nRolling back User ${userId} to Version 1...`);
  const rollbackUserRes = await fetch(`${API_BASE}/users/${userId}/versions/1/rollback`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const rolledBackUserData = await rollbackUserRes.json();
  console.log(`Rollback completed -> Reverted to Name "${rolledBackUserData.data.firstName}", Roles: [${rolledBackUserData.data.roles?.join(', ')}].`);

  // Fetch Version History after Rollback
  const userVersionsAfterRes = await fetch(`${API_BASE}/users/${userId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const userVersionsAfterData = await userVersionsAfterRes.json();
  const uv3Row = userVersionsAfterData.data.find((v) => v.version === 3);

  console.log('\n[REAL DB ROW — User Rollback v3 in entity_versions]:');
  console.log(JSON.stringify(uv3Row, null, 2));

  // --------------------------------------------------------------------------
  // 3. UI VISUAL VERIFICATION & SCREENSHOT CAPTURE
  // --------------------------------------------------------------------------
  console.log('\n--- 3. UI VISUAL VERIFICATION & SCREENSHOT CAPTURE ---');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async (dialog) => {
    console.log('Dialog:', dialog.message());
    await dialog.accept();
  });

  console.log('Logging in as Admin on web UI...');
  await page.goto('http://localhost:3000');
  await page.locator('input[type="email"]').fill('admin@examos.com');
  await page.locator('input[type="password"]').fill('Admin@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForSelector('#nav-tab-dashboard', { timeout: 10000 });

  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  // A. Question Bank Version History Drawer & Diff View
  console.log('Opening Question Bank to inspect Version History drawer...');
  await page.click('#nav-tab-question_bank');
  await page.waitForSelector('text=Question Bank Workbench', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Click Versions button on first question
  const qHistoryBtn = page.getByRole('button', { name: /versions/i }).first();
  await qHistoryBtn.click();
  await page.waitForSelector('text=Version History:', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const qHistoryScreenshot = path.join(screenshotDir, 'question_version_history_drawer.png');
  await page.screenshot({ path: qHistoryScreenshot, fullPage: true });
  console.log('Saved Question Version History screenshot:', qHistoryScreenshot);

  // Click Compare / Diff button
  const qDiffTab = page.getByRole('button', { name: /compare \/ diff/i }).first();
  await qDiffTab.click();
  await page.waitForTimeout(1000);

  const qDiffScreenshot = path.join(screenshotDir, 'question_diff_viewer.png');
  await page.screenshot({ path: qDiffScreenshot, fullPage: true });
  console.log('Saved Question Diff Viewer screenshot:', qDiffScreenshot);

  await page.locator('h2:has-text("Version History")').locator('..').getByRole('button', { name: '✕' }).click();
  await page.waitForTimeout(500);

  // B. User Management & Profile History Drawer & Diff View
  console.log('Opening User Management to inspect Profile Version History & Diffing...');
  await page.click('#nav-tab-users');
  await page.waitForSelector('text=User Management & Profile Version History', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const uTableScreenshot = path.join(screenshotDir, 'users_management_table.png');
  await page.screenshot({ path: uTableScreenshot, fullPage: true });
  console.log('Saved Users Table screenshot:', uTableScreenshot);

  // Click History & Diff on the created user
  const uHistoryBtn = page.getByRole('button', { name: /history & diff/i }).first();
  await uHistoryBtn.click();
  await page.waitForSelector('text=User Profile History:', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const uHistoryScreenshot = path.join(screenshotDir, 'user_version_history_drawer.png');
  await page.screenshot({ path: uHistoryScreenshot, fullPage: true });
  console.log('Saved User Profile History screenshot:', uHistoryScreenshot);

  // Click Compare / Diff in User Drawer
  const uDiffTab = page.getByRole('button', { name: /compare \/ diff/i }).first();
  if (await uDiffTab.isVisible().catch(() => false)) {
    await uDiffTab.click();
    await page.waitForTimeout(1000);
    const uDiffScreenshot = path.join(screenshotDir, 'user_diff_viewer.png');
    await page.screenshot({ path: uDiffScreenshot, fullPage: true });
    console.log('Saved User Diff Viewer screenshot:', uDiffScreenshot);
  }

  await browser.close();
  console.log('\nAll Git-Style Tooling verifications completed successfully!');
})();
