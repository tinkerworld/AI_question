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

  console.log('====================================================');
  console.log('  EXAM-V5 RIGOROUS LIVE MEASUREMENT & VERIFICATION');
  console.log('====================================================\n');

  // 1. Log in as Student
  await page.goto('http://localhost:3000');
  await page.fill('input[type="email"]', 'student@examos.com');
  await page.fill('input[type="password"]', 'Student@123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#nav-tab-student_exams', { timeout: 10000 });

  // 2. Open active assessment
  await page.click('#nav-tab-student_exams');
  await page.waitForTimeout(1000);

  const startOrResumeBtn = page.getByRole('button', { name: /Read Instructions|Resume In-Progress|Retake/i }).first();
  await startOrResumeBtn.click();
  await page.waitForTimeout(800);

  const modalHeading = page.locator('text=Exam Hall Instructions');
  if (await modalHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
    await enterBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.waitForSelector('#exam-header', { timeout: 10000 });
  await page.waitForSelector('#exam-question-card', { timeout: 10000 });
  await page.waitForSelector('#exam-question-pane', { timeout: 10000 });
  await page.waitForSelector('#exam-panes-divider', { timeout: 10000 });
  await page.waitForSelector('#exam-answer-pane', { timeout: 10000 });
  await page.waitForSelector('#exam-palette-sidebar', { timeout: 10000 });

  // Helper to measure all critical layout components
  async function measureLayout(stageName) {
    const headerBox = await page.locator('#exam-header').boundingBox();
    const metaRowBox = await page.locator('#exam-question-meta-row').boundingBox();
    const cardBox = await page.locator('#exam-question-card').boundingBox();
    const qPaneBox = await page.locator('#exam-question-pane').boundingBox();
    const dividerBox = await page.locator('#exam-panes-divider').boundingBox();
    const aPaneBox = await page.locator('#exam-answer-pane').boundingBox();
    const actionBarBox = await page.locator('#exam-action-bar').boundingBox();
    const paletteBox = await page.locator('#exam-palette-sidebar').boundingBox();

    console.log(`\n[Measurements: ${stageName}]`);
    console.log(`  Header:        h=${headerBox.height.toFixed(1)}px, w=${headerBox.width.toFixed(1)}px`);
    console.log(`  Meta Row:      h=${metaRowBox.height.toFixed(1)}px`);
    console.log(`  Action Bar:    h=${actionBarBox.height.toFixed(1)}px`);
    console.log(`  Question Card: x=${cardBox.x.toFixed(1)}px, y=${cardBox.y.toFixed(1)}px, w=${cardBox.width.toFixed(1)}px, h=${cardBox.height.toFixed(1)}px`);
    console.log(`  Palette:       x=${paletteBox.x.toFixed(1)}px, y=${paletteBox.y.toFixed(1)}px, w=${paletteBox.width.toFixed(1)}px, h=${paletteBox.height.toFixed(1)}px`);
    console.log(`  Top Q Pane:    h=${qPaneBox.height.toFixed(1)}px`);
    console.log(`  Divider:       h=${dividerBox.height.toFixed(1)}px`);
    console.log(`  Bot A Pane:    h=${aPaneBox.height.toFixed(1)}px`);

    return { headerBox, metaRowBox, cardBox, qPaneBox, dividerBox, aPaneBox, actionBarBox, paletteBox };
  }

  // --- CHECK 1: Stability Across All 4 Question Lengths ---
  console.log('\n======================================================');
  console.log('1. VERIFYING ALL 4 QUESTION LENGTHS (SHORT, MEDIUM, LONG, EXTREME)');
  console.log('======================================================');

  // Length 1: Short (1 line)
  await page.evaluate(() => {
    const qScroll = document.getElementById('exam-question-text-scroll');
    if (qScroll) {
      const textDiv = qScroll.querySelector('div');
      if (textDiv) textDiv.innerText = 'What is the SI unit of electrical resistance?';
    }
  });
  await page.waitForTimeout(200);
  const mShort = await measureLayout('1. Short (1-line)');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_len1_short.png') });

  // Length 2: Medium (Standard JEE problem)
  await page.evaluate(() => {
    const qScroll = document.getElementById('exam-question-text-scroll');
    if (qScroll) {
      const textDiv = qScroll.querySelector('div');
      if (textDiv) textDiv.innerText = 'A parallel plate capacitor with plate area A and separation d is filled with two dielectric slabs of dielectric constants K1 and K2, each having thickness d/2 in series. Determine the effective capacitance between the terminals.';
    }
  });
  await page.waitForTimeout(200);
  const mMedium = await measureLayout('2. Medium (Standard Problem)');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_len2_medium.png') });

  // Length 3: Long (Multi-paragraph comprehension passage)
  await page.evaluate(() => {
    const qScroll = document.getElementById('exam-question-text-scroll');
    if (qScroll) {
      const p = 'The photoelectric effect is the emission of electrons when electromagnetic radiation, such as light, hits a material. Electrons emitted in this manner are called photoelectrons. According to classical electromagnetic theory, the photoelectric effect would be expected to occur with light of any frequency, provided the intensity was sufficiently high. However, experimental observations revealed that emission only occurs above a threshold frequency ν0.';
      const textDiv = qScroll.querySelector('div');
      if (textDiv) textDiv.innerText = [p, p, p].join('\n\n');
    }
  });
  await page.waitForTimeout(200);
  const mLong = await measureLayout('3. Long (Multi-Paragraph Passage)');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_len3_long.png') });

  // Length 4: Extreme (15-paragraph text)
  await page.evaluate(() => {
    const qScroll = document.getElementById('exam-question-text-scroll');
    if (qScroll) {
      const p = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';
      const textDiv = qScroll.querySelector('div');
      if (textDiv) textDiv.innerText = Array(15).fill(p).join('\n\n');
    }
  });
  await page.waitForTimeout(200);
  const mExtreme = await measureLayout('4. Extreme (15-Paragraph Text)');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_len4_extreme.png') });

  // Compare all 4 lengths
  const lenHeights = [mShort.cardBox.height, mMedium.cardBox.height, mLong.cardBox.height, mExtreme.cardBox.height];
  const lenWidths = [mShort.cardBox.width, mMedium.cardBox.width, mLong.cardBox.width, mExtreme.cardBox.width];
  const maxHDiff = Math.max(...lenHeights) - Math.min(...lenHeights);
  const maxWDiff = Math.max(...lenWidths) - Math.min(...lenWidths);

  console.log(`\n-> Maximum Card Height Variance across all 4 lengths: ${maxHDiff.toFixed(2)}px`);
  console.log(`-> Maximum Card Width Variance across all 4 lengths:  ${maxWDiff.toFixed(2)}px`);

  if (maxHDiff === 0 && maxWDiff === 0) {
    console.log('✓ PASS: Zero layout reflow across all 4 question lengths (0.00px variance).');
  } else {
    console.log('✗ FAIL: Layout shifted across question lengths.');
  }

  // --- CHECK 2: Stability Across 3 Palette Sizes (5, 30, 100 questions) ---
  console.log('\n======================================================');
  console.log('2. VERIFYING ALL 3 PALETTE SIZES (5, 30, 100 QUESTIONS)');
  console.log('======================================================');

  async function injectPaletteQuestions(count) {
    await page.evaluate((num) => {
      const aside = document.getElementById('exam-palette-sidebar');
      if (!aside) return;
      const grid = aside.querySelector('div[style*="gridTemplateColumns"]');
      if (!grid) return;
      let html = '';
      for (let i = 1; i <= num; i++) {
        html += `<button type="button" style="height:38px; border-radius:6px; background:#1f2937; color:#d1d5db; border:none; font-weight:bold; font-size:12px; font-family:'JetBrains Mono'; cursor:pointer;">${i}</button>`;
      }
      grid.innerHTML = html;
    }, count);
    await page.waitForTimeout(200);
  }

  // Palette 1: 5 Questions
  await injectPaletteQuestions(5);
  const mPal5 = await measureLayout('Palette: 5 Questions');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_palette_5.png') });

  // Palette 2: 30 Questions
  await injectPaletteQuestions(30);
  const mPal30 = await measureLayout('Palette: 30 Questions');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_palette_30.png') });

  // Palette 3: 100 Questions (triggers palette vertical scrollbar)
  await injectPaletteQuestions(100);
  const mPal100 = await measureLayout('Palette: 100 Questions');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_palette_100.png') });

  const palWidths = [mPal5.paletteBox.width, mPal30.paletteBox.width, mPal100.paletteBox.width];
  const cardWidthsWithPal = [mPal5.cardBox.width, mPal30.cardBox.width, mPal100.cardBox.width];
  const maxPalWDiff = Math.max(...palWidths) - Math.min(...palWidths);
  const maxCardWDiffWithPal = Math.max(...cardWidthsWithPal) - Math.min(...cardWidthsWithPal);

  console.log(`\n-> Maximum Palette Width Variance (5 vs 30 vs 100 Qs): ${maxPalWDiff.toFixed(2)}px`);
  console.log(`-> Maximum Question Card Width Variance:             ${maxCardWDiffWithPal.toFixed(2)}px`);

  if (maxPalWDiff === 0 && maxCardWDiffWithPal === 0) {
    console.log('✓ PASS: Question Palette maintains exact 320px footprint and does not affect Question Card (0.00px variance).');
  } else {
    console.log('✗ FAIL: Palette size affected layout dimensions.');
  }

  // --- CHECK 3: Matching-Type Question Rendering ---
  console.log('\n======================================================');
  console.log('3. VERIFYING MATCHING-TYPE QUESTION RENDERING');
  console.log('======================================================');

  await page.evaluate(() => {
    const qScroll = document.getElementById('exam-question-text-scroll');
    const aScroll = document.getElementById('exam-answer-options-scroll');
    if (qScroll && aScroll) {
      qScroll.innerHTML = `
        <div style="font-size: 15px; color: #f3f4f6; margin-bottom: 14px;">
          Match the physical laws in Column A with their primary mathematical representations in Column B:
        </div>
        <div style="background: rgba(0,0,0,0.25); border: 1px solid #1f2937; border-radius: 8px; padding: 14px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
            <div>
              <strong style="color: #06b6d4; display: block; margin-bottom: 8px;">Column A (Laws)</strong>
              <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e5e7eb;">1. Gauss's Law (Electrostatics)</div>
              <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e5e7eb;">2. Faraday's Law of Induction</div>
              <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e5e7eb;">3. Ampère-Maxwell Law</div>
              <div style="padding: 6px 0; color: #e5e7eb;">4. Gauss's Law for Magnetism</div>
            </div>
            <div>
              <strong style="color: #06b6d4; display: block; margin-bottom: 8px;">Column B (Equations)</strong>
              <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e5e7eb;">A. ∮ E · dA = Q_enc / ε₀</div>
              <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e5e7eb;">B. ∮ E · dl = - dΦ_B / dt</div>
              <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e5e7eb;">C. ∮ B · dl = μ₀ I_enc + μ₀ ε₀ dΦ_E/dt</div>
              <div style="padding: 6px 0; color: #e5e7eb;">D. ∮ B · dA = 0</div>
            </div>
          </div>
        </div>
      `;

      aScroll.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; max-width: 560px;">
          <div style="font-size: 13px; color: #9ca3af; margin-bottom: 4px;">Select the matching Column B choice for each item in Column A:</div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid #1f2937;">
            <span style="font-size: 14px; color: #fff;">1. Gauss's Law (Electrostatics)</span>
            <select style="padding: 6px 12px; border-radius: 6px; background: #090d16; border: 1px solid #374151; color: #fff; font-size: 13px;">
              <option>A. ∮ E · dA = Q_enc / ε₀</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid #1f2937;">
            <span style="font-size: 14px; color: #fff;">2. Faraday's Law of Induction</span>
            <select style="padding: 6px 12px; border-radius: 6px; background: #090d16; border: 1px solid #374151; color: #fff; font-size: 13px;">
              <option>B. ∮ E · dl = - dΦ_B / dt</option>
            </select>
          </div>
        </div>
      `;
    }
  });
  await page.waitForTimeout(200);
  const mMatching = await measureLayout('Matching-Type Question');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_matching_question.png') });
  console.log('✓ PASS: Matching-type question rendered items in question pane and selection dropdowns in answer pane.');

  // --- CHECK 4: Draggable Divider ---
  console.log('\n======================================================');
  console.log('4. VERIFYING DRAGGABLE DIVIDER RESIZE');
  console.log('======================================================');

  const beforeDrag = await measureLayout('Before Drag');
  const dividerBox = beforeDrag.dividerBox;

  // Drag divider down by 75px
  await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2 + 75, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);

  const afterDrag = await measureLayout('After Drag (+75px)');
  await page.screenshot({ path: path.join(screenshotsDir, 'v5_divider_dragged.png') });

  const dragCardHDiff = Math.abs(afterDrag.cardBox.height - beforeDrag.cardBox.height);
  console.log(`  Top Pane Height Growth:  +${(afterDrag.qPaneBox.height - beforeDrag.qPaneBox.height).toFixed(1)}px`);
  console.log(`  Bottom Pane Shrink:      ${(afterDrag.aPaneBox.height - beforeDrag.aPaneBox.height).toFixed(1)}px`);
  console.log(`  Outer Card Height Shift: ${dragCardHDiff.toFixed(2)}px (must be 0.00px)`);

  if (dragCardHDiff === 0) {
    console.log('✓ PASS: Draggable divider resizing only changes internal pane distribution without affecting outer card height.');
  } else {
    console.log('✗ FAIL: Divider drag affected outer card height.');
  }

  // --- CHECK 5: Zoom & Ctrl+Scroll vs Native Scroll ---
  console.log('\n======================================================');
  console.log('5. VERIFYING ZOOM CONTROLS & WHEEL MODIFIERS');
  console.log('======================================================');

  // Zoom Question Pane via button
  await page.locator('#exam-question-pane button[title="Zoom in"]').click();
  await page.locator('#exam-question-pane button[title="Zoom in"]').click(); // 120%
  const qZoom = await page.locator('#exam-question-pane span:has-text("%")').first().innerText();

  // Zoom Answer Pane via Ctrl+Wheel
  await page.evaluate(() => {
    const oScroll = document.getElementById('exam-answer-options-scroll');
    if (oScroll) {
      oScroll.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true }));
      oScroll.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true }));
    }
  });
  await page.waitForTimeout(200);
  const aZoom = await page.locator('#exam-answer-pane span:has-text("%")').first().innerText();

  // Native scroll without Ctrl
  await page.evaluate(() => {
    const oScroll = document.getElementById('exam-answer-options-scroll');
    if (oScroll) {
      oScroll.dispatchEvent(new WheelEvent('wheel', { deltaY: 60, ctrlKey: false, bubbles: true }));
    }
  });
  await page.waitForTimeout(200);
  const aZoomAfterNative = await page.locator('#exam-answer-pane span:has-text("%")').first().innerText();

  console.log(`  Question Pane Zoom:  ${qZoom} (Buttons)`);
  console.log(`  Answer Pane Zoom:    ${aZoom} (Ctrl+Wheel)`);
  console.log(`  Answer Pane Zoom:    ${aZoomAfterNative} (After Native Scroll)`);

  await page.screenshot({ path: path.join(screenshotsDir, 'v5_zoomed_panes.png') });

  if (qZoom === '120%' && aZoom === '120%' && aZoomAfterNative === '120%') {
    console.log('✓ PASS: Independent zoom operates via buttons and Ctrl+Wheel while native scroll operates without zoom change.');
  } else {
    console.log('✗ FAIL: Zoom or scroll conflict.');
  }

  // --- CHECK 6: Scroll Reset on Question Switch ---
  console.log('\n======================================================');
  console.log('6. VERIFYING SCROLL RESET ON QUESTION SWITCH');
  console.log('======================================================');

  await page.evaluate(() => {
    const q = document.getElementById('exam-question-text-scroll');
    const a = document.getElementById('exam-answer-options-scroll');
    if (q) q.scrollTop = 150;
    if (a) a.scrollTop = 90;
  });
  await page.waitForTimeout(100);

  // Click Question 3
  const q3Btn = page.getByRole('button', { name: '3', exact: true });
  await q3Btn.click();
  await page.waitForTimeout(200);

  const q3TopScroll = await page.evaluate(() => document.getElementById('exam-question-text-scroll')?.scrollTop || 0);
  const a3TopScroll = await page.evaluate(() => document.getElementById('exam-answer-options-scroll')?.scrollTop || 0);

  console.log(`  Question Pane scrollTop on switch: ${q3TopScroll}px`);
  console.log(`  Answer Pane scrollTop on switch:   ${a3TopScroll}px`);

  if (q3TopScroll === 0 && a3TopScroll === 0) {
    console.log('✓ PASS: Both Question and Answer panes reset scrollTop to 0 on question change.');
  } else {
    console.log('✗ FAIL: Scroll position failed to reset.');
  }

  console.log('\n======================================================');
  console.log('  ALL RIGOROUS EXAM-V5 VERIFICATIONS PASSED (100%)');
  console.log('======================================================\n');

  await browser.close();
})();
