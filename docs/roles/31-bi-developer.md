# BI Developer — Developer Guidelines & Responsibilities

## 1. Role Overview
The BI (Business Intelligence) Developer owns the design, implementation, and maintenance of all business intelligence dashboards, reporting, and data visualization for the Adaptive Examination & AI Learning Platform. You ensure that administrators, teachers, and business stakeholders have actionable insights. Your focus includes the admin analytics dashboard, student performance reports, class-level analytics, question bank coverage reports, subscription revenue dashboards, and AI usage reports.

## 2. Core Responsibilities
1. Design and build the admin analytics dashboard for platform-wide insights.
2. Develop comprehensive student performance reports and class-level analytics.
3. Create visualizations for question bank coverage, difficulty distribution, and usage.
4. Implement subscription revenue dashboards to track billing metrics.
5. Build AI usage reports detailing cost, provider usage, and AI engagement.
6. Optimize SQL queries and data pipelines for reporting from PostgreSQL.
7. Collaborate with Frontend Engineers (Next.js 15) to embed or integrate dashboards.
8. Ensure data visualizations accurately reflect the underlying statistical models.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| BI Dashboards & Visualizations | OWNS |
| Reporting Data Pipelines | OWNS |
| Admin Analytics Dashboard | OWNS |
| AI Usage & Cost Reports | OWNS |
| Subscription & Billing Analytics | OWNS |
| Next.js Frontend Integration | COLLABORATES |
| PostgreSQL Schema Design | CONSULTS |
| ML Model Development | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- No primary deliverables. Support other teams with defining reporting requirements for user and audit tables.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Build structural reports (courses, subjects, syllabus tree).
- Definition of done: Academic structure dashboards active.

### Phase 3 — Question Bank
- Create dashboards for Question Bank Analytics (feature 3.8), focusing on usage stats, difficulty distribution, and topic coverage gaps.
- Visualize Previous Exam Tracking data (feature 3.6).

### Phase 4 — Exam Pattern
- No primary deliverables. Support pattern visualizer (4.10) if needed.

### Phase 5 — Exam Generator
- Build reports on exam generation frequency and templates used (features 5.1, 5.4).

### Phase 6 — Exam System
- Build comprehensive Result Generation reports (feature 6.6), including per-question breakdown, section scores, and topic-wise analysis.

### Phase 7 — Exam Archive
- No primary deliverables. Support other teams as needed.

### Phase 8 — Student Analytics
- Develop the Student Analytics Dashboard (feature 8.6) showing My Strengths, My Weaknesses, and My Proficiency Map.
- Develop the Teacher/Admin Analytics View (feature 8.7) for class-level analytics, student comparison, and topic coverage.

### Phase 9 — Personalized Practice
- Develop adaptive practice dashboards showing student improvement over time and tracking practice attempts vs exam attempts (feature 9.4).

### Phase 10 — Preview System
- Ensure that BI dashboards appropriately filter out Preview Student Profile data and impersonation modes (features 10.1, 10.3) so it doesn't skew production metrics.

### Phase 11 — AI Question System
- Create AI Usage Tracking reports (feature 11.5) detailing AI requests per user and cost per provider.

### Phase 12 — AI Interview
- Visualize AI interview metrics (duration, completion rates, scores, and focus areas).

### Phase 13 — Subscriptions
- Build AI Usage Tracking & Limits dashboards (feature 13.4).
- Build subscription revenue dashboards and track AI Credit System usage (feature 13.3).

### Phase 14 — Production Hardening
- Contribute to Audit System Enhancement (feature 14.2) by providing audit log analytics and compliance reporting.

## 5. Key Guidelines
### 5.1 Technical Standards
- Extract data efficiently from PostgreSQL without impacting transactional performance.
- Use read-replicas for heavy analytical queries.
- Ensure all embedded dashboards match the Next.js 15 frontend design system.

### 5.2 Collaboration Model
- Work with the Data Scientist to ensure metrics reflect modeled data accurately.
- Collaborate with the MLOps Engineer for AI cost reporting data.
- Consult with the Backend Team for data availability and API design.

### 5.3 Tools & Processes
- BI Tools (e.g., Metabase, Superset, or embedded charting libraries).
- PostgreSQL and Prisma (for data understanding).
- pnpm + Turborepo (if developing embedded frontend analytics).

## 6. Do's ✅
1. Do use read-replicas or data warehouses for running heavy BI queries.
2. Do optimize SQL queries to minimize latency in dashboard loading.
3. Do validate dashboard metrics against raw database values to ensure accuracy.
4. Do design visualizations that are accessible and easy to understand for non-technical users.
5. Do collaborate closely with the Next.js frontend team for embedded analytics.
6. Do establish a data dictionary for all metrics displayed on dashboards.
7. Do track AI provider costs and usage granularly.
8. Do implement role-based access control (RBAC) on dashboards to protect sensitive data.
9. Do cache dashboard results where real-time data is not strictly required.
10. Do ensure visualizations are responsive and work on various screen sizes.
11. Do use consistent color schemes and branding across all reports.
12. Do proactively identify data quality issues and report them to the backend team.
13. Do build drill-down capabilities in reports for deeper insights.
14. Do document all SQL views or materialized views used for BI.
15. Do align analytics terminology with the domain language of the exam platform.

## 7. Don'ts ❌
1. Don't run heavy analytical queries on the primary transactional production database.
2. Don't present misleading visualizations (e.g., truncated axes).
3. Don't bypass the API-first principle if data needs to be exposed externally.
4. Don't expose PII (Personally Identifiable Information) in high-level analytical dashboards.
5. Don't build complex dashboards without validating requirements with stakeholders.
6. Don't ignore slow-loading dashboards; optimize the queries or add caching.
7. Don't hardcode business logic in BI queries if it should belong in the backend API.
8. Don't use non-standard charting libraries that conflict with the frontend tech stack.
9. Don't deploy dashboards without testing data filters and parameters.
10. Don't assume the data structure will never change; adapt to PostgreSQL schema updates.
11. Don't ignore the separation of modules in the Modular Monolith architecture.
12. Don't fail to monitor the usage of the BI dashboards themselves.
13. Don't create duplicate reports for the same metrics.
14. Don't leave deprecated dashboards active; clean them up.
15. Don't operate in a silo; ensure BI metrics align with Data Science models.

## 8. Quality Gates
- All BI queries must be reviewed for performance and optimization.
- Dashboards must pass stakeholder UAT (User Acceptance Testing) for accuracy.
- Embedded dashboards must meet Next.js 15 frontend performance standards.

## 9. Escalation Path
- Data discrepancies or missing data: Escalate to Backend Data Engineers.
- Dashboard performance issues: Escalate to DBA / Backend Lead.

## 10. KPIs & Success Metrics
- Dashboard Load Time (<2 seconds for cached, <5 seconds for real-time).
- User Adoption Rate of BI dashboards among admin and teaching staff.
- Accuracy of reported metrics compared to source of truth.
