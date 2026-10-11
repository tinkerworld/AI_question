# Final targeted regression verification — 3 October 2026

All 21 targeted cases passed independently against the compiled API. The two draft defects and compiled startup mismatch identified in the preceding follow-up report are resolved in the tested checkout.

## Verified results

| Check | Result |
|---|---|
| Legacy draft without top-level owner metadata rejected for another student | Pass |
| Student one and student two preserve separate answers after each tab reloads | Pass |
| New draft not restored for another account | Pass |
| Empty draft remains empty after refresh | Pass |
| Submission does not recreate shared draft after debounce | Pass |
| Missing, unknown, extra, and wrong-task review criteria rejected | Pass, HTTP 400 |
| Overall review score computed from valid criterion scores | Pass |
| Student mock override rejected/ignored; strict review-required behavior | Pass |
| MCQ evaluation request, invalid essay type, missing question rejected | Pass |
| Teacher score 99 rejected | Pass |
| Cross-student result read and staff endpoint restrictions | Pass |
| Task 1 chart, word count, submission scorecard | Pass |
| Landing, role-specific login, invalid login, mobile 390px fit | Pass |
| API `npm run build` | Exit 0 |
| Frontend `npm run typecheck` | Exit 0 |
| `npm start` after build | Starts compiled API; browser/API suite runs against it |
| `node dist/apps/api/src/server.js` | Starts; `/health` responds successfully |

The main suite completed with 21 passed, 0 failed, 0 skipped, in approximately one minute. Eight additional direct API checks produced expected outcomes; these overlap main-suite checks and are not eight additional independent features.

## Test adaptations and evidence

The legacy-isolation assertion checks the actual successful state: the second student sees the catalog and no editor. It no longer incorrectly requires a nonmatching editor to exist. The two-student test now refreshes both tabs and asserts both exact answers. Existing fixtures reproduce the old shared-key format by stripping owner metadata from a saved test draft, leaving its actual saved session owner intact.

- `final-report/html/index.html`: Playwright report.
- `final-report/results.json`: machine-readable results.
- `api-results.json`: direct API observations.
- `focused/` and `e2e/helpers/auth.ts`: test sources.
- Configuration files use the isolated frontend/API ports and require the existing Playwright dependencies.

The API build creates `dist/server.js` forwarding to `./apps/api/src/server.js`. The compiled workspace resolver successfully handled the exercised API paths without missing-module errors. The direct compiled entry was tested separately after stopping the npm-start instance to avoid concurrent database use.

## Scope

Tests used the dedicated database `/tmp/examos-reverify-pPUolh/db`, API port 4044, and frontend port 3001. Mock-only providers and disabled external voice services remained configured in that test database. Some direct checks exercised idempotently stored test submissions; the review-set cases created fresh unique submissions.

No application source was edited. `npm run build` regenerated local API build artifacts. Test servers were stopped afterward; the user's original services and working database were left alone.

This closes the reported defects within the targeted scenarios. It is not a new full-application sign-off: the old broad browser suite was not rerun, live RAG/AI grading accuracy and real payment flows were not tested, and deployment-directory synchronization was not verified. These limits remain unchanged from prior reports.
