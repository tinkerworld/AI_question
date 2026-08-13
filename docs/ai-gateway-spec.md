# AI Gateway — Complete Specification

## Overview

The AI Gateway is the **single entry point** for ALL AI operations in the platform. No application code ever touches an AI model directly. The Gateway is a standalone service with its own API, configuration, and provider management.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN APPLICATION                            │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Question │ │  Exam    │ │ Practice │ │Interview │  ...modules  │
│  │ Module   │ │ Module   │ │ Module   │ │ Module   │              │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘              │
│       │             │            │             │                    │
│       └─────────────┴────────────┴─────────────┘                   │
│                              │                                      │
│                    ┌─────────┴──────────┐                           │
│                    │  AI Client SDK     │                           │
│                    │  @repo/ai-client   │                           │
│                    │  (TypeScript)      │                           │
│                    └─────────┬──────────┘                           │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                          HTTP/REST API
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                         AI GATEWAY                                  │
│                      (Python FastAPI)                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     GATEWAY LAYER                            │   │
│  │                                                              │   │
│  │  ┌────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌──────────┐  │   │
│  │  │  Auth  │ │  Rate   │ │ Queue │ │ Router │ │  Usage   │  │   │
│  │  │        │ │ Limiter │ │       │ │        │ │ Tracker  │  │   │
│  │  └────────┘ └─────────┘ └───────┘ └────────┘ └──────────┘  │   │
│  │                                                              │   │
│  │  ┌────────┐ ┌─────────┐ ┌───────────┐ ┌──────────────────┐  │   │
│  │  │ Prompt │ │ Output  │ │  Cost     │ │  Logging &       │  │   │
│  │  │Template│ │Validator│ │  Tracker  │ │  Monitoring      │  │   │
│  │  └────────┘ └─────────┘ └───────────┘ └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   WORKER LAYER                               │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │  Question    │  │  Question    │  │  Interview   │       │   │
│  │  │  Modification│  │  Generation  │  │  Conversation│       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │  Evaluation  │  │    STT       │  │    TTS       │       │   │
│  │  │              │  │  (Speech to  │  │  (Text to    │       │   │
│  │  │              │  │   Text)      │  │   Speech)    │       │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  PROVIDER LAYER                              │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ Ollama  │ │ OpenAI  │ │Anthropic│ │ Google  │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  │                                                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │  vLLM   │ │LM Studio│ │  Azure  │ │ Custom  │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ │  API    │           │   │
│  │                                       └─────────┘           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │   │
│  │  │ Whisper │ │Google   │ │ Piper   │  ...STT/TTS providers │   │
│  │  │ (STT)   │ │STT/TTS  │ │ (TTS)  │                       │   │
│  │  └─────────┘ └─────────┘ └─────────┘                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## AI Gateway API Endpoints

### LLM Operations

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/ai/complete` | Generic text completion | API Key |
| POST | `/api/v1/ai/questions/modify` | Modify an existing question | API Key |
| POST | `/api/v1/ai/questions/generate` | Generate new questions | API Key |
| POST | `/api/v1/ai/questions/evaluate` | Evaluate a subjective answer | API Key |
| POST | `/api/v1/ai/interview/respond` | Generate interview response | API Key |
| POST | `/api/v1/ai/interview/evaluate` | Evaluate interview session | API Key |
| POST | `/api/v1/ai/feedback/generate` | Generate personalized feedback | API Key |

### Speech Operations

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/ai/stt/transcribe` | Audio → Text | API Key |
| POST | `/api/v1/ai/stt/stream` | Streaming audio → text (WebSocket) | API Key |
| POST | `/api/v1/ai/tts/synthesize` | Text → Audio | API Key |

### Management Operations

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/ai/health` | Gateway health check | None |
| GET | `/api/v1/ai/providers` | List configured providers | Admin Key |
| GET | `/api/v1/ai/providers/:id/status` | Provider health status | Admin Key |
| POST | `/api/v1/ai/providers/:id/enable` | Enable a provider | Admin Key |
| POST | `/api/v1/ai/providers/:id/disable` | Disable a provider | Admin Key |
| GET | `/api/v1/ai/models` | List available models | API Key |
| GET | `/api/v1/ai/usage` | Usage statistics | API Key |
| GET | `/api/v1/ai/usage/cost` | Cost tracking | Admin Key |
| GET | `/api/v1/ai/queue/status` | Queue status | Admin Key |
| POST | `/api/v1/ai/config/reload` | Reload gateway config | Admin Key |

---

## Provider Adapter Interface

Every AI provider must implement this interface. Adding a new provider = one new file.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator, Optional

@dataclass
class ModelConfig:
    model: str
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 1.0
    stop_sequences: list[str] = None
    system_prompt: str = None

@dataclass
class CompletionResult:
    text: str
    model: str
    provider: str
    tokens_input: int
    tokens_output: int
    latency_ms: float
    cost_estimate: float  # In USD

@dataclass
class STTResult:
    text: str
    confidence: float
    language: str
    duration_seconds: float

@dataclass
class TTSResult:
    audio_bytes: bytes
    format: str  # "wav", "mp3", "ogg"
    duration_seconds: float


class LLMProvider(ABC):
    """Interface for all LLM providers (local or cloud)"""

    @abstractmethod
    async def complete(self, messages: list[dict], config: ModelConfig) -> CompletionResult:
        pass

    @abstractmethod
    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass

    @abstractmethod
    def get_available_models(self) -> list[str]:
        pass


class STTProvider(ABC):
    """Interface for Speech-to-Text providers"""

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> STTResult:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass


class TTSProvider(ABC):
    """Interface for Text-to-Speech providers"""

    @abstractmethod
    async def synthesize(self, text: str, voice: str = "default") -> TTSResult:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass
```

### Example: Adding a New Provider

```python
# providers/my_custom_ai.py

class MyCustomAIProvider(LLMProvider):
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key

    async def complete(self, messages, config):
        # Call your custom API endpoint
        response = await httpx.post(
            f"{self.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": config.model,
                "messages": messages,
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
            }
        )
        data = response.json()
        return CompletionResult(
            text=data["choices"][0]["message"]["content"],
            model=config.model,
            provider="my_custom_ai",
            tokens_input=data["usage"]["prompt_tokens"],
            tokens_output=data["usage"]["completion_tokens"],
            latency_ms=response.elapsed.total_seconds() * 1000,
            cost_estimate=0.0
        )

    async def health_check(self):
        try:
            r = await httpx.get(f"{self.base_url}/health")
            return r.status_code == 200
        except:
            return False

    def get_available_models(self):
        return ["my-model-v1", "my-model-v2"]
```

Then register it in config:
```yaml
providers:
  - name: "my-ai"
    type: "my_custom_ai"
    base_url: "https://my-server.com/v1"
    api_key: "${MY_AI_KEY}"
    models: ["my-model-v1"]
    priority: 1
    enabled: true
```

**Zero code changes in the application. Zero code changes in other providers.**

---

## Provider Router (Smart Routing)

```python
class ProviderRouter:
    """Routes AI requests to the best available provider"""

    async def route(self, task: str, request: dict) -> CompletionResult:
        # 1. Get routing config for this task type
        routing = self.config.routing[task]

        # 2. Try preferred provider first
        preferred = self.get_provider(routing.preferred_provider)
        if preferred and await preferred.health_check():
            try:
                return await preferred.complete(
                    request["messages"],
                    ModelConfig(model=routing.preferred_model)
                )
            except Exception as e:
                logger.warning(f"Preferred provider failed: {e}")

        # 3. Fallback to secondary provider
        fallback = self.get_provider(routing.fallback_provider)
        if fallback and await fallback.health_check():
            return await fallback.complete(
                request["messages"],
                ModelConfig(model=routing.fallback_model)
            )

        # 4. Try any available provider
        for provider in self.get_all_enabled_providers():
            if await provider.health_check():
                return await provider.complete(
                    request["messages"],
                    ModelConfig(model=provider.get_available_models()[0])
                )

        raise AIUnavailableError("No AI providers available")
```

---

## AI Client SDK (@repo/ai-client)

The TypeScript SDK that the main application uses:

```typescript
// packages/ai-client/src/client.ts

export class AIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  // Question Operations
  async modifyQuestion(request: QuestionModifyRequest): Promise<QuestionModifyResult> {
    return this.post('/api/v1/ai/questions/modify', request);
  }

  async generateQuestions(request: QuestionGenerateRequest): Promise<QuestionGenerateResult> {
    return this.post('/api/v1/ai/questions/generate', request);
  }

  async evaluateAnswer(request: EvaluateRequest): Promise<EvaluateResult> {
    return this.post('/api/v1/ai/questions/evaluate', request);
  }

  // Interview Operations
  async getInterviewResponse(request: InterviewRequest): Promise<InterviewResponse> {
    return this.post('/api/v1/ai/interview/respond', request);
  }

  async evaluateInterview(request: InterviewEvalRequest): Promise<InterviewEvalResult> {
    return this.post('/api/v1/ai/interview/evaluate', request);
  }

  // Speech Operations
  async transcribeAudio(audio: Buffer, language?: string): Promise<STTResult> {
    return this.postBinary('/api/v1/ai/stt/transcribe', audio, { language });
  }

  async synthesizeSpeech(text: string, voice?: string): Promise<Buffer> {
    return this.postForBinary('/api/v1/ai/tts/synthesize', { text, voice });
  }

  // Health & Management
  async healthCheck(): Promise<boolean> {
    const res = await this.get('/api/v1/ai/health');
    return res.status === 'healthy';
  }

  async getAvailableModels(): Promise<string[]> {
    return this.get('/api/v1/ai/models');
  }

  async getUsage(): Promise<UsageStats> {
    return this.get('/api/v1/ai/usage');
  }
}
```

**Usage in application modules:**
```typescript
// In any module's service layer
class QuestionService {
  constructor(
    private repo: QuestionRepository,
    private aiClient: AIClient  // Injected, not imported directly
  ) {}

  async createAIVariation(questionId: string): Promise<Question> {
    const original = await this.repo.findById(questionId);

    // Call AI through the client SDK → Gateway → Provider
    const variation = await this.aiClient.modifyQuestion({
      originalQuestion: original.content,
      concept: original.concept,
      difficulty: original.difficulty,
      type: original.type,
    });

    // Save as new question (DRAFT status, requires review)
    return this.repo.create({
      ...variation.question,
      status: 'DRAFT',
      parentQuestionId: questionId,
      source: 'AI_GENERATED',
    });
  }
}
```

---

## Gateway Responsibilities

| Responsibility | Description |
|---|---|
| **Authentication** | Validates API keys from the main application |
| **Authorization** | Checks which AI features the requesting user can access |
| **Rate Limiting** | Per-user, per-feature rate limits (configurable) |
| **Prompt Templates** | Maintains versioned prompt templates per task type |
| **Provider Routing** | Selects best provider based on task, availability, config |
| **Output Validation** | Validates AI output matches expected schema/format |
| **Usage Tracking** | Counts requests, tokens, sessions per user |
| **Cost Tracking** | Estimates cost per request per provider (internal metric) |
| **Queue Management** | Prioritizes live requests over batch, manages job queue |
| **Logging** | Logs all requests, responses, errors, latency |
| **Circuit Breaker** | Disables unhealthy providers, auto-recovers |
| **Caching** | Caches repeated identical requests (configurable) |
| **Retry Logic** | Retries failed requests with exponential backoff |
| **Fallback Chain** | Automatically falls back to secondary providers |

---

## Prompt Template System

Prompts are versioned and managed separately from code:

```
ai-server/
└── prompts/
    ├── question_modification/
    │   ├── v1.yaml
    │   └── v2.yaml        # New version, A/B testable
    ├── question_generation/
    │   └── v1.yaml
    ├── interview/
    │   ├── conversation_v1.yaml
    │   └── evaluation_v1.yaml
    └── answer_evaluation/
        └── v1.yaml
```

```yaml
# prompts/question_modification/v1.yaml
name: "question_modification"
version: 1
description: "Modify an existing question to create a variation"
system_prompt: |
  You are an expert educational content creator.
  Given an original question, create a variation that:
  - Tests the SAME concept
  - Has DIFFERENT wording, numbers, or scenario
  - Maintains the SAME difficulty level
  - Is a valid, solvable question

user_template: |
  Original Question: {original_question}
  Subject: {subject}
  Topic: {topic}
  Concept: {concept}
  Difficulty: {difficulty}
  Question Type: {question_type}

  Create a variation of this question.

output_schema:
  type: object
  properties:
    question_text:
      type: string
    options:
      type: array
    correct_answer:
      type: string
    explanation:
      type: string
```

---

## Deployment Flexibility

```
OPTION 1: All Local (Development / Low Cost)
┌──────────────┐     ┌──────────────┐
│ Main App     │────▶│ AI Gateway   │
│              │     │ + Ollama     │
│              │     │ + Whisper    │
│              │     │ + Piper TTS  │
└──────────────┘     └──────────────┘
     One server, everything local


OPTION 2: Hybrid (Recommended Production)
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Main App     │────▶│ AI Gateway   │────▶│ Ollama (GPU) │
│ (CPU Server) │     │ (CPU Server) │     │ (GPU Server) │
└──────────────┘     │              │     └──────────────┘
                     │              │────▶ OpenAI (Cloud)
                     └──────────────┘     (Fallback)


OPTION 3: Full Cloud
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Main App     │────▶│ AI Gateway   │────▶│ OpenAI       │
│ (Cloud VM)   │     │ (Cloud VM)   │     │ Anthropic    │
└──────────────┘     └──────────────┘     │ Google AI    │
                                          └──────────────┘


OPTION 4: Custom AI Server
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Main App     │────▶│ AI Gateway   │────▶│ Your Custom  │
│              │     │              │     │ AI Server    │
└──────────────┘     └──────────────┘     │ (Any URL)    │
                                          └──────────────┘
```

**Switching between options = configuration change only. Zero code changes.**

---

## Test Requirements for AI Gateway

| Test Category | What to Test |
|---|---|
| **Provider Adapters** | Each provider connects, authenticates, returns valid results |
| **Router** | Correct provider selected, fallback works, all-down handled |
| **Rate Limiter** | Per-user limits enforced, burst handling, reset timing |
| **Queue** | Priority ordering, concurrent processing, retry logic |
| **Output Validation** | Invalid AI output rejected, format enforcement |
| **Usage Tracking** | Accurate counting, cost calculation, daily reset |
| **Circuit Breaker** | Unhealthy provider disabled, auto-recovery timing |
| **Prompt Templates** | Template loading, variable substitution, versioning |
| **Caching** | Cache hits, expiry, invalidation |
| **Mock Provider** | Tests run without real AI — mock provider returns canned responses |
