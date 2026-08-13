# Application Security Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Application Security Engineer is responsible for ensuring the secure design, development, and deployment of the Adaptive Examination & AI Learning Platform. You fit into the team by working closely with Full-Stack and Backend Engineers to embed secure coding practices, conduct code security reviews, and manage dependency scanning across the Express + TypeScript API and Next.js frontend.

## 2. Core Responsibilities
1. Define and enforce secure coding practices across the monorepo.
2. Conduct regular security reviews of critical codebase components (e.g., auth flows, AI Gateway).
3. Implement and monitor SAST/DAST tools within the development lifecycle.
4. Manage dependency vulnerability scanning (`npm audit`, Snyk, etc.).
5. Test and validate authentication and authorization flows (RBAC).
6. Perform permission bypass testing on API endpoints.
7. Ensure proper encryption and handling of sensitive exam data.
8. Remediate identified application vulnerabilities.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Secure Coding Practices | OWNS |
| SAST/DAST Implementation | OWNS |
| Dependency Scanning | OWNS |
| Auth Flow Security Testing | OWNS |
| CI/CD Pipeline Security | COLLABORATES |
| Threat Modeling | COLLABORATES |
| Infrastructure Security | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish SAST tooling for the Express API and Next.js frontend. Define secure coding guidelines for Authentication (1.6) and RBAC (1.8).
- Definition of done: Baseline security scans pass with no critical vulnerabilities.

### Phase 2 — Academic Structure
- Review API endpoints for Syllabus Tree and Course Management (features 2.1-2.6). Ensure proper input validation.
- Definition of done: No injection vulnerabilities in academic structure endpoints.

### Phase 3 — Question Bank
- Review security around question creation, especially rich text and Markdown (feature 3.2).
- Definition of done: Question bank APIs resist basic XSS and injection attacks.

### Phase 4 — Exam Pattern
- Audit the exam blueprint and pattern generation logic. Ensure distribution rules cannot be manipulated via API.
- Definition of done: Exam pattern logic is free of business logic flaws.

### Phase 5 — Exam Generator
- Review the auto-generate endpoint and Draft Exam Inspection (5.2) for privilege escalation or IDOR.
- Definition of done: Users can only generate and inspect exams they are authorized for.

### Phase 6 — Exam System
- Perform deep security review of the exam delivery engine and Answer Submission (feature 6.3). Test for cheating vectors and state manipulation.
- Definition of done: Exam delivery mechanism prevents unauthorized state changes.

### Phase 7 — Exam Archive
- Audit the Exam Publication Workflow (7.1) and Answer Key Preservation (7.3).
- Definition of done: Published snapshots and answer keys are immutable and tamper-proof.

### Phase 8 — Student Analytics
- Audit analytics data pipelines (Mastery Engine) for PII exposure and proper RBAC enforcement on teacher views.
- Definition of done: Analytics views strictly adhere to RBAC policies.

### Phase 9 — Personalized Practice
- Review the Personalized Practice Paper Generation (9.2) logic.
- Definition of done: Practice APIs are secure and rate-limited.

### Phase 10 — Preview System
- Audit the Impersonation System (10.3) to ensure it strictly respects the simulated plan entitlements and cannot leak real student data.
- Definition of done: Impersonation boundaries are secure.

### Phase 11 — AI Question System
- Review the AI Client Package and AI Gateway for prompt injection defenses.
- Definition of done: AI interactions and question generation are secured and sanitized.

### Phase 12 — AI Interview
- Audit Speech-to-Text/Text-to-Speech integration and Interview Assessment Engine logic for secure data handling.
- Definition of done: Interview endpoints are secure.

### Phase 13 — Subscriptions
- Review integration with payment gateways and AI Credit System logic to prevent credit manipulation.
- Definition of done: Payment and credit flows are secure and audited.

### Phase 14 — Production Hardening
- Execute the Security Hardening feature (14.1). Final security sweep and penetration test remediation.
- Definition of done: All identified high-risk vulnerabilities are patched.

## 5. Key Guidelines
### 5.1 Technical Standards
- All APIs must implement proper input validation using Zod.
- All secrets must be injected via environment variables and never hardcoded.
- Implement rate limiting on all public-facing endpoints.
### 5.2 Collaboration Model
- Work with DevSecOps to integrate security tools into GitHub Actions.
- Consult with Security Architect on major architecture changes.
### 5.3 Tools & Processes
- ZAP or Burp Suite for DAST.
- SonarQube or Semgrep for SAST.
- `npm audit` and Dependabot for dependencies.

## 6. Do's ✅
1. Do review all PRs touching authentication logic.
2. Do automate vulnerability scanning.
3. Do use Zod for strict input validation.
4. Do sanitize all data sent to the AI Gateway.
5. Do enforce principle of least privilege in API design.
6. Do encrypt sensitive exam data at rest.
7. Do use TLS 1.2+ for all data in transit.
8. Do implement robust logging for security events.
9. Do monitor dependency vulnerability alerts daily.
10. Do validate all file uploads strictly.
11. Do implement CSRF protection where applicable.
12. Do secure cookies with HttpOnly, Secure, and SameSite flags.
13. Do use parameterized queries (via Prisma) to prevent SQLi.
14. Do implement rate limiting on sensitive endpoints.
15. Do conduct regular threat modeling on new features.

## 7. Don'ts ❌
1. Don't rely on client-side validation for security.
2. Don't hardcode secrets, API keys, or passwords.
3. Don't use deprecated cryptographic algorithms.
4. Don't expose internal stack traces in API responses.
5. Don't ignore dependency vulnerability alerts.
6. Don't allow arbitrary file uploads.
7. Don't trust input from the AI Gateway implicitly.
8. Don't implement custom cryptography.
9. Don't store passwords in plain text (use bcrypt/argon2).
10. Don't bypass security checks for "testing".
11. Don't commit sensitive data to the repository.
12. Don't use weak session identifiers.
13. Don't skip security reviews for urgent features.
14. Don't grant excessive permissions to database users.
15. Don't assume the network is secure.

## 8. Quality Gates
- 0 Critical or High vulnerabilities in SAST/DAST scans.
- Security review completed for all auth-related PRs.
- No exposed secrets in code repository.

## 9. Escalation Path
- Escalate critical vulnerabilities directly to the Security Architect and Tech Lead.
- Escalate unpatched high-severity dependency issues to the Engineering Manager.

## 10. KPIs & Success Metrics
- Mean Time to Remediate (MTTR) for critical/high vulnerabilities.
- Number of security defects found in production.
- Percentage of codebase covered by SAST tools.
