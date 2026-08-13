# AI Question System — Functional Specification

## 1. Overview
The AI Question System utilizes the AI Gateway to automatically modify existing questions and generate entirely new ones. This feature accelerates content creation for teachers and administrators while maintaining high quality through a mandatory draft/review workflow and output validation, ensuring all AI-generated content is clearly identified and vetted before use in live exams.

## 2. User Stories
- As a Teacher, I want to use AI to generate variations of my existing questions so that I can easily create multiple test versions to prevent cheating.
- As a Sub-Admin, I want to batch-generate questions for a specific topic and difficulty so that I can rapidly expand the question bank.
- As an Admin, I want all AI-generated content to go to a Draft status so that human reviewers can verify accuracy.
- As a Student, I want to see a badge on AI-generated questions (during practice) so that I know the origin of the content.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Modify Existing Questions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Generate New Questions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Batch Generate Questions| ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject Drafts | ✅ | ✅ | ✅ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 AI Question Modification
**What it does**: Takes an existing question and creates a variation while maintaining the underlying concept and difficulty.
**How it works**: User selects a question and clicks "Create Variation". The system sends the question text, variables, and linked concept to the AI Gateway. The AI alters wording, numbers, or scenarios (e.g., 'Train 120km in 2h' → 'Vehicle 150km in 3h'). 
**Business Rules**: Modified questions inherit the metadata of the original but are saved in DRAFT status.
**Edge Cases**: If the AI changes the core concept unintentionally, the human reviewer must catch it during the DRAFT review.

### 4.2 AI Question Generation
**What it does**: Generates entirely new questions based on provided parameters.
**How it works**: User inputs parameters (Subject, Topic, Concept, Difficulty, Marks, Question Type). The system sends a structured prompt via the AI Gateway. The response is parsed into the standard question JSON format and saved in DRAFT status.
**Business Rules**: All generated questions are permanently flagged as `is_ai_generated = true`.
**Edge Cases**: AI hallucinates invalid JSON; the Gateway validation catches this and retries or fails the job.

### 4.3 Batch Generation & Worker Queue
**What it does**: Handles large-scale generation asynchronously.
**How it works**: Uses BullMQ jobs. An admin requests 50 questions for "Algebra". The system queues 50 generation jobs. Priority is managed to ensure background jobs don't throttle live application features.
**Business Rules**: Batch jobs can be paused or canceled.
**Edge Cases**: Provider rate limits are hit; BullMQ automatically applies exponential backoff.

### 4.4 Review Workflow
**What it does**: Ensures quality control for AI content.
**How it works**: AI-generated items sit in a "Pending Review" queue. Reviewers can Edit, Approve (moves to ACTIVE), or Reject (Deletes/Archives).
**Business Rules**: Only approved questions appear in active exams or practice pools.

## 5. Data Model
```
Table: questions (Updates)
├── id (PK, CUID)
├── ...existing_fields
├── is_ai_generated (Boolean) — Default false
├── ai_parent_id (FK, CUID, Nullable) — Links to original if modified
├── status (Enum) — DRAFT, ACTIVE, ARCHIVED, REJECTED
└── timestamps

Table: ai_generation_jobs
├── id (PK, CUID)
├── user_id (FK, CUID)
├── type (Enum) — SINGLE, BATCH_GENERATE, BATCH_MODIFY
├── params (JSON) — Subject, Topic, Count, etc.
├── status (Enum) — QUEUED, PROCESSING, COMPLETED, FAILED
├── completed_count (Int)
├── total_count (Int)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/questions/:id/modify` | Generate a variation | `{ count: 1 }` | `[{ draft_question_id }]` | Bearer | Teacher+ |
| POST | `/api/questions/generate` | Generate new questions | `{ topic_id, difficulty, type, count }` | `{ job_id }` | Bearer | Teacher+ |
| GET | `/api/questions/generation-jobs/:id` | Poll batch job status | None | `{ status, progress }` | Bearer | Teacher+ |
| POST | `/api/questions/drafts/:id/review` | Approve/Reject | `{ action: 'APPROVE'\|'REJECT' }` | `{ success }` | Bearer | Teacher+ |

## 7. UI Screens & Components
### Screen: AI Question Generator
**URL**: `/admin/questions/ai-generator`
**Layout**: Form on the left to select Subject, Topic, Concept, Difficulty, and Quantity. Status area on the right showing active generation jobs and progress bars.
**Interactive Elements**: Generate button, dropdowns for metadata, Cancel job button.
**States**: Idle form, processing (progress bar), completed with link to review queue.

### Screen: Draft Review Queue
**URL**: `/admin/questions/drafts`
**Layout**: List view of generated questions. Split pane showing question preview and action buttons.
**Interactive Elements**: Inline editor for quick fixes, Approve/Reject buttons, Bulk select checkboxes.
**States**: Empty queue, list loaded.

## 8. Business Rules
1. AI modifications must preserve the exact same Concept mapping as the original.
2. All AI-generated content defaults to DRAFT status.
3. Users are limited by quotas set in the AI Gateway for generation requests.
4. AI-generated flag cannot be removed by users.

## 9. Validation Rules
- Batch generation count cannot exceed 100 per job.
- Required parameters for generation: Subject, Topic, Difficulty.

## 10. Error Handling
- **Generation Timeout**: BullMQ job marks as failed; user notified to try a smaller batch.
- **Parsing Error**: If Gateway cannot parse AI output into valid question schema, job retries 3 times before failing.

## 11. Integration Points
- **AI Gateway**: Used for all prompt execution.
- **Core Question Bank**: Integrates generated drafts into the main question database.

## 12. Configuration Options
- **Prompts**: Managed in the AI Gateway template system.
- **Batch Limits**: Configurable max questions per batch job.

## 13. Future Enhancements
- Feedback loop: Send approved/edited drafts back to AI as few-shot examples to improve future generation quality.
- Image generation for diagram-based questions.
