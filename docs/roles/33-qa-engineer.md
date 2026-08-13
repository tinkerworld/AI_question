# QA Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The QA Engineer is the gatekeeper of quality for the Adaptive Examination & AI Learning Platform. This role focuses on test planning, manual test execution, defect management, and exploratory testing to ensure the platform functions flawlessly, especially critical flows like exam-taking and AI evaluations.

## 2. Core Responsibilities
1. Own the overall test planning and execution strategy.
2. Conduct exploratory testing on all new features.
3. Execute manual test cases for scenarios that are hard to automate.
4. Manage defect tracking, triage, and verification.
5. Validate AI responses against expected educational standards.
6. Ensure test execution aligns with the project's phase goals (covering the ~1,600 test cases).
7. Uphold the standards defined in `test-strategy.md`.

## 3. Work Boundaries

| Area | Ownership Level |
|---|---|
| Test Planning & Execution | OWNS |
| Defect Management | OWNS |
| Exploratory Testing | OWNS |
| Automated Test Creation | COLLABORATES |
| Test Data Generation | COLLABORATES |
| Application Code | OUT OF SCOPE |
| Infrastructure Provisioning | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Execute baseline tests for Monorepo Setup & Infrastructure and Database Package (features 1.1, 1.2).
- Test Authentication System and User Management workflows (features 1.6, 1.7).
- Verify Role & Permission Management (feature 1.8) for all system roles.
- Definition of Done: Phase 1 foundational features are verified and defect management established.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Execute tests for Course Management, Subject Management, and Syllabus Tree operations (features 2.1, 2.2, 2.3).
- Perform exploratory testing on the drag-drop reordering in Course-Subject-Syllabus Frontend (feature 2.5).

### Phase 3 — Question Bank
- Test Pluggable Question Type System and Question CRUD workflows for all basic types (features 3.1, 3.2).
- Validate Question Versioning, Tags, and Lifecycle flows (features 3.3, 3.4, 3.5).

### Phase 4 — Exam Pattern
- Test Exam Pattern CRUD, Sections, and Question Rules configuration (features 4.1, 4.2, 4.3).
- Rigorously test the Exam Pattern Validation Engine (feature 4.8) for negative marks and distribution rules (features 4.4, 4.5, 4.6).

### Phase 5 — Exam Generator
- Verify the Exam Generation Engine correctly auto-generates exams based on pattern rules (feature 5.1).
- Test Draft Exam Inspection and Manual Exam Creation features (features 5.2, 5.4).

### Phase 6 — Exam System
- Critically test Student Exam Access, Attempt Session, and Answer Submission per question type (features 6.1, 6.2, 6.3).
- Test Exam Completion and Auto-Evaluation Engine accuracy (features 6.4, 6.5).
- Verify Exam-Taking Frontend edge cases like network drops or timer expiration (feature 6.8).

### Phase 7 — Exam Archive
- Validate Exam Publication Workflow and Published Exam Snapshot integrity (features 7.1, 7.2).
- Verify Answer Key Preservation and Archive Frontend access (features 7.3, 7.7).

### Phase 8 — Student Analytics
- Manually verify Mastery Engine calculations and Strengths/Weaknesses identification logic (features 8.1, 8.2, 8.3).
- Verify the accuracy of the Student Analytics Dashboard and Teacher/Admin Analytics View (features 8.6, 8.7).

### Phase 9 — Personalized Practice
- Test Weakness Pool Generation and Personalized Practice Paper Generation (features 9.1, 9.2).
- Validate Adaptive Mastery Confirmation logic (feature 9.3).

### Phase 10 — Preview System
- Verify Preview Configuration UI and Impersonation System functionality (features 10.2, 10.3).
- Test the entire Preview Workflow and check Preview Audit Trail (features 10.5, 10.6).

### Phase 11 — AI Question System
- Validate AI Question Modification and AI Question Generation accuracy (features 11.3, 11.4).
- Ensure graceful handling of Cloud AI Integration errors and AI Worker Queue System behavior (features 11.6, 11.8).

### Phase 12 — AI Interview
- Perform conversational testing on the Controlled Natural Conversation Engine (feature 12.3).
- Validate Speech-to-Text (STT) and Text-to-Speech (TTS) integration accuracy (features 12.4, 12.5).
- Test the Interview Assessment Engine and Feedback Generation (features 12.6, 12.7).

### Phase 13 — Subscriptions
- Test Entitlement Engine plan limits and Subscription Management workflows (features 13.1, 13.2).
- Verify AI Credit System deductions and Billing Integration payments (features 13.3, 13.5).

### Phase 14 — Production Hardening
- Execute full regression testing suite.
- Perform final exploratory testing focusing on Security Hardening and Abuse Protection (features 14.1, 14.7).
- Definition of Done: Zero critical/high defects open before launch.

## 5. Key Guidelines
### 5.1 Technical Standards
- Must follow `test-strategy.md` strictly.
- All defects must have steps to reproduce, expected vs. actual results, and screenshots/videos.
- Test cases must map to specific requirements or user stories.

### 5.2 Collaboration Model
- Work closely with Software Test Engineers to identify scenarios.
- Pair with developers for bug triaging and reproduction.

### 5.3 Tools & Processes
- Test Management: Zephyr/TestRail.
- Bug Tracking: Jira.
- API Testing: Postman (for manual API checks).

## 6. Do's ✅
1. Do follow `test-strategy.md` for all testing activities.
2. Do prioritize testing the core exam-taking flows rigorously.
3. Do rigorously verify timer accuracy and negative marking calculations.
4. Do carefully validate AI responses for accuracy and hallucinations.
5. Do verify mastery scoring against known datasets.
6. Do write clear, concise, and reproducible bug reports.
7. Do perform exploratory testing beyond scripted test cases.
8. Do test on multiple supported browsers and devices.
9. Do verify edge cases and negative scenarios.
10. Do collaborate closely with developers during the sprint.
11. Do keep test case statuses updated daily.
12. Do retest fixed bugs promptly.
13. Do advocate for the end-user experience.
14. Do participate in requirements reviews to catch issues early.
15. Do use developer tools (Network/Console tabs) to provide technical context in bug reports.

## 7. Don'ts ❌
1. Don't skip edge cases, especially in exam calculations.
2. Don't mark tests as passed without evidence (logs, screenshots).
3. Don't assume a feature works because the developer said so.
4. Don't ignore intermittent bugs; log them and investigate.
5. Don't focus only on happy paths.
6. Don't test in isolation without understanding the system context.
7. Don't log duplicate bugs; search the tracker first.
8. Don't write vague bug summaries (e.g., "Exam is broken").
9. Don't delay reporting critical blockers.
10. Don't neglect performance and usability observations while testing functionally.
11. Don't rely solely on automated tests; exploratory testing is vital.
12. Don't forget to test error handling and validation messages.
13. Don't approve releases with known critical defects.
14. Don't skip testing AI features for bias or safety.
15. Don't ignore the `test-strategy.md` guidelines.

## 8. Quality Gates
- Test Plan Review: Test plans must be reviewed by the QA Lead.
- Defect Triage: All reported bugs must be triaged within 24 hours.
- Sign-off: Formal QA sign-off is required before any phase release.

## 9. Escalation Path
- Blocker Bugs: Escalate immediately to the Tech Lead and Project Manager.
- Untestable Features: Escalate to Product Management for clarification.
- Testing Delays: Escalate to the QA Lead.

## 10. KPIs & Success Metrics
- Defect Escape Rate (bugs found in production vs. testing).
- Test Execution Coverage (percentage of the ~1,600 test cases executed per phase).
- Bug Rejection Rate (percentage of bugs closed as "Not a Bug").
- Time to Test Execution.
