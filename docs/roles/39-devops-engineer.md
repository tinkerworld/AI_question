# DevOps Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The DevOps Engineer for the Adaptive Examination & AI Learning Platform owns the CI/CD pipelines, deployment automation, Infrastructure as Code (IaC), and platform monitoring. You ensure that the code from the pnpm + Turborepo monorepo flows seamlessly, securely, and rapidly from a developer's laptop to production. You are responsible for Docker multi-stage builds for the Express backend, Next.js frontend, and Python FastAPI AI Gateway, automating database migrations, and architecting zero-downtime deployment strategies.

## 2. Core Responsibilities
1. Design and maintain CI/CD pipelines (e.g., GitHub Actions) for the monorepo.
2. Implement and optimize Turborepo caching to minimize CI build and test times.
3. Create and maintain optimized Docker multi-stage builds for all deployable services.
4. Automate PostgreSQL database migrations securely in the deployment pipeline.
5. Develop Infrastructure as Code (IaC) using Terraform or Pulumi.
6. Manage environment provisioning across development, staging, and production.
7. Implement zero-downtime deployment strategies (e.g., Blue/Green or Canary).
8. Configure robust monitoring, logging, and alerting infrastructure.
9. Manage secrets, environment variables, and secure access to infrastructure.
10. Ensure the infrastructure scales to handle high-concurrency exam loads.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| CI/CD Pipelines (GitHub Actions) | OWNS |
| Docker Builds & Containerization | OWNS |
| Infrastructure as Code (IaC) | OWNS |
| Deployment Automation | OWNS |
| System Monitoring & Logging | OWNS |
| Application Code & Logic | OUT OF SCOPE |
| Local Dev Environment Tooling | COLLABORATES (with Platform Eng) |
| SLOs & Incident Response | COLLABORATES (with SRE) |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish the baseline GitHub Actions CI pipeline with Turborepo caching for Monorepo Setup & Infrastructure (1.1).
- Create `docker-compose.yml` for local development dependencies (Postgres 16, Redis 7).
- Build initial Dockerfiles for the API Middleware Stack (1.10) and Frontend Foundation (1.11).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Automate Database Package (@repo/database) (1.2) Prisma migrations in the CI/CD pipeline.
- Ensure staging environment database resets and seeding are automated.

### Phase 3 — Question Bank
- Optimize storage solutions (S3/GCS) for Question Bank rich text and media assets (3.2).
- Configure CDN rules for question images to reduce latency.

### Phase 4 — Exam Pattern
- Scale test runners in CI to handle the increasing volume of tests for Exam Pattern Validation Engine (4.8).

### Phase 5 — Exam Generator
- Provision sufficient CPU resources for the Exam Generation Engine (5.1) workloads.

### Phase 6 — Exam System
- Scale infrastructure to handle concurrent user connections for Exam Attempt Session (6.2) and Answer Submission (6.3).
- Implement robust centralized logging for Exam System events.

### Phase 7 — Exam Archive
- Set up long-term durable storage (Glacier/Archive tier) for Published Exam Snapshot (7.2) and Exam File Storage (7.6).

### Phase 8 — Student Analytics
- Configure read-replicas for PostgreSQL to support the Mastery Engine (8.1) and analytical queries.

### Phase 9 — Personalized Practice
- Optimize infrastructure for Weakness Pool Generation (9.1) background tasks.

### Phase 10 — Preview System
- Manage environment configuration to ensure Impersonation System (10.3) does not leak preview data into production stores.

### Phase 11 — AI Question System
- Create optimized Docker builds for the AI Gateway Architecture (11.1) (Python FastAPI).
- Securely manage API keys for Cloud AI Integration (11.8) and provision GPU instances for Local AI Model Support (11.7).
- Provision the AI Worker Queue System (11.6).

### Phase 12 — AI Interview
- Configure high-bandwidth, low-latency networking for Speech-to-Text (12.4) and Text-to-Speech (12.5) processing.
- Deploy WebRTC infrastructure if needed for the Controlled Natural Conversation Engine (12.3).

### Phase 13 — Subscriptions
- Implement secure secret management and PCI-DSS compliance checks for Billing Integration (13.5).

### Phase 14 — Production Hardening
- Execute zero-downtime production deployment and set up Deployment Configuration (14.9).
- Automate Backup & Recovery (14.3) and Disaster Recovery plans.
- Enable DDoS protection and Abuse Protection (14.7) mechanisms.

## 5. Key Guidelines
### 5.1 Technical Standards
- All infrastructure must be defined as code (IaC). No manual console changes.
- CI/CD pipelines must leverage Turborepo's dependency graph to avoid rebuilding unchanged packages.
- Docker images must be multi-stage, rootless, and minimal in size.

### 5.2 Collaboration Model
- Work with Platform Engineers to ensure CI aligns with local developer experience.
- Collaborate with the SRE to ensure monitoring configurations capture critical SLIs.
- Support QA Lead by maintaining stable staging environments.

### 5.3 Tools & Processes
- **Tools**: GitHub Actions, Docker, Turborepo, Terraform/Pulumi, AWS/GCP, Datadog/Prometheus.
- **Processes**: Mandatory IaC code reviews, automated security scanning in CI.

## 6. Do's ✅
1. Leverage Turborepo remote caching to drastically reduce CI times.
2. Use multi-stage Docker builds to keep production image sizes small and secure.
3. Run container workloads as non-root users.
4. Automate Prisma migrations securely, using a structured migration script during deployment.
5. Use immutable tags for Docker images (e.g., git SHA) rather than `latest`.
6. Implement comprehensive dependency caching in GitHub Actions (pnpm store).
7. Ensure staging environments closely mirror production infrastructure.
8. Store all secrets in a secure vault (e.g., AWS Secrets Manager, HashiCorp Vault).
9. Implement pre-commit hooks for IaC formatting and linting.
10. Setup automated vulnerability scanning for Docker images (e.g., Trivy).
11. Design deployments to be easily rolled back in case of failure.
12. Use proper liveness and readiness probes for all containerized services.
13. Centralize application and infrastructure logs for easy debugging.
14. Monitor CI/CD pipeline health and execution time continuously.
15. Document the deployment architecture and emergency rollback procedures clearly.

## 7. Don'ts ❌
1. Don't allow manual changes to production infrastructure (ClickOps).
2. Don't store secrets, passwords, or API keys in plain text in Git.
3. Don't use the `latest` tag for Docker images in production deployments.
4. Don't rebuild shared monorepo packages multiple times in a single CI run.
5. Don't run applications as the `root` user inside Docker containers.
6. Don't deploy database migrations without a tested rollback plan.
7. Don't ignore failing CI pipelines; treat them as top priority.
8. Don't expose database ports directly to the public internet.
9. Don't over-provision infrastructure in development and staging environments.
10. Don't merge PRs that cause CI build times to significantly regress without justification.
11. Don't configure alerting that is too noisy, leading to alert fatigue.
12. Don't skip setting resource requests and limits for container deployments.
13. Don't bake environment variables directly into Docker images at build time; inject them at runtime.
14. Don't use different deployment mechanisms for staging and production.
15. Don't leave unused or orphaned infrastructure running.

## 8. Quality Gates
- **CI Gate**: 100% of CI builds must pass linting, type-checking, and tests.
- **IaC Gate**: Terraform/Pulumi plans must be reviewed and contain no destructive unapproved changes.
- **Deployment Gate**: Zero downtime achieved during rollout, verified by synthetic monitoring.

## 9. Escalation Path
- **Broken CI/CD Pipeline**: Immediate escalation; DevOps drops other work to unblock the team.
- **Infrastructure Provisioning Failures**: Escalate to cloud provider support if necessary, inform SRE.
- **Security Vulnerabilities in Base Images**: Escalate to Security Lead, mandate immediate patch.

## 10. KPIs & Success Metrics
- **CI Pipeline Duration**: P90 execution time < 10 minutes.
- **Deployment Frequency**: Ability to deploy multiple times a day on demand.
- **Change Failure Rate**: < 1% of deployments require a rollback.
- **Infrastructure Cost**: Keeping staging/dev environments within budgeted limits.
