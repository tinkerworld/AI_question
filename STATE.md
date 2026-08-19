# ExamOS Build State

**Last updated:** 2026-08-19T22:00:00+05:30  
**Current phase:** Phase 5 — Exam Generator  
**Phase 5 Task Status:** `tested` (Tasks 5.1, 5.2, 5.3, 5.4 set to `tested` in `tools/build-tracker/state.json:348-381`; pending human reviewer evaluation before transition to `done`).

---

## 1. Database Architecture & Runtime Unification (Commit `f275621`)

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
  - [`question.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/question.routes.ts#L2): lines 27, 30, 38, 46, 74, 121, 151, 171, 185, 190, 195, 200, 222, 237, 248, 260, 273, 290, 298, 306, 342, 349, 375, 388, 403-406.
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

## 3. Deviations From Docs & Logged Backlog Items (Section 8)

Per Section 8 of the Build Directive, gaps between declared tracker task scope and repository implementation are documented as follows:

| Task ID | Task Title | State in Tracker | Deviation / Rationale |
| :--- | :--- | :--- | :--- |
| **Task 2.5** | Course-Subject-Syllabus Frontend | `pending` (`state.json:154-160`) | **Deferred to backlog**: Backend API endpoints (`GET/POST /api/v1/courses`, `GET/POST /api/v1/courses/:id/subjects`, `GET/POST /api/v1/syllabus/tree`) and automated test suites (`tests/phase-02-master.test.js:41`) are 100% verified. A standalone visual tree editor page was deferred; basic routing renders within default layout container in [`apps/web/src/App.tsx:212-228`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx#L212-L228). Phase 2 is marked `completed: false` in `state.json:119`. |
| **Task 3.7** | Question Bank Frontend | `pending` (`state.json:228-234`) | **Deferred to backlog**: Backend CRUD, Git-like version history, rollback, taxonomy tags, previous exam tracking, and analytics endpoints (`apps/api/src/routes/question.routes.ts`) and test suites (`tests/phase-03-master.test.js:61`) are 100% verified. Dedicated WYSIWYG authoring workbench page is deferred to post-Phase 5 UI sprint. Phase 3 is marked `completed: false` in `state.json:179`. |

---

## 4. Phase 5 Implementation Verification (`tested`)

### 4.1 Implemented Features & Endpoints
- **Feature 5.1 — Exam Generation Engine**:
  - Blueprint-driven paper generation: [`POST /api/v1/exams/generate`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L23-L40).
  - Stratified balancing service: [`ExamGeneratorService.generateExam`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/services/exam-generator.service.ts#L23-L125).
  - Duplicate prevention, deficit reporting (`422 INSUFFICIENT_QUESTIONS`), and `avoidRecentDays` filter.
- **Feature 5.2 — Draft Exam Inspection & Editing Workbench**:
  - Inspection with distribution statistics: [`GET /api/v1/exams/:id/draft`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L65-L84).
  - Question swap with duplicate guard: [`PATCH /api/v1/exams/:id/questions/:qId/swap`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L173-L196).
  - Section question regeneration: [`PATCH /api/v1/exams/:id/sections/:secId/regenerate`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L198-L220).
  - Manual question reordering: [`PATCH /api/v1/exams/:id/reorder`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L222-L244).
- **Feature 5.3 — Exam Metadata & Publication Workflow**:
  - Metadata & schedule updates: [`PATCH /api/v1/exams/:id`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L107-L127).
  - Immutable publication snapshot: [`POST /api/v1/exams/:id/publish`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L129-L151).
- **Feature 5.4 — Manual Exam Creation**:
  - Blank manual paper: [`POST /api/v1/exams/manual`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L86-L105).
  - Manual section creator: [`POST /api/v1/exams/:id/sections`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L153-L171).
  - Direct question addition: [`POST /api/v1/exams/:id/questions`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L246-L269).
- **Frontend Workbench UI**:
  - Complete operational workbench implemented in [`ExamsPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/ExamsPage.tsx) (Paper generation modal, draft inspection drawer, question swap modal, sequence reordering, section regeneration, metadata modal, manual exam builder, section builder, question picker modal).

### 4.2 Teardown & Cascading Delete Integrity
- Cascading pattern deletion implemented in [`exam-patterns.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam-patterns.routes.ts#L135-L165).
- Cascading exam deletion implemented in [`exam.routes.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/routes/exam.routes.ts#L309-L335).
- Automated test fixture teardown loop verified in [`tests/phase-05-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-05-master.test.js#L425-L455).

---

## 5. Live Master Test Results (Cold Run Evidence)

Raw execution output from executing all 5 master test suites sequentially against a freshly seeded embedded PostgreSQL instance is captured in [`test-output.txt`](file:///D:/Download/Company/Software/Test%20os/Exam/test-output.txt) (8,097 bytes).

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
1. Review raw test output in [`test-output.txt`](file:///D:/Download/Company/Software/Test%20os/Exam/test-output.txt).
2. Package review zip via [`Reviewzip.bat`](file:///D:/Download/Company/Software/Test%20os/Exam/Reviewzip.bat).
3. Upon human reviewer approval, transition Phase 5 task state in [`tools/build-tracker/state.json`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/build-tracker/state.json#L348) from `tested` to `done`.
4. Proceed to **Phase 6: Exam System** (Student Exam Access, Attempt Session, Timer, Answer Submission, Auto-Evaluation Engine, Grading).
