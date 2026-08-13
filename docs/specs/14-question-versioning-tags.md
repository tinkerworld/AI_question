<Question Versioning, Tags & Exam History — Functional Specification>
## 1. Overview
This subsystem manages the lifecycle and metadata of questions over time. Versioning ensures that editing a question does not alter historical exams that used older versions. Tags provide flexible categorization beyond the strict syllabus taxonomy. Exam History tracks every instance a question appears in a published exam, serving as a vital metric for question frequency and importance.

## 2. User Stories
- As an Admin, I want edits to questions to create new versions so that past exam records remain 100% accurate.
- As a Teacher, I want to tag questions as "Previous Exam" or "High Difficulty" so I can easily filter them later.
- As a Teacher, I want to see which previous exams a question appeared in to judge its significance.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| View Version History | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Tags | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| View Exam History | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Exam History Manual | ✅ | ✅ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Versioning System
**What it does**: Tracks changes to question content without mutating historical records.
**How it works**:
- When a PUBLISHED question is edited, a new record in `question_versions` is created (e.g., v1, v2, v3...).
- Current version pointer: The `questions` table always points to the latest version.
- Version history viewable: Users can browse previous versions.
- Published exams freeze the version used: When an exam is published, it links to the specific `question_version_id`.
- Changing Question Bank question does NOT change historical exams.
**Business Rules**: Draft edits do not create new versions; versioning only applies to changes after initial publication.

### 4.2 Flexible Tagging
**What it does**: Allows ad-hoc categorization not hard-coded into the taxonomy.
**How it works**:
- Predefined suggestions available out of the box: Important, Previous Exam, Frequently Asked, Conceptual, Numerical, High Difficulty, Revision, Board Exam, Entrance Exam.
- Custom tags allowed: Users can type to create new tags.
- Tag CRUD and bulk tag operations available in UI.
- Filter questions by tags in the Question Bank.
**Business Rules**: Tags are case-insensitive and stripped of trailing spaces.

### 4.3 Previous Exam History
**What it does**: Maintains a record of where questions have been used.
**How it works**:
- Question linked to every published exam it appeared in.
- Auto-populated: When an Exam is set to PUBLISHED, the system logs the exam ID against the question IDs.
- Manual Entry: Admins can manually add historical references (e.g., Q1024 appeared in "2022 Physics Final", "2023 Mock 3").
**Business Rules**: The Published Exam Repository is the authoritative source. If an exam is deleted, its auto-populated history entries are removed.

## 5. Data Model
```
Table: question_versions
├── id (PK, CUID)
├── question_id (FK)
├── version_number (Int)
├── content (JSON)
├── correct_answer (JSON)
├── marks (Decimal)
├── created_by (FK)
└── created_at (Timestamp)

Table: tags
├── id (PK, CUID)
├── name (String)
└── is_system (Boolean) — For predefined tags

Table: question_exam_history
├── id (PK)
├── question_id (FK)
├── exam_id (FK, nullable) — For auto-populated
├── manual_exam_name (String, nullable) — For manual entry
└── year (Int)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| GET | `/api/questions/:id/versions` | List versions | - | `200 {versions[]}` | Bearer | Read |
| GET | `/api/tags` | List all tags | - | `200 {tags[]}` | Bearer | Read |
| POST | `/api/tags` | Create custom tag | `{name}` | `201 {tag}` | Bearer | Update |
| POST | `/api/questions/:id/tags` | Assign tag to Q | `{tag_ids[]}` | `200 {}` | Bearer | Update |
| GET | `/api/questions/:id/history` | Get exam history | - | `200 {history[]}` | Bearer | Read |

## 7. UI Screens & Components
### Screen: Question Details Modal - History Tab
**URL**: `/admin/questions/:id/history`
**Layout**: Shows a timeline of edits (Versions) and a list of exams where the question appeared.
**Interactive Elements**: "Restore this version" button, "Add manual history" button.
**States**: Loading, empty state if no history exists.

### Screen: Tag Manager
**URL**: `/admin/settings/tags`
**Layout**: Table of all tags, showing usage count.
**Interactive Elements**: Rename, Merge, Delete tags.
**States**: Empty state if no tags created.

## 8. Business Rules
1. Published Exams cannot have their linked `question_version_id` updated.
2. System tags cannot be deleted, only hidden.

## 9. Validation Rules
- Tag names: Max 50 characters, alphanumeric and dashes.
- Manual history year: Must be a valid year (e.g., 1900 to current_year).

## 10. Error Handling
- Attempting to edit a linked version raises an error; edits must spawn a new version.

## 11. Integration Points
- Exam Engine: Exam snapshot relies on `question_version_id`.
- Question Bank Search: Filters by tag and history.

## 12. Configuration Options
- Define standard predefined system tags.

## 13. Future Enhancements
- Tag clustering/synonyms.
- Analytics on performance drop/increase across different versions of the same question.
</Question Versioning, Tags & Exam History — Functional Specification>
