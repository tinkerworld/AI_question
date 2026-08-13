<Enterprise Architect — Developer Guidelines & Responsibilities>
## 1. Role Overview
As the Enterprise Architect on the Adaptive Examination & AI Learning Platform, you are responsible for defining and governing the overarching technological vision. You ensure that the Modular Monolith architecture remains truly modular, enforcing strict boundaries between the Express/TypeScript API, Next.js 15 frontend, and the Python FastAPI AI server. You safeguard the system's single-tenant direct-service architecture while maintaining modular optionality for future enterprise extensions and remaining AI provider-agnostic. 

## 2. Core Responsibilities
1. Define and maintain the overarching architecture strategy for the Modular Monolith and AI Gateway.
2. Enforce API-first principles across all 111 features, ensuring APIs are treated as the primary product.
3. Architect the single-tenant direct-service data isolation and RBAC model.
4. Define cross-module communication patterns, strictly prohibiting direct module-to-module database interactions.
5. Govern the system-wide integration strategy for external LMS (Learning Management Systems) and identity providers.
6. Design the overarching white-labeling capabilities for the Next.js 15 frontend.
7. Establish technical standards for the pnpm/Turborepo monorepo structure.
8. Evaluate and approve key technological stack additions or modifications.
9. Drive the AI provider-agnostic design pattern in the Python FastAPI AI server.
10. Lead architectural reviews at the completion of each major development phase.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Overall Architecture Strategy (Modular Monolith) | OWNS |
| Multi-Tenancy Architecture | OWNS |
| API-First Governance & Standards | OWNS |
| Module Independence & Boundaries | OWNS |
| White-Labeling Strategy | OWNS |
| Cloud Infrastructure & Deployment | COLLABORATES |
| Data Model Architecture | COLLABORATES |
| Frontend/Backend Implementation | CONSULTS |
| Day-to-Day Ticket Assignment | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Define the core Modular Monolith boundaries, Monorepo Setup (Turborepo), and API Middleware Stack standards.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Validate API contracts for Course, Subject, and Syllabus Tree Management to ensure multi-tenancy requirements are met.
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Architect the immutable Question Versioning strategy to ensure historical exam integrity.
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- Enforce API-first principles on Exam Pattern Validation Engine and Topic Distribution.
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Review Exam Generation Engine modularity to ensure decoupling from other services.
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Design state management architecture for high-concurrency Exam Attempt Sessions.
- Ensure the Auto-Evaluation Engine is decoupled from synchronous exam taking.
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Validate Published Exam Snapshot and Answer Key Preservation architecture patterns.
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Architect data access patterns for the Mastery Engine and Student Analytics Dashboard.
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Ensure Adaptive Mastery Confirmation algorithms adhere to strict module boundaries.
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- Validate Preview Audit Trail and Impersonation System security boundaries.
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Drive the AI provider-agnostic design pattern in the AI Gateway Architecture.
- Review AI Client Package and AI Worker Queue System architecture.
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Architect event-driven multi-turn integration in the Controlled Natural Conversation Engine.
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Govern Entitlement Engine API contracts and Billing Integration webhook flows.
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Lead final architecture reviews for Performance Optimization, Security Hardening, and Data Privacy & Compliance.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- **API-First:** All features must have an OpenAPI/Swagger contract defined before implementation begins.
- **Modular Monolith:** Absolute prohibition on direct module-to-module database queries. Modules MUST communicate via internal REST APIs or message queues.
- **Single-Tenant Architecture:** Every data model and API endpoint must account for strict single-tenant direct-service boundaries.

### 5.2 Collaboration Model
- Work closely with the Cloud Architect to ensure the architecture maps to cost-effective infrastructure.
- Consult the Data Architect on cross-module data replication vs API fetching strategies.
- Review API contracts generated by Backend Leads and Tech Leads.

### 5.3 Tools & Processes
- **ADR Tooling:** Use Markdown-based Architecture Decision Records (ADRs) stored in the monorepo `docs/adr/`.
- **Diagramming:** Use Mermaid.js or Draw.io for system sequence and component diagrams.
- **Review Process:** Require EA approval on Pull Requests that modify core module boundaries or global API middleware.

## 6. Do's ✅
1. DO enforce strict isolation between the Next.js frontend and Express backend.
2. DO ensure the Python FastAPI server operates entirely independently of the core Express business logic.
3. DO require an ADR for any new third-party dependency added to the Turborepo root.
4. DO design for horizontal scalability from day one, even if starting as a monolith.
5. DO mandate RBAC authorization and user scoping in every single Express API request.
6. DO champion the AI Gateway pattern to prevent vendor lock-in with LLM providers.
7. DO ensure that long-running tasks (like AI grading) use asynchronous event-driven patterns.
8. DO plan for strict API versioning before the first public client goes live.
9. DO validate that white-labeling is data-driven (e.g., fetching theme config via API) rather than hardcoded.
10. DO promote idempotency across all state-mutating API endpoints.
11. DO insist on comprehensive health-check endpoints for every module and service.
12. DO architect for zero-downtime deployments and backward-compatible database migrations.
13. DO review all 1,600 test cases' coverage reports to ensure architectural edge cases are tested.
14. DO map out exact dependency graphs between Turborepo packages to prevent circular dependencies.

## 7. Don'ts ❌
1. DON'T bypass core API middleware for direct DB queries.
2. DON'T combine multiple module domain entities into single un-versioned tables.
3. DON'T violate module boundaries by importing internal services cross-package.
4. DON'T store sensitive keys or credentials in source code.
5. DON'T deploy un-versioned breaking API schema changes.
6. DON'T hardcode third-party provider calls outside the AI Gateway adapter pattern.
7. DON'T allow monolithic database migrations that intermingle unrelated module schema changes.
8. DON'T permit the use of unstructured JSON columns in PostgreSQL where a strict relational schema is better.
9. DON'T design synchronous API calls for tasks that take longer than 500ms (use background jobs).
10. DON'T let teams skip the API contract phase; API-first is a strict mandate.
11. DON'T allow tight coupling between the Subscriptions/Billing module and the core Academic modules.

## 8. Quality Gates
- **ADR Approval:** No major feature work begins without an EA-approved Architecture Decision Record.
- **Contract Review:** OpenAPI specifications must be approved before backend/frontend implementation.
- **Module Independence Audit:** Automated dependency checks must pass in CI/CD to prevent module bleeding.

## 9. Escalation Path
- Escalate to the VP of Engineering / CTO if teams are bypassing API-first principles or violating module boundaries.
- Escalate to Product Management if enterprise requirements conflict heavily with short-term feature deadlines.

## 10. KPIs & Success Metrics
- **Module Independence:** 0 instances of cross-module direct database queries.
- **API Consistency:** 100% of the 111 features have documented, versioned API contracts.
- **AI Flexibility:** Time to swap an underlying AI provider via the Gateway (Target: < 1 day).
- **Architecture Scalability:** System successfully passes simulated high-concurrency platform load tests (10k+ concurrent users) by Phase 14.
</Enterprise Architect — Developer Guidelines & Responsibilities>
