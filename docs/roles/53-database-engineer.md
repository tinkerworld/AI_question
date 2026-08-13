<Database Engineer — Developer Guidelines & Responsibilities>
## 1. Role Overview
The Database Engineer focuses on the schema design, data modeling, and query optimization for the Adaptive Examination Platform. You own the Prisma schema development, additive migration strategies, and index optimization ensuring that question bank queries, exam attempt inserts, and mastery calculations are highly performant.

## 2. Core Responsibilities
1. Design and maintain the Prisma schema (`schema.prisma`).
2. Develop additive, non-breaking database migrations.
3. Optimize complex queries for question retrieval and exam generation.
4. Design indexing strategies (B-Tree, GIN, vector) for optimal performance.
5. Model data for mastery calculations and adaptive learning analytics.
6. Review application code (Prisma queries) for performance anti-patterns.
7. Ensure data integrity through proper constraints, foreign keys, and transactions.
8. Work with developers to resolve N+1 query issues.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Prisma Schema Design | OWNS |
| Migration Strategy (Additive)| OWNS |
| Query Optimization | OWNS |
| Indexing Strategy | OWNS |
| Database Server Operations | COLLABORATES |
| Application Logic | CONSULTS |
| Data Platform/Analytics | CONSULTS |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish the base Prisma schema for users, roles, permissions, audit_logs, and refresh_tokens (Feature 1.2).
- Define standards for additive migrations.
- Definition of done: Base schema is deployed, and Prisma client is generated successfully.

### Phase 2 — Academic Structure
- Design schema for courses, subjects, and the recursive syllabus tree (Feature 2.3).
- Implement indexes for hierarchical queries and student enrollment (Feature 2.6).
- Definition of done: Schema supports efficient recursive querying.

### Phase 3 — Question Bank
- Design schema for pluggable question types, versioning, tags, and lifecycle states (Features 3.1-3.5).
- Optimize indexing for filtering questions by tags and difficulty.
- Definition of done: Question search queries perform under 100ms.

### Phase 4 — Exam Pattern
- Model exam patterns, sections, question rules, and distributions (Features 4.1-4.7).
- Optimize queries used by the validation engine (Feature 4.8).
- Definition of done: Pattern schema supports strict relational constraints.

### Phase 5 — Exam Generator
- Design schema for draft exam instances, generated metadata, and question assignments (Feature 5.3).
- Definition of done: Exam generation queries are efficient and scalable.

### Phase 6 — Exam System
- Design high-throughput schema for exam attempt sessions, answer saves, and result generation (Features 6.2, 6.3, 6.6).
- Optimize for write-heavy workloads during exam execution.
- Definition of done: Answer saving handles high concurrency without locking issues.

### Phase 7 — Exam Archive
- Model schema for published exam snapshots and answer key preservation (Features 7.2, 7.3).
- Definition of done: Archive schema prevents accidental mutations.

### Phase 8 — Student Analytics
- Model the mastery score schema for syllabus proficiency map (Feature 8.4).
- Optimize aggregate queries for progress tracking and dashboards (Feature 8.5).
- Definition of done: Mastery calculation queries are optimized.

### Phase 9 — Personalized Practice
- Design schema for weakness pool generation and practice paper generation (Features 9.1, 9.2).
- Definition of done: Practice separate tables cleanly isolate from main exams.

### Phase 10 — Preview System
- Model schema for preview audit trail (Feature 10.5).
- Definition of done: Impersonation state is efficiently stored.

### Phase 11 — AI Question System
- Design schema for AI usage tracking and AI worker queues (Features 11.5, 11.6).
- Definition of done: Usage tracking is indexed for quick aggregation.

### Phase 12 — AI Interview
- Model schema for interview templates, assessment engine results, and session management (Features 12.1, 12.6, 12.10).
- Definition of done: Flexible JSON/relational structure handles varied interview rubrics.

### Phase 13 — Subscriptions
- Design schema for the entitlement engine, plans, and AI credit balances (Features 13.1, 13.3).
- Ensure strict foreign key constraints for billing integration (Feature 13.5).
- Definition of done: Payment schema enforces data integrity.

### Phase 14 — Production Hardening
- Conduct a full schema review and query optimization (Feature 14.5).
- Ensure all queries meet performance SLAs.
- Definition of done: Schema is finalized and optimized for scale.

## 5. Key Guidelines
### 5.1 Technical Standards
- All migrations must be strictly additive (no dropping tables/columns that are in use).
- Use Prisma's `@@index` for all frequently queried fields.
- Leverage PostgreSQL-specific features (e.g., JSONB for flexible metadata) appropriately via Prisma.
### 5.2 Collaboration Model
- Work closely with Backend Engineers to optimize Prisma Client usage.
- Work with the DBA to review generated SQL before execution.
### 5.3 Tools & Processes
- Prisma Studio, Prisma Migrate.
- `EXPLAIN ANALYZE` for query tuning.
- Data modeling tools (e.g., dbdiagram.io).

## 6. Do's ✅
1. Do write additive migrations (e.g., add new column, migrate data, remove old column in next release).
2. Do use foreign keys to maintain referential integrity.
3. Do add indexes to foreign keys and frequently filtered columns.
4. Do use JSONB for truly unstructured or highly variable data.
5. Do review Prisma queries to avoid N+1 problems (use `include` carefully).
6. Do use composite indexes for queries filtering on multiple columns.
7. Do analyze the raw SQL generated by Prisma (`PRISMA_CLIENT_LOGS="query"`).
8. Do design for multi-tenancy from the start (institution_id on core tables).
9. Do use Enums for static, defined lists of values.
10. Do document complex schema relationships.
11. Do use database-level constraints (e.g., unique, check constraints) where applicable.
12. Do plan for data archiving or partitioning for large tables (e.g., audit logs).
13. Do use soft deletes (`deletedAt`) instead of hard deletes for critical data.
14. Do collaborate with the DBA on heavy migrations (e.g., adding indexes concurrently).
15. Do ensure timestamp fields (`createdAt`, `updatedAt`) are on all tables.

## 7. Don'ts ❌
1. Don't write destructive migrations (dropping columns/tables) without a multi-phase rollout.
2. Don't over-index tables; indexes slow down write operations.
3. Don't use Prisma's `include` to fetch deeply nested relations unnecessarily.
4. Don't store large binary data (blobs) in PostgreSQL; use S3.
5. Don't use string concatenation for dynamic queries (prevent SQL injection, though Prisma handles this).
6. Don't ignore `EXPLAIN` plans for slow queries.
7. Don't use UUIDs as primary keys if performance is a critical issue (prefer ULIDs or sequential IDs if needed, though UUIDv4 is default).
8. Don't create circular dependencies in schema relations.
9. Don't mix business logic into the database schema (e.g., complex triggers).
10. Don't leave foreign key columns unindexed.
11. Don't bypass Prisma for schema changes; maintain the source of truth.
12. Don't use large JSONB columns for data that needs frequent, complex querying.
13. Don't execute heavy migrations during peak traffic hours.
14. Don't assume Prisma will perfectly optimize every query; verify raw SQL.
15. Don't create tables without primary keys.

## 8. Quality Gates
- All PRs containing schema changes must have additive migrations.
- `EXPLAIN ANALYZE` results provided for queries operating on large datasets.
- Schema design reviewed and approved by Tech Lead and DBA.

## 9. Escalation Path
- Escalate Prisma limitations or complex query performance issues to the Tech Lead.
- Escalate migration failures immediately to the DBA.

## 10. KPIs & Success Metrics
- Zero downtime caused by database migrations.
- Query performance targets met (e.g., 95th percentile < 100ms).
- Number of N+1 query issues identified and resolved.
</Database Engineer — Developer Guidelines & Responsibilities>
