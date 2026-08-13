# Phase 12 — AI Interview System
## Overview
This phase introduces the AI Interview System, enabling automated, adaptive spoken interviews for language proficiency or subject mastery. It leverages the AI Gateway from Phase 11 and integrates Speech-to-Text (STT) and Text-to-Speech (TTS) to provide a natural, controlled conversational experience, complete with granular assessment and feedback generation.

## Prerequisites
- Phase 11 completed (AI Gateway Architecture, Credits, Queue)
- Frontend WebRTC/MediaRecorder capabilities established

## Features

### Feature 12.1 — Interview Template Management

#### Description
Allows educators to create predefined templates that dictate how an AI interview should be conducted.

#### Sub-Features
- Define template metadata: name, course, subject, duration, instructions
- Configure topics list and sequencing
- Attach specific rubrics for assessment
- Configure follow-up depth (e.g., 1-2 follow-ups per topic)

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/interview-templates | Create a template | Teacher |
| GET | /api/v1/interview-templates | List templates | Teacher/Student |
| PATCH | /api/v1/interview-templates/:id | Update a template | Teacher |
| DELETE| /api/v1/interview-templates/:id | Delete a template | Teacher |

#### Database Changes
- `interview_templates`: stores metadata, rubric IDs, configuration.
- `interview_template_topics`: maps templates to specific topics.

#### Frontend Pages/Components
- `TemplateBuilder`: UI to construct templates, drag-and-drop topics, and select rubrics.

#### Acceptance Criteria
1. Teachers can create, read, update, and delete interview templates.
2. Templates enforce constraints (e.g., max duration, valid rubric).
3. Follow-up count is strictly configurable (1-3 max).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F01.U001 | Create Template | Tests successful creation | Valid template JSON | DB record created | High |
| P12.F01.U002 | Invalid Follow-ups| Tests config limits | Follow-ups: 10 | Validation Error (max 3) | High |
| P12.F01.U003 | Topic Mapping | Tests topic relations | Template + 3 Topics | Mapped in join table | Medium |
| P12.F01.U004 | Rubric Dependency | Tests rubric validation | Invalid Rubric ID | Validation Error | High |
| P12.F01.U005 | Delete Template | Tests soft delete | Template ID | is_deleted = true | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F01.I001 | Full CRUD Cycle | Tests API endpoints | Authenticated Teacher | POST, GET, PATCH, DELETE | Success on all operations | High |
| P12.F01.I002 | Fetch Available | Tests student access | Authenticated Student | GET active templates | Returns list of templates | Medium |
| P12.F01.I003 | Missing Topics | Tests template validation | Setup template w/o topics | POST | Error: Topics required | High |

### Feature 12.2 — Interview Topic Engine

#### Description
Manages the specific subjects/topics that the AI will discuss, controlling the flow from one subject to the next.

#### Sub-Features
- Predefined topics per course (e.g., IELTS: Personal Info, Education)
- Custom topics creation (Premium feature)
- Topic sequencing and flow control

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/topics/custom | Create custom topic | Premium |
| GET | /api/v1/topics | List available topics | User |

#### Database Changes
- `interview_topics`: predefined and custom topics.

#### Frontend Pages/Components
- `TopicSelector`: Component for users/teachers to pick topics.

#### Acceptance Criteria
1. System loads predefined topics correctly for standard courses.
2. Premium users can define custom topics.
3. The engine successfully iterates through topics sequentially during an interview.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F02.U001 | Load Topics | Tests filtering by course | Course ID | Array of relevant topics | High |
| P12.F02.U002 | Custom Topic Create| Tests premium restriction | Free User | 403 Forbidden | High |
| P12.F02.U003 | Topic Sequencing | Tests next topic logic | Current: Topic 1 | Next: Topic 2 | High |
| P12.F02.U004 | End of Topics | Tests flow completion | Current: Last Topic | Returns completion flag | Medium |
| P12.F02.U005 | Custom Topic Create| Tests premium success | Premium User | Topic created | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F02.I001 | Topic Engine Flow | Tests iterating all topics | Mock Interview State | Request Next repeatedly | Cycles all -> Completes | High |
| P12.F02.I002 | Premium Gate | Tests custom topic DB | Free & Premium Users | Both attempt POST | Free fails, Premium succeeds| High |

### Feature 12.3 — Controlled Natural Conversation Engine

#### Description
The core state machine that drives the interview, integrating with the LLM via the AI Gateway to ensure natural flow while adhering to strict structural rules.

#### Sub-Features
- Flow enforcement: Main Topic -> Question -> Student Answer -> 1-2 Follow-ups -> Return to Main / Next Topic
- Interview state tracking (current question, follow-ups asked, time elapsed)
- Context injection for the LLM prompt to maintain character and restrictions

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/interviews/start | Initialize interview | Student |
| POST | /api/v1/interviews/:id/respond | Send answer, get AI reply| Student |

#### Database Changes
- `interview_sessions`: active state tracking (current_topic_id, follow_ups_count, context_history).

#### Frontend Pages/Components
- N/A (Backend logic)

#### Acceptance Criteria
1. AI asks a primary question based on the topic.
2. AI asks a maximum of X follow-up questions based on the student's answer.
3. System forcefully transitions to the next topic once follow-ups are exhausted or time limit is reached for the topic.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F03.U001 | State Init | Tests starting interview | Template ID | Initialized State & Q1 | High |
| P12.F03.U002 | Follow-up Increment| Tests state mutation | Student Response | follow_ups_count += 1 | High |
| P12.F03.U003 | Topic Transition | Tests moving topics | follow_ups == max | Next Topic Q1 | High |
| P12.F03.U004 | Prompt Context | Tests LLM instructions | State context | Strict system prompt generated| High |
| P12.F03.U005 | Time Limit Force | Tests time bounds | time_elapsed > max | Force completion flag | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F03.I001 | Full Topic Cycle | Tests complete cycle | Config: 1 Follow-up | Start -> Respond -> Respond | Transitions to Topic 2 | High |
| P12.F03.I002 | AI Gateway Connection| Tests LLM routing | Mock Gateway | Send Response | Valid AI Next Question | High |
| P12.F03.I003 | State Persistence | Tests DB tracking | Redis/DB | Respond | State updated in DB | High |

### Feature 12.4 — Speech-to-Text (STT) Integration

#### Description
Converts the student's spoken audio into text in real-time or near real-time.

#### Sub-Features
- WebRTC or chunked HTTP upload for audio
- Integration with STT providers (e.g., Whisper, Deepgram, Google)
- Provider fallback capability

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/interviews/:id/audio | Submit audio chunk | Student |

#### Database Changes
- `interview_transcripts`: stores raw text of responses.

#### Frontend Pages/Components
- `AudioRecorder`: Handles mic permissions and chunked uploading.

#### Acceptance Criteria
1. System accurately transcribes audio to text.
2. Supports streaming or small chunk uploads to minimize latency.
3. Automatically falls back to a secondary provider if primary fails.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F04.U001 | Audio Chunk Parse | Tests binary handling | Audio Blob | Valid Temp File/Stream | High |
| P12.F04.U002 | STT Routing | Tests provider abstraction | Audio Data | Routing to Provider A | High |
| P12.F04.U003 | Fallback Trigger | Tests provider error | Provider A 500 | Routing to Provider B | High |
| P12.F04.U004 | Transcript Clean | Tests text sanitization | "um, ah, yes" | Text saved correctly | Medium |
| P12.F04.U005 | Empty Audio | Tests silence handling | Silent Audio | Returns empty string, no error| Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F04.I001 | Live Transcription | Tests actual STT API | Provider configured | Send audio chunk | Transcript returned | High |
| P12.F04.I002 | Fallback Execution | Tests fallback | Mock Provider A failure | Send audio | Provider B returns text | Medium |

### Feature 12.5 — Text-to-Speech (TTS) Integration

#### Description
Converts the AI's generated textual responses into spoken audio for the student to hear.

#### Sub-Features
- Integration with TTS providers (e.g., ElevenLabs, OpenAI TTS)
- Configurable voices and speed
- Streaming output for low latency

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/v1/tts/stream | Stream audio for text | Internal/Student|

#### Database Changes
- None directly, configuration in user/template settings.

#### Frontend Pages/Components
- `AudioPlayer`: Handles playback of received audio streams.

#### Acceptance Criteria
1. AI text is converted to natural-sounding audio.
2. Audio starts playing with minimal latency (ideally < 1s via streaming).
3. Voice parameters (gender, accent) reflect template configuration.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F05.U001 | TTS Request | Tests API formatting | Text + Voice Config | Provider API Request | High |
| P12.F05.U002 | Stream Chunking | Tests response stream | Provider Stream | Piped to Client | High |
| P12.F05.U003 | Voice Config Mapping| Tests template config | Config: UK Female | Correct Voice ID used | Medium |
| P12.F05.U004 | Empty Text | Tests edge case | Empty String | No audio generated | Low |
| P12.F05.U005 | TTS Error Handle | Tests provider failure | 500 from TTS | Logs error, client gets text only| High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F05.I001 | Full TTS Flow | Tests provider connection | Provider Active | Request TTS | Audio blob/stream returned | High |
| P12.F05.I002 | Latency Check | Tests response time | Provider Active | Request TTS | First byte < 1500ms | Medium |

### Feature 12.6 — Interview Assessment Engine

#### Description
Evaluates the entire interview transcript against a specific rubric after the interview concludes.

#### Sub-Features
- LLM prompt specifically designed for grading against criteria (Fluency, Grammar, etc.)
- Scoring logic (e.g., bands 1-9 for IELTS, or 1-100)
- Aggregation of overall score

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /internal/interviews/:id/assess | Trigger async assessment | Internal |

#### Database Changes
- `interview_results`: stores scores per criterion and overall.

#### Frontend Pages/Components
- N/A (Backend worker process)

#### Acceptance Criteria
1. Engine evaluates the transcript against all specified rubric criteria.
2. Numerical scores are generated and validated against bounds.
3. Assessment runs asynchronously after the session completes.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F06.U001 | Prompt Construction | Tests grading instructions| Transcript + Rubric | Strict grading prompt | High |
| P12.F06.U002 | Output Validation | Tests AI score parsing | Valid AI JSON | Parsed Scores Object | High |
| P12.F06.U003 | Invalid AI Score | Tests out of bounds | AI gives 11/10 | Validation Error / Retry | High |
| P12.F06.U004 | Overall Calculation | Tests aggregation | Array of sub-scores | Correct average/weighted total| High |
| P12.F06.U005 | Missing Criteria | Tests incomplete grading | AI misses Grammar | Validation Error / Retry | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F06.I001 | Async Assessment | Tests queue job | Worker Queue Active | Trigger assess | Job completes, scores in DB | High |
| P12.F06.I002 | Rubric Accuracy | Tests standard mock | Mock Transcript | Run assess | Scores match expected range | Medium |

### Feature 12.7 — Interview Feedback Generation

#### Description
Generates detailed, actionable qualitative feedback based on the assessment.

#### Sub-Features
- Extraction of Top 3 Strengths
- Extraction of Top 5 Areas for Improvement
- Specific quotes from the transcript highlighting grammar/vocab issues
- Actionable study suggestions

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/v1/interviews/:id/feedback | Retrieve detailed feedback| Student |

#### Database Changes
- `interview_feedback`: stores structured feedback blocks.

#### Frontend Pages/Components
- `FeedbackReport`: Detailed UI showing scores, strengths, weaknesses, and transcript.

#### Acceptance Criteria
1. Generates specific strengths and weaknesses tied to the transcript.
2. Highlights exact grammar mistakes made by the user and provides corrections.
3. Returns structured JSON to populate the UI.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F07.U001 | Feedback Structure | Tests schema parsing | AI Feedback Output | Validated Object | High |
| P12.F07.U002 | Quote Matching | Tests transcript link | AI provides quote | Verified quote exists in text| Medium |
| P12.F07.U003 | Strengths Count | Tests constraints | Ask for 3 strengths | Exactly 3 returned | Low |
| P12.F07.U004 | Actionability | Tests format of advice | AI Output | Contains 'Next Steps' array | Low |
| P12.F07.U005 | Empty Transcript | Tests edge case | No answers given | "No data to evaluate" | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F07.I001 | Generation to DB | Tests saving feedback | DB Connected | Generate | Structured data in DB | High |
| P12.F07.I002 | Client Retrieval | Tests API delivery | Student Auth | GET feedback | Correct JSON returned | High |

### Feature 12.8 — Interview Skill Focus

#### Description
Allows students practicing independently to focus the AI on specific skills (e.g., "Push me on Vocabulary" or "Ask long-winded questions for listening practice").

#### Sub-Features
- Skill focus parameter injection into Conversation Engine prompt
- Adaptive AI behavior

#### API Endpoints
- Included in `/api/interviews/start` config payload.

#### Database Changes
- `interview_sessions`: new field `skill_focus` (Enum).

#### Frontend Pages/Components
- `FocusSelector`: Dropdown in the interview setup lobby.

#### Acceptance Criteria
1. AI behavior demonstrably changes based on focus (e.g., uses harder words if Vocab is selected).
2. Feedback heavily weights the selected focus.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F08.U001 | Prompt Modifier | Tests instruction addition| Focus: Grammar | Prompt includes grammar rules| High |
| P12.F08.U002 | Assessment Weighting| Tests scoring emphasis | Focus: Vocab | Rubric weights Vocab higher | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F08.I001 | Behavioral Change | Tests AI output | Mock Gateway | Start with Focus A vs B | Distinct AI phrasing | Low |

### Feature 12.9 — Practice vs Exam Mode

#### Description
Distinguishes between strict, standardized exam simulations and flexible practice environments.

#### Sub-Features
- EXAM MODE: Strict constraints, no custom topics, hidden timer, standardized rubric.
- PRACTICE MODE: Flexible topics, visible hints, adjustable difficulty.

#### API Endpoints
- Included in `/api/interviews/start` config payload.

#### Database Changes
- `interview_sessions`: new field `mode` (Enum: PRACTICE, EXAM).

#### Frontend Pages/Components
- `InterviewLobby`: Mode toggle.
- `InterviewUI`: Renders differently based on mode (hides/shows transcript, hints).

#### Acceptance Criteria
1. Exam mode completely locks down configuration.
2. Practice mode allows pausing and hints.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F09.U001 | Constraint Lock | Tests Exam mode | Exam Mode | Custom topic rejected | High |
| P12.F09.U002 | Pause Capability | Tests Practice mode | Practice Mode | Pause action succeeds | High |
| P12.F09.U003 | Pause Restriction | Tests Exam mode | Exam Mode | Pause action fails | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F09.I001 | Flow Enforcement | Tests Exam timing | Exam Mode | Exceed topic time | Auto-transitions | High |
| P12.F09.I002 | Feature Flags | Tests UI hints logic | Practice Mode | Request Hint API | Returns hint | Medium |

### Feature 12.10 — Interview Session Management

#### Description
Handles the lifecycle of an interview, tracking disconnects, state recovery, and credit management.

#### Sub-Features
- Session state caching in Redis
- Reconnection logic if WebSocket/connection drops
- Credit refunding if system fails (TTS/STT crash)

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/v1/interviews/:id/status | Check active state | Student |
| POST | /api/v1/interviews/:id/abandon | End prematurely | Student |

#### Database Changes
- `interview_sessions`: status tracking (ACTIVE, COMPLETED, ABANDONED, FAILED).

#### Frontend Pages/Components
- N/A (Handled via generic UI state)

#### Acceptance Criteria
1. User can refresh the page mid-interview and resume exactly where they left off.
2. If the backend fails, the session is marked FAILED and credits are returned.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F10.U001 | State Cache | Tests Redis storage | Active Session | State exists in Redis | High |
| P12.F10.U002 | Reconnection | Tests fetching state | Reconnect Request | Returns current topic/question| High |
| P12.F10.U003 | Abandon Session | Tests manual end | Abandon Request | Status = ABANDONED | High |
| P12.F10.U004 | Credit Refund | Tests system failure | Worker Crash Event | Credits refunded to user | High |
| P12.F10.U005 | Stale Cleanup | Tests cleanup job | Session inactive > 1h | Status = ABANDONED | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P12.F10.I001 | Hard Refresh | Tests client recovery | Active Interview | Client reloads page | UI restores current question | High |
| P12.F10.I002 | Crash Recovery | Tests fault tolerance | Active Interview | Mock Gateway 500 | Session Fails gracefully | High |

### Feature 12.11 — Interview Frontend

#### Description
The complete student-facing interface for conducting the interview.

#### Sub-Features
- Lobby for setup
- Live Interview interface (mic visualization, live transcript, timer)
- End-of-session summary
- Detailed Feedback Dashboard
- History View

#### API Endpoints
- N/A

#### Database Changes
- N/A

#### Frontend Pages/Components
- `InterviewLobby`, `LiveInterviewRoom`, `FeedbackDashboard`, `InterviewHistoryTable`.

#### Acceptance Criteria
1. UI clearly indicates when the AI is speaking, processing, or listening.
2. Mic permissions are handled gracefully.
3. Live transcript (if enabled) scrolls naturally.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F11.U001 | Mic Permissions | Tests denial handling | Mic Denied | Show specific error UI | High |
| P12.F11.U002 | State Visuals | Tests UI states | State: AI_SPEAKING | Show wave animation | High |
| P12.F11.U003 | Timer Component | Tests countdown | Time limit 60s | Formats '01:00' -> '00:00' | Low |
| P12.F11.U004 | Transcript Scroll | Tests auto-scroll | New text added | Scrolls to bottom | Medium |

##### Integration Tests (E2E)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P12.F11.I001 | Full Practice Flow| Tests E2E success | Start Practice -> Answer 2 Qs -> Finish | Feedback generated and shown | High |
| P12.F11.I002 | Connection Drop | Tests recovery UI | Mid-interview -> Disconnect network -> Reconnect | Prompts to resume session | High |
| P12.F11.I003 | Exam Mode Lockdown| Tests constraints | Start Exam -> Try to pause | Pause button hidden/disabled | High |

## Modularity Checklist
- [x] All business logic in service layer (not controllers)
- [x] No cross-module direct database access
- [x] Shared types used from @repo/types
- [x] Validation schemas in @repo/validation
- [x] Module can be extracted to microservice without code changes in other modules
- [x] All dependencies injected, not imported directly
- [x] Feature flags / config for optional features (TTS/STT providers can be toggled)

## Upgrade Path
Phase 12 builds upon Phase 11. The modular Conversation Engine and Provider fallbacks establish the groundwork for future phases, such as Group Interviews (multi-agent) or Video-based Avatar Interviews (Phase 13+).

## Definition of Done
- Interview templates can be fully configured and mapped to custom rubrics.
- The Conversation Engine maintains strict control over the LLM output (topics, follow-ups).
- STT and TTS integrate seamlessly with < 2 seconds turnaround latency.
- Async assessment generates accurate numerical scores and actionable qualitative feedback.
- Frontend provides a smooth, crash-resilient experience with clear visual states.
- Unit, Integration, and E2E tests pass with >80% coverage.
</Phase 12 — AI Interview System>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 23: AI Interview System](../specs/23-ai-interview-system.md)

### Key Team Role Guidelines
- [AI Engineer](../roles/29-ai-engineer.md) — Features 12.1 through 12.8, 12.10
- [MLOps Engineer](../roles/30-mlops-engineer.md) — STT/TTS pipeline serving
- [UX Designer](../roles/09-ux-designer.md) — Feature 12.11 Audio controls & interview UI

### Operational Standards & Guides
- [AI Gateway Spec](../ai-gateway-spec.md)
- [Performance Benchmarks & SLAs](../guides/14-performance-benchmarks.md)