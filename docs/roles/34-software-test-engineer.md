# Software Test Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Software Test Engineer focuses on the structural aspects of testing for the Adaptive Examination & AI Learning Platform. This role owns test design, test case creation, and the management of test data. You are responsible for designing the ~1,600 test cases and ensuring robust test data is available for QA and Automation teams.

## 2. Core Responsibilities
1. Design comprehensive test cases for all platform features.
2. Manage and create test data, specifically for different question types and exam scenarios.
3. Maintain the repository of ~1,600 test cases.
4. Design test fixtures for complex scenarios (e.g., adaptive exams).
5. Ensure test cases cover both functional and non-functional requirements.
6. Review requirements and technical specs to formulate test designs.
7. Maintain test case traceability to requirements.

## 3. Work Boundaries

| Area | Ownership Level |
|---|---|
| Test Design & Case Creation | OWNS |
| Test Data Management | OWNS |
| Test Fixture Creation | OWNS |
| Manual Test Execution | COLLABORATES |
| Automated Test Scripts | COLLABORATES |
| Platform Code | OUT OF SCOPE |
| Infrastructure Deployment | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Design baseline API test cases for Authentication System, User Management, and Role & Permission Management (features 1.6, 1.7, 1.8).
- Create initial test data for system roles (MAIN_ADMIN, SUB_ADMIN, TEACHER, STUDENT).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Design test cases for Syllabus Tree (recursive hierarchy) and Course Management (features 2.1, 2.3).
- Create test data fixtures for courses, subjects, and topics.

### Phase 3 — Question Bank
- Design specific test data for every Pluggable Question Type (MCQ, Multiple-Select, Subjective, etc.) (feature 3.1).
- Create test cases for Question Lifecycle (DRAFT → PUBLISHED) and Versioning workflows (features 3.3, 3.5).

### Phase 4 — Exam Pattern
- Design rigorous test cases for Exam Pattern Validation Engine and rule validations (features 4.3, 4.4, 4.5, 4.8).
- Generate boundary test data for negative marking and percentage allocations (features 4.4, 4.5, 4.6).

### Phase 5 — Exam Generator
- Design test cases verifying the Exam Generation Engine's selection algorithms (feature 5.1).
- Design tests for Draft Exam Inspection (feature 5.2).

### Phase 6 — Exam System
- Design test cases for Exam Attempt Session state recovery, timer accuracy, and Answer Submission (features 6.2, 6.3).
- Create test fixtures verifying Auto-Evaluation Engine math (objective question grading) (feature 6.5).

### Phase 7 — Exam Archive
- Design test cases for the Exam Publication Workflow and historical snapshot verification (features 7.1, 7.2, 7.3).

### Phase 8 — Student Analytics
- Design test cases to verify Mastery Engine calculations (topic mastery scores) (feature 8.1).
- Create test data sets simulating consistent GREEN/BLUE and RED/ORANGE outcomes (features 8.2, 8.3).

### Phase 9 — Personalized Practice
- Design test cases for Weakness Pool Generation and Practice Paper Generation (features 9.1, 9.2).
- Create test configurations for Adaptive Mastery Confirmation (feature 9.3).

### Phase 10 — Preview System
- Design test cases for the Impersonation System and Entitlement Integration inside Preview mode (features 10.3, 10.4).

### Phase 11 — AI Question System
- Design test cases for the AI Gateway Architecture API and AI Worker Queue System (features 11.1, 11.6).
- Create test data sets to validate AI Question Modification outputs (feature 11.3).

### Phase 12 — AI Interview
- Design test cases for Interview Topic Engine and Interview Assessment Engine (features 12.2, 12.6).
- Define fixtures with known audio files for STT/TTS validations (features 12.4, 12.5).

### Phase 13 — Subscriptions
- Design payment flow tests using the Billing Integration adapters and Entitlement Engine limits (features 13.1, 13.5).
- Create test data for various Subscription Management plans (Free, Premium, Premium+) (feature 13.2).

### Phase 14 — Production Hardening
- Review and refine the complete suite of ~1,600 test cases for final launch.
- Ensure all test data fixtures are up-to-date for regression testing, including Abuse Protection test cases (feature 14.7).

## 5. Key Guidelines
### 5.1 Technical Standards
- Test cases must follow a Given-When-Then structure where applicable.
- Test data should be declarative and easily injectable via scripts.
- Must ensure coverage across Express/TypeScript API, Next.js UI, and Python AI server.

### 5.2 Collaboration Model
- Work with QA Engineers to ensure test cases are executable manually.
- Work with Automation Engineers to ensure test cases are automatable.

### 5.3 Tools & Processes
- Test Case Management: Zephyr/TestRail.
- Data Generation: Faker.js, Python scripts, Prisma seeders.

## 6. Do's ✅
1. Do design test data specifically for every single question type (MCQ, Numerical, Subjective).
2. Do create robust test fixtures for complex exam scenarios.
3. Do write clear, unambiguous test steps.
4. Do ensure test cases are independent and not reliant on sequential execution.
5. Do link test cases to specific user stories or requirements.
6. Do include expected results for every single step.
7. Do parameterize test cases to support data-driven testing.
8. Do peer-review test cases with other QA team members.
9. Do design negative test cases as rigorously as positive ones.
10. Do create scripts for automated test data generation.
11. Do maintain a clean, organized test case repository.
12. Do consider boundary values and equivalence partitioning in test design.
13. Do update test cases when requirements change.
14. Do document prerequisites clearly for every test case.
15. Do design tests for API endpoints before the UI is ready.

## 7. Don'ts ❌
1. Don't write test cases that are too broad or test multiple things at once.
2. Don't use hardcoded, fragile test data in designs.
3. Don't ignore the need for specific test data for different question types.
4. Don't write test cases that cannot be automated.
5. Don't skip defining test data for negative marking scenarios.
6. Don't assume test data will "just exist" in the environment.
7. Don't write test cases without clear expected results.
8. Don't mix test steps with test data.
9. Don't neglect edge cases in test design.
10. Don't forget to design tests for cross-browser compatibility.
11. Don't leave test cases unassigned to a phase or feature.
12. Don't duplicate test cases unnecessarily.
13. Don't ignore API contract tests.
14. Don't create overly complex test data fixtures that are hard to maintain.
15. Don't design tests without consulting the technical architecture.

## 8. Quality Gates
- Test Case Reviews: All new test cases must be reviewed by the QA Lead.
- Test Data Validation: Data generation scripts must be tested for accuracy.
- Coverage Metrics: Ensure 100% coverage of defined acceptance criteria.

## 9. Escalation Path
- Ambiguous Requirements: Escalate to Product Management for clarification.
- Blocked Data Generation: Escalate to Backend or DBA teams.
- Tooling Issues: Escalate to DevOps.

## 10. KPIs & Success Metrics
- Test Case Effectiveness (percentage of bugs found by designed cases).
- Test Case Coverage (percentage of requirements covered).
- Test Data Availability (time taken to provision test data).
- Number of automated test cases successfully derived from designs.
