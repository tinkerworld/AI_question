# Business Analyst — Developer Guidelines & Responsibilities

## 1. Role Overview
Owns requirements analysis, process modeling, gap analysis, documentation for the Adaptive Examination & AI Learning Platform. Ensures all requirements align with the API-first, modular monolith architecture across Next.js, Express, and FastAPI.

## 2. Core Responsibilities
1. Translate high-level business goals into precise functional specifications.
2. Ensure alignment with the 14 phases and 111 features.
3. Collaborate across the modular monolith architecture (Next.js 15, Express API, FastAPI).
4. Drive API-first strategies in daily work.
5. Define and validate business rules in phase plans.
6. Support the testing strategy by defining clear acceptance criteria for the ~1,600 test cases.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Requirements & Process Docs | OWNS |
| Product & Design | COLLABORATES |
| Implementation | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **Specific Deliverables:** Core setup specs and process maps. Map 1.6 Authentication System, 1.7 User Management, and 1.8 Role & Permission Management to functional specs.
- **Focus:** Align role outputs with the API-first, module independence principles.
- **Definition of Done:** Artifacts and processes for this phase meet role-specific standards and are integrated with the Next.js/Express stack.

### Phase 2 — Academic Structure
- **Specific Deliverables:** Academic hierarchy and structure specs. Map 2.3 Syllabus Tree and 2.6 Student Course Enrollment to functional specs.
- **Focus:** Align data taxonomies with actual curriculum standards.
- **Definition of Done:** Documentation finalized for courses, subjects, and the full syllabus tree.

### Phase 3 — Question Bank
- **Specific Deliverables:** Question bank management flows and rule definition. Map 3.1 Pluggable Question Type System and 3.5 Question Lifecycle.
- **Focus:** Define schemas and validations for each question type.
- **Definition of Done:** Question tagging, versioning, and CRUD specs are signed off.

### Phase 4 — Exam Pattern
- **Specific Deliverables:** Exam pattern blueprints and rule specifications. Map 4.3 Section Question Rules and 4.4 Topic Distribution.
- **Focus:** Validate constraints of the 4.8 Exam Pattern Validation Engine.
- **Definition of Done:** Blueprint configurations fully mapped out.

### Phase 5 — Exam Generator
- **Specific Deliverables:** Generation workflows and validations. Map 5.1 Exam Generation Engine and 5.4 Manual Exam Creation.
- **Focus:** Define edge cases for missing questions matching constraints.
- **Definition of Done:** Generation algorithms business rules are fully documented.

### Phase 6 — Exam System
- **Specific Deliverables:** Exam delivery rules and validations. Map 6.3 Answer Submission & Types, 6.5 Auto-Evaluation Engine.
- **Focus:** Detail the exact workflows for time expiry, auto-submit, and proctoring events.
- **Definition of Done:** Real-time exam-taking behaviors are specified.

### Phase 7 — Exam Archive
- **Specific Deliverables:** Archival rules and preservation specs. Map 7.1 Exam Publication Workflow and 7.3 Answer Key Preservation.
- **Focus:** Ensure historical records strictly maintain immutability.
- **Definition of Done:** Exam publication and snapshot state rules defined.

### Phase 8 — Student Analytics
- **Specific Deliverables:** Analytics metrics and reporting formats. Map 8.1 Mastery Engine, 8.2 Strengths Identification, and 8.3 Weakness Identification.
- **Focus:** Define calculation rules for the proficiency map.
- **Definition of Done:** Student and teacher analytics logic documented.

### Phase 9 — Personalized Practice
- **Specific Deliverables:** Adaptive generation rules. Map 9.1 Weakness Pool Generation and 9.3 Adaptive Mastery Confirmation.
- **Focus:** Define rules for identifying weaknesses and confirming mastery post-practice.
- **Definition of Done:** The student learning loop is completely spec'd.

### Phase 10 — Preview System
- **Specific Deliverables:** Preview and impersonation specs. Map 10.3 Impersonation System and 10.6 Preview Workflow.
- **Focus:** Detail security boundaries and audit trail requirements (10.5) for previews.
- **Definition of Done:** Secure preview behaviors and limitations defined.

### Phase 11 — AI Question System
- **Specific Deliverables:** AI workflows and fallback rules. Map 11.3 AI Question Modification Worker and 11.4 AI Question Generation Worker.
- **Focus:** Document 11.1 AI Gateway Architecture adapter behaviors and prompt templates.
- **Definition of Done:** AI question-generation capabilities and limitations are clear.

### Phase 12 — AI Interview
- **Specific Deliverables:** Conversational logic and evaluation rules. Map 12.3 Controlled Natural Conversation Engine and 12.6 Interview Assessment Engine.
- **Focus:** Define rubrics used by AI for interview feedback.
- **Definition of Done:** Interview flow and assessment specs signed off.

### Phase 13 — Subscriptions
- **Specific Deliverables:** Entitlement mapping and billing integration specs. Map 13.1 Entitlement Engine and 13.3 AI Credit System.
- **Focus:** Detail access rules for Free vs Premium vs Premium+ users.
- **Definition of Done:** Paywall logic and credit deduction rules are mapped.

### Phase 14 — Production Hardening
- **Specific Deliverables:** Compliance rules and non-functional requirements. Map 14.8 Data Privacy & Compliance and 14.1 Security Hardening.
- **Focus:** Ensure GDPR/privacy policies map to data deletion and retention rules.
- **Definition of Done:** Final production readiness criteria signed off.

## 5. Key Guidelines
### 5.1 Technical Standards
Strict adherence to project tech stack (pnpm monorepo, Next.js 15, Postgres+Prisma, Python FastAPI). Specs must clearly articulate how requirements map to these technologies.

### 5.2 Collaboration Model
Work closely with Tech Leads, QA, and Product Owners to ensure smooth execution and full requirement comprehension.

### 5.3 Tools & Processes
Use Turborepo, Jira, GitHub, and standard CI/CD tools. Documentation is managed in Markdown in the `docs/specs/` directory.

## 6. Do's ✅
1. Do map every feature to functional specs.
2. Do validate business rules in phase plans.
3. Do maintain traceability between requirements and API endpoints.
4. Do ensure Edge cases are documented for AI evaluation.
5. Do focus on modular independence in process models.
6. Do engage closely with engineers during backlog grooming.
7. Do ensure acceptance criteria are testable (Supertest/Playwright).
8. Do document fallback scenarios for the AI Gateway.
9. Do define rules for multi-tenancy in B2B modules.
10. Do keep documentation DRY.
11. Do write clear Given-When-Then BDD scenarios.
12. Do review Prisma schema changes for business alignment.
13. Do map legacy data for content migration.
14. Do define exact grading calculations.
15. Do ensure privacy compliance rules are explicitly stated.

## 7. Don'ts ❌
1. Don't write vague requirements.
2. Don't design database schemas.
3. Don't ignore the API-first principle.
4. Don't leave acceptance criteria open-ended.
5. Don't assume AI evaluation is 100% accurate.
6. Don't let feature creep expand the 111 baseline features.
7. Don't write test cases yourself (that's QA).
8. Don't ignore B2B organization isolation rules.
9. Don't bypass the FastAPI vs Express API separation.
10. Don't conflate proctoring rules with exam delivery rules.
11. Don't skip documenting exam attempt lifecycles.
12. Don't forget performance requirements.
13. Don't approve features without stakeholder sign-off.
14. Don't assume UI-only workflows.
15. Don't ignore Next.js frontend constraints.

## 8. Quality Gates
Work must pass peer review and align with the API-first architecture before merging or approval. All acceptance criteria must be explicitly defined and testable.

## 9. Escalation Path
Escalate conflicting stakeholder requirements to the Product Manager. Escalate technical blockers to the Engineering Lead.

## 10. KPIs & Success Metrics
Delivery of phase goals on time, minimal rework, zero ambiguous requirements during sprint planning, and positive feedback from cross-functional teams.
