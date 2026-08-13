# AI Gateway — Functional Specification

## 1. Overview
The AI Gateway serves as the universal, single entry point for all AI operations within the Adaptive Examination & AI Learning Platform. The application never calls AI models directly; instead, it uses an AI Client SDK that communicates with the AI Gateway API, which then routes requests through Provider Adapters to any local, cloud, or custom AI service. This architecture centralizes authentication, authorization, rate limiting, routing, caching, and cost tracking, allowing seamless swapping of AI providers with zero code changes in the core application.

## 2. User Stories
- As a Main Admin, I want to configure AI providers and API keys so that the platform can use different AI services flexibly.
- As a Main Admin, I want to set up rate limits and view usage/cost reports so that I can manage infrastructure expenses.
- As a Developer, I want a single unified SDK to call AI features so that I don't have to write provider-specific API logic.
- As a Student/Teacher, I want reliable AI responses even if a primary provider goes down, so that my workflow is uninterrupted.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Configure AI Providers | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Prompt Templates | ✅ | ✅ | ❌ | ❌ | ❌ |
| View System Cost/Usage | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trigger AI Operations | ❌ | ❌ | ✅ | ✅ | ⚙️ |

## 4. Features & Capabilities

### 4.1 Universal Provider Support & Adapter Interface
**What it does**: Supports any AI provider (Local: Ollama, vLLM, llama.cpp; Cloud: OpenAI, Anthropic, Google AI, Azure; Custom: Any HTTP endpoint).
**How it works**: Uses a Provider Adapter interface requiring `complete`, `stream`, `health_check`, and `get_available_models` implementations. Adding a new provider requires only implementing this interface and adding a config entry.
**Business Rules**: The core application is entirely provider-agnostic.
**Edge Cases**: If a provider returns non-standard formats, the adapter normalizes it to the gateway's unified schema.

### 4.2 Gateway Responsibilities Core
**What it does**: Centralizes non-functional requirements for AI access.
**How it works**: 
- **Authentication/Authorization**: Validates internal requests and checks if the requesting user has permission to use the specific AI feature.
- **Rate Limiting**: Applies per-user and per-feature token/request limits.
- **Provider Routing & Circuit Breaker**: Routes requests based on preferred providers. If the primary fails, the circuit breaker trips, disabling the unhealthy provider temporarily, and routes to a fallback.
- **Prompt Template Management**: Stores versioned prompt templates outside the codebase.
- **Output Validation**: Ensures responses match expected JSON schemas before returning to the app.
**Business Rules**: Requests exceeding rate limits are rejected with 429 status.
**Edge Cases**: If all fallback providers fail, a graceful error is returned.

### 4.3 Tracking & Optimizations
**What it does**: Manages costs, performance, and queues.
**How it works**:
- **Usage & Cost Tracking**: Logs requests, tokens, and calculates internal per-provider costs.
- **Queue Management**: Prioritizes live (interactive) requests over batch (background generation) requests.
- **Caching**: Optionally caches identical deterministic requests to save costs.
- **Logging**: Records all latency, errors, and payloads for auditing.
**Business Rules**: Batch jobs can be delayed to preserve capacity for live users.
**Edge Cases**: Cache invalidation for templates modified by admins.

## 5. Data Model
```
Table: ai_providers
├── id (PK, CUID)
├── name (String) — e.g., 'OpenAI', 'Ollama'
├── type (Enum) — CLOUD, LOCAL, CUSTOM
├── base_url (String)
├── auth_config (JSON) — Encrypted API keys
├── is_active (Boolean)
├── priority (Int)
└── timestamps

Table: ai_prompt_templates
├── id (PK, CUID)
├── feature_key (String) — e.g., 'generate_question'
├── version (Int)
├── template_content (Text)
├── expected_schema (JSON)
├── is_active (Boolean)
└── timestamps

Table: ai_usage_logs
├── id (PK, CUID)
├── user_id (FK, CUID)
├── feature_key (String)
├── provider_id (FK, CUID)
├── prompt_tokens (Int)
├── completion_tokens (Int)
├── estimated_cost (Decimal)
├── latency_ms (Int)
└── created_at (Timestamp)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/ai/gateway/complete` | Unified text completion | `{ feature_key, variables, stream: bool }` | `{ content, usage, provider }` | Bearer | User (Role checked by feature) |
| POST | `/api/ai/gateway/stt` | Speech to text | Form data (Audio) | `{ text, confidence }` | Bearer | User |
| POST | `/api/ai/gateway/tts` | Text to speech | `{ text, voice_id }` | Audio stream | Bearer | User |
| GET | `/api/ai/admin/providers` | List providers | None | `[{ id, name, status... }]` | Bearer | Main Admin |
| PUT | `/api/ai/admin/providers/:id` | Update provider config | `{ base_url, api_key, priority }` | `{ success }` | Bearer | Main Admin |

## 7. UI Screens & Components
### Screen: AI Configuration Dashboard
**URL**: `/admin/ai/settings`
**Layout**: Dashboard showing active providers, circuit breaker statuses, and usage graphs.
**Interactive Elements**: Toggle switches to enable/disable providers, form to add new providers (select type, input URL/key), drag-and-drop to reorder provider priority.
**States**: Loading metrics, empty (no providers), active dashboard, error (provider disconnected).

## 8. Business Rules
1. The AI Gateway must intercept 100% of LLM, STT, and TTS requests from the platform.
2. If a provider fails 3 consecutive times, it is circuit-broken for 5 minutes.
3. Live user requests must bypass queues if capacity allows, whereas background generation jobs are strictly queued.
4. AI costs are calculated based on fixed internal conversion rates per provider.

## 9. Validation Rules
- **Prompt Variables**: Must match the required variables in the active `ai_prompt_templates`.
- **Output Validation**: LLM outputs for structured data must pass JSON schema validation. Retries happen internally up to 2 times on validation failure.

## 10. Error Handling
- **429 Too Many Requests**: Returned when user exceeds rate limits or system capacity is full.
- **503 Service Unavailable**: Returned when all configured providers for a feature are down.
- **Validation Errors**: Logged internally; user sees a generic "Generation failed, please try again" message.

## 11. Integration Points
- **Question System**: Uses Gateway for question generation/modification.
- **Interview System**: Uses Gateway for live STT, TTS, and LLM conversations.
- **User Management**: Consults for roles to apply correct rate limits.

## 12. Configuration Options
- **YAML Config File**: Defines provider types, adapter mapping, and default fallback chains (hot-reloadable).
- **Deployment Profiles**: Settings for full-cloud, local-only (air-gapped), or hybrid setups.

## 13. Future Enhancements
- Semantic caching to catch similar, but not exactly identical, prompts.
- Advanced cost-based routing (dynamically select the cheapest provider for the requested task).
