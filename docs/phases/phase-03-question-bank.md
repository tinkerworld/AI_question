# Phase 3 — Question Bank
## Overview
This phase builds the central question bank module with pluggable types, metadata, versioning, and lifecycle management. It establishes a scalable foundation for storing, organizing, and retrieving educational content that can be dynamically assembled into exams and assessments.

## Prerequisites
- Phase 1 (Foundation & Core Infrastructure) completed.
- Phase 2 (Identity & Access Management) completed.
- Phase 4 (Syllabus & Course Management) completed or in progress, for linking questions to syllabus nodes (courses, subjects, topics).

## Features

### Feature 3.1 — Pluggable Question Type System (@repo/question-types)

#### Description
A modular architecture for question types that allows new types to be added without modifying the core system.

#### Sub-Features
- Type registry with unified interface: `render`, `validateAnswer`, `evaluate`, `serialize`, `deserialize`.
- Initial built-in types: MCQ, Multiple-Select, True/False, Fill-in-Blank, Short Answer, Numerical, Matching, Subjective/Long Answer.
- Future extensibility for: Listening, Speaking, Interview, Custom types.
- Schema definition and answer format for each type.
- Auto-evaluation rules defined per type.

#### API Endpoints (if applicable)
N/A - This is a backend module/library used internally.

#### Database Changes (if applicable)
None directly for the registry, but JSON/JSONB columns will store the specific properties and answers based on the schema definition in the question tables.

#### Frontend Pages/Components (if applicable)
- Dynamic form renderer that loads the specific component based on the selected question type.
- Read-only viewer for rendering questions in tests.

#### Acceptance Criteria
1. The system must support registering new question types at runtime or compile-time without core changes.
2. Each supported question type must successfully validate an answer, evaluate correctness, and serialize/deserialize to/from DB JSON payload.
3. If an unknown question type is encountered, the system gracefully handles it or throws a descriptive error.
4. All 8 initial types must be implemented and pass evaluations.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F01.U001 | Register Type | Register a new custom question type | Custom type definition | Successfully registered | High |
| P03.F01.U002 | Retrieve Type | Retrieve a registered type by name | 'MCQ' | Returns MCQ type interface | High |
| P03.F01.U003 | Evaluate MCQ Correct | Evaluate a correct MCQ answer | MCQ data, correct answer | Evaluates as correct (score 1) | High |
| P03.F01.U004 | Evaluate MCQ Incorrect | Evaluate an incorrect MCQ answer | MCQ data, wrong answer | Evaluates as incorrect (score 0) | High |
| P03.F01.U005 | Evaluate Fill-in-Blank | Evaluate Fill-in-Blank with acceptable variations | FIB data, valid answer | Evaluates as correct | High |
| P03.F01.U006 | Unknown Type Handling | Attempt to retrieve an unregistered type | 'UnknownType' | Throws explicit error | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P03.F01.I001 | Serialize/Deserialize Type | Ensure question data remains intact through DB serialization | Initialize dummy DB | 1. Serialize MCQ data. 2. Store in DB. 3. Retrieve and deserialize | Deserialized object matches original | High |

### Feature 3.2 — Question CRUD

#### Description
Core create, read, update, and delete operations for questions, including linking to syllabus nodes and storing metadata.

#### Sub-Features
- Create questions with specific type, content (rich text/markdown), options, correct answer, explanation.
- Linking to course, subject, topic, subtopic, concept.
- Metadata attachment: difficulty (EASY, MEDIUM, HARD), marks, tags, status.
- Rich text/markdown support and Image support in question content.
- Advanced querying with filters.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/questions` | Create a new question | Yes (Admin/Author) |
| GET | `/api/questions` | List questions with filters | Yes (Admin/Author) |
| GET | `/api/questions/:id` | Get details of a single question | Yes (Admin/Author) |
| PATCH | `/api/questions/:id` | Update question details | Yes (Admin/Author) |
| DELETE | `/api/questions/:id` | Delete/Soft-delete question | Yes (Admin) |

#### Database Changes (if applicable)
- `questions` table: `id`, `type`, `content`, `data` (JSONB for type-specific data), `difficulty`, `marks`, `status`, `course_id`, `subject_id`, `topic_id`, `subtopic_id`, `concept_id`, `created_by`, `created_at`, `updated_at`.

#### Frontend Pages/Components (if applicable)
- Question listing page with filter sidebar.
- Create/Edit Question form (dynamic based on type).

#### Acceptance Criteria
1. Questions can be created with all required metadata and type-specific data.
2. Rich text and images are supported in the question content.
3. Questions can be filtered by course, subject, topic, type, difficulty, tags, and status.
4. Validation rules specific to the question type must run before saving.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F02.U001 | Create Valid Question | Create an MCQ question with all fields | Valid MCQ payload | Question ID returned | High |
| P03.F02.U002 | Validation Error | Create an MCQ without options | MCQ payload without options | Validation Error | High |
| P03.F02.U003 | Delete Question | Soft-delete a question | Valid Question ID | Status changed to ARCHIVED/DELETED | High |
| P03.F02.U004 | Image Support | Save question with image markdown/URL | Payload with image | Successfully saved | Medium |
| P03.F02.U005 | Metadata Update | Update difficulty and marks | Patch payload | Updated successfully | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P03.F02.I001 | API Create & Fetch | Create a question and fetch it | DB running | 1. POST /api/v1/questions 2. GET /api/v1/questions/:id | Data matches POST payload | High |
| P03.F02.I002 | Filter by Subject | Filter list by subject ID | Create 5 Qs, 3 with Subj A | GET /api/v1/questions?subject=A | Returns exactly 3 questions | High |
| P03.F02.I003 | Filter by Multiple | Filter by Difficulty & Type | Create mixed Qs | GET /api/v1/questions?difficulty=HARD&type=MCQ | Returns only Hard MCQs | Medium |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F02.E001 | Create MCQ Flow | End-to-end creation of MCQ | 1. Navigate to Create Q 2. Select MCQ 3. Fill form 4. Save | Question appears in list | High |
| P03.F02.E002 | Filter Flow | UI filtering | 1. Go to Q list 2. Select Subject A 3. Select EASY | List updates correctly | High |

### Feature 3.3 — Question Versioning

#### Description
Maintains an immutable history of edits for questions to prevent changing questions that have already been used in published exams.

#### Sub-Features
- Every edit creates a new version commit (`question_versions` and `entity_versions` tables).
- Maintain version history: v1, v2, v3, etc. with parent version pointers (`parentVersionId`).
- One-click rollback: Reverting to a previous version creates a new commit `vY` with `actionType = 'REVERT'` ([Spec 29](../specs/29-entity-versioning-rollback.md)).
- Soft-delete recovery: Restore archived/soft-deleted questions without data loss (`POST /api/v1/versioning/question/:id/restore`).
- Published exams freeze the version used at the time of publication ([Spec 18](../specs/18-published-exam-archive.md)).

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/questions/:id/versions` | List all versions | Yes (Admin/Author) |
| GET | `/api/v1/questions/:id/versions/:version` | Get specific version details | Yes (Admin/Author) |
| GET | `/api/v1/versioning/question/:id/diff` | Side-by-side diff comparison | Yes (Admin/Author) |
| POST | `/api/v1/versioning/question/:id/revert` | Revert to previous version | Yes (Admin/Author) |
| POST | `/api/v1/versioning/question/:id/restore` | Restore soft-deleted question | Yes (Admin) |

#### Database Changes (if applicable)
- `question_versions` and `entity_versions` tables: `id`, `question_id`, `version_number`, `parent_version_id`, `content`, `data`, `marks`, `created_by`, `created_at`.
- `questions` table: `current_version` (integer).

#### Frontend Pages/Components (if applicable)
- Version history viewer modal/page.
- Side-by-side visual diff inspector (`EntityDiffViewer`).

#### Acceptance Criteria
1. Any update to a question's core content, type data, or marks creates a new version record.
2. The current version number increments appropriately.
3. Users can view any past version and inspect visual diffs.
4. One-click revert generates a new commit and logs a `question.reverted` audit event.
5. Soft-deleted questions can be restored to active status without losing history.
6. Exams explicitly link to a specific `version_number` of a question to ensure stability.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F03.U001 | Create First Version | Create new question | Valid payload | Question created, version=1 | High |
| P03.F03.U002 | Increment Version | Update existing question content | Patch payload | New version created, current=2 | High |
| P03.F03.U003 | Non-versioned Update | Update tags (metadata) | Tags payload | Version unchanged | Medium |
| P03.F03.U004 | View Version History | Fetch list of versions | Question ID | Returns array of versions | High |
| P03.F03.U005 | Fetch Specific Version | Fetch v1 of a v3 question | Question ID, v=1 | Returns v1 data | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P03.F03.I001 | Version Immutability | Ensure old versions remain unchanged | Create Q, update it twice | 1. Fetch v1. 2. Fetch v2. 3. Fetch current (v3) | All distinct and match historical state | High |
| P03.F03.I002 | Exam Isolation | Exams bind to version | Mock Exam, Q v1 | 1. Link exam to Q v1. 2. Update Q to v2. 3. Fetch Exam Qs | Exam still returns Q v1 data | High |

### Feature 3.4 — Question Tags

#### Description
Flexible tagging system for categorizing and grouping questions beyond the syllabus taxonomy.

#### Sub-Features
- Custom tag creation.
- Predefined suggestions (Important, Previous Exam, Frequently Asked, Conceptual, Numerical, High Difficulty, Revision, Board Exam, Entrance Exam).
- Bulk tag operations on questions.
- Filtering questions by tags.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/tags` | Create a new tag | Yes (Admin/Author) |
| GET | `/api/tags` | List tags | Yes |
| DELETE | `/api/tags/:id` | Delete a tag | Yes (Admin) |
| POST | `/api/questions/bulk/tags` | Add tags to multiple questions | Yes (Admin/Author) |
| DELETE | `/api/questions/bulk/tags` | Remove tags from multiple questions| Yes (Admin/Author) |

#### Database Changes (if applicable)
- `tags` table: `id`, `name`, `color` (optional).
- `question_tags` mapping table: `question_id`, `tag_id`.

#### Frontend Pages/Components (if applicable)
- Tag management UI (Settings).
- Multi-select Tag input in question forms.
- Bulk action toolbar in question listing.

#### Acceptance Criteria
1. Users can create, list, and delete custom tags.
2. Users can assign one or more tags to a question.
3. Users can apply or remove tags to multiple questions in bulk.
4. Questions can be filtered by tag(s) (AND/OR logic).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F04.U001 | Create Tag | Create new valid tag | {name: 'Important'} | Tag created | High |
| P03.F04.U002 | Assign Tag | Assign tag to question | Q ID, Tag ID | Relation created | High |
| P03.F04.U003 | Remove Tag | Remove tag from question | Q ID, Tag ID | Relation deleted | High |
| P03.F04.U004 | Delete Tag Cascade | Delete tag removes relations | Tag ID | Tag deleted, relations deleted | Medium |
| P03.F04.U005 | Duplicate Tag | Attempt to create existing tag | {name: 'Important'} | Validation error | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P03.F04.I001 | Bulk Tag Assignment | Assign tag to 10 questions | 10 Qs, 1 Tag | POST /api/v1/questions/bulk/tags | All 10 Qs linked to Tag | High |
| P03.F04.I002 | Filter by Tag | Filter questions by tag | Qs with diverse tags | GET /api/v1/questions?tags=ID1,ID2 | Returns intersecting Qs | High |

### Feature 3.5 — Question Lifecycle

#### Description
Workflow management for questions, ensuring quality control before publication.

#### Sub-Features
- Statuses: DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED.
- Status transition rules and RBAC (e.g., Authors can send to REVIEW, Reviewers can APPROVE).
- Constraint: Only PUBLISHED questions can be used in exams.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| PATCH | `/api/questions/:id/status` | Change question status | Yes |

#### Database Changes (if applicable)
- Handled via the `status` enum column in the `questions` table.
- Optional: `question_status_history` table for auditing transitions.

#### Frontend Pages/Components (if applicable)
- Status badges in listing.
- Status transition action buttons (Submit for Review, Approve, Publish).

#### Acceptance Criteria
1. Questions progress through statuses sequentially or according to defined workflow rules.
2. Invalid transitions (e.g., DRAFT → PUBLISHED directly) are rejected.
3. Permissions are enforced (e.g., an author cannot approve their own question if RBAC forbids it).
4. Exams API rejects inclusion of non-PUBLISHED questions.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F05.U001 | Valid Transition | DRAFT to REVIEW | Valid Q ID | Status updated | High |
| P03.F05.U002 | Invalid Transition | DRAFT to PUBLISHED | Valid Q ID | State machine error | High |
| P03.F05.U003 | Permission Check | Author trying to APPROVE | Auth token of author | 403 Forbidden | High |
| P03.F05.U004 | Exam Constraint | Add DRAFT to exam | DRAFT Q ID, Exam ID | Validation error | High |
| P03.F05.U005 | Archive Status | PUBLISHED to ARCHIVED | Valid Q ID | Status updated | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P03.F05.I001 | Full Lifecycle | Move Q through all stages | Author & Admin users | 1. Create 2. Review 3. Approve 4. Publish | Reaches PUBLISHED successfully | High |

### Feature 3.6 — Previous Exam Tracking

#### Description
Tracks the history of a question's usage in past exams.

#### Sub-Features
- Link questions to published exams they appeared in.
- Auto-populated when an exam utilizing the question is published.
- Support for manual entries (e.g., marking a question as appearing in "JEE Main 2022").

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/questions/:id/exam-history` | Get exam history for a question | Yes |
| POST | `/api/questions/:id/exam-history` | Manually add a past exam entry | Yes (Admin/Author) |

#### Database Changes (if applicable)
- `question_exam_history` table: `id`, `question_id`, `exam_id` (nullable), `exam_year`, `exam_name`, `created_at`.

#### Frontend Pages/Components (if applicable)
- "Appeared In" section in the question details view.
- Form to add manual exam history.

#### Acceptance Criteria
1. Publishing an exam automatically adds an entry for all included questions.
2. Users can manually add historical references (e.g., "Board Exam 2021").
3. Duplicate manual entries are prevented.
4. The history can be retrieved via API.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F06.U001 | Manual Add | Add manual history entry | Q ID, Year, Name | Entry created | High |
| P03.F06.U002 | Duplicate Add | Add same manual entry twice | Same Q ID, Year, Name | Validation error | Low |
| P03.F06.U003 | Retrieve History | Get history | Q ID | Returns array of entries | High |
| P03.F06.U004 | Auto-populate Event | Publish Exam Event | Exam ID, Q IDs | Entries created | High |
| P03.F06.U005 | Prevent Duplicates | Same exam published twice | Exam ID, Q IDs | Ignored/Handled gracefully | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P03.F06.I001 | Exam Publish Integration | Verify auto-linking on publish | Exam with 3 Qs | Publish Exam | 3 entries added to question_exam_history | High |

### Feature 3.7 — Question Bank Frontend

#### Description
The user interface for managing the question bank.

#### Sub-Features
- Question listing with advanced filters (drawer/sidebar).
- Question creation form (dynamic per question type).
- Question preview (how student sees it).
- Version history viewer.
- Tag management UI.
- Bulk operations (tag, status change).

#### API Endpoints (if applicable)
N/A - Frontend consumption.

#### Database Changes (if applicable)
N/A

#### Frontend Pages/Components (if applicable)
- `/admin/questions` (Listing)
- `/admin/questions/new` (Creation)
- `/admin/questions/:id/edit` (Editing)
- `/admin/questions/:id/preview` (Preview Modal)
- `/admin/tags` (Tags Management)

#### Acceptance Criteria
1. The UI must support all backend CRUD and filtering operations.
2. The dynamic form must render correct inputs based on the selected question type.
3. Preview must accurately reflect the student-facing render.
4. Bulk operations must update UI state optimistically or re-fetch gracefully.

#### Test Cases

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F07.E001 | Create all Types | Create 1 Q of each type | 1. Open New Q 2. Select type 3. Fill 4. Save (loop) | All types created successfully | High |
| P03.F07.E002 | Filter & Bulk Update | Apply filter, select all, change status | 1. Filter 'Draft' 2. Select All 3. 'Submit Review' | Statuses updated, UI reflects changes | High |
| P03.F07.E003 | Version View | View history modal | 1. Open Q 2. Click History | Versions listed, able to view past | Medium |

### Feature 3.8 — Question Bank Analytics

#### Description
Insights and metrics regarding the question bank inventory.

#### Sub-Features
- Count of questions per subject, topic, difficulty.
- Coverage analysis (identifying topics without enough questions).
- Usage statistics (most used questions).

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/analytics/questions/distribution`| Breakdown by subject/topic/difficulty | Yes (Admin) |
| GET | `/api/analytics/questions/coverage` | Topics lacking questions | Yes (Admin) |

#### Database Changes (if applicable)
None. Complex queries or materialized views against existing tables.

#### Frontend Pages/Components (if applicable)
- Dashboard widgets on Question Bank landing page.

#### Acceptance Criteria
1. Returns accurate distribution counts.
2. Identifies topics with zero or low question counts based on a threshold.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P03.F08.U001 | Distribution Calc | Calculate counts | Mock DB state | Accurate breakdown object | High |
| P03.F08.U002 | Coverage Gaps | Find topics < 5 Qs | Mock DB state | List of gap topics | High |
| P03.F08.U003 | Usage Stats | Find most used Qs | Mock DB state | Ordered list of Qs | Medium |
| P03.F08.U004 | Empty State | Analytics with empty DB | Empty DB | Zeros/Empty arrays | Low |
| P03.F08.U005 | Filtered Analytics | Analytics for specific Subject | Subject ID | Data scoped to subject | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P03.F08.I001 | Accurate Counts | End-to-end analytics check | Seed DB with known data | GET /api/v1/analytics/questions/distribution | Payload exactly matches seeded distribution | High |

## Modularity Checklist
- [ ] All business logic in service layer (not controllers)
- [ ] No cross-module direct database access (Exams should use Questions service to fetch Qs)
- [ ] Shared types used from `@repo/types`
- [ ] Validation schemas in `@repo/validation`
- [ ] Module can be extracted to microservice without code changes in other modules
- [ ] All dependencies injected, not imported directly
- [ ] Feature flags / config for optional features (e.g., complex custom types)

## Upgrade Path
- Prepares for **Phase 5 (Exam Engine)** by providing the core content structures and evaluation interfaces.
- The Pluggable Type System ensures that as new modalities (e.g., oral exams, coding tests) are required, they can be added as self-contained packages without restructuring the DB or core API.
- Prepares for robust search capabilities (Elasticsearch/Typesense) in future phases.

## Definition of Done
- All backend CRUD, lifecycle, and versioning APIs are fully implemented, tested, and documented.
- The Pluggable Question Type System architecture is strictly enforced.
- All 8 initial question types are fully functional (render, validate, evaluate).
- Frontend UI allows complete management of the question bank.
- Analytics endpoints deliver accurate insights.
- At least 85% test coverage achieved across the module.
- Modularity checklist is completely satisfied.
</Phase 3 — Question Bank>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 12: Question Bank](../specs/12-question-bank.md)
- [Spec 13: Question Types](../specs/13-question-types.md)
- [Spec 14: Question Versioning & Tags](../specs/14-question-versioning-tags.md)
- [Spec 29: Entity Versioning & Rollback Engine](../specs/29-entity-versioning-rollback.md)

### Key Team Role Guidelines
- [Software Engineer](../roles/14-software-engineer.md) — Features 3.1, 3.2, 3.3
- [Backend Engineer](../roles/16-backend-engineer.md) — Features 3.2, 3.4, 3.5, 3.6, 3.8
- [Frontend Engineer](../roles/15-frontend-engineer.md) — Feature 3.7
- [QA Engineer](../roles/33-qa-engineer.md) — Question bank test cases

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [API Reference Catalog](../guides/02-api-reference.md)
- [Coding Standards](../guides/03-coding-standards.md)