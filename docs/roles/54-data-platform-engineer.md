<Data Platform Engineer — Developer Guidelines & Responsibilities>
## 1. Role Overview
The Data Platform Engineer is responsible for building and maintaining the data infrastructure, event streaming, and analytics pipelines for the Adaptive Examination Platform. You own the event bus infrastructure, real-time analytics data pipelines, mastery score updates, and the aggregation of AI usage data for reporting and improvement.

## 2. Core Responsibilities
1. Design and maintain the event streaming infrastructure (e.g., Kafka, Redis Streams, or RabbitMQ).
2. Build data pipelines (ETL/ELT) for analytics and reporting.
3. Implement real-time processors for mastery score updates based on exam results.
4. Aggregate and structure AI usage data for cost tracking and model improvement.
5. Maintain the data lake or data warehouse for long-term analytics storage.
6. Ensure data quality, consistency, and reliability across pipelines.
7. Provide structured data views for frontend dashboards.
8. Manage data retention and anonymization policies.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Event Bus Infrastructure | OWNS |
| Analytics Data Pipelines | OWNS |
| Real-time Data Processing | OWNS |
| Data Warehouse/Lake | OWNS |
| Transactional Database (PostgreSQL)| CONSULTS |
| Application API Endpoints | COLLABORATES |
| Machine Learning Models | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish the core event bus architecture for asynchronous service communication, including audit logs (Feature 1.9).
- Definition of done: Event bus is deployed, and basic pub/sub works reliably.

### Phase 2 — Academic Structure
- Setup pipelines to sync course, subject, and syllabus tree (Feature 2.3) updates to the analytics store.
- Definition of done: Analytics store reflects current institutional structure.

### Phase 3 — Question Bank
- Implement tracking for question bank analytics, including usage stats and difficulty distribution (Feature 3.8).
- Definition of done: Data pipeline ingests question metrics.

### Phase 4 — Exam Pattern
- Track exam pattern creation and topic distribution trends (Feature 4.4).
- Definition of done: Pattern metrics are available for reporting.

### Phase 5 — Exam Generator
- Track auto-generation events and question selection algorithms (Feature 5.1).
- Definition of done: Generation metrics are available for reporting.

### Phase 6 — Exam System
- Build high-throughput event ingestion for exam answer events and telemetry during exam sessions (Feature 6.2).
- Process auto-evaluation results (Feature 6.5).
- Definition of done: Event stream handles peak exam delivery loads.

### Phase 7 — Exam Archive
- Ingest archive events to track exam publishing workflows (Feature 7.1).
- Definition of done: Publishing lifecycle events are stored.

### Phase 8 — Student Analytics
- Build real-time aggregation pipelines to calculate mastery engine scores (Feature 8.1).
- Structure data for the syllabus proficiency map (Feature 8.4) and progress tracking (Feature 8.5).
- Definition of done: Mastery scores update in near real-time post-exam.

### Phase 9 — Personalized Practice
- Aggregate data for weakness pool generation (Feature 9.1) and practice attempt tracking (Feature 9.4).
- Definition of done: Practice analytics feed back into mastery engine seamlessly.

### Phase 10 — Preview System
- Ingest preview audit trail data (Feature 10.5) to monitor usage of preview features.
- Definition of done: Preview metrics are distinct from production analytics.

### Phase 11 — AI Question System
- Aggregate AI usage tracking data and cost per provider (Feature 11.5).
- Definition of done: AI usage data is available for cost analysis and monitoring.

### Phase 12 — AI Interview
- Process events from the interview assessment engine (Feature 12.6) and feedback generation (Feature 12.7).
- Definition of done: Interview results are stored for analytics.

### Phase 13 — Subscriptions
- Build pipelines for AI credit system (Feature 13.3) and billing integration usage (Feature 13.5).
- Definition of done: Financial and credit metrics are accurately reported in the warehouse.

### Phase 14 — Production Hardening
- Optimize data pipeline latency and data warehouse query performance (Feature 14.5).
- Integrate alerting and monitoring (Feature 14.4).
- Definition of done: All data pipelines meet SLA requirements.

## 5. Key Guidelines
### 5.1 Technical Standards
- Design event schemas using a schema registry (e.g., Avro, JSON Schema) to prevent breaking changes.
- Ensure all pipelines are idempotent to handle message replays safely.
- Follow data anonymization guidelines for PII before storing in the data lake.
### 5.2 Collaboration Model
- Work with Backend Engineers to define event schemas emitted by the API.
- Work with Frontend Engineers to define data structures required for dashboards.
### 5.3 Tools & Processes
- Kafka, Redis Streams, or RabbitMQ for event bus.
- Snowflake, BigQuery, or PostgreSQL (Analytics) for Data Warehouse.
- dbt (data build tool) for transformations.

## 6. Do's ✅
1. Do use a schema registry for all event payloads.
2. Do design idempotent data pipelines.
3. Do partition data in the data lake/warehouse for query performance.
4. Do monitor pipeline latency and data freshness.
5. Do implement dead-letter queues (DLQs) for failed event processing.
6. Do anonymize PII before data enters the analytics warehouse.
7. Do version event schemas carefully.
8. Do use dbt (or similar) for managing data transformations in code.
9. Do validate data quality at ingestion boundaries.
10. Do document the data lineage from source to dashboard.
11. Do alert on data anomalies or sudden drops in event volume.
12. Do separate analytical workloads from transactional databases.
13. Do use batching for efficient data warehouse inserts.
14. Do ensure events are timestamped accurately at the source.
15. Do design for backfilling data when pipelines change.

## 7. Don'ts ❌
1. Don't use the transactional database (primary PostgreSQL) for heavy analytical queries.
2. Don't make breaking changes to event schemas without versioning.
3. Don't ingest raw PII into the data lake without approval.
4. Don't ignore messages in the dead-letter queue.
5. Don't assume events will arrive perfectly in order (handle out-of-order data).
6. Don't build pipelines that fail completely on a single malformed event.
7. Don't rely on manual data backfills; automate the process.
8. Don't create tightly coupled integrations between services via the database; use the event bus.
9. Don't skip data validation steps in the ETL process.
10. Don't use synchronous API calls for high-volume telemetry data.
11. Don't leave old, unused data pipelines running.
12. Don't grant broad access to the raw data lake; use structured views.
13. Don't hardcode transformation logic outside of version-controlled tools (like dbt).
14. Don't forget to monitor the storage costs of the data warehouse.
15. Don't ignore schema evolution requirements.

## 8. Quality Gates
- All event schemas are registered and versioned.
- Data pipelines are idempotent and handle replay tests successfully.
- Analytics dashboards load within <2 seconds.

## 9. Escalation Path
- Escalate event bus downtime or significant data pipeline delays to the Tech Lead.
- Escalate data quality issues to the respective service owners emitting the data.

## 10. KPIs & Success Metrics
- Data Pipeline Latency (time from event to warehouse).
- Data Freshness (e.g., 99% of data available within 5 minutes).
- Zero data loss during system restarts or upgrades.
</Data Platform Engineer — Developer Guidelines & Responsibilities>
