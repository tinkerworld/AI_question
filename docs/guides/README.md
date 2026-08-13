# Guides, Policies & Standards — Master Index

## Purpose

This directory contains operational guides, technical standards, security policies, and reference documentation that the team needs to build and maintain the platform.

---

## Document Index

### 🔴 Critical — Required Before Coding

| # | Document | Description |
|---|---|---|
| 01 | [Database Schema & ERD](01-database-schema-erd.md) | Complete entity-relationship diagram, all tables, all relationships, all indexes |
| 02 | [API Reference Catalog](02-api-reference.md) | Master catalog of all ~200+ API endpoints across all modules |
| 03 | [Coding Standards & Conventions](03-coding-standards.md) | Naming, formatting, imports, error handling, PR template, code review checklist |
| 04 | [Git Workflow & Branching Strategy](04-git-workflow.md) | Branch naming, PR process, merge strategy, release process, hooks |
| 05 | [Environment Setup Guide](05-environment-setup.md) | Step-by-step local dev setup, Docker, environment variables, troubleshooting |
| 06 | [Glossary & Domain Terminology](06-glossary.md) | 50+ platform-specific terms defined with context and examples |

### 🟡 High Priority — During Phase 1

| # | Document | Description |
|---|---|---|
| 07 | [Data Flow Diagrams](07-data-flow-diagrams.md) | Visual Mermaid diagrams for 10 key workflows |
| 08 | [Security Policy & OWASP](08-security-policy.md) | OWASP Top 10, data classification, encryption, exam integrity |
| 09 | [Error Code Registry](09-error-code-registry.md) | Centralized registry of 100+ error codes organized by module |
| 10 | [Monitoring & Alerting Strategy](10-monitoring-alerting.md) | Metrics, dashboards, alerts, on-call |

### 🟢 Medium Priority — Phase 2-3

| # | Document | Description |
|---|---|---|
| 11 | [CI/CD Pipeline Specification](11-cicd-pipeline.md) | GitHub Actions stages, quality gates, deployment, rollback |
| 12 | [Developer Onboarding Guide](12-onboarding-guide.md) | Day 1-5 checklist, role-specific onboarding |
| 13 | [UI/UX Design System](13-design-system.md) | Design tokens, component library, accessibility, dark mode |
| 14 | [Performance Benchmarks & SLAs](14-performance-benchmarks.md) | Response time targets, concurrent users, load test scenarios |

### 🔵 Low Priority — Phase 4+

| # | Document | Description |
|---|---|---|
| 15 | [Disaster Recovery & Backup Plan](15-disaster-recovery.md) | RTO/RPO, backup strategy, failover, exam recovery |
| 16 | [Third-Party Integration Guide](16-third-party-integrations.md) | Payment, email, storage, SMS adapter patterns |
| 17 | [Compliance & Legal](17-compliance-legal.md) | GDPR, accessibility, AI ethics, exam integrity |
| 18 | [User Manual Plan](18-user-guides.md) | Plan for student/teacher/admin user documentation |
| 19 | [Estimation & Timeline](19-estimation-timeline.md) | Per-phase effort estimates, critical path, team scaling |
| 20 | [Risk Register](20-risk-register.md) | 23 identified risks with mitigation strategies |

---

## Cross-Reference & Navigation Matrix

| Work Scenario | Essential Operational Guides | Target Functional Specs | Relevant Implementation Phase | Key Role Guidelines |
|---|---|---|---|---|
| **Local Dev Setup & Conventions** | [Setup Guide](05-environment-setup.md), [Coding Standards](03-coding-standards.md), [Git Workflow](04-git-workflow.md), [Glossary](06-glossary.md) | N/A | [Phase 01](../phases/phase-01-foundation.md) | [Software Eng](../roles/14-software-engineer.md), [DevOps](../roles/39-devops-engineer.md) |
| **Database Schema & Migrations** | [DB Schema & ERD](01-database-schema-erd.md) | [Spec 07](../specs/07-authentication-system.md) - [Spec 28](../specs/28-notifications-reports.md) | [Phase 01](../phases/phase-01-foundation.md) - [Phase 14](../phases/phase-14-production-hardening.md) | [Data Architect](../roles/25-data-architect.md), [DBA](../roles/52-database-administrator.md), [Database Eng](../roles/53-database-engineer.md) |
| **API Endpoints Implementation** | [API Catalog](02-api-reference.md), [Error Codes](09-error-code-registry.md), [Coding Standards](03-coding-standards.md) | [Spec 07](../specs/07-authentication-system.md) - [Spec 28](../specs/28-notifications-reports.md) | All Phases | [API Developer](../roles/18-api-developer.md), [Backend Eng](../roles/16-backend-engineer.md) |
| **CI/CD & Deployment Pipeline** | [CI/CD Spec](11-cicd-pipeline.md), [Git Workflow](04-git-workflow.md), [Security Policy](08-security-policy.md) | N/A | [Phase 01](../phases/phase-01-foundation.md), [Phase 14](../phases/phase-14-production-hardening.md) | [DevOps Eng](../roles/39-devops-engineer.md), [DevSecOps](../roles/50-devsecops-engineer.md), [Build Eng](../roles/45-build-engineer.md) |
| **UI/UX & Component Creation** | [Design System](13-design-system.md), [Glossary](06-glossary.md) | [Spec 03](../specs/03-teacher-profile.md), [Spec 04](../specs/04-student-profile.md) | [Phase 01](../phases/phase-01-foundation.md) - [Phase 12](../phases/phase-12-ai-interview.md) | [Frontend Eng](../roles/15-frontend-engineer.md), [UI Designer](../roles/10-ui-designer.md), [UX Designer](../roles/09-ux-designer.md) |
| **Security Audits & Hardening** | [Security Policy](08-security-policy.md), [Compliance & Legal](17-compliance-legal.md) | [Spec 07](../specs/07-authentication-system.md), [Spec 08](../specs/08-rbac-permission-system.md), [Spec 27](../specs/27-audit-logging.md) | [Phase 01](../phases/phase-01-foundation.md), [Phase 14](../phases/phase-14-production-hardening.md) | [Security Eng](../roles/46-security-engineer.md), [Penetration Tester](../roles/51-penetration-tester.md) |
| **Performance Tuning & SLAs** | [Performance Benchmarks](14-performance-benchmarks.md), [Monitoring](10-monitoring-alerting.md) | [Spec 17](../specs/17-exam-system.md), [Spec 21](../specs/21-ai-gateway.md) | [Phase 06](../phases/phase-06-exam-system.md), [Phase 14](../phases/phase-14-production-hardening.md) | [Performance Eng](../roles/36-performance-engineer.md), [SRE](../roles/40-sre.md) |
| **New Team Member Onboarding** | [Onboarding Guide](12-onboarding-guide.md), [Setup Guide](05-environment-setup.md), [Glossary](06-glossary.md) | [Specs Index](../specs/README.md) | [Phase Map](../phase-dependency-map.md) | All Role Docs in [`docs/roles/`](../roles/README.md) |
| **Disaster Recovery & Failover** | [Disaster Recovery](15-disaster-recovery.md), [Monitoring](10-monitoring-alerting.md) | N/A | [Phase 14](../phases/phase-14-production-hardening.md) | [SRE](../roles/40-sre.md), [Cloud Architect](../roles/24-cloud-architect.md), [DBA](../roles/52-database-administrator.md) |

