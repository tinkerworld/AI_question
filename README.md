# Adaptive Examination & AI Learning Platform

## Complete System & Software Architecture Master Index

Welcome to the central documentation index for the **Adaptive Examination & AI Learning Platform**. This repository contains complete technical architecture decisions, 14 sequential implementation phase plans with ~1,600+ test cases, 30 functional specifications, 54 developer role guideline documents, and 20 operational standards and guides.

### Root Directory
```
D:\Download\Company\Software\Test os\Exam\
```

---

## 📚 Master Documentation Map (127 Documents | ~1.12 MB)

```
D:\Download\Company\Software\Test os\Exam\
│
├── README.md                                           # Master Project Index (This File)
│
└── docs/
    │
    ├── 🏛️ ARCHITECTURE & CORE STRATEGY
    │   ├── architecture.md                             # Modular Monolith ADRs, DB rules, service events, Versioning & Refund ADRs
    │   ├── ai-gateway-spec.md                          # Provider-agnostic AI Gateway architecture
    │   ├── module-api-spec.md                          # Module boundaries, API contracts & isolation
    │   ├── test-strategy.md                            # Master test pyramid, frameworks & CI strategy
    │   └── phase-dependency-map.md                     # Feature index (111 features) & phase DAG
    │
    ├── 📅 PHASES (14 Implementation Phase Plans | 289 KB)
    │   ├── phases/phase-01-foundation.md              # Auth, Users, RBAC, User Profile Rollback, Audit
    │   ├── phases/phase-02-academic-structure.md      # Course, Subject, Syllabus Tree, Enrollment
    │   ├── phases/phase-03-question-bank.md           # Question Types, CRUD, Git-like Versioning & Rollback
    │   ├── phases/phase-04-exam-pattern.md            # Blueprint Engine, Section Rules, Distributions
    │   ├── phases/phase-05-exam-generator.md          # Auto-Generation Algorithm, Draft Inspection
    │   ├── phases/phase-06-exam-system.md             # Attempt Session, Timer, Submissions, Grading
    │   ├── phases/phase-07-exam-archive.md            # Snapshots, Immutability, Archive Search
    │   ├── phases/phase-08-student-analytics.md       # Mastery Engine, Strengths, Weakness Engine
    │   ├── phases/phase-09-personalized-practice.md   # Weakness Pool, Adaptive Mastery Practice
    │   ├── phases/phase-10-preview-system.md          # Preview Student Persona, Impersonation Mode
    │   ├── phases/phase-11-ai-question-system.md      # AI Gateway Integration, Question Workers
    │   ├── phases/phase-12-ai-interview.md            # STT/TTS, Conversation Engine, Assessment
    │   ├── phases/phase-13-subscriptions.md           # Entitlement Engine, Plans, AI Credits, Refund Engine
    │   └── phases/phase-14-production-hardening.md    # Security, Audit Enhancements, Backup, Hardening
    │
    ├── 📑 SPECS (30 Functional Specifications | 225 KB)
    │   ├── specs/README.md                            # Master Index of Specifications
    │   ├── specs/01-main-admin-profile.md             # Main Admin authority, Rollback & Refund actions
    │   ├── specs/02-sub-admin-profile.md              # Sub-Admin scope, delegated Rollbacks & Refunds
    │   ├── specs/03-teacher-profile.md                # Teacher content creation & versioning tools
    │   ├── specs/04-student-profile.md                # Student learning portal & exam hall
    │   ├── specs/05-preview-student.md                # Preview Student testing persona
    │   ├── specs/06-impersonation-system.md           # Secure audit-logged impersonation
    │   ├── specs/07-authentication-system.md          # JWT auth, token rotation, bcrypt, sessions
    │   ├── specs/08-rbac-permission-system.md         # Atomic permissions & RBAC matrix
    │   ├── specs/09-course-management.md              # Multi-level courses & subjects
    │   ├── specs/10-syllabus-management.md            # Recursive syllabus tree (Unit->Topic->Concept)
    │   ├── specs/11-student-enrollment.md             # Course enrollment lifecycles
    │   ├── specs/12-question-bank.md                  # Question inventory & metadata
    │   ├── specs/13-question-types.md                 # Pluggable question type evaluation rules
    │   ├── specs/14-question-versioning-tags.md       # Question versioning & tag taxonomy
    │   ├── specs/15-exam-pattern.md                   # Pattern blueprints & section rules
    │   ├── specs/16-exam-generator.md                 # Question balancing & generation rules
    │   ├── specs/17-exam-system.md                    # Exam hall UX, timer, state & auto-grading
    │   ├── specs/18-published-exam-archive.md         # Immutable exam snapshots & answer keys
    │   ├── specs/19-mastery-engine.md                 # Weighted scoring & proficiency color maps
    │   ├── specs/20-personalized-practice.md          # Adaptive practice & mastery confirmation
    │   ├── specs/21-ai-gateway.md                     # Provider adapters (Local/Cloud), LLM routing
    │   ├── specs/22-ai-question-system.md             # AI modification & prompt templates
    │   ├── specs/23-ai-interview-system.md            # STT/TTS engine & assessment rubrics
    │   ├── specs/24-subscription-plans.md             # Tiered plans (Free, Premium, Premium+)
    │   ├── specs/25-entitlement-engine.md             # Centralized access control per plan
    │   ├── specs/26-ai-credits-billing.md             # Credit consumption & billing adapter
    │   ├── specs/27-audit-logging.md                  # System audit log, revert & refund tracking
    │   ├── specs/28-notifications-reports.md          # Notifications & aggregate report engine
    │   ├── specs/29-entity-versioning-rollback.md     # Git-like Delta Engine, Visual Diff & One-Click Rollback
    │   └── specs/30-billing-refund-system.md          # Financial Audit Logs, Gateway Refund Adapter ("Return Money")
    │
    ├── 👥 ROLES (54 Developer Guidelines & Boundaries | 435 KB)
    │   ├── roles/README.md                            # Role index & cross-team matrix
    │   ├── roles/01-project-manager.md ... 04-program-manager.md         (Management)
    │   ├── roles/05-business-analyst.md ... 08-technical-writer.md        (Analysis/Process)
    │   ├── roles/09-ux-designer.md ... 13-design-system-designer.md       (Design)
    │   ├── roles/14-software-engineer.md ... 18-api-developer.md          (Core Eng)
    │   ├── roles/19-mobile-developer.md ... 20-desktop-developer.md       (Platforms)
    │   ├── roles/21-software-architect.md ... 26-data-engineer.md        (Architecture)
    │   ├── roles/27-data-scientist.md ... 32-analytics-engineer.md        (AI & Data)
    │   ├── roles/33-qa-engineer.md ... 38-qa-lead.md                     (QA & Test)
    │   ├── roles/39-devops-engineer.md ... 45-build-engineer.md          (DevOps/Infra)
    │   ├── roles/46-security-engineer.md ... 51-penetration-tester.md    (Security)
    │   └── roles/52-database-administrator.md ... 54-data-platform-eng.md (Database)
    │
    └── 🛠️ GUIDES (20 Operational Standards & Policies | 104 KB)
        ├── guides/README.md                           # Operational index
        ├── guides/01-database-schema-erd.md           # Complete ERD with entity_versions & refund_transactions
        ├── guides/02-api-reference.md                 # Complete 200+ endpoint catalog (with rollback & refund APIs)
        ├── guides/03-coding-standards.md              # Code conventions, linting & review rules
        ├── guides/04-git-workflow.md                  # Trunk-based workflow, PRs, semantic tags
        ├── guides/05-environment-setup.md             # Day-1 setup guide, Docker, env vars
        ├── guides/06-glossary.md                      # 50+ domain terms defined
        ├── guides/07-data-flow-diagrams.md            # 10 Mermaid sequence flows
        ├── guides/08-security-policy.md               # OWASP Top 10 & security controls
        ├── guides/09-error-code-registry.md           # Standardized error code map (AUTH_001...)
        ├── guides/10-monitoring-alerting.md           # Metrics, dashboards & alerts
        ├── guides/11-cicd-pipeline.md                 # GitHub Actions & deployment pipeline
        ├── guides/12-onboarding-guide.md              # 5-day developer onboarding plan
        ├── guides/13-design-system.md                 # Design tokens & UI components
        ├── guides/14-performance-benchmarks.md        # Latency budgets & concurrency targets
        ├── guides/15-disaster-recovery.md             # RTO/RPO, backup & failover runbooks
        ├── guides/16-third-party-integrations.md       # Payment, email & storage adapters
        ├── guides/17-compliance-legal.md              # GDPR, WCAG & content licensing
        ├── guides/18-user-guides.md                   # User documentation plan
        ├── guides/19-estimation-timeline.md           # Phase effort estimates & milestones
        └── guides/20-risk-register.md                 # 23 project risks & mitigations
```

---

## 🛠️ Shared Workspace Packages

- `@repo/database`: Centralized Prisma client (`User`, `Role`, `Permission`, `AuditLog`, `EntityVersion`, `RefundTransaction`).
- `@repo/types`: Shared DTOs, API envelopes, AuthContext, Versioning & Refund types.
- `@repo/validation`: Zod schemas for auth, users, content, versioning, and refunds.
- `@repo/permissions`: Granular permission constants and role mapping matrices.
- `@repo/versioning-engine`: Git-like commit history, delta generator, visual diff calculator, and revert engine.
- `@repo/ai-client`: SDK for communicate with Python FastAPI AI Gateway.
- `@repo/mastery-engine`: Proficiency calculation and weakness pool extraction algorithms.
- `@repo/entitlement-engine`: Feature availability and credit balance checkers.
- `@repo/question-types`: Question type evaluation rules and schemas.

---

## 🎯 Architecture Decision Summary (ADRs)

1. **Modular Monolith First**: Keep single deployment unit with hard module boundaries (`apps/api/src/modules/`).
2. **API is the Product**: Backend exposes 100% of logic via versioned REST APIs.
3. **Universal AI Gateway**: Python FastAPI service acts as single point of contact for AI requests.
4. **Permissions over Role Checks**: Auth middleware checks atomic permissions, never hard-coded role strings.
5. **Git-Like Entity Versioning & Rollback Engine**: Immutable commit log (`entity_versions`) for User Profiles, Questions, Exam Patterns, Exams, and Syllabus Nodes with visual diffs and non-destructive revert commits.
6. **Financial Audit & Refund Adapter Engine**: Pluggable refund adapter ("return money") with mandatory audit logging, credit clawbacks, and entitlement adjustments.
7. **Frozen Published Exam Snapshots**: Published exams create immutable JSON snapshots of questions, answers, and patterns.
8. **Centralized Entitlement Enforcement**: Component features consult `@repo/entitlement-engine` to verify subscription capabilities.
9. **Isolated Preview Persona**: Preview Student persona allows staff to test all plan levels and draft content securely without real payment credentials.
10. **Mobile Strategy**: Native mobile app is out of scope for the current build. Sequence is (1) full desktop web, (2) mobile-responsive/bootstrap web, (3) native mobile app — to be scoped only after (1) and (2) are complete.
11. **Single Source of Truth for API Contracts**: `docs/guides/02-api-reference.md` is the single source of truth for all API endpoint paths, methods, and permission strings (`resource.action` dot notation).
12. **3-Theme Switcher & Database-Driven Multilingual Engine**: 3 visual modes (`LIGHT`, `GRAY` slate low-contrast, `DARK`) & 22 official Indian languages + English (23 baseline languages) with extensible database translation storage.

---

## 🚀 Quick Start Guide for Developers

```bash
# 1. Install Dependencies
pnpm install

# 2. Migrate Database Schema (Native PostgreSQL 16 Engine / PGlite)
pnpm db:migrate

# 3. Seed Personas, Academic Syllabus, 120 Question Bank Items & JEE Main Blueprint
pnpm db:seed

# 4. Start Monorepo Services (API, Web UI, Build Tracker)
pnpm dev
# (or run start_all.bat on Windows)

# 5. Execute Test Suites across Workspace
pnpm test
```
