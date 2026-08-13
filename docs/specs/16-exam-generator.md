# Exam Generator — Functional Specification

## 1. Overview
The Exam Generator is the engine that produces actual exam papers by combining an Exam Pattern with the Question Bank. It selects questions according to defined rules, balances the paper, prevents unintended duplication, and outputs a structured exam ready for student consumption. It supports automatic, manual, and hybrid selection modes.

## 2. User Stories
- As a Teacher, I want to automatically generate a midterm exam from a pattern so that I save time on manual selection.
- As a Sub-Admin, I want to manually review and swap specific questions in an auto-generated draft to ensure perfect quality.
- As a Teacher, I want to create a quick quiz without a pattern by manually picking questions from the bank.
- As an Admin, I want the system to prevent recently used questions from appearing in newly generated exams to maintain security.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| Generate from Pattern | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manual Exam Creation | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Draft Exam | ✅ | ✅ | ✅ | ❌ | ❌ |
| Publish Exam | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| View Generated Exams | ✅ | ✅ | ✅ | ✅ | ❌ |

## 4. Features & Capabilities

### 4.1 Exam Generation Process
**What it does**: Executes the creation of an exam instance based on rules.
**How it works**:
1. Reads Pattern rules.
2. Queries the Question bank based on topic, difficulty, and type filters.
3. Selects questions based on the chosen selection mode.
4. Balances the selection.
5. Creates a draft exam paper.
**Business Rules**: The generated exam must strictly adhere to all constraints defined in the pattern.
**Edge Cases**: If insufficient questions exist, the process fails gracefully, indicating exactly which criteria could not be met.

### 4.2 Selection Modes
**What it does**: Determines how questions are picked from the pool of valid options.
**How it works**:
- **Random Selection**: Algorithm randomly picks questions satisfying the constraints.
- **Controlled (Manual)**: User is presented with valid options and manually selects each question.
- **Hybrid**: System auto-selects, but user can manually swap specific questions later.
**Business Rules**: Random selection must use a uniform distribution among eligible questions to ensure variety.
**Edge Cases**: In controlled mode, the user cannot proceed until the exact required number of questions is selected.

### 4.3 Balancing Algorithms
**What it does**: Ensures the random selection doesn't result in skewed papers (e.g., all "Easy" questions coming from a single topic).
**How it works**: The algorithm stratifies the selection:
- **Topic Balancing**: Ensures topics are spread across difficulties.
- **Difficulty Balancing**: Maintains the overall pattern percentage.
- **Marks Balancing**: Ensures mark distribution is even if variable marks are used.
- **Type Balancing**: Distributes MCQ, True/False, etc., evenly.
**Business Rules**: The balancer prioritizes topic constraints first, then difficulty.

### 4.4 Duplicate Prevention
**What it does**: Ensures exam integrity.
**How it works**:
- Enforces uniqueness within the generated exam (no duplicate questions across sections).
- Optional setting: "Exclude questions used in the last X days for this class."
**Business Rules**: Exact duplicate IDs are excluded.
**Edge Cases**: If duplicate prevention causes insufficient questions, the system prompts the user to relax the rule.

### 4.5 Draft Exam Inspection & Editing
**What it does**: Allows review and modification of the generated paper before finalizing.
**How it works**: Users view the draft exam, showing questions, order, marks, and answers. They can:
- Swap a question (opens a modal to pick a replacement meeting the same criteria).
- Regenerate a whole section.
- Drag-and-drop to manually reorder questions.
**Business Rules**: Swapped questions must meet the original pattern criteria for that slot (e.g., must be a Hard Mechanics MCQ).
**Edge Cases**: If no replacement questions exist, the swap action is disabled.

### 4.6 Manual Exam Creation (No Pattern)
**What it does**: Bypasses patterns for ad-hoc assessments.
**How it works**: User creates an exam, adds sections manually, and searches/adds questions directly from the bank.
**Business Rules**: Marks and totals are calculated from the selected questions.
**Edge Cases**: Mixing question types with different default marks requires manual verification by the creator.

### 4.7 Exam Metadata Configuration
**What it does**: Sets the operational parameters for the exam instance.
**How it works**: User defines: Name, Instructions, Duration (inherited from pattern but editable), Schedule (Start/End datetimes), and Access Rules (specific classes or student groups).
**Business Rules**: Start time must be in the future. End time must be > Start time + Duration.

### 4.8 Question & Option Shuffling per Attempt
**What it does**: Shuffles question sequence and MCQ option sequence per student attempt to preserve academic integrity.
**How it works**: When a student initializes an attempt, a deterministic `shuffle_seed` is generated and saved on the `exam_attempts` record. The UI and evaluation services pass `shuffle_seed` plus canonical question IDs to a pseudo-random permutation algorithm.
**Business Rules**: The shuffle algorithm is 100% deterministic. Given `shuffle_seed` and canonical question/option indices, the exact presented order is reconstructed for post-exam review, grading, or audit.
**Edge Cases**: Questions with sequential dependency (e.g., passage-based comprehension groups) retain internal group ordering while shuffling top-level blocks.

## 5. Data Model
```
Table: exams
├── id (PK, CUID)
├── pattern_id (FK, optional)
├── name (String)
├── instructions (Text)
├── duration_minutes (Int)
├── total_marks (Decimal)
├── start_time (DateTime)
├── end_time (DateTime)
├── status (Enum) — DRAFT, PUBLISHED, COMPLETED
├── created_by (FK)
└── timestamps

Table: exam_sections
├── id (PK, CUID)
├── exam_id (FK)
├── name (String)
├── order (Int)
├── total_marks (Decimal)
├── correct_marks (Decimal)
├── negative_marks (Decimal)
└── timestamps

Table: exam_questions
├── id (PK, CUID)
├── exam_section_id (FK)
├── question_id (FK) — Ref to Question Bank
├── order (Int)
├── correct_marks (Decimal) — Overrides section if set
├── negative_marks (Decimal)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| POST | `/api/exams/generate` | Generate from pattern | pattern_id, rules | Draft exam object | Bearer | Generate Exam |
| POST | `/api/exams` | Create manual exam | metadata | Exam object | Bearer | Manual Create |
| GET | `/api/exams/:id/draft` | Get draft details | - | Full exam structure | Bearer | Edit Draft |
| POST | `/api/exams/:id/questions/swap` | Swap question | old_id, new_id | Updated section | Bearer | Edit Draft |
| PUT | `/api/exams/:id/reorder` | Reorder questions | section_id, new_order | Success status | Bearer | Edit Draft |
| POST | `/api/exams/:id/publish` | Finalize exam | metadata | Status update | Bearer | Publish Exam |

## 7. UI Screens & Components
### Screen: Generation Setup
**URL**: `/admin/exams/generate`
**Layout**: Wizard format. Step 1: Select Pattern. Step 2: Configure Rules (duplicate prevention, schedule). Step 3: Generating loading state.
**Interactive Elements**: Pattern dropdown, date pickers, toggles for rules.
**States**: Progress bar during generation, error summary if insufficient questions.

### Screen: Draft Inspector
**URL**: `/admin/exams/draft/:id`
**Layout**: Left sidebar for sections, main area for question list.
**Interactive Elements**: "Swap" button on each question. Drag handles for reordering. "Regenerate Section" button. "Publish" CTA.
**States**: Swap modal with filtered question bank search.

## 8. Business Rules
1. A published exam cannot have its questions modified if the start time has passed or students have enrolled.
2. Swapping a question in a pattern-generated exam must strictly respect the original constraints (topic, difficulty, type) of the replaced question.
3. Random generation must use a non-deterministic seed.

## 9. Validation Rules
- `start_time`: Must be later than current time on publish.
- `duration_minutes`: Must be > 0.
- `new_id` (swap): Must exist in question bank and not already be in the exam.

## 10. Error Handling
- `InsufficientQuestionsError`: Returned during generation if the bank cannot satisfy the pattern. Contains an array of unsatisfied constraints.
- `ScheduleConflictError`: If start/end times conflict with duration.

## 11. Integration Points
- **Exam Pattern**: Consumes patterns as blueprints.
- **Question Bank**: Queries for questions and retrieves full question data.
- **Exam System (Student)**: Provides the finalized exam data for students to attempt.

## 12. Configuration Options
- Set maximum allowed days for the "recently used" exclusion rule.
- Define default instructions for all exams.

## 13. Future Enhancements
- AI-driven balancing that predicts average time-to-complete based on historical question data.
- Automated generation of multiple unique sets (Set A, Set B) with equivalent difficulty profiles.
