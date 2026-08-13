# Phase 11 — AI Question System
## Overview
This phase introduces the AI Question System, providing AI-powered question generation and modification capabilities. It establishes a dedicated FastAPI AI server acting as an AI Gateway, handling routing, rate limiting, and model management for both local and cloud-based LLMs. The system includes an async job queue for processing requests without blocking the main application, and tools to assist educators in expanding the question bank efficiently.

## Prerequisites
- Phase 1-10 completed (User Management, Question Bank, Assessments)
- Redis configured and running for BullMQ queue support
- Infrastructure support for a separate FastAPI server service

## Features

### Feature 11.1 — AI Gateway Architecture

#### Description
Establishes a separate FastAPI AI server to handle all AI-related requests. This gateway handles authentication, authorization, rate limiting, prompt templates, model selection, output validation, usage tracking, cost tracking, queue management, and logging.

#### Sub-Features
- Separate FastAPI AI server deployment
- Internal API communication between main app and AI server
- Model-agnostic design allowing swapping between local and cloud models
- Prompt template management and versioning
- Standardized output validation to ensure AI responses match expected JSON schemas
- Request and cost tracking

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /internal/ai/gateway/route | Main endpoint to route requests to appropriate model | Internal Token |
| GET | /internal/ai/gateway/health | Health check for AI Gateway | None |
| GET | /internal/ai/gateway/models | List available and active models | Internal Token |

#### Database Changes
- `ai_gateway_logs`: tracks requests, model used, tokens, latency, status.

#### Frontend Pages/Components
- None (backend architectural feature)

#### Acceptance Criteria
1. FastAPI server runs independently and communicates securely with the main app.
2. Gateway successfully routes requests to the configured model.
3. System logs token usage, latency, and costs for each request.
4. Output is validated against a predefined schema; malformed outputs are rejected or retried.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F01.U001 | Test Model Routing | Verifies gateway routes to correct model based on config | Model ID | Success response from mock model | High |
| P11.F01.U002 | Test Output Validation | Verifies JSON schema validation | Invalid JSON string | Validation Error | High |
| P11.F01.U003 | Test Token Counting | Verifies token usage is calculated correctly | Sample prompt/response | Correct token count | Medium |
| P11.F01.U004 | Test Rate Limiting | Verifies rate limits are enforced | Excess requests | 429 Too Many Requests | High |
| P11.F01.U005 | Test Internal Auth | Verifies unauthorized apps cannot access gateway | Invalid token | 401 Unauthorized | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P11.F01.I001 | Gateway to Model Flow | Tests full request flow through gateway to a mock model | Mock model active | Send request via gateway | Validated JSON response | High |
| P11.F01.I002 | Usage Logging | Verifies db log creation | DB connected | Send successful request | Log entry created with token counts | High |
| P11.F01.I003 | Retry on Validation Failure | Tests auto-retry on bad schema | Mock model returns bad JSON | Send request | Gateway retries and succeeds | Medium |

### Feature 11.2 — AI Client Package (@repo/ai-client)

#### Description
A TypeScript client package used by the main application to communicate seamlessly and safely with the FastAPI AI server.

#### Sub-Features
- Type-safe request and response interfaces
- Centralized error handling and retry logic
- Timeout configuration for long-running AI requests
- Internal authentication signing

#### API Endpoints
- N/A (Client Package)

#### Database Changes
- N/A

#### Frontend Pages/Components
- N/A

#### Acceptance Criteria
1. Client is publishable as an internal package `@repo/ai-client`.
2. Client handles connection drops and implements exponential backoff retries.
3. Client provides fully typed response objects.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F02.U001 | Test Successful Request | Verifies valid request parsing | Valid config | Typed response | High |
| P11.F02.U002 | Test Timeout Config | Verifies request aborts on timeout | Delay > timeout | TimeoutError | High |
| P11.F02.U003 | Test Retry Logic | Verifies retry on 500 errors | Mock 500 response | Retries up to max limit | High |
| P11.F02.U004 | Test Auth Header | Verifies correct auth header injection | Valid token | Header present in request | High |
| P11.F02.U005 | Test Error Formatting | Verifies generic API errors are mapped | 400 Bad Request | AIClientError | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P11.F02.I001 | Client to Gateway | Tests connection to actual Gateway instance | Gateway running | Send ping request | 200 OK | High |
| P11.F02.I002 | Client Retry Flow | Tests client retry on simulated gateway lag | Gateway with latency | Send request | Request eventually succeeds | Medium |
| P11.F02.I003 | Type Validation | Tests runtime type validation | Bad gateway response | Send request | Zod error thrown | High |

### Feature 11.3 — AI Question Modification Worker

#### Description
An async worker that takes an existing question and creates variations of it by changing wording, sentence structure, variables, numbers, or scenarios, while preserving the underlying concept.

#### Sub-Features
- Question duplication with modified attributes
- Math/physics variable randomization (e.g., changing '120km in 2h' to '150km in 3h')
- Concept linkage preservation
- Strict output validation to match existing Question schema

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/ai/questions/modify | Submits a question for AI modification | Teacher |

#### Database Changes
- `questions`: new field `derived_from_id` (UUID, nullable).
- `questions`: new field `ai_generated` (Boolean).

#### Frontend Pages/Components
- N/A (Backend worker, UI handled in 11.9)

#### Acceptance Criteria
1. AI output strictly matches the standard question JSON format.
2. Modified questions are linked to the same topic/concept as the original.
3. Numeric modifications ensure logical consistency in answers (e.g., if options are numbers, the correct option matches the new calculation).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F03.U001 | Math Variable Mod | Tests math variable changes | Question with numbers | Output with new numbers & answer | High |
| P11.F03.U002 | Scenario Mod | Tests context modification | "Train scenario" | "Car scenario" | High |
| P11.F03.U003 | Schema Validation | Tests AI response parsing | AI JSON response | Valid Question Object | High |
| P11.F03.U004 | Concept Preservation | Tests tags are kept | Original tags | Output retains same tags | Medium |
| P11.F03.U005 | Option Shuffling | Tests MC options are varied | Original options | Modified options | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P11.F03.I001 | Worker Queue Flow | Tests job picked up and processed | Queue running | Submit job | Job completes, question saved | High |
| P11.F03.I002 | Bad AI Response | Tests handling of hallucinated format | Mock bad AI | Submit job | Job retried, marked failed if persistent | High |
| P11.F03.I003 | Parent Linking | Tests derived_from_id | Valid question | Modify | New question has correct parent ID | Medium |

### Feature 11.4 — AI Question Generation Worker

#### Description
Generates entirely new questions based on parameters such as subject, topic, concept, difficulty, marks, question type, and syllabus context.

#### Sub-Features
- Parameterized prompt construction
- Batch generation support (e.g., "Generate 10 questions")
- Force DRAFT status for all generated questions requiring human review

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/v1/ai/questions/generate | Submits a generation request | Teacher |

#### Database Changes
- None (Uses existing `questions` table with `status = 'DRAFT'`)

#### Frontend Pages/Components
- N/A (UI handled in 11.9)

#### Acceptance Criteria
1. Generated questions match requested difficulty, type, and topic.
2. All generated questions are automatically set to DRAFT status.
3. System can handle batch requests asynchronously.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F04.U001 | Param Adherence | Tests prompt inclusion of params | Difficulty: Hard | Prompt contains Hard constraint | High |
| P11.F04.U002 | Draft Status | Tests default status | AI output | Status = DRAFT | High |
| P11.F04.U003 | Batch Chunking | Tests splitting of large batches | Request 20 Qs | Split into 4 chunks of 5 | Medium |
| P11.F04.U004 | Type Constraint | Tests question type adherence | Type: MCQ | Output is MCQ | High |
| P11.F04.U005 | Content Filtering | Tests inappropriate content block | AI generates bad word | Validation failure, rejected | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P11.F04.I001 | Batch Generation | Tests queueing multiple generation jobs | Queue active | Request 5 Qs | 5 jobs created and processed | High |
| P11.F04.I002 | Database Insertion | Tests saving valid questions | Mock AI response | Job completes | Questions in DB with DRAFT | High |
| P11.F04.I003 | Topic Association | Tests linking to syllabus | Request for Topic A | Job completes | Question linked to Topic A | Medium |

### Feature 11.5 — AI Usage Tracking

#### Description
Tracks AI request usage per user, per feature, and against subscription limits or credit balances.

#### Sub-Features
- User-level credit consumption
- Feature-level usage categorization (Modify vs Generate)
- Subscription limit enforcement
- Internal cost tracking based on tokens

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/v1/ai/usage | Get current user's AI usage and credits | User |

#### Database Changes
- `user_ai_credits`: stores available credits per user/tenant.
- `ai_usage_history`: tracks specific credit deductions.

#### Frontend Pages/Components
- N/A

#### Acceptance Criteria
1. Successful AI actions deduct appropriate credits.
2. Users without sufficient credits receive a 402 Payment Required or equivalent error.
3. Token usage is accurately mapped to credit cost.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F05.U001 | Credit Deduction | Tests balance update | Start: 100, Cost: 5 | End: 95 | High |
| P11.F05.U002 | Insufficient Credits | Tests limit block | Start: 2, Cost: 5 | Error thrown, no deduction | High |
| P11.F05.U003 | Cost Calculation | Tests token to credit mapping | 1000 input, 500 out | Correct credit cost | Medium |
| P11.F05.U004 | Feature Categorization| Tests usage logging tags | Type: Generate | Log has tag 'Generate' | Low |
| P11.F05.U005 | Credit Refund | Tests refund on AI failure | Failed job, Cost: 5 | End: +5 (Refunded) | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P11.F05.I001 | E2E Deduction | Tests full flow deduction | Credits: 10 | Run modify job | Job succeeds, credits = 9 | High |
| P11.F05.I002 | Limit Enforcement | Tests queue rejection on empty credits | Credits: 0 | Submit job | Job rejected immediately | High |
| P11.F05.I003 | Monthly Reset | Tests subscription credit refresh | Cron job | Trigger refresh | Credits reset to tier limit | Medium |

### Feature 11.6 — AI Worker Queue System

#### Description
A robust job queue using BullMQ and Redis to manage async AI tasks, handle priorities, and report progress.

#### Sub-Features
- Priority tiers (live chat/requests > batch operations)
- Automatic retry on transient failures
- Progress tracking events (e.g., 50% complete)
- Dead-letter queue for persistent failures

#### API Endpoints
- N/A

#### Database Changes
- Redis used for state.

#### Frontend Pages/Components
- N/A

#### Acceptance Criteria
1. Jobs are processed asynchronously without blocking API responses.
2. Live requests jump ahead of batch jobs in the queue.
3. Jobs emit progress events that can be streamed to the client via WebSockets or SSE.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F06.U001 | Job Priority | Tests queue ordering | High & Low jobs | High job processed first | High |
| P11.F06.U002 | Retry Mechanism | Tests transient error recovery | Temporary error | Job retried and succeeds | High |
| P11.F06.U003 | Dead Letter | Tests persistent failure | Permanent error x3 | Job moved to failed queue | High |
| P11.F06.U004 | Progress Emit | Tests progress updates | Job at 50% | Progress event fired | Medium |
| P11.F06.U005 | Concurrency Limit | Tests max worker load | 100 jobs | Only N jobs process concurrently| High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P11.F06.I001 | Redis Connection | Tests queue persistence | Redis active | Add job, restart worker | Job persists and completes | High |
| P11.F06.I002 | Event Streaming | Tests SSE/WS output | Client connected | Run job | Client receives progress | Medium |
| P11.F06.I003 | Stalled Job Recovery| Tests worker crash handling | Worker crashes mid-job | Wait timeout | Job reassigned to new worker | High |

### Feature 11.7 — Local AI Model Support

#### Description
Provides configuration and integration to use local LLMs (e.g., Llama, Qwen via Ollama or vLLM) to reduce costs, with fallback to cloud models.

#### Sub-Features
- Ollama / vLLM API integration in AI Gateway
- Model routing configuration per task type
- Fallback chain logic (Local -> Cloud) on timeout or failure

#### API Endpoints
- N/A (Internal Gateway logic)

#### Database Changes
- `ai_gateway_config`: settings for local model endpoints.

#### Frontend Pages/Components
- N/A

#### Acceptance Criteria
1. Gateway can send standard OpenAI-format requests to a local API endpoint.
2. If the local model is offline or times out, the request gracefully falls back to a configured cloud provider.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F07.U001 | Local Routing | Tests routing to local endpoint | Configured local | Request hits local URL | High |
| P11.F07.U002 | Fallback Trigger | Tests fallback on timeout | Local timeout | Request hits cloud URL | High |
| P11.F07.U003 | Fallback on Error | Tests fallback on 500 | Local returns 500 | Request hits cloud URL | High |
| P11.F07.U004 | Format Mapping | Tests prompt translation if needed | OpenAI prompt | Local API format | Medium |
| P11.F07.U005 | Cost Bypass | Tests local models don't incur external cost | Local model run | Cost tracked as 0 | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P11.F07.I001 | Local Inference | Tests actual local model | Ollama running | Send request | Valid response | High |
| P11.F07.I002 | Fallback Execution| Tests real fallback | Ollama stopped | Send request | Valid response from Cloud | High |
| P11.F07.I003 | Health Check | Tests gateway marks model offline | Stop local model | Gateway health check | Model marked inactive | Medium |

### Feature 11.8 — Cloud AI Integration

#### Description
Integration with cloud providers (OpenAI, Anthropic, Gemini) via the AI Gateway, managing API keys securely.

#### Sub-Features
- Secure API key storage
- Provider abstraction layer
- Usage cap configurations

#### API Endpoints
- N/A

#### Database Changes
- `tenant_ai_keys` (optional, if tenants bring their own keys)

#### Frontend Pages/Components
- N/A

#### Acceptance Criteria
1. Supports at least one major cloud provider (e.g., OpenAI).
2. API keys are injected securely and not exposed in code or logs.
3. Hard limits on cloud spending can be enforced.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F08.U001 | Key Injection | Tests headers | Request | Authorization header present | High |
| P11.F08.U002 | Spending Cap | Tests limit logic | Limit reached | Request blocked | High |
| P11.F08.U003 | Provider Switch | Tests abstraction | Switch to Anthropic | Request formatted for Anthropic | Medium |
| P11.F08.U004 | Error Handling | Tests Cloud API errors | 401 Bad Key | Gateway logs error, notifies admin| High |
| P11.F08.U005 | Timeout Handling| Tests Cloud timeout | Cloud delay | Gateway aborts, returns error | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P11.F08.I001 | Cloud Inference | Tests actual API call | Valid Key | Send request | Valid response | High |
| P11.F08.I002 | Invalid Key | Tests rejection | Invalid Key | Send request | Controlled failure | High |

### Feature 11.9 — AI Question Frontend

#### Description
The user interface for interacting with the AI question modification and generation tools, including a review workflow for draft questions and a usage dashboard.

#### Sub-Features
- UI to select a question and request modifications (slider/toggles for variance)
- UI form to set parameters for batch generation
- Draft review queue (Approve, Edit, Reject)
- AI Usage Dashboard (Credits remaining, history)

#### API Endpoints
- N/A (Frontend consumes existing endpoints)

#### Database Changes
- N/A

#### Frontend Pages/Components
- `AIQuestionModifierModal`: Modal for tweaking an existing question.
- `AIGeneratorView`: Page for setting batch parameters.
- `DraftReviewQueue`: Table view for reviewing DRAFT questions.
- `AIUsageDashboard`: Chart/stat view of credit usage.

#### Acceptance Criteria
1. Teachers can easily trigger modifications from the Question Bank UI.
2. Batch generation provides real-time progress indicators.
3. Review UI allows inline editing before approving a DRAFT question.
4. Dashboard accurately reflects credit usage.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F09.U001 | Modifier Form | Tests form validation | Missing parameters | Validation error | High |
| P11.F09.U002 | Draft Approve | Tests state update | Click Approve | Question status -> ACTIVE | High |
| P11.F09.U003 | Progress Bar | Tests visual update | Progress event 50% | UI shows 50% | Medium |
| P11.F09.U004 | Credit Display | Tests usage formatting | 100 credits | Renders "100 credits remaining" | Low |
| P11.F09.U005 | Inline Edit | Tests draft update | Change option text | Draft saved with new text | High |

##### Integration Tests (E2E)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P11.F09.I001 | Modify Flow | Tests full modification UI | Open question -> Click AI Modify -> Submit -> Approve | New active question linked | High |
| P11.F09.I002 | Generate Flow | Tests batch generation | Open Generator -> Set params -> Submit -> Wait | 10 drafts appear in review queue | High |
| P11.F09.I003 | Insufficient Credits| Tests UI on limit | User with 0 credits tries to modify | UI shows "Upgrade Plan" modal | Medium |

## Modularity Checklist
- [x] All business logic in service layer (not controllers)
- [x] No cross-module direct database access
- [x] Shared types used from @repo/types
- [x] Validation schemas in @repo/validation
- [x] Module can be extracted to microservice without code changes in other modules (AI Gateway is already isolated)
- [x] All dependencies injected, not imported directly
- [x] Feature flags / config for optional features (AI can be toggled per course/system setting)

## Upgrade Path
This phase lays the foundational infrastructure (AI Gateway, Queue, Credits) required for the subsequent Phase 12 (AI Interview System). The Gateway and Client packages built here will be reused directly for streaming AI responses and managing voice LLM interactions.

## Definition of Done
- FastAPI AI Gateway deployed and routing requests successfully.
- AI Client package published and utilized by main application.
- Question Modification and Generation workers functioning in staging environment.
- Strict JSON output validation prevents malformed questions from entering the database.
- Frontend review workflow allows seamless approval of generated questions.
- Unit, Integration, and E2E tests pass with >80% coverage.
</Phase 11 — AI Question System>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 21: AI Gateway](../specs/21-ai-gateway.md)
- [Spec 22: AI Question System](../specs/22-ai-question-system.md)

### Key Team Role Guidelines
- [AI Engineer](../roles/29-ai-engineer.md) — Features 11.1, 11.2, 11.3, 11.4
- [ML Engineer](../roles/28-ml-engineer.md) — Features 11.6, 11.7, 11.8
- [Backend Engineer](../roles/16-backend-engineer.md) — Feature 11.5

### Operational Standards & Guides
- [AI Gateway Spec](../ai-gateway-spec.md)
- [API Reference Catalog](../guides/02-api-reference.md)