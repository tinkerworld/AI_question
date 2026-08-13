<Personalized Practice — Functional Specification>
## 1. Overview
The Personalized Practice module leverages the Mastery Engine's analytics to provide adaptive, weakness-based practice sessions. It automatically identifies concepts where a student struggles and generates custom practice papers utilizing varied question types to ensure true conceptual mastery rather than rote memorization.

## 2. User Stories
- As a **Student (Premium)**, I want to automatically receive practice papers focused on my weak areas so that I can improve my exam scores efficiently.
- As a **Student**, I want immediate feedback and explanations during practice so that I can learn from my mistakes in real-time.
- As an **Admin**, I want to restrict this feature to premium users to drive subscription value.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student (Premium) | Student (Free) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Generate Practice Paper | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Weakness Pool | ✅ | ✅ | ✅ | ✅ | ❌ |
| Take Practice Session | ❌ | ❌ | ❌ | ✅ | ❌ |

## 4. Features & Capabilities

### 4.1 Weakness Pool Management
**What it does**: Maintains a dynamic list of concepts a student needs to practice.
**How it works**: After any exam or practice session, incorrectly answered questions are mapped to their core concepts. These concepts are added to the student's Weakness Pool.
**Business Rules**: The pool tracks the concept, the specific question failed, failure count, and last attempt date. It auto-refreshes continuously.

### 4.2 Practice Paper Generation
**What it does**: Creates a customized practice session.
**How it works**: Generates a 20-question paper drawing entirely from the Weakness Pool.
**Business Rules**: 
- Must use DIFFERENT questions than the ones the student originally failed to prevent rote memorization.
- Prioritizes AI-modified variants (if available) or semantic siblings from the Question Bank.
- Progresses in difficulty from easier questions to harder ones.

### 4.3 Adaptive Mastery Confirmation
**What it does**: Verifies that a student has truly understood a concept, not just memorized an answer.
**How it works**: Requires a configurable threshold (e.g., 3 correct answers in a row) on DIFFERENT questions targeting the same concept.
**Example Flow**: Original Question (Failed) -> Practice Q1: Similar (Passed) -> Practice Q2: AI Variation (Passed) -> Practice Q3: New Bank Question (Passed) = STATUS: MASTERED.
**Business Rules**: Once marked as Mastered, the concept is removed from the active Weakness Pool and replaced by the next priority weakness.

### 4.4 Practice Experience & Feedback
**What it does**: The interface for taking the practice paper.
**How it works**: Offers an "Immediate Feedback" mode. Upon answering, the student immediately sees if they were correct, along with the detailed explanation/solution.
**Business Rules**: Practice attempts contribute to the overall Mastery Engine scores but are flagged as 'practice' rather than 'exam' attempts.

## 5. Data Model
```text
Table: student_weakness_pool
├── id (PK, CUID)
├── student_id (FK, CUID)
├── concept_id (FK, CUID)
├── source_failed_question_id (FK, CUID)
├── failure_count (Integer)
├── status (Enum: ACTIVE, MASTERING, MASTERED)
├── consecutive_correct (Integer) — for mastery confirmation
├── last_attempt_at (DateTime)
└── timestamps

Table: practice_sessions
├── id (PK, CUID)
├── student_id (FK, CUID)
├── session_status (Enum: IN_PROGRESS, COMPLETED)
├── total_questions (Integer)
├── correct_count (Integer)
├── started_at (DateTime)
├── completed_at (DateTime)
└── timestamps

Table: practice_session_questions
├── id (PK, CUID)
├── practice_session_id (FK, CUID)
├── question_id (FK, CUID)
├── concept_id (FK, CUID)
├── is_correct (Boolean)
├── time_taken_seconds (Integer)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/practice/weaknesses` | List current active weaknesses | None | `200 OK, Weakness List` | Bearer | Premium Student |
| POST | `/api/practice/generate` | Generate a new practice paper | `{ target_concepts: [...] }` | `200 OK, Session ID` | Bearer | Premium Student |
| GET | `/api/practice/sessions/{id}`| Get practice session questions | None | `200 OK, Question List` | Bearer | Premium Student |
| POST | `/api/practice/submit` | Submit an answer (immediate feedback) | `{ session_id, question_id, option_id }` | `200 OK, Result + Explanation`| Bearer | Premium Student |

## 7. UI Screens & Components
### Screen: Practice Dashboard
**URL**: `/student/practice`
**Layout**: Displays the "Weakness Pool" as a list of concepts needing attention. Prominent "Generate Practice Paper" button. History of past practice sessions.
**Interactive Elements**: Option to select specific concepts to focus on, or let the system auto-select.

### Screen: Practice Interface
**URL**: `/student/practice/{id}`
**Layout**: Distraction-free question view. Progress bar (e.g., "Question 4 of 20"). Mastery progress indicator for the current concept (e.g., 2/3 correct needed).
**Interactive Elements**: Submit Answer button. "Show Explanation" toggle (if in immediate feedback mode). Next Question button.
**States**: Unanswered, Answered (Correct/Incorrect highlighting), Explanation visible.

## 8. Business Rules
1. Practice paper generation must never include the exact question ID that the student previously failed, unless no other questions for that concept exist in the bank.
2. The mastery threshold (consecutive correct answers on different questions) is required to remove a concept from the weakness pool.
3. This module is strictly gated as a Premium feature.

## 9. Validation Rules
- **Generation**: Ensure enough unique questions exist in the bank for the target concepts to form a 20-question paper. If not, gracefully degrade (e.g., 15-question paper) and notify the user.

## 10. Error Handling
- **402 Payment Required**: Free student attempts to access practice features.
- **422 Unprocessable Entity**: Not enough questions in the bank to generate a meaningful practice session for the specific weaknesses.

## 11. Integration Points
- **Mastery Engine**: Feeds data to populate the Weakness Pool. Practice results feed back into the Mastery Engine to update overall proficiency scores.
- **Question Bank & AI Generator**: Sources questions and requests AI-generated variants of failed questions.

## 12. Configuration Options
- **Mastery Threshold**: Admin can set how many consecutive correct answers (e.g., 2, 3, or 5) are required to mark a weakness as Mastered.
- **Paper Length**: Default is 20 questions, can be configured.

## 13. Future Enhancements
- Gamification elements (streaks, badges) for completing practice sessions.
- Spaced repetition scheduling for reviewing mastered concepts before they decay.
</Personalized Practice — Functional Specification>
