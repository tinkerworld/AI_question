# Follow-up verification — 3 October 2026

The previously failing direct regression cases now pass, including type checking. Two draft edge cases and a compiled startup configuration issue remain, so the claim that everything is resolved is too broad.

## Results

- API `tsc --noEmit`: exit 0.
- Frontend `npm run typecheck`: exit 0.
- API compilation to a temporary output directory: exit 0.
- 21-case browser/API assertion run: 18 passed, 3 failed initially. One failure was a test assertion incorrectly requiring an editor to exist after successful isolation. The corrected assertion confirmed the second account sees the catalog and no editor; its targeted rerun passed. Effective distinct results: **19 passed, 2 confirmed failures**.
- Additional API checks: eight expected outcomes confirmed (overlap with other checks; not eight additional features).

Verified fixes: exact four review criteria required, wrong-task/unknown/extra/missing criteria rejected, overall score calculated from valid criteria, score 99 rejected, student mock override suppressed, invalid essay/question requests rejected, new owner-labelled drafts not restored for a different account, empty draft recovery, no draft recreation after submission debounce, mobile login fit, and Task 1 image/editor/submission flow.

## Remaining P1 — Pre-upgrade drafts still leak

`WritingPracticePage.tsx:60` rejects owner metadata only when it is present and mismatches. Existing drafts saved by the previous release lack `userId` and `userEmail`, so they bypass this check.

Reproduction in `focused/legacy-drafts.spec.ts`:
1. Create a student-one draft and remove its top-level owner metadata to reproduce the exact pre-upgrade storage format; the saved session still identifies its original owner.
2. Sign in as student two in another tab of the same browser.
3. Open Writing Practice.

Observed: the second student's editor displays `Private legacy draft authored before ownership metadata existed.`

Reject unowned drafts by default, or migrate them only after verifying the saved session belongs to the current authenticated user. The test models upgrade behavior; it does not require an attacker modifying another browser's storage.

## Remaining P2 — Accounts overwrite each other's drafts

Despite ownership fields in the value, the key is still the shared `examos_writing_active_draft` (`WritingPracticePage.tsx:49`).

Reproduction:
1. Student one saves an answer and waits beyond the debounce.
2. Student two starts a different answer in another tab and waits for its save.
3. Student one refreshes and opens Writing Practice.

Observed: student one returns to the catalog; its answer is not restored because the sole stored draft now belongs to student two. Use independent keys by user and session; a metadata check alone cannot preserve multiple drafts.

## Compiled startup configuration regression

The widened API `rootDir` fixes the compiler boundary error, but changes output structure. Compiling with only `--outDir /tmp/examos-reverify-pPUolh/build-check` produces `apps/api/src/server.js` beneath that directory. Under the normal `dist` output, this corresponds to `dist/apps/api/src/server.js`.

`Exam/apps/api/package.json:8` still configures `npm start` as `node dist/server.js`. A clean build does not emit that entry point; an old file there could instead run stale code. Align build layout and the start command, then test compiled runtime and workspace package resolution. This run verified emitted paths; it did not certify the full compiled production runtime. Development `ts-node` startup is unaffected by this particular path mismatch.

## Limits and evidence

Testing used isolated ports 4044/3001 and the dedicated database `/tmp/examos-reverify-pPUolh/db`, with only mock providers enabled. The reported deployed services on 4043/3002 and workspace synchronization with `/home/ubuntu/Deploy/AI_question` were not independently verified. Application source and working database were not changed. The temporary test servers were stopped after testing.

The unchanged legacy 71-case suite was not rerun; this was targeted verification. No conclusions are drawn about real AI scoring quality, live RAG, external payments, or complete production readiness. Type-check success is confirmed, but generic database `any` defaults relax row typing rather than prove every query result shape is correct.

- `latest-report/html/index.html`: full run, including two actual failures and the superseded isolation assertion.
- `ownership-report/html/index.html`: corrected isolation assertion, passing.
- `api-results.json`: direct API observations.
- `focused/`: test sources, with the isolation assertion corrected after the main run.

Read the two browser reports together; the initial three-failure count must not be presented as three application defects.
