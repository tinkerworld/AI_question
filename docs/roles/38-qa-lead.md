# QA Lead — Developer Guidelines & Responsibilities

## 1. Role Overview
The QA Lead for the Adaptive Examination & AI Learning Platform owns the overarching QA strategy, test planning, quality metrics, and team coordination. You are responsible for ensuring that all 111 features across the 14 phases meet the highest quality standards before release. You track test coverage against the ~1,600 defined test cases, define quality gates for each phase, and coordinate both manual and automated testing efforts. You are the final gatekeeper for quality in this complex API-first modular monolith.

## 2. Core Responsibilities
1. Define and maintain the comprehensive QA strategy for the entire platform.
2. Manage and track the ~1,600 defined test cases in the test management system.
3. Coordinate testing efforts across the Next.js frontend, Express API, and Python FastAPI AI Gateway.
4. Establish and enforce quality gates for each of the 14 development phases.
5. Lead the QA team (manual and automated testers) and coordinate their daily activities.
6. Collaborate with the SDET to prioritize and track test automation efforts.
7. Design test plans for complex, cross-module workflows (e.g., Exam Delivery + AI Proctoring).
8. Track, triage, and prioritize bugs, ensuring critical issues are addressed before phase completion.
9. Report quality metrics, test coverage, and release readiness to project stakeholders.
10. Ensure comprehensive testing of all RBAC permissions across the 8 user roles.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| QA Strategy & Test Planning | OWNS |
| Test Case Management (~1,600 cases) | OWNS |
| Phase Quality Gates | OWNS |
| Bug Triage & Prioritization | OWNS |
| Test Automation Implementation | COLLABORATES (with SDET) |
| Feature Development | OUT OF SCOPE |
| Infrastructure Monitoring | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish the test case repository and link it to the project management tool.
- Define the baseline quality gates for CI/CD integration.
- Verify Authentication System (1.6), User Management (1.7), and Role & Permission Management (1.8).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Validate Course Management (2.1) and Subject Management (2.2) CRUD logic.
- Test Syllabus Tree (2.3) recursive rendering and depth constraints.
- Verify Student Course Enrollment (2.6) functionality.

### Phase 3 — Question Bank
- Test Pluggable Question Type System (3.1) with all supported question types.
- Verify Question Versioning (3.3) and Question Lifecycle (3.5) status flows.
- Validate Question Tags (3.4) filtering and multi-tag associations.

### Phase 4 — Exam Pattern
- Test Exam Pattern Validation Engine (4.8) algorithms and constraints.
- Verify Topic Distribution (4.4) and Difficulty Distribution (4.5) calculations.
- Validate Negative Marking Configuration (4.6).

### Phase 5 — Exam Generator
- Verify Exam Generation Engine (5.1) correctly respects exam pattern blueprints.
- Test Draft Exam Inspection (5.2) and manual question swapping features.
- Validate Manual Exam Creation (5.4) flows.

### Phase 6 — Exam System
- Coordinate extensive testing of Exam Attempt Session (6.2) logic and Answer Submission (6.3) under network stress.
- Validate Auto-Evaluation Engine (6.5) grading accuracy.
- Test Result Generation (6.6) and Exam-Taking Frontend (6.8).

### Phase 7 — Exam Archive
- Test Exam Publication Workflow (7.1) state transitions.
- Verify Published Exam Snapshot (7.2) immutability and Historical Exam Integrity (7.5).
- Validate Exam Archive & Search (7.4) performance and filters.

### Phase 8 — Student Analytics
- Perform rigorous data validation on Mastery Engine (8.1) score calculations.
- Test Strengths Identification (8.2) and Weakness Identification (8.3).
- Verify Syllabus Proficiency Map (8.4) rendering and color coding.

### Phase 9 — Personalized Practice
- Verify Weakness Pool Generation (9.1) accurately identifies target topics.
- Test Personalized Practice Paper Generation (9.2) outputs.
- Validate Adaptive Mastery Confirmation (9.3) logic.

### Phase 10 — Preview System
- Verify Impersonation System (10.3) securely isolates user sessions.
- Test Preview Audit Trail (10.5) logs.
- Validate Preview Configuration UI (10.2).

### Phase 11 — AI Question System
- Test AI Gateway Architecture (11.1) and AI Worker Queue System (11.6).
- Verify AI Question Modification (11.3) and Generation (11.4) outputs against prompt injection.
- Test AI Usage Tracking (11.5) mechanisms.

### Phase 12 — AI Interview
- Validate Controlled Natural Conversation Engine (12.3) dialogue flow.
- Test Speech-to-Text (12.4) and Text-to-Speech (12.5) integrations.
- Verify Interview Assessment Engine (12.6) rubric evaluations.

### Phase 13 — Subscriptions
- Validate Entitlement Engine (13.1) limit enforcement.
- Test AI Credit System (13.3) deductions and balances.
- Verify Billing Integration (13.5) webhooks and Free Tier Experience (13.7).

### Phase 14 — Production Hardening
- Execute the final production readiness QA sign-off.
- Validate Security Hardening (14.1) and Abuse Protection (14.7) rules.
- Conduct a full regression test suite across all 111 features.

## 5. Key Guidelines
### 5.1 Technical Standards
- All test cases must trace back to specific feature requirements or API endpoints.
- Bug reports must include API request/response payloads, frontend console logs, and step-by-step repros.
- Quality gates are non-negotiable; a phase is not complete until its gate is passed.

### 5.2 Collaboration Model
- Run weekly bug triage meetings with Engineering Leads and Product Managers.
- Work daily with the SDET to align manual testing discoveries with automated test priorities.
- Consult with the Platform Engineer on the status of staging environments.

### 5.3 Tools & Processes
- **Tools**: Jira/Linear, TestRail/Xray, Postman (for exploratory API testing), BrowserStack.
- **Processes**: Shift-left testing, mandatory QA sign-off on all Phase deliverables.

## 6. Do's ✅
1. Require clear acceptance criteria on all tickets before testing begins.
2. Focus heavily on API testing first; the UI is just a consumer.
3. Test edge cases, negative paths, and malicious inputs rigorously.
4. Maintain a clear matrix of manual vs. automated test coverage.
5. Organize test cases logically by module and feature.
6. Provide actionable, high-quality bug reports with video recordings where helpful.
7. Test the system under varied network conditions (e.g., 3G throttling for exam delivery).
8. Verify RBAC on every API endpoint, not just the UI visibility.
9. Champion quality across the entire engineering team.
10. Ensure accessibility (a11y) is tested in the Next.js frontend.
11. Review the SDET's automation reports daily.
12. Plan for exploratory testing sessions in addition to scripted tests.
13. Validate data integrity in the PostgreSQL database directly when necessary.
14. Ensure AI outputs are tested for hallucinations and consistency.
15. Define clear "Definition of Done" criteria for the team.

## 7. Don'ts ❌
1. Don't treat the API as a black box; inspect requests and responses.
2. Don't sign off on a phase if P1/P2 bugs remain open.
3. Don't rely solely on UI testing; ensure the underlying APIs are robust.
4. Don't let test case documentation fall behind the feature implementation.
5. Don't accept "it works on my machine" as a resolution to a bug.
6. Don't ignore non-functional testing (performance, security).
7. Don't create vague bug reports (e.g., "The button is broken").
8. Don't delay testing until the end of a phase; engage continuously.
9. Don't overlook the impact of database migrations on existing test data.
10. Don't assume third-party APIs (like LLMs) will always return successful responses.
11. Don't test the AI Gateway without verifying its resilience to prompt injection.
12. Don't skip regression testing when shared modules (like `@repo/permissions`) are updated.
13. Don't allow manual testing of repetitive tasks that should be automated by the SDET.
14. Don't ignore frontend console errors or API 500s during exploratory testing.
15. Don't compromise on the quality gates to meet a deadline.

## 8. Quality Gates
- **Phase Completion Gate**: 100% of P1/P2 bugs resolved, 95% of test cases passing, SDET automation targets met.
- **Release Candidate Gate**: Full regression suite run with > 98% pass rate, zero critical security findings.
- **Feature Gate**: API tests passing, UI accessibility verified, RBAC confirmed.

## 9. Escalation Path
- **Blocked Testing (Env Down)**: Escalate to DevOps/Platform Engineer.
- **High Defect Rate**: Escalate to Engineering Manager and relevant Tech Leads.
- **Requirement Ambiguity**: Escalate to Product Manager.

## 10. KPIs & Success Metrics
- **Defect Escape Rate**: < 2% of bugs found in production vs. pre-production.
- **Test Coverage vs Plan**: Percentage of the ~1,600 tests executed and passing per phase.
- **Time to Triage**: Average time from bug creation to triage/assignment (< 24 hours).
- **Automation Shift**: Percentage of test cases transitioned from manual to automated over time.
