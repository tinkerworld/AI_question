# DevSecOps Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The DevSecOps Engineer integrates security practices seamlessly into the CI/CD pipelines for the Adaptive Examination & AI Learning Platform. You own the automation of security testing, container security, secrets management, and ensure that security checks are a frictionless part of the development lifecycle across the monorepo.

## 2. Core Responsibilities
1. Embed security scanning (SAST/DAST) into GitHub Actions pipelines.
2. Implement and manage Docker image vulnerability scanning.
3. Configure and monitor dependency vulnerability alerts (Dependabot, Snyk).
4. Manage secrets injection and secret scanning in repositories.
5. Ensure compliance of Infrastructure as Code (Terraform) via automated scanning.
6. Maintain the security of the build and deployment environments.
7. Automate security compliance reporting.
8. Provide developers with actionable security feedback in PRs.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| CI/CD Pipeline Security | OWNS |
| Automated Security Testing | OWNS |
| Container Image Scanning | OWNS |
| Secrets Management | OWNS |
| Infrastructure Deployment | COLLABORATES |
| Application Security Testing| CONSULTS |
| Cloud Security Posture | CONSULTS |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Integrate SAST tools and secret scanning into GitHub Actions for the Monorepo Setup (1.1).
- Definition of done: All PRs are automatically scanned for vulnerabilities and secrets.

### Phase 2 — Academic Structure
- Optimize pipeline performance to ensure security checks do not significantly slow down frontend and backend builds.
- Definition of done: Security checks complete within acceptable time limits.

### Phase 3 — Question Bank
- No primary deliverables. Support other teams as needed.

### Phase 4 — Exam Pattern
- Standardize security checks across all monorepo packages.
- Definition of done: Unified security reporting for all packages.

### Phase 5 — Exam Generator
- Ensure infrastructure changes (Terraform/Docker) for the Exam Generation Engine are scanned using tfsec/checkov in CI.
- Definition of done: IaC scanning blocks insecure deployments.

### Phase 6 — Exam System
- Integrate DAST tools into staging deployment pipelines for the Exam-Taking Frontend.
- Definition of done: Staging environment receives automated dynamic scans.

### Phase 7 — Exam Archive
- Implement automated dependency updates (Dependabot/Renovate) for all modules.
- Definition of done: Dependency scanning is configured and active.

### Phase 8 — Student Analytics
- Secure deployment pipelines for analytics workers (Mastery Engine).
- Definition of done: Data processing containers are scanned and hardened.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Implement automated scanning for the Python FastAPI AI Gateway and worker queue Docker images. Monitor AI dependencies.
- Definition of done: Python container images are scanned before pushing to the registry.

### Phase 12 — AI Interview
- Audit secrets management for third-party Speech-to-Text and Text-to-Speech API integrations.
- Definition of done: All external AI keys are securely managed via secret manager.

### Phase 13 — Subscriptions
- Ensure secure injection of payment gateway credentials (Stripe/Razorpay) during deployment.
- Definition of done: No hardcoded payment credentials exist.

### Phase 14 — Production Hardening
- Deploy and configure Production Docker, CI/CD, and secrets management (Feature 14.9). Review and refine all security automation.
- Definition of done: CI/CD security pipeline is fast, accurate, reliable, and production-ready.

## 5. Key Guidelines
### 5.1 Technical Standards
- Security checks must run on every PR and block merges on critical findings.
- Container images must use minimal, distroless base images where possible.
- Secrets must be managed via a centralized vault (e.g., AWS Secrets Manager, HashiCorp Vault).
### 5.2 Collaboration Model
- Work with DevOps to integrate tools into existing GitHub Actions workflows.
- Work with Application Security to tune SAST/DAST rules.
### 5.3 Tools & Processes
- GitHub Actions, Trivy, tfsec, Semgrep, Dependabot/Snyk, Vault.

## 6. Do's ✅
1. Do automate all security scans in the CI/CD pipeline.
2. Do fail the build on critical or high vulnerabilities.
3. Do implement secret scanning on all repositories.
4. Do scan Docker images for OS and application vulnerabilities.
5. Do use minimal base images for containers (e.g., Alpine, Distroless).
6. Do manage secrets using a secure vault system.
7. Do scan Infrastructure as Code (Terraform) before deployment.
8. Do provide clear, actionable remediation advice in CI output.
9. Do monitor pipeline performance and optimize scan times.
10. Do implement software composition analysis (SCA) for dependencies.
11. Do keep security tools updated to the latest versions.
12. Do enforce signed commits and signed container images.
13. Do regularly audit CI/CD access and permissions.
14. Do use immutable infrastructure principles.
15. Do collaborate with developers to reduce false positives in scans.

## 7. Don'ts ❌
1. Don't allow bypassing security checks in the main branch.
2. Don't store secrets in environment variables in the CI configuration files.
3. Don't use `latest` tags for Docker images in production.
4. Don't ignore dependency vulnerability alerts.
5. Don't implement overly restrictive rules that block development without cause.
6. Don't run DAST scans directly against production without coordination.
7. Don't grant broad admin access to the CI/CD platform.
8. Don't rely solely on manual security reviews.
9. Don't expose CI/CD logs publicly if they contain sensitive data.
10. Don't deploy containers running as the root user.
11. Don't skip scanning third-party GitHub Actions.
12. Don't use self-hosted runners without strict security hardening.
13. Don't hardcode API keys in test scripts.
14. Don't let false positives accumulate and cause alert fatigue.
15. Don't forget to secure the container registry itself.

## 8. Quality Gates
- CI pipeline blocks merges with critical/high SAST/SCA findings.
- 0 plaintext secrets detected in the codebase.
- Container images pass Trivy scans before deployment.

## 9. Escalation Path
- Escalate compromised CI/CD credentials or secrets immediately to the Security Architect and Cloud Security Engineer.
- Escalate persistent pipeline blockages to the DevOps Lead.

## 10. KPIs & Success Metrics
- Percentage of builds with automated security scans.
- Number of secrets leaked into version control.
- Time taken for security scans in the CI pipeline.
