# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: exam-exit-protection.spec.ts >> Active Exam Exit Protection (Back-button, Tab Close, Refresh) >> Exit Path 3: Tab Close / Navigation protection is scoped ONLY to active attempt and disengages on submit
- Location: ../../../../../../tmp/examos-e2e-rR4hmB/e2e/exam-exit-protection.spec.ts:103:7

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('button', { name: /Enter Exam Hall & Start/i })
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" with timeout 5000ms
  - waiting for getByRole('button', { name: /Enter Exam Hall & Start/i })

```

```yaml
- banner:
  - text: EX ExamOS // Adaptive Learning Platform Adaptive Learning & Assessment OS Student Student
  - button "Light": ☀️ Light
  - button "Slate": 🌫️ Slate
  - button "Dark": 🌙 Dark
  - button "Theme Accents, Seasonal Festivals & Accessibility Settings": ▼
  - combobox:
    - option "অসমীয়া (Assamese)"
    - option "বাংলা (Bengali)"
    - option "बोडो (Bodo)"
    - option "डोगरी (Dogri)"
    - option "English (English)" [selected]
    - option "ગુજરાતી (Gujarati)"
    - option "हिन्दी (Hindi)"
    - option "ಕನ್ನಡ (Kannada)"
    - option "कश्मीरी (Kashmiri)"
    - option "मैथिली (Maithili)"
    - option "മലയാളം (Malayalam)"
    - option "মৈতৈলোন্ (Manipuri)"
    - option "मराठी (Marathi)"
    - option "Mizo (Mizo)"
    - option "नेपाली (Nepali)"
    - option "ଓଡ଼ିଆ (Odia)"
    - option "ਪੰਜਾਬੀ (Punjabi)"
    - option "संस्कृतम् (Sanskrit)"
    - option "ᱥᱟᱱᱛᱟᱲᱤ (Santhali)"
    - option "सिंधी (Sindhi)"
    - option "தமிழ் (Tamil)"
    - option "తెలుగు (Telugu)"
    - option "اردو (Urdu)"
  - button "Log Out"
- complementary:
  - text: Modules
  - navigation: Dashboard My Assessments & Tests Practice & Training AI Interview & Viva Listening Practice Writing Practice Vocabulary Training Subscription & Credits Student Analytics & Mastery Published Archive
- main:
  - heading "My Assessments & Tests" [level=1]
  - paragraph: Assigned curriculum examinations, mock papers, and historical test sessions
  - button "🔄 Refresh"
  - text: Exam Open
  - heading "JEE Main Grand Blueprint (PCM) - Generated Paper" [level=3]
  - text: "⏱ Duration:"
  - strong: 180 mins
  - text: "🎯 Max Marks:"
  - strong: "300"
  - text: "📑 Sections:"
  - strong: "3"
  - text: "❓ Questions:"
  - strong: "30"
  - button "📖 Read Instructions Start"
  - text: Exam Open
  - heading "JEE Main Grand Blueprint (PCM) - Generated Paper" [level=3]
  - text: "⏱ Duration:"
  - strong: 180 mins
  - text: "🎯 Max Marks:"
  - strong: "300"
  - text: "📑 Sections:"
  - strong: "3"
  - text: "❓ Questions:"
  - strong: "30"
  - button "📖 Read Instructions Start"
  - heading "Exam Hall Instructions" [level=2]
  - button "✕"
  - strong: JEE Main Grand Blueprint (PCM) - Generated Paper
  - text: "Duration: 180 mins • Total Questions: 30 • Max Marks: 300"
  - heading "General Guidelines" [level=4]
  - list:
    - listitem: Guideline Timer
    - listitem: Guideline Auto Submit
    - listitem: Guideline Palette Nav
    - listitem: Guideline Save Next
    - listitem: Guideline Review
  - heading "Section Breakdown" [level=4]
  - table:
    - rowgroup:
      - row "Section Questions Correct Incorrect Section Marks":
        - columnheader "Section"
        - columnheader "Questions"
        - columnheader "Correct"
        - columnheader "Incorrect"
        - columnheader "Section Marks"
    - rowgroup:
      - 'row "Section A: Physics 10 +4 -1 40"':
        - 'cell "Section A: Physics"'
        - cell "10"
        - cell "+4"
        - cell "-1"
        - cell "40":
          - strong: "40"
      - 'row "Section B: Chemistry 10 +4 -1 40"':
        - 'cell "Section B: Chemistry"'
        - cell "10"
        - cell "+4"
        - cell "-1"
        - cell "40":
          - strong: "40"
      - 'row "Section C: Mathematics 10 +4 -1 40"':
        - 'cell "Section C: Mathematics"'
        - cell "10"
        - cell "+4"
        - cell "-1"
        - cell "40":
          - strong: "40"
  - checkbox "Agree Terms" [checked]
  - text: Agree Terms
  - button "Cancel"
  - button "🚀 Enter Exam Hall"
```

# Test source

```ts
  21  |     await modalHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  22  |     if (await modalHeading.isVisible()) {
  23  |       const checkbox = page.locator('input[type="checkbox"]');
  24  |       await expect(checkbox).toBeVisible({ timeout: 10000 });
  25  |       await checkbox.check();
  26  |       const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
  27  |       await expect(enterBtn).toBeEnabled({ timeout: 10000 });
  28  |       await enterBtn.click();
  29  |     }
  30  | 
  31  |     // 5. Verify active inside Exam Player
  32  |     await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 10000 });
  33  | 
  34  |     // 6. Trigger Browser Back Button Popstate Navigation
  35  |     await page.dispatchEvent('#btn-trigger-exit-modal', 'click');
  36  | 
  37  |     // 7. Verify In-App Exit Modal is displayed
  38  |     const exitModal = page.locator('#exam-exit-modal');
  39  |     await expect(exitModal).toBeVisible({ timeout: 10000 });
  40  |     await expect(exitModal).toContainText('Active Examination in Progress');
  41  |     await expect(exitModal).toContainText('Your exam is still in progress and the timer is still running - are you sure you want to leave?');
  42  | 
  43  |     // 8. Test "Continue Exam" button
  44  |     const continueBtn = page.getByRole('button', { name: /Continue Exam/i });
  45  |     await continueBtn.click();
  46  |     await expect(exitModal).not.toBeVisible();
  47  |     await expect(page.locator('text=Question Palette')).toBeVisible();
  48  | 
  49  |     // 9. Trigger Browser Back Button again and choose "Yes, Leave Exam"
  50  |     await page.dispatchEvent('#btn-trigger-exit-modal', 'click');
  51  |     await expect(exitModal).toBeVisible({ timeout: 10000 });
  52  |     const leaveBtn = page.getByRole('button', { name: /Yes, Leave Exam/i });
  53  |     await leaveBtn.click();
  54  |     await expect(exitModal).not.toBeVisible();
  55  | 
  56  |     // Returned safely to assessment dashboard
  57  |     await expect(page.locator('h1')).toContainText('My Assessments');
  58  |   });
  59  | 
  60  |   test('Exit Path 2: Page Refresh / beforeunload is prevented with confirmation during IN_PROGRESS attempt', async ({ page }) => {
  61  |     await loginAs(page, 'student');
  62  | 
  63  |     const studentExamsTab = page.locator('#nav-tab-student_exams');
  64  |     await expect(studentExamsTab).toBeVisible();
  65  |     await studentExamsTab.click();
  66  | 
  67  |     const startOrRetakeBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume In-Progress/i }).first();
  68  |     await expect(startOrRetakeBtn).toBeVisible({ timeout: 10000 });
  69  |     await startOrRetakeBtn.click();
  70  | 
  71  |     const modalHeading = page.locator('text=Exam Hall Instructions');
  72  |     await modalHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  73  |     if (await modalHeading.isVisible()) {
  74  |       const checkbox = page.locator('input[type="checkbox"]');
  75  |       await expect(checkbox).toBeVisible({ timeout: 10000 });
  76  |       await checkbox.check();
  77  |       const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
  78  |       await expect(enterBtn).toBeEnabled();
  79  |       await enterBtn.click();
  80  |     }
  81  | 
  82  |     await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 10000 });
  83  | 
  84  |     // Test beforeunload handler directly in the browser context
  85  |     const beforeUnloadResult = await page.evaluate(() => {
  86  |       const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
  87  |       let preventDefaultCalled = false;
  88  |       event.preventDefault = () => {
  89  |         preventDefaultCalled = true;
  90  |       };
  91  |       window.dispatchEvent(event);
  92  |       return {
  93  |         defaultPrevented: event.defaultPrevented || preventDefaultCalled,
  94  |         returnValue: event.returnValue,
  95  |       };
  96  |     });
  97  | 
  98  |     // In a standard browser, setting event.returnValue = '' or calling e.preventDefault()
  99  |     // causes the browser to prompt confirmation before unloading
  100 |     expect(beforeUnloadResult.defaultPrevented).toBe(true);
  101 |   });
  102 | 
  103 |   test('Exit Path 3: Tab Close / Navigation protection is scoped ONLY to active attempt and disengages on submit', async ({ page }) => {
  104 |     await loginAs(page, 'student');
  105 | 
  106 |     const studentExamsTab = page.locator('#nav-tab-student_exams');
  107 |     await expect(studentExamsTab).toBeVisible();
  108 |     await studentExamsTab.click();
  109 | 
  110 |     const startOrRetakeBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume In-Progress/i }).first();
  111 |     await expect(startOrRetakeBtn).toBeVisible({ timeout: 10000 });
  112 |     await startOrRetakeBtn.click();
  113 | 
  114 |     const modalHeading2 = page.locator('text=Exam Hall Instructions');
  115 |     await modalHeading2.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  116 |     if (await modalHeading2.isVisible()) {
  117 |       const checkbox = page.locator('input[type="checkbox"]');
  118 |       await expect(checkbox).toBeVisible({ timeout: 10000 });
  119 |       await checkbox.check();
  120 |       const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
> 121 |       await expect(enterBtn).toBeEnabled();
      |                              ^ Error: expect(locator).toBeEnabled() failed
  122 |       await enterBtn.click();
  123 |     }
  124 | 
  125 |     await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 10000 });
  126 | 
  127 |     // Submit the exam
  128 |     const submitBtn = page.getByRole('button', { name: /Submit Test|Finish & Submit/i }).first();
  129 |     await submitBtn.click();
  130 |     const confirmBtn = page.getByRole('button', { name: /Confirm Submission/i });
  131 |     await expect(confirmBtn).toBeVisible();
  132 |     await confirmBtn.click();
  133 | 
  134 |     // Verify on Result Page
  135 |     await expect(page.locator('text=Scorecard & Solution Analysis')).toBeVisible({ timeout: 15000 });
  136 | 
  137 |     // Verify beforeunload is NOT active on ExamResultPage
  138 |     const resultPageBeforeUnload = await page.evaluate(() => {
  139 |       const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
  140 |       let preventDefaultCalled = false;
  141 |       event.preventDefault = () => {
  142 |         preventDefaultCalled = true;
  143 |       };
  144 |       window.dispatchEvent(event);
  145 |       return {
  146 |         defaultPrevented: event.defaultPrevented || preventDefaultCalled,
  147 |       };
  148 |     });
  149 | 
  150 |     expect(resultPageBeforeUnload.defaultPrevented).toBe(false);
  151 |   });
  152 | 
  153 |   test('Exit Path 4: App-level sidebar navigation & header logout are locked during active exam attempt and prompt warning modal', async ({ page }) => {
  154 |     // 1. Log in as Student
  155 |     await loginAs(page, 'student');
  156 | 
  157 |     // 2. Navigate to assessments tab
  158 |     const studentExamsTab = page.locator('#nav-tab-student_exams');
  159 |     await expect(studentExamsTab).toBeVisible();
  160 |     await studentExamsTab.click();
  161 | 
  162 |     // 3. Start or Retake an exam
  163 |     const startOrRetakeBtn = page.getByRole('button', { name: /Read Instructions|Retake|Resume In-Progress/i }).first();
  164 |     await expect(startOrRetakeBtn).toBeVisible({ timeout: 10000 });
  165 |     await startOrRetakeBtn.click();
  166 | 
  167 |     // 4. Accept instructions if modal opens
  168 |     const modalHeading = page.locator('text=Exam Hall Instructions');
  169 |     await modalHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  170 |     if (await modalHeading.isVisible()) {
  171 |       const checkbox = page.locator('input[type="checkbox"]');
  172 |       await expect(checkbox).toBeVisible({ timeout: 10000 });
  173 |       await checkbox.check();
  174 |       const enterBtn = page.getByRole('button', { name: /Enter Exam Hall & Start/i });
  175 |       await expect(enterBtn).toBeEnabled({ timeout: 10000 });
  176 |       await enterBtn.click();
  177 |     }
  178 | 
  179 |     // 5. Verify active inside Exam Player
  180 |     await expect(page.locator('text=Question Palette')).toBeVisible({ timeout: 10000 });
  181 | 
  182 |     const exitModal = page.locator('#exam-exit-modal');
  183 | 
  184 |     // 6. Test Sidebar Interception: Clicking Dashboard nav tab triggers warning modal and does not navigate
  185 |     const dashboardNavTab = page.locator('#nav-tab-dashboard');
  186 |     await expect(dashboardNavTab).toBeVisible();
  187 |     await expect(dashboardNavTab).toHaveCSS('cursor', 'not-allowed', { timeout: 10000 });
  188 |     await dashboardNavTab.click();
  189 | 
  190 |     await expect(exitModal).toBeVisible({ timeout: 5000 });
  191 |     await expect(exitModal).toContainText('Active Examination in Progress');
  192 | 
  193 |     // Dismiss modal and stay in exam
  194 |     const continueBtn = page.getByRole('button', { name: /Continue Exam/i });
  195 |     await continueBtn.click();
  196 |     await expect(exitModal).not.toBeVisible();
  197 |     await expect(page.locator('text=Question Palette')).toBeVisible();
  198 | 
  199 |     // 7. Test Header Logout Interception: Clicking Logout triggers warning modal instead of logging out
  200 |     const logoutBtn = page.getByRole('button', { name: /Logout/i });
  201 |     await expect(logoutBtn).toBeVisible();
  202 |     await logoutBtn.click();
  203 | 
  204 |     await expect(exitModal).toBeVisible({ timeout: 5000 });
  205 |     await expect(exitModal).toContainText('Active Examination in Progress');
  206 | 
  207 |     await continueBtn.click();
  208 |     await expect(exitModal).not.toBeVisible();
  209 |     await expect(page.locator('text=Question Palette')).toBeVisible();
  210 |   });
  211 | });
  212 | 
```