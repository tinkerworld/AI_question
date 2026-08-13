# Estimation & Timeline Planning

This document provides high-level effort estimations and timeline planning for the 14 phases of the Adaptive Examination & AI Learning Platform.

> [!NOTE]
> **Execution Model Context**: The estimates below provide a traditional human engineering team baseline (5 experienced engineers: 2 Frontend, 2 Backend, 1 QA/DevOps). In an autonomous agentic build model (e.g. Antigravity AgentOS with human oversight), execution velocity is accelerated significantly, while preserving the exact phase sequence, architectural boundaries, and verification criteria detailed herein.

## 1. Per-Phase Effort Estimates (5-person team)

| Phase | Description | Estimated Effort |
| :--- | :--- | :--- |
| **Phase 1** | Foundation & Auth (Monorepo, DB, JWT, RBAC) | 4 - 6 weeks |
| **Phase 2** | Academic Structure (Courses, Syllabus trees) | 2 - 3 weeks |
| **Phase 3** | Question Bank (CRUD, versions, bulk import) | 3 - 4 weeks |
| **Phase 4** | Exam Pattern (Rules, marking schemes) | 3 - 4 weeks |
| **Phase 5** | Exam Generator (Template execution, paper creation) | 2 - 3 weeks |
| **Phase 6** | Exam System (Delivery, timer, auto-save, submission) | 4 - 5 weeks |
| **Phase 7** | Exam Archive & Results (Grading, scorecards) | 2 - 3 weeks |
| **Phase 8** | Student Analytics (Proficiency, skill maps) | 3 - 4 weeks |
| **Phase 9** | Personalized Practice (Adaptive engine) | 2 - 3 weeks |
| **Phase 10** | Preview System (Impersonation, sandbox) | 2 - 3 weeks |
| **Phase 11** | AI Question System (Gateway, generation workflow) | 3 - 4 weeks |
| **Phase 12** | AI Interview (Audio processing, conversational AI) | 4 - 6 weeks |
| **Phase 13** | Subscriptions (Payments, quotas, tiers) | 3 - 4 weeks |
| **Phase 14** | Production Hardening (Load testing, security, DR) | 3 - 4 weeks |
| | **Total Estimated Duration** | **~40 - 56 weeks** (~10-14 months) |

## 2. Critical Path & Parallelization

*   **Linear Dependencies**: Phases 1 through 7 must be executed mostly sequentially, as they form the core critical path (Auth -> Structure -> Questions -> Patterns -> Papers -> Execution -> Results).
*   **Parallel Opportunities**:
    *   Once Phase 7 is complete, Phase 8 (Analytics), Phase 9 (Practice), and Phase 10 (Preview) can be tackled in parallel if resources permit.
    *   The AI Gateway infrastructure (backend part of Phase 11) can be developed independently alongside Phase 5 or 6.
    *   Phase 13 (Subscriptions) can be developed independently of the core exam engine, mocking the quota enforcement points until integration.

## 3. Team Size Scaling

*   **3 People (1FE, 1BE, 1FS)**: Timeline extends by roughly 60-80%. High risk of bottlenecks if one person is blocked.
*   **5 People (Current Baseline)**: Optimal for minimizing communication overhead while maintaining velocity.
*   **8-10 People**: Timeline shrinks, but not linearly (Brooks's Law). Enables parallel execution of later phases (e.g., dedicated sub-teams for AI features vs. Core Exam features). Requires strict API contracts and robust CI/CD.

## 4. Buffer Strategy

*   **Phase Buffer**: A 20% time buffer is built into the estimates above to account for technical debt resolution, minor scope creep, and bug fixing.
*   **Integration Buffer**: A dedicated 1-2 week integration buffer should be scheduled between major milestones (e.g., between Phase 7 and Phase 8) for end-to-end testing and performance tuning.

## 5. Milestone Definitions

A phase is considered "Complete" only when:
1.  All code is merged to the `main` branch.
2.  Unit and Integration tests pass (minimum 80% coverage).
3.  E2E critical paths are automated.
4.  Documentation (API, Architecture) is updated.
5.  Feature passes QA verification in the Staging environment.
