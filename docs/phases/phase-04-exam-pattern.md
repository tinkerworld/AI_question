# Phase 4 — Exam Pattern
## Overview
This phase implements the Exam Pattern system (blueprint or recipe), defining how examinations are structured before any actual questions are assigned. Exam patterns allow administrators to define sections, question counts, marks, difficulty distributions, and topic distributions. This system separates the structural definition of an exam from its generated content, allowing reusable exam recipes and scalable content generation.

## Prerequisites
- Phase 1 (Core & User Management) complete
- Phase 2 (Institution & Hierarchy) complete
- Phase 3 (Question Bank System) complete (Required for validation engine)

## Features

### Feature 4.1 — Exam Pattern CRUD

#### Description
Provides core management for Exam Patterns, including creating, reading, updating, and deleting patterns with basic metadata.

#### Sub-Features
- Pattern creation: name, course, level/class, subject(s), duration, description
- Support for single-subject and multi-subject patterns
- State management with pattern statuses: DRAFT, PUBLISHED, ARCHIVED

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/exam-patterns` | Create a new exam pattern | Admin/Teacher |
| GET | `/api/exam-patterns` | List and search exam patterns | Admin/Teacher |
| GET | `/api/exam-patterns/:id` | Get exam pattern details | Admin/Teacher |
| PATCH | `/api/exam-patterns/:id` | Update an exam pattern | Admin/Teacher (if DRAFT) |
| DELETE | `/api/exam-patterns/:id` | Delete or archive exam pattern | Admin/Teacher (if DRAFT) |

#### Database Changes
- Create `exam_patterns` table (id, name, course_id, level_id, duration_minutes, description, status, type (SINGLE/MULTI), created_at, updated_at, tenant_id)
- Create `exam_pattern_subjects` junction table for multi-subject mapping

#### Frontend Pages/Components
- Exam Pattern Listing Page (Data table with filters)
- Exam Pattern Creation/Edit Form (Basic Details Step)

#### Acceptance Criteria
1. Users can create a pattern with required fields: name, course, class/level, duration.
2. Users can associate one or multiple subjects to the pattern.
3. Newly created patterns must default to DRAFT status.
4. Users can transition DRAFT patterns to PUBLISHED.
5. PUBLISHED patterns cannot be deleted, only ARCHIVED.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F01.U001 | Create single subject pattern | Test creating a single subject pattern | Valid payload | Created pattern with SINGLE type | High |
| P04.F01.U002 | Create multi subject pattern | Test creating a multi subject pattern | Payload with multiple subject IDs | Created pattern with MULTI type & subject links | High |
| P04.F01.U003 | Missing required fields | Test creating pattern without name | Missing name payload | 400 Bad Request, Validation Error | High |
| P04.F01.U004 | Invalid duration | Test duration < 1 | Payload with duration=0 | 400 Bad Request, Validation Error | High |
| P04.F01.U005 | Publish draft pattern | Test transition DRAFT -> PUBLISHED | Pattern ID | Status updated to PUBLISHED | High |
| P04.F01.U006 | Delete draft pattern | Test deleting DRAFT pattern | DRAFT pattern ID | Pattern deleted (204) | Medium |
| P04.F01.U007 | Delete published pattern | Test deleting PUBLISHED pattern | PUBLISHED pattern ID | 409 Conflict, cannot delete published | High |
| P04.F01.U008 | Archive published pattern | Test archiving PUBLISHED pattern | PUBLISHED pattern ID | Status updated to ARCHIVED | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F01.I001 | Complete CRUD cycle | Test creating, reading, updating pattern | Auth user | POST, GET, PATCH, GET | Data correctly saved and retrieved | High |
| P04.F01.I002 | Multi-subject retrieval | Verify linked subjects are fetched | Create multi-subject pattern | GET pattern by ID | Response includes array of subjects | High |
| P04.F01.I003 | Status transitions | Test valid and invalid status updates | Create DRAFT pattern | PATCH to PUBLISHED, then ARCHIVED, then DRAFT | First two succeed, ARCHIVED->DRAFT fails | High |
| P04.F01.I004 | Tenant isolation | Verify tenant cannot see others' patterns | Create patterns for Tenant A and B | Tenant A fetches all patterns | Only Tenant A's patterns returned | Critical |

### Feature 4.2 — Exam Pattern Sections

#### Description
Allows dividing an Exam Pattern into multiple structured sections (e.g., Section A, Section B) with specific question counts and mark allocations.

#### Sub-Features
- Define multiple sections per pattern
- Each section defines: name, number of questions, marks per question
- System auto-calculates section total marks and pattern total marks
- Section ordering/sequencing

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/exam-patterns/:id/sections` | Add section to pattern | Admin/Teacher |
| GET | `/api/exam-patterns/:id/sections` | Get pattern sections | Admin/Teacher |
| PATCH | `/api/exam-patterns/:id/sections/:sectionId` | Update a section | Admin/Teacher |
| DELETE | `/api/exam-patterns/:id/sections/:sectionId` | Delete a section | Admin/Teacher |
| PATCH | `/api/exam-patterns/:id/sections/reorder` | Reorder sections | Admin/Teacher |

#### Database Changes
- Create `exam_pattern_sections` table (id, pattern_id, name, sequence_order, num_questions, marks_per_question, total_marks, created_at)
- Add `total_marks` to `exam_patterns` table

#### Frontend Pages/Components
- Section Manager UI (Drag and drop reordering)
- Add/Edit Section Modal
- Real-time total marks display in Pattern Builder

#### Acceptance Criteria
1. Users can add multiple sections to a DRAFT pattern.
2. System must automatically calculate `total_marks` for a section (`num_questions` * `marks_per_question`).
3. System must automatically update the overall exam pattern total marks when sections are added/modified/deleted.
4. Users can reorder sections via drag-and-drop, updating their sequence order.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F02.U001 | Add valid section | Test adding section with valid data | Section payload | Section created, total marks calculated | High |
| P04.F02.U002 | Negative questions | Test adding section with negative num_questions | num_questions: -5 | 400 Bad Request | High |
| P04.F02.U003 | Auto-calc section marks | Verify section total marks logic | 10 questions, 2 marks/q | Section total_marks = 20 | High |
| P04.F02.U004 | Auto-calc pattern total | Verify pattern total updates on section add | Add section (20 marks) to pattern | Pattern total_marks = 20 | High |
| P04.F02.U005 | Reorder sections | Test updating sequence order | List of section IDs | Sequence order updated correctly | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F02.I001 | Multiple section management | Create, update, delete sections | Create pattern | Add S1, Add S2, Update S1, Delete S2 | Final pattern has S1 updated, S2 removed, totals correct | High |
| P04.F02.I002 | Marks recalculation cascade | Verify pattern total changes with section updates | Pattern with 2 sections (20 + 30 marks) | Update S1 from 20 to 40 marks | Pattern total becomes 70 | High |
| P04.F02.I003 | Reorder endpoint validation | Ensure reordering handles invalid IDs | Pattern with S1, S2 | Send reorder payload with unknown ID | 400 Bad Request, no changes | Medium |

### Feature 4.3 — Section Question Rules

#### Description
Defines the rules for how questions should be selected for a given section from the Question Bank.

#### Sub-Features
- Filter by question type (MCQ, True/False, Fill in Blanks, ALL)
- Filter by question category (specific, multiple, all)
- Filter by marks (specific marks to match section's marks per question)
- Question source filtering (full bank, specific topics, tags)
- Selection mode: Random or Balanced

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| PUT | `/api/exam-patterns/:id/sections/:sectionId/rules` | Set/update section rules | Admin/Teacher |
| GET | `/api/exam-patterns/:id/sections/:sectionId/rules` | Get section rules | Admin/Teacher |

#### Database Changes
- Create `exam_pattern_section_rules` table (id, section_id, allowed_question_types (JSON), allowed_categories (JSON), selection_mode, source_filters (JSON), tags (JSON))

#### Frontend Pages/Components
- Section Rules Configurator Form

#### Acceptance Criteria
1. Users can specify which question types are allowed in a section.
2. Users can specify if questions should be selected randomly or balanced across types/topics.
3. System must save and retrieve complex JSON rule definitions for sections.
4. Validation must ensure rules do not fundamentally contradict section settings (e.g., rule allows 5-mark questions but section specifies 2 marks per question).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F03.U001 | Save valid rules | Save standard rules for section | Valid rules payload | Rules saved successfully | High |
| P04.F03.U002 | Invalid question type | Provide unknown question type | types: ['UNKNOWN'] | 400 Bad Request | Medium |
| P04.F03.U003 | Rule conflict detection | Rule marks differ from section marks | Rule marks: 5, Section marks: 2 | 400 Bad Request | High |
| P04.F03.U004 | Empty filters | Save rules with no filters (select all) | Empty filter JSON | Default open rules saved | Low |
| P04.F03.U005 | Retrieve rules | Get saved rules | Section ID | Rules JSON returned | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F03.I001 | Rules persistence | End-to-end rule saving and loading | Create pattern & section | PUT rules, GET rules | Retrieved rules match saved rules exactly | High |
| P04.F03.I002 | Section deletion cascade | Ensure rules are deleted with section | Pattern with section + rules | DELETE section | Rules removed from DB | Medium |
| P04.F03.I003 | Multiple sections rules | Different rules for S1 and S2 | Pattern with S1, S2 | PUT rules for S1, PUT rules for S2 | Each section maintains independent rules | High |

### Feature 4.4 — Topic Distribution

#### Description
Allows defining how many questions (or what percentage) should come from specific topics/chapters within a section or the entire pattern.

#### Sub-Features
- Per-section topic distribution
- Count-based or percentage-based distribution
- Validation to ensure sums match the section's total question count or 100%

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| PUT | `/api/exam-patterns/:id/sections/:sectionId/topics` | Set topic distribution | Admin/Teacher |
| GET | `/api/exam-patterns/:id/sections/:sectionId/topics` | Get topic distribution | Admin/Teacher |

#### Database Changes
- Create `exam_pattern_section_topics` table (id, section_id, topic_id, distribution_type (COUNT/PERCENT), value)

#### Frontend Pages/Components
- Topic Distribution Configurator (Sliders or number inputs)
- Real-time sum validation UI

#### Acceptance Criteria
1. Users can allocate specific question counts or percentages to different topics for a section.
2. If COUNT-based, the sum of all topic values must exactly equal the `num_questions` of the section.
3. If PERCENT-based, the sum of all topic values must exactly equal 100.
4. Validation errors must clearly state the discrepancy.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F04.U001 | Valid count distribution | Sum matches section total | section total: 10, topics: 5, 5 | Distribution saved | High |
| P04.F04.U002 | Invalid count distribution | Sum exceeds section total | section total: 10, topics: 6, 5 | 400 Bad Request, Validation Error | High |
| P04.F04.U003 | Valid percent distribution | Sum equals 100 | topics: 50%, 50% | Distribution saved | High |
| P04.F04.U004 | Invalid percent distribution | Sum less than 100 | topics: 40%, 40% | 400 Bad Request, Validation Error | High |
| P04.F04.U005 | Mixed types error | Mix count and percent in payload | payload with both types | 400 Bad Request | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F04.I001 | Save and validate topics | End-to-end topic allocation | Pattern with 20q section | PUT topic distro (10, 10) | Saved successfully | High |
| P04.F04.I002 | Cascade on section update | What happens to count distribution if section q count changes | Section with 10q, dist: 5,5 | Update section to 12q | Dist is invalidated or cleared, warning issued | Medium |

### Feature 4.5 — Difficulty Distribution

#### Description
Controls the ratio of Easy, Medium, and Hard questions in the exam pattern sections.

#### Sub-Features
- Define difficulty distribution globally or per-section
- Count-based or percentage-based mapping
- Automatic/Mixed option (let system decide)

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| PUT | `/api/exam-patterns/:id/sections/:sectionId/difficulty` | Set difficulty distro | Admin/Teacher |

#### Database Changes
- Create `exam_pattern_section_difficulty` table (id, section_id, difficulty_level, distribution_type, value)

#### Frontend Pages/Components
- Difficulty Sliders UI (Easy, Medium, Hard sum to 100% or total count)

#### Acceptance Criteria
1. Users can assign distribution (count or %) to predefined difficulty levels (EASY, MEDIUM, HARD).
2. Distributions must sum correctly (Total count or 100%).
3. System must support an "Any" or "Mixed" setting where specific distribution is not enforced.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F05.U001 | Valid difficulty count | Sum matches total | Easy 2, Med 3 (Total 5) | Saved successfully | High |
| P04.F05.U002 | Invalid difficulty percent | Sum != 100 | Easy 30, Med 30 (Total 60) | 400 Bad Request | High |
| P04.F05.U003 | Mixed automatic | Save with mixed setting | Automatic flag true | Saved without specific values | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F05.I001 | Difficulty settings persistence | Full save and load cycle | Pattern & section | PUT difficulty rules, GET | Data matches exactly | High |

### Feature 4.6 — Negative Marking Configuration

#### Description
Configures how marks are awarded or deducted per section, allowing complex grading logic like fractional negative marking.

#### Sub-Features
- Per-section configuration
- Specify marks for correct answer (often overrides global section marks or maps to them)
- Specify marks deducted for wrong answer
- Specify marks for unattempted questions (usually 0)

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| PUT | `/api/exam-patterns/:id/sections/:sectionId/marking` | Set marking scheme | Admin/Teacher |

#### Database Changes
- Add columns to `exam_pattern_sections`: `marks_correct`, `marks_wrong` (can be negative), `marks_unattempted`

#### Frontend Pages/Components
- Marking Scheme inputs (Correct: +4, Wrong: -1, Unattempted: 0)

#### Acceptance Criteria
1. Users can configure correct, wrong, and unattempted marks per section.
2. `marks_correct` must match the section's `marks_per_question` setting.
3. System must allow decimal values for `marks_wrong` (e.g., -0.25, -0.33).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F06.U001 | Valid marking scheme | Correct: 4, Wrong: -1 | Valid payload | Saved successfully | High |
| P04.F06.U002 | Fractional negative marking | Correct: 1, Wrong: -0.25 | Valid payload | Saved successfully | High |
| P04.F06.U003 | Inconsistent correct marks | Correct marks differ from section settings | Correct: 5, Section: 4 | 400 Bad Request | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F06.I001 | Per-section independence | Different schemes for S1 and S2 | S1 and S2 created | PUT S1 (+1/-0), PUT S2 (+2/-1) | Both maintain separate schemes | High |

### Feature 4.7 — Multi-Subject Allocation

#### Description
For examinations covering multiple subjects (e.g., JEE/NEET), maps subjects to specific sections or sets subject-level mark caps.

#### Sub-Features
- Define subject-wise mark allocations for MULTI type patterns
- Map sections to specific subjects (e.g., Section A is Physics)
- Validate subject totals against overall pattern total

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| PUT | `/api/exam-patterns/:id/subjects-allocation` | Define multi-subject rules | Admin/Teacher |

#### Database Changes
- Add `subject_id` nullable column to `exam_pattern_sections`
- `exam_pattern_subjects` gains `target_marks` column

#### Frontend Pages/Components
- Subject allocation wizard for MULTI patterns
- Section-subject linker

#### Acceptance Criteria
1. For MULTI patterns, sections can be assigned to a specific subject.
2. The total marks of all sections assigned to a subject must equal that subject's target marks (if defined).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F07.U001 | Assign section to subject | Map S1 to Physics | Valid payload | Assigned successfully | High |
| P04.F07.U002 | Invalid subject | Map S1 to subject not in pattern | Subject ID not linked | 400 Bad Request | High |
| P04.F07.U003 | Subject target validation | Check if S1+S2 match target | S1(50)+S2(50) = Target(100) | Validated successfully | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F07.I001 | Full multi-subject setup | S1(Phy), S2(Chem) | Pattern with Phy, Chem | Map S1->Phy, Map S2->Chem | Complete mapping saved, pattern valid | High |

### Feature 4.8 — Exam Pattern Validation Engine

#### Description
Simulates the pattern against the actual Question Bank to ensure enough questions exist to fulfill the pattern's rules, preventing impossible exam generations later.

#### Sub-Features
- Queries question bank using pattern parameters (topics, difficulty, types, marks)
- Counts available vs required questions
- Returns detailed feasibility report (e.g., "Physics > Mechanics > Hard requires 5 questions, but only 3 exist")

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/exam-patterns/:id/validate` | Run validation engine | Admin/Teacher |

#### Database Changes
- None directly (uses Question Bank tables)

#### Frontend Pages/Components
- Validation Results Modal (Green/Red indicators)
- "Run Validation" button in Pattern Builder

#### Acceptance Criteria
1. Engine must aggregate all rules for a section.
2. Engine must execute count queries against question bank mimicking the rules.
3. Must return a boolean `isValid` and a list of `errors`/`warnings`.
4. If available < required, `isValid` must be false.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F08.U001 | Sufficient questions | Bank has enough questions | Mock DB: 100 available, 10 req | isValid: true, errors: [] | High |
| P04.F08.U002 | Insufficient questions | Bank lacks questions | Mock DB: 5 available, 10 req | isValid: false, errors: ['Need 5 more'] | High |
| P04.F08.U003 | Exact match | Bank has exactly required | Mock DB: 10 available, 10 req | isValid: true | Medium |
| P04.F08.U004 | Topic constraint failure | Bank lacks questions for specific topic | Mock topic: 0 avail, 5 req | isValid: false, specific topic error | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F08.I001 | Complex validation run | Full pattern with difficulty and topic rules | Pattern, seeded QB | POST /validate | Correct validation report based on seed data | Critical |

### Feature 4.9 — Exam Pattern Versioning

#### Description
When a pattern is modified after being used, a new version is created to ensure historical exams referencing the pattern do not change their structural definitions.

#### Sub-Features
- Create new version on publish/edit of active pattern
- Version history tracking
- Published exams link to specific version ID

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/exam-patterns/:id/versions` | List versions | Admin/Teacher |

#### Database Changes
- Modify `exam_patterns` to include `parent_id` and `version`
- (Alternative: Event sourcing or historical snapshot tables)

#### Frontend Pages/Components
- Version History Dropdown
- Read-only view of historical versions

#### Acceptance Criteria
1. Editing a pattern that has already been used to generate an exam creates a new DRAFT version.
2. Old version is locked and retained for historical exams.
3. Users can view the history of a pattern's versions.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F09.U001 | Edit unused pattern | Edit pattern not linked to exam | Edit payload | Updates in place, version same | High |
| P04.F09.U002 | Edit used pattern | Edit pattern linked to exam | Edit payload | Creates new record, version increments | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P04.F09.I001 | Version isolation | Ensure old exams point to old pattern | Pattern v1 used in Exam A | Edit Pattern (creates v2), check Exam A | Exam A still points to v1 definition | High |

### Feature 4.10 — Exam Pattern Frontend

#### Description
The comprehensive UI for building and managing exam patterns.

#### Sub-Features
- Visual section configuration (drag-and-drop sections)
- Real-time marks calculation
- Validation warnings/errors display
- Pattern preview

#### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P04.F10.E001 | Full Pattern Creation Cycle | Create pattern, add sections, configure rules, validate | 1. Create Pattern 2. Add S1, S2 3. Set rules 4. Run validation 5. Publish | Pattern is published successfully and visible in list | Critical |
| P04.F10.E002 | Multi-Subject Builder | Build multi-subject pattern | 1. Create MULTI pattern 2. Add sections and map to subjects 3. Set marks | UI calculates subject and total marks correctly | High |
| P04.F10.E003 | Validation Error Flow | Encounter and fix validation error | 1. Create pattern with 1000 required Qs 2. Validate 3. See error 4. Fix count to 10 5. Validate | UI shows red errors, then green success on fix | High |

## Modularity Checklist
- [ ] All business logic in service layer (not controllers)
- [ ] No cross-module direct database access (Pattern module uses Question Bank interfaces, not direct DB)
- [ ] Shared types used from @repo/types
- [ ] Validation schemas in @repo/validation
- [ ] Module can be extracted to microservice without code changes in other modules
- [ ] All dependencies injected, not imported directly
- [ ] Feature flags / config for optional features

## Upgrade Path
Phase 4 prepares the system for **Phase 5 (Exam Generation)**.
- The `Exam Pattern` serves as the direct input blueprint for the Exam Generator algorithm.
- The Validation Engine (Feature 4.8) shares query builder logic with the actual Question Selector that will be built in Phase 5.
- Versioning ensures Phase 6 (Exam Execution) always has immutable structural data.

## Definition of Done
- All API endpoints implemented and documented via Swagger/OpenAPI.
- Database migrations created and tested.
- All Unit and Integration tests passing with >85% coverage.
- E2E tests passing for primary user flows.
- Validation Engine accurately queries Question Bank limits.
- Frontend components built and integrated with real APIs.
- Code reviewed and Modularity Checklist verified.
</Phase 4 — Exam Pattern>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 15: Exam Pattern](../specs/15-exam-pattern.md)
- [Spec 29: Entity Versioning & Rollback Engine](../specs/29-entity-versioning-rollback.md)

### Key Team Role Guidelines
- [Backend Engineer](../roles/16-backend-engineer.md) — Features 4.1 through 4.9
- [Frontend Engineer](../roles/15-frontend-engineer.md) — Feature 4.10
- [Solution Architect](../roles/22-solution-architect.md) — Blueprint validation engine

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [API Reference Catalog](../guides/02-api-reference.md)
- [Error Code Registry](../guides/09-error-code-registry.md)