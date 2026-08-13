<UX Designer — Developer Guidelines & Responsibilities>
## 1. Role Overview
The UX Designer on the Adaptive Examination & AI Learning Platform project is responsible for designing intuitive, efficient, and engaging user journeys across all 5 user profiles (Main Admin, Sub-Admin, Teacher, Student, Preview Student). You own the user experience, interaction design, user flows, wireframes, and usability testing to ensure the platform is accessible, logical, and low-friction, particularly focusing on the high-stakes student exam-taking flow, teacher content creation flow, and AI interview experience.

## 2. Core Responsibilities
1. Design comprehensive user flows for all platform modules (Auth, Academic Structure, Questions, Exams, AI Learning, etc.).
2. Create low and high-fidelity wireframes and interactive prototypes.
3. Design and optimize the student exam-taking experience to minimize cognitive load.
4. Streamline the teacher content creation and exam authoring workflows.
5. Conceptualize and design the AI interview experience (WebRTC-based interaction).
6. Plan and conduct usability testing for key flows and iterate based on feedback.
7. Define interaction patterns and micro-interactions.
8. Ensure information architecture (IA) is scalable across 14 development phases.
9. Collaborate with UI designers to translate wireframes into pixel-perfect designs.
10. Work closely with Frontend Engineers (Next.js 15) to ensure feasibility and correct implementation of UX patterns.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| User Flows & Wireframes | OWNS |
| Interaction Design | OWNS |
| Usability Testing | OWNS |
| Information Architecture | OWNS |
| Visual Design (Colors, Typography) | COLLABORATES |
| User Research | COLLABORATES |
| Frontend Implementation | OUT OF SCOPE |
| API Design | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Map out core user flows for login, registration, and RBAC transitions.
- Create wireframes for the authentication module and dashboard layouts.
- Define definition of done: All Phase 1 user flows mapped and wireframed, approved by Product Manager.

### Phase 2 — Academic Structure
- Design hierarchical navigation for academic structures (Levels, Classes, Subjects).
- Create wireframes for CRUD operations on academic entities.
- Define definition of done: Intuitive UI flows for managing complex academic hierarchies.

### Phase 3 — User Management
- Design the user onboarding flow for Teachers and Students.
- Create wireframes for the Admin user management dashboard (filtering, bulk actions).
- Define definition of done: Seamless user management wireframes with clear role distinction.

### Phase 4 — Question Bank (Core)
- Design the question authoring flow for standard question types (MCQ, True/False).
- Wireframe the question bank repository with advanced filtering and search.
- Define definition of done: Efficient and scalable question creation interface.

### Phase 5 — Advanced Question Types
- Design interaction models for complex question types (drag-and-drop, matching, coding).
- Wireframe the media upload and preview interactions within questions.
- Define definition of done: Intuitive interactions for all advanced question formats.

### Phase 6 — Exam Management (Standard)
- Streamline the exam creation wizard for Teachers.
- Design the standard exam-taking interface for Students, focusing on focus and clarity.
- Define definition of done: End-to-end standard exam flow wireframed and tested.

### Phase 7 — Advanced Exam Management
- Design flows for adaptive exam logic and dynamic question selection.
- Wireframe advanced settings for exams (security, time limits, randomized variants).
- Define definition of done: Complex exam settings presented in an easily understandable UI.

### Phase 8 — Evaluation & Marking
- Design the grading interface for Teachers (manual marking, bulk grading).
- Create wireframes for the Student results view and detailed feedback breakdown.
- Define definition of done: Efficient grading workflow and clear result presentation.

### Phase 9 — Analytics & Reporting
- Design dashboard layouts for various reporting metrics (Student performance, Exam statistics).
- Wireframe data visualization components and filtering mechanisms.
- Define definition of done: Actionable and easy-to-read analytics dashboards.

### Phase 10 — Communication Module
- Design the notification center and messaging interface.
- Wireframe email template management and system alert configurations.
- Define definition of done: Clear and non-intrusive communication flows.

### Phase 11 — Payment & Subscription
- Design the subscription selection and checkout flow.
- Wireframe billing management and invoice history for Admins/Users.
- Define definition of done: Secure and trustworthy payment experience.

### Phase 12 — Core AI Features
- Conceptualize and design the AI hint request flow within the exam interface.
- Wireframe the AI-driven study plan generator and progress tracker.
- Define definition of done: Seamless integration of AI features without disrupting core flows.

### Phase 13 — Advanced AI & Proctoring
- Design the AI interview experience, including video layout and real-time interaction indicators.
- Wireframe the AI proctoring setup and flag review interface for Teachers.
- Define definition of done: Intuitive and secure interfaces for advanced AI and proctoring.

### Phase 14 — Polish, Performance & Launch
- Conduct final end-to-end usability reviews across all modules.
- Refine micro-interactions and transitions for a polished feel.
- Define definition of done: Zero critical UX blockers for production launch.

## 5. Key Guidelines
### 5.1 Technical Standards
- Design for responsive layouts adhering to Next.js 15 frontend constraints.
- Utilize established UX patterns suitable for educational and assessment platforms.
- Ensure all designs comply with WCAG 2.1 AA accessibility standards (keyboard navigation, screen reader compatibility).

### 5.2 Collaboration Model
- Partner with the Product Designer for overarching design strategy.
- Collaborate with the UI Designer to translate structural wireframes into high-fidelity mockups.
- Consult with the UX Researcher to validate flows through testing.
- Hand off documented user flows and interactive prototypes to Frontend Engineers.

### 5.3 Tools & Processes
- Figma for all wireframing, prototyping, and flow mapping.
- Miro or FigJam for collaborative brainstorming and journey mapping.
- Jira for tracking design tasks and user stories.
- Participate in weekly design reviews and sprint planning.

## 6. Do's ✅
1. Do prioritize clarity and ease of use in the student exam-taking flow to minimize cognitive load.
2. Do design modular and reusable interaction patterns that can scale across the 111 features.
3. Do consider empty states, error states, and loading states for every screen.
4. Do design for a responsive experience, ensuring usability on both desktop and mobile devices.
5. Do validate your assumptions through quick usability tests before finalizing complex flows.
6. Do create clear, step-by-step wizards for complex tasks like exam authoring.
7. Do maintain a consistent mental model across different modules (e.g., standardizing filtering and search interactions).
8. Do document your interaction design decisions and flow logic clearly for the engineering team.
9. Do design with accessibility in mind from the wireframing stage (e.g., ensuring logical tab order).
10. Do consider the implications of AI integration on the user experience (e.g., managing expectations, handling AI errors).
11. Do design intuitive fallback experiences when specific features (like video in AI interviews) fail.
12. Do use interactive prototypes to communicate complex interactions and transitions.
13. Do regularly seek feedback from peers and stakeholders during the design process.
14. Do keep abreast of the latest UX trends and best practices in EdTech.
15. Do ensure that the navigation structure easily accommodates the addition of new features in later phases.

## 7. Don'ts ❌
1. Don't design complex, multi-step flows without clear progress indicators.
2. Don't ignore edge cases or error scenarios in your wireframes.
3. Don't rely solely on color to convey important information or system status.
4. Don't design static screens without considering the transitions and micro-interactions between them.
5. Don't assume that users will intuitively understand complex features without guidance or onboarding.
6. Don't introduce inconsistent interaction patterns across different modules.
7. Don't design for a specific device resolution without considering responsive behavior.
8. Don't skip usability testing for critical flows like the exam-taking experience.
9. Don't hand off wireframes to developers without adequate explanation of interaction logic.
10. Don't clutter interfaces with unnecessary elements; prioritize white space and focus.
11. Don't design AI interactions that feel unpredictable or jarring to the user.
12. Don't neglect the experience of administrative users (Main Admin, Sub-Admin) in favor of students.
13. Don't use confusing or jargon-heavy copy in your prototypes.
14. Don't create designs that are technically unfeasible within the Next.js 15 framework.
15. Don't finalize designs without ensuring they meet accessibility standards.

## 8. Quality Gates
- **UX Flow Review**: All critical user flows must be reviewed and approved by the Product Designer and Product Manager.
- **Usability Testing**: Major flows (Exam taking, Question creation) must undergo usability testing with representative users, achieving a predefined success rate.
- **Accessibility Check**: Wireframes must pass a preliminary accessibility review focusing on structure and navigation.
- **Engineering Feasibility**: Frontend leads must review prototypes to confirm technical feasibility before handoff.

## 9. Escalation Path
- Minor UX inconsistencies or flow issues: Discuss with the UI Designer or Product Designer.
- Technical constraints impacting UX: Escalate to the Frontend Lead.
- Changes in product requirements affecting flows: Escalate to the Product Manager.
- Major usability blockers identified during testing: Escalate to the Product Designer and Product Manager.

## 10. KPIs & Success Metrics
- **Task Success Rate**: Percentage of users who successfully complete key tasks during usability testing.
- **Time on Task**: Average time taken by users to complete critical workflows (e.g., creating an exam).
- **System Usability Scale (SUS)**: Score achieved in user evaluations of the platform's usability.
- **Design Handoff Efficiency**: Reduction in developer questions or rework related to UX flows.
- **Phase Goal Completion**: Timely delivery of wireframes and prototypes for each phase.
</UX Designer — Developer Guidelines & Responsibilities>
