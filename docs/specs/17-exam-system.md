# Exam System (Student Experience) — Functional Specification

## 1. Overview
The Exam System defines the complete end-to-end flow for a student taking an examination. It covers access, the testing interface, time management, submission, auto-evaluation, and result visualization. This system is designed for high reliability, ensuring data integrity during network fluctuations and providing a secure, structured environment for assessments.

## 2. User Stories
- As a Student, I want to see my upcoming exams so that I can prepare.
- As a Student, I want a clear, responsive exam interface so I can navigate questions easily.
- As a Student, I want my answers auto-saved so I don't lose progress if my browser crashes.
- As a Student, I want to see a detailed result analysis after submission so I can learn from my mistakes.
- As a Teacher, I want the system to auto-grade objective questions to save time.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| View Available Exams | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attempt Exam | ❌ | ❌ | ❌ | ✅ | ✅ |
| View Own Results | ❌ | ❌ | ❌ | ✅ | ✅ |
| View All Results | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manual Subjective Review | ✅ | ✅ | ✅ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Exam Access & Initialization
**What it does**: Manages entry into the exam.
**How it works**: Students see a dashboard of assigned exams. Clicking an active exam shows the Instructions Page. Upon clicking "Start", an `attempt` record is created, and the server-side timer starts.
**Business Rules**: A student can only start the exam within the defined schedule window. Only one active attempt per student per exam is allowed (unless retakes are configured).
**Edge Cases**: If a student starts late, they only get the remaining time until the exam `end_time`, not the full duration.

### 4.2 Exam Interface & Navigation
**What it does**: The primary UI for answering questions.
**How it works**: Displays one question at a time or a continuous scroll. Includes:
- **Attempt-Specific Shuffling**: Question presentation sequence and MCQ option choices are shuffled per student attempt using the attempt's deterministic `shuffle_seed` ([Spec 16](16-exam-generator.md)). The student sees an attempt-specific presented order, not the canonical pattern order.
- **Question Palette**: Grid of numbers color-coded by status (Answered, Unanswered, Marked for Review).
- **Section Tabs**: For multi-section exams, allowing jumping between sections.
- **Navigation**: Next/Prev buttons.
**Business Rules**: Navigation between sections is unrestricted unless strict section-timing is configured. Deterministic `shuffle_seed` guarantees exact order reconstruction during post-exam grading and review.

### 4.3 Answering Mechanism
**What it does**: Captures student inputs based on question types.
**How it works**: Renders appropriate UI components:
- MCQ: Radio buttons (shuffled order derived from `shuffle_seed`).
- Multiple-Select: Checkboxes.
- Text Input: Text field.
- Matching: Drag-and-drop interfaces.
- Subjective: Rich text editor or file upload.
**Business Rules**: Input is validated on the client (e.g., max length) before syncing.

### 4.4 Mark for Review & Auto-Save
**What it does**: Enhances user experience and prevents data loss.
**How it works**:
- **Mark for Review**: Toggles a flag on the question, updating its color in the palette.
- **Auto-Save**: Background API calls trigger every time an answer changes or every 30 seconds.
**Business Rules**: Auto-saves are lightweight updates. The system tracks the timestamp of the last successful save.
**Edge Cases**: If network is lost, the UI warns the student and queues saves locally until connection restores.

### 4.5 Timer & Submission
**What it does**: Manages exam duration and completion.
**How it works**: A countdown timer is displayed. Visual warnings appear at 5 minutes and 1 minute remaining. The student can manually submit. If time expires, the system auto-submits the current state.
**Business Rules**: The authoritative timer is server-side. Client-side timers sync periodically.
**Edge Cases**: If the browser is closed, the server automatically closes the attempt when `start_time + duration` is reached.

### 4.6 Auto-Evaluation & Marking Rules
**What it does**: Calculates scores automatically upon submission.
**How it works**: Compares student answers to correct answers.
- **Correct**: Awards `correct_marks`.
- **Incorrect**: Applies `negative_marks` (subtracts).
- **Unattempted**: 0 marks.
- **Partial Marking**: For multiple-select, awards fractional marks for partially correct combinations (if configured).
**Business Rules**: Evaluation runs synchronously on submission for objective-only exams. Subjective questions flag the attempt as "Pending Review".

### 4.7 Result Generation & Display
**What it does**: Presents performance metrics and paper review to the student.
**How it works**: Generates total score, section-wise scores, percentage, and grade. The Result UI shows a summary dashboard and a detailed question-by-question review showing the student's answer, the correct answer, marks awarded, and the explanation.
- **Report Score / Flag for Review**: Students can click "Flag for Review" on their result screen. This is a lightweight reporting action that routes the attempt to the teacher/admin review queue for manual inspection. It is **NOT** a full re-evaluation state machine and triggers no automated re-grading.
**Business Rules**: Results are only visible after the exam window closes or immediately upon submission (configurable). Flagging an attempt writes an entry directly into `audit_logs` with `action = 'result.flagged_by_student'`.

## 5. Data Model
```
Table: exam_attempts
├── id (PK, CUID)
├── exam_id (FK)
├── student_id (FK)
├── shuffle_seed (VARCHAR, NOT NULL) — Seed for deterministic question & option shuffling
├── start_time (DateTime)
├── end_time (DateTime) — Actual submission time
├── status (Enum) — IN_PROGRESS, SUBMITTED, PENDING_REVIEW, GRADED
├── total_score (Decimal)
└── timestamps

Table: attempt_sections (Optional, for section-level tracking)
├── id (PK, CUID)
├── attempt_id (FK)
├── exam_section_id (FK)
├── score (Decimal)
└── timestamps

Table: question_attempts (Answers)
├── id (PK, CUID)
├── attempt_id (FK)
├── exam_question_id (FK)
├── question_snapshot (JSON) — Copy of question at time of exam
├── student_answer (JSON) — Format depends on question type
├── is_marked_for_review (Boolean)
├── time_spent_seconds (Int)
├── is_correct (Boolean)
├── marks_awarded (Decimal)
├── evaluator_comments (Text) — For subjective
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| POST | `/api/v1/attempts/start` | Start exam | exam_id | attempt_id, shuffle_seed, token | Bearer | Attempt Exam |
| GET | `/api/v1/attempts/:id/state` | Load exam state | - | Current answers, presented order, time | Bearer | Attempt Exam |
| PUT | `/api/v1/attempts/:id/answer` | Auto-save answer | question_id, answer | Success/Sync time | Bearer | Attempt Exam |
| POST | `/api/v1/attempts/:id/submit` | Submit exam | - | Submission status | Bearer | Attempt Exam |
| GET | `/api/v1/attempts/:id/results` | View results | - | Full graded attempt | Bearer | View Results |
| POST | `/api/v1/attempts/:id/flag` | Flag result for review | reason | Audit log status | Bearer | View Results |

## 7. UI Screens & Components
### Screen: Exam Hall
**URL**: `/exam/:exam_id/attempt/:attempt_id`
**Layout**: Top bar (Timer, Submit button). Left/Right sidebar (Question Palette). Main area (Current Question).
**Interactive Elements**: Answer inputs, "Save & Next", "Mark for Review", section tabs. Presented in attempt-specific order generated from `shuffle_seed`.
**States**: Offline warning banner, auto-saving indicator, final submission confirmation modal.

### Screen: Result Dashboard
**URL**: `/student/results/:attempt_id`
**Layout**: Top summary cards (Score, Rank, Accuracy). Charts for section-wise performance.
**Interactive Elements**: "Review Paper" button to enter question-by-question view. "Flag for Review" button to route result to teacher queue.
**States**: "Pending Review" state if subjective questions require teacher grading; "Flagged for Teacher Review" notification banner when student triggers flag.

## 8. Business Rules
1. A submitted exam is strictly read-only; no answers can be modified under any circumstances.
2. The server-side evaluation is the source of truth; client-side grading is never trusted.
3. Question snapshots must be saved with the attempt so that if the question bank is updated later, the student's historical result is not corrupted.

## 9. Validation Rules
- `student_answer`: Must conform to the expected schema for the specific question type.
- `attempt_id`: Must belong to the authenticated student.

## 10. Error Handling
- `ExamClosedError`: Attempting to start or submit an exam outside the allowed window.
- `NetworkSyncError`: UI alerts the user when auto-saves fail repeatedly, disabling navigation until connection is restored to prevent data loss.

## 11. Integration Points
- **Exam Generator**: Provides the structure and questions for the attempt.
- **Notification System**: Triggers alerts to teachers when exams containing subjective questions are submitted.

## 12. Configuration Options
- **Result Visibility**: Immediate vs. After Exam Window Closes.
- **Strict Navigation**: Prevent returning to previous sections once completed.
- **Proctoring**: Toggle basic browser focus tracking (warns if user switches tabs).

## 13. Future Enhancements
- AI proctoring via webcam and audio monitoring.
- Detailed analytics on time spent per question compared to peer averages.
- Adaptive testing mode where the next question's difficulty depends on the previous answer.
