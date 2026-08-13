# AI Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The AI Engineer owns the implementation of AI features, the development of the AI Gateway, and LLM integration for the Adaptive Examination & AI Learning Platform. You ensure that the platform remains AI provider-agnostic through the Gateway pattern, handling integrations with Ollama, OpenAI, Anthropic, and custom models. You are responsible for the core infrastructure of the AI Question System and AI Interview System.

## 2. Core Responsibilities
1. Build and maintain the Python FastAPI AI server and the AI Gateway infrastructure.
2. Implement the provider adapter pattern for Ollama, OpenAI, Anthropic, and custom models.
3. Develop and manage the prompt template system.
4. Implement rigorous output validation for all LLM responses.
5. Integrate STT (Speech-to-Text) and TTS (Text-to-Speech) for the AI Interview System.
6. Ensure the AI Gateway handles rate limiting, retries, and fallback logic.
7. Collaborate with the ML Engineer on prompt deployment and optimization.
8. Maintain module independence between the core API and the AI Gateway.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| AI Gateway Infrastructure | OWNS |
| Provider Adapters | OWNS |
| Prompt Template System | OWNS |
| Output Validation Logic | OWNS |
| STT/TTS Integration | OWNS |
| Python FastAPI Architecture | OWNS |
| Model Fine-tuning | COLLABORATES |
| Express + TypeScript API | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- No primary deliverables. Support other teams as needed.

### Phase 2 — Academic Structure
- No primary deliverables. Support other teams as needed.

### Phase 3 — Question Bank
- No primary deliverables. Support other teams as needed.

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- No primary deliverables. Support other teams as needed.

### Phase 6 — Exam System
- No primary deliverables. Support other teams as needed.

### Phase 7 — Exam Archive
- No primary deliverables. Support other teams as needed.

### Phase 8 — Student Analytics
- No primary deliverables. Support other teams as needed.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Deliverables: Build AI Gateway Architecture (11.1) and AI Client Package (11.2). Implement AI Question Modification Worker (11.3) and AI Question Generation Worker (11.4). Set up AI Usage Tracking (11.5) and AI Worker Queue System (11.6). Provide Local AI Model Support (11.7) and Cloud AI Integration (11.8).

### Phase 12 — AI Interview
- Deliverables: Build the Controlled Natural Conversation Engine (12.3) and integrate Speech-to-Text (STT) (12.4) and Text-to-Speech (TTS) (12.5) for real-time interview flows. Support Interview Feedback Generation (12.7).

### Phase 13 — Subscriptions
- Deliverables: Ensure the AI Gateway correctly triggers limits for AI Usage Tracking & Limits (13.4) and interacts with the AI Credit System (13.3).

### Phase 14 — Production Hardening
- Deliverables: Finalize AI Queue & Rate Management (14.6) and general Performance Optimization (14.5) for AI Gateway endpoints.

## 5. Key Guidelines
### 5.1 Technical Standards
- AI Gateway must be built using Python FastAPI.
- Strict typing must be used (Pydantic) for all AI outputs and inputs.
- All AI endpoints must follow the API-first philosophy.
- Use `pytest` for all unit and integration testing of adapters and validation logic.

### 5.2 Collaboration Model
- Work closely with Backend Engineers to integrate the Express API with the AI Gateway.
- Collaborate with the ML Engineer to implement fine-tuned models in the gateway.

### 5.3 Tools & Processes
- pnpm + Turborepo for monorepo integration.
- Standardized logging for cost tracking and usage monitoring.

## 6. Do's ✅
1. Do implement the provider adapter pattern strictly to ensure agnostic behavior.
2. Do validate all LLM outputs using structured schemas (e.g., JSON schemas via Pydantic).
3. Do implement robust retry logic and fallback mechanisms across providers.
4. Do design the AI Gateway to handle streaming responses efficiently.
5. Do use environment variables for all provider API keys and configurations.
6. Do write mock tests using the mock provider to simulate LLM latency and failures.
7. Do maintain a centralized prompt template registry.
8. Do ensure STT/TTS integrations are optimized for low latency in interviews.
9. Do log token usage and metadata for every LLM request.
10. Do implement rate limiting on the AI Gateway to prevent cost overruns.
11. Do keep the AI server stateless and horizontally scalable.
12. Do handle context window limits gracefully in conversational models.
13. Do sanitize user inputs to mitigate prompt injection attacks.
14. Do document the AI Gateway API thoroughly using OpenAPI.
15. Do use async/await for all external provider network calls.

## 7. Don'ts ❌
1. Don't hard-code any specific AI provider in the core logic.
2. Don't skip output validation; never trust raw LLM outputs.
3. Don't bypass the AI Gateway to call external providers directly from the Express API.
4. Don't block the FastAPI async event loop with synchronous operations.
5. Don't expose internal prompt structures or system instructions to the end-user.
6. Don't commit API keys or sensitive credentials to the repository.
7. Don't rely solely on one provider; always have a fallback configured.
8. Don't ignore error handling for provider timeouts or 5xx errors.
9. Don't couple the AI Gateway logic tightly with the PostgreSQL database.
10. Don't use unstructured text responses when JSON is required by the frontend.
11. Don't deploy untested prompt changes to production.
12. Don't forget to implement timeout limits for long-running LLM generation tasks.
13. Don't log sensitive PII data when logging AI request/response payloads.
14. Don't assume STT/TTS will be perfect; build in error correction UI flows.
15. Don't deviate from the API-first design principles.

## 8. Quality Gates
- 100% of LLM outputs must pass Pydantic schema validation.
- All provider adapters must have >90% test coverage using `pytest` and mock providers.
- Architecture review required to ensure the Gateway remains provider-agnostic.

## 9. Escalation Path
- Provider outages: Automatically fallback; escalate to MLOps Engineer if all providers fail.
- Integration issues with Express API: Escalate to Backend Lead.

## 10. KPIs & Success Metrics
- API Latency and Gateway overhead (<50ms processing time, excluding provider latency).
- Output validation success rate (>95%).
- Zero downtime during single-provider outages (successful failovers).
