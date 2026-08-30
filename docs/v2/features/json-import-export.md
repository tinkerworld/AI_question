# Feature: Schema-Validated JSON Import & Export

## 1. Purpose
The Schema-Validated JSON Import & Export system provides a robust, portable data exchange mechanism for curriculum entities, Question Banks, Exam Blueprints, Rubric Presets, and Vocabulary packages. It features a versioned JSON schema format (`examos-export-v2.json`), strict Zod validation pipelines (preventing blind inserts), a dry-run validation preview mode, conflict resolution options (`SKIP_EXISTING`, `OVERWRITE`, `CREATE_COPY`), and complete transactional rollback on failure.

## 2. Current State
Verified against the codebase:
- Seed scripts (`seed.ts`, `seed-questions.js`) exist for initial development data.
- No general JSON import or export API endpoints, services, or UI modals exist in the application.
- Teachers and administrators cannot export their question banks or courses for backup or import curriculum packages from external content creators.

## 3. Problem / Requirement
Educational institutions and curriculum creators require seamless content portability:
- **Portability**: Ability to export full courses (with subject hierarchies, syllabus nodes, and attached questions) or standalone Question Bank categories into clean, human-readable JSON files.
- **Safety Against Data Corruption**: Malformed or outdated JSON files must never corrupt the database. Import pipelines must validate 100% of rows against schema definitions before writing any data.
- **Dry-Run Validation Preview**: Before importing 500 questions, the user should see a preview summarizing valid items, detected schema errors, and duplicate key collisions.
- **Conflict Handling**: Clear options for handling existing entity codes/IDs: `SKIP_EXISTING`, `OVERWRITE` (with version audit log), or `CREATE_COPY` (auto-renaming codes).

## 4. Proposed Solution
1. Define standardized versioned JSON export schema (`version: "2.0"`) in `@repo/types` and `@repo/validation`.
2. Implement `ImportExportService` in `apps/api/src/services/import-export.service.ts`:
   - `exportEntities(type, ids, options)`: Queries database and serializes clean JSON omitting internal DB sequence IDs.
   - `validateImportPayload(payload)`: Executes Zod validation against all nested items, checks foreign key references, and returns a structured dry-run report.
   - `executeImport(payload, conflictStrategy, userId)`: Runs transactional SQL batch insert/update.
3. Build `ImportExportModal.tsx` usable in Question Bank (`QuestionBankPage.tsx`) and Academic Structure (`CoursesPage.tsx`).

## 5. User Experience
- **Exporting**: In the Question Bank or Courses workbench, the teacher clicks "Export as JSON". A modal allows selecting specific subjects/topics, toggling "Include Answer Keys", and downloads `examos-questions-2026-08-31.json`.
- **Importing**:
  1. Teacher clicks "Import JSON" and drops a `.json` file.
  2. The system executes an instant dry-run preview, displaying:
     - `✓ 48 Questions Valid`
     - `⚠️ 2 Questions with Invalid Options (Skipped)`
     - `Collision Strategy Selector: [Skip Existing | Overwrite | Duplicate as Copy]`
  3. Teacher reviews the summary and clicks "Confirm & Import".
  4. A progress bar completes, and a toast confirms: *"Successfully imported 48 questions."*

## 6. Admin Experience
- **Full Platform Backup / Restore**: Admins can export entire academic structures, rubric libraries, and platform configurations in a single bundle with cryptographic integrity checksums.

## 7. Technical Architecture
- **Package Integration**: `@repo/validation` provides Zod schemas for all imported entity types.
- **Transactional Safety**: Uses PostgreSQL transaction (`BEGIN ... COMMIT / ROLLBACK`). If any unrecoverable error occurs in `OVERWRITE` mode, the entire transaction is rolled back automatically.
- **Entity Versioning Integration (ADR-010)**: If `OVERWRITE` is chosen, the pre-existing question is saved to `question_versions` with summary: `"Updated via JSON Import batch"`.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed tracking model:
- `import_job_logs`: `id`, `actorUserId`, `entityType` (`QUESTIONS` | `COURSES` | `RUBRICS` | `VOCABULARY`), `totalItems`, `importedCount`, `skippedCount`, `errorCount`, `errorsLog` (JSON), `conflictStrategy`, `createdAt`.

## 9. API
- `POST /api/v1/import/validate` (Auth: Staff) — Dry-run validation of uploaded JSON payload.
- `POST /api/v1/import/execute` (Auth: Staff) — Executes import with selected conflict strategy.
- `POST /api/v1/export/questions` (Auth: Staff) — Exports selected question bank items.
- `POST /api/v1/export/courses` (Auth: Staff) — Exports course and syllabus trees.

## 10. Frontend
- **Components**:
  - `ImportExportModal.tsx`: Reusable file-drop and preview modal.
  - `ImportDryRunSummary.tsx`: Interactive preview table showing valid rows and highlighted schema errors.
  - `ExportSelectorDrawer.tsx`: Tree selector for picking specific subjects/topics to export.

## 11. AI / External Services
- None required.

## 12. Permissions / Entitlements
- **Exporting**: Gated on `questions.read` or `courses.read`.
- **Importing**: Gated on `questions.create` or `courses.create`.

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If in maintenance, import execution is temporarily queued or disabled to prevent write contention.

## 14. Import / Export
- Core system deliverable.

## 15. Edge Cases
- Circular prerequisite dependencies in imported syllabus: Validation pipeline detects circular graphs and reports error before DB commit.
- Huge JSON file (e.g. 50MB with 10,000 questions): Streaming JSON parser (`stream-json`) processes items in batches of 100 with transactional chunks to avoid heap exhaustion.

## 16. Test Cases
- **Unit (IMP-U001)**: Zod validator rejects question missing `correctOptionId` with precise path error.
- **Unit (IMP-U002)**: Dry-run preview accurately flags 3 duplicate question codes as collisions.
- **API (IMP-A001)**: `POST /api/v1/import/validate` returns HTTP 200 with `{ validCount: 10, errors: [] }`.
- **Integration (IMP-I001)**: Importing with `OVERWRITE` creates corresponding rollback entries in `question_versions`.
- **UI (IMP-UI001)**: Drag-and-drop file uploader validates file extension `.json` before upload.
- **Security (IMP-S001)**: Student account attempting to invoke import endpoints receives HTTP 403 `PERMISSION_DENIED`.

## 17. Acceptance Criteria
- [ ] Versioned JSON export format (`v2.0`) with schema header.
- [ ] Comprehensive Zod validation before any database insert.
- [ ] Dry-run preview returning valid/invalid counts and error highlights.
- [ ] 3 conflict resolution strategies (`SKIP_EXISTING`, `OVERWRITE`, `CREATE_COPY`).
- [ ] Transactional rollback on fatal batch errors.

## 18. Dependencies
- `@repo/validation`
- `@repo/types`
- `apps/api/src/services/question.routes.ts`

## 19. Future Improvements
- Excel (`.xlsx`) / CSV tabular import parser for rapid bulk question authoring.
- QTI (Question & Test Interoperability v3.0) and GIFT format standard compatibility adapters.
