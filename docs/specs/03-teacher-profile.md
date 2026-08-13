# Teacher Profile — Functional Specification

## 1. Overview
The Teacher Profile provides academic content creators with a comprehensive suite of tools to manage courses, subjects, syllabuses, questions, exam patterns, and examination papers. It serves as the primary engine for educational content generation and assessment design within the platform, enabling teachers to structure learning pathways and evaluate student performance effectively.

## 2. User Stories
- As a Teacher, I want to create and manage courses and subjects so that I can organize academic offerings.
- As a Teacher, I want to build a hierarchical syllabus (Unit → Topic → Subtopic → Concept) so that learning paths are clearly defined.
- As a Teacher, I want to create and version various types of questions with detailed metadata so that I can maintain a robust question bank.
- As a Teacher, I want to design exam patterns and blueprints so that assessments are standardized and balanced.
- As a Teacher, I want to generate examination papers automatically or manually so that I can quickly produce assessments for students.
- As a Teacher, I want to use a "Preview Student" account so that I can test exams and content exactly as students will experience them.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| View own courses/subjects | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create/Edit Courses & Subjects | ✅ | ⚙️ | ✅ | ❌ | ❌ |
| Manage Syllabus hierarchy | ✅ | ⚙️ | ✅ | ❌ | ❌ |
| Manage Question Bank | ✅ | ⚙️ | ✅ | ❌ | ❌ |
| Approve Questions | ✅ | ⚙️ | ⚙️ | ❌ | ❌ |
| Create Exam Patterns | ✅ | ⚙️ | ✅ | ❌ | ❌ |
| Create/Generate Papers | ✅ | ⚙️ | ✅ | ❌ | ❌ |
| View Academic Reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| Login as Preview Student | ✅ | ✅ | ✅ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Course & Subject Management
**What it does**: Allows teachers to define the high-level academic structure by creating courses and linking subjects to them.
**How it works**: Teachers navigate to the Course Dashboard, click "Create Course," input details, and save. They can then add subjects and link them to the course.
**Business Rules**: A subject can be linked to multiple courses. A course must have at least one subject to be active.
**Edge Cases**: Deleting a course linked to active student enrollments requires archiving instead.

### 4.2 Syllabus Management
**What it does**: Enables the creation of detailed topic trees (Unit → Topic → Subtopic → Concept).
**How it works**: Within a subject, teachers use a visual tree builder to add nodes at different hierarchy levels.
**Business Rules**: Maximum depth is 4 levels. Questions must be tagged to at least the "Topic" level, though "Concept" is preferred.
**Edge Cases**: Reordering nodes updates the path for all children automatically.

### 4.3 Question Bank Management
**What it does**: A comprehensive system for creating, editing, and managing questions.
**How it works**: Teachers use a rich-text editor supporting math (LaTeX) and images to author questions (MCQ, True/False, Fill-blank, Numerical, Subjective). They set metadata (difficulty, marks, tags, syllabus link, previous exam linkage).
**Business Rules**: Questions follow a lifecycle: Draft → Review → Approved → Published → Archived. Only Published questions can be used in live exams. Edits to Published questions create a new version.
**Edge Cases**: If a question has dependencies (e.g., linked to a previous exam year), the tag cannot be removed easily without confirmation.

### 4.4 Exam Pattern Management
**What it does**: Defines the blueprint for generating exams.
**How it works**: Teachers create a pattern, define sections (e.g., Section A, B), set total marks, number of questions to attempt (e.g., attempt 10 out of 15), configure negative marking per section, and define topic/difficulty distribution.
**Business Rules**: Total marks must equal the sum of max possible marks across sections. Distribution percentages must total 100%. Validation against the question bank is required.
**Edge Cases**: If the question bank lacks sufficient questions to satisfy the pattern's rules, validation will fail and the pattern cannot be marked as 'Ready'.

### 4.5 Examination Paper Creation
**What it does**: Generates actual test papers based on patterns or manual selection.
**How it works**: Teachers choose to "Auto-generate" (system selects questions fitting the pattern) or "Create Manually" (teacher browses and picks questions). They can inspect the draft, swap questions, and reorder them. Includes mock tests and practice papers.
**Business Rules**: Auto-generation respects the blueprint strictly. Manual creation highlights deviations from the blueprint.
**Edge Cases**: Swapping a question during review restricts the replacement pool to questions matching the original's difficulty and topic to maintain blueprint integrity.

### 4.6 Preview Student & Testing
**What it does**: Allows teachers to simulate the student experience.
**How it works**: Clicking "Preview as Student" launches a secure, isolated session where the teacher can take the exam, interact with the UI, and view results.
**Business Rules**: Preview data is never mixed with real student analytics.
**Edge Cases**: Switching back to the teacher view immediately clears the preview session state.

## 5. Data Model
```
Table: courses
├── id (PK, CUID)
├── name (String)
├── description (Text)
└── timestamps

Table: subjects
├── id (PK, CUID)
├── name (String)
└── timestamps

Table: syllabuses
├── id (PK, CUID)
├── subject_id (FK, subjects.id)
├── parent_id (FK, syllabuses.id) — nullable for root
├── type (Enum: unit, topic, subtopic, concept)
├── name (String)
└── timestamps

Table: questions
├── id (PK, CUID)
├── type (Enum: mcq, tf, blank, numeric, subjective)
├── content (JSON) — text, options, correct answer
├── difficulty (Enum: easy, medium, hard)
├── default_marks (Int)
├── status (Enum: draft, review, approved, published, archived)
├── version (Int)
├── parent_question_id (CUID) — for versioning
└── timestamps

Table: exam_patterns
├── id (PK, CUID)
├── name (String)
├── total_marks (Int)
├── duration_minutes (Int)
├── rules (JSON) — blueprint logic
└── timestamps

Table: exams
├── id (PK, CUID)
├── pattern_id (FK, exam_patterns.id)
├── name (String)
├── type (Enum: live, mock, practice)
├── scheduled_start (DateTime)
├── scheduled_end (DateTime)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/v1/courses` | Create a course | `{name, description}` | `CourseObject` | Bearer | `courses.create` |
| GET | `/api/v1/syllabus/tree/:subjectId` | Get syllabus hierarchy | None | `TreeObject[]` | Bearer | `syllabus.read` |
| POST | `/api/v1/questions` | Create question | `QuestionData` | `QuestionObject` | Bearer | `questions.create` |
| PUT | `/api/v1/questions/:id/status` | Update lifecycle state | `{status}` | `QuestionObject` | Bearer | `questions.update` |
| POST | `/api/v1/patterns/validate` | Check pattern against bank | `PatternData` | `{valid, shortages}` | Bearer | `exam_patterns.validate` |
| POST | `/api/v1/exams/generate` | Auto-generate paper | `{patternId, type}` | `DraftExamObject` | Bearer | `exams.generate` |

## 7. UI Screens & Components
### Screen: Content Creation Dashboard
**URL**: `/teacher/dashboard`
**Layout**: Sidebar navigation (Courses, Syllabus, Questions, Exams). Main area shows quick stats (Draft questions pending review, upcoming exams).
**Interactive Elements**: Action buttons for "New Question", "New Exam".
**States**: Loading skeleton, populated widgets.

### Screen: Question Editor
**URL**: `/teacher/questions/new`
**Layout**: Split pane. Left side: rich text editor, option fields. Right side: metadata panel (difficulty, tags, syllabus linking).
**Interactive Elements**: Markdown/LaTeX toolbar, add option button, save draft/submit for review toggle.
**States**: Validation errors inline, unsaved changes warning.

### Screen: Pattern Builder
**URL**: `/teacher/patterns/new`
**Layout**: Section builder. Add sections, define rules per section.
**Interactive Elements**: Sliders for difficulty distribution, input fields for marks/negative marks, topic selector.
**States**: Live validation badge (Green: valid against bank, Red: insufficient questions).

### Screen: Exam Preview
**URL**: `/teacher/exams/:id/preview`
**Layout**: Simulates the student test-taking interface.
**Interactive Elements**: Next/Prev question, submit test.
**States**: Watermarked "PREVIEW MODE".

## 8. Business Rules
1. A question cannot be permanently deleted once it has been used in a published exam; it must be archived.
2. Only 'Published' status questions are eligible for exam generation.
3. Exam patterns must be successfully validated against the question bank before being used to generate exams.
4. Auto-generated papers must strictly adhere to the defined pattern blueprint without deviations.

## 9. Validation Rules
- Question content cannot be empty.
- MCQs must have at least 2 options and exactly one correct answer (unless multi-correct is selected).
- Exam pattern marks must mathematically align (questions × marks per question = section total).
- Negative marks must be ≤ 0.

## 10. Error Handling
- **Insufficient Questions**: If a pattern demands 10 Hard Math questions but only 8 exist, return a `422 Unprocessable Entity` detailing the exact shortage.
- **Concurrent Edits**: If two teachers edit the same question, the second to save receives a `409 Conflict` prompting them to review the newer version.

## 11. Integration Points
- Interacts with the Student Profile to serve generated exams.
- Integrates with the Analytics engine to feed metadata for performance reports.

## 12. Configuration Options
- Admins can configure whether teachers have auto-approval rights for questions or if they must go through a review queue.
- Default difficulty weights and available tags are globally configurable.

## 13. Future Enhancements
- AI-assisted question generation based on syllabus concepts.
- Collaborative editing (Google Docs style) for question authors.
