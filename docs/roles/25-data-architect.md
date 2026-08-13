<Data Architect — Developer Guidelines & Responsibilities>
## 1. Role Overview
As the Data Architect for the Adaptive Examination & AI Learning Platform, you own the holistic data strategy, database design, and data governance. You are the master of the PostgreSQL 16 database and the Prisma ORM schemas. You ensure that the Modular Monolith architecture is reflected at the database level by enforcing strict schema boundaries, preventing cross-module JOINs, and designing robust, scalable, and compliant data models for multi-tenancy, exam state, and AI analytics.

## 2. Core Responsibilities
1. Design and maintain the global PostgreSQL 16 database schema.
2. Manage and review all Prisma ORM (`schema.prisma`) definitions across the monorepo.
3. Enforce data isolation between logical modules (Users, Academic, Exam, AI) within the database.
4. Design the multi-tenancy data model, ensuring institution-level data separation.
5. Formulate the additive-only database migration strategy to support zero-downtime deployments.
6. Design the audit logging data model to track sensitive changes (grades, question edits, RBAC changes).
7. Architect the immutable Question Bank versioning data model.
8. Design the high-concurrency Exam Snapshot and active-attempt data models.
9. Architect the Mastery Scoring and analytics aggregation data structures.
10. Ensure GDPR/CCPA compliance through data masking, encryption-at-rest, and deletion strategies.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| PostgreSQL Schema Design | OWNS |
| Prisma ORM Strategy | OWNS |
| Database Migration Strategy | OWNS |
| Data Governance & Compliance | OWNS |
| Multi-Tenancy Data Architecture | OWNS |
| Data Engineering/ETL Pipelines | COLLABORATES |
| Cloud Database Infrastructure | COLLABORATES |
| Application API Logic | CONSULTS |
| Frontend UI Design | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Design Database Package (@repo/database) schemas: users, roles, permissions, audit_logs.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Architect tables for Course Management, Subject Management, and recursive Syllabus Tree, enforcing multi-tenancy.
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Design schemas for Question CRUD, Question Tags, and Question Versioning to ensure historical integrity.
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- Design Exam Pattern CRUD and Exam Pattern Sections tables.
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Design data structures for Exam Metadata and Draft Exam Inspection.
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Design high-concurrency schema for Exam Attempt Session and Answer Submission. Optimize for heavy WRITE operations.
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Architect schema for Published Exam Snapshot and Answer Key Preservation (immutable records).
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Design schema for Mastery Engine calculations and Syllabus Proficiency Map pre-aggregated data.
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Design schema for Weakness Pool Generation and Practice Attempt Tracking.
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- Design Impersonation System state management and Preview Audit Trail tables.
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Design tables for AI Usage Tracking, cost tracking, and AI Worker Queue System states.
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Design schema for Interview Template Management, Interview Session Management, and Assessment Engine rubrics.
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Design tables for Subscription Management, AI Credit System, and Billing Integration events.
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Implement table partitioning, data archiving, and audit log strategies for Performance Optimization and Data Privacy & Compliance.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- **PostgreSQL 16:** Leverage native features (JSONB, partitions, generated columns) judiciously.
- **Prisma ORM:** All schema changes MUST go through Prisma migrations. No manual SQL schemas allowed unless required for specific performance tuning (and even then, managed via Prisma `migrate --create-only`).
- **No Cross-Module JOINs:** To preserve the Modular Monolith, a table in the `Exam` domain cannot have a direct foreign key to a table in the `Subscriptions/Billing` domain. Use application-level logic (APIs/Events) to resolve relationships across boundaries.

### 5.2 Collaboration Model
- Block tightly with the Enterprise Architect to ensure the data model respects bounded contexts.
- Work closely with Backend Developers to review their Prisma queries for N+1 issues and index utilization.
- Collaborate with the Data Engineer to export transactional data to the analytics warehouse.

### 5.3 Tools & Processes
- **Migration Policy:** Migrations must be *additive only* (no dropping columns or renaming without a multi-phase deprecation strategy) to ensure zero-downtime deployments.
- **Tooling:** Prisma Studio (local debugging), pgAdmin/DBeaver, ERD mapping tools.
- **Review:** Data Architect MUST approve any Pull Request that modifies `schema.prisma`.

## 6. Do's ✅
1. DO enforce a strict naming convention in Prisma (e.g., PascalCase for models, camelCase for fields).
2. DO ensure every table has a `createdAt` and `updatedAt` timestamp.
3. DO implement soft deletes (`deletedAt` DateTime) for critical entities instead of hard deletes.
4. DO utilize PostgreSQL JSONB columns for highly unstructured or rapidly changing data (e.g., AI prompt contexts).
5. DO enforce user and entity ownership scoping on domain models.
6. DO review Prisma migration files manually before committing to ensure they don't lock massive tables.
7. DO use Compound Indexes for frequent query patterns (e.g., `courseId` + `userId`).
8. DO architect question versioning as immutable rows (Question V1, Question V2) rather than mutating existing rows.
9. DO provide `@@map` in Prisma to keep underlying PostgreSQL table names standard (e.g., snake_case) if required by DB policies.
10. DO utilize Prisma's enums for static status fields (e.g., `ExamStatus: DRAFT, PUBLISHED, ARCHIVED`).
11. DO plan for table partitioning on high-volume tables (`AuditLog`, `QuestionResponse`) from Phase 1.
12. DO write custom SQL migration scripts for complex data backfills; do not rely solely on application scripts.
13. DO ensure all monetary values are stored as integers (cents/paise) to prevent floating-point errors.
14. DO run `EXPLAIN ANALYZE` on heavily used queries to ensure index usage.
15. DO document the exact data retention and purging strategy for temporary exam states.

## 7. Don'ts ❌
1. DON'T allow cross-module Foreign Keys (e.g., `Exam` table having an FK to `BillingInvoice`).
2. DON'T allow breaking migrations (dropping tables, renaming columns) in production without a deprecation phase.
3. DON'T use UUIDs as primary keys blindly if sequential IDs (Snowflake/CUID) offer better insert performance, unless required for security.
4. DON'T store large media files (Base64 images) in the database; always use S3/CDN URLs.
5. DON'T let developers use `prisma.user.findMany()` without pagination constraints in the Express API.
6. DON'T leak internal database IDs to the frontend if public IDs (like CUIDs or short-ids) are mandated.
7. DON'T allow hardcoded AI provider details in the data model; keep the AI logging schema provider-agnostic.
8. DON'T forget to add unique constraints at the database level; don't rely only on application-level validation.
9. DON'T store plain-text secrets, passwords, or PII without proper hashing or encryption-at-rest.
10. DON'T allow cyclic relationships in the database schema.
11. DON'T use JSONB for highly structured, relational data that needs to be queried and indexed frequently.
12. DON'T bypass the Prisma migration system to make hot-fixes directly in the production database.
13. DON'T ignore connection limits; ensure Prisma connection pooling is configured correctly.
14. DON'T design the Mastery schema using only real-time calculations; pre-aggregate heavy mathematical models.
15. DON'T merge `schema.prisma` changes without running the full 1,600 Vitest suite to ensure no test regressions.

## 8. Quality Gates
- **ERD Review:** Visual Entity-Relationship Diagrams must be updated and approved before phase implementation.
- **Migration CI/CD:** Automated tests must verify that down-migrations (if applicable) and up-migrations execute flawlessly.
- **Index Audit:** A mandatory review of all indexes against the top 20 heaviest API queries before Phase 14.

## 9. Escalation Path
- Escalate to the Enterprise Architect if a feature requires breaking the bounded context/module independence rules.
- Escalate to the CTO if developers are bypassing Prisma and executing unsafe raw queries without review.

## 10. KPIs & Success Metrics
- **Performance:** 95th percentile query execution time is < 50ms.
- **Migration Safety:** 0 instances of deployment rollbacks due to database migration locks or failures.
- **Data Integrity:** 0 orphaned records or foreign key constraint violations across the 14 phases.
</Data Architect — Developer Guidelines & Responsibilities>
