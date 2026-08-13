# Backend Engineer — Developer Guidelines & Responsibilities
## 1. Role Overview
As a Backend Engineer on the Adaptive Examination & AI Learning Platform, you own the Express + TypeScript API implementation. You are responsible for developing the core modules, handling database interactions via Prisma, and ensuring the platform is secure, performant, and scalable. You uphold the API-first philosophy and enforce strict module independence.

## 2. Core Responsibilities
1. Implement RESTful APIs using Express and TypeScript.
2. Design and manage database schemas and queries using Prisma ORM.
3. Enforce API contract validation using Zod middleware.
4. Implement secure authentication and authorization via JWT middleware.
5. Build and maintain the internal event bus for cross-module communication.
6. Adhere strictly to the Modular Monolith architecture boundaries.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Express API Implementation | OWNS |
| Database Queries & Schema (Prisma) | OWNS |
| Module Independence | OWNS |
| Security & Middleware | OWNS |
| API Design | COLLABORATES |
| AI Integration | COLLABORATES |
| Frontend Implementation | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **1.1 Monorepo Setup & 1.2 Database Package**: Setup Express server, Prisma schema foundation (users, roles, permissions), and global middleware.
- **1.6 Authentication System & 1.7 User Management**: Implement JWT login, token refresh, and user CRUD APIs.
- **1.8 Role & Permission Management**: Build APIs for RBAC and permission assignment.
- **1.9 Audit Logging & 1.10 API Middleware Stack**: Implement structured audit logs and global error/validation middleware.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- **2.1 Course Management & 2.2 Subject Management**: Implement CRUD APIs for courses and subjects.
- **2.3 Syllabus Tree & 2.4 Syllabus Node Metadata**: Build recursive API endpoints for the syllabus hierarchy.
- **2.6 Student Course Enrollment**: Build enrollment CRUD APIs.

### Phase 3 — Question Bank
- **3.1 Pluggable Question Type System**: Implement backend logic for diverse question types.
- **3.2 Question CRUD**: Build question management APIs.
- **3.3 Question Versioning & 3.4 Question Tags**: Implement history tracking and tag filtering.
- **3.5 Question Lifecycle**: Build state transition APIs (DRAFT to PUBLISHED).

### Phase 4 — Exam Pattern
- **4.1 Exam Pattern CRUD & 4.2 Exam Pattern Sections**: Build backend models and endpoints for patterns and sections.
- **4.3 Section Question Rules to 4.7 Multi-Subject Allocation**: Implement APIs for pattern configuration.
- **4.8 Exam Pattern Validation Engine**: Build validation logic against the question bank.

### Phase 5 — Exam Generator
- **5.1 Exam Generation Engine**: Implement the question selection algorithm to auto-generate exams.
- **5.2 Draft Exam Inspection & 5.4 Manual Exam Creation**: Build APIs for inspecting and manually creating exams.

### Phase 6 — Exam System
- **6.1 Student Exam Access**: Build eligibility check endpoints.
- **6.2 Exam Attempt Session & 6.3 Answer Submission**: Implement high-throughput endpoints for active sessions and auto-saving.
- **6.5 Auto-Evaluation Engine**: Build background grading logic for objective questions.

### Phase 7 — Exam Archive
- **7.1 Exam Publication Workflow**: Build publication status transition APIs.
- **7.2 Published Exam Snapshot & 7.3 Answer Key Preservation**: Implement immutable snapshot logic.
- **7.6 Exam File Storage**: Implement secure file upload and access APIs.

### Phase 8 — Student Analytics
- **8.1 Mastery Engine**: Implement the backend engine to calculate topic mastery scores.
- **8.2 Strengths Identification to 8.5 Progress Tracking**: Build analytics aggregation endpoints.

### Phase 9 — Personalized Practice
- **9.1 Weakness Pool Generation**: Build backend logic to extract weak topics for a student.
- **9.2 Personalized Practice Paper Generation**: Orchestrate practice paper generation targeting weaknesses.

### Phase 10 — Preview System
- **10.3 Impersonation System**: Implement secure impersonation logic in the auth middleware.
- **10.5 Preview Audit Trail**: Ensure preview actions log with the original actor identity.

### Phase 11 — AI Question System
- **11.2 AI Client Package & 11.6 AI Worker Queue System**: Build integrations with the AI Gateway and async queue.
- **11.3 AI Question Modification Worker & 11.4 AI Question Generation Worker**: Implement backend worker endpoints.

### Phase 12 — AI Interview
- **12.1 Interview Template Management**: Build CRUD APIs for templates.
- **12.10 Interview Session Management**: Build lifecycle and state management APIs for interview sessions.

### Phase 13 — Subscriptions
- **13.1 Entitlement Engine**: Check user plans and enforce limits.
- **13.2 Subscription Management & 13.5 Billing Integration**: Build plan APIs and integrate payment gateway webhooks.
- **13.3 AI Credit System & 13.4 AI Usage Tracking**: Build transaction-safe credit deduction endpoints.

### Phase 14 — Production Hardening
- **14.1 Security Hardening & 14.5 Performance Optimization**: Optimize slow Prisma queries and implement API rate limiting.
- **14.7 Abuse Protection**: Implement anti-cheating backend measures.

## 5. Key Guidelines
### 5.1 Technical Standards
- Express + TypeScript exclusively.
- Use Prisma ORM for all database operations.
- Enforce strict validation via Zod in request middleware.
- Utilize JWT for authentication and verify via middleware.
- Maintain absolute module isolation; no cross-module database joins.

### 5.2 Collaboration Model
- Work closely with API Developers to ensure implementation matches the Swagger/OpenAPI spec.
- Collaborate with the Database Admin on complex Prisma schema migrations.

### 5.3 Tools & Processes
- Supertest for API integration testing.
- pnpm + Turborepo for workspace management.

## 6. Do's ✅
1. Keep the controller layer purely for HTTP concerns (req/res handling).
2. Move all business logic into the service layer.
3. Validate every incoming request body, query, and params using Zod.
4. Use Prisma Client exclusively for database interactions.
5. Use the internal event bus to handle cross-module logic (e.g., creating a user profile after registration).
6. Implement comprehensive error handling and mapping in the global error middleware.
7. Return consistent API responses conforming to the standard envelope.
8. Write API integration tests using Supertest for every endpoint.
9. Paginate all list endpoints using cursor-based or offset pagination.
10. Use database transactions for multi-step write operations to ensure atomicity.
11. Secure endpoints using the standard JWT auth middleware.
12. Use dependency injection to decouple services.
13. Log structured data using the designated logging library.
14. Adhere to strict typing; avoid the use of `any`.
15. Profile and optimize slow Prisma queries.

## 7. Don'ts ❌
1. Do not write raw SQL queries; always use Prisma.
2. Do not cross-import modules directly (e.g., `import { UserService } from '../user'`). Use events.
3. Do not put business logic in controllers or route handlers.
4. Do not leak internal database errors or stack traces to the client.
5. Do not bypass the Zod validation middleware for any reason.
6. Do not perform cross-module database joins; fetch data via internal API/services if necessary, or replicate minimal data.
7. Do not hardcode secrets or environment-specific values in code.
8. Do not block the event loop with synchronous heavy computations.
9. Do not trust user input; always sanitize and validate.
10. Do not push Prisma migrations directly to production; follow the migration process.
11. Do not use generic HTTP status codes; use specific ones (e.g., 401, 403, 404, 409).
12. Do not leave endpoints undocumented; ensure they match the OpenAPI spec.
13. Do not ignore promise rejections.
14. Do not mutate the global state or `req` object unpredictably.
15. Do not implement UI-specific response formatting; return raw, standard JSON.

## 8. Quality Gates
- Supertest integration tests pass with >85% coverage.
- No TypeScript or ESLint errors.
- Prisma schema passes validation and formatting checks.
- API endpoints strictly match the documented OpenAPI contract.

## 9. Escalation Path
- Database performance issues -> Escalate to Database Admin / Technical Architect.
- Complex cross-module dependencies -> Escalate to Technical Architect.
- Discrepancy between API Spec and requirements -> Escalate to API Developer.

## 10. KPIs & Success Metrics
- API Response time (p95 latency).
- Zero downtime due to unhandled exceptions.
- Integration test coverage percentage.
- Number of security vulnerabilities identified in audits.
