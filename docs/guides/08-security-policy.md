# Security Policy & OWASP Compliance

This document outlines the security architecture, policies, and mitigations implemented in the Adaptive Examination & AI Learning Platform.

## Data Classification

Data within the system is classified into four tiers, dictating how it is stored, transmitted, and accessed:

1.  **PUBLIC**: Marketing material, public syllabus outlines.
2.  **INTERNAL**: Internal documentation, non-sensitive operational metrics.
3.  **CONFIDENTIAL**: Exam papers (pre-publish), student performance records, mastery data, PII (names, emails).
4.  **RESTRICTED**: Passwords (hashed), JWT tokens, API keys, AI provider credentials, payment/subscription secrets.

## OWASP Top 10 Mitigations

| Vulnerability | Mitigation Strategy in Project |
| :--- | :--- |
| **A01:2021-Broken Access Control** | Enforced RBAC at route and data level. `verifyPermission` middleware on all sensitive endpoints. Preview Mode context isolation. |
| **A02:2021-Cryptographic Failures** | TLS 1.3 enforced. Passwords hashed using bcrypt (12 rounds). Sensitive environment variables encrypted at rest in deployment environments. |
| **A03:2021-Injection** | Use of Prisma ORM prevents SQL injection. Input validation via Zod schemas for all request bodies, queries, and params. |
| **A04:2021-Insecure Design** | API-first architecture, principle of least privilege, separate Main Admin and Sub-Admin roles, threat modeling of AI Gateway. |
| **A05:2021-Security Misconfiguration** | Automated deployment pipelines, disabling debug modes in production, strict Helmet configurations. |
| **A06:2021-Vulnerable and Outdated Components** | Daily `npm audit` checks, integration with Snyk/Dependabot in CI/CD pipeline. |
| **A07:2021-Identification and Authentication Failures** | Strong password policy, JWT access (15min) + refresh (7d) strategy, token revocation list (blacklist) on logout, rate limiting on login routes. |
| **A08:2021-Software and Data Integrity Failures** | Signed commits, CI/CD pipeline verification, JWT signature validation. Immutable snapshots for published exams. |
| **A09:2021-Security Logging and Monitoring Failures** | Centralized logging using Pino. Audit trails for all CRUD operations on critical entities. Alerts on authentication spikes. |
| **A10:2021-Server-Side Request Forgery (SSRF)** | Validation of URLs passed to AI Web Search tools. Restricted outbound network access for application servers. |

## Authentication Security

-   **Passwords**: Hashed with `bcrypt` using 12 rounds.
-   **Tokens**: Custom JWT implementation. Access tokens expire in 15 minutes. Refresh tokens expire in 7 days.
-   **Revocation**: Logout invalidates the refresh token (added to a Redis/DB blacklist).
-   **Concurrent Sessions**: Limits enforced based on user role (e.g., Students limited to 1 active session to prevent sharing).

## Authorization Security

-   **RBAC**: Granular permissions (e.g., `questions.create`, `exams.publish`).
-   **Middleware**: Express middleware checks both valid JWT and required permissions before controller execution.
-   **Preview Isolation**: The Preview Student functionality uses a specific JWT claim (`isPreview: true`). Database queries conditionally write to isolated preview tables or rollback transactions to ensure production data is never mutated by preview actions.

## Input Validation & XSS Prevention

-   **Validation**: Every API endpoint uses Zod schemas to validate inputs. Extraneous fields are stripped.
-   **SQLi**: Handled automatically by Prisma ORM parameterized queries. No raw SQL concatenation.
-   **XSS**: React (Next.js) automatically escapes content. Content Security Policy (CSP) headers restrict script execution sources.

## CORS & Headers Configuration

-   **CORS**: Strictly limited to configured frontend domains (e.g., `https://exam-app.com`, `http://localhost:3000`). Credentials (`Access-Control-Allow-Credentials: true`) only allowed for specified origins.
-   **Helmet**: Configured to set security headers:
    -   `Strict-Transport-Security` (HSTS)
    -   `X-Content-Type-Options: nosniff`
    -   `X-Frame-Options: DENY`
    -   `Content-Security-Policy`

## Rate Limiting

Implemented using Redis-backed rate limiters to prevent DoS and brute-force attacks:
-   **Global API**: 100 requests per minute per IP.
-   **Auth Endpoints (Login/Register)**: 5 requests per minute per IP.
-   **AI Endpoints**: 10 requests per minute per User (cost control).

## Exam Integrity

-   **Leak Prevention**: Pre-published exams are strictly role-gated.
-   **Timer Manipulation**: Exam timers are managed server-side. The client receives timestamps, but submission validates against server time.
-   **Tampering**: Exam snapshots ensure the paper taken matches the paper graded.

## AI Security

-   **Prompt Injection**: System prompts are prioritized and separated from user inputs using provider-specific roles (e.g., System vs. User messages). Output is heavily sanitized.
-   **Cost Attacks**: Strict rate limits on AI Gateway endpoints. Maximum token limits enforced per request.
-   **Sanitization**: AI outputs are validated against expected JSON schemas (Zod) before processing.

## Secrets Management

-   **Never Commit**: `.env` files are in `.gitignore`.
-   **Injection**: Secrets are injected at runtime via deployment environments (e.g., Vercel env vars, Kubernetes Secrets).

## Logging Security

-   **Sanitization**: Passwords, tokens, and PII are redacted from logs before writing.
-   **Integrity**: Audit logs are append-only.
