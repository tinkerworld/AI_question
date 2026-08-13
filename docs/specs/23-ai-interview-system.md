# AI Interview System — Functional Specification

## 1. Overview
The AI Interview System is a comprehensive module for conducting automated, conversational spoken exams and practice sessions. It utilizes Speech-to-Text (STT), Text-to-Speech (TTS), and LLMs (via the AI Gateway) to simulate a natural interviewer. The system dynamically follows a predefined structure (topics, questions, follow-ups), evaluates student responses against configurable rubrics, and provides detailed actionable feedback based on specific language or technical skills.

## 2. User Stories
- As a Teacher, I want to create Interview Templates with specific topics and rubrics so that students can practice standardized speaking exams (like IELTS).
- As a Premium Student, I want to practice interviews on custom topics so that I can prepare for specific job interviews.
- As a Student, I want to engage in a spoken conversation with an AI that feels natural but stays on track, so that I can improve my fluency.
- As a Student, I want detailed feedback on my grammar and vocabulary after the session so that I know what to study.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Premium Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Create Interview Templates | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configure Rubrics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Take Standard Interviews | ❌ | ❌ | ❌ | ✅ | ✅ |
| Take Custom Interviews | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Interview History | ✅ | ✅ | ✅ | ✅ (Own) | ✅ (Own) |

## 4. Features & Capabilities

### 4.1 Interview Templates & Topics
**What it does**: Defines the structure and evaluation criteria for an interview.
**How it works**: Teachers create templates defining the course, a set of predefined topics (e.g., IELTS: Personal Info, Education), duration, and select a grading rubric. Premium students can bypass templates to input custom topics.
**Business Rules**: EXAM mode uses strict templates. PRACTICE mode allows topic selection and custom topics (for premium).

### 4.2 Conversation Flow Control
**What it does**: Ensures the AI acts as an interviewer, not a generic chatbot.
**How it works**: The application maintains state.
Flow: Main Topic → Ask Question → Student Answers via audio (STT) → AI evaluates answer internally → AI generates 1-2 follow-up questions based on answer → Student Answers → Return to Main Flow → Next Topic.
**Business Rules**: Follow-up count is configurable per template (default 1-2). The AI must yield speaking time to the student and never provide long monologues.

### 4.3 STT, TTS, & Live Interaction
**What it does**: Handles the audio interface.
**How it works**: The browser captures microphone audio, sends to Gateway STT. The text is passed to the LLM to generate the interviewer's response. The response is sent to Gateway TTS, which streams audio back to the user.
**Business Rules**: Session pauses if disconnected. Credit/tokens are refunded if the session crashes due to system error.

### 4.4 Assessment Engine & Feedback Generation
**What it does**: Grades the interview and provides feedback.
**How it works**: At session end, the entire transcript is sent to the LLM with the associated Rubric. 
Evaluates criteria: Fluency, Vocabulary, Grammar, Pronunciation (via STT confidence/hints), Relevance, Coherence, Response Development.
Generates: Top 3 Strengths, 5 Things to Improve, detailed per-criterion scores.
**Business Rules**: Students can select a "Skill Focus" pre-interview to get deeper feedback in one area.

## 5. Data Model
```
Table: interview_templates
├── id (PK, CUID)
├── title (String)
├── course_id (FK, CUID)
├── duration_minutes (Int)
├── rubric_config (JSON)
├── max_follow_ups (Int)
└── timestamps

Table: interview_sessions
├── id (PK, CUID)
├── user_id (FK, CUID)
├── template_id (FK, CUID, Nullable)
├── mode (Enum) — PRACTICE, EXAM
├── status (Enum) — LOBBY, IN_PROGRESS, COMPLETED, ABORTED
├── state (JSON) — Current topic, questions asked, follow-ups
├── start_time (Timestamp)
└── end_time (Timestamp)

Table: interview_transcripts
├── id (PK, CUID)
├── session_id (FK, CUID)
├── speaker (Enum) — AI, STUDENT
├── text_content (Text)
├── audio_url (String)
└── timestamp (Timestamp)

Table: interview_results
├── id (PK, CUID)
├── session_id (FK, CUID)
├── scores (JSON) — Per criterion
├── strengths (JSON)
├── improvements (JSON)
└── detailed_feedback (Text)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/interviews/templates` | Create template | `{ title, topics, rubric... }` | `{ id }` | Bearer | Teacher+ |
| POST | `/api/interviews/start` | Start session | `{ template_id, mode, custom_topic? }`| `{ session_id, ws_url }` | Bearer | Student |
| WS   | `/ws/interviews/:session_id` | Live audio stream | Binary Audio | Binary Audio + JSON State | Token | User in session |
| GET  | `/api/interviews/:id/results`| Get feedback | None | `{ scores, feedback }` | Bearer | User/Teacher |

## 7. UI Screens & Components
### Screen: Interview Lobby
**URL**: `/interviews/lobby/:template_id`
**Layout**: Pre-flight checklist. Microphone test, voice selection (TTS voice), skill focus selector, and "Start Interview" button.
**States**: Testing mic, ready, missing permissions.

### Screen: Live Interview Room
**URL**: `/interviews/live/:session_id`
**Layout**: Minimalist, distraction-free. Shows an audio visualizer for the AI voice and user mic. Timer showing remaining time. "End Early" button.
**States**: AI speaking, User speaking, Processing (loading).

### Screen: Feedback Report
**URL**: `/interviews/:id/report`
**Layout**: Overall score at top. Two columns: left shows full transcript, right shows Strengths, Improvements, and rubric breakdown. Clicking a transcript line highlights specific feedback.

## 8. Business Rules
1. Exam mode strictly adheres to the template topics and duration.
2. In Practice mode, users can pause the interview. Exam mode cannot be paused.
3. Pronunciation scoring relies on STT confidence scores and phonetic hints provided by the Gateway.
4. If a user is silent for 15 seconds, the AI interviewer will prompt them ("Are you still there?").

## 9. Validation Rules
- Microphone access is strictly required; session cannot start without it.
- Custom topics are restricted to 100 characters to prevent prompt injection.

## 10. Error Handling
- **Connection Loss**: Session state is saved. User can rejoin within 5 minutes.
- **STT Failure**: If STT fails to transcribe 3 times in a row, interview pauses and notifies user of technical issues.

## 11. Integration Points
- **AI Gateway**: Real-time STT, TTS, and LLM text generation.
- **Credit/Billing System**: Deducts credits for custom/premium sessions upon successful completion.

## 12. Configuration Options
- **Strictness Level**: Adjusts how rigorously the AI follows up on incomplete answers.
- **Interviewer Persona**: Configurable prompts for friendly, strict, or neutral interviewers.

## 13. Future Enhancements
- Video analysis to track eye movement and body language.
- Real-time grammar correction overlays (for practice mode only).
