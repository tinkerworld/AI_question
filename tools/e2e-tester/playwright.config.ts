import { defineConfig, devices } from '@playwright/test';

/**
 * ExamOS E2E ("Human Simulation") Tester
 * Standalone tool, separate from the pnpm workspace - run via
 * run_ui_tests.bat at the repo root, or `npm test` from this folder.
 *
 * Every real bug found across the Phase 1-5 review was invisible to the
 * backend master test suites because they hit the API directly. The actual
 * failures were UI-level: a dead Create modal, nav tabs marked "done" that
 * were empty placeholders, a frontend calling a URL that 404'd. This tool
 * drives a real browser against the real running app to catch that class
 * of bug directly.
 *
 * OUTPUT LOCATIONS (both swept into review-package.zip by Reviewzip.bat):
 *   logs/e2e-run-<timestamp>.txt        - full console output of the run
 *   reports/<timestamp>/                - HTML report + traces + screenshots
 *
 * `playwright-report/` and `test-results/` below are scratch locations the
 * bat script copies out of and then leaves for the next run to overwrite -
 * they are gitignored and NOT the permanent record. The timestamped copies
 * in reports/ are the permanent record.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false, // tests share DB state (seeded courses/questions/patterns) - keep sequential
  retries: 0, // a retry hiding a real failure is worse than an honest one
  workers: 1,
  outputDir: './test-results',
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    // 'retain-on-failure', not 'on': a single full run's traces measured
    // ~17MB (out of ~22MB total report size) when set to 'on' for every
    // test regardless of outcome. A passing test's trace has near-zero
    // diagnostic value, so this keeps report size proportional to actual
    // failures - a clean run costs almost nothing, a broken one still gets
    // full traces exactly where needed.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});