# Independent fix verification — 3 October 2026

Verification resumed after the prior tool-approval interruption. The reported direct fixes pass, but remaining validation, draft privacy, and build defects prevent sign-off. No application fixes were made during this verification.

## Results

- Current Chromium/browser and API assertion suite: **12 passed, 7 failed, 0 skipped** (19 cases, approximately 52 seconds).
- Additional API checks: **8/8 expected outcomes confirmed**. These overlap some suite checks and are not eight additional features.
- Frontend TypeScript check: **pass**.
- Backend TypeScript check: **fail, 265 diagnostics**, exit code 2. Full output in `backend-typecheck.txt`.
- Fresh schema migration and seed: **pass**, verified on 2 October during this continuation without the former import-resolution workaround.

## Confirmed fixed

| Prior issue | Observed result |
|---|---|
| Student mock grading override | Request with `allowTestMock: true` returns `REVIEW_REQUIRED`, no available band |
| Teacher score 99 | HTTP 400 |
| Arbitrary supplied overall score | Valid four scores of 6 produce overall 6 despite supplied overall 9 |
| Nonexistent question | HTTP 404 with controlled message |
| Object instead of essay string | HTTP 400 |
| MCQ sent to Writing evaluation | HTTP 400 |
| Basic draft refresh recovery | Exact essay restored after refresh |
| Mobile student login overflow | Document width <= 390 pixels at 390px viewport |
| Seed import resolution | Fresh seed completes with unmodified runner |

Additional passes include landing-to-login navigation, admin/teacher/student login, invalid-login feedback, Writing Task 1 image/word-count/submission flow, denial of student access to reviews/export, and cross-student evaluation read denial. Only local draft isolation fails; server-side evaluation reads remain protected in the tested case.

## Remaining defects

### P1 — Draft from one student is visible to another

Reproduction:
1. Sign in as `student@examos.com` and start Task 2 Writing practice.
2. Enter `Private answer belonging only to student one.`
3. Open a second tab in the same browser context and sign in as `student2@examos.com`.
4. Open Writing Practice.

Observed: the second student's editor contains the first student's exact answer. The test failed on the answer-value assertion after both login flows succeeded. This is a confirmed local privacy leak, not just a suspected shared-key problem.

Cause: `WritingPracticePage.tsx:49` uses `examos_writing_active_draft` for every account, and restoration at line 51 does not validate the saved session owner. Scope storage by authenticated user and session, validate ownership before restoring, and handle legacy drafts safely.

### P1 — Invalid review criterion sets are accepted

All four requests below returned HTTP 201 instead of 400 on a Task 2 evaluation:

- Missing criteria: `{ "task_response": 9 }`.
- Unknown criterion: `{ "invented": 9 }`.
- Four correct criteria plus an extra `invented` criterion.
- Task 1 `task_achievement` supplied instead of Task 2 `task_response`, alongside the other three criteria.

Range validation is fixed, but exact rubric membership/completeness is not. Require exactly the task's four criterion IDs in both the route and service before calculating the average or storing training labels.

Source: `writing.routes.ts:283`, `writing-evaluation-engine.service.ts:1157`.

### P2 — Deleted essay text reappears after refresh

Write a draft, erase all text, wait beyond the autosave interval, refresh, and return to Writing Practice. The original text returns. Both persistence paths skip empty strings, leaving the previous draft stored.

Source: `WritingPracticePage.tsx:76` and `:97`. Persist the empty draft or explicitly clear the stored answer when the candidate deletes it.

### P2 — Autosave recreates a submitted draft

Type an answer and submit before the debounce fires. The scorecard appears, but after six seconds the local draft key again contains the submitted answer and old IN_PROGRESS session. The pending editor timeout survives unmount and invokes the earlier callback.

Source: `ExamWritingEditor.tsx:56` and `WritingPracticePage.tsx:231`. Cancel pending autosave on unmount and invalidate draft writes after submission/exit. Submission cleanup alone is insufficient.

### Build blocker — Backend still fails type checking

`tsc --noEmit` reports 265 diagnostics, including database result typing, cross-package rootDir errors, and test typing errors. This count matches the prior run. No clean-baseline comparison was performed, so not every diagnostic is attributed to Writing changes.

## Existing test-suite status

The legacy broad suite was not rerun in this resumed pass. Read-only inspection confirms that its shared login helper still expects `Sign in to ExamOS` at the old route, permission tests still read `localStorage.token`, and a navigation test still expects a placeholder dashboard. Those test maintenance issues remain. The previous missing-assessment fixture problem was not resolved or revalidated here. Do not interpret this focused verification as a passing full-application regression run.

## Scope and evidence

The isolated API on port 4044 and frontend on port 3001 used `/tmp/examos-reverify-pPUolh/db`, created fresh for the prior continuation. Mock providers only were enabled in this database; external voice services were disabled. The resumed run reused it. Newly generated review cases used unique answers; direct API checks also exercised some existing idempotent records. Original app services and the working database were not modified.

The Writing UI changed between interruption and resumption: it now has a rules acceptance screen. Temporary test copies were updated to check the consent box and press the observed start button before interacting with the editor. Application source was not edited.

The earlier cross-account attempt stopped at login because logout during an active attempt was intercepted. That inconclusive attempt is superseded by the successful two-tab reproduction in this report.

Evidence:
- `resumed-report/html/index.html`: interactive Playwright report with failure screenshots and traces.
- `resumed-report/results.json`: machine-readable results.
- `api-results.json`: API outcomes.
- `backend-typecheck.txt`: compiler output.
- `focused/`: exact current test sources; `e2e/helpers/auth.ts`: temporary role-specific login helper.

The test/config files expect the same seeded personas, localhost ports, and Playwright installation as the initial run. Resolve `@playwright/test` using `tools/e2e-tester/node_modules` when rerunning the archived tests. Traces can contain test session details; treat them as local diagnostic artifacts.

Live AI scoring quality, RAG retrieval, real payments, load, and a complete cross-browser matrix remain outside this verification. Staff may still opt into mock grading by design; its production suitability was not certified here.
