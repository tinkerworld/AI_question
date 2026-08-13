# Exam Pattern — Functional Specification

## 1. Overview
The Exam Pattern feature provides a reusable blueprint or recipe for constructing structured examinations. It allows administrators and educators to define the rules for generating an exam, including sections, question types, difficulty distribution, topic allocation, and negative marking. This ensures consistency across multiple exams of the same type and automates the process of generating balanced question papers.

## 2. User Stories
- As a Main Admin, I want to create standard exam patterns so that all schools in the system follow consistent testing structures.
- As a Sub-Admin, I want to define subject-specific exam patterns so that teachers can easily generate exams for their classes.
- As a Teacher, I want to use an existing pattern to quickly generate a balanced mock exam.
- As an Administrator, I want to version exam patterns so that older exams remain linked to the exact pattern rules they were created with.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| Create Pattern | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Patterns | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Pattern (Draft) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Publish Pattern | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Archive Pattern | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Create New Version | ✅ | ✅ | ✅ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Basic Settings
**What it does**: Defines the core attributes of the exam pattern.
**How it works**: Users provide a name, select the applicable course, class/level, and subjects. They define the total duration and the total marks (which are auto-calculated based on section rules).
**Business Rules**: A pattern must have a unique name within its context. Total marks are read-only and derived from section configurations.
**Edge Cases**: If no sections are defined, total marks remain 0.

### 4.2 Multi-Subject Configuration
**What it does**: Allows a single pattern to cover multiple subjects (e.g., Physics, Chemistry, Math).
**How it works**: Users can allocate marks or question counts per subject. The pattern builder visually groups sections by subject.
**Business Rules**: The sum of subject allocations must equal the total pattern marks.
**Edge Cases**: Removing a subject after sections are created requires reassigning or deleting those sections.

### 4.3 Section Configuration (A, B, C...)
**What it does**: Divides the exam into logical sections with specific rules.
**How it works**: For each section, users define the name, total number of questions, marks per question, and total marks.
**Business Rules**: Total marks for a section = question count × marks per question (if fixed). Section names must be unique within the pattern.
**Edge Cases**: Sections can support variable marks per question if configured, but a default must be set.

### 4.4 Per-Section Question Rules
**What it does**: Specifies the criteria for questions within a section.
**How it works**: Users configure:
- **Question Type**: Specific (e.g., MCQ only), multiple (MCQ + True/False), or ALL.
- **Topic Distribution**: E.g., Mechanics 5 Qs, Thermodynamics 5 Qs.
- **Difficulty Distribution**: E.g., Easy 20%, Medium 50%, Hard 30%.
- **Tag Filters**: Must include specific tags.
- **Negative Marking**: E.g., +4 for correct, -1 for incorrect, 0 for unattempted.
**Business Rules**: The sum of topic distribution counts must match the section's total question count. Difficulty percentages must sum to 100%.
**Edge Cases**: If the question bank lacks sufficient questions matching these exact rules, the pattern validation will fail.

### 4.5 Pattern Validation
**What it does**: Ensures the pattern is logically sound and practically usable.
**How it works**: The system checks if the question bank contains enough questions to fulfill the pattern's rules without duplicates.
**Business Rules**: A pattern cannot be published if validation fails (e.g., asking for 50 Hard Mechanics questions when only 20 exist).
**Edge Cases**: Validation runs against the current state of the question bank; future bank deletions might invalidate a previously valid pattern.

### 4.6 Pattern Versioning and Statuses
**What it does**: Manages the lifecycle and historical integrity of patterns.
**How it works**: Patterns have statuses: DRAFT, PUBLISHED, ARCHIVED. Editing a PUBLISHED pattern creates a new version (e.g., v2).
**Business Rules**: Existing exams link to the specific version they were generated from. ARCHIVED patterns cannot be used for new exams but remain for historical records.
**Edge Cases**: Archiving a pattern while draft exams are using it prevents those exams from being published until they switch to an active pattern.

## 5. Data Model
```
Table: exam_patterns
├── id (PK, CUID)
├── name (String) — Name of the pattern
├── course_id (FK) — Course this applies to
├── class_level_id (FK) — Class/Level
├── duration_minutes (Int) — Total time
├── total_marks (Decimal) — Auto-calculated total
├── status (Enum) — DRAFT, PUBLISHED, ARCHIVED
├── version (Int) — Version number
├── parent_id (FK, CUID) — Link to previous version if updated
├── created_by (FK) — User ID
└── timestamps

Table: pattern_subjects
├── id (PK, CUID)
├── pattern_id (FK)
├── subject_id (FK)
├── allocated_marks (Decimal)
└── timestamps

Table: pattern_sections
├── id (PK, CUID)
├── pattern_id (FK)
├── subject_id (FK, optional)
├── name (String) — e.g., "Section A"
├── question_count (Int)
├── total_marks (Decimal)
├── correct_marks (Decimal) — Marks for correct answer
├── negative_marks (Decimal) — Penalty for wrong answer
├── partial_marks_allowed (Boolean)
├── difficulty_distribution (JSON) — e.g., {"Easy": 20, "Medium": 50, "Hard": 30}
├── type_filters (JSON) — Array of allowed types
├── tag_filters (JSON) — Array of required tags
└── timestamps

Table: pattern_section_topics
├── id (PK, CUID)
├── section_id (FK)
├── topic_id (FK)
├── question_count (Int)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| POST | `/api/exam-patterns` | Create new pattern | Pattern details | Pattern object | Bearer | Create Pattern |
| GET | `/api/exam-patterns` | List patterns | Query params | Array of patterns | Bearer | View Patterns |
| GET | `/api/exam-patterns/:id` | Get pattern details | - | Pattern full object | Bearer | View Patterns |
| PUT | `/api/exam-patterns/:id` | Update draft pattern | Pattern updates | Updated object | Bearer | Edit Pattern |
| POST | `/api/exam-patterns/:id/publish` | Publish pattern | - | Status update | Bearer | Publish Pattern |
| POST | `/api/exam-patterns/:id/validate` | Validate against bank | - | Validation result | Bearer | Edit Pattern |
| POST | `/api/exam-patterns/:id/version` | Create new version | - | New draft pattern | Bearer | Edit Pattern |

## 7. UI Screens & Components
### Screen: Pattern List
**URL**: `/admin/exam-patterns`
**Layout**: Data grid showing pattern name, target class, subjects, version, and status.
**Interactive Elements**: Filters (status, subject, class), "Create New" button, action menu (View, Edit, Archive).
**States**: Loading spinner, empty state illustration, populated grid.

### Screen: Pattern Builder
**URL**: `/admin/exam-patterns/builder/:id`
**Layout**: Split view. Left side: Form for basic settings and subject allocation. Right side: Section builder.
**Interactive Elements**: Accordions for sections, dynamic input fields for topic allocation (validating totals against section total), sliders for difficulty distribution, "Validate" button, "Publish" button.
**States**: Validation error highlighting, saving state, read-only state for published versions.

## 8. Business Rules
1. A published pattern cannot be edited; modifications require creating a new version.
2. The total marks of the pattern must precisely match the sum of all section marks.
3. Section difficulty percentages must always sum to 100%.
4. Topic question counts within a section must sum to the section's total question count.
5. Validation against the question bank is required before publishing.

## 9. Validation Rules
- `name`: Required, max 100 characters.
- `duration_minutes`: Integer, > 0.
- `negative_marks`: Must be >= 0 (system subtracts this value).
- `question_count` (section): Integer, > 0.

## 10. Error Handling
- `ValidationFailedError`: Returned when the pattern rules cannot be met by the current question bank (includes specific details on missing questions).
- `StateError`: Attempting to edit a PUBLISHED pattern directly.
- `DataMismatchError`: If topic counts do not sum to section totals.

## 11. Integration Points
- **Question Bank**: Used for validation to ensure pattern viability.
- **Exam Generator**: Consumes the pattern rules to build actual exam instances.

## 12. Configuration Options
- Allow/Disallow negative marking globally.
- Define default difficulty distribution (e.g., 30/40/30).

## 13. Future Enhancements
- AI-assisted pattern generation based on past successful exams.
- Dynamic patterns that adapt difficulty based on real-time student performance (adaptive testing).
