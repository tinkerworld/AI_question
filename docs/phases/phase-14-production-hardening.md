# Phase 14 — Production Hardening
## Overview
This phase prepares the application for safe, performant production release. It focuses on security hardening, comprehensive monitoring, robust auditing, and deployment readiness to ensure high availability and compliance.

## Prerequisites
- Feature completion of core platform and monetization (Phases 1-13).
- Staging environment ready for load testing.

## Features

### Feature 14.1 — Security Hardening

#### Description
Implements critical security measures to prevent common web vulnerabilities (XSS, SQLi, CSRF) and secures authentication flows against brute force.

#### Sub-Features
- Input sanitization (XSS, SQL injection).
- CSRF protection and CSP headers.
- Tiered API rate limiting (auth endpoints strict).
- Password policies and account lockouts.
- JWT blacklisting on logout and secure cookies.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/logout` | Invalidate JWT (blacklisted) | Bearer, Any |

#### Database Changes
- `User` table: Add `failedLoginAttempts`, `lockedUntil`.
- `JwtBlacklist` table: `tokenHash`, `expiresAt`.

#### Frontend Pages/Components
- CSRF token integration in API clients.
- Password complexity visual indicator.

#### Acceptance Criteria
1. Invalid inputs are stripped of malicious scripts or SQL syntax.
2. Accounts lock after 5 failed login attempts for 15 minutes.
3. Logged out JWTs cannot be reused.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F01.U001 | Input Sanitize XSS | Sanitize input string | `<script>alert(1)</script>`| Escaped string | High |
| P14.F01.U002 | Pass Complexity | Check weak password | "pass123" | ValidationError | High |
| P14.F01.U003 | Account Lock | Trigger 5th fail | 5 failed logins | Status: locked | High |
| P14.F01.U004 | JWT Blacklist | Check blacklisted token | token hash in DB | Denied | High |
| P14.F01.U005 | CSRF Validate | Validate missing CSRF | no csrf token | HTTP 403 | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F01.I001 | Rate Limit Auth | Spam login endpoint | 20 reqs / sec | POST /login | HTTP 429 Too Many Requests | High |
| P14.F01.I002 | Logout Flow | Test token invalidation | Login | POST /logout -> GET /profile| HTTP 401 Unauthorized | High |
| P14.F01.I003 | CSP Headers | Check response headers | None | GET / | Includes Content-Security-Policy | Medium |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F01.E001 | Brute Force Lock | Attempt brute force | Try bad password 6 times | UI shows lockout message | High |


### Feature 14.2 — Audit System Enhancement

#### Description
Enhances system traceability by providing comprehensive audit logging for all sensitive modules with automated retention policies and data masking.

#### Sub-Features
- Comprehensive action auditing (CRUD operations).
- User profile activity logging (add, edit, status change, soft-delete, revert).
- Entity Versioning & Rollback audit integration (Git-like version commits, diffs, revert logs).
- Financial & Billing refund audit logging (refund approved, amount, reason, gateway ID, credit clawback).
- Audit log retention policy (e.g., 90 days configurable).
- PII and sensitive data masking in logs.
- Audit log export (CSV/JSON) for compliance.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/audit/logs` | Fetch system audit logs | Bearer, Admin |
| GET | `/api/audit/export` | Export logs as CSV/JSON | Bearer, Admin |

#### Database Changes
- `AuditLog` table: `action`, `userId`, `resource`, `details`, `ipAddress`.

#### Frontend Pages/Components
- Admin Audit Log viewer table.

#### Acceptance Criteria
1. All critical writes (Plan changes, User modifications) create an audit trail.
2. Passwords and keys are never printed in plain text in logs.
3. Logs older than 90 days are pruned automatically.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F02.U001 | PII Masking | Mask password field | {password: 'secret'} | {password: '***'} | High |
| P14.F02.U002 | Log Creation | Create audit entry | action: update_plan | Log object created | High |
| P14.F02.U003 | Retention Pruning| Prune old logs | logs older than 90d | Deleted from DB | High |
| P14.F02.U004 | Export Format | CSV Generation | log array | Valid CSV string | Medium |
| P14.F02.U005 | IP Extraction | Extract IP from req | req.headers | Valid IP address | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F02.I001 | Interceptor Audit | Test write action log | Interceptor config | PATCH /user -> Check DB | AuditLog entry exists | High |
| P14.F02.I002 | Admin Export API | Export audit logs | Seed logs | GET /api/v1/audit/export | CSV file returned | Medium |
| P14.F02.I003 | Masking at Scale | Bulk log creation | Log deep nested PII | Search DB | PII is masked | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F02.E001 | View Audit Logs | Admin views logs | Login admin -> Audit UI | Logs display correctly | Low |


### Feature 14.3 — Backup & Recovery

#### Description
Ensures data durability through automated database and file storage backups, alongside verified point-in-time recovery processes.

#### Sub-Features
- Automated daily DB backups.
- File storage/asset backup sync.
- Point-in-time recovery strategy.
- Automated backup verification scripts.

#### API Endpoints
None (Infrastructure level).

#### Database Changes
None.

#### Frontend Pages/Components
None.

#### Acceptance Criteria
1. Database automatically backs up daily to secure secondary storage.
2. Backup archives can be restored successfully in a local sandbox without corruption.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F03.U001 | Backup Script | Trigger backup script | DB URI | Creates .sql/dump file | High |
| P14.F03.U002 | Verification Script| Test dump integrity | valid dump file | Verification pass | High |
| P14.F03.U003 | Verification Fail| Test corrupt dump | invalid dump file | Verification fail | High |
| P14.F03.U004 | Storage Sync | Sync to remote mock | local files | Remote mock receives files| Medium |
| P14.F03.U005 | Retention Script | Clean old backups | 30 day old backup | File deleted | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F03.I001 | Full Restore Cycle| Test DB restore | Create backup | Drop DB -> Restore | Data matches original | High |
| P14.F03.I002 | Cron Trigger | Test backup cron job | Cron config | Fast-forward time | Backup executed | High |

##### E2E Tests
None.


### Feature 14.4 — Monitoring & Alerting

#### Description
Sets up observability for the platform, including health checks, database monitoring, AI service health, and automated alerting for error thresholds.

#### Sub-Features
- `/health` endpoint for uptime monitoring.
- DB and Redis connection monitoring.
- AI server availability checks.
- Error rate and queue depth alerts (integration with Slack/PagerDuty).

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | Application health check | None |

#### Database Changes
None.

#### Frontend Pages/Components
None.

#### Acceptance Criteria
1. Health endpoint accurately reports overall system status and dependency status.
2. Alerts trigger when error rates exceed defined thresholds (e.g., 5% errors).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F04.U001 | Health Pass | All deps healthy | DB=ok, AI=ok | Status: 200 OK | High |
| P14.F04.U002 | Health DB Fail | DB down | DB=fail, AI=ok | Status: 503 / DB error | High |
| P14.F04.U003 | Health AI Fail | AI down | DB=ok, AI=fail | Status: 503 / AI error | High |
| P14.F04.U004 | Alert Trigger | High error rate mock | errorRate > 5% | Alert event dispatched | High |
| P14.F04.U005 | Queue Depth | Monitor queue size | size = 500 | High queue depth event | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F04.I001 | Health API Route | Call health API | System running | GET /health | JSON with deps status | High |
| P14.F04.I002 | Alert Webhook | Trigger mock alert | Mock threshold | Call webhook mock | Webhook received | Medium |

##### E2E Tests
None.


### Feature 14.5 — Performance Optimization

#### Description
Optimizes the platform for high traffic through DB indexing, Redis caching, frontend bundling, and pagination optimizations.

#### Sub-Features
- Database query analysis and index creation.
- API response caching via Redis for static/heavy endpoints.
- Frontend image/asset and bundle size optimization.
- Cursor/keyset pagination for large datasets.

#### API Endpoints
None specific, applies globally.

#### Database Changes
- Add compound indices to high-traffic querying columns.

#### Frontend Pages/Components
- Optimized lazy-loading routes.

#### Acceptance Criteria
1. 95th percentile API response time is < 200ms.
2. Large dataset queries use efficient pagination and index scans, not sequential scans.
3. Frontend bundle size is minimized.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F05.U001 | Cache Set/Get | Redis basic ops | key: "test" | Value returned | High |
| P14.F05.U002 | Cache Expiry | Redis TTL check | key: "ttl", 1s | null after 1s | High |
| P14.F05.U003 | Bundle Config | Check bundler config | config file | Contains minification on| Low |
| P14.F05.U004 | Query Builder | Cursor pagination | limit: 10, after: X| Uses WHERE id > X | Medium |
| P14.F05.U005 | Cache Invalidate| Invalidate on write | action: write | Cache key deleted | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F05.I001 | Caching Middleware| Test API cache hit | Redis running | GET /api -> GET /api | 2nd req is faster, cache hit | High |
| P14.F05.I002 | Query Index Scan | Explain DB query | DB with 10k rows| EXPLAIN SELECT | Uses Index Scan | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F05.E001 | Load Performance | Simulate traffic | 100 concurrent users | No dropped requests, latency < 500ms| High |


### Feature 14.6 — AI Queue & Rate Management

#### Description
Protects external AI APIs and internal GPU resources by implementing intelligent queuing, request throttling, and circuit breaking.

#### Sub-Features
- Throttling per user and globally.
- Priority queue (Live WebSocket interactions prioritize over offline batch assessments).
- Circuit breaker pattern for external LLM outages.
- Graceful degradation UI when AI is heavily loaded.

#### API Endpoints
None specific.

#### Database Changes
None.

#### Frontend Pages/Components
- AI Degradation/Loading warnings.

#### Acceptance Criteria
1. Live interview STT/LLM requests process before background assessment generation.
2. Circuit breaker opens upon consecutive LLM failures, preventing cascading system failure.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F06.U001 | Queue Priority | Enqueue tasks | 1 Batch, 1 Live | Live processes first | High |
| P14.F06.U002 | Circuit Open | Fail external API 5x | 5 timeout errors | State: OPEN | High |
| P14.F06.U003 | Circuit Half-Open| Wait after open | Timeout passed | State: HALF_OPEN | High |
| P14.F06.U004 | Throttle Reject | Exceed RPM limit | 100 req/min | Queue rejected/delayed | High |
| P14.F06.U005 | Graceful Fallback| Call fallback | AI disabled | Returns fallback text/response | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F06.I001 | Queue Worker | Test worker execution | Redis queue | Enqueue 5 jobs | Worker processes all 5 | High |
| P14.F06.I002 | Circuit Breaker HTTP| Integration breaker | Mock slow LLM | Call LLM wrapper | Breaker trips, fast fails | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F06.E001 | Degradation UI | Breaker is OPEN | Simulate AI outage, start interview | Graceful error: "AI is currently busy" | High |


### Feature 14.7 — Abuse Protection

#### Description
Implements heuristics to detect abuse, rapid-fire usage, and account sharing to protect platform resources.

#### Sub-Features
- Detection of simultaneous active sessions across different IPs.
- Rapid-fire API call detection.
- Automated temporary suspensions.

#### API Endpoints
None.

#### Database Changes
- `User` table: Add `suspensionReason`, `suspendedUntil`.

#### Frontend Pages/Components
- Account Suspended error screen.

#### Acceptance Criteria
1. An account active on multiple wildly different IPs simultaneously is flagged or suspended.
2. Rapid, script-driven interview spam triggers a temporary lockout.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F07.U001 | Concurrent IP | Check session IPs | IP1 + IP2 in 1 min | Flagged | High |
| P14.F07.U002 | Rapid Fire | Trigger rapid fire | 10 interviews in 1m| Suspend User | High |
| P14.F07.U003 | Suspend Logic | Check suspend expiry | suspendedUntil < now| User active | High |
| P14.F07.U004 | Flag Threshold | Edge case concurrent | Same IP, diff session| Allowed | Medium |
| P14.F07.U005 | Notify Admin | Webhook on suspend | user suspended | Webhook fires | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F07.I001 | Abuse Middleware | Hit protected API fast| Bypass rate limit | 50 hits | Middleware detects abuse, HTTP 429/403 | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F07.E001 | Suspension UI | View app as suspended | Login as suspended | Shows "Account Suspended" screen | High |


### Feature 14.8 — Data Privacy & Compliance

#### Description
Ensures compliance with GDPR/CCPA by offering data export, account deletion protocols, and consent management.

#### Sub-Features
- automated data export feature (JSON/CSV).
- Account deletion (soft delete vs hard delete rules).
- Terms and Consent tracking.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/privacy/export` | Request data export | Bearer, Any |
| DELETE | `/api/privacy/account` | Request account deletion | Bearer, Any |

#### Database Changes
- `User` table: Add `consentDate`, `deletedAt`.

#### Frontend Pages/Components
- Privacy Settings page.
- Account Deletion confirmation modal.

#### Acceptance Criteria
1. Users can request a complete JSON dump of their platform data.
2. Deleting an account anonymizes or removes PII while maintaining aggregate analytics.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F08.U001 | Export Compiler | Gather user data | userId | JSON with all profile/usage data | High |
| P14.F08.U002 | Soft Delete | Mark as deleted | userId | deletedAt set, PII scrambled | High |
| P14.F08.U003 | Auth Reject | Login deleted user | valid credentials | Denied | High |
| P14.F08.U004 | Consent Update | Update consent flags | new flags | DB updated | Medium |
| P14.F08.U005 | Analytics Retain | Check usage logs after | deleted userId | Logs remain but anonymous | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F08.I001 | Delete API | Call delete endpoint | Logged in | DELETE /account | HTTP 200, user is soft deleted | High |
| P14.F08.I002 | Export API | Call export endpoint | Logged in | POST /export | Returns downloadable JSON/ZIP | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F08.E001 | Deletion Flow | Delete account in UI | Settings -> Delete -> Confirm | Logged out, unable to log back in | High |


### Feature 14.9 — Deployment Configuration

#### Description
Finalizes production deployment assets including Docker configurations, proxy rules, SSL, and CI/CD pipelines.

#### Sub-Features
- Production Docker Compose files.
- Nginx/Caddy reverse proxy configs.
- SSL/TLS Let's Encrypt integration.
- GitHub Actions CI/CD pipelines (Test, Build, Deploy).

#### API Endpoints
None.

#### Database Changes
None.

#### Frontend Pages/Components
None.

#### Acceptance Criteria
1. App can be deployed cleanly via Docker.
2. CI/CD pipeline correctly runs tests and refuses to deploy on failure.
3. Traffic is forcefully routed over HTTPS.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F09.U001 | Env Validation | Validate missing env | Missing DB_URL | Server crashes on boot | High |
| P14.F09.U002 | Dockerfile Build | Dry run build | Dockerfile | Build success | High |
| P14.F09.U003 | Proxy Config | Check Nginx syntax | nginx.conf | Syntax OK | High |
| P14.F09.U004 | CI Lint | Run linter | Codebase | No errors | Medium |
| P14.F09.U005 | CI Unit Tests | Run CI test script | Tests | Pass | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F09.I001 | Compose Up | Run docker-compose | Docker engine | docker-compose up | Services healthy, ports open | High |

##### E2E Tests
None.


### Feature 14.10 — Documentation

#### Description
Generates developer, admin, and user documentation to ensure maintainability and operational smoothness.

#### Sub-Features
- OpenAPI/Swagger API documentation.
- Deployment and Administration guides.
- Developer Onboarding documentation.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api-docs` | Swagger UI | Admin/Dev |

#### Database Changes
None.

#### Frontend Pages/Components
None.

#### Acceptance Criteria
1. All public and protected endpoints are documented in Swagger.
2. Markdown guides for deployment are complete and accurate.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P14.F10.U001 | Swagger Validate | Validate OpenAPI spec| swagger.json | Valid spec | High |
| P14.F10.U002 | Doc Coverage | Check missing routes | API Routes | All routes in spec | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P14.F10.I001 | Swagger UI Route | Access docs route | Running app | GET /api-docs | Serves Swagger HTML | Low |

##### E2E Tests
None.


## Modularity Checklist
- [x] All business logic in service layer (not controllers)
- [x] No cross-module direct database access
- [x] Shared types used from @repo/types
- [x] Validation schemas in @repo/validation
- [x] Module can be extracted to microservice without code changes in other modules
- [x] All dependencies injected, not imported directly
- [x] Feature flags / config for optional features

## Upgrade Path
Phase 14 represents the final technical stabilization. Future phases can now safely build on top of this highly available, secure, and performant base (e.g., adding advanced analytics, multi-tenant B2B capabilities, or native mobile clients).

## Definition of Done
- No Critical or High vulnerabilities remain in code or dependencies.
- Load tests demonstrate platform stability under target concurrency.
- Backup and restore procedures are tested and documented.
- CI/CD pipelines are fully operational.
- All unit, integration, and E2E tests are passing.


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 27: Audit Logging](../specs/27-audit-logging.md)
- [Spec 28: Notifications & Reports](../specs/28-notifications-reports.md)
- [Spec 29: Entity Versioning & Rollback Engine](../specs/29-entity-versioning-rollback.md)
- [Spec 30: Billing Audit & Refund Engine](../specs/30-billing-refund-system.md)

### Key Team Role Guidelines
- [Security Engineer](../roles/46-security-engineer.md) — Features 14.1, 14.7, 14.8
- [DevOps Engineer](../roles/39-devops-engineer.md) — Features 14.3, 14.9
- [SRE](../roles/40-sre.md) — Features 14.4, 14.5, 14.6
- [Database Administrator](../roles/52-database-administrator.md) — Feature 14.3 Backup & recovery

### Operational Standards & Guides
- [CI/CD Pipeline Spec](../guides/11-cicd-pipeline.md)
- [Monitoring & Alerting Strategy](../guides/10-monitoring-alerting.md)
- [Disaster Recovery & Backup Plan](../guides/15-disaster-recovery.md)