# Student Profile — Functional Specification

## 1. Overview
The Student Profile is the primary interface for learners using the platform. It provides access to enrolled courses, enables test-taking (exams, mock tests, practice), and offers comprehensive, personalized analytics driven by AI to track proficiency, identify weaknesses, and recommend targeted practice.

## 2. User Stories
- As a Student, I want to access my enrolled courses and syllabus so that I know what to study.
- As a Student, I want to take timed examinations and mock tests so that I can evaluate my preparedness.
- As a Student, I want to view detailed results with question-wise breakdowns so that I can understand my mistakes.
- As a Student, I want to see my strengths (GREEN/BLUE) and weaknesses (RED/ORANGE) mapped to the syllabus so that I can focus my revision.
- As a Student, I want to take personalized practice papers targeting my weak areas so that I can improve efficiently.
- As a Student, I want to use AI features (like AI interviews) to prepare for viva-voce or specialized exams.
- As a Student, I want to review previous attempts and track my mastery progress over time.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Take Exams/Mock Tests | ❌ | ❌ | ❌ | ✅ | ✅ |
| View Own Results | ❌ | ❌ | ❌ | ✅ | ✅ |
| Access AI Features | ❌ | ❌ | ❌ | ✅ (Tiered) | ⚙️ |
| View Syllabus Map | ❌ | ❌ | ❌ | ✅ | ✅ |
| Purchase AI Credits | ❌ | ❌ | ❌ | ✅ | ❌ |

## 4. Features & Capabilities

### 4.1 Course & Syllabus Access
**What it does**: Displays the curriculum the student is enrolled in.
**How it works**: Students view their courses and can drill down into the syllabus tree. The syllabus is color-coded based on proficiency (determined by historical test data).
**Business Rules**: Syllabus nodes with no data are gray. Proficiency requires at least 3 attempted questions in that node to generate a color score.
**Edge Cases**: Enrolling mid-term recalculates proficiency based only on available data.

### 4.2 Examination & Test Taking
**What it does**: The core assessment engine for full exams, mock tests, and practice.
**How it works**: 
1. **Access**: Student clicks an active exam.
2. **Instructions**: Displays rules, duration, negative marking. Student must accept.
3. **Timer**: Secure testing interface launches with a countdown.
4. **Answer**: Navigation grid, clear response, mark for review.
5. **Submit**: Auto-submit on timeout, or manual submit with confirmation.
6. **Result**: Immediate or delayed release based on exam settings.
**Business Rules**: If disconnected, the timer continues on the server. On reconnect, the student resumes from the server's time state.
**Edge Cases**: Submitting at the exact moment of timeout is handled gracefully by server-side acceptance.

### 4.3 Analytics & Proficiency Mapping
**What it does**: Provides deep insights into performance.
**How it works**: 
- **Strengths**: Topics with >75% accuracy (BLUE/GREEN).
- **Weaknesses**: Topics with <40% accuracy (RED/ORANGE).
- **Syllabus Map**: A visual tree or heat map of the syllabus based on the above metrics.
- **Progress Tracking**: Line charts showing mastery over time.
**Business Rules**: Analytics are updated asynchronously after every test submission.
**Edge Cases**: Questions unlinked from the syllabus fall into an "Uncategorized" bucket for analytics.

### 4.4 Personalized Practice
**What it does**: Generates custom practice sets based on weakness data.
**How it works**: The student requests a practice session. The system queries the question bank for questions tagged to the student's RED/ORANGE topics.
**Business Rules**: Excludes questions the student has answered correctly in the last 30 days.

### 4.5 AI Features & Interviews
**What it does**: Advanced interactive learning tools based on subscription.
**How it works**: 
- **AI Interview**: Conducts a voice/text chat simulating an oral exam (practice and exam mode).
- **Recommendations**: Recommends specific video links or topics based on test failures.
**Business Rules**: Requires active subscription or AI credits. Credits are deducted per session.
**Edge Cases**: If credits run out mid-session, the session concludes gracefully without losing data.

### 4.6 Subscription & Credit Management
**What it does**: Manages monetization of premium features.
**How it works**: Students can view their current plan, see remaining AI credits, and purchase top-ups via a payment gateway.

## 5. Data Model
```
Table: enrollments
├── id (PK, CUID)
├── user_id (FK, users.id)
├── course_id (FK, courses.id)
└── timestamps

Table: exam_attempts
├── id (PK, CUID)
├── exam_id (FK, exams.id)
├── user_id (FK, users.id)
├── start_time (DateTime)
├── end_time (DateTime)
├── score (Decimal)
├── status (Enum: in_progress, completed, abandoned)
└── timestamps

Table: student_responses
├── id (PK, CUID)
├── attempt_id (FK, exam_attempts.id)
├── question_id (FK, questions.id)
├── selected_option (JSON)
├── is_correct (Boolean)
├── time_taken_seconds (Int)
└── timestamps

Table: proficiency_metrics
├── user_id (FK, users.id)
├── syllabus_node_id (FK, syllabus_nodes.id)
├── proficiency_score (Decimal 0-100)
├── total_attempted (Int)
└── updated_at (DateTime)

Table: user_credits
├── user_id (PK)
├── ai_credits_balance (Int)
└── subscription_tier (Enum: basic, pro, elite)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/v1/dashboard/student` | Get summary stats | None | `DashboardData` | Bearer | `dashboard.read` |
| GET | `/api/v1/exams/active` | List available exams | None | `ExamList[]` | Bearer | `exams.read` |
| POST | `/api/v1/attempts/start` | Begin attempt | None | `AttemptToken` | Bearer | `exams.attempt` |
| PUT | `/api/v1/attempts/sync` | Sync answers | `AnswerPayload` | `Ack` | Bearer | `exams.attempt` |
| GET | `/api/v1/mastery/map` | Get color-coded map | None | `ProficiencyTree`| Bearer | `mastery.read` |
| POST | `/api/v1/practice/generate` | Generate weak-topic test| None | `ExamObject` | Bearer | `practice.create` |
| POST | `/api/v1/interviews/sessions` | Start AI interview | `{mode}` | `SessionData` | Bearer | `interviews.create` |

## 7. UI Screens & Components
### Screen: Student Dashboard
**URL**: `/student/dashboard`
**Layout**: Modular widget grid: My Courses, My Exams, My Practice, My Weaknesses, My Strengths, My Syllabus, AI Interview, My Progress.
**Interactive Elements**: 
- **My Courses**: Quick links to course content.
- **My Exams**: Alerts for upcoming/active tests.
- **My Practice**: Quick start button for customized practice.
- **My Weaknesses/Strengths**: Top 3 topics in red/green.
- **My Syllabus**: Link to full heat map.
- **AI Interview**: Entry point for AI viva.
- **My Progress**: Mini sparkline chart of recent scores.
**States**: Empty states prompt user to take a diagnostic test.

### Screen: Test Interface
**URL**: `/student/attempt/:id`
**Layout**: Minimalist, distraction-free. Question main area. Right sidebar with question palette (color-coded: Answered, Not Answered, Marked for Review). Top bar with timer.
**Interactive Elements**: Radio buttons/inputs, Clear Response, Save & Next, Mark for Review.
**States**: Warning modal on attempt to exit full screen.

### Screen: Result Analysis
**URL**: `/student/results/:attemptId`
**Layout**: Score summary at top. Tabs for "Overview", "Question Analysis", "Subject Analysis".
**Interactive Elements**: Expandable rows to view the specific question, chosen answer, correct answer, and explanation.
**States**: Confetti animation on high score.

## 8. Business Rules
1. A student cannot start an exam outside its scheduled window.
2. Concurrent logins attempting to take the same exam invalidate previous sessions.
3. AI features strictly validate credit balance before initiating.
4. Personalized practice is disabled if the user does not have sufficient attempt history to determine weaknesses.

## 9. Validation Rules
- Sync payloads during an exam must include valid attempt tokens and question IDs.
- Time spent on a question cannot exceed the time elapsed since the last sync.

## 10. Error Handling
- **Network Disconnects**: UI caches answers locally and retries syncing silently. If submission fails, provides a downloadable encrypted file of responses to email to support.
- **Invalid Exam State**: Attempting to resume a completed exam returns `403 Forbidden`.
- **Insufficient Credits**: AI features throw `402 Payment Required`.

## 11. Integration Points
- Feeds data back to the Analytics Engine which updates the Teacher Profile reports.
- Payment gateway integration for AI credits.

## 12. Configuration Options
- Admins can toggle strict mode (e.g., disabling copy-paste, tracking tab switches) for specific exams.

## 13. Future Enhancements
- Gamification (badges, leaderboards).
- Peer-to-peer challenge matches on specific topics.
