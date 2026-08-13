# Full Stack Engineer — Developer Guidelines & Responsibilities
## 1. Role Overview
As a Full Stack Engineer on the Adaptive Examination & AI Learning Platform, you are the versatile force capable of implementing features end-to-end. You operate across the Next.js 15 frontend and the Express + TypeScript backend, ensuring smooth integration and holistic feature delivery. You embody both the Frontend and Backend guidelines, bridging the gap to deliver complete, functional increments.

## 2. Core Responsibilities
1. Implement end-to-end features, spanning from the database schema to the UI component.
2. Adhere to BOTH Frontend (Next.js App Router, CSS custom properties) and Backend (Express, Prisma, Zod) guidelines.
3. Ensure seamless integration between the API and the client application.
4. Write comprehensive tests across the stack (Vitest, Supertest, Playwright).
5. Act as the key integration person, resolving cross-stack impediments.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| End-to-End Feature Implementation | OWNS |
| API to Frontend Integration | OWNS |
| Cross-stack Testing | OWNS |
| Frontend Architecture | COLLABORATES |
| Backend Architecture | COLLABORATES |
| Infrastructure Deployment | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **1.1 Monorepo Setup & 1.11 Frontend Foundation:** Setup Turborepo, Express API, and Next.js 15 UI boilerplate.
- **1.6 Authentication System:** Deliver end-to-end user login flows (API + Next.js pages).
- **1.7 User Management & 1.8 Role & Permission Management:** Implement full-stack CRUD for users and roles.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- **2.1 Course Management to 2.5 Course-Subject-Syllabus Frontend:** Deliver end-to-end management screens for courses, subjects, and the syllabus tree builder with drag-and-drop.

### Phase 3 — Question Bank
- **3.2 Question CRUD & 3.7 Question Bank Frontend:** Implement full-stack question editor and browser.

### Phase 4 — Exam Pattern
- **4.1 Exam Pattern CRUD & 4.10 Exam Pattern Frontend:** Build the exam pattern UI and its backend APIs.
- **4.8 Exam Pattern Validation Engine:** End-to-end flow for validating patterns.

### Phase 5 — Exam Generator
- **5.1 Exam Generation Engine & 5.2 Draft Exam Inspection:** Build E2E flow to generate and preview an exam in the UI.

### Phase 6 — Exam System
- **6.3 Answer Submission & 6.8 Exam-Taking Frontend:** Implement the full-stack student exam interface and backend submission.

### Phase 7 — Exam Archive
- **7.1 Exam Publication Workflow & 7.7 Archive Frontend:** Build the archive browser, publication workflows, and snapshot retrieval.

### Phase 8 — Student Analytics
- **8.1 Mastery Engine & 8.6 Student Analytics Dashboard:** Deliver the full-stack proficiency map and dashboard.

### Phase 9 — Personalized Practice
- **9.2 Personalized Practice Paper Generation & 9.5 Practice Paper Frontend:** Implement the practice generation wizard and interface.

### Phase 10 — Preview System
- **10.2 Preview Configuration UI & 10.7 Preview Frontend:** Build the end-to-end impersonation control panel and preview workflow.

### Phase 11 — AI Question System
- **11.4 AI Question Generation Worker & 11.9 AI Question Frontend:** Connect Next.js UI to AI generation workers via Express API.

### Phase 12 — AI Interview
- **12.3 Controlled Natural Conversation Engine & 12.11 Interview Frontend:** Implement the full-stack audio interview experience.

### Phase 13 — Subscriptions
- **13.2 Subscription Management & 13.8 Subscription Frontend:** Build the billing dashboard and integrate payment flows.

### Phase 14 — Production Hardening
- **14.5 Performance Optimization & 14.9 Deployment Configuration:** Address cross-stack bugs and perform holistic performance tuning.

## 5. Key Guidelines
### 5.1 Technical Standards
- Must rigorously follow the standards outlined in both the Frontend Engineer and Backend Engineer guidelines.
- Maintain a strict boundary between client logic and server logic.
- Ensure API changes are immediately reflected and typed in the frontend client.

### 5.2 Collaboration Model
- Work closely with UI/UX designers for frontend needs and Technical Architects for backend schemas.
- Act as a translator between specialized Frontend and Backend engineers.

### 5.3 Tools & Processes
- Proficient in full monorepo toolchain (pnpm, Turborepo).
- Responsible for ensuring E2E Playwright tests cover the features they build.

## 6. Do's ✅
1. Follow BOTH the Frontend and Backend Do's lists meticulously.
2. Plan the API contract before starting the frontend implementation.
3. Validate data twice: once on the client (UI feedback) and once on the server (Security).
4. Utilize the generated API client for all frontend data fetching.
5. Keep pull requests logically grouped (e.g., API PR followed by Frontend PR, or a unified PR for small features).
6. Ensure Server Components in Next.js are utilized efficiently alongside the Express API.
7. Write E2E tests for features you implement end-to-end.
8. Manage state appropriately, keeping UI state strictly on the client.
9. Handle loading and error states holistically from server response to UI rendering.
10. Respect module boundaries on the backend while delivering cohesive UI on the frontend.
11. Use shared TypeScript interfaces where appropriate (via a shared package).
12. Optimize the entire request lifecycle (Network -> API -> DB -> API -> Network -> UI).
13. Keep security in mind at every layer.
14. Communicate integration challenges early.
15. Maintain high code quality across the entire stack.

## 7. Don'ts ❌
1. Do not violate ANY rules from the Frontend or Backend Don'ts lists.
2. Do not bypass the Express API by connecting the Next.js app directly to the database.
3. Do not blur the lines between client and server logic in Next.js.
4. Do not assume client-side validation is sufficient; always validate on the backend.
5. Do not duplicate business logic on the frontend; keep it in the Express API.
6. Do not introduce cross-module dependencies in the backend just to make a frontend view easier to build.
7. Do not neglect either side of the stack; ensure both UI polish and backend robustness.
8. Do not forget to handle API error responses gracefully in the UI.
9. Do not use Next.js API routes; use the dedicated Express API.
10. Do not leave the frontend waiting infinitely without a timeout or error state.
11. Do not over-fetch data; tailor API responses or use specific endpoints.
12. Do not ignore TypeScript warnings in either environment.
13. Do not push E2E features without corresponding automated tests.
14. Do not compromise on the modular monolith architecture for speed.
15. Do not silo knowledge; share cross-stack insights with specialists.

## 8. Quality Gates
- Code passes all gates for both Frontend and Backend roles.
- Successful execution of Playwright E2E tests for the feature.
- Seamless integration demonstrated in a staging environment.

## 9. Escalation Path
- Complex architectural conflicts -> Escalate to Technical Architect.
- Unclear feature scope -> Escalate to Product Manager.
- Blocked by infrastructure -> Escalate to DevOps Engineer.

## 10. KPIs & Success Metrics
- Velocity of delivering complete end-to-end features.
- Number of integration bugs found in QA.
- Consistent quality across both frontend and backend codebases.
