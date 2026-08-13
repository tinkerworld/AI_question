# Phase 6 — Exam System
## Overview
This phase handles the student-facing execution of exams and the auto-evaluation engine. It encompasses the actual test-taking interface, session management, answer submission, and automated grading.

## Prerequisites
- Phase 5 (Exam Generator) completed
- Student user roles available
- Authentication and session management functional

## Features

### Feature 6.1 — Student Exam Access

#### Description
Controls how and when students can see and access scheduled exams based on enrollment and time windows.

#### Sub-Features
- View available exams (scheduled, open)
- Enrollment-based access control
- Exam instructions page before start

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/student/exams` | List available exams for student | Student |
| GET | `/api/student/exams/:id/instructions` | Get exam instructions | Student |

#### Database Changes
- `exam_enrollments` table (if explicit enrollment is needed, else query via course/cohort)

#### Frontend Pages/Components
- Student Dashboard (Exam Listing)
- Exam Instructions / Pre-start Page

#### Acceptance Criteria
1. Students only see exams they are eligible for.
2. Exams are only accessible within their scheduled start/end times.
3. Students must view instructions before starting an attempt.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F01.U001 | Access Eligibility | Check if student matches exam target | Student ID, Exam Rules | Boolean true/false | High |
| P06.F01.U002 | Time Window Valid | Check if current time is in window | Current time, Exam times | Boolean | High |
| P06.F01.U003 | Time Window Future | Check if exam is upcoming | Current time, Future start | Returns 'UPCOMING' | High |
| P06.F01.U004 | Time Window Past | Check if exam is expired | Current time, Past end | Returns 'EXPIRED' | High |
| P06.F01.U005 | Instruction Read | Fetch instructions | Exam ID | Markdown/HTML payload | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P06.F01.I001 | List API | Test exam listing API | Student enrolled in Course A | GET /api/v1/student/exams | Returns only Course A exams | High |
| P06.F01.I002 | Access Block API | Try accessing restricted exam | Student not enrolled | GET /api/v1/student/exams/:id | 403 Forbidden | High |
| P06.F01.I003 | Early Access Block | Try accessing future exam | Exam starts tomorrow | GET /api/v1/student/exams/:id/start | 403 Forbidden | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F01.E001 | Find and Start Flow | Student navigates to exam | 1. Login. 2. See active exam. 3. Click Read Instructions. | Instructions display properly | High |


### Feature 6.2 — Exam Attempt Session

#### Description
Manages the secure test-taking session, including timers, navigation, state saving, and ensuring single/limited attempts.

#### Sub-Features
- Start attempt (creates `exam_attempt` record)
- Timer (countdown with server-side validation)
- Question navigation (next/prev, question palette)
- Answer submission per question
- Mark for review
- Auto-save answers periodically

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/attempts/start` | Starts an exam attempt | Student |
| GET | `/api/attempts/:id/state` | Retrieves current attempt state | Student |
| POST | `/api/attempts/:id/sync` | Auto-saves/syncs answers | Student |

#### Database Changes
- `exam_attempts` table added (tracks start time, end time, status).
- `attempt_answers` table added.

#### Frontend Pages/Components
- Exam Player Container
- Timer Component
- Question Palette (Grid of Q numbers with statuses)

#### Acceptance Criteria
1. Starting an exam creates a secure session bound to the user.
2. Timer counts down accurately and syncs with server.
3. Students can navigate between questions freely (unless configured otherwise).
4. Answers auto-save to the server periodically and on navigation.
5. Server enforces time limits (rejects answers after expiry).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F02.U001 | Init Attempt | Create attempt record | Student ID, Exam ID | Attempt object, status IN_PROGRESS | High |
| P06.F02.U002 | Enforce Max Attempts | Check attempt limit | Exam with 1 attempt max | Rejects 2nd attempt | High |
| P06.F02.U003 | Timer Validation | Server checks if time remains | Server time vs Attempt start | Boolean | High |
| P06.F02.U004 | Sync Answer State | Update answer in state | Q ID, Answer data | State updated | High |
| P06.F02.U005 | Mark for Review | Toggle review flag | Q ID | Flag toggled | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P06.F02.I001 | Start API | Test attempt start | Valid student/exam | POST /api/v1/attempts/start | 201 Created with Attempt ID | High |
| P06.F02.I002 | Sync API | Test auto-save | Active attempt | POST /api/v1/attempts/:id/sync | 200 OK, DB updated | High |
| P06.F02.I003 | Expired Sync | Sync after time expires | Expired attempt | POST /api/v1/attempts/:id/sync | 403 Forbidden/Expired | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F02.E001 | Session Continuity | Refresh page during exam | 1. Start exam. 2. Answer Q1. 3. Refresh page. | Timer resumes, Q1 answer restored | High |
| P06.F02.E002 | Navigation & Palette | Test palette states | 1. Answer Q1. 2. Mark Q2 for review. | Palette shows Q1 answered, Q2 review | Medium |


### Feature 6.3 — Answer Submission & Types

#### Description
Handling the diverse set of question types during the exam, ensuring inputs are captured, validated, and stored appropriately.

#### Sub-Features
- MCQ: single selection
- Multiple-select: multi selection
- True/False: boolean
- Fill-in-blank: text input
- Numerical: number with tolerance
- Short answer: text
- Subjective: rich text
- Matching: drag-and-match

#### API Endpoints
(Handled mostly by the Sync API in 6.2, but payload validation differs)

#### Database Changes
- `attempt_answers` column `answer_data` (JSONB) to store diverse formats.

#### Frontend Pages/Components
- QuestionRenderer (dynamically loads specific component)
- MCQComponent, MultiSelectComponent, SubjectiveComponent, etc.

#### Acceptance Criteria
1. Frontend correctly renders the appropriate input mechanism for each Q type.
2. Backend correctly validates the incoming answer payload matches the Q type schema.
3. Complex types (Matching) store state reliably.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F03.U001 | Validate MCQ | Check MCQ payload | Single string/ID | Passes validation | High |
| P06.F03.U002 | Validate MultiSelect | Check multi-select payload | Array of strings/IDs | Passes validation | High |
| P06.F03.U003 | Validate Numerical | Check numerical payload | Number | Passes validation | High |
| P06.F03.U004 | Reject Invalid Format | Wrong format for Q type | String for MultiSelect | Throws ValidationError | High |
| P06.F03.U005 | Store Subjective | Handle large text payload | Rich text string | Stored correctly | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P06.F03.I001 | Sync Mixed Types | Send payload with multiple types | Active attempt | POST sync with varied answers | 200 OK | High |
| P06.F03.I002 | Malformed Payload | Send garbage data | Active attempt | POST sync with invalid JSON | 400 Bad Request | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F03.E001 | Interact All Types | User answers one of each type | 1. Click MCQ. 2. Type FIB. 3. Drag Match. | UI responds, data synced | High |


### Feature 6.4 — Exam Completion

#### Description
The process of concluding an exam attempt, either manually by the student or automatically when time expires.

#### Sub-Features
- Manual submit
- Auto-submit on timer expiry
- Confirmation dialog before submit
- Cannot modify after submission

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| POST | `/api/attempts/:id/submit` | Finalizes the exam attempt | Student |

#### Database Changes
- Update `status` to SUBMITTED or EVALUATING in `exam_attempts`.
- Set `end_time` to actual completion time.

#### Frontend Pages/Components
- Submit Confirmation Modal (shows unanswered count)
- Success Page (post-submission)

#### Acceptance Criteria
1. Student is warned if they have unanswered questions before manual submit.
2. Exam auto-submits exactly when the timer hits zero.
3. No answers can be modified via API after submission.
4. Prevents duplicate submission requests.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F04.U001 | Submit Attempt | Change state to submitted | Attempt ID | State = SUBMITTED | High |
| P06.F04.U002 | Prevent Double Submit | Submit already submitted attempt | Submitted Attempt ID | Throws Error | High |
| P06.F04.U003 | Lock Answers | Try updating answer post-submit | Submitted Attempt ID | Throws Error | High |
| P06.F04.U004 | Calculate Unanswered | Count unanswered Qs | Attempt data | Correct count returned | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P06.F04.I001 | API Submit | Test manual submit | Active attempt | POST /submit | 200 OK, status updated | High |
| P06.F04.I002 | API Post-Submit Edit | Try syncing after submit | Submitted attempt | POST /sync | 403 Forbidden | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F04.E001 | Manual Submit Flow | Student finishes early | 1. Answer Qs. 2. Click Submit. 3. Confirm. | Success screen | High |
| P06.F04.E002 | Auto Submit | Timer runs out | 1. Wait for timer 0. | Auto-submits, redirects to Success | High |


### Feature 6.5 — Auto-Evaluation Engine

#### Description
Background or synchronous process that grades objective questions immediately upon exam submission.

#### Sub-Features
- Automatic grading for: MCQ, Multiple-Select, True/False, Fill-in-Blank, Numerical
- Partial marking for multiple-select (configurable)
- Negative marking application
- Subjective questions flagged for manual review

#### API Endpoints
(Internal service, no public endpoints unless triggering a bulk re-evaluation)

#### Database Changes
- `marks_obtained`, `is_correct` added to `attempt_answers`.

#### Frontend Pages/Components
- N/A (Backend engine)

#### Acceptance Criteria
1. Engine correctly compares student answers to the answer key.
2. Applies correct marks for right answers.
3. Applies negative marks for wrong answers (if configured).
4. Partial marking correctly applied for multiple-select.
5. Numerical answers correctly evaluated within tolerance bounds.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F05.U001 | Evaluate MCQ | Check exact match | Student: A, Key: A | Marks = Full | High |
| P06.F05.U002 | Evaluate MCQ Wrong | Check negative marks | Student: B, Key: A | Marks = Negative | High |
| P06.F05.U003 | Evaluate Multi (Partial) | Check partial scoring | Student: A, Key: A,B | Marks = 50% | High |
| P06.F05.U004 | Evaluate Numerical | Check tolerance | Student: 5.1, Key: 5.0 (tol 0.2)| Marks = Full | High |
| P06.F05.U005 | Flag Subjective | Check subjective logic | Subjective answer | Status = PENDING_REVIEW | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P06.F05.I001 | Engine Run | Run engine on attempt | Submitted attempt | Call EvaluateService | DB updated with marks per answer | High |
| P06.F05.I002 | Engine Missing Key | Handle missing answer key | Exam with missing key | Engine throws config error | Medium |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F05.E001 | Full Auto-Grade | Submit and check marks | 1. Submit exam. 2. Admin checks. | Attempt shows evaluated | High |


### Feature 6.6 — Result Generation

#### Description
Calculates the final aggregates for an evaluated attempt.

#### Sub-Features
- Score calculation per section and total
- Percentage and grade calculation
- Question-wise breakdown (correct/wrong/unanswered)
- Comparison with answer key

#### API Endpoints
(Calculated automatically post-evaluation)

#### Database Changes
- `total_score`, `percentage`, `grade` added to `exam_attempts`.

#### Frontend Pages/Components
- N/A (Backend logic)

#### Acceptance Criteria
1. Total score is accurately summed (accounting for negatives).
2. Section-wise scores are calculated correctly.
3. Breakdown of counts (Correct, Wrong, Skipped) is accurate.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F06.U001 | Aggregate Total | Sum all answer marks | Array of evaluated answers | Correct Total Score | High |
| P06.F06.U002 | Section Totals | Sum by section | Answers grouped by section | Correct Section Scores | High |
| P06.F06.U003 | Calculate Percentage | (Score/Max) * 100 | Score: 45, Max: 50 | 90% | High |
| P06.F06.U004 | Stats Breakdown | Count C/W/U | Evaluated answers | C: 3, W: 1, U: 1 | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P06.F06.I001 | Complete Grading Pipeline | Auto-Eval + Result Gen | Submitted attempt | Trigger pipeline | Final scores saved in attempt | High |


### Feature 6.7 — Result Display & Review

#### Description
Allows students to view their performance and review the answers (if permitted by exam rules).

#### Sub-Features
- Result summary page (score, percentage)
- Detailed question-wise review
- Show correct answer, student answer, explanation
- Section-wise performance

#### API Endpoints
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/attempts/:id/result` | Fetch result summary | Student |
| GET | `/api/attempts/:id/review` | Fetch detailed review | Student |

#### Database Changes
- None

#### Frontend Pages/Components
- Result Dashboard
- Detailed Review Viewer (similar to player but read-only with highlights)

#### Acceptance Criteria
1. Student sees accurate final score.
2. Review mode clearly highlights correct vs incorrect answers.
3. Explanations for answers are displayed.
4. Review access respects exam settings (e.g., "Hide results until X date").

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F07.U001 | Result Payload | Construct result data | Attempt record | Formatted summary JSON | High |
| P06.F07.U002 | Review Access Rules | Check if review is allowed | Exam config | Boolean | High |
| P06.F07.U003 | Mask Answers | Mask keys if review hidden | Review payload, Config | Keys stripped from JSON | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P06.F07.I001 | API Get Result | Test result fetch | Evaluated attempt | GET result | 200 OK, Score data | High |
| P06.F07.I002 | API Get Review | Test review fetch | Evaluated attempt | GET review | 200 OK, Q details | High |
| P06.F07.I003 | Review Blocked | Attempt review when hidden | Hidden config | GET review | 403 Forbidden | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F07.E001 | View Results | Student checks score | 1. Go to Past Exams. 2. Click Result. | Dashboard shows score | High |
| P06.F07.E002 | Review Answers | Student reviews mistakes | 1. Click Detailed Review. 2. Scroll Qs. | Incorrect Qs marked Red | Medium |


### Feature 6.8 — Exam-Taking Frontend

#### Description
The cohesive Single Page Application (SPA) experience for taking the test.

#### Sub-Features
- Full exam-taking UI with timer, question palette, section tabs
- Answer input components per question type
- Mark for review toggle
- Submit confirmation modal
- Result display page
- Question review page

#### API Endpoints
- N/A

#### Database Changes
- N/A

#### Frontend Pages/Components
- Exam Layout Wrapper (disables normal navigation, prevents accidental exits)
- Network resilience handling (offline detection)

#### Acceptance Criteria
1. UI is responsive and works on standard devices (Desktop, Tablet).
2. Warns user if internet connection is lost.
3. Prevents accidental tab closure (beforeunload event).
4. Provides clear visual feedback on saved answers.

#### Test Cases
(Covered largely by E2E tests in previous sections)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P06.F08.E001 | Offline Handling | Test network drop | 1. Start. 2. Disconnect net. 3. Answer. | UI shows "Offline", queues sync | High |
| P06.F08.E002 | Accidental Close | Test tab close warning | 1. Start. 2. Close tab. | Browser warning appears | High |

## Modularity Checklist
- [x] All business logic in service layer (not controllers)
- [x] No cross-module direct database access
- [x] Shared types used from @repo/types
- [x] Validation schemas in @repo/validation
- [x] Module can be extracted to microservice without code changes in other modules
- [x] All dependencies injected, not imported directly
- [x] Feature flags / config for optional features

## Upgrade Path
Sets the foundation for future Proctoring modules (Phase 7). The evaluation engine is designed to be extensible to AI grading for subjective questions later.

## Definition of Done
- Exam taking UI is built and fully responsive.
- Session and timer management is secure.
- Auto-evaluation accurately grades objective questions.
- Result generation and review displays are functioning.
- Extensive tests (Unit, Integration, E2E) pass.
- Code reviewed and merged into main branch.
</Phase 6 — Exam System>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 17: Exam System](../specs/17-exam-system.md)
- [Spec 04: Student Profile](../specs/04-student-profile.md)
- [Spec 29: Entity Versioning & Rollback Engine](../specs/29-entity-versioning-rollback.md)

### Key Team Role Guidelines
- [Frontend Engineer](../roles/15-frontend-engineer.md) — Features 6.1, 6.2, 6.3, 6.7, 6.8
- [Backend Engineer](../roles/16-backend-engineer.md) — Features 6.2, 6.3, 6.4, 6.5, 6.6
- [Performance Engineer](../roles/36-performance-engineer.md) — High-throughput attempt testing
- [SRE](../roles/40-sre.md) — High-availability exam window monitoring

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [API Reference Catalog](../guides/02-api-reference.md)
- [Performance Benchmarks & SLAs](../guides/14-performance-benchmarks.md)