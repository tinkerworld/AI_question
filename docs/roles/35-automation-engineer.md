# Automation Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Automation Engineer builds and maintains the test automation framework for the Adaptive Examination & AI Learning Platform. You are responsible for automating the ~1,600 test cases across the stack (unit, integration, E2E) and integrating them into the CI/CD pipeline to ensure rapid, reliable feedback.

## 2. Core Responsibilities
1. Own the test automation frameworks (Vitest, Supertest, Playwright, pytest).
2. Automate the ~1,600 test cases defined in the phase plans.
3. Integrate automated tests into the CI/CD pipeline.
4. Maintain and optimize automated regression suites.
5. Build tools and scripts for test data setup and teardown.
6. Monitor and report on automated test results.
7. Ensure test flakiness is kept to an absolute minimum.

## 3. Work Boundaries

| Area | Ownership Level |
|---|---|
| Test Automation Frameworks | OWNS |
| CI/CD Test Pipeline | OWNS |
| Automated E2E/Integration Tests | OWNS |
| Test Data Scripts | OWNS |
| Unit Test Implementation | COLLABORATES |
| Manual Testing | OUT OF SCOPE |
| Feature Code Implementation | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Set up Vitest, Supertest, Playwright, and pytest frameworks for the Monorepo Setup (feature 1.1).
- Automate base API tests for Authentication System and User Management (features 1.6, 1.7) into CI/CD.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Automate CRUD API tests for Course and Subject Management using Supertest (features 2.1, 2.2).
- Automate UI tests for Syllabus Tree builder (feature 2.5) using Playwright.

### Phase 3 — Question Bank
- Automate API tests for all Pluggable Question Types creation (feature 3.1).
- Automate Question Versioning and Tags workflows (features 3.3, 3.4).

### Phase 4 — Exam Pattern
- Automate API checks for Exam Pattern Validation Engine logic and Section Rules (features 4.3, 4.8).

### Phase 5 — Exam Generator
- Automate the Exam Generation Engine question selection logic through Supertest (feature 5.1).
- Create automated UI scripts for Manual Exam Creation (feature 5.4).

### Phase 6 — Exam System
- Automate E2E flows for the Exam Attempt Session and Answer Submission (features 6.2, 6.3).
- Automate API checks verifying Auto-Evaluation Engine scores against expected Result Generation (features 6.5, 6.6).

### Phase 7 — Exam Archive
- Automate data validation checks on Published Exam Snapshots and Answer Key Preservation (features 7.2, 7.3).

### Phase 8 — Student Analytics
- Automate math validation tests for the Mastery Engine APIs (feature 8.1).
- Automate UI assertions on the Student Analytics Dashboard (feature 8.6).

### Phase 9 — Personalized Practice
- Automate E2E scenarios for Weakness Pool Generation and Practice Paper Generation (features 9.1, 9.2).

### Phase 10 — Preview System
- Automate Impersonation System checks to ensure isolated Preview Student Profile tests pass reliably (features 10.1, 10.3).

### Phase 11 — AI Question System
- Automate API tests for the Python FastAPI AI Gateway server using pytest (feature 11.1).
- Automate mock-based tests for AI Client Package SDK interactions (feature 11.2).

### Phase 12 — AI Interview
- Automate API tests validating Controlled Natural Conversation Engine endpoints (feature 12.3).
- Implement basic E2E coverage for the Interview Frontend (feature 12.11) with mocked STT/TTS.

### Phase 13 — Subscriptions
- Automate E2E payment flows using mock gateways (e.g., Stripe Test Mode) for the Billing Integration (feature 13.5).
- Automate tests enforcing AI Credit System limits (feature 13.3).

### Phase 14 — Production Hardening
- Stabilize the entire automated suite of ~1,600 test cases for CI/CD Deployment Configuration (feature 14.9).
- Optimize pipeline speed to execute reliably under 15 minutes.

## 5. Key Guidelines
### 5.1 Technical Standards
- **Unit Tests:** Vitest (Frontend/Backend TypeScript).
- **API Integration Tests:** Supertest (Express), pytest (FastAPI).
- **E2E Tests:** Playwright.
- Tests must be deterministic (no random failures).

### 5.2 Collaboration Model
- Work with Software Test Engineers to translate manual cases to code.
- Collaborate with DevOps for CI/CD pipeline integration.

### 5.3 Tools & Processes
- pnpm + Turborepo for running tests across modules.
- GitHub Actions (or similar) for CI/CD.

## 6. Do's ✅
1. Do use Vitest for fast, reliable unit testing.
2. Do use Supertest for robust API integration tests.
3. Do use Playwright for cross-browser E2E testing.
4. Do use pytest for testing the Python AI server.
5. Do aim to automate all applicable ~1,600 test cases.
6. Do implement Page Object Model (POM) in Playwright tests.
7. Do run tests in parallel to optimize CI execution time.
8. Do mock external services (like AI providers) in integration tests.
9. Do ensure automated tests manage their own test data (setup/teardown).
10. Do fix flaky tests immediately; quarantine them if they cannot be fixed fast.
11. Do write descriptive test names and failure messages.
12. Do use continuous integration to run tests on every PR.
13. Do maintain a clean automation codebase adhering to linting rules.
14. Do generate HTML reports for E2E test runs.
15. Do use environment variables for configuration (URLs, credentials).

## 7. Don'ts ❌
1. Don't write flaky tests; deterministic execution is paramount.
2. Don't rely on shared state between automated tests.
3. Don't use hardcoded sleep/waits; use dynamic waits in Playwright.
4. Don't automate edge cases in E2E if they can be tested via API.
5. Don't ignore test failures in CI.
6. Don't write automated tests without assertions.
7. Don't hardcode credentials in test scripts.
8. Don't test third-party systems directly (use mocks).
9. Don't let the test execution time grow unmanageably long.
10. Don't mix unit testing logic with E2E testing tools.
11. Don't bypass the CI pipeline for code merges.
12. Don't forget to test different user roles automatically.
13. Don't duplicate test logic; use helper functions/fixtures.
14. Don't run Playwright tests in headed mode in CI.
15. Don't neglect testing the Python backend with pytest.

## 8. Quality Gates
- Code Review: All automation scripts must undergo peer review.
- CI Integration: No PR can be merged if automated tests fail.
- Flakiness Check: New tests must pass 10 consecutive runs locally before merging.

## 9. Escalation Path
- Environment Issues: Escalate to DevOps.
- Flaky Application Code: Escalate to Backend/Frontend leads.
- Tooling Limitations: Escalate to QA Lead/Architect.

## 10. KPIs & Success Metrics
- Automated Test Coverage (percentage of ~1,600 cases automated).
- CI/CD Test Pipeline Execution Time.
- Test Reliability Rate (percentage of deterministic runs).
- Defect Discovery Rate by automation vs. manual.
