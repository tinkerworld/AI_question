# Feature: Exam Player Theme Builder

## 1. Purpose
The Exam Player Theme Builder allows institutions and educators to visually customize the student examination interface per exam. It provides configurable visual layouts, color themes, font typography, question card density, timer display styles (sticky header vs floating pill vs minimal), and section navigation formats while ensuring accessibility compliance and zero disruption to the exam engine runtime.

## 2. Current State
Verified against the codebase:
- `ExamPlayerPage.tsx` delivers tests using hardcoded layout styles, fixed header dimensions, and standard platform CSS variables.
- `exams` database table contains blueprint parameters and scheduling, but has no theme or visual styling identifier.
- All exams share an identical layout and appearance regardless of subject or institutional branding.

## 3. Problem / Requirement
Different examination formats require tailored visual presentation:
- **Competitive Exams (e.g. JEE, NEET, GATE)**: Demand a standard dual-panel split screen (Question paper on the left, Question Palette grid with color statuses on the right, large fixed timer in the top header).
- **Language / Reading Assessments (e.g. IELTS, TOEFL)**: Require a side-by-side split screen (Reading passage on the left with independent scroll, questions on the right) with adjustable font size.
- **Institutional Branding**: Colleges and testing agencies require customized header logos, accent brand colors, and clean aesthetic layouts.
- **Strict Isolation**: Theme customizations must ONLY affect CSS styling within the player container; they must NEVER interfere with exam anti-cheat listeners, timer countdown logic, or autosave pipelines.

## 4. Proposed Solution
1. Introduce `exam_player_themes` data model to store visual presets.
2. Extend `exams` table with nullable `themeId` foreign key.
3. Build a Visual Theme Editor in the Exam Generator workbench (`ExamsPage.tsx`) with a live interactive preview iframe/container.
4. Update `ExamPlayerPage.tsx` to inject scoped CSS variables and layout classes based on the assigned theme preset.

## 5. User Experience
- **Student Exam Player**: When launching an exam, the player loads the configured visual theme (e.g. "IELTS Split-Pane Theme" with Georgia serif font, custom reading split, and floating minimal timer).
- **In-Exam Text Scaling**: Student can click an accessibility pill (`A-` / `A+`) to scale question text without breaking the responsive grid.

## 6. Admin Experience
- **Theme Builder Workbench**: In Exam Generator -> Visual Themes:
  - **Layout Mode**: Split Pane (Passage / Questions), Classic Single Column, or Grid Palette.
  - **Color Styling**: Header background, accent selection color, option highlight borders.
  - **Timer Position**: Sticky Top Header, Floating Draggable Pill, or Minimal Text.
  - **Typography**: Inter (Modern sans), JetBrains Mono (Technical/Math), Georgia (Editorial/Reading).
  - **Live Preview**: Real-time rendering of a sample question card as styles are adjusted.

## 7. Technical Architecture
- **Scoped CSS Custom Properties**: Theme variables are injected directly onto `#exam-player-container`:
  ```css
  #exam-player-container[data-exam-theme="ielts_split"] {
    --player-header-bg: #1e293b;
    --player-accent: #2563eb;
    --player-font-family: 'Georgia', serif;
    --player-layout: split-screen;
    --player-timer-style: floating;
  }
  ```
- **Runtime Safety**: Separation of concerns: all exam logic (`useExamLock`, autosave, answer validation) remains 100% untouched and independent of presentation classes.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `exam_player_themes`: `id`, `name`, `description`, `isSystemDefault`, `layoutMode` (`SINGLE_COLUMN` | `SPLIT_PANE` | `GRID_PALETTE`), `fontFamily`, `fontSizeBase`, `headerBgColor`, `accentColor`, `timerStyle` (`STICKY_HEADER` | `FLOATING_PILL` | `MINIMAL`), `showSectionTabs`, `showCalculator`, `customCss` (sanitized), `createdBy`, `createdAt`.
- `exams`: Add `themeId` (UUID, nullable).

## 9. API
- `GET /api/v1/exam-themes` (Auth: Staff) — List available theme presets.
- `POST /api/v1/exam-themes` (Auth: Staff / `exams.create`) — Create custom player theme.
- `PUT /api/v1/exam-themes/:id` (Auth: Staff / `exams.create`) — Update theme preset.
- `GET /api/v1/exams/:id/theme` (Auth: Public / Student) — Fetch resolved theme for exam.

## 10. Frontend
- **Components**:
  - `ExamThemeBuilderModal.tsx`: Visual editor with live side-by-side preview.
  - `ThemePreviewCard.tsx`: Interactive mockup player displaying timer and options.
  - `ExamPlayerPage.tsx`: Updated with scoped theme container wrapper.

## 11. AI / External Services
- None required.

## 12. Permissions / Entitlements
- **Theme Creation / Editing**: Gated on `exams.create` / `exams.publish`.
- **Theme Application**: Any student taking the exam receives the configured theme.

## 13. Maintenance Behaviour
- Visual theme fallback defaults to standard baseline ExamOS player if theme service query is unreachable.

## 14. Import / Export
- Theme definitions exported as part of Exam Blueprint packages in `json-import-export.md`.

## 15. Edge Cases
- Malicious custom CSS: Strict CSS sanitizer strips dangerous properties (e.g. `javascript:`, `url()` with remote origins, `@import`, `position: fixed` covering timer).
- Student on small mobile screen: Split-pane layout automatically collapses into a tabbed interface (Passage tab / Question tab) on viewports < 768px.

## 16. Test Cases
- **Unit (ETHEME-U001)**: CSS sanitizer removes script injections and dangerous absolute positioning.
- **Unit (ETHEME-U002)**: Theme schema validates required hex color codes and layout enums.
- **API (ETHEME-A001)**: `POST /api/v1/exam-themes` successfully creates theme and returns UUID.
- **UI (ETHEME-UI001)**: Exam player applies `data-exam-theme` attributes to main container.
- **Integration (ETHEME-I001)**: Published exam snapshot freezes assigned `themeId` preserving visual reproduction (ADR-007).

## 17. Acceptance Criteria
- [ ] Exam player theme data model supporting layout, typography, colors, and timer styles.
- [ ] Visual Theme Builder workbench with real-time interactive preview.
- [ ] Scoped CSS variable injection without leaking styles into main dashboard.
- [ ] Zero impact on anti-cheat listeners, timer logic, or autosave pipelines.
- [ ] Responsive fallback for mobile viewports.

## 18. Dependencies
- `apps/web/src/pages/ExamPlayerPage.tsx`
- `apps/web/src/pages/ExamsPage.tsx`
- `apps/api/src/routes/exam.routes.ts`

## 19. Future Improvements
- Dark mode variant for each exam theme preset.
- Calculator widget docking position customization.
