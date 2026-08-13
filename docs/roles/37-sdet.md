# SDET (Software Development Engineer in Test) — Developer Guidelines & Responsibilities

## 1. Role Overview
The Software Development Engineer in Test (SDET) on the Adaptive Examination & AI Learning Platform is the primary owner of the test infrastructure, test frameworks, and testability architecture. In this API-first, modular monolith monorepo, the SDET ensures that developers can easily write, run, and maintain the ~1,600 test cases required across the 14 project phases. You focus on building robust test utilities, mock factories (e.g., `createMockUser`, `createMockExam`, `createMockQuestion`), API test helpers for the Express backend, UI testing infrastructure for Next.js 15, and database seeding strategies for PostgreSQL via Prisma.

## 2. Core Responsibilities
1. Design and maintain the automated testing infrastructure (Vitest, Supertest, Playwright, pytest).
2. Build and maintain test utilities and mock factories to simplify test creation.
3. Establish robust database seeding and teardown mechanisms for PostgreSQL/Prisma integration tests.
4. Integrate testing seamlessly into the pnpm + Turborepo monorepo pipeline.
5. Create specialized API test helpers to validate the Express + TS API.
6. Develop AI testing frameworks to validate responses from the Python FastAPI AI Gateway.
7. Define testability requirements and advocate for testable architecture across all modules.
8. Maintain and optimize CI test execution speeds using caching and parallelization.
9. Support the QA Lead in automating the ~1,600 predefined test cases.
10. Train and mentor the development team on testing best practices.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Test Frameworks (Vitest, Playwright, pytest) | OWNS |
| Mock Factories & Test Utilities | OWNS |
| CI Test Integration & Caching | COLLABORATES (with DevOps) |
| Feature Test Implementation | COLLABORATES (with Feature Devs) |
| Test Planning & Strategy | COLLABORATES (with QA Lead) |
| System Architecture | CONSULTS |
| Production Infrastructure | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Set up Vitest for TS/JS packages, Supertest for Express API, and pytest for Python FastAPI.
- Build initial database seeding utilities (`@repo/database/test-utils`) for Database Package (1.2) and Validation Package (1.4).
- Establish mock factory pattern for User Management (1.7) and Role & Permission Management (1.8).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Create mock factories for Course Management (2.1) and Subject Management (2.2).
- Implement recursive API test helpers for Syllabus Tree (2.3).
- Build seeding utilities for Student Course Enrollment (2.6).

### Phase 3 — Question Bank
- Create mock factories for Pluggable Question Type System (3.1) and Question CRUD (3.2).
- Build automated tests for Question Versioning (3.3) and Question Lifecycle (3.5) state transitions.
- Implement database seeding for bulk question imports.

### Phase 4 — Exam Pattern
- Create mock factories for Exam Pattern CRUD (4.1) and Exam Pattern Sections (4.2).
- Build complex validation test utilities to verify the Exam Pattern Validation Engine (4.8).
- Test Topic Distribution (4.4) and Difficulty Distribution (4.5) rules.

### Phase 5 — Exam Generator
- Build mock generators for the Exam Generation Engine (5.1) algorithmic selection.
- Create UI integration tests using Playwright for Draft Exam Inspection (5.2).
- Test Manual Exam Creation (5.4) workflows.

### Phase 6 — Exam System
- Build end-to-end testing utilities with Playwright for the Exam-Taking Frontend (6.8).
- Create automated API tests for Exam Attempt Session (6.2) and Answer Submission (6.3).
- Build test suites for the Auto-Evaluation Engine (6.5) and Result Generation (6.6).

### Phase 7 — Exam Archive
- Test the Exam Publication Workflow (7.1) state transitions.
- Build validation tools for Published Exam Snapshot (7.2) immutability and Answer Key Preservation (7.3).

### Phase 8 — Student Analytics
- Create test utilities for the Mastery Engine (8.1) grading pipelines.
- Build mock data generators for Syllabus Proficiency Map (8.4) visualization tests.
- Develop visual regression tests for the Student Analytics Dashboard (8.6).

### Phase 9 — Personalized Practice
- Develop robust mock factories for Weakness Pool Generation (9.1).
- Test Adaptive Mastery Confirmation (9.3) tracking and updates.
- Create E2E tests for Practice Paper Frontend (9.5).

### Phase 10 — Preview System
- Implement automated tests for Impersonation System (10.3).
- Build utilities to verify Preview Audit Trail (10.5) logs.
- Test Preview Configuration UI (10.2).

### Phase 11 — AI Question System
- Implement integration test utilities for the AI Gateway Architecture (11.1) using pytest.
- Build mock LLM provider endpoints for Cloud AI Integration (11.8) tests to save API costs.
- Test AI Worker Queue System (11.6) with simulated failures.

### Phase 12 — AI Interview
- Create test utilities for Interview Template Management (12.1).
- Build mocked Speech-to-Text (12.4) and Text-to-Speech (12.5) inputs for automated tests.
- Test the Interview Assessment Engine (12.6) against expected rubrics.

### Phase 13 — Subscriptions
- Create test harnesses for Entitlement Engine (13.1) edge cases.
- Develop mock webhook payloads for Billing Integration (13.5).
- Test Free Tier Experience (13.7) limits and upgrades.

### Phase 14 — Production Hardening
- Finalize CI test pipelines for maximum speed using Turborepo caching.
- Validate Abuse Protection (14.7) rate limiting in test environments.
- Conduct comprehensive reviews of test coverage against the ~1,600 test cases.

## 5. Key Guidelines
### 5.1 Technical Standards
- All mock factories must generate valid, deterministic, or strictly typed random data using tools like Faker.js.
- Database integration tests must isolate state using transaction rollbacks or clean schemas to prevent flakiness.
- Test utilities must be published as internal shared packages (e.g., `@repo/test-utils`) in the monorepo.

### 5.2 Collaboration Model
- Partner closely with the QA Lead to ensure automated tests align with documented test cases.
- Work with Platform Engineers to integrate test tools seamlessly into the developer experience.
- Pair with Feature Developers to debug flaky tests.

### 5.3 Tools & Processes
- **Tools**: Vitest, Playwright, Supertest, pytest, k6, Faker.js, Turborepo.
- **Processes**: Mandatory code review for test utility changes, weekly test flake review.

## 6. Do's ✅
1. Build reusable mock factories (e.g., `createMockUser()`) rather than inline object creation in tests.
2. Publish test utilities as shared internal packages in the Turborepo monorepo.
3. Use transactional rollbacks for Prisma integration tests to maintain speed and isolation.
4. Ensure all API tests cover failure modes, validation errors, and permission denials.
5. Create dedicated helpers for authentication (e.g., `loginAs(Role)`).
6. Provide comprehensive documentation and examples for using the test infrastructure.
7. Optimize test execution by utilizing Turborepo caching for unchanged modules.
8. Mock third-party AI providers in CI to prevent flakiness and high costs.
9. Write custom matchers/assertions for complex project-specific data structures.
10. Tag integration vs. unit tests clearly so they can run independently.
11. Build robust data seeding scripts for the QA team's manual testing environments.
12. Monitor and proactively fix flaky tests.
13. Integrate automated accessibility testing into Playwright suites.
14. Use typed mocks that match Prisma generated types precisely.
15. Advocate for test-driven development (TDD) where applicable.

## 7. Don'ts ❌
1. Don't allow tests to share database state, causing random failures depending on execution order.
2. Don't rely on external, unmocked network calls in CI test suites (except for explicit E2E tests).
3. Don't create brittle UI tests that rely on specific CSS classes instead of data-testid attributes.
4. Don't duplicate test setup logic across files—use shared setup utilities.
5. Don't ignore flaky tests; they erode trust in the CI pipeline.
6. Don't mix unit test execution with slow integration test execution in the local dev loop.
7. Don't hardcode IDs or dates in test assertions; use dynamic data generation.
8. Don't leak test dependencies into production application bundles.
9. Don't skip testing error handling and edge cases in the API.
10. Don't create mock factories that return incomplete or invalid Prisma types.
11. Don't write automated tests that just test the mock; ensure they test the implementation.
12. Don't neglect testing the Python FastAPI AI Gateway.
13. Don't bypass the API layer for testing business logic when possible.
14. Don't leave database connections hanging after test suites complete.
15. Don't let test execution time exceed 10 minutes in CI without investigating parallelization.

## 8. Quality Gates
- **Code Coverage**: Test utilities must have >90% coverage themselves.
- **Flakiness Check**: New test utilities must run 100 times sequentially and concurrently without failure.
- **Type Safety**: All mock factories must strictly adhere to Prisma/TypeScript types.
- **Performance**: Database seeding for a test suite must take < 2 seconds.

## 9. Escalation Path
- **Flaky tests impacting CI**: Escalate to the relevant module owner and Platform Engineer.
- **Test environment instability**: Escalate to DevOps Engineer.
- **Test coverage gaps in critical modules**: Escalate to QA Lead and Engineering Manager.

## 10. KPIs & Success Metrics
- **Test Flake Rate**: < 1% of CI runs fail due to flaky tests.
- **CI Test Execution Time**: P90 execution time under 8 minutes via Turborepo caching.
- **Automation Coverage**: Percentage of the ~1,600 test cases automated.
- **Developer Adoption**: Test utility usage rate in feature PRs.
