# Product Owner — Developer Guidelines & Responsibilities

## 1. Role Overview
The Product Owner (PO) is the tactical bridge between the product vision and the engineering execution for the Adaptive Examination & AI Learning Platform. You manage the product backlog, ensuring every user story is well-defined, actionable, and aligned with the 28 functional specs. Working intimately with the Express API, Next.js, and Python AI teams in a Turborepo environment, you prioritize sprint work, accept completed stories, and guarantee that the team is always building the highest-value features across the 14 phases.

## 2. Core Responsibilities
1. **Backlog Management**: Create, maintain, and prioritize the product backlog based on the PdM's roadmap.
2. **User Story Creation**: Translate the 28 functional specs and 111 features into detailed, actionable user stories.
3. **Acceptance Criteria**: Define rigorous, testable acceptance criteria for every user story.
4. **Sprint Prioritization**: Select and prioritize stories for upcoming sprints, ensuring alignment with phase goals.
5. **Story Acceptance**: Review and accept/reject completed user stories during or at the end of sprints.
6. **Requirement Clarification**: Be available daily to answer questions from developers and clarify requirements.
7. **Backlog Refinement**: Lead regular backlog grooming sessions to ensure tickets are "Ready" for development.
8. **Stakeholder Alignment**: Demo completed work to stakeholders and gather feedback.
9. **Specification Validation**: Ensure every implemented feature explicitly traces back to the 28 functional specs.
10. **Cross-Module Consistency**: Ensure stories respect the module independence boundaries of the architecture.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Product Backlog & Prioritization | OWNS |
| User Stories & Acceptance Criteria | OWNS |
| Sprint Priorities & Scope | OWNS |
| Feature Acceptance/Rejection | OWNS |
| Product Vision & Roadmap | COLLABORATES (with Product Manager) |
| UI/UX Implementation Details | COLLABORATES (with UI/UX Designers) |
| Technical Implementation | OUT OF SCOPE |
| Project Budget & Scheduling | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **Backlog**: Create foundational epics and stories for 1.1 Monorepo Setup & Infrastructure, 1.2 Database Package, and 1.6 Authentication System.
- **Criteria**: Define acceptance criteria for base architectural and RBAC requirements.
- **Demos**: Demo successful deployment of empty services across environments and login flows.

### Phase 2 — Academic Structure
- **Backlog**: Stories for 2.1 Course Management, 2.2 Subject Management, and 2.3 Syllabus Tree CRUD.
- **Criteria**: Validate strict data integrity and hierarchical relationships in PostgreSQL.
- **Demos**: Demo the Admin UI managing the academic taxonomy.

### Phase 3 — Question Bank
- **Backlog**: Stories for 3.1 Pluggable Question Type System (MCQ, Fill-in, etc.) and 3.2 Question CRUD.
- **Criteria**: Validate Next.js UI rendering against TypeScript API schemas for question bodies.
- **Demos**: Demo creating, editing, and previewing complex question types and versions.

### Phase 4 — Exam Pattern
- **Backlog**: Stories for 4.1 Exam Pattern CRUD and 4.8 Exam Pattern Validation Engine.
- **Criteria**: Ensure section rules and topic distribution configurations match the specifications.
- **Demos**: Demo generating an exam pattern blueprint with valid negative marking configurations.

### Phase 5 — Exam Generator
- **Backlog**: Stories for 5.1 Exam Generation Engine and 5.2 Draft Exam Inspection.
- **Criteria**: Ensure rule-based generation precisely matches requested pattern distributions.
- **Demos**: Demo generating a draft exam and swapping questions manually.

### Phase 6 — Exam System
- **Backlog**: Stories for the Next.js exam engine (6.8), 6.2 Exam Attempt Session, and 6.5 Auto-Evaluation Engine.
- **Criteria**: Define strict performance and state-recovery criteria for network drops during answer submission.
- **Demos**: Demo a full exam lifecycle from start to submission and auto-evaluation.

### Phase 7 — Exam Archive
- **Backlog**: Stories for 7.1 Exam Publication Workflow and 7.2 Published Exam Snapshot.
- **Criteria**: Ensure immutable freezing of question versions upon exam publish.
- **Demos**: Demo retrieving an archived exam with preserved historical answer keys.

### Phase 8 — Student Analytics
- **Backlog**: Stories for 8.1 Mastery Engine calculations and 8.4 Syllabus Proficiency Map.
- **Criteria**: Define data accuracy requirements for strengths and weaknesses identification.
- **Demos**: Demo student and teacher analytics views.

### Phase 9 — Personalized Practice
- **Backlog**: Stories for 9.1 Weakness Pool Generation and 9.2 Personalized Practice Paper Generation.
- **Criteria**: Validate the logic of generating practice tests specifically from weak topics.
- **Demos**: Demo taking a practice test and verifying adaptive mastery confirmation.

### Phase 10 — Preview System
- **Backlog**: Stories for 10.3 Impersonation System and 10.4 Entitlement Integration.
- **Criteria**: Define strict audit trail requirements for preview workflows.
- **Demos**: Demo previewing an exam as a simulated student user.

### Phase 11 — AI Question System
- **Backlog**: Stories for 11.1 AI Gateway Architecture, 11.3 AI Question Modification, and 11.4 AI Question Generation Worker.
- **Criteria**: Define acceptable latency, prompt fallback mechanisms, and queue thresholds.
- **Demos**: Demo generating questions from syllabus topics via the AI Gateway.

### Phase 12 — AI Interview
- **Backlog**: Stories for 12.1 Interview Template Management and 12.3 Controlled Natural Conversation Engine.
- **Criteria**: Ensure STT/TTS pipeline integrations are robust and responsive.
- **Demos**: Demo an AI-driven spoken interview and review the generated assessment.

### Phase 13 — Subscriptions
- **Backlog**: Stories for pricing tiers via 13.1 Entitlement Engine, 13.3 AI Credit System, and 13.5 Billing Integration.
- **Criteria**: Define strict criteria for feature gating based on active subscriptions and credit balances.
- **Demos**: Demo upgrading a user and spending AI credits on question generation.

### Phase 14 — Production Hardening
- **Backlog**: Stories for 14.1 Security Hardening, 14.4 Monitoring & Alerting, and 14.7 Abuse Protection.
- **Criteria**: Launch checklist completion and performance metric validation.
- **Demos**: End-to-end platform walkthrough for final stakeholder sign-off.

## 5. Key Guidelines

### 5.1 Technical Standards
- Structure backlog items reflecting the API-first nature: UI stories should often follow API specification stories.
- Ensure acceptance criteria require passing automated tests (Vitest, Playwright, Supertest, pytest) where applicable.
- Explicitly map user stories to the 28 functional specs to ensure complete coverage.

### 5.2 Collaboration Model
- Attend all Sprint ceremonies (Planning, Standups, Reviews, Retrospectives).
- Work directly with the QA team to ensure test cases align with acceptance criteria.
- Act as the single source of truth for the development team regarding feature behavior.

### 5.3 Tools & Processes
- **Backlog Management**: Jira / Linear
- **Documentation**: Confluence / Notion (linking stories to functional specs)
- **Design Handoff**: Figma
- **Process**: Agile Scrum, maintaining a backlog refined for at least 2 future sprints.

## 6. Do's ✅
1. DO write clear, testable, and unambiguous Acceptance Criteria for every story.
2. DO validate every single feature against the original 28 functional specs.
3. DO maintain a prioritized backlog that reflects the phase goals.
4. DO slice large features into small, deliverable increments (vertical slicing).
5. DO ensure the team understands the business value of every story they work on.
6. DO be available daily to unblock the engineering team with quick decisions.
7. DO reject stories that do not meet the Definition of Done or Acceptance Criteria.
8. DO conduct thorough Sprint Demos to gather feedback early and often.
9. DO collaborate with Tech Leads to prioritize necessary technical debt and refactoring.
10. DO ensure design assets (Figma) are linked and finalized before development begins.
11. DO explicitly define error states and edge cases in user stories.
12. DO enforce the 3-tier subscription rules when defining access to new features.
13. DO understand the basic capabilities of the Python AI server to write realistic AI stories.
14. DO run effective backlog refinement sessions to estimate effort accurately.
15. DO track which phase (1-14) every epic and story belongs to.

## 7. Don'ts ❌
1. DON'T write vague user stories like "Make it look good" or "Make it fast."
2. DON'T push incomplete or unrefined stories into a sprint to meet arbitrary quotas.
3. DON'T change the acceptance criteria of a story once it's active in a sprint without team consensus.
4. DON'T ignore the module independence principle; ensure stories respect system boundaries.
5. DON'T accept work based solely on developer demonstrations; test it yourself.
6. DON'T overrule technical estimates provided by the development team.
7. DON'T forget to write stories for the Next.js Admin UI, not just the student-facing app.
8. DON'T let the backlog become a dumping ground for ideas; prune it regularly.
9. DON'T assume edge cases won't happen; explicitly plan for network failures and bad data.
10. DON'T dictate how the code should be written, only what it should achieve.
11. DON'T skip sprint reviews or stakeholder demos.
12. DON'T neglect non-functional requirements (performance, security) in acceptance criteria.
13. DON'T prioritize new features at the expense of fixing critical bugs.
14. DON'T let the 28 functional specs drift out of sync with the implemented reality.
15. DON'T approve AI features that violate the provider-agnostic AI Gateway principle.

## 8. Quality Gates
- **Sprint Entry Gate**: Ticket must have clear description, acceptance criteria, Figma links, and story points.
- **Sprint Exit Gate**: Feature must meet all acceptance criteria, pass all required tests (~1,600 total), and be demonstrable.

## 9. Escalation Path
1. **Requirements Ambiguity**: Escalate to Product Manager for strategic clarification.
2. **Technical Feasibility**: Resolve with Tech Lead / Architect.
3. **Delivery Risk**: Escalate to Project Manager.

## 10. KPIs & Success Metrics
- **Backlog Health**: Maintain 2+ sprints worth of "Ready" backlog items.
- **Sprint Success Rate**: Percentage of committed stories successfully accepted per sprint.
- **Defect Leakage**: Number of bugs reported in production for accepted stories.
- **Specification Coverage**: 100% trace coverage mapping the 111 features to the 28 functional specs.
