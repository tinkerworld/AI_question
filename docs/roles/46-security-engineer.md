# Security Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Security Engineer owns application security, threat modeling, security reviews, and vulnerability management for the Adaptive Examination & AI Learning Platform. You ensure the integrity of the exam process, secure student data, and protect AI intellectual property across the Node/Express, Next.js, and Python stacks.

## 2. Core Responsibilities
1. Conducting security reviews and threat modeling for new features.
2. Managing JWT security and RBAC enforcement.
3. Preventing OWASP Top 10 vulnerabilities (SQLi, XSS, CSRF, etc.).
4. Designing and enforcing rate limiting and DDoS protections.
5. Ensuring data encryption at rest and in transit.
6. Securing exam paper confidentiality and preventing leaks.
7. Securing the AI Gateway and AI model data.
8. Coordinating penetration testing and security audits.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Application Security (OWASP) | OWNS |
| Auth & RBAC Security | OWNS |
| Exam Integrity Security | OWNS |
| AI Data Security | OWNS |
| Network Security (WAF) | COLLABORATES |
| Code Implementation | CONSULTS |
| Server Provisioning | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Perform auth security review and OWASP Top 10 checks on the baseline API (features 1.6 Authentication System, 1.7 User Management).
- Review RBAC and Audit Logging implementation for security gaps.
- Definition of done: Foundation passes static application security testing (SAST) and manual auth review.

### Phase 2 — Academic Structure
- Review Prisma schema and API for proper data isolation in Course and Syllabus management (features 2.1-2.6).
- Definition of done: No direct object reference (IDOR) vulnerabilities found.

### Phase 3 — Question Bank
- Ensure HTML sanitization for rich text question inputs to prevent XSS.
- Definition of done: XSS payload testing passes for question creation.

### Phase 4 — Exam Pattern
- Review the Exam Pattern Validation Engine for potential logic flaws or DOS vectors.
- Definition of done: Validation logic is secure against malicious inputs.

### Phase 5 — Exam Generator
- Secure the Exam Generation Engine against Denial of Service (rate limiting).
- Definition of done: Generator API handles malicious load gracefully.

### Phase 6 — Exam System
- Guarantee exam integrity; implement anti-cheat data protections for Student Exam Access and Answer Submission (features 6.1, 6.3).
- Definition of done: Exam payload encrypted; no premature data leaks.

### Phase 7 — Exam Archive
- Review the publish workflow and snapshot mechanism for data integrity.
- Definition of done: Historical Exam Integrity (7.5) ensures published exams cannot be tampered with.

### Phase 8 — Student Analytics
- Review PII data access in the Mastery Engine and Analytics Dashboards.
- Definition of done: PII is anonymized or strictly access-controlled via RBAC.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed. Ensure weakness pool generation logic does not expose sensitive data.

### Phase 10 — Preview System
- Review the Impersonation System (10.3) and Preview Audit Trail to ensure preview users cannot escalate privileges or affect real data.
- Definition of done: Preview persona is strictly isolated.

### Phase 11 — AI Question System
- Secure the Python FastAPI AI Gateway endpoints against prompt injection, model theft, and unauthenticated access.
- Definition of done: AI Gateway sanitizes inputs and validates requests from internal clients.

### Phase 12 — AI Interview
- Review Text-to-Speech, Speech-to-Text, and interview session management for privacy and data retention compliance.
- Definition of done: Audio/transcript data is handled securely and ephemeral where required.

### Phase 13 — Subscriptions
- Review billing integration (Stripe/Razorpay) and Entitlement Engine logic for secure webhook handling and credit limits.
- Definition of done: Payment workflows and credit systems resist manipulation.

### Phase 14 — Production Hardening
- Lead the Security Hardening (feature 14.1), OWASP Top 10 audit, and penetration testing. Review Abuse Protection (14.7) and Data Privacy (14.8).
- Definition of done: Zero critical or high vulnerabilities in final audit report; full GDPR/privacy compliance.

## 5. Key Guidelines
### 5.1 Technical Standards
- OWASP Top 10 compliance.
- JWT best practices (short expiry, HttpOnly cookies for web, secure signing).
- Principle of Least Privilege.
### 5.2 Collaboration Model
- Consult with developers on secure coding practices.
- Work with Infrastructure Engineer on WAF configuration.
### 5.3 Tools & Processes
- SonarQube, Snyk for SAST/SCA.
- OWASP ZAP or Burp Suite for DAST.

## 6. Do's ✅
1. Do enforce parameterized queries (handled natively by Prisma).
2. Do use HttpOnly, Secure cookies for storing JWTs in the browser.
3. Do validate and sanitize all user inputs.
4. Do enforce strict CORS policies on the API.
5. Do implement rate limiting on all authentication and AI endpoints.
6. Do use short-lived access tokens and longer-lived refresh tokens.
7. Do encrypt sensitive data (PII, exam papers) at rest.
8. Do enforce HTTPS/TLS 1.2+ for all communications.
9. Do conduct threat modeling before major architectural changes.
10. Do use a Content Security Policy (CSP) on the Next.js frontend.
11. Do implement CSRF protection where applicable.
12. Do scan dependencies for known vulnerabilities in CI/CD.
13. Do audit log all critical actions (login, grading, exam start).
14. Do ensure AI Gateway validates requests from the Express API.
15. Do regularly rotate cryptographic keys and secrets.

## 7. Don'ts ❌
1. Don't store plain text passwords (use bcrypt/Argon2).
2. Don't expose sensitive error messages to the client.
3. Don't trust client-side validation; always validate on the server.
4. Don't allow insecure direct object references (IDOR); verify ownership.
5. Don't use weak JWT signing algorithms (e.g., none or symmetric keys for external sharing).
6. Don't store secrets or API keys in the source code.
7. Don't allow cross-site scripting (XSS) in rich text editors.
8. Don't run services as root user in Docker containers.
9. Don't expose the AI server directly to the public internet (use the API as a gateway).
10. Don't bypass security checks for "admin" users; apply RBAC consistently.
11. Don't log sensitive data like passwords or full tokens.
12. Don't ignore dependency vulnerability alerts.
13. Don't allow unrestricted file uploads (check extensions and MIME types).
14. Don't use MD5 or SHA1 for hashing; use SHA-256 or better.
15. Don't assume the internal network is safe; implement Zero Trust.

## 8. Quality Gates
- All PRs must pass automated SAST and dependency scanning.
- Major features require a security review sign-off.
- Zero critical or high vulnerabilities in production.

## 9. Escalation Path
- Escalate active security breaches immediately to the entire engineering leadership.
- Escalate unpatched vulnerabilities to the responsible module lead.

## 10. KPIs & Success Metrics
- 0 data breaches or exam leaks.
- 100% compliance with OWASP Top 10 standards.
- Time to remediate critical vulnerabilities < 24 hours.
