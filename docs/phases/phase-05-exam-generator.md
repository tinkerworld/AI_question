# Phase 5 — Exam Generator
## Overview
This phase introduces the exam generation capabilities of the platform, enabling teachers to construct exams either fully manually or automatically using generation rules based on exam patterns and the question bank. It depends on the Question Bank and Exam Pattern phases.

## Prerequisites
- Phase 3 (Question Bank) completed
- Phase 4 (Exam Pattern & Rules) completed
- User roles (Teacher) and subject configurations available

## Features

### Feature 5.1 — Exam Generation Engine

#### Description
The core engine (`@repo/exam-engine`) that builds an exam paper by selecting questions from the Question Bank according to an Exam Pattern and defined Selection Rules.

#### Sub-Features
- Random selection with constraints
- Controlled/manual selection integration
- Topic balancing algorithm
- Difficulty balancing algorithm
- Marks balancing
- Question-type balancing
- Duplicate prevention (across sections, across recent exams)
- Previous-question rules (avoid/prefer previously used questions)
- Handling of insufficient questions (graceful fallback/alerts)

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/exams/generate` | Generates a new exam from a pattern | Teacher/Admin |

#### Database Changes
- `exams` table added
- `exam_sections` table added
- `exam_questions` (linking questions to sections/exams) added

#### Frontend Pages/Components
- Exam Generation Configurator (UI to pick pattern and trigger generation)
- Generation Status/Progress Modal

#### Acceptance Criteria
1. Engine correctly interprets pattern constraints (topic, difficulty, type).
2. Engine successfully selects questions that satisfy all constraints.
3. No duplicate questions are present within the same generated exam.
4. If there are insufficient questions, the engine provides a detailed error/alert instead of silently failing.
5. Previous question rules are respected.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P05.F01.U001 | Generate Basic Exam | Test basic random selection matching pattern | Simple pattern | Exam with correct Q count | High |
| P05.F01.U002 | Topic Balancing | Ensure questions are distributed by topic | Pattern with topics | Balanced topic distribution | High |
| P05.F01.U003 | Difficulty Balancing | Ensure questions match difficulty targets | Pattern with difficulty | Accurate difficulty mix | High |
| P05.F01.U004 | Duplicate Prevention | Ensure no duplicates across sections | Pattern with 2 sections | No overlapping Q IDs | High |
| P05.F01.U005 | Insufficient Questions | Handle case when bank lacks enough Qs | Strict pattern | Throws InsufficientQuestions error | High |
| P05.F01.U006 | Previous Rules Avoid | Avoid questions used in last 30 days | Rule: avoid recent | Exam without recent Qs | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P05.F01.I001 | API Generation Request | Test POST endpoint for generation | Auth token, seed DB | Call POST /api/v1/exams/generate | 201 Created with Exam ID | High |
| P05.F01.I002 | Engine DB Validation | Verify engine persists selected Qs | Seed DB with pattern | Generate & read DB | Qs correctly linked in `exam_questions` | High |
| P05.F01.I003 | Insufficient Qs API Error | Test API response on failure | Empty question bank | Call POST /api/v1/exams/generate | 422 Unprocessable Entity with details | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P05.F01.E001 | Full Generate Flow | Teacher creates exam from UI | 1. Go to Exam -> Generate. 2. Select pattern. 3. Click Generate. | Success message and redirection to Draft view | High |


### Feature 5.2 — Draft Exam Inspection

#### Description
Allows teachers to review and modify an auto-generated exam before finalizing it. The exam starts in a DRAFT state.

#### Sub-Features
- View generated questions, order, sections, marks, difficulty, and topic distribution.
- Regenerate individual sections.
- Swap individual questions manually.
- Manual reordering of questions.
- Marks recalculation after changes.

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/exams/:id/draft` | Retrieves the draft exam details | Teacher/Admin |
| PATCH | `/api/exams/:id/questions/:qId/swap` | Swaps a specific question | Teacher/Admin |
| PATCH | `/api/exams/:id/sections/:secId/regenerate` | Regenerates a section | Teacher/Admin |
| PATCH | `/api/exams/:id/reorder` | Updates question order | Teacher/Admin |

#### Database Changes
- Add `status` (DRAFT, PUBLISHED) to `exams` table.
- Update `order_index` in `exam_questions`.

#### Frontend Pages/Components
- Draft Exam Inspection Page
- Question Swap Modal
- Section Stats Dashboard

#### Acceptance Criteria
1. Draft exam displays accurate statistics (marks, topics).
2. Swapping a question updates the exam and recalculates stats.
3. Regenerating a section replaces all its questions according to rules.
4. Drag and drop reordering works and saves correctly.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P05.F02.U001 | Swap Logic | Test swapping Q with same type | Exam ID, Old Q ID, New Q ID | Q replaced, marks intact | High |
| P05.F02.U002 | Swap Constraint Validation | Prevent swapping with incompatible Q | Incompatible Q ID | Throws ValidationError | High |
| P05.F02.U003 | Marks Recalculation | Calculate total marks after swap | Draft exam data | Correct new total marks | High |
| P05.F02.U004 | Regenerate Section Logic | Regenerate just one section | Section ID | New Qs for section | High |
| P05.F02.U005 | Reorder Logic | Update indices for questions | Array of Q IDs | Indices updated sequentially | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P05.F02.I001 | API Swap Question | Test PATCH swap endpoint | Draft exam, 2 valid Qs | Call PATCH swap | 200 OK, DB updated | High |
| P05.F02.I002 | API Regenerate Section | Test PATCH regenerate | Draft exam | Call PATCH regenerate | 200 OK, new Qs returned | High |
| P05.F02.I003 | API Reorder | Test PATCH reorder | Draft exam | Call PATCH reorder | 200 OK, order updated | Medium |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P05.F02.E001 | Inspect and Swap | Teacher reviews and swaps a Q | 1. Open draft. 2. Click swap on Q1. 3. Select new Q. | Q is replaced, stats update | High |
| P05.F02.E002 | Section Regeneration | Teacher regenerates section | 1. Open draft. 2. Click Regenerate Section A. | Section A Qs change | Medium |


### Feature 5.3 — Exam Metadata

#### Description
Manages the properties and access rules of an exam, turning a draft paper into a scheduled, accessible test.

#### Sub-Features
- Name, instructions, duration
- Scheduled start/end time
- Access rules (enrollment, course, subject, target students)

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| PATCH | `/api/exams/:id` | Updates exam metadata | Teacher/Admin |

#### Database Changes
- Columns added to `exams`: `name`, `instructions`, `duration_minutes`, `start_time`, `end_time`, `target_course_id`, `target_subject_id`.

#### Frontend Pages/Components
- Exam Settings Form (Tabs: General, Scheduling, Access)

#### Acceptance Criteria
1. Teacher can set exam name, duration, and instructions.
2. Scheduled start/end times are validated (end > start).
3. Access rules can be defined based on course/subject.
4. Cannot publish exam without required metadata.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P05.F03.U001 | Validate Metadata Payload | Check required fields | Valid metadata | Validation passes | High |
| P05.F03.U002 | Validate Time Order | End time must be after start time | End < Start | Validation fails | High |
| P05.F03.U003 | Validate Duration | Duration must be > 0 | Duration = 0 | Validation fails | High |
| P05.F03.U004 | Default Metadata | Check defaults on creation | Empty config | Defaults applied | Low |
| P05.F03.U005 | Target Validation | Ensure target references exist | Invalid course ID | Validation fails | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P05.F03.I001 | Update Metadata API | Test PATCH endpoint | Draft exam | Call PATCH with data | 200 OK, DB updated | High |
| P05.F03.I002 | Invalid Metadata API | Test PATCH with invalid times | Draft exam | Call PATCH with End < Start | 400 Bad Request | High |
| P05.F03.I003 | Publish Check | Cannot publish if incomplete | Exam missing name | Call publish endpoint | 422 Unprocessable Entity | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P05.F03.E001 | Configure Exam | Teacher fills out settings | 1. Open settings. 2. Fill name/time. 3. Save. | Settings saved successfully | High |


### Feature 5.4 — Manual Exam Creation

#### Description
Allows teachers to bypass the generation engine and construct an exam manually from scratch by picking questions from the Question Bank.

#### Sub-Features
- Create exam without pattern
- Direct question selection from bank with filters
- Manual configuration of sections and marks

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/exams/manual` | Creates a blank exam | Teacher/Admin |
| POST | `/api/exams/:id/sections` | Adds a section manually | Teacher/Admin |
| POST | `/api/exams/:id/questions` | Adds questions directly | Teacher/Admin |

#### Database Changes
- None (reuses existing exam structures, with pattern_id nullable).

#### Frontend Pages/Components
- Manual Exam Builder UI
- Question Picker Modal (with advanced filtering)

#### Acceptance Criteria
1. Teacher can create an exam without selecting a pattern.
2. Teacher can create sections manually.
3. Teacher can search the question bank and add specific questions.
4. Total marks and counts are calculated correctly as questions are added.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P05.F04.U001 | Manual Exam Init | Initialize blank exam | Metadata | Blank exam object | High |
| P05.F04.U002 | Add Section | Add custom section | Section details | Section added | High |
| P05.F04.U003 | Add Question | Add Q to section | Q ID, Section ID | Q linked, marks update | High |
| P05.F04.U004 | Prevent Duplicate | Try adding same Q twice | Existing Q ID | Throws error | High |
| P05.F04.U005 | Calculate Totals | Verify totals match manual Qs | Set of Qs | Correct sum | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P05.F04.I001 | API Init Manual | Test blank exam creation | Auth token | Call POST /api/v1/exams/manual | 201 Created | High |
| P05.F04.I002 | API Add Qs | Test adding multiple Qs | Blank exam | Call POST with Q IDs | 200 OK, Qs added | High |
| P05.F04.I003 | API Duplicate Q | Test duplicate handling | Exam with Q1 | Call POST with Q1 again | 409 Conflict | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P05.F04.E001 | Full Manual Flow | Create exam from scratch | 1. Create blank. 2. Add section. 3. Pick 5 Qs. | Exam draft ready | High |

## Modularity Checklist
- [x] All business logic in service layer (not controllers)
- [x] No cross-module direct database access
- [x] Shared types used from @repo/types
- [x] Validation schemas in @repo/validation
- [x] Module can be extracted to microservice without code changes in other modules
- [x] All dependencies injected, not imported directly
- [x] Feature flags / config for optional features

## Upgrade Path
This phase lays the foundation for Phase 6 (Exam System) by producing structured, scheduled exams that students can take. The generation engine can be upgraded in future phases to incorporate AI-based generation or adaptive difficulty selection.

## Definition of Done
- Exam Generation Engine algorithm is fully tested.
- Draft inspection UI is fully functional.
- Metadata and scheduling logic is in place.
- Manual creation flow is supported.
- Unit, Integration, and E2E tests are passing.
- Code reviewed and merged into main branch.
</Phase 5 — Exam Generator>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 16: Exam Generator](../specs/16-exam-generator.md)
- [Spec 29: Entity Versioning & Rollback Engine](../specs/29-entity-versioning-rollback.md)

### Key Team Role Guidelines
- [Software Engineer](../roles/14-software-engineer.md) — Features 5.1, 5.2
- [Backend Engineer](../roles/16-backend-engineer.md) — Features 5.1, 5.3, 5.4
- [Software Test Engineer](../roles/34-software-test-engineer.md) — Generation algorithm testing

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [API Reference Catalog](../guides/02-api-reference.md)
- [Data Flow Diagrams](../guides/07-data-flow-diagrams.md)