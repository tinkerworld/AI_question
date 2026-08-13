<Software Architect — Developer Guidelines & Responsibilities>
## 1. Role Overview
The Software Architect owns the technical architecture, module boundaries, API contracts, and core technology decisions for the Adaptive Examination & AI Learning Platform. They ensure the Modular Monolith remains clean and the AI Gateway pattern is strictly enforced.

## 2. Core Responsibilities
1. Define and enforce Modular Monolith boundaries.
2. Design API-first contracts and ensure compliance.
3. Implement and govern the AI Gateway pattern.
4. Design the event bus for cross-module communication.
5. Define service interface contracts and core patterns.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Technical Architecture | OWNS |
| Module Boundaries | OWNS |
| API Contracts | OWNS |
| Specific Feature Implementation| COLLABORATES |
| Infrastructure Deployment | CONSULTS |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Define Monorepo Setup & Infrastructure boundaries (pnpm workspaces, Turborepo).
- Architect the shared packages: Database Package, Shared Types, Validation, and Permissions.
- Define API Middleware Stack architecture and Authentication System flows.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Define bounded contexts and API contracts for Course Management, Subject Management, and recursive Syllabus Tree.
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Architect the Pluggable Question Type System (@repo/question-types).
- Define Question Versioning strategy and Question Lifecycle status flow.
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- Design the Exam Pattern Validation Engine logic and API contracts for section rules.
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Architect the Exam Generation Engine algorithm boundaries and data structures for Draft Exam Inspection.
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Architect high-throughput API patterns for Exam Attempt Session and Answer Submission.
- Design Auto-Evaluation Engine rules architecture.
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Define the Published Exam Snapshot and Answer Key Preservation patterns to ensure immutability.
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Architect the Mastery Engine (@repo/mastery-engine) and API contracts for Syllabus Proficiency Map.
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Architect the Weakness Pool Generation logic and Adaptive Mastery Confirmation loop.
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- Define Impersonation System architecture (PREVIEW_STUDENT vs IMPERSONATE_REAL_STUDENT).
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Formalize the AI Gateway Architecture (Python FastAPI) and AI Client Package (@repo/ai-client).
- Architect AI Worker Queue System for Question Modification/Generation.
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Architect Controlled Natural Conversation Engine interfaces, STT/TTS Integration, and Interview Assessment Engine boundaries.
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Architect the Entitlement Engine (@repo/entitlement-engine) and Pluggable Billing Integration boundaries.
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Finalize API docs (OpenAPI/Swagger).
- Architect AI Queue & Rate Management and Abuse Protection strategies.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- Strict adherence to Modular Monolith principles (no cross-module database joins).
- API-first design using OpenAPI/Swagger.
### 5.2 Collaboration Model
- Reviews PRs for architectural compliance. Mentors developers.
### 5.3 Tools & Processes
- Uses Structurizr/C4 models for documentation.
- Enforces architecture via linter rules where possible.

## 6. Do's ✅
1. Do enforce strict module boundaries.
2. Do mandate API-first design.
3. Do utilize the AI Gateway for all AI interactions.
4. Do use the event bus for cross-module communication.
5. Do review PRs for architectural integrity.
6. Do document decisions using ADRs (Architecture Decision Records).
7. Do prioritize readability and maintainability.
8. Do design for observability and tracing.
9. Do ensure consistent error handling patterns.
10. Do mentor developers on architectural patterns.
11. Do keep the architecture pragmatic and suited to the problem.
12. Do plan for graceful degradation.
13. Do enforce separation of concerns.
14. Do validate technical feasibility early.
15. Do maintain the architecture.md document rigorously.

## 7. Don'ts ❌
1. Don't over-engineer solutions.
2. Don't introduce microservices prematurely.
3. Don't allow cross-module coupling (e.g., direct database access between modules).
4. Don't bypass the AI Gateway.
5. Don't skip API contract design.
6. Don't allow "god classes" or tightly coupled monoliths.
7. Don't ignore technical debt.
8. Don't dictate implementation details unnecessarily.
9. Don't ignore performance implications of architectural choices.
10. Don't use synchronous calls where asynchronous events are appropriate.
11. Don't rely on shared mutable state across modules.
12. Don't forget about security architecture.
13. Don't create single points of failure.
14. Don't ignore team feedback on architectural usability.
15. Don't allow direct DB queries from the UI layer.

## 8. Quality Gates
- All module designs must pass an architectural review.
- No PR can merge if it violates architecture.md principles.

## 9. Escalation Path
- Escalate unresolvable technical disputes to the Engineering Manager.
- Escalate scope changes affecting architecture to the Product Manager.

## 10. KPIs & Success Metrics
- Zero instances of cross-module database joins.
- 100% of AI calls route through the AI Gateway.
</Software Architect — Developer Guidelines & Responsibilities>
