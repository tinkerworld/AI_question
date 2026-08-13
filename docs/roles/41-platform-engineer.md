<Platform Engineer — Developer Guidelines & Responsibilities>
## 1. Role Overview
The Platform Engineer on the Adaptive Examination & AI Learning Platform is the champion of developer experience (DX) and shared architecture. In this complex pnpm + Turborepo monorepo, you own the internal platform tooling, shared packages (e.g., `@repo/database`, `@repo/types`, `@repo/validation`, `@repo/permissions`, `@repo/ai-client`), and the local development environment. Your mission is to make feature developers highly productive by providing robust, well-documented, and easy-to-use foundational libraries and tools.

## 2. Core Responsibilities
1. Manage the pnpm + Turborepo monorepo architecture, configuration, and dependency management.
2. Develop and maintain shared internal packages (`@repo/database`, `@repo/types`, `@repo/logger`, etc.).
3. Own the Prisma database schema management, generation, and migration tooling.
4. Build robust, type-safe validation libraries (Zod) shared across frontend and backend.
5. Create and maintain the internal AI Client library (`@repo/ai-client`) interfacing with the AI Gateway.
6. Ensure a frictionless, one-command local development environment setup (`pnpm dev`).
7. Enforce code quality standards via ESLint, Prettier, TypeScript configuration, and Git hooks (Husky).
8. Maintain the internal Developer Portal or documentation for shared packages.
9. Troubleshoot and resolve monorepo dependency conflicts and build issues.
10. Act as the technical bridge between feature developers and DevOps/SRE.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Monorepo Tooling & Config | OWNS |
| Shared Packages (`@repo/*`) | OWNS |
| Local Dev Environment | OWNS |
| Database Schema Management | OWNS |
| Feature Implementation | CONSULTS (advises on architecture) |
| CI/CD Pipelines | COLLABORATES (with DevOps) |
| Test Infrastructure | COLLABORATES (with SDET) |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Bootstrap 1.1 Monorepo Setup & Infrastructure with pnpm workspaces, Turborepo, and Docker Compose for PostgreSQL 16 + Redis 7.
- Set up 1.2 Database Package (`@repo/database`), 1.3 Shared Types Package (`@repo/types`), 1.4 Validation Package (`@repo/validation`), and 1.5 Permissions Package (`@repo/permissions`).
- Ensure `pnpm install && pnpm dev` reliably starts the entire local stack for all developers.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Support backend developers on 2.1 Course Management and 2.3 Syllabus Tree by ensuring `@repo/database` and `@repo/validation` packages support hierarchical data and nested relationships.

### Phase 3 — Question Bank
- Optimize Prisma configurations in `@repo/database` for handling complex JSON structures in 3.1 Pluggable Question Type System and rich text/markdown for 3.2 Question CRUD.

### Phase 4 — Exam Pattern
- Refine shared type definitions (`@repo/types`) and validation schemas (`@repo/validation`) to support complex nested data for 4.1 Exam Pattern CRUD and 4.8 Exam Pattern Validation Engine.

### Phase 5 — Exam Generator
- No primary deliverables. Support other teams as needed.

### Phase 6 — Exam System
- Provide shared WebSocket/WebRTC utilities or robust API error handling patterns in `@repo/types` for 6.2 Exam Attempt Session.

### Phase 7 — Exam Archive
- No primary deliverables. Support other teams as needed.

### Phase 8 — Student Analytics
- Support the 8.1 Mastery Engine (`@repo/mastery-engine`) by ensuring shared math/statistics utilities and complex aggregation types are available in the monorepo packages.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed.

### Phase 10 — Preview System
- Consult on the implementation of 10.3 Impersonation System, ensuring auth context with impersonation fields are supported in `@repo/types` and `@repo/permissions`.

### Phase 11 — AI Question System
- Develop 11.2 AI Client Package (`@repo/ai-client`), a strongly typed TypeScript SDK wrapper to communicate securely with the Python 11.1 AI Gateway.

### Phase 12 — AI Interview
- Provide shared utilities for audio blob handling and robust streaming types for 12.4 Speech-to-Text (STT) and 12.5 Text-to-Speech (TTS) Integration.

### Phase 13 — Subscriptions
- Support the setup of 13.1 Entitlement Engine (`@repo/entitlement-engine`), ensuring it aligns with monorepo standards.

### Phase 14 — Production Hardening
- Prune unused dependencies and optimize the monorepo for long-term maintenance.
- Finalize internal Developer Portal/documentation for shared packages as part of 14.10 Documentation.
- Support 14.5 Performance Optimization by auditing and optimizing shared packages.

## 5. Key Guidelines
### 5.1 Technical Standards
- Strict TypeScript configuration across the monorepo (`strict: true`).
- All shared packages must export proper TypeScript declarations.
- No circular dependencies between monorepo workspace packages.

### 5.2 Collaboration Model
- Act as a consultant for Feature Developers on architectural decisions.
- Work with DevOps to ensure monorepo scripts align with CI/CD requirements.
- Collaborate with the QA Lead and SDET to ensure test tools integrate smoothly into the repo.

### 5.3 Tools & Processes
- **Tools**: pnpm, Turborepo, TypeScript, Prisma, Zod, ESLint, Husky, Changesets.
- **Processes**: Strict review of changes to `@repo/*` packages, weekly DevEx check-ins.

## 6. Do's ✅
1. Keep the local dev environment as close to a "one-click start" (`pnpm dev`) as possible.
2. Abstract complex logic (like RBAC checks) into easy-to-use shared libraries.
3. Enforce strict boundary rules between monorepo packages (e.g., API shouldn't depend on UI).
4. Maintain a single source of truth for types and validation schemas (Zod).
5. Document all shared packages extensively with READMEs and examples.
6. Use Turborepo's `dependsOn` configuration correctly to guarantee task order.
7. Manage database migrations systematically and document the process for developers.
8. Centralize common dependencies (e.g., React, TypeScript) to ensure version consistency.
9. Provide clear, helpful error messages in shared utilities.
10. Use Changesets (or similar) to manage versioning and changelogs for internal packages.
11. Audit dependencies regularly for security updates and bloat.
12. Ensure local Docker environments (for Postgres/Redis) are easy to spin up and tear down.
13. Promote code reuse without creating unnecessary coupling.
14. Optimize TypeScript compilation times in the monorepo.
15. Listen to developer feedback and continuously improve the DX.

## 7. Don'ts ❌
1. Don't allow "phantom dependencies" (using packages not explicitly listed in `package.json`).
2. Don't introduce breaking changes to shared packages without communicating to the team.
3. Don't let the monorepo build scripts become a tangled, undocumented mess.
4. Don't allow circular dependencies between workspaces.
5. Don't ignore TypeScript compilation errors or bypass `strict` mode in shared packages.
6. Don't hardcode environment-specific URLs or secrets in shared code.
7. Don't build internal tools that are harder to use than the problem they solve.
8. Don't skip writing unit tests for foundational `@repo/*` packages.
9. Don't allow individual apps to define their own conflicting Prisma schemas.
10. Don't push un-migrated database schema changes that break the local environments of other devs.
11. Don't let CI/CD complexities leak into the local developer workflow.
12. Don't leave deprecated code or unused packages lingering in the monorepo.
13. Don't create overly complex abstractions that confuse feature developers.
14. Don't ignore the Python FastAPI Gateway; ensure integration points are seamless for TS developers.
15. Don't assume developers will read the code to figure out how a shared library works; write docs.

## 8. Quality Gates
- **Monorepo Health**: Zero circular dependencies, all packages build successfully in isolation.
- **Shared Package Quality**: 100% type coverage, >90% test coverage for `@repo/*` packages.
- **DevEx Score**: `pnpm dev` must start within < 30 seconds from a fresh clone.

## 9. Escalation Path
- **Local Dev Environment Broken**: Stop and fix immediately; unblock the engineering team.
- **Database Schema Conflicts**: Arbitrate between feature teams to resolve conflicts.
- **Monorepo Build Performance Degradation**: Escalate to DevOps to analyze caching failures.

## 10. KPIs & Success Metrics
- **Local Dev Startup Time**: Time to interactive for `pnpm dev` (target < 30s).
- **Code Reuse**: Adoption rate of shared `@repo/*` packages across the API and Next.js apps.
- **Build Success Rate**: Percentage of successful local and CI builds.
- **Developer Satisfaction**: Measured via regular developer experience (DevEx) surveys.
</Platform Engineer — Developer Guidelines & Responsibilities>
