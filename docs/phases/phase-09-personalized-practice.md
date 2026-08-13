# Phase 9 — Personalized Practice
## Overview
This phase implements personalized practice functionality, generating adaptive practice papers based on a student's weaknesses identified from their previous exam attempts. It introduces a mastery system requiring consistent correct answers on different variations of the same concept.

## Prerequisites
- Phase 1-5 (Core Exam System)
- Phase 7 (AI Question Generation, for question variations)
- Phase 8 (Exam Analytics & Insights, for tracking failures and weaknesses)

## Features

### Feature 9.1 — Weakness Pool Generation

#### Description
After each exam, the system identifies incorrectly answered questions and maps them to their underlying concepts to build and maintain a weakness pool per student. The pool tracks the concept, last failed question, failure count, and last attempt date.

#### Sub-Features
- Analyzes exam attempts immediately upon completion.
- Extracts concepts from failed questions.
- Creates or updates weakness pool entries per student.
- Deduplicates concepts and increments failure counts.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/students/:id/weakness-pool` | Retrieve the weakness pool for a student | Yes (Student/Admin) |

#### Database Changes
- `weakness_pools` table (student_id, concept_id, last_failed_question_id, failure_count, last_attempt_date, is_active)

#### Frontend Pages/Components
- Weakness pool visualization on student dashboard.

#### Acceptance Criteria
1. Incorrect answers automatically add/update concepts in the student's weakness pool.
2. The weakness pool deduplicates concepts.
3. Failure count accurately reflects the number of times a concept was failed.
4. Active vs. inactive (mastered) concepts are tracked.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P09.F01.U001 | Generate new weakness | Test pool generation on first failure | Exam result with wrong answer | New pool entry created | High |
| P09.F01.U002 | Update existing weakness | Test updating failure count and date | Exam result with wrong answer on existing weak concept | Failure count incremented, date updated | High |
| P09.F01.U003 | Deduplication | Ensure concept isn't duplicated | Multiple wrong answers on same concept in one exam | Only one entry per concept | High |
| P09.F01.U004 | Concept Linking | Verify correct concept is linked | Wrong answer ID | Associated concept extracted and saved | High |
| P09.F01.U005 | Empty result handling | Handle exam with 100% correct answers | Exam with all correct | No updates to weakness pool | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P09.F01.I001 | API pool retrieval | Test GET endpoint for weakness pool | Mock student with weaknesses | GET `/api/students/:id/weakness-pool` | Returns 200 with list of weaknesses | High |
| P09.F01.I002 | Exam attempt trigger | Verify pool updates after exam submission | Complete exam setup | Submit exam with wrong answers, wait for event | Weakness pool is updated | High |
| P09.F01.I003 | Unauthorized access | Test access control | Student A logged in | GET `/api/students/:student_B_id/weakness-pool` | 403 Forbidden | High |

### Feature 9.2 — Personalized Practice Paper Generation

#### Description
Generates a 20-question practice paper targeting a student's specific weaknesses, selecting different questions than the ones originally failed, including AI-modified variants, and structuring difficulty progression.

#### Sub-Features
- Selects concepts from active weakness pool.
- Retrieves unused questions for selected concepts.
- Integrates AI-generated variant questions if available.
- Mixes difficulties (easy to hard progression).

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/practice/generate` | Generate a new practice paper for the user | Yes (Student) |

#### Database Changes
- `practice_papers` table (id, student_id, generated_at, status)
- `practice_paper_questions` table (paper_id, question_id, order, difficulty)

#### Frontend Pages/Components
- "Generate Practice Paper" button/modal.
- Practice paper loading skeleton.

#### Acceptance Criteria
1. Practice paper contains exactly 20 questions (or max available).
2. Questions target concepts from the weakness pool.
3. Does NOT include the exact question that was previously failed.
4. Difficulty progresses from easier to harder.
5. Includes AI-variant questions where possible.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P09.F02.U001 | Question count | Ensure 20 questions are generated | Pool with sufficient questions | Array of 20 questions | High |
| P09.F02.U002 | Difficulty progression | Check sorting by difficulty | Generated paper | Difficulty monotonically increases or follows logic | High |
| P09.F02.U003 | Question exclusion | Ensure previously failed questions aren't picked | Weakness pool with known failed IDs | Generated paper does not contain failed IDs | High |
| P09.F02.U004 | AI variant inclusion | Test inclusion of AI variants | Concept with AI variants | Variants included in output | Medium |
| P09.F02.U005 | Insufficient questions | Handle pool with < 20 questions | Small question bank | Returns all available, handles gracefully | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P09.F02.I001 | API paper generation | Test POST endpoint | Authenticated student | POST `/api/practice/generate` | 201 Created with paper ID and questions | High |
| P09.F02.I002 | DB persistence | Verify paper saved to DB | Valid paper generation request | Generate paper, check DB | Paper and questions saved in DB | High |
| P09.F02.I003 | Missing weaknesses | Handle generation when no weaknesses exist | Student with empty weakness pool | POST `/api/practice/generate` | 400 Bad Request or general practice generated | Medium |

### Feature 9.3 — Adaptive Mastery Confirmation

#### Description
Evaluates answers on practice papers to determine if a student has mastered a concept. Mastery requires a configurable threshold (e.g., 3 consecutive correct answers on DIFFERENT questions of the same concept).

#### Sub-Features
- Tracks consecutive correct answers per concept per student.
- Validates that the questions are different (original, similar, AI variant, bank).
- Updates weakness pool to mark concept as mastered.
- Replaces mastered concepts in active practice with other weak concepts.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| PATCH | `/api/practice/:id/evaluate` | Evaluate practice submission and update mastery | Yes (Student) |

#### Database Changes
- `mastery_tracking` table (student_id, concept_id, consecutive_correct, mastered_at)

#### Frontend Pages/Components
- Mastery celebration UI component.

#### Acceptance Criteria
1. Configurable threshold (e.g., 3) for mastery.
2. Only correct answers on DIFFERENT questions count towards the threshold.
3. Reaching the threshold marks the concept as mastered (inactive in weakness pool).
4. Mastered concepts are replaced by other weaknesses in future practices.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P09.F03.U001 | Increment mastery count | Correct answer on different question | Answer payload | consecutive_correct incremented | High |
| P09.F03.U002 | Reset mastery count | Incorrect answer on concept | Answer payload | consecutive_correct reset to 0 | High |
| P09.F03.U003 | Same question ignored | Correct answer on already answered question | Answer payload (duplicate) | consecutive_correct unchanged | High |
| P09.F03.U004 | Threshold reached | 3rd correct answer on different question | Answer payload | Concept marked as mastered | High |
| P09.F03.U005 | Mastery replacement | Test selection logic after mastery | Weakness pool request | Mastered concept excluded, new one included | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P09.F03.I001 | Full mastery flow | Test consecutive correct answers via API | Student with active weakness | Submit 3 correct different questions via PATCH | Concept marked as mastered in DB | High |
| P09.F03.I002 | Failed mastery flow | Test interrupted streak via API | Streak of 2 correct | Submit incorrect answer | Streak resets to 0 | High |
| P09.F03.I003 | Practice evaluation response | Check API response on evaluation | Submitting practice paper | PATCH `/api/practice/:id/evaluate` | 200 OK, returns updated mastery status | High |

### Feature 9.4 — Practice Attempt Tracking

#### Description
Records and tracks student attempts on practice papers, including question-wise results, time taken, and links to the weakness pool for historical review.

#### Sub-Features
- Record practice session start/end times.
- Track selected answers and correctness per question.
- Link attempt results to weakness pool updates.
- Provide practice history retrieval.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/practice/:id/attempt` | Start/record a practice attempt | Yes (Student) |
| GET | `/api/practice/history` | Retrieve practice history | Yes (Student) |

#### Database Changes
- `practice_attempts` table (id, paper_id, student_id, started_at, completed_at, score)
- `practice_attempt_answers` table (attempt_id, question_id, selected_option, is_correct)

#### Frontend Pages/Components
- Practice history list page.
- Detailed practice attempt view.

#### Acceptance Criteria
1. Practice attempts are successfully recorded with start/end times.
2. Individual question answers and correctness are saved.
3. History API returns a paginated list of past practice attempts.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P09.F04.U001 | Record start | Test attempt initialization | Paper ID | Attempt created with started_at | High |
| P09.F04.U002 | Record answer | Test saving an answer | Attempt ID, question ID, option | Answer saved, correctness calculated | High |
| P09.F04.U003 | Record completion | Test attempt finalization | Attempt ID | completed_at set, score calculated | High |
| P09.F04.U004 | Score calculation | Verify overall score accuracy | Set of answers | Correct score percentage | High |
| P09.F04.U005 | History formatting | Test history data structure | List of attempt records | Formatted history DTO | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P09.F04.I001 | Full attempt lifecycle | Start, answer, and complete attempt | Created practice paper | POST start, POST answers, POST complete | Attempt fully recorded in DB | High |
| P09.F04.I002 | History retrieval | Test GET history endpoint | User with multiple past attempts | GET `/api/practice/history` | 200 OK with paginated attempts | High |
| P09.F04.I003 | History pagination | Test pagination params | User with 20 attempts | GET `/api/practice/history?page=2&limit=5` | 200 OK with correct 5 items | Medium |

### Feature 9.5 — Practice Paper Frontend

#### Description
The user interface for students to view, take, and review practice papers, including a dedicated practice-taking UI and mastery progress indicators.

#### Sub-Features
- Practice paper dashboard (available, in-progress, completed).
- Practice-taking UI (optionally with immediate feedback per question).
- Post-question explanation display.
- Mastery progress indicator per concept.

#### API Endpoints
- N/A (Frontend only, uses above APIs)

#### Database Changes
- N/A

#### Frontend Pages/Components
- `/practice` (Dashboard)
- `/practice/:id/take` (Taking UI)
- `/practice/:id/review` (Review/History UI)
- `MasteryProgressBar` component

#### Acceptance Criteria
1. Students can view available and completed practice papers.
2. Practice taking UI functions correctly (navigation, selection).
3. Immediate feedback mode shows correctness and explanation immediately after answering.
4. Mastery indicator visually updates based on recent performance.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P09.F05.U001 | Mastery UI logic | Render correct progress bar state | Mastery count (0, 1, 2, 3) | Visual matches count | High |
| P09.F05.U002 | Immediate feedback | Test immediate explanation reveal | Answer selection event | Explanation shown, options locked | High |
| P09.F05.U003 | Navigation guard | Prevent accidental exit | Back button click during practice | Warning modal displayed | Medium |
| P09.F05.U004 | Dashboard tabs | Filter by status | Click 'Completed' tab | Only completed papers shown | Medium |
| P09.F05.U005 | Explanation rendering | Render math/LaTeX in explanation | Explanation with LaTeX | Formatted output | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P09.F05.E001 | End-to-end practice flow | Full flow from generation to completion | 1. Click Generate 2. Take practice 3. Submit 4. View review page | Practice completed, history updated | High |
| P09.F05.E002 | Immediate feedback flow | Test immediate feedback mode | 1. Start practice in immediate mode 2. Answer question | Feedback shown instantly, mastery bar updates | High |
| P09.F05.E003 | Mastery achievement E2E | Test UI updating on mastery | 1. Answer 3rd correct 2. View dashboard | Mastery celebration shown, concept removed from active list | High |

## Modularity Checklist
- [ ] All business logic in service layer (not controllers)
- [ ] No cross-module direct database access
- [ ] Shared types used from @repo/types
- [ ] Validation schemas in @repo/validation
- [ ] Module can be extracted to microservice without code changes in other modules
- [ ] All dependencies injected, not imported directly
- [ ] Feature flags / config for optional features

## Upgrade Path
- Lays the foundation for Adaptive Learning Paths (Phase 11).
- Provides data for Advanced AI Tutoring interactions (Phase 12).
- Mastery data can be aggregated for teacher analytics in future updates.

## Definition of Done
- All API endpoints implemented and documented.
- Database schemas migrated.
- Frontend components built and integrated.
- All unit, integration, and E2E tests passing.
- Weakness pool correctly updates after an exam.
- Practice papers successfully generate targeting weaknesses.
- Mastery properly tracks and cycles concepts.
</Phase 9 — Personalized Practice>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 20: Personalized Practice](../specs/20-personalized-practice.md)

### Key Team Role Guidelines
- [Full Stack Engineer](../roles/17-fullstack-engineer.md) — Features 9.1, 9.2, 9.4, 9.5
- [Data Scientist](../roles/27-data-scientist.md) — Feature 9.3
- [QA Engineer](../roles/33-qa-engineer.md) — Practice test cases

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [Data Flow Diagrams](../guides/07-data-flow-diagrams.md)