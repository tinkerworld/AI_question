# Site Reliability Engineer (SRE) — Developer Guidelines & Responsibilities

## 1. Role Overview
The Site Reliability Engineer (SRE) for the Adaptive Examination & AI Learning Platform owns system reliability, Service Level Objectives (SLOs), Service Level Indicators (SLIs), incident management, and deep observability. You ensure that the platform remains highly available, especially during critical exam windows where 99.9% uptime is required. You monitor specific platform critical paths like timer accuracy, AI Gateway availability, asynchronous grading queues, and PostgreSQL database connection pool health.

## 2. Core Responsibilities
1. Define, monitor, and enforce SLOs, SLIs, and Error Budgets for all platform services.
2. Architect and maintain the observability stack (metrics, logs, distributed tracing).
3. Own the Incident Management process, including on-call rotations, runbooks, and blameless post-mortems.
4. Monitor and optimize PostgreSQL database performance and connection pooling (PgBouncer/Prisma).
5. Ensure the Python FastAPI AI Gateway maintains high availability and handles provider outages gracefully.
6. Build specific monitoring for critical exam delivery paths (e.g., real-time state sync, timer drift).
7. Conduct capacity planning and coordinate load testing with the SDET.
8. Design chaos engineering experiments to test platform resilience.
9. Automate remediation of common incidents (e.g., restarting stalled worker queues).
10. Ensure data durability, backup verification, and disaster recovery processes.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| System Reliability & SLOs | OWNS |
| Observability & Tracing | OWNS |
| Incident Management | OWNS |
| Database Performance & Tuning | OWNS |
| CI/CD & Deployment | COLLABORATES (with DevOps) |
| Performance Testing | COLLABORATES (with SDET) |
| Feature Code Implementation | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish the baseline observability stack (e.g., Datadog, Prometheus/Grafana, OpenTelemetry).
- Define initial SLIs (latency, error rate, throughput) for the Authentication System (1.6) and User Management (1.7).
- Monitor Audit Logging (1.9) ingestion pipelines to ensure no logs are dropped.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Instrument Prisma queries to monitor Course Management (2.1) and Syllabus Tree (2.3) database performance.

### Phase 3 — Question Bank
- Monitor storage utilization and fetch latency for Question CRUD (3.2) media assets.
- Set up alerts for anomalies in Question Lifecycle (3.5) state transitions.

### Phase 4 — Exam Pattern
- Monitor the Exam Pattern Validation Engine (4.8) execution time and failure rates.

### Phase 5 — Exam Generator
- Monitor CPU/Memory saturation for the Exam Generation Engine (5.1) during high concurrency.

### Phase 6 — Exam System
- Implement critical SLIs for Exam System: Exam Attempt Session (6.2) start latency, Answer Submission (6.3) state sync failure rate, timer drift.
- Ensure zero data loss for exam answers during network partitions.
- Monitor Auto-Evaluation Engine (6.5) queue depth and processing time.

### Phase 7 — Exam Archive
- Monitor snapshot generation times for Exam Publication Workflow (7.1).
- Set up alerts for failures in Answer Key Preservation (7.3).

### Phase 8 — Student Analytics
- Monitor slow queries for Mastery Engine (8.1) calculations.
- Profile complex aggregations for the Syllabus Proficiency Map (8.4) and optimize database indexes.

### Phase 9 — Personalized Practice
- Monitor Weakness Pool Generation (9.1) latency and failure rates.

### Phase 10 — Preview System
- Ensure Preview Audit Trail (10.5) logs are cleanly segregated from production audit logs in the monitoring dashboard.

### Phase 11 — AI Question System
- Implement deep observability for the AI Gateway Architecture (11.1).
- Monitor Cloud AI Integration (11.8) provider latency, token usage, error rates, and fallback success rates.
- Monitor the AI Worker Queue System (11.6) for stalled tasks.

### Phase 12 — AI Interview
- Monitor real-time streaming latency for Speech-to-Text (12.4) and Text-to-Speech (12.5) APIs.
- Monitor Controlled Natural Conversation Engine (12.3) dialogue response times.

### Phase 13 — Subscriptions
- Monitor Entitlement Engine (13.1) check latency, which affects every authenticated route.
- Set up alerts for Billing Integration (13.5) webhook delivery failures.

### Phase 14 — Production Hardening
- Finalize production Monitoring & Alerting (14.4) runbooks and dashboards.
- Execute the first Backup & Recovery (14.3) disaster recovery / failover drill.
- Enforce strict SLO compliance for the production launch.

## 5. Key Guidelines
### 5.1 Technical Standards
- All services must export OpenTelemetry compliant traces, metrics, and logs.
- Dashboards must be built as code and version controlled.
- Alerts must be actionable, symptom-based, and routed to the correct on-call engineer.

### 5.2 Collaboration Model
- Lead blameless post-mortems with Engineering Leads after any incident.
- Partner with DevOps to ensure infrastructure supports reliability goals.
- Advise Feature Developers on building resilient retry mechanisms and circuit breakers.

### 5.3 Tools & Processes
- **Tools**: Datadog/Prometheus, OpenTelemetry, PagerDuty, PgBouncer.
- **Processes**: Error Budget tracking, Weekly Ops Review, Blameless Post-Mortems, On-Call Rotation.

## 6. Do's ✅
1. Define strict SLOs for critical user journeys (e.g., "99.9% of exam submissions succeed within 2s").
2. Implement distributed tracing across Next.js, Express, and Python FastAPI.
3. Monitor database connection pool exhaustion proactively.
4. Ensure actionable alerts with links to runbooks for the on-call engineer.
5. Practice regular disaster recovery and backup restoration drills.
6. Monitor the rate limits and quotas of third-party APIs (LLMs, Email providers).
7. Implement circuit breakers in the AI Gateway to prevent cascading failures.
8. Track timer drift or sync anomalies in the frontend exam delivery UI.
9. Focus on the Four Golden Signals: Latency, Traffic, Errors, and Saturation.
10. Ensure graceful degradation of non-critical features during high load.
11. Write comprehensive, easy-to-follow runbooks for common alerts.
12. Automate the resolution of recurring, well-understood alerts.
13. Ensure log data is structured (JSON) and easily queryable.
14. Track application memory usage to detect memory leaks early.
15. Foster a culture of blamelessness and continuous improvement during incident reviews.

## 7. Don'ts ❌
1. Don't create alerts for things that don't require human intervention (avoid alert fatigue).
2. Don't rely on averages for latency metrics; use percentiles (P95, P99).
3. Don't assume the database will handle unlimited connections; manage pooling carefully.
4. Don't manually SSH into production to fix issues without documenting the process.
5. Don't ignore security patches for the observability stack.
6. Don't allow error budgets to be consistently depleted without halting feature work.
7. Don't deploy observability changes that significantly impact application performance.
8. Don't forget to monitor the background workers processing asynchronous tasks.
9. Don't silo operational knowledge; share runbooks and architecture docs.
10. Don't wait for users to report an outage; observability should catch it first.
11. Don't ignore third-party API failures; they affect overall system reliability.
12. Don't fail to monitor disk space on database servers.
13. Don't run load tests in production without proper isolation and coordination.
14. Don't point blame at individuals during post-mortems; focus on the system.
15. Don't consider a feature complete until it has appropriate monitoring.

## 8. Quality Gates
- **Production Readiness**: Service must have defined SLOs, dashboards, alerts, and runbooks.
- **Incident Resolution**: Post-mortem completed and action items documented within 48 hours of Sev-1/2.
- **Architecture Review**: SRE approval required for changes affecting database schema or scaling strategy.

## 9. Escalation Path
- **Sev-1 Incident (System Down)**: PagerDuty triggers immediate all-hands-on-deck response.
- **Error Budget Depletion**: Escalate to Product and Engineering management to freeze feature work.
- **Database Performance Degradation**: Engage Backend Tech Lead and Platform Engineer.

## 10. KPIs & Success Metrics
- **Platform Availability**: 99.9% uptime during defined exam windows.
- **Mean Time to Detect (MTTD)**: < 5 minutes for critical incidents.
- **Mean Time to Resolve (MTTR)**: < 30 minutes for Sev-1 incidents.
- **Alert Actionability**: > 90% of alerts result in meaningful action (low noise).
