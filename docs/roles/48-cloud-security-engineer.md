# Cloud Security Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Cloud Security Engineer secures the cloud infrastructure supporting the Adaptive Examination & AI Learning Platform. You own the cloud security posture, IAM policies, network security, and ensure compliance across the AWS/GCP environment hosting the monorepo applications, PostgreSQL databases, and Python AI servers.

## 2. Core Responsibilities
1. Design and enforce Identity and Access Management (IAM) policies.
2. Secure network perimeters (VPCs, Security Groups, WAF).
3. Monitor and maintain the overall cloud security posture.
4. Ensure compliance with relevant data protection regulations (e.g., GDPR, FERPA).
5. Implement cloud infrastructure monitoring and alerting (CloudTrail, GuardDuty).
6. Secure container registries and deployment environments.
7. Manage cloud secrets and encryption key management systems (KMS).
8. Conduct regular cloud security assessments.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Cloud IAM Policies | OWNS |
| Network Security (VPC, WAF) | OWNS |
| Cloud Security Posture | OWNS |
| Compliance Auditing | OWNS |
| Application Code Security | OUT OF SCOPE |
| DevSecOps Pipelines | COLLABORATES |
| Database Administration | CONSULTS |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish secure VPC architecture for PostgreSQL 16, Redis 7, and the Monorepo Node services (Feature 1.1). Implement baseline IAM roles.
- Definition of done: Cloud environment is provisioned securely with zero open public access to internal resources.

### Phase 2 — Academic Structure
- No primary deliverables. Support other teams as needed with infrastructure IAM.

### Phase 3 — Question Bank
- Secure cloud storage for image support in Question CRUD (Feature 3.2).
- Definition of done: Storage buckets (or equivalent) are private and encrypted at rest.

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- Monitor compute resource security and scaling IAM roles for the Exam Generation Engine.
- Definition of done: Generator infrastructure is secure.

### Phase 6 — Exam System
- Implement WAF rules to protect the Exam-Taking Frontend and API from DDoS attacks during peak exam loads.
- Definition of done: WAF is active and blocking malicious traffic patterns.

### Phase 7 — Exam Archive
- Securely configure storage for Exam File Storage (Feature 7.6) and ensure Snapshot data cannot be modified at the storage level.
- Definition of done: Immutable storage policies applied to exam archives.

### Phase 8 — Student Analytics
- Secure the data warehouse or analytics storage used by the Mastery Engine.
- Definition of done: Analytics data is encrypted and access controlled via IAM.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Secure the Python FastAPI AI Gateway architecture and Local AI Model infrastructure. Ensure the AI Worker Queue System is securely isolated.
- Definition of done: AI infrastructure has dedicated security monitoring and network isolation.

### Phase 12 — AI Interview
- Ensure secure, compliant, and ephemeral storage for Speech-to-Text (STT) audio streams.
- Definition of done: Media storage complies with data retention and encryption policies.

### Phase 13 — Subscriptions
- Ensure cloud environment meets PCI-DSS requirements for the Billing Integration (Feature 13.5).
- Definition of done: Payment processing network segments are isolated.

### Phase 14 — Production Hardening
- Own the Backup & Recovery strategy (14.3) and Data Privacy & Compliance (14.8). Final cloud security posture review.
- Definition of done: Cloud environment passes third-party security audit and compliance checks.

## 5. Key Guidelines
### 5.1 Technical Standards
- Infrastructure as Code (Terraform) must pass security scans (tfsec) before deployment.
- Enforce MFA for all cloud console access.
- Use customer-managed KMS keys for sensitive data encryption.
### 5.2 Collaboration Model
- Work with DevOps to integrate security into Terraform pipelines.
- Consult with Security Architect on cloud architecture design.
### 5.3 Tools & Processes
- Cloud Security Posture Management (CSPM) tools.
- AWS Security Hub / GCP Security Command Center.
- Terraform/OpenTofu for IaC.

## 6. Do's ✅
1. Do enforce least privilege for all IAM roles.
2. Do use IaC for all cloud resource provisioning.
3. Do enable CloudTrail (or equivalent) across all regions.
4. Do encrypt all EBS volumes, RDS instances, and S3 buckets at rest.
5. Do use VPC Endpoints for private AWS service access.
6. Do implement a Web Application Firewall (WAF).
7. Do review security group rules regularly.
8. Do rotate KMS keys annually.
9. Do monitor root account usage and set alerts.
10. Do implement centralized security logging.
11. Do use hardened container images for deployments.
12. Do tag all cloud resources for security and cost tracking.
13. Do conduct regular incident response drills.
14. Do automate remediation of common misconfigurations.
15. Do stay updated on cloud security advisories.

## 7. Don'ts ❌
1. Don't use long-lived access keys for users; prefer SSO/roles.
2. Don't open port 22 or 3389 to the internet (0.0.0.0/0).
3. Don't make S3 buckets public unless explicitly required and approved.
4. Don't deploy resources outside of defined IaC pipelines.
5. Don't mix production and non-production environments in the same account/VPC.
6. Don't ignore CSPM alerts.
7. Don't commit AWS credentials or GCP service account keys to source control.
8. Don't use default VPCs for production workloads.
9. Don't grant `AdministratorAccess` broadly.
10. Don't disable cloud provider security monitoring tools.
11. Don't leave unused resources running.
12. Don't manually edit cloud configurations in production.
13. Don't bypass change management for security updates.
14. Don't share IAM users between multiple people.
15. Don't forget to secure serverless functions (Lambdas).

## 8. Quality Gates
- 100% of IaC passes security scanning (e.g., tfsec).
- 0 critical or high findings in CSPM tools.
- All cloud resources compliant with internal tagging policies.

## 9. Escalation Path
- Escalate active cloud breaches or misconfigurations immediately to the Security Architect and DevOps Lead.
- Escalate compliance violations to the Security Architect.

## 10. KPIs & Success Metrics
- Cloud Security Posture Score.
- Time to resolve misconfigurations.
- Percentage of infrastructure managed by secure IaC.
