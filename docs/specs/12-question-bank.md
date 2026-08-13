<Question Bank — Functional Specification>
## 1. Overview
The Question Bank is the central academic inventory that stores all examination questions. It serves as a reusable repository for creating formal exams, mock tests, practice papers, personalized assignments, and AI-driven practice sessions. A robust question bank is fundamental to maintaining high academic standards, ensuring diverse assessment, and enabling automated test generation.

## 2. User Stories
- As a Teacher, I want to create and organize questions by syllabus nodes so that I can easily find them later.
- As a Teacher, I want to include rich text, mathematical equations, and images in my questions so that I can test complex concepts.
- As a Sub-Admin, I want to review and approve drafted questions so that only high-quality items are used in actual exams.
- As an Administrator, I want to filter the question bank by difficulty, tags, and topics so that I can analyze our content coverage.
- As a Teacher, I want to bulk update the status or tags of multiple questions to save time.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| View Published Questions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Draft Questions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Draft Questions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Transition DRAFT → REVIEW | ✅ | ✅ | ✅ | ❌ | ❌ |
| Transition REVIEW → APPROVED | ✅ | ✅ | ❌ | ❌ | ❌ |
| Transition APPROVED → PUBLISHED | ✅ | ✅ | ❌ | ❌ | ❌ |
| Archive Questions | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Questions (Soft) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Bulk Operations | ✅ | ✅ | ⚙️ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Question CRUD & Rich Content
**What it does**: Allows creation, viewing, updating, and deletion of questions with rich formatting.
**How it works**:
1. User clicks "Create New Question".
2. Selects question type, course, subject, and topic.
3. Enters content using a WYSIWYG editor supporting Markdown, LaTeX, and image uploads.
4. Fills in metadata (difficulty, marks, tags).
5. Saves as DRAFT.
**Business Rules**: 
- Questions must be linked to at least one Subject and Topic.
- Images must be uploaded and stored securely; only accessible to authorized users.
**Edge Cases**: Very large images are compressed; invalid LaTeX syntax returns an editor warning.

### 4.2 Status Lifecycle Management
**What it does**: Enforces a quality control process for questions.
**How it works**:
Questions transition through states: DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED.
**Business Rules**:
- Only PUBLISHED questions can be available for exam generation.
- Once PUBLISHED, editing a question creates a new version (detailed in Versioning spec).
- Teachers can only submit for review; admins/sub-admins approve and publish.

### 4.3 Search and Filtering
**What it does**: Powerful querying to find specific questions.
**How it works**: The question bank UI provides a faceted search interface.
**Business Rules**: Searchable by course, subject, topic, subtopic, concept, type, difficulty (EASY/MEDIUM/HARD), tags, status, and marks.

### 4.4 Bulk Operations
**What it does**: Apply changes to multiple questions simultaneously.
**How it works**: Select multiple questions using checkboxes, then choose an action (Bulk Tag, Bulk Status Change, Bulk Delete).
**Business Rules**: User must have permission for the target state (e.g., Teachers cannot bulk publish).

### 4.5 Analytics & Coverage
**What it does**: Insights into the question bank's health.
**How it works**: Dashboard showing counts by subject, topic, and difficulty. Highlights "gaps" where topics have too few questions.
**Business Rules**: Refreshes asynchronously.
**Edge Cases**: Newly added topics with zero questions trigger coverage gap alerts immediately.

## 5. Data Model
```
Table: questions
├── id (PK, CUID)
├── course_id (FK)
├── subject_id (FK)
├── topic_id (FK)
├── subtopic_id (FK, nullable)
├── concept_id (FK, nullable)
├── question_type (Enum)
├── content (JSON/Text) — Rich text, images
├── difficulty (Enum: EASY, MEDIUM, HARD)
├── marks (Decimal)
├── status (Enum: DRAFT, REVIEW, APPROVED, PUBLISHED, ARCHIVED)
├── created_by (FK, User)
├── updated_by (FK, User)
├── created_at (Timestamp)
└── updated_at (Timestamp)

Table: question_tags
├── question_id (FK)
└── tag_id (FK)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| POST | `/api/questions` | Create question | `{course_id, type, content, ...}` | `201 {id, status}` | Bearer | Create |
| GET | `/api/questions` | List with filters | - | `200 {data[], meta}` | Bearer | Read |
| GET | `/api/questions/:id` | Get single | - | `200 {question}` | Bearer | Read |
| PUT | `/api/questions/:id` | Update question | `{content, marks, ...}` | `200 {question}` | Bearer | Update |
| DELETE | `/api/questions/:id` | Archive/Delete | - | `204 No Content` | Bearer | Delete |
| POST | `/api/questions/bulk` | Bulk actions | `{ids[], action, payload}` | `200 {success_count}` | Bearer | Update |
| POST | `/api/questions/:id/status` | Change status | `{status}` | `200 {question}` | Bearer | UpdateStatus |

## 7. UI Screens & Components
### Screen: Question List
**URL**: `/admin/question-bank`
**Layout**: Sidebar with faceted filters. Main area with a data table showing question preview, type, subject, difficulty, status, and marks.
**Interactive Elements**: Search bar, filter dropdowns, bulk action checkboxes, "Create Question" button.
**States**: Loading skeleton, empty state ("No questions match your filters"), success view.

### Screen: Question Editor
**URL**: `/admin/question-bank/edit/:id`
**Layout**: Two-column layout. Left: WYSIWYG editor for question and answer content. Right: Metadata sidebar (tags, difficulty, taxonomy links, status).
**Interactive Elements**: Save as Draft, Submit for Review buttons. Image uploader, formula editor.
**States**: Form validation errors highlighted, unsaved changes warning.

## 8. Business Rules
1. A question cannot be published without an explicitly marked correct answer (if auto-evaluated) or a grading rubric (if subjective).
2. Deleting a published question only archives it (soft delete).
3. Drafts can be hard-deleted if they have no version history.

## 9. Validation Rules
- Content: Must not be empty. Max length 10,000 chars.
- Marks: Must be > 0.
- Difficulty: Must be one of EASY, MEDIUM, HARD.
- Taxonomy: Must be linked to at least one valid Subject node.

## 10. Error Handling
- Invalid Taxonomy: "The selected topic does not belong to the selected subject."
- Invalid State Transition: "Cannot transition from DRAFT directly to PUBLISHED."

## 11. Integration Points
- Media Service: For storing and retrieving inline images.
- Syllabus/Taxonomy Module: For linking questions to courses, subjects, topics.
- Exam Generation Module: Which pulls only PUBLISHED questions.

## 12. Configuration Options
- Mandatory Metadata: Admins can configure if 'Concept' is a mandatory field.
- Default Marks: Configurable per question type.
- Export formats supported: PDF, CSV, QTI.

## 13. Future Enhancements
- AI-assisted question generation.
- Automated difficulty calibration based on student performance.
- Duplicate question detection using embeddings.
</Question Bank — Functional Specification>
