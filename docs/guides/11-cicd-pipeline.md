# CI/CD Pipeline Specification

This document details the Continuous Integration and Continuous Deployment (CI/CD) pipelines for the Adaptive Examination & AI Learning Platform. We use GitHub Actions for our pipelines, optimizing for monorepo scale using Turborepo.

## 1. Pipeline Architecture

Our monorepo utilizes Turborepo's remote caching and task orchestration to ensure fast, reliable CI/CD runs. 

### Monorepo Optimizations
- **Turborepo Caching**: Remote caching is enabled to reuse artifacts across runs and machines.
- **Affected Packages Only**: Linting, testing, and building are scoped to `turbo run <task> --filter=...[origin/main]` to only process changed packages.
- **Parallel Execution**: Independent tasks (e.g., frontend tests vs backend tests) are run in parallel matrix jobs.

> [!NOTE]
> **Single-Tenant Deployment Target**: For direct single-tenant deployments, the deployment pipeline executes a streamlined `docker-compose.prod.yml` rollout to a dedicated VPS/VM instance. For enterprise container environments, standard Helm chart / ECR deployment triggers remain supported.

## 2. Pipeline Stages

The CI pipeline runs on every push to a PR branch or main/develop branch.

1. **Lint & Format**
   - Runs `eslint` and `prettier` checks.
   - Command: `pnpm turbo run lint format:check`
   - Failure blocks pipeline.

2. **Type Check**
   - Runs TypeScript compiler without emitting files.
   - Command: `pnpm turbo run typecheck` (`tsc --noEmit`)
   - Validates types across `@repo/types`, `@repo/validation`, frontend, and backend packages.

3. **Unit Tests**
   - Backend & Shared Packages: Vitest
   - Frontend: Vitest
   - AI Server: Pytest
   - Command: `pnpm turbo run test`

4. **Integration Tests**
   - API integration tests using Supertest against an ephemeral PostgreSQL 16 test database (via Docker service container in GitHub Actions).
   - Command: `pnpm turbo run test:integration`

5. **Build**
   - Compiles TypeScript for backend API, builds Next.js 15 App Router frontend, prepares Python AI FastAPI server.
   - Command: `pnpm turbo run build`

6. **End-to-End (E2E) Tests**
   - Playwright tests running against the built application.
   - Only runs if unit and integration tests pass.
   - Command: `pnpm turbo run test:e2e`

7. **Security Scan**
   - Runs `npm audit` and OWASP Dependency-Check.
   - Scans Dockerfile base images.
   - Blocks pipeline on critical or high vulnerabilities.

8. **Docker Build & Push**
   - Multi-stage Dockerfiles for API, Frontend, and AI Server.
   - Tags images with Git SHA and environment labels.
   - Pushes to container registry (e.g., AWS ECR or GitHub Container Registry).

9. **Deploy**
   - Environment-specific deployment scripts (Helm charts or Docker Compose).
   - See Environments below.

## 3. Environments & Deployment Triggers

| Environment | Branch Trigger | Deployment Type | Target Audience |
|-------------|----------------|-----------------|-----------------|
| **Development** | Push to `develop` | Auto-deploy | Internal Dev Team |
| **Staging** | Push to `release/*` | Manual Trigger | QA, UAT, Stakeholders |
| **Production** | Push to `main` | Manual with Approval | End Users (All 5 profiles) |

### Quality Gates for Production
To merge into `main` and deploy to Production, the following MUST be met:
- All CI pipeline stages pass successfully.
- Code Coverage > 80% (enforced by Vitest/Istanbul).
- Clean type-check (`tsc --noEmit`).
- No critical/high vulnerabilities from security scans.
- Explicit approval from at least 1 Senior Engineer or Tech Lead.

## 4. Rollback Strategy

We employ a **One-Click Rollback** strategy:
- Deployments reference specific, immutable Docker image tags (Git SHA).
- To rollback, the deployment configuration is updated to point to the previously successful image tag via the CI/CD UI.
- *Note*: Database migrations must be handled carefully. See below.

## 5. Database Migrations

- **Development/Staging**: Migrations (`prisma migrate deploy`) are executed automatically during the deployment pipeline.
- **Production**: Migrations require manual approval. The pipeline pauses, displays the generated SQL, and waits for DBA/Lead approval before applying to the PostgreSQL 16 production instance.
- **Safety**: All Prisma migrations must be **additive only** to prevent data loss or downtime during zero-downtime deployments.

## 6. Secrets Management

- Secrets (API keys, DB credentials, AI Gateway keys for OpenAI, Anthropic, etc.) are NEVER stored in source control.
- Stored securely in GitHub Actions Secrets and environment-specific vaults (e.g., AWS Secrets Manager).
- Injected into Docker containers at runtime via environment variables (`.env`).
