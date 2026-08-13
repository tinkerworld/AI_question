<Penetration Tester — Developer Guidelines & Responsibilities>
## 1. Role Overview
The Penetration Tester is responsible for actively attempting to exploit the Adaptive Examination & AI Learning Platform. You own vulnerability discovery and exploit validation, specifically targeting auth bypass, RBAC bypass, exam paper leakage, AI prompt injection, and rate limit bypass across the Express API, Next.js frontend, and Python AI Gateway.

## 2. Core Responsibilities
1. Conduct ethical hacking and penetration testing on all platform environments.
2. Test authentication and authorization mechanisms for bypass vulnerabilities.
3. Attempt to exploit business logic flaws (e.g., exam paper leakage, cheating vectors).
4. Perform adversarial testing on the AI Gateway (prompt injection, jailbreaks).
5. Validate the effectiveness of rate limiting and WAF rules.
6. Provide detailed reports with reproducible steps and remediation recommendations.
7. Re-test vulnerabilities after remediation (patch verification).
8. Develop custom exploit scripts to demonstrate impact.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Security Testing (Red Teaming) | OWNS |
| Exploit Validation | OWNS |
| Vulnerability Discovery | OWNS |
| Remediation Verification | OWNS |
| Vulnerability Patching | OUT OF SCOPE |
| Security Architecture Design | CONSULTS |
| CI/CD Security Integration | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Test JWT implementation for signature evasion, algorithmic attacks, and replay.
- Attempt to bypass initial RBAC implementations and permission matrices (Features 1.6, 1.8).
- Definition of done: Auth foundation is resilient to standard bypass techniques.

### Phase 2 — Academic Structure
- Test for Insecure Direct Object References (IDOR) across course and subject data.
- Ensure syllabus tree nodes (Feature 2.3) cannot be manipulated by unauthorized users.
- Definition of done: Cross-tenant data access is proven impossible.

### Phase 3 — Question Bank
- Attempt to extract unauthorized questions from the bank or manipulate question lifecycle status (Feature 3.5).
- Definition of done: Question Bank APIs are secure against data leakage.

### Phase 4 — Exam Pattern
- Attempt to manipulate exam pattern validation engine (Feature 4.8) parameters to force predictable outcomes.
- Definition of done: Exam pattern logic is secure against parameter tampering.

### Phase 5 — Exam Generator
- Attempt to bypass draft exam inspection (Feature 5.2) or leak generated exam metadata before publish.
- Definition of done: Generated exams are confidential until assigned.

### Phase 6 — Exam System
- Attempt to bypass client-side security controls and timer during exam delivery (Feature 6.2).
- Try to intercept and modify exam state or answers in transit (Feature 6.3).
- Definition of done: Exam delivery cannot be compromised via client manipulation.

### Phase 7 — Exam Archive
- Attempt to modify published exam snapshots and answer keys (Features 7.2, 7.3).
- Definition of done: Historical exams maintain strict immutability.

### Phase 8 — Student Analytics
- Test for SQL injection or data leakage in mastery engine (Feature 8.1) analytics queries.
- Definition of done: Analytics endpoints are secure against injection.

### Phase 9 — Personalized Practice
- No primary deliverables. Support other teams as needed.

### Phase 10 — Preview System
- Test impersonation system (Feature 10.3) for privilege escalation and bypass preview audit trail (Feature 10.5).
- Definition of done: Impersonation strictly scopes permissions and cannot be exploited.

### Phase 11 — AI Question System
- Conduct deep adversarial testing against the AI Gateway (prompt injection on generation and modification).
- Attempt to bypass AI usage tracking (Feature 11.5).
- Definition of done: AI Gateway resists common prompt injection and jailbreaks.

### Phase 12 — AI Interview
- Test for injection vectors via Speech-to-Text (Feature 12.4) or manipulation of interview assessment engine (Feature 12.6).
- Definition of done: AI Interview inputs are sanitized and assessments are unmanipulable.

### Phase 13 — Subscriptions
- Test payment flows and billing integration (Feature 13.5) for logic flaws (e.g., price manipulation).
- Attempt to bypass entitlement engine limits (Feature 13.1).
- Definition of done: Payment and entitlement flows are secure against tampering.

### Phase 14 — Production Hardening
- Conduct an OWASP Top 10 audit, full penetration test, and validate CSP, HSTS, and rate limits (Feature 14.1, 14.7).
- Definition of done: Final penetration test report delivered with all critical issues addressed.

## 5. Key Guidelines
### 5.1 Technical Standards
- Follow OWASP Top 10 and ASVS testing methodologies.
- Testing must not disrupt production data (use designated staging environments).
- Clearly document all findings with Proof of Concept (PoC) code/steps.
### 5.2 Collaboration Model
- Work closely with Application Security to hand off findings.
- Validate fixes implemented by Full-Stack and Backend engineers.
### 5.3 Tools & Processes
- Burp Suite Professional, OWASP ZAP.
- Custom Python scripts for AI Gateway testing.
- Postman for API testing.

## 6. Do's ✅
1. Do use a structured methodology (e.g., PTES, OWASP Testing Guide).
2. Do document every step required to reproduce a vulnerability.
3. Do test for business logic flaws, not just technical vulnerabilities.
4. Do focus heavily on IDOR and RBAC bypass testing.
5. Do thoroughly test the AI Gateway for prompt injection and data exfiltration.
6. Do verify that rate limits actually prevent abuse, not just return 429s.
7. Do test for JWT vulnerabilities (e.g., none algorithm, key confusion).
8. Do validate input sanitization on all endpoints.
9. Do test for CSRF and XSS on the Next.js frontend.
10. Do clean up any test data or accounts created during testing.
11. Do communicate critical findings immediately.
12. Do provide clear remediation advice in reports.
13. Do re-test vulnerabilities after they are reported as fixed.
14. Do maintain confidentiality of test findings.
15. Do write custom scripts to test complex, multi-step exploits.

## 7. Don'ts ❌
1. Don't run automated scanners against production without explicit permission.
2. Don't perform Denial of Service (DoS) testing on production systems.
3. Don't view or modify sensitive PII/user data during testing.
4. Don't rely solely on automated scanners; manual testing is required.
5. Don't report theoretical vulnerabilities without a working PoC.
6. Don't share exploit details outside the core engineering team.
7. Don't leave test backdoors or web shells in the environment.
8. Don't ignore the AI components; they are a critical attack surface.
9. Don't skip testing edge cases and negative test scenarios.
10. Don't use disruptive payloads (e.g., DROP TABLE) even in staging.
11. Don't stop at the first vulnerability; chain exploits to demonstrate impact.
12. Don't assume third-party integrations are secure.
13. Don't forget to test WebSocket connections if used.
14. Don't test out of scope domains or IP addresses.
15. Don't delay reporting critical vulnerabilities until the end of the test.

## 8. Quality Gates
- Detailed Penetration Test Report delivered per phase.
- All reported critical/high vulnerabilities include a working PoC.
- Successful verification of all remediated vulnerabilities.

## 9. Escalation Path
- Escalate critical vulnerabilities (e.g., complete auth bypass, RCE, database dump) immediately to the Security Architect and Tech Lead.

## 10. KPIs & Success Metrics
- Number of high/critical vulnerabilities discovered before production deployment.
- Quality and reproducibility of vulnerability reports.
- Effective chaining of vulnerabilities to demonstrate realistic risk.
</Penetration Tester — Developer Guidelines & Responsibilities>
