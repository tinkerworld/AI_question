# ExamOS Build State

**Last updated:** 2026-08-19T22:30:00+05:30  
**Current phase:** Phase 5 — Exam Generator (with Phase 2 & 3 Frontend Workbenches Completed)  
**Task Status:**
- **Task 2.5 (Course-Subject-Syllabus Frontend)**: `tested` in [`tools/build-tracker/state.json:154-160`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/build-tracker/state.json#L154-L160) (Implemented, end-to-end wired, pending reviewer sign-off).
- **Task 3.7 (Question Bank Frontend)**: `tested` in [`tools/build-tracker/state.json:228-234`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/build-tracker/state.json#L228-L234) (Implemented, end-to-end wired, pending reviewer sign-off).
- **Phase 5 Tasks (5.1 to 5.4)**: `tested` in [`tools/build-tracker/state.json:348-381`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/build-tracker/state.json#L348-L381) (Pending reviewer sign-off before transition to `done`).

---

## 1. Database Architecture & Runtime Unification (Commit `f275621` & `9f943b6`)

### 1.1 In-Process PostgreSQL 16 Engine (`pgDb`)
ExamOS unifies all database operations onto `@electric-sql/pglite` (embedded WebAssembly PostgreSQL 16 engine).
- **Primary Live Engine**: All active Express API routes query [`pgDb`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/src/index.ts#L41) directly:
  - [`course.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/course.routes.ts#L2): lines 27, 47, 65, 87, 107.
  - [`subject.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/subject.routes.ts#L2): lines 26, 46, 64, 87, 107.
  - [`syllabus.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/syllabus.routes.ts#L2): lines 26, 48, 86, 126, 150, 168.
  - [`enrollment.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/enrollment.routes.ts#L2): lines 31, 41, 48, 71, 97, 100.
  - [`user.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/user.routes.ts#L3): lines 21, 25, 47, 54, 59, 61, 80, 91, 121, 131, 137, 163, 164.
  - [`role.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/role.routes.ts#L2): lines 21, 26, 48, 54, 63, 67, 91, 95, 104, 108.
  - [`audit.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/audit.routes.ts#L2): lines 33, 38.
  - [`question.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/question.routes.ts#L2): lines 27, 30, 38, 46, 74, 121, 153, 172, 185, 190, 195, 200, 222, 237, 248, 260, 273, 290, 298, 306, 342, 349, 375, 388, 403-406.
  - [`exam.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L2): lines 30, 53, 76, 99, 122, 145, 168, 191, 214, 237, 260, 283, 306, 329.
- **Zero TCP / Port 5432 Dependencies**: Zero runtime endpoints connect through an external TCP port 5432 daemon.
- **Dead Code Audit**:
  - `export const prisma = new PrismaClient()` in [`packages/database/src/index.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/src/index.ts#L46) is retained exclusively as a static export to satisfy Phase 1 test assertion Test 1.2-U2 in [`tests/phase-01-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-01-master.test.js#L49-L52). Zero runtime API handlers invoke `prisma`.
  - [`tools/postgres-server.js`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/postgres-server.js#L1-L12) is removed from [`start_all.bat`](file:///D:/Download/Company/Software/Test%20os/Exam/start_all.bat#L1-L30) and marked with a top-level notice as legacy/reference-only for offline debugging.

### 1.2 Multi-Process Lock Collision & PID Auto-Cleanup
- **Collision Root Cause**: Concurrently launching `tools/postgres-server.js` and `apps/api/src/server.ts` caused both Node processes to lock `./postgres-data` simultaneously, triggering an Emscripten WASM abort and leaving a stale `postmaster.pid`.
- **Resolution**:
  - `start_all.bat` launches only the Express API Server (which initializes `pgDb` in-process), the Build Tracker (port 3050), and Vite (port 3000).
  - Robust directory resolution and stale `postmaster.pid` deletion are executed in [`packages/database/src/index.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/src/index.ts#L33-L39), [`migrate-postgres.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/prisma/migrate-postgres.js#L13-L18), and [`migrate-phase-05.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/prisma/migrate-phase-05.js#L13-L18).

---

## 2. Seed Data Reconciliation & Counts

### 2.1 Question Bank Item Volume (120 Items)
- **Exact Count**: Exactly **120 published questions** are defined in [`Exam/packages/database/prisma/seed.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/prisma/seed.ts#L285-L2365).
- **Matrix Breakdown**: 3 subjects × 4 syllabus topics = 12 topics; exactly 10 questions per topic (3 `EASY`, 4 `MEDIUM`, 3 `HARD`):
  1. `Physics — Mechanics`: `q_phy_mech_01` to `q_phy_mech_10` (10 items)
  2. `Physics — Optics`: `q_phy_opt_01` to `q_phy_opt_10` (10 items)
  3. `Physics — Electromagnetism`: `q_phy_em_01` to `q_phy_em_10` (10 items)
  4. `Physics — Modern Physics`: `q_phy_mod_01` to `q_phy_mod_10` (10 items)
  5. `Chemistry — Thermodynamics`: `q_chem_thermo_01` to `q_chem_thermo_10` (10 items)
  6. `Chemistry — Organic Chemistry`: `q_chem_org_01` to `q_chem_org_10` (10 items)
  7. `Chemistry — Inorganic Chemistry`: `q_chem_inorg_01` to `q_chem_inorg_10` (10 items)
  8. `Chemistry — Physical Chemistry`: `q_chem_phy_01` to `q_chem_phy_10` (10 items)
  9. `Mathematics — Calculus`: `q_math_calc_01` to `q_math_calc_10` (10 items)
  10. `Mathematics — Algebra`: `q_math_alg_01` to `q_math_alg_10` (10 items)
  11. `Mathematics — Coordinate Geometry`: `q_math_coord_01` to `q_math_coord_10` (10 items)
  12. `Mathematics — Probability & Statistics`: `q_math_prob_01` to `q_math_prob_10` (10 items)
- **Explanation of Past Discrepancies**:
  - The "150" stated in early documentation drafts was an initial estimation before the authoring matrix was standardized to 12 topics × 10 questions = 120 items. No questions were trimmed or lost from the dataset.
  - The "121" count resulted from a temporary index probe in one verification script. The physical AST array `SEED_QUESTIONS` in `seed.ts` contains exactly 120 elements.

### 2.2 Baseline Blueprint Consolidation
- The standard JEE Main blueprint (`pat_jee_main_standard`, "JEE Main Grand Blueprint (PCM)") with 3 multi-subject sections (Physics 10Q, Chemistry 10Q, Mathematics 10Q, 300 marks total) is folded directly into Step 8 of [`packages/database/prisma/seed.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/prisma/seed.ts#L2460-L2508).
- Running `pnpm db:seed` (or `npx ts-node --transpile-only packages/database/prisma/seed.ts`) seeds users, roles, courses, subjects, 12 topics, 120 questions, 23 languages, 207 translations, and the complete JEE Main blueprint in a single step.

---

## 3. Phase 2 & Phase 3 Frontend Workbenches (Tasks 2.5 & 3.7)

### 3.1 Task 3.7 — Question Bank Frontend Workbench
- **Component**: [`apps/web/src/pages/QuestionBankPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/QuestionBankPage.tsx) (Wired in [`App.tsx:210`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx#L210)).
- **Implemented Features**:
  1. **Analytics Summary Header**: Displays total questions, breakdown by difficulty (Easy, Medium, Hard), and breakdown by status from `GET /api/v1/questions/analytics/summary`.
  2. **Advanced Multi-Filter Toolbar**: Search by string/ID, filter by Difficulty, Type (8 built-in types), Status (`DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED`), Course, and Subject. Consumes `GET /api/v1/questions`.
  3. **Dynamic Per-Type Question Authoring & Editing Modal**:
     - Consumes `POST /api/v1/questions` (creation) and `PATCH /api/v1/questions/:id` (revision).
     - Renders custom dynamic payload builders matching `@repo/question-types` schemas for `MCQ` (options with radio selector), `MULTIPLE_SELECT` (checkboxes), `TRUE_FALSE` (toggles), `FILL_IN_BLANK` (accepted answers list), `SHORT_ANSWER` (keywords list), `NUMERICAL` (target value and ± tolerance margin), `MATCHING` (column pair builder), and `SUBJECTIVE` (sample answer & rubric criteria).
  4. **Student Preview Mode Modal**: Simulates student-facing exam presentation with interactive input controls while strictly suppressing answer keys, correct option IDs, and evaluation rubrics.
  5. **Version History & Rollback Drawer**: Consumes `GET /api/v1/questions/:id/versions` to list immutable version snapshots with timestamps, and triggers `POST /api/v1/questions/:id/versions/:version/rollback` to revert question state.
  6. **Lifecycle State Transition**: Dropdown selector invoking `PATCH /api/v1/questions/:id/status` (`DRAFT` -> `REVIEW` -> `PUBLISHED` -> `ARCHIVED`).
  7. **Previous Exam History Tracker**: Consumes `GET /api/v1/questions/:id/exam-history` and `POST /api/v1/questions/:id/exam-history` to view and log entrance exam appearances (exam name, year, shift).
  8. **Question Deletion**: Permanent deletion invoking `DELETE /api/v1/questions/:id`.

### 3.2 Task 2.5 — Course-Subject-Syllabus Frontend Workbench
- **Component**: [`apps/web/src/pages/CoursesPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/CoursesPage.tsx) (Wired in [`App.tsx:212`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx#L212)).
- **Implemented Features**:
  1. **Central Course Listing**: Displays all courses with codes, descriptions, and statuses (`DRAFT`, `PUBLISHED`, `ARCHIVED`). Consumes `GET /api/v1/courses`, `POST /api/v1/courses`, `PATCH /api/v1/courses/:id`, and `DELETE /api/v1/courses/:id`.
  2. **Course Detail View & Subject Management**: Two-pane workbench with breadcrumb navigation (`Courses > [Course] > [Subject]`). Lists subjects and provides modals to add/edit/delete subjects under a course via `GET/POST /api/v1/courses/:courseId/subjects` and `PATCH/DELETE /api/v1/courses/subject/:id`.
  3. **Expandable/Collapsible 4-Level Syllabus Tree**: Visual tree renderer for `UNIT` (Level 0), `TOPIC` (Level 1), `SUBTOPIC` (Level 2), and `CONCEPT` (Level 3) consuming `GET /api/v1/syllabus/tree?subjectId=...`. Includes depth badges, estimated minutes, and collapsible chevrons.
  4. **Syllabus Node Authoring & Metadata Editing**: Modals to create and edit syllabus nodes (title, type, description, estimated minutes, learning objectives, status, tags) consuming `POST /api/v1/subjects/:subjectId/syllabus` and `PATCH /api/v1/syllabus/node/:id`.
  5. **Node Reordering**: Up/Down reordering controls calling `PATCH /api/v1/syllabus/node/:id/reorder` with `{ parentId, orderIndex }`.
  6. **Node Deletion**: Deletes nodes via `DELETE /api/v1/syllabus/node/:id`.

---

## 4. Deviations From Docs / Backend Gaps (Section 8)

| Item | Context | Status / Resolution |
| :--- | :--- | :--- |
| **Task 2.5 & Task 3.7 Frontend State** | Phase 2 and Phase 3 Frontend tasks previously marked deferred | **Resolved**: Full interactive workbenches implemented in [`CoursesPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/CoursesPage.tsx) and [`QuestionBankPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/QuestionBankPage.tsx), wired into [`App.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx). Tasks 2.5 and 3.7 updated to `tested` in `state.json`. |
| **Backend Gap: Bulk Operations** | Feature 3.7 spec mentions bulk tagging / bulk status changes | **Documented Gap**: Dedicated atomic bulk endpoints (`POST /api/v1/questions/bulk-tag` and `PATCH /api/v1/questions/bulk-status`) are absent from `question.routes.ts`. The UI provides per-question status transitions and tag inspection without faking non-existent bulk endpoints. |

---

## 5. Live Master Test Results (Cold Run Evidence)

Raw execution output from executing all 5 master test suites sequentially against a freshly seeded embedded PostgreSQL instance is captured in [`test-output.txt`](file:///D:/Download/Company/Software/Test%20os/Exam/test-output.txt) (7,947 bytes).

| Test Suite | File | Tests Run | Result |
| :--- | :--- | :--- | :--- |
| **Phase 1 Master Suite** | [`Exam/tests/phase-01-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-01-master.test.js) | 18 | **18/18 PASS** |
| **Phase 2 Master Suite** | [`Exam/tests/phase-02-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-02-master.test.js) | 10 | **10/10 PASS** |
| **Phase 3 Master Suite** | [`Exam/tests/phase-03-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-03-master.test.js) | 9 | **9/9 PASS** |
| **Phase 4 Master Suite** | [`Exam/tests/phase-04-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-04-master.test.js) | 26 | **26/26 PASS** |
| **Phase 5 Master Suite** | [`Exam/tests/phase-05-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-05-master.test.js) | 18 | **18/18 PASS** |
| **Total Automated Tests** | — | **81** | **81/81 PASS (100%)** |

All test fixtures were torn down with 0 leftover test rows.

---

## 6. Reviewer Hand-off & Next Steps
1. Both [`QuestionBankPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/QuestionBankPage.tsx) and [`CoursesPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/CoursesPage.tsx) are fully wired into [`App.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx) and ready for live UI testing.
2. Raw test output is preserved in [`test-output.txt`](file:///D:/Download/Company/Software/Test%20os/Exam/test-output.txt).
3. Reviewer can review and sign off Tasks 2.5, 3.7, and Phase 5 tasks (5.1–5.4) from `tested` to `done` in `tools/build-tracker`.
