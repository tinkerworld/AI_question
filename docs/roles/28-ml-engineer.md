# ML Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The ML Engineer owns the deployment, serving, and monitoring of ML models for the Adaptive Examination & AI Learning Platform. This role bridges the gap between Data Science and Production, focusing on feature engineering, model optimization, and ensuring the Python FastAPI AI server runs efficiently. You will also handle prompt engineering for question modification/generation and fine-tune the interview conversation models via the AI Gateway.

## 2. Core Responsibilities
1. Own the deployment and serving of ML models via the Python FastAPI server.
2. Build and maintain robust feature engineering pipelines.
3. Implement model performance monitoring and alerting systems.
4. Optimize models for latency and throughput to meet API-first SLAs.
5. Develop and refine prompts for AI question generation and modification.
6. Fine-tune LLMs for the AI interview conversation model.
7. Integrate models seamlessly with the AI Gateway provider pattern.
8. Collaborate with the Data Scientist to productionize algorithms.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Model Serving & Deployment | OWNS |
| Feature Engineering Pipelines | OWNS |
| Model Performance Monitoring | OWNS |
| Prompt Engineering | OWNS |
| Interview Model Fine-tuning | OWNS |
| AI Gateway Integration | COLLABORATES |
| Core Algorithm Design | CONSULTS |
| Frontend Implementation | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Deliverables: Setup Python FastAPI project alongside Monorepo Setup & Infrastructure (1.1).

### Phase 2 — Academic Structure
- No primary deliverables. Support other teams as needed.

### Phase 3 — Question Bank
- Deliverables: Deploy models for Question Tags (3.4) and Question Bank Analytics (3.8).

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- Deliverables: Optimize Exam Generation Engine (5.1) serving for low latency.

### Phase 6 — Exam System
- Deliverables: Implement real-time feature extraction for the Auto-Evaluation Engine (6.5).

### Phase 7 — Exam Archive
- No primary deliverables. Support other teams as needed.

### Phase 8 — Student Analytics
- Deliverables: Deploy the Mastery Engine (8.1) models as scalable API endpoints.

### Phase 9 — Personalized Practice
- Deliverables: Deploy the Weakness Pool Generation (9.1) and Personalized Practice Paper Generation (9.2) models.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Deliverables: Optimize prompts for AI Question Modification Worker (11.3) and AI Question Generation Worker (11.4). Support Local AI Model Support (11.7) deployment.

### Phase 12 — AI Interview
- Deliverables: Fine-tune and deploy models for Controlled Natural Conversation Engine (12.3). Integrate and serve STT (12.4) and TTS (12.5) capabilities.

### Phase 13 — Subscriptions
- Deliverables: Support AI Usage Tracking & Limits (13.4) inside ML endpoints.

### Phase 14 — Production Hardening
- Deliverables: Implement AI Queue & Rate Management (14.6) and Performance Optimization (14.5) for model serving.

## 5. Key Guidelines
### 5.1 Technical Standards
- Model serving must use Python FastAPI.
- All endpoints must adhere to the API-first contract defined in OpenAPI.
- Use `pytest` for testing serving logic and feature pipelines.

### 5.2 Collaboration Model
- Work with the Data Scientist to convert exploratory models into production code.
- Collaborate with the AI Engineer on AI Gateway adapter requirements.

### 5.3 Tools & Processes
- pnpm + Turborepo (Python services integrated via scripts).
- Model registry and monitoring tools (e.g., MLflow, Prometheus).

## 6. Do's ✅
1. Do write comprehensive `pytest` cases for all feature engineering logic.
2. Do use Pydantic for input/output validation in FastAPI.
3. Do log model prediction latency and throughput metrics.
4. Do version all deployed models and prompts.
5. Do implement fallback mechanisms if a model fails to return a prediction.
6. Do ensure the FastAPI server is stateless to support horizontal scaling.
7. Do optimize prompts for cost and token efficiency.
8. Do monitor for model drift and data drift continuously.
9. Do use asynchronous programming (`async def`) in FastAPI for I/O bound tasks.
10. Do document all API endpoints using FastAPI's built-in Swagger/OpenAPI.
11. Do keep feature engineering logic modular and independent.
12. Do securely manage API keys for external LLM providers.
13. Do conduct load testing (e.g., with Locust) on model serving endpoints.
14. Do decouple model loading from request handling (load on startup).
15. Do follow the AI provider-agnostic principles of the AI Gateway.

## 7. Don'ts ❌
1. Don't serve unoptimized, large models without checking memory constraints.
2. Don't hardcode prompt templates in the core application logic; version them.
3. Don't block the FastAPI event loop with synchronous heavy computation.
4. Don't deploy models without baseline performance metrics.
5. Don't bypass the AI Gateway for interacting with LLMs.
6. Don't ignore schema changes from the PostgreSQL database in feature pipelines.
7. Don't leak PII data into model logs or monitoring dashboards.
8. Don't skip writing tests for edge cases in feature extraction.
9. Don't use different code for training and serving feature pipelines (training-serving skew).
10. Don't assume the Data Scientist's prototype is production-ready as-is.
11. Don't fail silently; log informative errors for model prediction failures.
12. Don't hard-code model versions in the API; use aliases or configuration files.
13. Don't neglect prompt injection vulnerabilities when handling user input.
14. Don't run Jupyter notebooks in the production environment.
15. Don't ignore the monorepo structure; keep ML services modular.

## 8. Quality Gates
- All FastAPI endpoints must pass Supertest/integration tests.
- Model latency must be under 250ms for synchronous user-facing requests.
- Prompts must pass automated evaluation against benchmark datasets.

## 9. Escalation Path
- Model performance degradation: Escalate to Data Scientist.
- Infrastructure bottlenecks: Escalate to MLOps Engineer.

## 10. KPIs & Success Metrics
- API Latency (p95 and p99) for model serving endpoints.
- Error rates of the FastAPI server.
- Prompt token efficiency and cost per request.
