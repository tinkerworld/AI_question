# Feature: In-App Help & Onboarding System

## 1. Purpose
The In-App Help & Onboarding system provides contextual assistance, role-tailored step-by-step product walkthroughs, an in-app Knowledge Base drawer, interactive feature tooltips, and a Keyboard Shortcuts cheat sheet. It guides first-time students, teachers, and administrators through core workflows, reducing confusion and support overhead.

## 2. Current State
Verified against the codebase:
- No interactive walkthrough tours, contextual help drawers, onboarding modals, or keyboard shortcut overlays exist in the web application.
- New users landing on the platform must explore the interface without guided cues.

## 3. Problem / Requirement
ExamOS contains rich multi-layered features (Exam Blueprints, Question Bank version history, AI Interviews, Oral Rubrics, Analytics Trees, Entitlement Guardrails):
- **First-Time User Confusion**: New students need a brief 3-step tour showing where to find tests, take interviews, and check scores.
- **Teacher Workflow Guidance**: New teachers need guidance on how to author questions with AI assistance, build blueprint patterns, and review draft submissions.
- **Contextual Help**: Users should be able to click a `?` help button on any screen to view relevant FAQs and guides without navigating away from their active work.
- **Keyboard Shortcuts**: Power users and exam candidates need quick keyboard access (e.g. `1-4` for MCQ options, `Ctrl+Enter` to submit, `N` for next question).

## 4. Proposed Solution
1. Implement a lightweight, zero-bloat Product Tour engine in `apps/web/src/components/help/ProductTour.tsx` with role-specific step sequences.
2. Create `help_articles` data model and an in-app slide-out Help Drawer accessible via top navbar `?` icon.
3. Build a Global Keyboard Shortcut Manager (`useKeyboardShortcuts.ts`) and a shortcut cheat sheet modal triggered by pressing `?` or `Ctrl+/`.
4. Track user onboarding completion state in `user_preferences` so tours don't reappear once dismissed.

## 5. User Experience
- **First Login Walkthrough**: When a student logs in for the first time, a gentle spotlight overlay welcomes them:
  - Step 1: *"Welcome to ExamOS! Here is your main dashboard."*
  - Step 2: *"Find your scheduled mock tests and viva voce interviews here."*
  - Step 3: *"Track your mastery progress and weak topics here."*
- **Contextual Help Drawer**: Clicking `?` opens a sidebar with instant answers (e.g. "How does AI Interview scoring work?", "What is negative marking?", "How to request a test reset?").
- **Keyboard Cheatsheet**: Pressing `?` in the exam player displays quick navigation keys (`Next: N`, `Prev: P`, `Mark for Review: M`, `Clear Answer: C`).

## 6. Admin Experience
- **Help Article Manager**: Admins can author, update, and categorize help articles in the Settings workbench.
- **Tour Reset**: Admins can trigger a "Reset User Tour" for a specific user to help troubleshoot onboarding issues.

## 7. Technical Architecture
- **Frontend Architecture**:
  - `ProductTour.tsx`: Uses lightweight element bounding-rect positioning with smooth CSS backdrop cutout—no heavy third-party bundle dependencies.
  - `HelpDrawer.tsx`: Slide-over drawer fetching markdown articles from API with fuzzy search.
  - `useKeyboardShortcuts.ts`: Global window listener respecting input field focus boundaries (doesn't trigger shortcuts while typing in inputs).
- **State Persistence**: `user_preferences.onboardingState` records completed tour IDs (`['student_welcome_v1', 'exam_player_v1']`).

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `help_articles`: `id`, `category` (`STUDENT` | `FACULTY` | `ADMIN` | `EXAMS` | `BILLING`), `title`, `slug`, `contentMarkdown`, `tags` (string[]), `isPublished`, `viewCount`, `updatedAt`.
- `user_preferences.onboardingState`: Extended JSON array of dismissed tour keys.

## 9. API
- `GET /api/v1/help/articles` (Auth: Authenticated) — Search and fetch help articles.
- `GET /api/v1/help/articles/:slug` (Auth: Authenticated) — Read article content.
- `POST /api/v1/help/articles` (Auth: Admin / `preferences.update`) — Create/update help article.
- `POST /api/v1/help/dismiss-tour` (Auth: Authenticated) — Records dismissed tour ID for user.

## 10. Frontend
- **Components**:
  - `ProductTour.tsx`: Spotlight overlay with Next / Skip / Finish buttons.
  - `HelpDrawer.tsx`: Slide-over drawer with article search and category filters.
  - `KeyboardShortcutModal.tsx`: Cheat sheet dialog displaying key combinations.
  - `ContextualHelpTooltip.tsx`: Micro `(?)` tooltip icon for complex form fields.

## 11. AI / External Services
- Future-ready for AI-powered semantic search across help articles.

## 12. Permissions / Entitlements
- **Viewing Help**: Any authenticated or guest user.
- **Article Authoring**: Gated on `MAIN_ADMIN` or `preferences.update`.

## 13. Maintenance Behaviour
- Help drawer and keyboard shortcuts remain 100% available offline and during maintenance.

## 14. Import / Export
- Help article library exportable as JSON in `json-import-export.md`.

## 15. Edge Cases
- Tour targets an element that is not present in the DOM (e.g. student not enrolled in interview): Tour engine detects missing target and skips to the next valid step without freezing UI.
- User accidentally closes tour: Can re-launch any tour at any time from Help Drawer -> "Interactive Tours".

## 16. Test Cases
- **Unit (HELP-U001)**: `useKeyboardShortcuts` ignores shortcut keypresses when typing inside `<input>` or `<textarea>`.
- **API (HELP-A001)**: `GET /api/v1/help/articles?q=rubric` returns matching articles sorted by relevance.
- **API (HELP-A002)**: `POST /api/v1/help/dismiss-tour` persists tour ID in user preferences.
- **UI (HELP-UI001)**: Pressing `?` opens keyboard cheat sheet modal.
- **UI (HELP-UI002)**: Tour spotlight calculates accurate bounding rect on window resize.

## 17. Acceptance Criteria
- [ ] Lightweight step-by-step Product Tour engine with spotlight overlay.
- [ ] In-app Help Drawer with searchable knowledge base articles.
- [ ] Keyboard shortcut manager and cheatsheet modal.
- [ ] Onboarding state persistence in user preferences.
- [ ] Role-tailored tour sequences for Students, Teachers, and Admins.

## 18. Dependencies
- `apps/web/src/context/AuthContext.tsx`
- `apps/web/src/context/ThemeContext.tsx`
- `apps/api/src/routes/preference.routes.ts`

## 19. Future Improvements
- Interactive AI Help Assistant chatbot (RAG search over documentation and user guides).
- Video micro-clips embedded inside help articles.
