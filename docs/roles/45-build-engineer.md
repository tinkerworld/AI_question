# Build Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Build Engineer owns the build system, monorepo optimization, and artifact management for the Adaptive Examination & AI Learning Platform. You ensure fast, reliable builds for the Next.js frontend, Express/Prisma API, and Python FastAPI server using tools like Turborepo and pnpm.

## 2. Core Responsibilities
1. Optimizing the Turborepo build pipeline.
2. Managing the pnpm workspace configuration.
3. Optimizing Docker image builds (multi-stage, caching).
4. Configuring and optimizing CI cache strategies.
5. Monitoring build times and fixing bottlenecks.
6. Ensuring consistent build environments across local and CI.
7. Managing build artifacts and container registries.
8. Maintaining the monorepo structure.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Turborepo Configuration | OWNS |
| CI Build Pipelines | OWNS |
| Docker Image Builds | OWNS |
| Dependency Management (pnpm) | OWNS |
| Release Versioning | COLLABORATES |
| Infrastructure Provisioning | OUT OF SCOPE |
| Feature Development | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Set up pnpm workspaces and Turborepo for 1.1 Monorepo Setup & Infrastructure.
- Ensure 1.11 Frontend Foundation and Express API build locally and in CI.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Optimize CI caching for Node modules and Prisma client (used heavily in 2.1 Course Management and 2.3 Syllabus Tree).
- Definition of done: CI build time under 5 minutes.

### Phase 3 — Question Bank
- Optimize Next.js build caching for the 3.7 Question Bank Frontend.

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- Set up build monitoring and alerts to track build times of the 5.1 Exam Generation Engine and related packages.

### Phase 6 — Exam System
- Ensure build stability; zero flaky builds for the critical 6.8 Exam-Taking Frontend.

### Phase 7 — Exam Archive
- No primary deliverables. Support other teams as needed.

### Phase 8 — Student Analytics
- Isolate the 8.1 Mastery Engine (`@repo/mastery-engine`) package builds in Turborepo to prevent unnecessary full rebuilds.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Create optimized Dockerfiles for the Python FastAPI 11.1 AI Gateway Architecture (handling CUDA/GPU dependencies via 11.7 Local AI Model Support).
- Optimize Python dependency installation in CI for the AI Gateway.

### Phase 12 — AI Interview
- Ensure builds of the 12.11 Interview Frontend correctly include and optimize any necessary audio processing libraries.

### Phase 13 — Subscriptions
- Isolate the 13.1 Entitlement Engine (`@repo/entitlement-engine`) in Turborepo for fast, independent testing and building.

### Phase 14 — Production Hardening
- Create final, multi-stage, hardened production Docker images for 14.9 Deployment Configuration.
- Implement build-time security scanning (dependency vulnerabilities) for 14.1 Security Hardening.
- Perform full monorepo build audit for 14.5 Performance Optimization.

## 5. Key Guidelines
### 5.1 Technical Standards
- Turborepo remote caching enabled.
- Strict dependency isolation (no phantom dependencies).
### 5.2 Collaboration Model
- Work with Release Engineer to ensure build artifacts are ready for deployment.
- Work with developers to resolve build failures.
### 5.3 Tools & Processes
- pnpm, Turborepo, Docker, GitHub Actions / GitLab CI.

## 6. Do's ✅
1. Do use pnpm strictly for all Node.js package management.
2. Do leverage Turborepo caching heavily in CI.
3. Do use multi-stage Docker builds to reduce image size.
4. Do pin dependency versions or use strict lockfiles.
5. Do run build steps in parallel where possible.
6. Do implement remote caching for Turborepo.
7. Do scan Docker images for vulnerabilities during the build.
8. Do monitor CI build times weekly.
9. Do keep the `pnpm-workspace.yaml` organized.
10. Do ensure local builds match CI builds exactly.
11. Do cache `node_modules` and Prisma engine binaries in CI.
12. Do use lightweight base images (e.g., Alpine or Distroless) for Docker.
13. Do enforce strict boundaries between monorepo packages.
14. Do fail the build on linting or typing errors.
15. Do document the build process for new developers.

## 7. Don'ts ❌
1. Don't use npm or yarn (stick to pnpm).
2. Don't allow phantom dependencies (rely on strict pnpm behavior).
3. Don't run unnecessary build steps on unaffected packages (use Turborepo filters).
4. Don't commit large binary artifacts to the monorepo.
5. Don't ignore slow build alerts.
6. Don't use `latest` tags for Docker base images.
7. Don't mix Python and Node.js dependencies in the same container unless necessary.
8. Don't bypass the CI pipeline for generating artifacts.
9. Don't allow circular dependencies between monorepo packages.
10. Don't leak secrets in Docker images.
11. Don't disable CI caching to "fix" a build issue.
12. Don't run tests in the build step (keep them separate in CI).
13. Don't hardcode environment variables in the build artifacts.
14. Don't ignore warnings during the Next.js build process.
15. Don't leave unused dependencies in the `package.json`.

## 8. Quality Gates
- Build must pass locally and in CI.
- Docker images must pass security scan.
- No circular dependencies in Turborepo graph.

## 9. Escalation Path
- Escalate CI infrastructure outages to the Infrastructure Engineer.
- Escalate persistent build failures to the specific module's Lead Developer.

## 10. KPIs & Success Metrics
- Average PR CI time < 7 minutes.
- 0 instances of deployment failures due to missing/corrupt artifacts.
- 95%+ Turborepo cache hit rate in CI.
