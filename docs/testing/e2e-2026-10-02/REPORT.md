# ExamOS end-to-end test report — 2 October 2026

The tested application is not ready for a clean end-to-end sign-off. Confirmed Writing validation and draft-recovery defects remain. The existing browser suite also needs updates before its failures can reliably indicate application regressions.

## Results

| Check | Passed | Failed | Not run |
|---|---:|---:|---:|
| Existing Chromium suite, with temporary login-route adaptation | 31 | 32 | 8 |
| Focused current-login, mobile, Writing, and permission checks | 7 | 4 | 0 |
| Additional API checks | 4 | 4 | 0 |
| Frontend TypeScript check | Pass | — | — |
| Backend TypeScript check | — | 265 diagnostics; exit 2 | — |

Additional API results classify provider failure handling, cross-student access denial, course-creation denial, and user-listing denial as passes. Missing-question handling, essay-type validation, student mock override, and teacher-score range validation fail. These overlap some focused checks and must not be counted as distinct defects.

The original login smoke test was stopped after two failures and one interrupted test: it expects the old login page at `/`. Three remaining login cases were not run in that initial attempt. The later focused suite verifies the current role-specific routes. One legacy student-2 analytics test was excluded because it also hardcodes the old login screen.

## Confirmed defects

### P1 — Students can enable test grading

Authenticated student POST `/api/v1/writing/evaluations/submit` with a valid writing question, an essay, and `allowTestMock: true` returned HTTP 201, `status: COMPLETED`, and estimated Band 5.0 using the test/descriptor path. With normal strict settings and only mock providers available, the endpoint correctly returns `REVIEW_REQUIRED`.

The public route forwards `allowTestMock` directly from the request body. Remove client control of this flag and enforce any test behavior solely through trusted server configuration. Reproduction is in `focused/current.spec.ts` and `api-checks.cjs`.

Source: `Exam/apps/api/src/routes/writing.routes.ts:99`, `Exam/apps/api/src/services/writing-evaluation-engine.service.ts:614`.

### P1 — Writing practice drafts are lost on refresh

Log in as the seeded student, open Writing Practice, start Task 2, type an answer, wait six seconds, refresh, and return to Writing Practice. The catalog returns with no restored editor or draft. The page keeps the answer in component state and passes no autosave callback to the editor.

Provide persisted draft saves and an explicit resume flow. Source: `Exam/apps/web/src/pages/WritingPracticePage.tsx:889`.

### P1 — Teacher reviews accept invalid criterion scores

A teacher submitted all four criterion scores as 99 and overall score 99. The endpoint returned HTTP 201, persisted criterion scores of 99, and clamped the overall score to 9. Invalid labels can contaminate reviewed training data.

Validate criterion IDs, completeness, numeric type, and permitted ranges before persistence. Compute the aggregate from validated criterion scores rather than accepting an unrelated overall score.

Source: `Exam/apps/api/src/services/writing-evaluation-engine.service.ts:1126`.

### P2 — Evaluation submission lacks input/question validation

- Submitting an existing MCQ question to the Writing evaluation endpoint returns HTTP 201 instead of rejecting the question type.
- An object supplied as `essayText` returns HTTP 201 instead of a validation error.
- A nonexistent question ID returns HTTP 500 with a database foreign-key constraint message instead of a controlled 404/400 response.

Add request-schema validation and explicit question existence/type checks before evaluation. Verify enrollment/attempt ownership as part of that validation; the current test establishes the above failures, not every authorization scenario.

### P2 — Mobile student login has horizontal overflow

At a 390 × 844 viewport, document width is 676 pixels. The header's theme/language controls extend beyond the screen. See `mobile-overflow.png`. Source: `Exam/apps/web/src/pages/StudentLoginPage.tsx:57`.

### Build/setup blockers

- Backend `tsc --noEmit` exits 2 with 265 diagnostics, including untyped database result access, rootDir cross-package errors, and test typing issues. See `backend-typecheck.txt`. No baseline comparison was performed, so these are not all attributed to the current Writing changes.
- Fresh seeding fails on imports at `Exam/packages/database/prisma/seed.ts:202–203`: `../../apps/api/src/...` resolves to the wrong directory. A temporary module-resolution hook was used for test setup; the source file was not edited.

## Verified working paths

- Public landing page to student login.
- Admin, teacher, and student login; invalid-login feedback.
- Writing Task 1 chart image loads, nine-word sample counts correctly, and submission reaches a scorecard.
- Students are denied teacher review queues and dataset exports.
- A second student is denied another student's evaluation (403).
- Students are denied course creation and user listing (403).
- Normal mock-provider evaluation is marked for review instead of reporting an available band.
- Existing tests pass for exam generation/inspection/publishing, admin pattern creation/editing, archive viewing, major admin navigation, settings, and simulated subscription/credit/refund flows.

## Legacy test failures and coverage limits

The 32 legacy failures are not 32 confirmed product defects. Failure evidence includes:

- Old login-page text and URL assumptions.
- Tests reading `localStorage.token` although authentication now uses sessionStorage.
- A helper clearing localStorage without clearing the current tab's sessionStorage when switching users.
- A test explicitly expecting the dashboard to remain a placeholder.
- Changed button labels/selectors in course authoring, question authoring, and user management.
- Seeded students seeing no currently available assessments: exam-taking, timer, exit protection, and related result/analytics flows were not established in this fixture.
- Analytics showing fallback text such as “Analytics Title” and different seed metrics. The exact cause needs separate investigation.
- Serial suites leaving later tests unrun after their setup or earlier test fails.

Live model quality, RAG retrieval, speech transcription, external interview services, real payment processing, Firefox/WebKit, concurrency/load, offline reconnection, and complete registration/recovery coverage were not validated. No claims about IELTS scoring accuracy follow from this run.

## Environment and isolation

Test API: `127.0.0.1:4044`; test frontend: `127.0.0.1:3001`. A fresh PGlite database was migrated and seeded at `/tmp/examos-e2e-rR4hmB/fresh-db`. A preliminary database copy could not initialize; it was not used for results. The original host services on ports 3000/4043 were left running and unmodified.

Only mock AI providers were enabled in the fresh database. The voice-service address was directed to an unavailable local port to prevent external interview sessions. Simulated billing tests operated only on the fresh database. Focused Writing checks ran alongside the older suite against this same isolated database; tested flows use separate attempts, but this is not a concurrency/load test.

Application source files and pre-existing uncommitted changes were preserved. Test copies, reports, traces, and screenshots were generated. Screenshots from legacy Windows-specific paths were moved out of the source tree into the temporary run directory.

## Evidence and rerunning

- `report/html/index.html`: legacy Playwright report with failure screenshots and traces.
- `focused-report/html/index.html`: current-flow report with screenshots and traces.
- `report/results.json` and `focused-report/results.json`: machine-readable results.
- `api-results.json`: additional API reproduction responses, without authentication tokens.
- `backend-typecheck.txt`: complete backend compiler output.
- `e2e/`, `focused/`, and the configuration files: exact test copies used.

The helper is adapted to role-specific login routes, and copied API URLs point to port 4044. These tests expect the seeded personas and the isolated app described above. From this report directory, after starting an equivalent test API/frontend, resolve `@playwright/test` through the existing tester installation (for example set NODE_PATH to its node_modules directory), then invoke that installation's Playwright CLI with `--config ./playwright.config.cjs --grep-invert 'LoginPage|student 2 \('` or `--config ./focused.config.cjs`. `api-checks.cjs` targets port 4044 explicitly. Never point destructive fixture tests at a production database.

The temporary seed hook and server runner include this checkout's absolute paths; adjust them if the checkout moves. The temporary services were stopped after the run. Fixes were not applied as part of this testing request.
