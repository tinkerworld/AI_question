# ExamOS Build State

**Last updated:** 2026-08-20T13:20:00+05:30  
**Current phase:** Phase 5 — Exam Generator (with Phase 2, 3, 4, 5 UI Workbenches & E2E Verification Completed)  
**Task Status:**
- **Task 2.5 (Course-Subject-Syllabus Frontend)**: `tested` in `tools/build-tracker/state.json` (Implemented, end-to-end verified via automated UI tests, pending reviewer sign-off).
- **Task 3.7 (Question Bank Frontend)**: `tested` in `tools/build-tracker/state.json` (Implemented, end-to-end verified via automated UI tests, pending reviewer sign-off).
- **Phase 5 Tasks (5.1 to 5.4)**: `tested` in `tools/build-tracker/state.json` (Backend + UI generation workbenches verified via automated UI tests, pending reviewer sign-off).

---

## 1. Database Architecture & Runtime Unification (Commit `f275621` & `9f943b6`)

### 1.1 In-Process PostgreSQL 16 Engine (`pgDb`)
ExamOS unifies all database operations onto `@electric-sql/pglite` (embedded WebAssembly PostgreSQL 16 engine).
- **Explicit Dependency**: `@electric-sql/pglite` (version `^0.5.5`) is explicitly defined in [`packages/database/package.json:14`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/package.json#L14) and tracked in [`pnpm-lock.yaml`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/pnpm-lock.yaml).
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
- **Dead Code Cleanup**:
  - Fully removed `export const prisma = new PrismaClient()` and `@prisma/client` from [`packages/database/src/index.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/packages/database/src/index.ts).
  - Updated Test 1.2-U2 in [`tests/phase-01-master.test.js:49-52`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-01-master.test.js#L49-L52) to assert `export const pgDb` (the unified in-process database singleton). The server now boots cleanly on fresh installs with 0 `prisma generate` dependencies.
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

## 3. UI Fixes, Role-Based Access Control & Navigation (Post-`ed31d87b`)

### 3.1 Permission-Based Navigation Filtering (`App.tsx`)
In accordance with **ADR-005** (permission-based access control rather than role-name checks), sidebar navigation tabs in [`apps/web/src/App.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx) are dynamically filtered using `NAV_ITEMS` and `hasPermission(user.permissions, item.requiredPermission)`:
- `dashboard`: Open to all authenticated sessions.
- `exams` ("Exam Generator & Papers"): Gated by `exams.create`.
- `exam_patterns` ("Exam Patterns"): Gated by `exams.create`.
- `question_bank` ("Question Bank"): Gated by `questions.read`.
- `courses` ("Academic Structure"): Gated by `courses.create`.
- `users`: Gated by `users.read`.
- `analytics`: Open to all authenticated sessions.

**Gating Resolution by Persona**:
- **`STUDENT`** (`courses.read`, `exams.read`, `exams.attempt`):
  - Correctly hides admin/authoring modules (`question_bank`, `courses`, `users`, `exams`, `exam_patterns`).
  - Corrected `exams.read` overload to `exams.create` so students do not see exam authoring tooling.
- **`TEACHER`** (`courses.read`, `questions.*`, `exams.*`):
  - Sees `dashboard`, `exams`, `exam_patterns`, `question_bank`, `analytics`.
  - Correctly hides `courses` (no `courses.create`) and `users` (no `users.read`).
- **`SUB_ADMIN` & `MAIN_ADMIN`**: Full access to all 7 tabs.

### 3.2 Exam Pattern Creation Fix (`ExamPatternsPage.tsx`)
- **Regression Root Cause**: The Create Exam Pattern modal had no course selector (`courseId` remained `''`), but `createExamPatternSchema` strictly requires `z.string().min(1)`. Every UI pattern creation failed with `400 "Course ID is required"`.
- **Fix**:
  - Added required Course dropdown in [`ExamPatternsPage.tsx:1578-1609`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/ExamPatternsPage.tsx#L1578-L1609).
  - Dynamically populates and filters `availableSubjects` upon course selection.
  - Enforced button disabling `disabled={!courseId || !name.trim()}` and validation guard in `handleCreatePattern`.
  - Added linked `courseName` badge in the pattern list table.
  - Fully covered by automated UI test in `exam-patterns.spec.ts`.

---

## 4. Standing E2E Browser / Human Simulation Test Suite (`tools/e2e-tester`)

A permanent, automated Playwright UI regression test suite is established in [`tools/e2e-tester`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester) and run directly via [`run_ui_tests.bat`](file:///D:/Download/Company/Software/Test%20os/Exam/run_ui_tests.bat).

- **Execution Engine**: Playwright Chromium driving the live Vite web app (port 3000) and Express API (port 4000).
- **Persistent Trend History**: Append-only log in [`tools/e2e-tester/logs/history.txt`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/logs/history.txt).
- **Timestamped HTML Reports & Traces**: Auto-generated in [`tools/e2e-tester/reports/<timestamp>/`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/reports/).
- **Current Suite Status**: **23 / 23 Tests Passing (100%)**

### 4.1 Spec Coverage Summary (23 Tests)
1. **[`e2e/courses.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/courses.spec.ts)** (3 tests):
   - Admin course creation and heading visibility.
   - Subject creation, edit, and native dialog delete roundtrip (regression check for 404 URL).
   - Syllabus tree hierarchy rendering and node expansion.
2. **[`e2e/exam-generator.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-generator.spec.ts)** (3 tests):
   - Blueprint exam generation from seeded JEE Main pattern.
   - Draft exam inspection with section/question breakdown.
   - Publishing exam and verifying edit control locking.
3. **[`e2e/exam-patterns.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-patterns.spec.ts)** (3 tests):
   - Admin pattern creation with required Course selector and list appearance.
   - Admin pattern edit modal PATCH roundtrip and update persistence.
   - Sub-Admin `exams.create` permission verification.
4. **[`e2e/navigation.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/navigation.spec.ts)** (5 tests):
   - Built tabs (`exams`, `exam_patterns`, `question_bank`, `courses`) render real pages, not placeholders.
   - Unbuilt tabs (`dashboard`, `users`, `analytics`) honestly render placeholder fallback.
5. **[`e2e/question-bank.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/question-bank.spec.ts)** (4 tests):
   - Authoring modal question creation.
   - Version history regression check (verifying initial revision snapshot in drawer).
   - Lifecycle status transition (`DRAFT` -> `REVIEW`) persistence check.
   - Multi-filter toolbar (difficulty / type / status).
6. **[`e2e/role-based-access.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/role-based-access.spec.ts)** (5 tests):
   - All 4 personas (`MAIN_ADMIN`, `SUB_ADMIN`, `TEACHER`, `STUDENT`) login successfully.
   - Backend 403 API permission rejection for students.
   - Backend 403 API permission rejection for teachers on user management.
   - `TARGET:` Student navigation tab visibility gating (cannot see `question_bank`, `courses`, `users`, `exams`, `exam_patterns`).
   - `TARGET:` Teacher navigation tab visibility gating (cannot see `courses`, `users`).

---

## 5. Master Test Results Summary

### 5.1 Backend API Master Suites (81/81 PASS)
| Test Suite | File | Tests Run | Result |
| :--- | :--- | :--- | :--- |
| **Phase 1 Master Suite** | [`Exam/tests/phase-01-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-01-master.test.js) | 18 | **18/18 PASS** |
| **Phase 2 Master Suite** | [`Exam/tests/phase-02-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-02-master.test.js) | 10 | **10/10 PASS** |
| **Phase 3 Master Suite** | [`Exam/tests/phase-03-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-03-master.test.js) | 9 | **9/9 PASS** |
| **Phase 4 Master Suite** | [`Exam/tests/phase-04-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-04-master.test.js) | 26 | **26/26 PASS** |
| **Phase 5 Master Suite** | [`Exam/tests/phase-05-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-05-master.test.js) | 18 | **18/18 PASS** |
| **Total Backend Tests** | — | **81** | **81/81 PASS (100%)** |

### 5.2 Frontend E2E / Browser Simulation Suite (23/23 PASS)
| Test Suite | Spec File | Tests Run | Result |
| :--- | :--- | :--- | :--- |
| **Academic Structure UI** | [`e2e/courses.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/courses.spec.ts) | 3 | **3/3 PASS** |
| **Exam Generator UI** | [`e2e/exam-generator.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-generator.spec.ts) | 3 | **3/3 PASS** |
| **Exam Patterns UI** | [`e2e/exam-patterns.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-patterns.spec.ts) | 3 | **3/3 PASS** |
| **Navigation & Tab Shells** | [`e2e/navigation.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/navigation.spec.ts) | 5 | **5/5 PASS** |
| **Question Bank UI** | [`e2e/question-bank.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/question-bank.spec.ts) | 4 | **4/4 PASS** |
| **Role-Based Access Control** | [`e2e/role-based-access.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/role-based-access.spec.ts) | 5 | **5/5 PASS** |
| **Total E2E Tests** | — | **23** | **23/23 PASS (100%)** |

---

## 6. Reviewer Hand-off & Next Steps
1. All Phase 2.5, 3.7, and 5.1–5.4 frontend and backend tasks are fully verified, regression-tested with 100% pass rates across both backend suites (81/81) and the standing browser simulation suite (23/23).
2. `tools/e2e-tester` and `run_ui_tests.bat` are permanent standing tools for all future feature reviews and regression cycles.
3. Reviewer can review and sign off Tasks 2.5, 3.7, and Phase 5 tasks (5.1–5.4) from `tested` to `done` in `tools/build-tracker`.
