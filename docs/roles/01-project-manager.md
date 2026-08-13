# Project Manager — Developer Guidelines & Responsibilities

## 1. Role Overview
The Project Manager (PM) is responsible for ensuring the successful, timely, and on-budget delivery of the Adaptive Examination & AI Learning Platform. Operating within an agile Modular Monolith environment, the PM coordinates across the Express + TypeScript API, Next.js 15 frontend, and Python FastAPI AI server teams. The PM acts as the primary driver for process execution, timeline management, resource allocation, and risk mitigation across all 14 development phases and 111 features, ensuring smooth integration across the pnpm + Turborepo monorepo structure.

## 2. Core Responsibilities
1. **Timeline & Schedule Management**: Create, track, and maintain the delivery schedule for all 14 phases.
2. **Resource Allocation**: Ensure the backend, frontend, AI, and QA teams are adequately staffed and not bottlenecked.
3. **Risk Management**: Identify, assess, and mitigate risks, maintaining an up-to-date Risk Register for the project.
4. **Agile Process Execution**: Facilitate sprint planning, daily stand-ups, sprint reviews, and retrospectives.
5. **Cross-functional Coordination**: Manage dependencies between the API, UI, AI, and DevOps streams.
6. **Budget & Cost Tracking**: Monitor project expenditures against the allocated budget.
7. **Stakeholder Communication**: Provide regular status reports and updates to leadership and key stakeholders.
8. **Impediment Removal**: Actively unblock engineers by resolving cross-team dependencies or acquiring necessary tools.
9. **Scope Control**: Work with the Product Manager to manage scope creep and ensure changes go through proper change management.
10. **Quality Assurance Oversight**: Ensure QA testing (Vitest, Supertest, Playwright, pytest) aligns with milestone timelines.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Project Timelines & Schedule | OWNS |
| Budget & Resource Allocation | OWNS |
| Risk Management & Mitigation | OWNS |
| Sprint Execution & Ceremonies | OWNS |
| Scope & Requirements | COLLABORATES (with Product Manager) |
| Cross-team Dependency Resolution | COLLABORATES (with Program Manager) |
| Technical Architecture | CONSULTS (with Tech Lead/Architect) |
| Feature Prioritization | CONSULTS (with Product Owner) |
| Code Implementation | OUT OF SCOPE |
| UI/UX Design Decisions | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **Deliverables**: Initial Project Plan, Risk Register, Jira/Linear workspace setup for monorepo tracking.
- **Focus**: Tracking delivery of 1.1 Monorepo Setup & Infrastructure, 1.2 Database Package, 1.6 Authentication System, and 1.11 Frontend Foundation.
- **Definition of Done**: Phase 1 foundation APIs and Next.js foundation tested and deployed on schedule.

### Phase 2 — Academic Structure
- **Deliverables**: Resource plan for backend API and frontend Admin UI teams, sprint velocity baseline.
- **Focus**: Tracking delivery of 2.1 Course Management, 2.2 Subject Management, 2.3 Syllabus Tree, and 2.6 Student Course Enrollment.
- **Definition of Done**: Academic module APIs and Admin UI tested and deployed on schedule.

### Phase 3 — Question Bank
- **Deliverables**: Burn-down chart for the 3.1 Pluggable Question Type System implementations.
- **Focus**: Coordinating UI component creation (Next.js) with API schema validation (TypeScript) for 3.2 Question CRUD and 3.3 Question Versioning.
- **Definition of Done**: Question bank CRUD operations delivered, test coverage meets requirements.

### Phase 4 — Exam Pattern
- **Deliverables**: Tracking schedule for Exam Pattern blueprints (4.1) and Validation Engine (4.8).
- **Focus**: Coordinating cross-team efforts for 4.2 Exam Pattern Sections, 4.4 Topic Distribution, and 4.10 Exam Pattern Frontend.
- **Definition of Done**: Exam Pattern builder UI and API backend successfully deployed.

### Phase 5 — Exam Generator
- **Deliverables**: Mid-project risk assessment, updated timeline based on current velocity.
- **Focus**: Tracking the complexity of rule-based 5.1 Exam Generation Engine and 5.2 Draft Exam Inspection.
- **Definition of Done**: Blueprint-based exam generation successfully tested and accepted by QA.

### Phase 6 — Exam System
- **Deliverables**: Proctoring integration schedule, external dependency tracking.
- **Focus**: Managing risks associated with high-concurrency exam delivery simulations (6.2 Exam Attempt Session and 6.3 Answer Submission).
- **Definition of Done**: Real-time delivery system operational with <100ms latency metrics verified.

### Phase 7 — Exam Archive
- **Deliverables**: Schedule coordination for Exam Publication Workflow (7.1) and Answer Key Preservation (7.3).
- **Focus**: Ensuring historical exam integrity features are delivered and tested.
- **Definition of Done**: Exam Archive system successfully integrated without blocking main exam delivery timelines.

### Phase 8 — Student Analytics
- **Deliverables**: Analytics delivery timeline, stakeholder demo schedule.
- **Focus**: Tracking data pipeline development for 8.1 Mastery Engine and 8.6 Student Analytics Dashboard.
- **Definition of Done**: Analytics dashboards live, performance optimization goals met.

### Phase 9 — Personalized Practice
- **Deliverables**: Tracking schedule for 9.1 Weakness Pool Generation and 9.2 Personalized Practice Paper Generation.
- **Focus**: Coordinating UI and backend features for weakness-focused practice papers.
- **Definition of Done**: Adaptive practice features tested and delivered on schedule.

### Phase 10 — Preview System
- **Deliverables**: Dependency tracking for Impersonation System (10.3) and Entitlement Integration (10.4).
- **Focus**: Ensuring the 10.6 Preview Workflow does not introduce security risks.
- **Definition of Done**: Preview functionality completed with thorough QA sign-off.

### Phase 11 — AI Question System
- **Deliverables**: AI Gateway Architecture (11.1) integration schedule, Python FastAPI team resource alignment.
- **Focus**: Tracking the 11.4 AI Question Generation Worker, ensuring provider-agnostic principles (11.8 Cloud AI Integration) are maintained.
- **Definition of Done**: AI-generated questions functioning, gateway testing (pytest) complete.

### Phase 12 — AI Interview
- **Deliverables**: Integration schedule for 12.4 Speech-to-Text (STT) Integration and 12.5 Text-to-Speech (TTS) Integration.
- **Focus**: Managing complexity of 12.3 Controlled Natural Conversation Engine.
- **Definition of Done**: Real-time multi-turn conversation and 12.6 Interview Assessment Engine fully operational.

### Phase 13 — Subscriptions
- **Deliverables**: 13.5 Billing Integration timeline, compliance checklist.
- **Focus**: Managing the critical path for 13.1 Entitlement Engine and 13.3 AI Credit System implementation.
- **Definition of Done**: Payment processing secure and functional across all tiers.

### Phase 14 — Production Hardening
- **Deliverables**: Launch plan, go-no-go checklist, 14.3 Backup & Recovery plan.
- **Focus**: Final load testing, production environment verification (14.9 Deployment Configuration), stakeholder sign-offs.
- **Definition of Done**: Platform successfully launched, post-launch monitoring active.

## 5. Key Guidelines

### 5.1 Technical Standards
- Understand the implications of a Modular Monolith and API-first architecture on delivery timelines.
- Ensure all sprints include allocated capacity for Vitest, Supertest, Playwright, and pytest coverage.
- Track Technical Debt using specific Jira issue types and ensure it doesn't exceed 15% of sprint capacity.

### 5.2 Collaboration Model
- Lead Daily Standups (max 15 mins) focusing on blockers, not just status updates.
- Partner closely with the Product Owner to ensure the backlog is refined 2 sprints ahead.
- Coordinate with Tech Leads to understand how pnpm workspaces affect build and deployment dependencies.

### 5.3 Tools & Processes
- **Project Management**: Jira / Linear (for backlog and sprint tracking)
- **Documentation**: Confluence / Notion (for risk registers, meeting notes)
- **Communication**: Slack / Microsoft Teams
- **Process**: Scrum or Kanban (adapted to team needs), 2-week sprints.

## 6. Do's ✅
1. DO track team velocity continuously to improve sprint forecasting.
2. DO maintain and update a visible burn-down chart for every sprint.
3. DO run structured and blameless retrospectives at the end of every sprint.
4. DO manage and visualize cross-team dependencies (Frontend vs Backend vs AI).
5. DO shield the development team from external stakeholder interruptions.
6. DO ensure every ticket meets the "Definition of Ready" before entering a sprint.
7. DO maintain an active Risk Register and review it weekly.
8. DO celebrate team milestones and phase completions.
9. DO allocate specific capacity for technical debt and infrastructure work.
10. DO communicate project status transparently, highlighting both successes and risks.
11. DO enforce the API-first contract signing before frontend work begins.
12. DO ensure the QA team is involved in sprint planning to estimate testing effort.
13. DO map the 111 features to specific phases and track their progress.
14. DO facilitate architecture alignment meetings when cross-module impacts are identified.
15. DO conduct a formal go/no-go meeting before major phase releases.

## 7. Don'ts ❌
1. DON'T micromanage engineers' daily tasks; trust them to deliver committed work.
2. DON'T skip sprint retrospectives, even if the team is busy.
3. DON'T commit to delivery dates or scope changes without consulting the engineering team.
4. DON'T allow scope creep into active sprints; force changes to the backlog.
5. DON'T ignore technical debt; it will derail the later phases.
6. DON'T treat the 14 phases as rigid waterfalls; maintain agile flexibility within them.
7. DON'T let daily standups devolve into lengthy problem-solving sessions.
8. DON'T hide project risks from stakeholders hoping they will resolve themselves.
9. DON'T assume API and UI integrations will just work; schedule specific integration time.
10. DON'T overlook the complexity of integrating the Python FastAPI AI server with the TypeScript backend.
11. DON'T push the team to work consistent overtime; monitor burnout.
12. DON'T accept incomplete features to make a phase deadline look good.
13. DON'T bypass the QA process (Vitest/Playwright) to save time.
14. DON'T run meetings without an agenda and clear action items.
15. DON'T ignore the module independence principle when planning cross-functional features.

## 8. Quality Gates
- **Sprint Planning Gate**: All tickets must have estimations and acceptance criteria.
- **Mid-Phase Gate**: Milestone check against the baseline schedule.
- **Release Gate**: All ~1,600 test cases passing, zero critical bugs, stakeholder sign-off.

## 9. Escalation Path
1. **Team Blocker**: Resolve with Tech Lead / Scrum Master immediately.
2. **Cross-Team Dependency**: Escalate to Program Manager within 24 hours.
3. **Scope/Timeline Impact**: Escalate to Product Manager and Project Sponsor within 48 hours.

## 10. KPIs & Success Metrics
- **Sprint Predictability**: Percentage of committed story points delivered.
- **On-Time Delivery**: Variance against the original schedule for the 14 phases.
- **Budget Variance**: Actual spend vs. planned budget.
- **Team Velocity**: Stable or increasing velocity trend over time.
- **Risk Mitigation Success**: Number of identified risks that materialized vs. were mitigated.
