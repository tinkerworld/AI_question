<Published Exam Archive — Functional Specification>
## 1. Overview
The Published Exam Archive serves as an immutable historical record of all finalized and published exams within the platform. Its primary purpose is to ensure that once an exam is published, it remains exactly as it was administered, preserving the exact question text, options, answer keys, marks, negative marking rules, and evaluation criteria, even if the underlying questions are subsequently updated in the Question Bank.

## 2. User Stories
- As a **Main Admin**, I want to browse and search the complete archive of past exams so that I can audit historical assessments and maintain institutional records.
- As a **Sub-Admin**, I want to view published exams for my assigned departments so that I can review past assessments.
- As a **Teacher**, I want to review past published exams in my subjects so that I can understand historical exam patterns and reuse concepts without modifying the historical record.
- As a **Student**, I want to access my past published exams (if allowed by exam policy) so that I can review my performance against the immutable answer key.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Published Exam Archive | ✅ | ✅ | ✅ | ⚙️ | ❌ |
| Search/Filter Archive | ✅ | ✅ | ✅ | ⚙️ | ❌ |
| View Answer Keys in Archive | ✅ | ✅ | ✅ | ⚙️ | ❌ |
| Transition Exam to Published | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Published Exam (Correction Workflow) | ✅ | ⚙️ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Publication Workflow
**What it does**: Manages the lifecycle of an exam leading up to its publication.
**How it works**:
1. Exam starts in `DRAFT` state.
2. Transitions to `PREVIEW` for final review.
3. Transitions to `REVIEW` by a senior academic coordinator.
4. Transitions to `APPROVED` once finalized.
5. Transitions to `PUBLISHED` when it is live or archived.
**Business Rules**: Only Approved exams can be published.
**Edge Cases**: An exam might be published accidentally; a strict correction workflow is required for post-publish fixes.

### 4.2 Snapshot Creation
**What it does**: Freezes the entire state of the exam at the exact moment of publication.
**How it works**: Upon publication, the system creates a deep copy/snapshot of all exam metadata, sections, instructions, and every individual question (text, options, answer key, marks, negative marking, version).
**Business Rules**: The snapshot must retain the exact version of the question used (e.g., Question 1024 v1), ignoring any future versions (v2, v3) created in the bank.
**Edge Cases**: Questions deleted from the main bank remain intact in the snapshot.

### 4.3 Answer Key Preservation
**What it does**: Preserves the exact correct answers and evaluation rules for each question type.
**How it works**:
- **MCQ**: Correct option ID (e.g., B).
- **Multiple Choice**: Correct option IDs (e.g., A, C, D).
- **Numerical**: Exact numeric value and tolerance range.
- **Subjective**: Model answer text and evaluation rubric.
**Business Rules**: The evaluation engine must use the snapshot's answer key, never the live Question Bank's key.

### 4.4 Archive Organization & Search
**What it does**: Organizes the archive for easy retrieval.
**How it works**: Exams are grouped by Academic Year, Course, and Subject. The UI provides comprehensive filtering (year, course, subject, exam name, teacher, pattern, topic, difficulty, date).
**Business Rules**: The archive view is separated from the active exam creation interface to prevent confusion.

### 4.5 File Storage Management
**What it does**: Manages static assets associated with published exams.
**How it works**: Generates and stores PDF versions of the question paper and answer key. Stores related media (images, audio) at a fixed path: `/storage/exams/{year}/{subject}/{exam-name}/`.
**Business Rules**: Files in this path are strictly read-only after publication.

## 5. Data Model
```text
Table: exam_snapshots
├── id (PK, CUID)
├── original_exam_id (FK, CUID)
├── academic_year (String)
├── course_id (FK, CUID)
├── subject_id (FK, CUID)
├── exam_name (String)
├── pattern_snapshot (JSONB) — exact pattern rules used
├── instructions (Text)
├── total_marks (Decimal)
├── published_at (DateTime)
├── storage_path (String)
└── timestamps

Table: exam_snapshot_sections
├── id (PK, CUID)
├── snapshot_id (FK, CUID)
├── section_name (String)
├── section_rules (JSONB)
└── timestamps

Table: exam_snapshot_questions
├── id (PK, CUID)
├── snapshot_section_id (FK, CUID)
├── original_question_id (FK, CUID)
├── question_version (Integer)
├── question_content (JSONB) — text, options, media
├── answer_key (JSONB) — correct answers, tolerance, rubric
├── marks (Decimal)
├── negative_marks (Decimal)
├── display_order (Integer)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/exams/{id}/publish` | Publish an exam (creates snapshot) | `{}` | `200 OK, Snapshot ID` | Bearer | Admin/Sub-Admin |
| GET | `/api/archive/exams` | Search/filter published exams | Query params | `200 OK, Paginated List` | Bearer | Admin/Teacher |
| GET | `/api/archive/exams/{id}` | Get full exam snapshot details | None | `200 OK, Snapshot Obj` | Bearer | Admin/Teacher |
| GET | `/api/archive/exams/{id}/pdf` | Get question paper PDF URL | None | `200 OK, URL` | Bearer | Admin/Teacher/Student |
| GET | `/api/archive/exams/{id}/key` | Get answer key details | None | `200 OK, Answer Key Obj` | Bearer | Admin/Teacher |

## 7. UI Screens & Components
### Screen: Published Exam Archive Browser
**URL**: `/admin/archive/exams`
**Layout**: Top filter bar (Year, Course, Subject, Pattern, Date). Data table listing exams with columns for Name, Date, Subject, Pattern, and Actions (View, PDF).
**Interactive Elements**: Advanced search filters, pagination controls, export to CSV button.
**States**: Loading skeleton, empty state (no exams match filters), error state, populated table.

### Screen: Exam Snapshot Detail
**URL**: `/admin/archive/exams/{id}`
**Layout**: Header with exam metadata (immutable badge). Tabs for "Question Paper", "Answer Key", and "Statistics".
**Interactive Elements**: Section navigation sidebar, download PDF buttons.
**States**: Loading, error, content display.

## 8. Business Rules
1. A published exam's snapshot data (questions, options, marks, answer key) cannot be modified via standard editing tools.
2. Changes to questions in the Question Bank do not affect the snapshot.
3. If an error is found in a published exam (e.g., wrong answer key), it must follow a formal "Post-Publish Correction" workflow that logs the change and recalculates affected student scores, rather than silently mutating the snapshot.
4. Static assets (PDFs) are generated upon publication and locked in the designated storage path.

## 9. Validation Rules
- **Publish Action**: Validates that the exam is in the `APPROVED` state. Validates that all sections have the correct number of questions as per the pattern.
- **Search**: Validates query parameters (e.g., valid year format, valid CUIDs for filters).

## 10. Error Handling
- **400 Bad Request**: Attempting to publish an unapproved exam.
- **403 Forbidden**: User lacks permission to view the archive.
- **404 Not Found**: Snapshot ID does not exist.
- **409 Conflict**: Attempting to publish an already published exam.

## 11. Integration Points
- **Evaluation Engine**: Reads exclusively from the `exam_snapshots` and `exam_snapshot_questions` tables to calculate scores.
- **Storage Service (AWS S3/Azure Blob)**: For storing and retrieving static PDFs and media assets.
- **Question Bank**: References original IDs but decouples content to maintain immutability.

## 12. Configuration Options
- **Correction Workflow Access**: Define which roles can initiate a post-publish correction.
- **Student Visibility**: Toggle whether students can view the archive of past exams they did not attempt.

## 13. Future Enhancements
- Version control for post-publish corrections, showing a diff of what was changed and who authorized it.
- Automated generation of similar practice exams directly from a published snapshot.
</Published Exam Archive — Functional Specification>
