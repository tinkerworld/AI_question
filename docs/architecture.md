# Architecture Decision Records — Exam Platform

## CORE ARCHITECTURAL PRINCIPLES

> **Every feature in this platform is an API. The frontend is just one consumer.**
> **Every module is independent and replaceable.**
> **AI is never directly coupled — it flows through a universal gateway.**

### Principle 1: API-First, Platform-Agnostic

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Next.js    │  │  Mobile App  │  │  Desktop App │  │  Third-Party │
│   Web App    │  │ React Native │  │   Electron   │  │ Integration  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┘
                                  │
                           REST API (Express)
                                  │
                         ┌────────┴────────┐
                         │  Application    │
                         │  Modules        │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              PostgreSQL      Redis       AI Gateway
```

**Rules:**
- ALL business logic lives in the API, NEVER in the frontend
- Frontend is a thin presentation layer — it calls APIs and renders results
- Every user action maps to an API call
- API responses are self-contained (include all data needed to render)
- No frontend-specific logic in the API (no HTML, no view logic)
- API documentation (OpenAPI/Swagger) generated automatically
- API versioning from day one: `/api/v1/...`
- Any new platform (mobile, desktop, CLI, third-party) can consume the same API without any backend changes

### Principle 2: True Module Independence

```
Module A                    Module B
┌─────────────────┐        ┌─────────────────┐
│ Routes          │        │ Routes          │
│ Controller      │        │ Controller      │
│ Service ────────┼──API──▶│ Service         │
│ Repository      │        │ Repository      │
│ Types           │        │ Types           │
│ Tests           │        │ Tests           │
└────────┬────────┘        └────────┬────────┘
         │                          │
    Own DB Tables              Own DB Tables
```

**Rules:**
- Modules NEVER import from another module's internal files
- Module-to-module communication ONLY through:
  - **Service interfaces** (internal function calls within the monolith)
  - **Events** (for async/decoupled communication)
  - **API calls** (when extracted to microservice)
- Each module owns its database tables exclusively
- No cross-module JOINs in queries
- Each module has its own route prefix: `/api/v1/auth/*`, `/api/v1/users/*`, `/api/v1/exams/*`
- Each module can be:
  - Disabled without breaking other modules
  - Extracted to a separate microservice
  - Replaced with a different implementation
  - Tested in complete isolation

### Principle 3: AI is Gateway-Managed, Provider-Agnostic

```
Application Modules
       │
       ▼
  AI Client SDK (@repo/ai-client)
       │
       ▼ (HTTP API calls)
  ┌──────────────────────────────────────────────┐
  │              AI GATEWAY API                  │
  │                                              │
  │  Auth │ Rate Limit │ Route │ Track │ Queue   │
  └──────────────────┬───────────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Local   │ │  Cloud   │ │  Custom  │
    │  Server  │ │  APIs    │ │  API     │
    │          │ │          │ │          │
    │ Ollama   │ │ OpenAI   │ │ Your own │
    │ vLLM     │ │ Anthropic│ │ endpoint │
    │ llama.cpp│ │ Google   │ │ Any URL  │
    │ LM Studio│ │ Azure    │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

**Rules:**
- Application code NEVER calls an AI model directly
- Application code calls the AI Client SDK
- AI Client SDK calls the AI Gateway API (HTTP)
- AI Gateway decides which provider to use based on configuration
- Providers are hot-swappable without code changes
- New providers added by implementing a simple adapter interface
- AI Gateway handles ALL cross-cutting concerns (auth, limits, tracking, cost)

---

## ADR-001: API-First Architecture

**Status**: Accepted

**Context**: The platform must be convertible to any platform — web, mobile, desktop, third-party integration, embedded, or white-label.

**Decision**: The API is the product. The frontend is one of many possible consumers. All business logic, validation, authorization, and data processing happens in the API layer. The API is designed to be consumed by ANY client.

**Consequences**:
- Mobile/desktop apps can be built without touching the backend
- Third-party integrations get the same API as the web app
- API can be monetized independently (API-as-a-service)
- Frontend can be swapped entirely (e.g., from Next.js to Flutter Web)
- API must be thoroughly documented (OpenAPI/Swagger)
- API versioning required from the start

**API Design Standards**:
```
# Consistent response envelope
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  },
  "error": null
}

# Error response
{
  "success": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be a valid email" }
    ]
  }
}

# API Versioning
/api/v1/users
/api/v1/exams
/api/v1/ai/questions/modify

# Authentication
Authorization: Bearer <access_token>

# Pagination
GET /api/v1/users?page=1&pageSize=20&sort=createdAt&order=desc

# Filtering
GET /api/v1/questions?course=PHY12&difficulty=HARD&type=MCQ&status=PUBLISHED

# Search
GET /api/v1/questions?search=velocity&searchFields=content,tags
```

---

## ADR-002: Modular Monolith with Extraction Path

**Status**: Accepted

**Context**: Starting with microservices adds unnecessary complexity. But the architecture must allow extracting any module to a separate service without rewriting.

**Decision**: Modular monolith where each module is a self-contained unit with its own routes, controllers, services, repositories, and types. Modules communicate through defined interfaces. An internal event bus allows async communication.

**Module Structure**:
```
modules/exams/
├── exams.routes.ts          # Route definitions (Express Router)
├── exams.controller.ts      # HTTP request/response handling
├── exams.service.ts          # Business logic (TESTABLE IN ISOLATION)
├── exams.repository.ts       # Database queries (Prisma)
├── exams.validator.ts        # Zod schemas for this module
├── exams.types.ts            # Module-specific types
├── exams.events.ts           # Events this module emits/listens to
├── exams.constants.ts        # Module constants
├── __tests__/
│   ├── exams.service.test.ts
│   ├── exams.api.integration.test.ts
│   └── exams.e2e.test.ts
└── index.ts                  # Public API (what other modules can import)
```

**Module Communication Contract**:
```typescript
// ✅ CORRECT: Import from module's public API
import { ExamService } from '../exams';

// ❌ WRONG: Import from module's internals
import { something } from '../exams/exams.repository';

// ✅ CORRECT: Use events for cross-module side effects
eventBus.emit('exam.published', { examId, publishedBy });

// ✅ CORRECT: Service interface for cross-module calls
interface IExamService {
  getById(id: string): Promise<Exam>;
  publish(id: string, userId: string): Promise<Exam>;
}
```

**Extraction Path**:
```
STEP 1 (Now):     Module inside monolith, function calls
STEP 2 (Scale):   Module behind internal API, HTTP calls within cluster
STEP 3 (Growth):  Module as independent microservice, full API
```

---

## ADR-003: Universal AI Gateway

**Status**: Accepted

**Context**: AI models change rapidly. Today's best model is tomorrow's legacy. The platform must not be locked to any AI provider, model, or deployment method.

**Decision**: All AI interactions flow through a universal AI Gateway that abstracts provider details. The gateway is a separate service (Python FastAPI) with its own API. The main application uses an AI Client SDK to communicate with the gateway.

**Provider Adapter Pattern**:
```python
# Every AI provider implements this interface
class AIProvider(ABC):
    @abstractmethod
    async def complete(self, prompt: str, config: ModelConfig) -> CompletionResult:
        """Generate text completion"""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is available"""
        pass

# Concrete implementations
class OllamaProvider(AIProvider):      # Local Ollama server
class OpenAIProvider(AIProvider):       # OpenAI API
class AnthropicProvider(AIProvider):    # Anthropic API
class GoogleProvider(AIProvider):       # Google AI API
class AzureProvider(AIProvider):        # Azure OpenAI
class VLLMProvider(AIProvider):         # vLLM server
class LMStudioProvider(AIProvider):     # LM Studio
class CustomAPIProvider(AIProvider):    # Any custom HTTP endpoint
```

**Gateway Configuration (runtime, not code)**:
```yaml
# ai-gateway-config.yaml — Hot-reloadable, no code changes needed
providers:
  - name: "local-ollama"
    type: "ollama"
    base_url: "http://localhost:11434"
    models: ["llama3.1", "qwen2.5"]
    priority: 1                        # Try local first
    enabled: true

  - name: "openai-cloud"
    type: "openai"
    api_key: "${OPENAI_API_KEY}"
    models: ["gpt-4o", "gpt-4o-mini"]
    priority: 2                        # Fallback to cloud
    enabled: true

  - name: "custom-api"
    type: "custom"
    base_url: "https://my-ai-server.example.com/v1"
    api_key: "${CUSTOM_AI_KEY}"
    models: ["my-model"]
    priority: 3
    enabled: false                     # Disabled for now

routing:
  question_modification:
    preferred_provider: "local-ollama"
    preferred_model: "llama3.1"
    fallback_provider: "openai-cloud"
    fallback_model: "gpt-4o-mini"

  question_generation:
    preferred_provider: "local-ollama"
    preferred_model: "qwen2.5"
    fallback_provider: "openai-cloud"
    fallback_model: "gpt-4o"

  interview_conversation:
    preferred_provider: "openai-cloud"   # Needs fast response
    preferred_model: "gpt-4o"
    fallback_provider: "local-ollama"
    fallback_model: "llama3.1"

  evaluation:
    preferred_provider: "local-ollama"
    preferred_model: "llama3.1"
    fallback_provider: "openai-cloud"
    fallback_model: "gpt-4o-mini"

stt_providers:
  - name: "whisper-local"
    type: "whisper"
    model_path: "/models/whisper-large-v3"
    priority: 1

  - name: "google-stt"
    type: "google_speech"
    api_key: "${GOOGLE_STT_KEY}"
    priority: 2

tts_providers:
  - name: "piper-local"
    type: "piper"
    model_path: "/models/piper-en"
    priority: 1

  - name: "google-tts"
    type: "google_tts"
    api_key: "${GOOGLE_TTS_KEY}"
    priority: 2
```

---

## ADR-004: Published Exam Immutability

**Status**: Accepted

**Context**: Published exams are legal/academic records. Student attempts reference specific exam versions.

**Decision**: Frozen snapshots on publish. Corrections through formal workflow only.

---

## ADR-005: Permission-Based Authorization

**Status**: Accepted

**Context**: Hard-coding role checks makes custom roles impossible.

**Decision**: Granular permissions (e.g., 'exam.publish'). Roles are collections of permissions. Authorization middleware checks permissions, not role names.

---

## ADR-006: Pluggable Question Types

**Status**: Accepted

**Decision**: Registry pattern. Each type implements: schema, renderer, validator, evaluator. New types added without modifying core exam engine.

---

## ADR-007: Question Versioning with Snapshots

**Status**: Accepted

**Decision**: Every edit creates new version. Published exams store question snapshots while retaining original reference.

---

## ADR-008: Centralized Entitlement Engine

**Status**: Accepted

**Decision**: Centralized entitlement engine defines all plan features. Components call the engine to check access, never check plan names directly.

---

## ADR-009: Event-Driven Module Communication

**Status**: Accepted

**Context**: Modules need to react to events in other modules (e.g., when an exam is published, update question history). Direct function calls create tight coupling.

**Decision**: Internal event bus for cross-module side effects. Synchronous calls for queries, async events for notifications/side effects.

```typescript
// Module A publishes
eventBus.emit('exam.published', { examId, questionIds, publishedBy });

// Module B listens
eventBus.on('exam.published', async (data) => {
  await questionService.recordExamHistory(data.questionIds, data.examId);
});

// Module C also listens
eventBus.on('exam.published', async (data) => {
  await notificationService.notifyStudents(data.examId);
});
```

**Consequences**:
- Modules don't need to know about each other
- New side effects added without modifying the emitting module
- Events can be replayed for debugging
---

## ADR-010: Git-Like Entity Versioning & Rollback Engine

**Status**: Accepted

**Context**: Modifications to User Profiles, Question Bank items, Exam Patterns, Exams, and Syllabus Nodes require strict accountability, historical diff visualization, and a non-destructive way to revert errors.

**Decision**: Implement a shared package (`@repo/versioning-engine`) storing immutable version commits in `entity_versions`.
- Every mutation (create/update/status_change/delete) writes an `entity_versions` record with `snapshot` (JSONB) and `delta` (JSON patch).
- Reverting to Version `X` does NOT delete Version `X+1`..`Y`. Instead, it creates Version `Y+1` whose snapshot equals Version `X`, tagged as `actionType = 'REVERT'`.
- All revert operations emit audit log events (`user.profile_reverted`, `question.reverted`, `syllabus.node_reverted`).

---

## ADR-011: Financial Audit & Refund Adapter Engine

**Status**: Accepted

**Context**: Billing transactions must support administrator-approved refunds ("return money") with mandatory financial logging, credit clawbacks, and entitlement adjustments.

**Decision**:
- Implement `BillingAdapter.processRefund({ subscriptionId, amount, reason, clawbackCredits })`.
- Record all monetary transactions and refunds in `refund_transactions` and `billing_logs`.
- Refunding a purchase automatically revokes unused AI credits or reverts subscription tiers via `@repo/entitlement-engine`.
- In Preview Student mode (`mode = 'PREVIEW'`), refund commands bypass real payment gateways, return simulated refund references, and log actions under preview context.

---

## ADR-012: Single Source of Truth for API Contracts & Permission Conventions

**Status**: Accepted

**Context**: API route namespaces, HTTP methods, and permission strings must be defined deterministically without documentation drift between functional specs, role guidelines, and API reference guides.

**Decision**:
- `docs/guides/02-api-reference.md` is the authoritative **Single Source of Truth** for all API endpoint paths, methods, request/response formats, and permission names.
- All API routes strictly use versioned flat resource paths (e.g., `/api/v1/roles`, `/api/v1/users`, `/api/v1/questions`).
- All permission strings strictly use lowercase plural resource dot notation (`resource.action`, e.g., `roles.read`, `roles.create`, `roles.update`, `roles.delete`, `users.create`, `questions.create`).
- All feature and profile specifications defer to `docs/guides/02-api-reference.md` for master API contracts.

---

## ADR-013: 3-Theme Switcher & Database-Driven Multilingual Engine

**Status**: Accepted

**Context**: Users require visual comfort options (`LIGHT`, `GRAY` slate warm neutral low-contrast mode, `DARK` obsidian mode) and native language localization across all 22 official Schedule 8 languages of India + English (23 baseline languages).

**Decision**:
- Implement a database-driven translation dictionary stored in `languages`, `translation_keys`, and `translations`.
- Store user theme preference (`LIGHT` | `GRAY` | `DARK`) and language code in `user_preferences`.
- Provide REST endpoints (`/api/v1/i18n/*`) with Redis caching for real-time translation updates and dynamic language additions without code redeployments.

---

## Module Ownership & Database Table Assignments

| Module | Owned Tables | API Prefix | Can Be Extracted |
|---|---|---|---|
| **auth** | refresh_tokens | `/api/v1/auth` | ✅ |
| **users** | users, user_roles, entity_versions (User scope) | `/api/v1/users` | ✅ |
| **roles** | roles, permissions, role_permissions | `/api/v1/roles` | ✅ |
| **courses** | courses, subjects, enrollments | `/api/v1/courses` | ✅ |
| **syllabus** | syllabus_nodes, entity_versions (Syllabus scope) | `/api/v1/syllabus` | ✅ |
| **questions** | questions, question_versions, question_tags, question_exam_history, entity_versions (Question scope) | `/api/v1/questions` | ✅ |
| **exam-patterns** | exam_patterns, exam_pattern_versions, exam_pattern_sections, exam_pattern_rules, entity_versions (Pattern scope) | `/api/v1/exam-patterns` | ✅ |
| **exams** | exams, exam_versions, exam_sections, exam_questions, exam_question_snapshots, entity_versions (Exam scope) | `/api/v1/exams` | ✅ |
| **attempts** | exam_attempts, question_attempts, answers, evaluations | `/api/v1/attempts` | ✅ |
| **mastery** | student_mastery, student_topic_progress, student_weaknesses, student_strengths | `/api/v1/mastery` | ✅ |
| **practice** | practice_papers, practice_questions, practice_attempts | `/api/v1/practice` | ✅ |
| **interviews** | interview_templates, interview_topics, interview_sessions, interview_messages, interview_assessments | `/api/v1/interviews` | ✅ |
| **subscriptions** | plans, subscriptions, entitlements, ai_credits, ai_usage, refund_transactions | `/api/v1/subscriptions`, `/api/v1/billing` | ✅ |
| **preview** | preview_profiles, preview_courses, preview_contexts | `/api/v1/preview` | ✅ |
| **audit** | audit_logs, entity_versions (global query interface) | `/api/v1/audit`, `/api/v1/versioning` | ✅ |
| **ai** | (uses ai-gateway) | `/api/v1/ai` | ✅ (already separate) |


---

## Platform Conversion Guide

The API-first architecture enables converting to ANY platform:

| Target Platform | What Changes | What Stays the Same |
|---|---|---|
| **Mobile App (React Native)** | New frontend only | All APIs, backend, AI, database |
| **Mobile App (Flutter)** | New frontend only | All APIs, backend, AI, database |
| **Desktop App (Electron)** | New frontend shell | All APIs, backend, AI, database |
| **Progressive Web App** | Add service worker + manifest | All APIs, frontend, backend |
| **Third-Party API Service** | Add API key auth layer | All APIs, backend, AI, database |
| **White-Label Product** | Config + theming | All APIs, backend, AI, database |
| **Microservices** | Extract modules, add message queue | Module code unchanged |
| **Different AI Provider** | Change ai-gateway config | All APIs, frontend, backend |
| **Different Database** | Change Prisma provider | All APIs, frontend, AI gateway |

---

## Key Architectural References & Document Map

- **AI Gateway Specification**: [`docs/ai-gateway-spec.md`](ai-gateway-spec.md)
- **Module Boundary & API Rules**: [`docs/module-api-spec.md`](module-api-spec.md)
- **Master Test Strategy**: [`docs/test-strategy.md`](test-strategy.md)
- **Phase Dependency Map & Feature Index**: [`docs/phase-dependency-map.md`](phase-dependency-map.md)
- **Complete ERD & Database Schema**: [`docs/guides/01-database-schema-erd.md`](guides/01-database-schema-erd.md)
- **Complete API Catalog**: [`docs/guides/02-api-reference.md`](guides/02-api-reference.md)
- **Functional Specifications Index**: [`docs/specs/README.md`](specs/README.md)
- **Developer Role Guidelines Index**: [`docs/roles/README.md`](roles/README.md)
- **Operational Guides Index**: [`docs/guides/README.md`](guides/README.md)

