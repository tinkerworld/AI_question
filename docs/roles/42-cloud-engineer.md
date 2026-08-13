# Cloud Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Cloud Engineer is responsible for provisioning and managing all cloud resources for the Adaptive Examination & AI Learning Platform. This includes compute, networking, storage, and managed services required by the Express + TypeScript API, Next.js 15 frontend, PostgreSQL + Prisma database, and Python FastAPI AI server.

## 2. Core Responsibilities
1. Provisioning PostgreSQL managed instances and Redis clusters.
2. Managing the container registry for Docker images.
3. Configuring CDN for Next.js 15 static assets.
4. Provisioning and managing AI GPU instances for the FastAPI AI server.
5. Managing object storage for exam files, images, and audio.
6. Ensuring cloud infrastructure is highly available and resilient.
7. Monitoring cloud resource costs and optimizing usage.
8. Implementing IAM policies and access controls for cloud resources.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| PostgreSQL Managed Instance | OWNS |
| Redis Cluster Provisioning | OWNS |
| AI GPU Instances | OWNS |
| Object Storage (S3/GCS) | OWNS |
| Container Registry | OWNS |
| Application Deployment Pipelines | COLLABORATES |
| Infrastructure as Code (Terraform) | COLLABORATES |
| Database Schema Design | OUT OF SCOPE |
| API Development | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Provision 1.1 Monorepo Setup & Infrastructure cloud resources: PostgreSQL 16 managed instances and Redis 7 clusters.
- Establish baseline cloud accounts, VPCs, and IAM policies.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Provision development instances for 2.1 Course Management and 2.3 Syllabus Tree.
- Ensure database instances are accessible to developers.

### Phase 3 — Question Bank
- Set up CDN for static media associated with 3.2 Question CRUD (images, rich text assets).
- Optimize object storage for fast retrieval for the 3.7 Question Bank Frontend.

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- Provision auto-scaling compute resources to handle the 5.1 Exam Generation Engine algorithm load.

### Phase 6 — Exam System
- Ensure high availability for database and compute during live exams for 6.2 Exam Attempt Session and 6.5 Auto-Evaluation Engine.
- Definition of done: Zero downtime during exam simulation.

### Phase 7 — Exam Archive
- Secure object storage buckets for 7.6 Exam File Storage and 7.2 Published Exam Snapshot.
- Configure immutable storage policies for 7.5 Historical Exam Integrity.

### Phase 8 — Student Analytics
- Provision read-replicas for PostgreSQL to handle heavy queries from the 8.1 Mastery Engine and 8.6 Student Analytics Dashboard.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Provision AI GPU instances for the Python FastAPI 11.1 AI Gateway Architecture.
- Ensure secure access for 11.7 Local AI Model Support and 11.8 Cloud AI Integration adapters.

### Phase 12 — AI Interview
- Secure object storage for audio files generated during 12.4 Speech-to-Text (STT) and 12.5 Text-to-Speech (TTS) Integration.

### Phase 13 — Subscriptions
- Ensure cloud infrastructure is available to support the 13.5 Billing Integration webhooks reliably.

### Phase 14 — Production Hardening
- Execute 14.3 Backup & Recovery strategies (point-in-time recovery, disaster recovery plan).
- Support 14.4 Monitoring & Alerting by configuring cloud resource dashboards and alerting rules.
- Support 14.9 Deployment Configuration by finalizing production Docker registry and CI/CD access.

## 5. Key Guidelines
### 5.1 Technical Standards
- Infrastructure as Code (Terraform/Pulumi).
- Cloud Provider best practices (AWS Well-Architected Framework).
### 5.2 Collaboration Model
- Work closely with Infrastructure Engineer on networking.
- Consult with AI Engineer on GPU instance requirements.
### 5.3 Tools & Processes
- Terraform, CloudFormation.
- CloudWatch / Stackdriver for monitoring.

## 6. Do's ✅
1. Do use Infrastructure as Code for all resources.
2. Do tag all resources with project and environment labels.
3. Do implement least privilege IAM policies.
4. Do enable encryption at rest for object storage.
5. Do configure backup and retention policies for PostgreSQL.
6. Do monitor cloud spending weekly.
7. Do set up billing alerts.
8. Do use managed services where possible over self-hosted.
9. Do configure auto-scaling for compute resources.
10. Do use private subnets for databases and internal services.
11. Do review security groups and firewall rules regularly.
12. Do implement cross-region replication for critical data if required.
13. Do test disaster recovery procedures.
14. Do optimize CDN caching rules.
15. Do clean up unused resources promptly.

## 7. Don'ts ❌
1. Don't create resources manually via the cloud console.
2. Don't use overly permissive IAM roles (e.g., AdministratorAccess).
3. Don't expose databases directly to the public internet.
4. Don't hardcode cloud credentials in applications.
5. Don't ignore billing alerts.
6. Don't use unencrypted storage volumes.
7. Don't forget to configure logging for cloud services.
8. Don't deploy to production without a peer review of IaC.
9. Don't use the same cloud account for dev and prod.
10. Don't ignore cloud provider security recommendations.
11. Don't leave unused elastic IPs provisioned.
12. Don't run AI workloads on CPU instances if GPUs are required.
13. Don't store sensitive data in plain text in object storage.
14. Don't manually patch managed services (use maintenance windows).
15. Don't bypass the CI/CD pipeline for infrastructure changes.

## 8. Quality Gates
- All cloud resources must be provisioned via code.
- IAM policies must pass security review.
- Cost estimates must be approved before provisioning.

## 9. Escalation Path
- Escalate cost overruns to the Engineering Manager.
- Escalate critical security misconfigurations to the Security Engineer.

## 10. KPIs & Success Metrics
- 99.99% infrastructure uptime.
- Cloud spend within 10% of budget.
- 0 critical security findings in cloud configuration.
