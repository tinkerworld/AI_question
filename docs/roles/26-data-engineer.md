<Data Engineer — Developer Guidelines & Responsibilities>
## 1. Role Overview
As the Data Engineer for the Adaptive Examination & AI Learning Platform, you are responsible for the flow, transformation, and storage of analytical and operational data outside the core transactional database. While the Data Architect designs the PostgreSQL schema, you build the ETL/ELT pipelines, data warehouses, and analytics infrastructure. You enable the Python AI Gateway to train models, power the Mastery Engine with aggregated student data, and provide the business with actionable usage tracking and telemetry.

## 2. Core Responsibilities
1. Design, build, and maintain data pipelines (ETL/ELT) extracting data from the PostgreSQL transactional DB.
2. Build the analytical data warehouse infrastructure (e.g., Snowflake, BigQuery, or Redshift) for the platform.
3. Develop pipelines to calculate and aggregate Student Mastery and question effectiveness metrics.
4. Build data extraction pipelines to feed anonymized, sanitized data to the Python FastAPI AI server for model fine-tuning.
5. Manage event ingestion pipelines for platform usage tracking and telemetry.
6. Implement data quality checks, anomaly detection, and pipeline monitoring.
7. Ensure strict adherence to data privacy (GDPR/CCPA) by scrubbing PII during the ETL process.
8. Build the data foundation for the Analytics & Dashboards module.
9. Optimize pipeline performance for processing millions of exam question responses.
10. Manage historical data archiving and cold storage strategies.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| ETL/ELT Pipelines | OWNS |
| Data Warehouse / Data Lake Architecture | OWNS |
| Mastery Calculation Data Pipelines | OWNS |
| AI Training Data Preparation | OWNS |
| Platform Usage & Event Ingestion | OWNS |
| Transactional PostgreSQL Schema | COLLABORATES |
| Python AI Model Logic | COLLABORATES |
| Express API Analytics Endpoints | CONSULTS |
| Frontend Dashboard UI | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Deliverables: Select and deploy the ETL orchestration tool. Set up logical replication or CDC from the PostgreSQL database (1.2 Database Package). Support Audit Logging (1.9) extraction.
- Cross-Reference: See docs/phases/phase-01-foundation.md

### Phase 2 — Academic Structure
- No primary deliverables. Support other teams as needed.

### Phase 3 — Question Bank
- Deliverables: Extract data for Question Bank Analytics (3.8) and Previous Exam Tracking (3.6) into the analytical lake.
- Cross-Reference: See docs/phases/phase-03-question-bank.md

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- No primary deliverables. Support other teams as needed.

### Phase 6 — Exam System
- Deliverables: Build pipelines to extract `QuestionResponse` and `ExamAttempt` records from PostgreSQL into the analytical data lake for Answer Submission & Types (6.3) and Result Generation (6.6).

### Phase 7 — Exam Archive
- Deliverables: Manage historical data archiving strategies for Published Exam Snapshot (7.2) and Exam Archive & Search (7.4).

### Phase 8 — Student Analytics
- Deliverables: Build pipelines to calculate and aggregate student mastery (8.1 Mastery Engine) and generate datasets for Syllabus Proficiency Map (8.4) and Student Analytics Dashboard (8.6).

### Phase 9 — Personalized Practice
- Deliverables: Construct batch pipelines that analyze historical student attempts for Weakness Pool Generation (9.1).

### Phase 10 — Preview System
- Deliverables: Ensure Preview Audit Trail (10.5) data is correctly filtered from production analytics pipelines.

### Phase 11 — AI Question System
- Deliverables: Ingest AI Usage Tracking (11.5) to aggregate AI cost metrics. Provide data for AI Question Modification Worker (11.3).

### Phase 12 — AI Interview
- Deliverables: Extract assessment data from Interview Assessment Engine (12.6) for analytical tracking.

### Phase 13 — Subscriptions
- Deliverables: Integrate Billing Integration (13.5) with platform usage data for AI Credit System (13.3) tracking.

### Phase 14 — Production Hardening
- Deliverables: Implement Audit System Enhancement (14.2) and ensure Data Privacy & Compliance (14.8) by scrubbing PII in data lakes.

## 5. Key Guidelines
### 5.1 Technical Standards
- **ELT over ETL:** Prefer loading raw data into the warehouse and transforming it there using tools like dbt (data build tool).
- **Idempotency:** All data pipelines MUST be idempotent. Re-running a pipeline for a specific date range should always yield the exact same state without duplicating data.
- **Data Privacy:** PII (Names, Emails, Exact Locations) must be dropped or hashed *before* it enters the analytical data warehouse.

### 5.2 Collaboration Model
- Work with the Data Architect to ensure CDC (e.g., Debezium) or read-replicas do not strain the primary PostgreSQL instance.
- Collaborate with the Python AI team to understand exactly what data shapes they need for fine-tuning.
- Provide clean, documented tables/views for the Backend API team to query for Next.js dashboards.

### 5.3 Tools & Processes
- **Orchestration:** Airflow, Dagster, or Prefect.
- **Transformation:** dbt (Data Build Tool).
- **Ingestion:** Kafka, Debezium, or cloud-native tools (AWS DMS / GCP Dataflow).
- **Warehouse:** Snowflake, Redshift, or BigQuery.

## 6. Do's ✅
1. DO use Change Data Capture (CDC) to stream data from PostgreSQL instead of heavy batch `SELECT *` queries.
2. DO ensure all tables in the data warehouse strictly enforce user isolation and data classification.
3. DO implement robust alerting for data pipeline failures or data staleness.
4. DO write Vitest/pytest tests for your data transformation logic (e.g., testing dbt macros).
5. DO anonymize student data rigorously before exposing it to AI training pipelines.
6. DO maintain a data dictionary/catalog documenting what each metric in the warehouse means.
7. DO build pipelines that are capable of backfilling historical data seamlessly.
8. DO optimize warehouse tables using partitioning (e.g., by date) and clustering keys.
9. DO decouple the analytical read operations from the transactional database completely.
10. DO use standard naming conventions in the warehouse (e.g., `stg_users`, `fact_exam_attempts`, `dim_questions`).
11. DO monitor warehouse compute costs, ensuring queries don't trigger unnecessary full table scans.
12. DO version control all pipeline code and dbt models within the main Turborepo monorepo.
13. DO provide aggregated roll-up tables for the Next.js dashboards to ensure fast load times.
14. DO handle schema evolution gracefully (when the Data Architect adds a column, the pipeline shouldn't break).
15. DO validate data quality (e.g., checking for nulls in critical foreign keys) at the extraction layer.

## 7. Don'ts ❌
1. DON'T run analytical ETL queries directly against the primary transactional PostgreSQL database.
2. DON'T allow PII data to leak into the AI fine-tuning datasets under any circumstances.
3. DON'T build pipelines that are state-dependent and cannot be easily re-run.
4. DON'T hardcode business logic into orchestration scripts; push logic down to dbt/SQL where possible.
5. DON'T ignore timezone data; always standardize timestamps to UTC during ingestion.
6. DON'T create circular dependencies between data warehouse models.
7. DON'T let silent pipeline failures go unnoticed; if zero rows are processed, alert on it.
8. DON'T bypass version control to create manual views in the data warehouse UI.
9. DON'T build overly complex machine learning models directly in SQL; prepare the data and let the Python AI server handle the ML.
10. DON'T pull data out of the warehouse, process it in Python, and push it back if it can be done efficiently in SQL.
11. DON'T forget to purge or archive raw event data in the data lake to manage storage costs.
12. DON'T ignore data governance; ensure only authorized services and personnel can query the warehouse.
13. DON'T rely on sequential IDs for joining distributed data streams; use UUIDs or compound keys.
14. DON'T schedule heavy batch jobs during peak exam hours, even on read-replicas.
15. DON'T build bespoke integrations for every API endpoint; provide generic, flexible aggregated views.

## 8. Quality Gates
- **Pipeline Idempotency Test:** Pipelines must successfully run twice over the same data window without duplicating records.
- **Data Quality Checks:** dbt tests (unique, not_null, accepted_values) must pass before data is exposed to the Express APIs.
- **PII Audit:** AI training datasets must pass an automated PII detection scan before release.

## 9. Escalation Path
- Escalate to the Data Architect if transactional schema changes are repeatedly breaking downstream ETL pipelines.
- Escalate to the Cloud Architect if warehouse compute costs or ingestion pipeline latency exceeds SLA.

## 10. KPIs & Success Metrics
- **Data Freshness:** Dashboard data is never more than 1 hour stale. Event data is ingested in < 5 minutes.
- **Pipeline Reliability:** 99.9% success rate for daily scheduled DAGs/pipelines.
- **Data Accuracy:** 0 discrepancies between transactional DB financial totals and Data Warehouse roll-ups.
</Data Engineer — Developer Guidelines & Responsibilities>
