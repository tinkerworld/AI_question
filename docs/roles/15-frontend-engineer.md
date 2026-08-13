<Frontend Engineer — Developer Guidelines & Responsibilities>
## 1. Role Overview
As a Frontend Engineer on the Adaptive Examination & AI Learning Platform, you own the Next.js 15 frontend implementation. You are responsible for delivering a premium, highly responsive user interface using the App Router and React Server Components. You ensure the frontend consumes APIs efficiently and maintains a robust client-side architecture.

## 2. Core Responsibilities
1. Implement the UI using Next.js 15 App Router, distinguishing appropriately between Server and Client Components.
2. Build reusable UI components (e.g., DataTable, RoleGuard) using custom CSS properties for styling (NO Tailwind unless requested).
3. Integrate with the backend API via the generated API client.
4. Manage frontend state and caching securely and efficiently.
5. Implement authentication flows using the central `AuthProvider`.
6. Ensure accessibility (a11y) and responsive design across all devices.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Next.js Frontend Implementation | OWNS |
| UI Component Library | OWNS |
| Frontend State Management | OWNS |
| API Integration | COLLABORATES |
| UX Design Decisions | COLLABORATES |
| Backend Business Logic | OUT OF SCOPE |
| Database Queries | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Set up Next.js 15 App Router, layout, and theming (1.11).
- Implement `AuthProvider`, login pages, and user management UI (1.7, 1.11).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Build course, subject, and syllabus tree UI with drag-and-drop support (2.1, 2.5).
- Implement data fetching using Server Components for academic data.
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Build the question editor and bank browser with filters (3.7).
- Display question versions and tags in the UI (3.3, 3.4).
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- Build the exam pattern builder UI and section editors (4.10).
- Implement visualizers for topic and difficulty distributions (4.4, 4.5).
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Build the interactive UI for draft exam inspection and manual exam creation (5.2, 5.4).
- Handle the UI for generating an exam from a pattern (5.1).
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Build a robust, distraction-free exam taking interface with timers (6.8).
- Implement client-side UI for viewing results and question reviews (6.7).
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Build views for the archive browser and snapshot viewer (7.7).
- Implement UI for the publication workflow (7.1).
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Implement charts and data visualization for the Student Analytics Dashboard (8.6).
- Display the Syllabus Proficiency Map with color-coded nodes (8.4).
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Build the practice paper frontend targeting weakness areas (9.5).
- Display immediate feedback and mastery confirmation (9.3).
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- Implement the preview configuration panel and impersonation UI (10.2, 10.7).
- Ensure the preview mode indicator is always visible when active (10.7).
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Build the real-time UI for the AI question modification and generation wizard (11.9).
- Handle loading states and queue status for AI operations (11.6).
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Implement the interview frontend with audio controls and real-time transcripts (12.11).
- Build the UI for creating and managing interview templates (12.1).
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Build pricing pages, AI credit balances, and the subscription dashboard (13.8).
- Integrate the frontend flow for billing and upgrades (13.2).
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Perform UI polish, animation enhancements, and bundle size optimization (14.5).
- Ensure Lighthouse scores > 90 across all metrics.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- Next.js App Router exclusively; no Pages router.
- Maximize use of React Server Components (RSC) to reduce client JavaScript.
- Use CSS custom properties (`var(--color-primary)`) exclusively for styling. NO Tailwind.
- Enforce strict TypeScript types for all component props.

### 5.2 Collaboration Model
- Work with API Developers to consume OpenAPI specs via typed clients.
- Collaborate with UX Designers to implement pixel-perfect, premium UI.

### 5.3 Tools & Processes
- pnpm for package management.
- Playwright for end-to-end testing of critical user journeys.

## 6. Do's ✅
1. Use React Server Components by default; only add `'use client'` when interactivity is needed.
2. Utilize the `AuthProvider` for all user session checks.
3. Wrap role-restricted UI elements in the `RoleGuard` component.
4. Implement semantic HTML for better accessibility.
5. Use Next.js `Image` and `Link` components for optimizations.
6. Handle loading states gracefully using `loading.tsx` and React Suspense.
7. Implement proper error boundaries using `error.tsx`.
8. Centralize CSS custom properties in a global stylesheet.
9. Keep client components as small and focused as possible.
10. Debounce user inputs on search fields to minimize API calls.
11. Validate form inputs on the client side using Zod before submission.
12. Use the standard `DataTable` component for all tabular data.
13. Write Playwright tests for complex UI flows.
14. Ensure the UI is fully responsive from mobile to desktop.
15. Prefetch data for critical navigation paths.

## 7. Don'ts ❌
1. Do not write business logic in the frontend.
2. Do not make direct API calls without using the generated API client.
3. Do not use inline styles (`style={{...}}`) except for dynamic values.
4. Do not use Tailwind CSS or any utility-first CSS framework.
5. Do not store sensitive information (e.g., tokens) in local storage insecurely.
6. Do not overuse global state managers (e.g., Redux) when local state suffices.
7. Do not mutate state directly; always use state setter functions.
8. Do not fetch data in `useEffect` when Server Components can be used.
9. Do not ignore accessibility (a11y) warnings in the console.
10. Do not create "god components" that handle too many responsibilities.
11. Do not use generic `<div>` tags when semantic elements (`<main>`, `<section>`, `<article>`) apply.
12. Do not bypass the `RoleGuard` for checking permissions.
13. Do not hardcode API endpoints in components.
14. Do not leave debug console logs in production builds.
15. Do not compromise on the premium look and feel of the UI.

## 8. Quality Gates
- Lighthouse scores > 90 for Performance, Accessibility, and SEO.
- Zero TypeScript and ESLint errors.
- Successful execution of all Playwright E2E tests.
- UI passes visual regression and accessibility checks.

## 9. Escalation Path
- API integration issues -> Escalate to API Developer.
- Unclear UI requirements -> Escalate to Product Manager / Designer.
- Performance bottlenecks in Next.js -> Escalate to Technical Architect.

## 10. KPIs & Success Metrics
- Core Web Vitals (LCP, FID, CLS).
- Component reusability rate.
- Number of UI/UX bugs reported in QA.
- Bundle size reduction over phases.
</Frontend Engineer — Developer Guidelines & Responsibilities>
