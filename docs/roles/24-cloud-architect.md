<Cloud Architect — Developer Guidelines & Responsibilities>
## 1. Role Overview
As the Cloud Architect for the Adaptive Examination & AI Learning Platform, you are the master of the infrastructure that runs the Modular Monolith, Next.js frontend, and Python AI Gateway. You are responsible for ensuring the system is highly available, scalable, secure, and cost-effective. You design the path from local Docker development to a robust, cloud-agnostic (AWS/GCP/Azure) production environment, managing container orchestration, auto-scaling, CDN strategies, and GPU allocations for AI workloads.

## 2. Core Responsibilities
1. Design and maintain the end-to-end cloud infrastructure architecture.
2. Develop and maintain local Docker Compose environments for seamless developer onboarding (Phases 1-6).
3. Architect the staging and CI/CD deployment pipelines (Phases 7-10).
4. Design the production environment with auto-scaling, load balancing, and high availability (Phases 11-14).
5. Optimize cloud infrastructure costs, particularly around GPU instances for the Python FastAPI server.
6. Design the CDN strategy for the Next.js 15 frontend and static media (exam images/videos).
7. Architect the managed database infrastructure (PostgreSQL 16) including replication, backups, and failover.
8. Implement Infrastructure as Code (IaC) using Terraform or similar tools.
9. Design cloud security perimeters, WAF rules, and VPC network isolation.
10. Monitor system performance, logging, and tracing infrastructure (OpenTelemetry, ELK/Datadog).

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Cloud Infrastructure Design (AWS/GCP/Azure) | OWNS |
| Container Orchestration (Kubernetes/ECS) | OWNS |
| CI/CD Pipeline Infrastructure | OWNS |
| Cost Optimization & GPU Allocation | OWNS |
| IaC (Infrastructure as Code) | OWNS |
| Enterprise Architecture Strategy | COLLABORATES |
| Data Model Design & Migration | COLLABORATES |
| Application Code Implementation | OUT OF SCOPE |
| Feature Product Management | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Develop docker-compose.yml for Monorepo Setup & Infrastructure (PostgreSQL 16, Redis 7).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Set up CI/CD pipelines for Academic Structure modules.
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- No primary deliverables. Support other teams as needed.
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- No primary deliverables. Support other teams as needed.
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Design auto-scaling and Redis clustering for high-throughput Exam Attempt Sessions.
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Architect object storage (S3/GCS) and CDN strategy for Exam File Storage.
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Configure PostgreSQL read replicas for Student Analytics Dashboard queries.
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed.
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Architect scalable hosting for AI Gateway Architecture and AI Worker Queue System.
- Plan GPU instance provisioning for Local AI Model Support.
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Ensure network configuration supports low-latency Speech-to-Text (STT) and Text-to-Speech (TTS) Integration.
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Configure secure webhook ingress for Billing Integration.
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Execute Production Deployment Configuration, implement Backup & Recovery, Monitoring & Alerting, and WAF for Abuse Protection.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- **Infrastructure as Code:** 100% of staging and production infrastructure must be defined in IaC (Terraform). No manual cloud console clicking.
- **Containerization:** All services must run in immutable Docker containers.
- **Cloud-Agnostic Core:** Avoid proprietary cloud services where open-source equivalents exist (e.g., prefer Redis over DynamoDB) to maintain deployment flexibility.

### 5.2 Collaboration Model
- Work with the Enterprise Architect to map module boundaries to physical network/deployment boundaries.
- Support the Tech Leads and DevSecOps in configuring CI/CD pipelines and Playwright test environments.
- Coordinate with the Data Architect on PostgreSQL backup, migration, and replication strategies.

### 5.3 Tools & Processes
- **IaC Tools:** Terraform (primary), Docker Compose (local).
- **Monitoring:** OpenTelemetry, Prometheus/Grafana, or Datadog.
- **Orchestration:** Kubernetes (EKS/GKE/AKS) or AWS ECS.

## 6. Do's ✅
1. DO write Infrastructure as Code (IaC) for absolutely everything in staging and production.
2. DO optimize the Docker build process in Turborepo to leverage caching and reduce image sizes.
3. DO implement network policies to prevent the Next.js container from directly hitting the database container.
4. DO segregate the Python FastAPI AI gateway onto separate node groups to manage GPU costs effectively.
5. DO enforce strict IAM roles and least-privilege access for all services.
6. DO set up automated database snapshots and test the restoration process regularly.
7. DO utilize CDNs (like Cloudflare) aggressively to cache Next.js 15 static assets and reduce server load.
8. DO configure liveness and readiness probes for every Express and FastAPI service.
9. DO set up budget alerts and cost anomaly detection in the cloud provider console.
10. DO ensure the CI pipeline runs Vitest, Supertest, and Playwright tests in parallel to minimize PR wait times.
11. DO implement auto-scaling based on queue depth for async grading workers, not just CPU usage.
12. DO configure TLS 1.3 across all external and internal network boundaries.
13. DO use multi-stage Docker builds to keep production images free of dev dependencies.
14. DO create a pristine, ephemeral testing environment capability for PR reviews.
15. DO tag all cloud resources systematically (Environment, Service, Team, CostCenter) for billing analysis.

## 7. Don'ts ❌
1. DON'T allow developers to deploy to staging or production via manual CLI commands; enforce CI/CD.
2. DON'T hardcode cloud credentials in any repository; use OIDC or secret managers.
3. DON'T run the production PostgreSQL database inside Kubernetes; use managed services (RDS/Cloud SQL).
4. DON'T allocate GPU instances 24/7 in non-production environments; scale them to zero when idle.
5. DON'T map public IP addresses directly to the Express API or FastAPI servers; always use Load Balancers.
6. DON'T neglect log rotation; ensure Docker daemon and container logs don't fill up the disk.
7. DON'T allow SSH access into production containers; rely on robust telemetry and logging instead.
8. DON'T deploy the Next.js frontend and Express backend in the same Docker container.
9. DON'T ignore local dev experience; a broken `docker-compose` halts all 14 phases of development.
10. DON'T use `:latest` Docker image tags in staging or production; pin to specific Git SHAs or semantic versions.
11. DON'T skip setting resource requests and limits in Kubernetes/ECS for every single container.
12. DON'T tightly couple the infrastructure to one cloud provider's proprietary queue or DB if it violates the agnosticism principle.
13. DON'T forget to configure dead-letter queues (DLQ) for async AI and grading tasks.
14. DON'T allow uncontrolled egress traffic; restrict outbound connections to known external APIs (OpenAI, Stripe).
15. DON'T ignore connection pooling limits on PostgreSQL when scaling up the Express API pods.

## 8. Quality Gates
- **IaC Review:** All infrastructure changes require a PR review on the Terraform repository.
- **Security Audit:** Vulnerability scanning (Trivy/Snyk) must pass on all Docker images before deployment.
- **Load Testing:** Infrastructure must survive simulated load tests using tools like K6 before Phase 14 sign-off.

## 9. Escalation Path
- Escalate to the Enterprise Architect if local Docker limits are preventing accurate emulation of the architecture.
- Escalate to the CTO / Project Manager immediately if cost projections for AI GPUs exceed the budget.

## 10. KPIs & Success Metrics
- **Uptime:** 99.99% availability of the staging and production environments.
- **Deployment Time:** < 10 minutes from PR merge to staging deployment.
- **Cost Efficiency:** AI infrastructure cost remains within the allocated budget through aggressive spot-instance/auto-scaling strategies.
- **Developer Experience:** Local environment startup time < 2 minutes via `docker-compose`.
</Cloud Architect — Developer Guidelines & Responsibilities>
