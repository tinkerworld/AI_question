<Design System Designer — Developer Guidelines & Responsibilities>
## 1. Role Overview
The Design System Designer on the Adaptive Examination & AI Learning Platform project is the technical owner of the platform's visual architecture. You own the design system, component library, design tokens, and accessibility standards. You ensure that the premium aesthetic (Inter font, dark/light mode, gradients) is systematically applied via a robust CSS custom properties system. You bridge the gap between UI design and frontend implementation, ensuring reusable components (DataTable, Modal, Toast, StatusBadge) are consistent, scalable, and responsive across all 14 phases.

## 2. Core Responsibilities
1. Architect and maintain the central Figma component library.
2. Define, manage, and document the design tokens (colors, typography, spacing, shadows).
3. Own the CSS custom properties architecture that maps to Figma design tokens.
4. Design and standardize foundational reusable components (DataTable, Modal, Toast, StatusBadge, Buttons, Inputs).
5. Ensure a flawless and systematic implementation of dark and light modes.
6. Define responsive breakpoints and component behavior across mobile, tablet, and desktop.
7. Establish and enforce accessibility standards (WCAG 2.1 AA) within the component library.
8. Create comprehensive documentation for components, detailing usage, states, and technical specifications.
9. Collaborate with UI Designers to onboard new components into the system.
10. Work directly with Frontend Engineers to ensure pixel-perfect, systemic implementation in Next.js 15.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Design System Architecture | OWNS |
| Component Library (Figma) | OWNS |
| Design Tokens & CSS Variables | OWNS |
| Component Accessibility | OWNS |
| High-Fidelity Screen Design | COLLABORATES |
| UI Visual Aesthetic | COLLABORATES |
| Frontend Component Implementation | CONSULTS |
| User Flows & Research | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish the core design token structure and CSS custom properties (1.11).
- Create foundational components for authentication and user management (1.6, 1.7).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Standardize the DataTable component and hierarchical tree views for the syllabus (2.3).
- Create standard components for course and subject management (2.1, 2.2).
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Standardize the StatusBadge component for question lifecycles (3.5).
- Design system components for the rich text editor and tagging system (3.2, 3.4).
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- Create specialized, reusable components for section and rule configuration (4.2, 4.3).
- Standardize sliders and visualizers for distribution rules (4.4, 4.5).
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Standardize components for the draft exam inspection UI (5.2).
- Design reusable layouts for exam metadata (5.3).
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Ensure all components used in the student exam interface are highly optimized (6.8).
- Standardize progress indicators, answer panels, and timer components (6.3).
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Standardize components for the archive browser and snapshot viewer (7.7).
- Create clear and consistent components for publication workflows (7.1).
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Standardize chart and graph components for the Mastery Engine (8.1).
- Refine dashboard widget components for the Syllabus Proficiency Map (8.4).
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Standardize components for weakness pool presentation (9.1).
- Create email template components or practice interfaces that align with the core system (9.5).
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- Standardize the preview mode indicator and configuration panels (10.2, 10.7).
- Create specific variants for impersonation mode headers (10.3).
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Create specialized components for AI interactions, modification, and generation wizards (11.9).
- Standardize AI provider status and queue indicators (11.6, 11.8).
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Standardize audio controls, transcript views, and timers for the AI interview frontend (12.11).
- Create robust components for interview rubrics and feedback (12.6, 12.7).
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Standardize pricing tables, secure checkout forms, and AI credit balances (13.3, 13.8).
- Define trust-inspiring components for monetization features.
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Conduct a comprehensive audit of the design system for consistency and unused components (14.10).
- Finalize all component documentation for handoff to maintenance teams.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- Design tokens must strictly map to a CSS custom properties strategy (e.g., `--color-primary-500`, `--spacing-md`).
- All components must have defined states (default, hover, focus, active, disabled, error).
- Components must be built using Figma's auto-layout and component properties for maximum flexibility.
- Adhere to WCAG 2.1 AA standards for contrast, tap targets, and visual hierarchy.

### 5.2 Collaboration Model
- Act as the gatekeeper for the Figma component library, reviewing additions from UI Designers.
- Collaborate with the Product Designer to ensure the system supports the overarching design strategy.
- Work closely with the Frontend Lead to ensure the Figma components translate cleanly to React/Next.js components.
- Consult with the UX Researcher to validate component accessibility and usability.

### 5.3 Tools & Processes
- Figma (advanced usage: variables, component properties, auto-layout).
- Storybook (collaborating with frontend to review implemented components).
- Style Dictionary or similar token management tools (if applicable).
- Jira/Confluence for component documentation and version control.

## 6. Do's ✅
1. Do use a semantic naming convention for design tokens (e.g., `--text-color-primary` rather than `--gray-900`).
2. Do ensure the Inter font is the sole typography system, scaling mathematically across breakpoints.
3. Do build the system from the ground up to support both dark and light modes via token swapping.
4. Do design the DataTable component to be highly flexible, supporting sorting, filtering, and pagination.
5. Do ensure the Modal component has clear focus trapping and keyboard navigation logic documented.
6. Do define a standardized z-index hierarchy for elements like Toasts, Modals, and Dropdowns.
7. Do utilize Figma variables to manage spacing, colors, and radii systematically.
8. Do document the precise behavior of the StatusBadge component across different system states.
9. Do design components that are responsive by default, adapting to container widths.
10. Do regularly audit the Figma library to remove detached or redundant components.
11. Do provide clear redlines and CSS variable mappings for Frontend Engineers.
12. Do consider internationalization (i18n) when designing components, allowing for text expansion.
13. Do create specific component variants for high-density (Admin) vs. low-density (Student Exam) contexts.
14. Do enforce WCAG 2.1 AA contrast ratios strictly at the token level.
15. Do treat the design system as a living product, releasing versioned updates.

## 7. Don'ts ❌
1. Don't allow UI Designers to introduce new colors or fonts outside the established token system.
2. Don't build rigid components that break when content changes length.
3. Don't ignore the technical limitations of CSS when designing complex component interactions.
4. Don't fail to document the intended hover, focus, and disabled states for interactive elements.
5. Don't create a dark mode by simply inverting colors; design a specific dark mode token set.
6. Don't use non-semantic naming conventions that confuse developers (e.g., `--button-color-blue`).
7. Don't design components in isolation; always consider how they fit together in a layout.
8. Don't forget to account for touch targets on mobile breakpoints.
9. Don't allow the component library to become bloated with one-off, single-use elements.
10. Don't hand off components without specifying their responsive behavior across breakpoints.
11. Don't rely on developers to guess the animation timing or easing for components like Modals or Toasts.
12. Don't neglect accessibility requirements (like ARIA roles) in your component documentation.
13. Don't break existing designs by updating core components without reviewing the impact across the platform.
14. Don't use hardcoded values in Figma; always link to variables/tokens.
15. Don't assume frontend implementation matches the design; actively review Storybook or staging environments.

## 8. Quality Gates
- **Component Audit**: All new components must be reviewed by the Design System Designer before publishing to the main library.
- **Token Mapping Check**: Verify that all designs use established design tokens, with zero hardcoded values.
- **Frontend Sync**: Implemented React components must be visually QA'd against the Figma system before PR approval.
- **Accessibility Verification**: Core components must pass automated and manual contrast and structural accessibility checks.

## 9. Escalation Path
- UI Designers deviating from the design system: Address directly, escalate to the Product Designer if persistent.
- Frontend implementation failing to utilize CSS variables: Escalate to the Frontend Lead.
- Scope creep resulting in requests for complex, non-reusable components: Escalate to the Product Manager.
- Technical constraints preventing component implementation: Discuss with the Technical Architect.

## 10. KPIs & Success Metrics
- **System Adoption Rate**: Percentage of UI designs and frontend code strictly utilizing the design system.
- **Component Reusability**: High usage rate of core components (DataTable, Modal, etc.) across different modules.
- **Handoff Speed**: Reduction in time taken for frontend developers to implement new UI screens.
- **Consistency Score**: Minimal visual bugs or inconsistencies reported during QA.
- **Accessibility Compliance**: Zero contrast or basic structural accessibility errors within core components.
</Design System Designer — Developer Guidelines & Responsibilities>
