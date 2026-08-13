# Functional Specifications — Master Index

## Purpose

This directory contains **individual functional specification documents** for every function, profile, option, and feature in the platform. Each document is a standalone reference that describes:

- **What it is** — Clear description
- **Who can use it** — Permissions per role
- **What it can do** — Every capability and sub-capability
- **How it works** — Step-by-step flows and business logic
- **Data model** — Database tables and relationships
- **API endpoints** — Complete API surface
- **UI screens** — What the user sees
- **Business rules** — Constraints and logic
- **Edge cases** — Unusual scenarios and how they're handled
- **Integration points** — How it connects to other features

---

## Document Index

### 👤 User Profiles & Roles (Docs 01–06)

| # | Document | Description |
|---|---|---|
| 01 | [Main Admin Profile](01-main-admin-profile.md) | Complete system authority — user management, system config, all permissions |
| 02 | [Sub-Admin Profile](02-sub-admin-profile.md) | Delegated admin — teacher/student management, content management |
| 03 | [Teacher Profile](03-teacher-profile.md) | Academic content creator — questions, exams, patterns, syllabus |
| 04 | [Student Profile](04-student-profile.md) | Learner — exams, practice, analytics, AI features |
| 05 | [Preview Student](05-preview-student.md) | System persona for staff to test student experience |
| 06 | [Impersonation System](06-impersonation-system.md) | Preview and real-student impersonation with audit trail |

### 🔐 Authentication & Authorization (Docs 07–08)

| # | Document | Description |
|---|---|---|
| 07 | [Authentication System](07-authentication-system.md) | Login, JWT, tokens, password management, session context |
| 08 | [RBAC & Permission System](08-rbac-permission-system.md) | Roles, permissions, authorization middleware, custom roles |

### 📚 Academic Content (Docs 09–11)

| # | Document | Description |
|---|---|---|
| 09 | [Course Management](09-course-management.md) | Course CRUD, levels, statuses, subject linking |
| 10 | [Syllabus Management](10-syllabus-management.md) | Hierarchical tree: Unit → Topic → Subtopic → Concept |
| 11 | [Student Enrollment](11-student-enrollment.md) | Enrollment management, access control, history |

### ❓ Question Bank (Docs 12–14)

| # | Document | Description |
|---|---|---|
| 12 | [Question Bank](12-question-bank.md) | Central question inventory, CRUD, search, lifecycle |
| 13 | [Question Types](13-question-types.md) | All 11 question types: MCQ, Numerical, Subjective, etc. |
| 14 | [Question Versioning, Tags & History](14-question-versioning-tags.md) | Version management, tagging, previous exam tracking |

### 📝 Examination System (Docs 15–18)

| # | Document | Description |
|---|---|---|
| 15 | [Exam Pattern](15-exam-pattern.md) | Blueprint/recipe for exams: sections, rules, distribution |
| 16 | [Exam Generator](16-exam-generator.md) | Paper generation, balancing, duplicate prevention |
| 17 | [Exam System (Student)](17-exam-system.md) | Complete exam-taking flow: start → answer → submit → result |
| 18 | [Published Exam Archive](18-published-exam-archive.md) | Immutable snapshots, answer keys, historical integrity |

### 📊 Analytics & Practice (Docs 19–20)

| # | Document | Description |
|---|---|---|
| 19 | [Mastery Engine & Analytics](19-mastery-engine.md) | Proficiency tracking, strengths, weaknesses, color mapping |
| 20 | [Personalized Practice](20-personalized-practice.md) | Weakness pool, adaptive papers, mastery confirmation |

### 🤖 AI System (Docs 21–23)

| # | Document | Description |
|---|---|---|
| 21 | [AI Gateway](21-ai-gateway.md) | Universal AI interface, provider adapters, routing, config |
| 22 | [AI Question System](22-ai-question-system.md) | AI modification, generation, review workflow |
| 23 | [AI Interview System](23-ai-interview-system.md) | Templates, conversation engine, STT/TTS, assessment |

### 💳 Subscription & Billing (Docs 24–26)

| # | Document | Description |
|---|---|---|
| 24 | [Subscription Plans](24-subscription-plans.md) | Free, Premium, Premium+ — feature comparison |
| 25 | [Entitlement Engine](25-entitlement-engine.md) | Centralized access control per plan |
| 26 | [AI Credits & Billing](26-ai-credits-billing.md) | Credit system, billing adapter, usage tracking |

### 📋 System & Operations (Docs 27–31)

| # | Document | Description |
|---|---|---|
| 27 | [Audit Logging](27-audit-logging.md) | Comprehensive action trail, impersonation-aware, revert/refund logs |
| 28 | [Notifications & Reports](28-notifications-reports.md) | In-app notifications, admin/teacher/student reports |
| 29 | [Entity Versioning & Rollback Engine](29-entity-versioning-rollback.md) | Git-like delta commits, diff inspector, one-click rollback for User Profiles, Questions & Syllabus |
| 30 | [Billing Audit & Refund Engine](30-billing-refund-system.md) | Financial audit logs, payment refund adapter ("return money"), credit clawback |
| 31 | [3-Theme Switcher & Database Multilingual Engine](31-i18n-localization-theme-engine.md) | 3 visual theme modes (`LIGHT`, `GRAY`, `DARK`) & 22 official Indian languages + English database i18n engine |

---

## How to Use These Documents

1. **Product Team**: Read to understand what we're building
2. **Developers**: Reference during implementation for exact business rules
3. **QA Team**: Use as the source of truth for test case creation
4. **Designers**: Reference for UI screen requirements
5. **New Team Members**: Read to onboard onto any feature area

---

## Cross-Reference Guide

| Feature / Domain | Relevant Functional Specs | Relevant Phase Plans | Key Role Guidelines | Operational Standards |
|---|---|---|---|---|
| **User & Auth Management** | 01, 02, 03, 04, 07, 08, 29 | [Phase 01](../phases/phase-01-foundation.md) | [Software Eng](../roles/14-software-engineer.md), [Backend Eng](../roles/16-backend-engineer.md), [Security Eng](../roles/46-security-engineer.md) | [Security Policy](../guides/08-security-policy.md) |
| **Courses & Syllabus** | 09, 10, 11, 29 | [Phase 02](../phases/phase-02-academic-structure.md) | [Backend Eng](../roles/16-backend-engineer.md), [Data Architect](../roles/25-data-architect.md) | [Database ERD](../guides/01-database-schema-erd.md) |
| **Question Bank & Types** | 12, 13, 14, 29 | [Phase 03](../phases/phase-03-question-bank.md) | [Software Eng](../roles/14-software-engineer.md), [Teacher Spec](03-teacher-profile.md) | [API Catalog](../guides/02-api-reference.md) |
| **Exam Patterns & Generator** | 15, 16, 29 | [Phase 04](../phases/phase-04-exam-pattern.md), [Phase 05](../phases/phase-05-exam-generator.md) | [Solution Architect](../roles/22-solution-architect.md), [Backend Eng](../roles/16-backend-engineer.md) | [Error Code Registry](../guides/09-error-code-registry.md) |
| **Exam Hall & Evaluation** | 17, 18, 29 | [Phase 06](../phases/phase-06-exam-system.md), [Phase 07](../phases/phase-07-exam-archive.md) | [Frontend Eng](../roles/15-frontend-engineer.md), [Performance Eng](../roles/36-performance-engineer.md), [SRE](../roles/40-sre.md) | [Performance SLAs](../guides/14-performance-benchmarks.md) |
| **Analytics & Practice** | 19, 20 | [Phase 08](../phases/phase-08-student-analytics.md), [Phase 09](../phases/phase-09-personalized-practice.md) | [Data Scientist](../roles/27-data-scientist.md), [Full Stack Eng](../roles/17-fullstack-engineer.md) | [Data Flows](../guides/07-data-flow-diagrams.md) |
| **Preview & Impersonation** | 05, 06 | [Phase 10](../phases/phase-10-preview-system.md) | [Full Stack Eng](../roles/17-fullstack-engineer.md), [QA Lead](../roles/38-qa-lead.md) | [Security Policy](../guides/08-security-policy.md) |
| **AI Gateway & Workers** | 21, 22, 23 | [Phase 11](../phases/phase-11-ai-question-system.md), [Phase 12](../phases/phase-12-ai-interview.md) | [AI Engineer](../roles/29-ai-engineer.md), [ML Engineer](../roles/28-ml-engineer.md) | [AI Gateway Spec](../ai-gateway-spec.md) |
| **Billing, Subscriptions & Refunds** | 24, 25, 26, 30 | [Phase 13](../phases/phase-13-subscriptions.md) | [Backend Eng](../roles/16-backend-engineer.md), [Business Analyst](../roles/05-business-analyst.md) | [Third-Party Integrations](../guides/16-third-party-integrations.md) |
| **Hardening & System Audits** | 27, 28, 29, 30 | [Phase 14](../phases/phase-14-production-hardening.md) | [DevOps Eng](../roles/39-devops-engineer.md), [Security Eng](../roles/46-security-engineer.md), [DBA](../roles/52-database-administrator.md) | [CI/CD Pipeline](../guides/11-cicd-pipeline.md) |


