<UI Designer — Developer Guidelines & Responsibilities>
## 1. Role Overview
The UI Designer on the Adaptive Examination & AI Learning Platform project is responsible for the visual design, component design, responsive layouts, and design handoff. You will define and implement a premium aesthetic utilizing gradients, glassmorphism, dark mode, and the Inter font, while adhering to the CSS custom properties design system. Your goal is to ensure the platform is visually stunning, consistent, and highly usable across all devices and user profiles.

## 2. Core Responsibilities
1. Design high-fidelity, pixel-perfect user interfaces based on UX wireframes.
2. Develop and maintain a comprehensive UI component library in Figma.
3. Define the visual language, including color palettes, typography (Inter), spacing, and iconography.
4. Implement a premium aesthetic incorporating gradients, subtle shadows, and glassmorphism where appropriate.
5. Design complete light and dark mode experiences for all screens.
6. Create responsive layouts for desktop, tablet, and mobile breakpoints.
7. Design micro-interactions, hover states, and animations to enhance the user experience.
8. Prepare detailed design specifications and handoff assets for Frontend Engineers.
9. Collaborate with the Design System Designer to ensure UI components align with the CSS custom properties system.
10. Conduct visual QA on implemented features to ensure design fidelity in Next.js 15.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Visual Design (Colors, Typography) | OWNS |
| UI Component Design | OWNS |
| High-Fidelity Mockups | OWNS |
| Responsive Layouts | OWNS |
| Design System Architecture | COLLABORATES |
| User Flows & Wireframes | COLLABORATES |
| Frontend Implementation | OUT OF SCOPE |
| UX Research | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Establish core visual style guide (colors, Inter typography, glassmorphism parameters).
- Design high-fidelity mockups for authentication screens (login, register).
- Define definition of done: Core visual language defined and applied to initial screens.

### Phase 2 — Academic Structure
- Design complex data tables and hierarchical list views with clear visual hierarchy.
- Create UI for modals, dropdowns, and form elements used in academic management.
- Define definition of done: Consistent and legible UI for managing structured academic data.

### Phase 3 — User Management
- Design user profile cards, role badges, and status indicators.
- Refine the visual design of data grids for user lists, incorporating sorting and filtering UI.
- Define definition of done: Clear and easily scannable user management interfaces.

### Phase 4 — Question Bank (Core)
- Design the rich text editor interface and standard question formatting.
- Create clear visual distinctions between different question types in the bank view.
- Define definition of done: Clean and organized visual presentation of the question repository.

### Phase 5 — Advanced Question Types
- Design engaging interfaces for drag-and-drop and matching interactions.
- Ensure media elements (images, code blocks) are displayed optimally within questions.
- Define definition of done: Visually intuitive and interactive advanced question types.

### Phase 6 — Exam Management (Standard)
- Design a distraction-free, highly focused exam-taking interface for Students.
- Create polished UI for the exam creation wizard, utilizing progress indicators.
- Define definition of done: Premium and focused visual experience for standard exams.

### Phase 7 — Advanced Exam Management
- Design visual indicators for adaptive exam logic and dynamic settings.
- Create clear UI for complex configuration options (security, randomized variants).
- Define definition of done: Complex exam settings presented with clear visual hierarchy.

### Phase 8 — Evaluation & Marking
- Design intuitive grading interfaces with clear visual feedback for correct/incorrect answers.
- Create visually appealing and easy-to-understand result summary dashboards for Students.
- Define definition of done: Clear, encouraging, and informative visual presentation of results.

### Phase 9 — Analytics & Reporting
- Design beautiful and highly legible charts, graphs, and data visualization components.
- Create dashboard layouts that highlight key metrics using color and typography effectively.
- Define definition of done: Engaging and professional analytics dashboards.

### Phase 10 — Communication Module
- Design notification toasts, in-app messaging interfaces, and email templates.
- Ensure visual consistency in communication elements across the platform.
- Define definition of done: Unobtrusive yet clear visual communication components.

### Phase 11 — Payment & Subscription
- Design trustworthy and secure-looking checkout flows and pricing tables.
- Create clear visual hierarchies for subscription tiers and billing information.
- Define definition of done: Premium and reassuring visual design for payment processes.

### Phase 12 — Core AI Features
- Design elegant interfaces for interacting with the AI assistant (chat bubbles, hint popovers).
- Create visually distinct elements that indicate AI-generated content or suggestions.
- Define definition of done: Seamless integration of AI features with the established visual language.

### Phase 13 — Advanced AI & Proctoring
- Design the AI interview UI, incorporating WebRTC video feeds and real-time feedback visuals.
- Create clear visual alerts and indicators for the proctoring dashboard.
- Define definition of done: Professional and clear visual design for advanced AI features.

### Phase 14 — Polish, Performance & Launch
- Conduct comprehensive visual QA across the entire application.
- Refine animations, transitions, and minor visual inconsistencies.
- Define definition of done: Pixel-perfect implementation of the premium design aesthetic.

## 5. Key Guidelines
### 5.1 Technical Standards
- Utilize Figma's auto-layout and components extensively for scalability.
- Adhere strictly to the defined CSS custom properties structure for colors and spacing.
- Ensure all color combinations meet WCAG 2.1 AA contrast requirements for both light and dark modes.

### 5.2 Collaboration Model
- Partner with the UX Designer to translate wireframes into visual designs.
- Collaborate with the Design System Designer to ensure components are added to the central library.
- Work closely with Frontend Engineers during handoff to provide necessary specs and assets.
- Participate in design critiques with the Product Designer.

### 5.3 Tools & Processes
- Figma for all UI design, component creation, and prototyping.
- Zeplin or Figma Dev Mode for design handoff and specification generation.
- Jira for tracking UI tasks and linking designs to user stories.
- Regular design syncs to ensure alignment with the overall design strategy.

## 6. Do's ✅
1. Do use the Inter font family consistently across all typography elements.
2. Do implement a robust and logical naming convention for Figma components and layers.
3. Do utilize CSS custom property logic (e.g., semantic naming like `--color-primary-500`) in your Figma color styles.
4. Do design for both light and dark modes concurrently to ensure visual harmony.
5. Do use glassmorphism and gradients strategically to create a premium feel without overwhelming the content.
6. Do prioritize adequate contrast and legibility, especially in the exam-taking interfaces.
7. Do provide detailed spacing, typography, and color specifications during design handoff.
8. Do design flexible components that can adapt to different content lengths and languages.
9. Do create a comprehensive set of icons that match the platform's aesthetic.
10. Do consider empty, loading, error, and success states in your visual designs.
11. Do design responsive layouts for mobile, tablet, and desktop breakpoints.
12. Do use auto-layout in Figma to ensure designs scale predictably.
13. Do conduct visual QA on the staging environment to ensure frontend implementation matches the design.
14. Do keep your Figma files organized and clean for easy collaboration.
15. Do seek inspiration from modern, premium SaaS and EdTech interfaces.

## 7. Don'ts ❌
1. Don't use inline styles or hardcoded hex values; always use defined design tokens.
2. Don't overuse glassmorphism or complex gradients where clarity is paramount (e.g., data tables, exam questions).
3. Don't ignore accessibility contrast ratios in pursuit of a specific aesthetic.
4. Don't create detached or one-off components; always utilize the component library.
5. Don't hand off designs without considering the responsive behavior on smaller screens.
6. Don't use multiple font families; stick exclusively to Inter as mandated.
7. Don't design layouts that break when user-generated content is longer than expected.
8. Don't neglect hover, focus, and active states for interactive elements.
9. Don't use inconsistent spacing or padding; adhere to the defined spatial system.
10. Don't leave Figma files messy with unnamed layers or unused elements.
11. Don't finalize designs without reviewing them in both light and dark modes.
12. Don't design complex animations that will negatively impact frontend performance in Next.js.
13. Don't ignore feedback from Frontend Engineers regarding the feasibility of specific visual effects.
14. Don't rely on images for UI elements that can be created with CSS (e.g., simple shadows or gradients).
15. Don't skip the visual QA step before a feature is marked as complete.

## 8. Quality Gates
- **Design Review**: High-fidelity mockups must be reviewed and approved by the Product Designer.
- **Component Audit**: New UI components must be audited by the Design System Designer before inclusion in the library.
- **Accessibility Check**: Designs must pass a contrast ratio check for both light and dark modes.
- **Handoff Completeness**: Handoff files must contain all necessary specifications, assets, and responsive variations before development begins.

## 9. Escalation Path
- Discrepancies between UX wireframes and visual design: Discuss with the UX Designer.
- Issues with component structure or design tokens: Escalate to the Design System Designer.
- Frontend implementation drifting from design specifications: Escalate to the Frontend Lead.
- Major delays in design deliverables: Escalate to the Product Manager.

## 10. KPIs & Success Metrics
- **Design Fidelity**: Degree to which the implemented frontend matches the Figma designs (measured during Visual QA).
- **Component Reusability**: Percentage of UI elements that utilize existing components from the library.
- **Handoff Quality**: Feedback from frontend developers regarding the clarity and completeness of design specs.
- **Accessibility Compliance**: Number of contrast or visual accessibility issues identified post-implementation.
- **Phase Goal Delivery**: On-time completion of high-fidelity designs for each phase.
</UI Designer — Developer Guidelines & Responsibilities>
