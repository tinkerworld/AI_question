# Phase 7 — Published Exam Archive
## Overview
This phase introduces the exam publication workflow and archival system. It transitions exams from draft status to a permanently frozen, immutable published state. This ensures that historical exams, along with their precise questions, options, marks, and answer keys, are perfectly preserved for future reference, grading consistency, and analytical accuracy.

## Prerequisites
- Phase 6 (Exam Evaluation & Analytics) complete.
- Core Exam and Question Bank modules functional.
- Authentication and Role-Based Access Control (RBAC) implemented.

## Features

### Feature 7.1 — Exam Publication Workflow

#### Description
Implements a multi-stage workflow (DRAFT → PREVIEW → REVIEW → APPROVED → PUBLISHED) for exams, including approval workflows with reviewer assignment, status transition rules, and permission checks.

#### Sub-Features
- State machine for exam status transitions.
- Reviewer assignment and notification system.
- Permission enforcement (only specific roles can approve or publish).

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| PUT | `/api/exams/:id/status` | Update exam status | Admin, Teacher (based on state) |
| POST | `/api/exams/:id/reviewers` | Assign a reviewer | Admin, Teacher |
| GET | `/api/exams/:id/workflow-history` | View status changes | Admin, Teacher |

#### Database Changes (if applicable)
- `exams` table: add `status`, `published_at`, `approved_by` columns.
- `exam_workflow_logs`: new table tracking state changes, user ID, and timestamps.

#### Frontend Pages/Components (if applicable)
- Exam Status Badge component.
- Workflow Transition Modal (with reviewer selection).
- Exam Review Dashboard.

#### Acceptance Criteria
1. Exams start in DRAFT state.
2. Status can only transition according to defined rules.
3. Reviewers can be assigned and re-assigned.
4. Only authorized users can transition exams to APPROVED and PUBLISHED.
5. Workflow history is logged and visible.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F01.U001 | Valid Transition | Test state machine allows valid transition | DRAFT -> PREVIEW | Success | High |
| P07.F01.U002 | Invalid Transition | Test state machine blocks invalid transition | DRAFT -> PUBLISHED | Error: Invalid state transition | High |
| P07.F01.U003 | Permission Check | Test if unauthorized user can publish | Teacher publishing exam | Error: Unauthorized | High |
| P07.F01.U004 | Workflow Log Creation | Test logging of state change | Transition payload | Log entry created | Medium |
| P07.F01.U005 | Reviewer Assignment | Test adding reviewer to exam | Exam ID, Reviewer ID | Reviewer assigned | Medium |
| P07.F01.U006 | Multiple Reviewers | Test assigning multiple reviewers | Exam ID, [Rev IDs] | Reviewers assigned | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P07.F01.I001 | Full Workflow | Test complete transition flow | Create draft exam | Transition through all states to PUBLISHED | Exam reaches PUBLISHED state, logs created | High |
| P07.F01.I002 | Role Permissions | Test specific role permissions | Create exam, user roles | Try transition with wrong role, then correct role | Wrong role fails, correct role succeeds | High |
| P07.F01.I003 | Reviewer Notification | Test notification on assign | Draft exam | Assign reviewer | Notification triggered | Medium |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F01.E001 | Publish Exam UI | Complete publish flow via UI | Open exam -> Click Request Review -> Approve -> Publish | UI updates correctly, exam is published | High |
| P07.F01.E002 | Blocked Transition UI | Try invalid action in UI | View draft exam as unauthorized user | Publish button is hidden/disabled | Medium |

### Feature 7.2 — Published Exam Snapshot

#### Description
Freezes the complete exam state upon publication, ensuring question text, options, order, marks, sections, instructions, and rules are preserved exactly as they were at the time of publishing.

#### Sub-Features
- Deep copy of all exam entities into snapshot tables.
- Version preservation for questions and patterns.
- Decoupling of published exam from future question bank edits.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/exams/:id/snapshot` | Get the frozen exam structure | Admin, Teacher, Student |

#### Database Changes (if applicable)
- `published_exams`: new table.
- `exam_question_snapshots`: new table preserving exact question state.
- `exam_section_snapshots`: new table preserving section configurations.

#### Frontend Pages/Components (if applicable)
- Read-only Exam Viewer (uses snapshot data).

#### Acceptance Criteria
1. Publishing an exam creates a full snapshot of all related data.
2. Modifying a question in the Question Bank does NOT affect the published exam snapshot.
3. Snapshots contain exact historical question text, marks, and options.
4. Students taking the exam read from the snapshot.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F02.U001 | Snapshot Generation | Test deep copy logic | Exam entity | Complete snapshot object | High |
| P07.F02.U002 | Data Integrity | Test all fields are copied | Exam entity | Snapshot fields match source | High |
| P07.F02.U003 | Version Linking | Test question versions | Exam with specific versions | Snapshot links to correct versions | Medium |
| P07.F02.U004 | Missing References | Test snapshot generation with deleted question | Exam with invalid question ref | Handled gracefully/Error | Medium |
| P07.F02.U005 | Pattern Preservation | Test pattern snapshot | Exam with pattern | Pattern details preserved | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P07.F02.I001 | Bank Isolation | Test bank changes don't affect snapshot | Publish exam | Edit original question in bank | Snapshot remains unchanged | High |
| P07.F02.I002 | Complete Snapshot Persistence | Test DB insertion of snapshot | Publish exam | Query snapshot tables | All data present | High |
| P07.F02.I003 | Retrieve Snapshot | Test API retrieval | Published exam | Call GET snapshot API | Snapshot returned accurately | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F02.E001 | View Published Exam | View frozen exam as student | Login student -> Start published exam | Questions match snapshot, not current bank | High |

### Feature 7.3 — Answer Key Preservation

#### Description
Stores the exact answer keys for every question type within the published exam snapshot to ensure historical grading remains accurate.

#### Sub-Features
- Type-specific answer key structures (MCQ, Multi-select, T/F, Fill-blank, Numerical, Subjective).
- Storage of rubrics and key points for subjective questions.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/exams/:id/answer-key` | Get the answer key for the snapshot | Admin, Teacher |

#### Database Changes (if applicable)
- `exam_question_snapshots`: Add `answer_key` JSONB column containing type-specific schema.

#### Frontend Pages/Components (if applicable)
- Answer Key Viewer (renders based on question type).
- Subjective Rubric Display.

#### Acceptance Criteria
1. Answer keys are stored securely in the snapshot.
2. JSON structure validates against the specific question type.
3. Subjective questions store model answers, rubrics, key points, and max marks.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F03.U001 | MCQ Key Storage | Test MCQ answer storage | MCQ question data | Valid JSON answer key | High |
| P07.F03.U002 | Multi-select Key | Test Multi-select storage | Multi-select data | Valid JSON set | High |
| P07.F03.U003 | Numerical Tolerance | Test numerical key with tolerance | Numerical data | Value, tolerance, unit stored | High |
| P07.F03.U004 | Subjective Rubric | Test subjective rubric storage | Subjective data | Model answer and rubric stored | High |
| P07.F03.U005 | Validation Failure | Test invalid key schema | Malformed answer data | Schema validation error | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P07.F03.I001 | Retrieve Answer Key | Test fetching key via API | Published exam with various types | Fetch answer key | Correct key returned for all types | High |
| P07.F03.I002 | Key Isolation | Ensure bank changes don't alter key | Published exam | Change answer in bank | Snapshot key unchanged | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F03.E001 | View Answer Key UI | Verify UI renders keys correctly | Open answer key viewer | Rubrics, correct options displayed properly | Medium |

### Feature 7.4 — Exam Archive & Search

#### Description
Creates an authoritative, searchable repository of all published exams organized by year, course, and subject.

#### Sub-Features
- Advanced filtering and search capabilities (year, course, subject, pattern, etc.).
- High-performance retrieval for large datasets.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/exam-archive` | Search/list published exams | Admin, Teacher, Student |

#### Database Changes (if applicable)
- Indexes on `published_exams` for search fields (year, course_id, subject_id, etc.).

#### Frontend Pages/Components (if applicable)
- Exam Archive Browser.
- Advanced Search Filters Sidebar.

#### Acceptance Criteria
1. Archive is the authoritative source for published exams.
2. Search API supports all specified filters.
3. Queries execute efficiently on large datasets.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F04.U001 | Filter Construction | Test query builder logic | Search params | Correct database query | High |
| P07.F04.U002 | Pagination | Test pagination logic | Page=2, Limit=10 | Correct offset/limit applied | High |
| P07.F04.U003 | Empty Results | Test search with no matches | Obscure filter | Empty array returned | Low |
| P07.F04.U004 | Multiple Filters | Test combining filters | Year + Subject | Combined query logic | High |
| P07.F04.U005 | Sort Order | Test sorting logic | Sort=date_published_desc | Query sorted correctly | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P07.F04.I001 | Search Execution | Test DB search execution | Populate 100 exams | Search by course | Correct subset returned | High |
| P07.F04.I002 | Performance Test | Ensure quick response on large sets | 10k exams in DB | Execute complex search | Response < 200ms | Medium |
| P07.F04.I003 | Filter Combinations | Test multiple API filters | Data with varied attributes | Call API with 4 filters | Correct exact matches returned | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F04.E001 | Archive Browsing | Use UI to find specific exam | Open Archive -> Select Year -> Select Subject -> Type name | Target exam appears in results | High |

### Feature 7.5 — Historical Exam Integrity

#### Description
Ensures published exams are absolutely immutable. Introduces a formal correction workflow where fixes create a new version linked to the original, preserving the integrity of previous student attempts.

#### Sub-Features
- Strict immutability enforcement on snapshot tables.
- Correction workflow (Original → Correction V2).
- Audit trail for all corrections.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/exams/:id/corrections` | Initiate a correction on a published exam | Admin |
| GET | `/api/exams/:id/history` | View version history of an exam | Admin, Teacher |

#### Database Changes (if applicable)
- Add triggers/constraints to block direct updates on snapshot tables.
- `exam_versions`: new table tracking original and correction links.
- `exam_audit_logs`: table for correction audit trails.

#### Frontend Pages/Components (if applicable)
- Correction Initiation Modal.
- Exam Version History Timeline.

#### Acceptance Criteria
1. Direct updates to snapshot tables throw database/application errors.
2. Corrections generate a new version, leaving the original intact.
3. Existing student attempts remain linked to the specific version they took.
4. Comprehensive audit logs are generated for any correction.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F05.U001 | Immutability Check | Attempt to modify snapshot via ORM | Update payload | Error thrown | High |
| P07.F05.U002 | Correction Versioning | Test version increment | Exam ID | New version object created | High |
| P07.F05.U003 | Audit Log Generation | Test audit trail creation | Correction payload | Audit log entry generated | Medium |
| P07.F05.U004 | Attempt Linking | Test attempt maintains original version ID | Attempt data | Linked to V1, not V2 | High |
| P07.F05.U005 | Version History Tree | Test retrieving version chain | Exam ID | Array of versions in order | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P07.F05.I001 | DB Immutability | Test DB trigger blocks update | Published exam | Direct SQL UPDATE on snapshot | DB constraint error | High |
| P07.F05.I002 | Correction Workflow | Complete correction flow | Published exam | Call correction API, publish V2 | V1 remains, V2 published, audit logged | High |
| P07.F05.I003 | Attempt Preservation | Test attempts against V1 | Student attempt on V1 | Create V2 | Attempt still references V1 snapshot | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F05.E001 | View Correction History | Use UI to view history | Open exam with corrections -> View History | Timeline shows original and corrections | Low |

### Feature 7.6 — Exam File Storage

#### Description
Manages object/file storage for associated exam assets (PDFs, images, audio). Files are stored with a strict path convention, with metadata in the database.

#### Sub-Features
- File upload/download handling.
- Path generation: `/storage/exams/{year}/{subject}/{exam-name}/`.
- Large file support.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/exams/:id/files` | Upload file | Admin, Teacher |
| GET | `/api/exams/:id/files` | List/Download files | Admin, Teacher, Student |

#### Database Changes (if applicable)
- `exam_files`: new table mapping file metadata (name, type, size, storage_path, exam_id).

#### Frontend Pages/Components (if applicable)
- File Upload/Manager Component.
- Download Buttons for assets.

#### Acceptance Criteria
1. Files are stored at the correct generated path.
2. Metadata is accurately saved in the DB.
3. APIs correctly handle uploads and downloads, including large files.
4. Proper MIME type validation.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F06.U001 | Path Generation | Test storage path logic | Exam metadata | Correct path string | High |
| P07.F06.U002 | MIME Validation | Test file type validation | PDF file, EXE file | Accept PDF, Reject EXE | High |
| P07.F06.U003 | Metadata Extraction | Test extracting size/type | File object | Correct metadata object | Medium |
| P07.F06.U004 | File Deletion Logic | Test cleanup logic | File ID | Storage delete call triggered | Medium |
| P07.F06.U005 | Size Limits | Test file size restrictions | 500MB file | Error: Exceeds limit | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P07.F06.I001 | File Upload Flow | Test upload to mock storage | Valid file | Call POST endpoint | DB record created, storage API called | High |
| P07.F06.I002 | File Download Flow | Test retrieving file | Existing file | Call GET endpoint | File stream returned | High |
| P07.F06.I003 | Large File Handling | Test chunking/streaming | 50MB file | Upload via API | Success without memory crash | Medium |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F06.E001 | Upload and Download | Complete UI cycle | Open Exam -> Upload PDF -> Download PDF | File successfully roundtrips | High |

### Feature 7.7 — Archive Frontend

#### Description
The user interface for browsing, viewing, and downloading archived exams, including detailed snapshot views and correction histories.

#### Sub-Features
- Browser with advanced filters.
- Read-only detailed view of frozen exams.
- Answer key viewer and file downloads.
- Correction history visualization.

#### Acceptance Criteria
1. UI correctly implements all search filters.
2. Detail view accurately renders snapshot data.
3. Answer keys and files are easily accessible.
4. Responsive design.

#### Test Cases

##### Unit Tests (Frontend)
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F07.U001 | Filter Component | Test state updates | Select Year '2023' | State updates correctly | High |
| P07.F07.U002 | Exam Detail Render | Test read-only rendering | Snapshot data | Renders without edit buttons | High |
| P07.F07.U003 | Answer Key Render | Test answer key display | Key data | Correct formatting per type | Medium |
| P07.F07.U004 | File List Component | Test file download links | File metadata | Valid download URLs generated | Medium |
| P07.F07.U005 | History Timeline | Test timeline component | History array | Correct chronological rendering | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P07.F07.I001 | Search Integration | Connect UI search to API | Mock API | Trigger search | Results rendered accurately | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P07.F07.E001 | Browse and View | Full user journey | Open Archive -> Filter -> Click Exam -> View Key -> Download PDF | All interactions succeed | High |

## Modularity Checklist
- [ ] All business logic in service layer (not controllers)
- [ ] No cross-module direct database access
- [ ] Shared types used from @repo/types
- [ ] Validation schemas in @repo/validation
- [ ] Module can be extracted to microservice without code changes in other modules
- [ ] All dependencies injected, not imported directly
- [ ] Feature flags / config for optional features

## Upgrade Path
The immutable published exam structure provides the stable foundation required for Phase 8 (Student Analytics). Because published exams cannot change, historical analytics generated from student attempts will remain accurate forever.

## Definition of Done
- All features implemented and APIs functional.
- Comprehensive test coverage passing (unit, integration, E2E).
- Modularity checklist satisfied.
- Database schemas migrated and constrained (immutability triggers active).
- Code reviewed and approved.
</Phase 7 — Published Exam Archive>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 18: Published Exam Archive](../specs/18-published-exam-archive.md)

### Key Team Role Guidelines
- [Database Engineer](../roles/53-database-engineer.md) — Features 7.2, 7.3, 7.5
- [Backend Engineer](../roles/16-backend-engineer.md) — Features 7.1, 7.4, 7.6
- [Release Engineer](../roles/44-release-engineer.md) — Publication workflow

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [API Reference Catalog](../guides/02-api-reference.md)