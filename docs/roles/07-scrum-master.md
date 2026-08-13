# Scrum Master — Developer Guidelines & Responsibilities

## 1. Role Overview
Owns sprint ceremonies, impediment removal, team protection, and process enforcement for the Adaptive Examination & AI Learning Platform. Ensures the engineering team can deliver on the 111 features across the 14 development phases without disruption.

## 2. Core Responsibilities
1. Facilitate all sprint ceremonies (planning, standups, reviews, retros).
2. Protect engineering time from ad-hoc requests and scope creep.
3. Remove impediments blocking progress on the modular monolith.
4. Enforce the Definition of Done from phase plans.
5. Track sprint velocity and report on phase progress.
6. Support the completion of the ~1,600 test cases by ensuring QA is unblocked.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Ceremonies & Impediment Removal | OWNS |
| Backlog & Priorities | COLLABORATES |
| Technical Architecture | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **Specific Deliverables:** Initiate sprint planning, daily standups, reviews, retros, velocity tracking.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Ceremonies are established and the first sprint is successfully closed.

### Phase 2 — Academic Structure
- **Specific Deliverables:** Streamline backlog grooming for academic features.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Predictable velocity established.

### Phase 3 — Question Bank Management
- **Specific Deliverables:** Unblock QA and Dev integration issues.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Zero carryover due to blocked dependencies.

### Phase 4 — Exam Creation & Configuration
- **Specific Deliverables:** Facilitate UI vs API integration standups.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Sprints successfully deliver end-to-end configuration features.

### Phase 5 — Exam Delivery Engine
- **Specific Deliverables:** Manage tight dependencies in delivery engine tasks.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Critical path items are prioritized and unblocked daily.

### Phase 6 — Proctoring & Security
- **Specific Deliverables:** Enforce strict DoD for security components.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Security checks do not delay sprint completion.

### Phase 7 — AI Evaluation (FastAPI Gateway)
- **Specific Deliverables:** Bridge the Python and Node.js workstreams.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Coordinated delivery across FastAPI and Express.

### Phase 8 — Grading & Results Processing
- **Specific Deliverables:** Protect team during complex logic implementation.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Accurate burndown charts despite task complexity.

### Phase 9 — Analytics & Reporting
- **Specific Deliverables:** Ensure reporting dependencies are cleared early.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Analytics features meet DoD reliably.

### Phase 10 — Organization Management (B2B)
- **Specific Deliverables:** Manage B2B stakeholder feedback in reviews.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Stakeholder feedback integrated without derailing current sprint.

### Phase 11 — Content Migration & Integrations
- **Specific Deliverables:** Track external integration blockers aggressively.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Third-party blockers are mitigated swiftly.

### Phase 12 — Security, Privacy & Compliance
- **Specific Deliverables:** Incorporate compliance reviews into sprint flow.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Compliance tasks completed on time.

### Phase 13 — Performance, Scale & Caching
- **Specific Deliverables:** Facilitate load testing coordination.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** Performance issues are tracked and resolved within sprints.

### Phase 14 — Final Production Readiness
- **Specific Deliverables:** Final sprint closure and launch readiness checks.
- **Focus:** Protect engineering time, ensure Definition of Done from phase plans is enforced.
- **Definition of Done:** 100% of Definition of Done criteria met for all features.

## 5. Key Guidelines
### 5.1 Technical Standards
Ensure the team adheres to project tech stack requirements by making time for necessary refactoring and CI/CD maintenance in sprints.

### 5.2 Collaboration Model
Work closely with the Product Owner on backlog prioritization and with the Agile Coach on process improvements.

### 5.3 Tools & Processes
Use Jira to track velocity, sprint boards, and blockers. Leverage Turborepo build metrics if they affect developer efficiency.

## 6. Do's ✅
1. Do protect engineering time.
2. Do enforce Definition of Done from phase plans.
3. Do facilitate daily standups.
4. Do remove impediments promptly.
5. Do track sprint velocity.
6. Do ensure sprint backlog is ready.
7. Do collaborate on backlog priorities.
8. Do monitor Vitest/Playwright test execution status.
9. Do shield the team from ad-hoc requests.
10. Do keep Jira/Asana boards updated.
11. Do encourage cross-stack collaboration (Node/Python).
12. Do highlight risks to the 14-phase schedule.
13. Do support the Tech Lead in resolving technical blockers.
14. Do ensure smooth sprint reviews.
15. Do foster a self-organizing team.

## 7. Don'ts ❌
1. Don't act as a project manager.
2. Don't assign tasks to developers.
3. Don't ignore technical blockers.
4. Don't let standups exceed 15 minutes.
5. Don't compromise on quality gates.
6. Don't allow undocumented API changes.
7. Don't ignore failing CI pipelines (Turborepo).
8. Don't let scope creep into active sprints.
9. Don't bypass the Agile Coach.
10. Don't forget to track the 111 features progress.
11. Don't excuse missing unit tests (Vitest/pytest).
12. Don't cancel sprint retrospectives.
13. Don't dictate technical solutions.
14. Don't ignore team burnout.
15. Don't tolerate incomplete Definition of Done.

## 8. Quality Gates
Every sprint must close with fully completed, reviewed, and tested tickets. Definition of Done must be explicitly checked for every story.

## 9. Escalation Path
Escalate unresolved impediments to the Engineering Manager. Escalate process resistance to the Agile Coach.

## 10. KPIs & Success Metrics
High sprint completion rates, consistent velocity, low carryover, and rapid blocker resolution time.
