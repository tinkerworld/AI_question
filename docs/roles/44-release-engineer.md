# Release Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Release Engineer owns release management, versioning, changelogs, and rollback procedures for the Adaptive Examination & AI Learning Platform. You ensure smooth, reliable deployments of the Express API, Next.js frontend, and Python AI Server from the monorepo.

## 2. Core Responsibilities
1. Managing Semantic Versioning (SemVer) for all modules.
2. Designing and enforcing database migration rollback plans (Prisma).
3. Managing Feature Flags for dark launching and canary releases.
4. Orchestrating Blue-Green and Canary deployment strategies.
5. Generating and maintaining automated changelogs.
6. Coordinating release schedules across frontend, API, and AI teams.
7. Defining and executing incident rollback procedures.
8. Monitoring release health metrics.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Release Versioning | OWNS |
| Feature Flag Management | OWNS |
| Deployment Strategies | OWNS |
| Rollback Procedures | OWNS |
| CI/CD Pipeline Configuration | COLLABORATES |
| Application Code Writing | OUT OF SCOPE |
| Infrastructure Provisioning | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish Semantic Versioning standards and automate changelog generation for 1.1 Monorepo Setup & Infrastructure.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Define database migration rollback procedures for the `@repo/database` changes required by 2.1 Course Management and 2.3 Syllabus Tree.

### Phase 3 — Question Bank
- Set up feature flags for safely releasing new 3.1 Pluggable Question Type System types.

### Phase 4 — Exam Pattern
- Coordinate the release of the complex 4.8 Exam Pattern Validation Engine, ensuring backend and frontend versions match.

### Phase 5 — Exam Generator
- Implement Blue-Green deployment for the Express API to support zero-downtime releases of the 5.1 Exam Generation Engine.

### Phase 6 — Exam System
- Enforce strict release freezes during active exam periods (6.2 Exam Attempt Session).
- Definition of done: Release freeze policy documented and enforced.

### Phase 7 — Exam Archive
- No primary deliverables. Support other teams as needed.

### Phase 8 — Student Analytics
- Coordinate the release of the 8.1 Mastery Engine without impacting core exam performance.

### Phase 9 — Personalized Practice
- Implement Canary releases for the 9.2 Personalized Practice Paper Generation algorithms.

### Phase 10 — Preview System
- Support the 10.6 Preview Workflow by ensuring preview environments can safely test pre-release configurations.

### Phase 11 — AI Question System
- Implement versioning for AI models deployed via the 11.1 AI Gateway Architecture.
- Ensure synchronized releases between the Express API and the AI Gateway.

### Phase 12 — AI Interview
- Coordinate complex multi-service releases involving 12.3 Controlled Natural Conversation Engine, frontend, and backend.

### Phase 13 — Subscriptions
- Establish emergency hotfix procedures for any critical issues in 13.5 Billing Integration (Pluggable).

### Phase 14 — Production Hardening
- Support 14.9 Deployment Configuration by refining production CI/CD deployment jobs.
- Review release metrics and optimize deployment speed as part of 14.5 Performance Optimization.

## 5. Key Guidelines
### 5.1 Technical Standards
- Semantic Versioning (SemVer) 2.0.0.
- Conventional Commits for automated changelogs.
### 5.2 Collaboration Model
- Work tightly with Build Engineer on CI/CD pipelines.
- Coordinate with QA for release sign-offs.
### 5.3 Tools & Processes
- Release Please / Semantic Release.
- LaunchDarkly / Unleash for Feature Flags.

## 6. Do's ✅
1. Do strictly follow Semantic Versioning (Major.Minor.Patch).
2. Do require Conventional Commits for all PRs.
3. Do automate the generation of release notes.
4. Do use feature flags to decouple deployment from release.
5. Do ensure every database migration has a tested rollback script.
6. Do use Blue-Green or Canary deployments for production.
7. Do maintain a clear release schedule and communicate it.
8. Do perform post-incident reviews for any failed releases.
9. Do version the API endpoints explicitly (e.g., /v1/, /v2/).
10. Do automate the tagging of releases in Git.
11. Do require QA sign-off before a production release.
12. Do monitor error rates immediately after a deployment.
13. Do have a single-click rollback mechanism.
14. Do clean up old feature flags once fully rolled out.
15. Do ensure the AI server and Express API versions are compatible.

## 7. Don'ts ❌
1. Don't deploy manually from local machines.
2. Don't bypass the CI/CD pipeline for releases.
3. Don't release on Fridays unless it's an emergency hotfix.
4. Don't make breaking API changes without bumping the major version.
5. Don't merge database migrations without a rollback plan.
6. Don't reuse version numbers.
7. Don't deploy to production without notifying the team.
8. Don't leave feature flags permanently in the codebase.
9. Don't skip QA testing for "small" changes.
10. Don't deploy AI model updates without performance validation.
11. Don't use the same deployment strategy for dev and prod (use simpler ones for dev).
12. Don't ignore failing post-deployment health checks.
13. Don't allow developers to push directly to the main branch.
14. Don't release during active exam periods.
15. Don't forget to update the changelog for hotfixes.

## 8. Quality Gates
- All PRs must adhere to Conventional Commits.
- Release requires passing CI, QA sign-off, and zero critical vulnerabilities.
- Rollback plan must be documented in the PR.

## 9. Escalation Path
- Escalate failed deployments to the incident response channel immediately.
- Escalate feature flag technical debt to Engineering Managers.

## 10. KPIs & Success Metrics
- 0 failed production deployments requiring manual intervention.
- < 5 minutes to rollback a faulty deployment.
- 100% of releases have automated changelogs.
