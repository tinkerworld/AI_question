# ExamOS UI Tester (`tools/e2e-tester`)

Standalone "human simulation" test tool — separate from the pnpm workspace,
same isolation pattern as `tools/build-tracker`. Drives a real Chromium
browser through the actual running app and catches the class of bug the
backend master test suites structurally can't see: dead buttons, empty
placeholder tabs, frontend calls hitting a URL that doesn't match any real
backend route.

Several tests are named `REGRESSION:` and exist because of a specific bug
already found and fixed once during review — see the table at the bottom.

## One-time setup

```bash
cd tools\e2e-tester
npm install
npm run install-browser
```

`install-browser` downloads a real Chromium binary from
`cdn.playwright.dev`. This needs normal, unrestricted internet access — it
will not work from a network-restricted sandbox. Run it yourself, not
through an agent running in a restricted environment.

## Running it

```
1. start_all.bat        (from the repo root, in a separate window)
2. run_ui_tests.bat      (from the repo root, once the app is live)
```

`run_ui_tests.bat`:
- Checks ports 3000 and 4000 are actually responding first, and fails fast
  with a clear message if the stack isn't running, instead of a wall of
  cryptic "connection refused" errors from every test.
- Runs the suite, showing output live in the terminal.
- Saves the full transcript to `logs\e2e-run-<timestamp>.txt`.
- Copies the HTML report + traces + screenshots into
  `reports\<timestamp>\`, so each run's evidence is kept separately instead
  of being overwritten by the next run.
- Automatically prunes old report folders, keeping the 5 most recent, so
  this doesn't grow unbounded and bloat every review zip.

## Getting this in front of Claude (or any reviewer)

Both `logs\*.txt` and `reports\` are picked up automatically the next time
you run `Reviewzip.bat` at the repo root — nothing to configure. The
timestamped `.txt` extension is deliberate: `Reviewzip.bat` excludes `*.log`
files, so naming these `.log` would make them silently disappear from every
future review-package.zip with no warning. Don't rename them.

To inspect a specific trace yourself:
```
npx playwright show-trace tools\e2e-tester\reports\<timestamp>\trace.zip
```

## What's covered

| File | Covers | Regression test for |
|---|---|---|
| `navigation.spec.ts` | Every nav tab renders real content, not the placeholder | Tasks 2.5/3.7 silently marked done while empty |
| `exam-patterns.spec.ts` | Create modal, Edit modal, Sub-Admin permissions | Dead Create modal; missing Edit UI; missing `exams.create` grant |
| `courses.spec.ts` | Course/subject CRUD, syllabus tree | Subject edit/delete hitting a 404'ing URL |
| `question-bank.spec.ts` | Create, version history, status transitions, filters | Missing initial version snapshot on question creation |
| `exam-generator.spec.ts` | Generate from blueprint, inspect draft, publish | Phase 5 workbench end-to-end, UI-level |

## Not covered yet

- Bulk operations (tag/status) — no backend endpoint exists yet (documented
  gap in STATE.md), so there's nothing real to test against.
- Phase 6+ — not built yet.
- Cross-browser — chromium only; add more `projects` entries in
  `playwright.config.ts` if that becomes a priority.

## On selector fragility

Selectors use visible text/role (`getByRole`, `getByText`), not CSS classes,
since none of the current components have `data-testid` attributes. This is
the more human-realistic approach, but a wording change in the UI can break
a test even when behavior is correct. If that gets noisy, adding
`data-testid` attributes to the actual components is the durable fix — worth
considering as a small follow-up, not something to route around here.