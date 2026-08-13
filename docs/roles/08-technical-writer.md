# Technical Writer — Developer Guidelines & Responsibilities

## 1. Role Overview
Owns API documentation, user guides, developer onboarding docs, and release notes for the Adaptive Examination & AI Learning Platform. Ensures all documentation supports the API-first paradigm and the modular monolith architecture.

## 2. Core Responsibilities
1. Maintain accurate OpenAPI/Swagger documentation for all API endpoints.
2. Create and maintain the developer onboarding guide.
3. Document the Next.js 15, Express API, and FastAPI integrations.
4. Write clear changelog entries and release notes for each of the 14 phases.
5. Provide comprehensive user guides for the 111 platform features.
6. Support the testing strategy by documenting test execution processes (~1,600 test cases).

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Documentation & Guides | OWNS |
| Specs & Design | COLLABORATES |
| Code Implementation | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **Specific Deliverables:** Maintain OpenAPI/Swagger docs, create developer onboarding guide, write changelogs.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Initial onboarding guides and core API docs are published.

### Phase 2 — Academic Structure
- **Specific Deliverables:** Document academic hierarchy APIs and UI guides.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Phase 2 changelogs and API updates are complete.

### Phase 3 — Question Bank Management
- **Specific Deliverables:** Document Question Bank schemas and user workflows.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Documentation accurately reflects all Phase 3 endpoints.

### Phase 4 — Exam Creation & Configuration
- **Specific Deliverables:** Create guides for exam configuration interfaces.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Full documentation of the exam configuration module.

### Phase 5 — Exam Delivery Engine
- **Specific Deliverables:** Document the exam delivery API and performance considerations.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Exam engine APIs are fully detailed with request/response examples.

### Phase 6 — Proctoring & Security
- **Specific Deliverables:** Document security protocols and proctoring workflows.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Security documentation meets compliance standards.

### Phase 7 — AI Evaluation (FastAPI Gateway)
- **Specific Deliverables:** Document the FastAPI Gateway integration and Python ML models.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** AI Gateway API docs are published and integrated with the main API portal.

### Phase 8 — Grading & Results Processing
- **Specific Deliverables:** Document grading algorithms and result API endpoints.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Grading calculations are clearly explained in the developer docs.

### Phase 9 — Analytics & Reporting
- **Specific Deliverables:** Document reporting dashboards and data export APIs.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Analytics documentation provides clear data definitions.

### Phase 10 — Preview System & Sandbox Context
- **Specific Deliverables:** Document Preview Student persona, impersonation workflows, and sandbox environment.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Preview profile isolation mechanics and impersonation tokens are clearly documented.

### Phase 11 — Content Migration & Integrations
- **Specific Deliverables:** Document migration scripts and third-party API webhooks.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Integration guides are complete for external partners.

### Phase 12 — Security, Privacy & Compliance
- **Specific Deliverables:** Publish privacy and compliance documentation.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Compliance docs are approved by legal/security teams.

### Phase 13 — Performance, Scale & Caching
- **Specific Deliverables:** Document caching strategies and performance tuning guides.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** Infrastructure documentation is updated.

### Phase 14 — Final Production Readiness
- **Specific Deliverables:** Final release notes, user manuals, and API doc freeze.
- **Focus:** Align documentation with the API-first, module independence principles.
- **Definition of Done:** All documentation is production-ready and fully audited.

## 5. Key Guidelines
### 5.1 Technical Standards
Ensure all API documentation follows the OpenAPI Specification standard. Maintain Markdown files in the monorepo for source-controlled docs.

### 5.2 Collaboration Model
Work closely with Tech Leads to ensure API docs are accurate, and with the Product Manager to ensure user guides align with actual feature behavior.

### 5.3 Tools & Processes
Use Swagger/Redoc for API documentation generation. Use Git for version control and integrate docs into the CI/CD pipeline where possible.

## 6. Do's ✅
1. Do maintain OpenAPI/Swagger docs for all endpoints.
2. Do create a developer onboarding guide.
3. Do update documentation for each phase.
4. Do write clear release notes.
5. Do document the AI Gateway pattern.
6. Do maintain the modular monolith architecture docs.
7. Do document the Next.js 15 UI components.
8. Do keep Prisma schema docs updated.
9. Do write guides for Playwright and Supertest testing.
10. Do document the 111 features clearly.
11. Do ensure documentation is version-controlled.
12. Do review engineering docs for clarity.
13. Do document B2B organization workflows.
14. Do maintain API-first philosophy in all docs.
15. Do clarify Python FastAPI integration points.

## 7. Don'ts ❌
1. Don't let API docs drift from code.
2. Don't write generic, unhelpful comments.
3. Don't ignore the Python AI server docs.
4. Don't delay release notes.
5. Don't assume developers know the setup steps.
6. Don't use inconsistent terminology.
7. Don't neglect the pnpm + Turborepo setup docs.
8. Don't skip phase-specific changelogs.
9. Don't ignore security & compliance documentation.
10. Don't document features before they are finalized.
11. Don't rely solely on auto-generated docs.
12. Don't clutter docs with outdated info.
13. Don't ignore feedback on user guides.
14. Don't bypass peer review for major doc updates.
15. Don't forget to link to the 1600+ test cases strategies.

## 8. Quality Gates
Documentation must be peer-reviewed for technical accuracy and readability. API docs must accurately reflect the implementation before a feature is marked Done.

## 9. Escalation Path
Escalate undocumented API changes to the Scrum Master. Escalate delays in feature clarification to the Product Manager.

## 10. KPIs & Success Metrics
High accuracy of API documentation, fast onboarding time for new developers, and low volume of clarification requests from API consumers.
