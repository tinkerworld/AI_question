# Developer Onboarding Guide

Welcome to the Adaptive Examination & AI Learning Platform team! This guide will take you through your first week on the project.

## Week 1 Schedule

### Day 1 — Environment & Access
**Goal:** Get your machine ready and connect to all systems.
- [ ] Request accounts for GitHub, Jira (or equivalent project management tool), and Slack/Teams.
- [ ] Clone the monorepo from GitHub.
- [ ] Follow `[05-environment-setup.md](05-environment-setup.md)` to install Node.js, pnpm, Docker, PostgreSQL 16, and Python/uv.
- [ ] Read the root `README.md` and `architecture.md`.
- [ ] Schedule a 15-minute sync with your team lead or onboarding buddy.
- [ ] Start the application locally (`pnpm install`, `pnpm run setup:dev`, `pnpm dev`).
- [ ] Run the complete test suite locally to ensure everything works (`pnpm test`).

### Day 2 — Architecture & Domain
**Goal:** Understand what we are building and how the codebase is structured.
- [ ] Read `[06-glossary.md](06-glossary.md)` to familiarize yourself with domain terms (e.g., Mastery, Attempts, Syllabus).
- [ ] Read `module-api-spec.md` to understand the boundaries between auth, users, exams, ai, etc.
- [ ] Review `[03-coding-standards.md](03-coding-standards.md)` to learn our conventions for TypeScript, Express, Next.js, and FastAPI.
- [ ] Read the specific role guideline for your position in `docs/roles/`.
- [ ] Study 2-3 functional specs (e.g., `../specs/07-authentication-system.md`, `../specs/17-exam-system.md`) relevant to your area.

### Day 3 — Codebase Deep Dive
**Goal:** Get hands-on with the code and testing practices.
- [ ] Read the implementation plan for the current development phase (e.g., Phase 1).
- [ ] Trace a complete API request end-to-end. For example: trace a User Login from Next.js routing → API route → Express controller → auth service → Prisma repository → JSON response.
- [ ] Write one unit test for an existing utility function in `@repo/validation` or `@repo/database` to learn our Vitest setup.
- [ ] Review 2 recently merged Pull Requests to observe team review practices and CI pipeline integration.

### Day 4 — First Contribution
**Goal:** Ship your first piece of code.
- [ ] Check the issue tracker and pick a starter task labeled `good-first-issue`.
- [ ] Create a feature branch following our branching strategy outlined in `04-git-workflow.md`.
- [ ] Implement the feature or bug fix, including relevant unit tests.
- [ ] Open a Pull Request and request review from your onboarding buddy.

### Day 5 — Integration
**Goal:** Become a fully integrated team member.
- [ ] Attend the daily team standup and report your progress.
- [ ] Address review feedback, get your PR approved, and merge it.
- [ ] Pair program or shadow a team member on a more complex task to learn advanced codebase patterns.
- [ ] Document any friction points you found during onboarding and update this guide if necessary.

---

## Role-Specific Onboarding Additions

### Frontend Developer (Next.js)
- Review the `13-design-system.md` document.
- Familiarize yourself with App Router conventions, React Server Components (RSC), and Tailwind CSS setup in `apps/web`.
- Understand the 5 user profile views (Main Admin, Sub-Admin, Teacher, Student, Preview Student).

### Backend Developer (Node.js/Express)
- Review `01-database-schema-erd.md` and Prisma migration workflows.
- Understand the custom JWT authentication (15m access / 7d refresh) and RBAC implementation (`@repo/permissions`).
- Review error handling and logging middleware in `apps/api`.

### AI Engineer (Python/FastAPI)
- Review the AI Gateway pattern architecture.
- Learn how to run and configure local models (Ollama, LM Studio) versus cloud providers (OpenAI, Anthropic).
- Study the pytest suite in `apps/ai-server`.

### DevOps / Infrastructure
- Review `11-cicd-pipeline.md`.
- Check AWS/GCP infrastructure configuration, Dockerfiles, and caching strategies.

### QA Engineer
- Review `../test-strategy.md` and `14-performance-benchmarks.md`.
- Run Playwright E2E tests and learn how to generate test coverage reports.

### UI/UX Designer
- Gain access to the Figma files matching `13-design-system.md`.
- Review component states, accessibility constraints (WCAG 2.1 AA), and responsiveness breakpoints.

## Onboarding Checklist Template
*(Copy this section into an issue ticket for each new hire)*
- [ ] Accounts provisioned
- [ ] Local environment running
- [ ] Architecture docs reviewed
- [ ] First PR merged
- [ ] Met with all key stakeholders
