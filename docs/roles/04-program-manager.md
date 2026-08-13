# Program Manager — Developer Guidelines & Responsibilities

## 1. Role Overview
The Program Manager oversees the execution of the entire Adaptive Examination & AI Learning Platform at a macro level. While Project Managers handle daily sprint execution, you ensure alignment, manage cross-team dependencies, and coordinate efforts across the 14 phases. You manage the intricate web of dependencies between the API team (Express/TypeScript), Frontend team (Next.js), AI team (Python FastAPI), QA team, and DevOps team working within the pnpm + Turborepo monorepo.

## 2. Core Responsibilities
1. **Program-Level Planning**: Align the 14 phases into a cohesive program roadmap, mapping major integration milestones.
2. **Cross-Team Coordination**: Facilitate communication and synchronize deliverables between the Backend, Frontend, AI, QA, and DevOps teams.
3. **Dependency Management**: Proactively identify and manage critical path dependencies across different service modules.
4. **Program Risk Management**: Track systemic risks that span multiple teams or phases and develop mitigation strategies.
5. **Resource Strategy**: Work with leadership to forecast resource needs across all teams to meet program objectives.
6. **Integration Milestones**: Define and enforce cross-team integration points (e.g., API + UI handoffs).
7. **Process Standardization**: Ensure consistent agile practices and tooling usage across all teams.
8. **Stakeholder Reporting**: Provide executive-level visibility into program health, velocity, and risks.
9. **Vendor/External Management**: Manage external dependencies such as payment gateways, SMS providers, or AI API providers.
10. **Release Management**: Coordinate complex, multi-team releases ensuring module independence is maintained.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Cross-Team Dependency Management | OWNS |
| Program-Level Milestones & Planning | OWNS |
| Executive Reporting & Program Health | OWNS |
| Process Standardization across Teams | OWNS |
| Daily Sprint Execution | COLLABORATES (with Project Managers) |
| Product Strategy & Prioritization | COLLABORATES (with Product Managers) |
| Technical Architecture | CONSULTS (with Lead Architect) |
| Code Implementation | OUT OF SCOPE |
| Individual Feature Acceptance | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **Sync Points**: Monorepo (Turborepo) setup (1.1) coordination between DevOps, API, and UI leads.
- **Milestones**: Program charter approved, CI/CD pipelines operational, 1.2 Database Package deployed.
- **Dependencies**: Ensure database provisioning (PostgreSQL) aligns with initial schema design and 1.6 Authentication System.

### Phase 2 — Academic Structure
- **Sync Points**: Data modeling alignment for 2.3 Syllabus Tree and 2.1 Course Management.
- **Milestones**: Core academic taxonomy integrated front-to-back.
- **Dependencies**: Frontend Admin UI (2.5) depends heavily on API completion.

### Phase 3 — Question Bank
- **Sync Points**: Sync Next.js component development with TypeScript API schemas for the 3.1 Pluggable Question Type System.
- **Milestones**: End-to-end question creation workflow operational (3.2 Question CRUD).
- **Dependencies**: Heavy reliance on UI/UX design completion before frontend work on 3.7 Question Bank Frontend.

### Phase 4 — Exam Pattern
- **Sync Points**: Coordinate complex 4.8 Exam Pattern Validation Engine logic across API and UI.
- **Milestones**: 4.1 Exam Pattern CRUD and 4.4 Topic Distribution integrated.
- **Dependencies**: Requires robust academic structure (Phase 2) and populated question banks (Phase 3).

### Phase 5 — Exam Generator
- **Sync Points**: Coordinate complex algorithm testing for 5.1 Exam Generation Engine between QA and API teams.
- **Milestones**: Rule-based generation integrated and 5.2 Draft Exam Inspection validated.
- **Dependencies**: Relies completely on valid patterns created in Phase 4.

### Phase 6 — Exam System
- **Sync Points**: Load testing coordination between DevOps and API teams for 6.2 Exam Attempt Session.
- **Milestones**: High-concurrency exam delivery (6.8) and 6.5 Auto-Evaluation Engine validated.
- **Dependencies**: Real-time infrastructure must be stable for 6.3 Answer Submission.

### Phase 7 — Exam Archive
- **Sync Points**: Coordinate the data pipeline for 7.2 Published Exam Snapshot and 7.3 Answer Key Preservation.
- **Milestones**: 7.1 Exam Publication Workflow operational without locking active questions.
- **Dependencies**: Needs strict data integrity checks during the snapshot phase.

### Phase 8 — Student Analytics
- **Sync Points**: Data pipeline coordination between transactional DB and 8.1 Mastery Engine logic.
- **Milestones**: 8.6 Student Analytics Dashboard live.
- **Dependencies**: Accurate data generation and auto-evaluation from Phase 6.

### Phase 9 — Personalized Practice
- **Sync Points**: Sync AI/Data logic for 9.1 Weakness Pool Generation with Frontend UI.
- **Milestones**: Adaptive practice engine (9.2) operational.
- **Dependencies**: Requires accurate mastery calculations from Phase 8.

### Phase 10 — Preview System
- **Sync Points**: Coordinate 10.3 Impersonation System security across Auth and UI boundaries.
- **Milestones**: 10.6 Preview Workflow deployed and safe.
- **Dependencies**: Auth layer (Phase 1) updates must precede this safely.

### Phase 11 — AI Question System
- **Sync Points**: Critical sync between Python FastAPI team (AI) and TypeScript API team for 11.1 AI Gateway Architecture.
- **Milestones**: 11.4 AI Question Generation Worker integrated and tested against multiple providers.
- **Dependencies**: External AI provider API access, 11.6 AI Worker Queue System stability.

### Phase 12 — AI Interview
- **Sync Points**: Sync 12.4 STT and 12.5 TTS providers with the frontend audio pipeline.
- **Milestones**: 12.3 Controlled Natural Conversation Engine operational.
- **Dependencies**: WebSocket or low-latency HTTP infrastructure for real-time AI responses.

### Phase 13 — Subscriptions
- **Sync Points**: External payment gateway integration coordination for 13.5 Billing Integration.
- **Milestones**: End-to-end payment flow and 13.1 Entitlement Engine secure.
- **Dependencies**: Strict dependency on User Management and external APIs.

### Phase 14 — Production Hardening
- **Sync Points**: Coordinate Go-Live sequence across DevOps, API, UI, AI, and QA teams for 14.9 Deployment Configuration.
- **Milestones**: Production Launch, 14.1 Security Hardening verified.
- **Dependencies**: Final security audits, load testing sign-offs, and 14.8 Data Privacy compliance checks.

## 5. Key Guidelines

### 5.1 Technical Standards
- Deep understanding of the API-first and Modular Monolith principles to effectively sequence cross-team work.
- Ensure integration testing (Supertest, Playwright) is prioritized when coordinating cross-team handoffs.
- Enforce the AI Gateway pattern as a strict dependency barrier between core logic and external AI providers.

### 5.2 Collaboration Model
- Run Weekly Scrum of Scrums (SoS) with Project Managers, Tech Leads, and QA Leads.
- Facilitate phase transition meetings to ensure all exit/entry criteria are met before moving to the next phase.
- Act as a neutral mediator when resource or dependency conflicts arise between teams.

### 5.3 Tools & Processes
- **Program Tracking**: Jira Advanced Roadmaps / Jira Align / Smartsheet
- **Documentation**: Confluence / Notion (Program Dashboards, Dependency Matrices)
- **Process**: Scaled Agile Framework (SAFe) principles or customized Scrum of Scrums.

## 6. Do's ✅
1. DO map out all dependencies between the API, UI, AI, and DevOps teams explicitly.
2. DO run effective Scrum of Scrums to surface cross-team blockers quickly.
3. DO maintain a Program-level Risk Register and escalate systemic issues.
4. DO ensure the API team adheres to the API-first contract to avoid blocking the Next.js team.
5. DO coordinate major architectural decisions with the Lead Architect to assess timeline impacts.
6. DO track progress across all 14 phases at a macro level, ensuring phase milestones are hit.
7. DO facilitate smooth handoffs between development and QA for end-to-end testing.
8. DO manage external vendor relationships and API access (AI providers, Payment Gateways).
9. DO standardise agile metrics and reporting across all underlying teams.
10. DO ensure the Turborepo monorepo structure is supporting, not hindering, cross-team collaboration.
11. DO plan integration testing windows explicitly in the program schedule.
12. DO align the 3-tier subscription feature releases across all technical boundaries.
13. DO coordinate with DevOps to ensure CI/CD pipelines support the release cadence.
14. DO champion the module independence principle during program planning to minimize tight coupling.
15. DO provide clear, executive-friendly summaries of program status, risks, and mitigation plans.

## 7. Don'ts ❌
1. DON'T micromanage individual team sprints; leave that to the Project Managers.
2. DON'T ignore dependency bottlenecks between the Python AI server and TypeScript API.
3. DON'T allow teams to work in silos; force cross-functional communication.
4. DON'T assume API contracts will remain static; plan for API versioning and updates.
5. DON'T skip phase-gate reviews before progressing to the next major phase.
6. DON'T let external dependencies (e.g., Stripe approval) become critical path blockers unmanaged.
7. DON'T force a rigid timeline if the agile velocity data proves it unrealistic.
8. DON'T override technical decisions made by the architecture team regarding the Modular Monolith.
9. DON'T forget to coordinate security and compliance audits within the program schedule.
10. DON'T rely on informal communication for critical cross-team handoffs; document them.
11. DON'T let the ~1,600 test cases become an afterthought; ensure QA has the capacity to execute them.
12. DON'T ignore the complexities of integrating the student learning loop across different modules.
13. DON'T allow scope creep at the program level without a formal change management process.
14. DON'T schedule major cross-team integrations on Fridays or immediately before milestones.
15. DON'T lose sight of the final goal: a stable, performant platform across all 111 features.

## 8. Quality Gates
- **Phase Transition Gate**: All cross-team integration tests passing, zero critical blocking bugs, module boundaries respected.
- **Program Increment (PI) Gate**: Executive sign-off on the delivered value for a group of phases.
- **Go/No-Go Launch Gate**: Final coordination sign-off from all team leads (API, UI, AI, QA, DevOps).

## 9. Escalation Path
1. **Cross-Team Conflict**: Mediate directly with Project Managers and Tech Leads.
2. **Resource Shortage**: Escalate to Engineering Directors / VP of Engineering.
3. **Strategic/Budget Risk**: Escalate to Project Sponsors and Executive Steering Committee.

## 10. KPIs & Success Metrics
- **Program Predictability**: Variance between planned vs. actual delivery dates for the 14 phases.
- **Dependency Resolution Time**: Average time to unblock cross-team dependencies.
- **Cross-Team Defect Rate**: Number of bugs found during cross-module integration testing.
- **Overall Program Budget Variance**: Actual vs. planned spend at the program level.
- **Release Frequency/Stability**: Number of successful, stable releases across the monorepo architecture.
