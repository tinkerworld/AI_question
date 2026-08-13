# MLOps Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The MLOps Engineer owns the ML infrastructure, model deployment pipelines, model monitoring, and experiment tracking for the Adaptive Examination & AI Learning Platform. You ensure that the AI Gateway, Python FastAPI server, and all deployed models operate reliably and efficiently. Your focus includes model versioning, A/B testing prompt configurations, monitoring usage, and tracking API costs per provider.

## 2. Core Responsibilities
1. Own and manage the deployment of the AI Gateway and Python FastAPI server.
2. Build and maintain CI/CD pipelines for ML models and feature pipelines.
3. Implement model versioning and artifact registries.
4. Establish infrastructure for A/B testing prompts and models.
5. Monitor model usage, latency, throughput, and error rates in production.
6. Implement cost tracking and budget alerting per AI provider (OpenAI, Anthropic, etc.).
7. Maintain experiment tracking tools for Data Science and ML Engineering teams.
8. Ensure high availability and auto-scaling of ML serving infrastructure.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| ML Infrastructure & CI/CD | OWNS |
| AI Gateway Deployment | OWNS |
| Model Versioning & Registries | OWNS |
| Cost & Usage Monitoring | OWNS |
| A/B Testing Infrastructure | OWNS |
| FastAPI Application Logic | COLLABORATES |
| Core Algorithm Design | OUT OF SCOPE |
| BI Dashboards | CONSULTS |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Deliverables: Set up foundational ML infrastructure and pipelines for Python components aligned with Monorepo Setup & Infrastructure (1.1).

### Phase 2 — Academic Structure
- No primary deliverables. Support other teams as needed.

### Phase 3 — Question Bank
- Deliverables: Establish model registries and versioning for Question Bank Analytics (3.8) and Question Tags (3.4).

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- Deliverables: Setup auto-scaling for Exam Generation Engine (5.1) serving to handle exam load spikes.

### Phase 6 — Exam System
- Deliverables: Ensure high availability for the Auto-Evaluation Engine (6.5) infrastructure.

### Phase 7 — Exam Archive
- No primary deliverables. Support other teams as needed.

### Phase 8 — Student Analytics
- Deliverables: Setup deployment monitoring and load balancing for the Mastery Engine (8.1).

### Phase 9 — Personalized Practice
- Deliverables: Ensure reliable serving of Weakness Pool Generation (9.1) pipelines.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Deliverables: Deploy infrastructure for AI Gateway Architecture (11.1) and AI Worker Queue System (11.6). Establish tracking per provider for Cloud AI Integration (11.8) and local hosting config for Local AI Model Support (11.7).

### Phase 12 — AI Interview
- Deliverables: Optimize infrastructure for low-latency Speech-to-Text (STT) (12.4) and Text-to-Speech (TTS) (12.5) streams.

### Phase 13 — Subscriptions
- Deliverables: Connect ML tracking infrastructure with AI Credit System (13.3) and usage reporting.

### Phase 14 — Production Hardening
- Deliverables: Implement comprehensive Monitoring & Alerting (14.4), CI/CD Deployment Configuration (14.9), and Backup & Recovery (14.3) for all ML artifacts.

## 5. Key Guidelines
### 5.1 Technical Standards
- All infrastructure must be defined as Code (IaC - Terraform/Pulumi).
- Deployments must support zero-downtime rollouts.
- Adhere to the API-first philosophy for all monitoring and management tools.

### 5.2 Collaboration Model
- Work closely with ML Engineers and AI Engineers for seamless deployments.
- Consult with DevOps to align ML infrastructure with the broader monorepo (pnpm + Turborepo) pipelines.

### 5.3 Tools & Processes
- CI/CD tools (e.g., GitHub Actions, GitLab CI).
- Monitoring and logging (e.g., Prometheus, Grafana, ELK stack).
- MLflow or similar for experiment tracking.

## 6. Do's ✅
1. Do implement strict versioning for all models, prompts, and datasets.
2. Do track API costs per provider granularly and set up budget alerts.
3. Do configure auto-scaling for the FastAPI AI server based on traffic metrics.
4. Do ensure zero-downtime deployments for model updates.
5. Do provide infrastructure for safe A/B testing of different prompts and models.
6. Do automate the retraining and deployment pipelines where applicable.
7. Do log all relevant system metrics (CPU, Memory, GPU usage).
8. Do secure ML infrastructure and restrict access to model artifacts.
9. Do implement health checks and liveness probes for all ML services.
10. Do document deployment procedures and disaster recovery plans.
11. Do keep the ML deployment pipelines integrated with the monorepo structure.
12. Do monitor for model degradation and trigger alerts for data/concept drift.
13. Do use containerization (Docker) for all ML services.
14. Do isolate staging and production ML environments.
15. Do collaborate with the AI Engineer to monitor Gateway provider latency.

## 7. Don'ts ❌
1. Don't deploy ML models manually from a local machine.
2. Don't ignore cost metrics; unmonitored LLM usage can spiral out of control.
3. Don't push unversioned models or configurations to production.
4. Don't run experiment tracking tools on production databases.
5. Don't neglect security and secret management for AI provider API keys.
6. Don't over-provision infrastructure; scale dynamically to save costs.
7. Don't deploy without automated fallback mechanisms.
8. Don't mix ML code and infrastructure code in the same module unnecessarily.
9. Don't ignore alerts on high latency or error rates from the FastAPI server.
10. Don't bypass CI/CD quality gates for "hotfixes."
11. Don't leave unused or orphaned models running in the cluster.
12. Don't operate in isolation from the backend and frontend deployment cycles.
13. Don't use a single environment for all ML experiments.
14. Don't fail to backup model registries and feature stores.
15. Don't ignore the overall architecture (Modular Monolith) when deploying services.

## 8. Quality Gates
- All infrastructure changes must be reviewed via IaC pull requests.
- Deployments must pass staging integration tests and load tests.
- Cost alerting must be active before any new AI provider integration goes live.

## 9. Escalation Path
- Deployment failures: Escalate to DevOps Lead.
- Uncontrolled cost spikes: Escalate immediately to Project Management and AI Engineer.

## 10. KPIs & Success Metrics
- Infrastructure Uptime (99.99%).
- Deployment frequency and Lead Time for Changes in ML services.
- Accuracy of cost tracking vs. actual provider billing.
