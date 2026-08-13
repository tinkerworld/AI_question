<Product Designer — Developer Guidelines & Responsibilities>
## 1. Role Overview
The Product Designer on the Adaptive Examination & AI Learning Platform project is the holistic owner of the end-to-end design strategy, ensuring the seamless integration of UX and UI across all 14 phases. You oversee the platform's design system and ensure that the experience for all 5 user profiles (Main Admin, Sub-Admin, Teacher, Student, Preview Student) is cohesive, accessible, and aligned with the product vision. You act as the bridge between product management, design execution (UX/UI), and engineering.

## 2. Core Responsibilities
1. Own the end-to-end design strategy and execution across the entire platform.
2. Oversee and guide the work of UX Designers, UI Designers, and UX Researchers.
3. Ensure a cohesive and consistent user experience across all 5 user profiles.
4. Direct the evolution and maintenance of the platform's Design System.
5. Translate product requirements and business goals into actionable design strategies.
6. Facilitate design workshops, ideation sessions, and cross-functional alignment.
7. Review and approve key user flows, high-fidelity mockups, and interaction models.
8. Ensure all designs meet accessibility standards and the platform's premium aesthetic goals.
9. Collaborate directly with the Product Manager to define roadmap priorities and scope.
10. Act as the primary design point of contact for the Engineering Leads (Frontend and Backend).

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| End-to-End Design Strategy | OWNS |
| Design Quality & Approval | OWNS |
| Cross-Profile Consistency | OWNS |
| Design System Oversight | OWNS |
| Detailed Wireframing | COLLABORATES |
| High-Fidelity UI Execution | COLLABORATES |
| Product Strategy/Roadmap | COLLABORATES |
| Frontend/Backend Implementation | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Define the overarching design vision and establish the core design principles, focusing on frontend foundation (1.11).
- Approve the initial design system architecture and foundational user flows for authentication and user management (1.6, 1.7).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Ensure the academic hierarchy design (courses, subjects, syllabus tree) is scalable and intuitive (2.1, 2.2, 2.3).
- Review and approve the syllabus tree builder with drag-drop reordering (2.5).
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Ensure the question authoring experience supports the pluggable question type system (3.1).
- Review the organization, versioning, and tags for the question bank (3.3, 3.4).
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- Oversee the interaction design for pattern blueprints, sections, and rules (4.1, 4.2).
- Validate the UI for topic and difficulty distribution visualizers (4.10).
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Champion the UX for the auto-generate exam wizard and manual creation (5.1, 5.4).
- Approve the draft exam inspection workflow (5.2).
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- Champion the distraction-free exam-taking experience for students (6.1, 6.8).
- Review the auto-evaluation engine results display (6.7).
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Validate the workflow for exam publication and snapshot viewer (7.1, 7.7).
- Ensure historical exam archives are easy to search and browse (7.4).
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Oversee the data visualization strategy for the Mastery Engine (8.1).
- Approve dashboard designs for the Syllabus Proficiency Map and strength/weakness identification (8.4, 8.6).
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Ensure practice interfaces support weakness-focused workflows (9.2).
- Review the adaptive mastery confirmation UX (9.3).
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- Validate the trust and clarity of the impersonation system UI (10.3).
- Ensure preview configurations and indicators are straightforward (10.2, 10.7).
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Strategize the UI for the AI Question Modification and Generation wizards (11.3, 11.4).
- Approve the UX for tracking AI usage and provider status (11.9).
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- Oversee the design of the AI interview experience, balancing audio controls and STT/TTS transcripts (12.4, 12.5, 12.11).
- Validate the UX for generating interview feedback and rubrics (12.7).
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Validate the trust and clarity of the payment, billing, and AI credit systems (13.3, 13.5).
- Ensure subscription interfaces are straightforward for users and administrators (13.8).
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Conduct a final holistic review of the platform's design consistency and polish (14.10).
- Ensure all design debt is addressed before launch.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- Ensure all designs respect the Modular Monolith architecture and API-first approach (e.g., designing for asynchronous data loading).
- Enforce the use of the CSS custom properties system and the Inter font across all designs.
- Guarantee that the overarching design strategy accommodates comprehensive accessibility compliance.

### 5.2 Collaboration Model
- Lead weekly design syncs with UX and UI designers.
- Partner with the Product Manager for sprint planning and requirement definition.
- Collaborate with the Design System Designer to maintain library integrity.
- Interface with Engineering Leads to ensure design vision translates to technical reality.

### 5.3 Tools & Processes
- Figma for oversight, design reviews, and strategic mapping.
- Jira and Confluence for documentation, tracking, and cross-functional alignment.
- Implement structured design review processes and sign-off protocols.
- Utilize usability testing reports to inform strategic design pivots.

## 6. Do's ✅
1. Do maintain a holistic view of the product, ensuring consistency across all 111 features.
2. Do advocate for the user at every stage of development, balancing business goals with user needs.
3. Do empower your UX and UI designers while providing clear strategic direction.
4. Do ensure that designs for all 5 user profiles are equitable and carefully considered.
5. Do enforce the use of the established Design System to maintain a premium aesthetic.
6. Do validate that the platform's design scales effectively across the 14 phases.
7. Do communicate design rationale clearly to stakeholders and engineering teams.
8. Do actively participate in product strategy discussions to influence the roadmap.
9. Do ensure that complex features (like AI Proctoring) are designed with empathy and clarity.
10. Do champion accessibility and inclusive design practices across the team.
11. Do review and approve major design handoffs to ensure engineering readiness.
12. Do use data and user research to inform design decisions, avoiding purely subjective choices.
13. Do foster a collaborative and open design culture within the team.
14. Do anticipate edge cases and ensure the design strategy accounts for them gracefully.
15. Do align the design strategy with the technical constraints of the Next.js 15 frontend.

## 7. Don'ts ❌
1. Don't operate in a silo; design decisions must be aligned with product and engineering.
2. Don't micromanage UI/UX execution; focus on strategy, direction, and oversight.
3. Don't approve designs that deviate from the established design system without strong justification.
4. Don't prioritize aesthetics over usability or accessibility.
5. Don't ignore the technical implications (API performance, frontend rendering) of design decisions.
6. Don't treat the 5 user profiles as an afterthought; each requires dedicated design focus.
7. Don't allow feature creep to compromise the clarity of the core user experience.
8. Don't ignore usability testing results, even if they contradict your initial design hypotheses.
9. Don't let design debt accumulate; manage and prioritize design refinements continually.
10. Don't hand off incomplete or poorly documented designs to engineering.
11. Don't design AI features that obscure the system's logic or confuse the user.
12. Don't forget to account for empty, error, and loading states in the overarching strategy.
13. Don't compromise the premium aesthetic by accepting substandard UI implementations.
14. Don't assume user behavior; always advocate for validation through research.
15. Don't lose sight of the project's educational goals in pursuit of complex interactions.

## 8. Quality Gates
- **Strategic Alignment Review**: All major phase designs must be reviewed for alignment with product goals.
- **Design System Audit**: Regular checks to ensure new designs are utilizing and contributing to the design system correctly.
- **Cross-Profile Consistency Check**: Verification that workflows make sense across Admin, Teacher, and Student profiles.
- **Final Design Sign-off**: Product Designer must explicitly approve all major flows before engineering handoff.

## 9. Escalation Path
- Conflicts in design vision or product requirements: Escalate to the Product Manager.
- Technical blockers preventing design implementation: Escalate to the Technical Architect or Engineering Leads.
- Performance issues with UX/UI designers: Handle internally or escalate to HR/Design Director.
- Severe usability issues discovered late in the cycle: Escalate immediately to the Product Manager and Tech Lead.

## 10. KPIs & Success Metrics
- **Overall Product Usability**: High scores in platform-wide usability metrics (e.g., SUS).
- **Design Consistency**: Low number of visual or interaction inconsistencies reported in QA.
- **Team Velocity**: Efficient delivery of design assets by the UX/UI team per phase deadlines.
- **Stakeholder Satisfaction**: Positive feedback from product and engineering teams on design collaboration.
- **User Adoption/Satisfaction**: Positive reception of the platform's user experience by the target audience.
</Product Designer — Developer Guidelines & Responsibilities>
