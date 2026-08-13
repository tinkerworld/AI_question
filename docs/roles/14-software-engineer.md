<Software Engineer — Developer Guidelines & Responsibilities>
## 1. Role Overview
As a Software Engineer on the Adaptive Examination & AI Learning Platform, you are the backbone of feature implementation. You work across various modules, implementing features, ensuring code quality, and writing robust unit tests. You bridge the gap between design and functionality, ensuring that our Modular Monolith architecture is respected and maintained.

## 2. Core Responsibilities
1. Implement feature requirements according to module specifications.
2. Write unit tests for all implemented features (Vitest for backend, React Testing Library for frontend).
3. Ensure code quality by adhering to strict TypeScript guidelines and Zod validation.
4. Participate in code reviews and provide constructive feedback.
5. Follow the defined module structure (routes/controller/service/repository/tests).
6. Implement and utilize internal events for inter-module communication.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Feature Implementation | OWNS |
| Unit Testing | OWNS |
| Module Independence | OWNS |
| API Design | COLLABORATES |
| AI Integration | COLLABORATES |
| Architecture Decisions | CONSULTS |
| Database Migration | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Set up monorepo infrastructure, database package with Prisma, and shared packages (1.1, 1.2, 1.3).
- Implement the authentication system and RBAC middleware (1.6, 1.10).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Build the course and subject management APIs (2.1, 2.2).
- Implement the recursive syllabus tree structures (2.3).
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Implement the pluggable question type system and CRUD APIs (3.1, 3.2).
- Build question versioning and lifecycle tracking (3.3, 3.5).
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- Build exam pattern blueprints, sections, and rules APIs (4.1, 4.2, 4.3).
- Implement the exam pattern validation engine (4.8).
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Implement the auto-generate exam engine and algorithm (5.1).
- Build APIs for draft exam inspection and manual creation (5.2, 5.4).
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Build student exam access and attempt session APIs (6.1, 6.2).
- Implement the auto-evaluation engine for objective questions (6.5).
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Implement the exam publication workflow and snapshot functionality (7.1, 7.2).
- Build APIs for historical exam search and preservation (7.4, 7.5).
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Implement the Mastery Engine to calculate per-topic mastery scores (8.1).
- Build APIs to identify student strengths and weaknesses (8.2, 8.3).
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Write services to extract weak topics and generate practice papers (9.1, 9.2).
- Track practice attempts and adaptive mastery confirmation (9.3, 9.4).
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- Implement the impersonation system and preview audit trail (10.3, 10.5).
- Build the preview configuration UI API (10.2).
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Implement the backend logic to communicate with the AI Gateway (11.1, 11.2).
- Manage the AI worker queue system for question modification/generation (11.6).
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Build APIs for interview templates, STT/TTS integrations, and assessment engine (12.1, 12.4, 12.5, 12.6).
- Manage interview session lifecycles (12.10).
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Implement the entitlement engine, subscription management, and AI credit systems (13.1, 13.2, 13.3).
- Integrate payment gateway logic (13.5).
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Optimize database queries, enforce security measures (OWASP), and finalize backups (14.1, 14.3, 14.5).
- Finalize API docs, monitoring, and alerts (14.4, 14.10).
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- Strict TypeScript mode is mandatory.
- All request payloads and responses must be validated using Zod.
- Follow the exact module structure: `routes.ts`, `controller.ts`, `service.ts`, `repository.ts`.
- Ensure at least 80% test coverage for service classes using Vitest.

### 5.2 Collaboration Model
- Work closely with Frontend/Backend specialists for specific domain challenges.
- Consult the AI Integrator when connecting to the Python FastAPI server.

### 5.3 Tools & Processes
- Use pnpm and Turborepo for script execution.
- Ensure `pnpm lint` and `pnpm test` pass before raising any Pull Request.

## 6. Do's ✅
1. Write unit tests concurrently with feature code.
2. Use Dependency Injection (or equivalent patterns) in services.
3. Validate all inputs using Zod before processing.
4. Keep controllers thin; delegate logic to services.
5. Keep repositories focused only on database interactions.
6. Use meaningful variable and function names.
7. Document complex logic using JSDoc.
8. Catch and handle errors gracefully using central error handlers.
9. Write clear and descriptive commit messages.
10. Mock external dependencies in unit tests.
11. Keep pull requests small and focused on a single feature.
12. Adhere to the API-first principles.
13. Respect the internal event bus for cross-module side effects.
14. Optimize Prisma queries for performance.
15. Ask for clarification if module boundaries seem ambiguous.

## 7. Don'ts ❌
1. Do not import modules directly from another module's internal files.
2. Do not write business logic inside controllers.
3. Do not bypass Zod validation for any endpoint.
4. Do not use `any` in TypeScript; strictly define interfaces/types.
5. Do not write direct SQL queries; always use Prisma Client.
6. Do not hardcode configuration values; use environment variables.
7. Do not skip writing tests for "simple" functions.
8. Do not create circular dependencies between services.
9. Do not leave console.log statements in production code.
10. Do not implement UI specific logic in the backend.
11. Do not commit secrets or API keys.
12. Do not merge code with failing CI checks.
13. Do not use generic error messages like "Something went wrong".
14. Do not expose internal database IDs if UUIDs/public IDs are required.
15. Do not bypass the central error handling middleware.

## 8. Quality Gates
- Code compiles without TypeScript errors.
- ESLint passes with no warnings or errors.
- Unit test coverage > 80% for the modified module.
- Successful peer review from at least one other engineer.

## 9. Escalation Path
- Blocked by architectural ambiguity -> Escalate to Technical Architect.
- Blocked by incomplete API design -> Escalate to API Developer.
- Blocked by CI pipeline failure -> Escalate to DevOps Engineer.

## 10. KPIs & Success Metrics
- Feature completion rate per sprint.
- Number of bugs found in QA phase per feature.
- Unit test coverage percentage.
- PR review turnaround time.
</Software Engineer — Developer Guidelines & Responsibilities>
