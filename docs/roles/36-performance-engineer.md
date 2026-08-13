# Performance Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Performance Engineer ensures the Adaptive Examination & AI Learning Platform can handle high traffic and operate efficiently. This role owns load testing, performance benchmarking, capacity planning, and ensuring all API and database operations meet strict SLAs, especially under peak exam loads.

## 2. Core Responsibilities
1. Own load testing, stress testing, and performance benchmarking.
2. Certify exam-taking flows under load (e.g., 1000 concurrent students).
3. Validate timer accuracy and state synchronization under stress.
4. Benchmark AI Gateway throughput and latency.
5. Ensure database query performance meets SLAs.
6. Enforce API response time SLAs (<200ms for reads, <500ms for writes).
7. Perform capacity planning for production deployment.

## 3. Work Boundaries

| Area | Ownership Level |
|---|---|
| Load Testing Scripts & Execution | OWNS |
| Performance Benchmarking | OWNS |
| Capacity Planning | OWNS |
| Database Indexing Optimization | COLLABORATES |
| Application Profiling | COLLABORATES |
| Application Feature Coding | OUT OF SCOPE |
| Infrastructure Provisioning | COLLABORATES |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish performance testing tooling (e.g., k6, JMeter, or Gatling).
- Baseline API performance for core auth routes (1.6) and User Management CRUD (1.7).
- Monitor database package (@repo/database) performance and monorepo infrastructure setup (1.1).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Load test read-heavy endpoints for Course Management (2.1) and Subject Management (2.2).
- Test Syllabus Tree (2.3) recursive fetch performance and payload sizes.
- Benchmark bulk Student Course Enrollment (2.6).

### Phase 3 — Question Bank
- Benchmark performance of Question CRUD (3.2) operations, especially with rich text and images.
- Profile Question Versioning (3.3) history lookups and multi-tag filtering queries (3.4).

### Phase 4 — Exam Pattern
- Load test the Exam Pattern Validation Engine (4.8) against large question banks.
- Benchmark complexity of resolving Topic Distribution (4.4) and Difficulty Distribution (4.5) rules.

### Phase 5 — Exam Generator
- **Crucial:** Load test the Exam Generation Engine (5.1) and its question selection algorithm for latency spikes.
- Profile Draft Exam Inspection (5.2) rendering times for large exams.

### Phase 6 — Exam System
- **Crucial:** Load test Exam Attempt Sessions (6.2) and Answer Submission (6.3) APIs with 1000+ concurrent simulated users.
- Verify timer accuracy and state synchronization under heavy load.
- Benchmark the Auto-Evaluation Engine (6.5) throughput.

### Phase 7 — Exam Archive
- Benchmark Published Exam Snapshot (7.2) and Answer Key Preservation (7.3) snapshot generation times.
- Test Exam Archive Search (7.4) efficiency on historical data volumes.

### Phase 8 — Student Analytics
- Benchmark the Mastery Engine (@repo/mastery-engine) (8.1) calculations.
- Load test complex aggregation queries for the Syllabus Proficiency Map (8.4) and trend lines (8.5).

### Phase 9 — Personalized Practice
- Load test Weakness Pool Generation (9.1) and Personalized Practice Paper Generation (9.2).
- Ensure Adaptive Mastery Confirmation (9.3) re-evaluations meet SLA.

### Phase 10 — Preview System
- Ensure Preview System Impersonation (10.3) overhead is minimal.
- Load test Preview Configuration UI (10.2) simulated plan entitlement checks.

### Phase 11 — AI Question System
- Benchmark AI Gateway Architecture (11.1) throughput and fallback mechanism latency.
- Load test AI Question Modification Worker (11.3) and AI Question Generation Worker (11.4) queues.

### Phase 12 — AI Interview
- Stress test Speech-to-Text (12.4) and Text-to-Speech (12.5) integrations.
- Benchmark the real-time Natural Conversation Engine (12.3) latency to ensure <1s response times.

### Phase 13 — Subscriptions
- Load test Entitlement Engine (@repo/entitlement-engine) (13.1) checks during high traffic (e.g., exam login spikes).
- Benchmark Billing Integration (13.5) webhook processing under concurrency.

### Phase 14 — Production Hardening
- Execute full production-scale load and soak tests.
- Finalize Capacity Planning and Performance Optimization (14.5) recommendations (query optimization, caching).
- Verify AI Queue & Rate Management (14.6) throttling behavior.

## 5. Key Guidelines
### 5.1 Technical Standards
- Read APIs SLA: < 200ms at 95th percentile.
- Write APIs SLA: < 500ms at 95th percentile.
- Exam-taking flows must handle minimum 1000 concurrent users with zero degradation.

### 5.2 Collaboration Model
- Work with Database Administrators/Backend Engineers on query optimization.
- Work with DevOps on infrastructure scaling and monitoring.

### 5.3 Tools & Processes
- Load Testing: k6 (preferred for developer experience) or JMeter.
- Monitoring: Prometheus/Grafana, Datadog, or New Relic.
- Profiling: Node.js profiling tools, PostgreSQL `EXPLAIN ANALYZE`.

## 6. Do's ✅
1. Do design load tests that accurately simulate 1000+ concurrent students taking an exam.
2. Do rigorously monitor timer accuracy under heavy server load.
3. Do measure AI Gateway throughput and mock external provider latency.
4. Do identify and report slow database queries using `EXPLAIN ANALYZE`.
5. Do enforce strict API response time SLAs (<200ms read, <500ms write).
6. Do test both average load (stress) and sustained load (soak).
7. Do monitor CPU, Memory, and Network I/O during tests.
8. Do parameterize load tests to simulate different usage patterns.
9. Do provide actionable optimization recommendations.
10. Do test rate-limiting and auto-scaling mechanisms.
11. Do isolate performance tests to dedicated environments initially.
12. Do collaborate with Backend engineers to implement caching strategies.
13. Do use realistic test data volumes for database benchmarking.
14. Do baseline performance early and compare against it continuously.
15. Do document the exact hardware/environment specs used for every benchmark.

## 7. Don'ts ❌
1. Don't run performance tests on production without explicit approval.
2. Don't accept API responses slower than SLAs without a documented exception.
3. Don't assume the database will scale infinitely without index optimization.
4. Don't test with unrealistically small datasets.
5. Don't ignore frontend performance metrics (Core Web Vitals).
6. Don't rely solely on average response times; always look at p95 and p99.
7. Don't start load testing without establishing baselines first.
8. Don't ignore errors or timeouts during load tests.
9. Don't run tests from a single machine if simulating distributed traffic.
10. Don't forget to test connection pooling limits.
11. Don't overlook the performance impact of logging and monitoring tools.
12. Don't test the AI pipeline without accounting for provider rate limits.
13. Don't assume a successful small-scale test guarantees large-scale success.
14. Don't hide performance bottlenecks; communicate them clearly and early.
15. Don't treat performance as an afterthought; it is a core feature.

## 8. Quality Gates
- Baseline Approval: Initial performance baselines must be approved.
- SLA Compliance Check: All critical APIs must pass SLA gates in CI/CD or nightly runs.
- Go-Live Certification: Final load test report must be signed off by the Tech Lead.

## 9. Escalation Path
- SLA Breaches: Escalate to the relevant Backend or Frontend lead immediately.
- Infrastructure Bottlenecks: Escalate to DevOps/Platform Engineering.
- Architectural Limitations: Escalate to the Software Architect.

## 10. KPIs & Success Metrics
- System Uptime under simulated load.
- API Response Times (p95, p99 meeting SLAs).
- Concurrency Limits achieved (e.g., successful 1000-user exam simulation).
- Time to resolve performance bottlenecks.
