<Solution Architect — Developer Guidelines & Responsibilities>
## 1. Role Overview
The Solution Architect owns the end-to-end solution design, integration architecture, deployment pipelines, and third-party integrations for the Adaptive Examination & AI Learning Platform. They bridge the gap between software architecture and infrastructure.

## 2. Core Responsibilities
1. Design end-to-end solution architecture.
2. Design and maintain Docker Compose for local development.
3. Plan production deployment architecture.
4. Design AI Gateway integration with external providers.
5. Plan third-party integrations (payment, email, cloud storage).

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Deployment Architecture | OWNS |
| Integration Architecture | OWNS |
| Local Dev Infrastructure | OWNS |
| Software Module Design | CONSULTS |
| Frontend UI Design | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Create Docker Compose setup for PostgreSQL 16, Redis 7, Express, Next.js, and FastAPI.
- Plan infrastructure for Monorepo Setup & Infrastructure.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Plan database schema deployment for Course and Subject Management.
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Ensure infrastructure supports rich text and image uploads for Question CRUD.
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Plan scaling infrastructure for Exam Generation Engine.
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Design scalable infrastructure for handling concurrent Exam Attempt Sessions and Answer Submission.
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Plan Exam File Storage integration (e.g., S3/GCS for exam attachments).
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Plan integration architecture for Mastery Engine analytics processing.
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Plan infrastructure scaling for Personalized Practice Paper Generation.
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Design network routing for AI Gateway Architecture and Cloud AI Integration (OpenAI/Anthropic).
- Plan Local AI Model Support (Ollama, vLLM) infrastructure.
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Plan Speech-to-Text (STT) and Text-to-Speech (TTS) infrastructure and network security.
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Design Pluggable Billing Integration webhooks routing and security.
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Finalize CI/CD Deployment Configuration, Security Hardening, Backup & Recovery, and Monitoring & Alerting architectures.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- Infrastructure as Code (IaC) must be used (Terraform/CloudFormation).
- All environments must be containerized.
### 5.2 Collaboration Model
- Works with Software Architect to ensure software runs well on infrastructure.
### 5.3 Tools & Processes
- Uses Docker, Kubernetes, Terraform.
- Designs CI/CD pipelines via GitHub Actions/GitLab CI.

## 6. Do's ✅
1. Do ensure developer environments mirror production as closely as possible.
2. Do use Docker Compose for local dev.
3. Do design for high availability and disaster recovery.
4. Do secure all third-party integrations (API keys in secrets managers).
5. Do implement comprehensive monitoring and logging architecture.
6. Do use Infrastructure as Code.
7. Do plan for scalable database architectures.
8. Do design secure network perimeters (VPCs).
9. Do implement CI/CD pipelines early.
10. Do document deployment procedures clearly.
11. Do consider cost optimization in infrastructure choices.
12. Do plan for zero-downtime deployments.
13. Do use standard cloud patterns.
14. Do validate backup and restore procedures.
15. Do ensure the AI Gateway has proper egress controls.

## 7. Don'ts ❌
1. Don't allow manual infrastructure changes (ClickOps).
2. Don't hardcode credentials anywhere.
3. Don't ignore security best practices for deployments.
4. Don't create complex local dev setups that are hard to run.
5. Don't ignore scaling limits of chosen third-party services.
6. Don't leave monitoring as an afterthought.
7. Don't use single points of failure in infrastructure.
8. Don't dictate internal software architecture (leave to Software Architect).
9. Don't ignore data compliance requirements (GDPR/HIPAA).
10. Don't allow direct public access to databases.
11. Don't deploy without automated tests passing.
12. Don't forget about CDN caching strategies.
13. Don't tightly couple to a specific cloud provider unnecessarily.
14. Don't ignore error handling in third-party integrations.
15. Don't ignore developer feedback on the local environment setup.

## 8. Quality Gates
- All deployment architectures must pass a security review.
- CI/CD pipelines must successfully deploy to staging before production.

## 9. Escalation Path
- Escalate cloud provider limitations to Engineering Manager.
- Escalate integration blockers to third-party support/vendors.

## 10. KPIs & Success Metrics
- 100% of infrastructure managed via IaC.
- Local dev environment setup time < 15 minutes.
</Solution Architect — Developer Guidelines & Responsibilities>
