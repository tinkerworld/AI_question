<UX Researcher — Developer Guidelines & Responsibilities>
## 1. Role Overview
The UX Researcher on the Adaptive Examination & AI Learning Platform project is responsible for understanding the needs, behaviors, and pain points of all 5 user profiles (Main Admin, Sub-Admin, Teacher, Student, Preview Student). You own user research, usability studies, persona development, and accessibility audits. Your insights will directly shape the student learning loop, optimize teacher workflow efficiency, and validate the platform's high-stakes features like exam-taking and AI interviews.

## 2. Core Responsibilities
1. Plan and execute qualitative and quantitative user research across all project phases.
2. Develop and maintain detailed user personas for the 5 key profiles.
3. Conduct usability testing on wireframes, prototypes, and implemented features.
4. Analyze and report on the student learning loop and exam-taking stress factors.
5. Evaluate teacher workflow efficiency for content creation and exam management.
6. Perform comprehensive accessibility audits to ensure WCAG 2.1 AA compliance.
7. Gather and synthesize feedback on AI-driven features (hints, proctoring, interviews).
8. Translate research findings into actionable insights and recommendations for the design and product teams.
9. Collaborate with the Product Designer and UX Designer to integrate findings into the product strategy.
10. Manage user testing participant recruitment and logistics.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| User Research & Interviews | OWNS |
| Usability Testing Execution | OWNS |
| Persona Development | OWNS |
| Accessibility Audits | OWNS |
| Research Synthesis & Reporting | OWNS |
| UX/UI Design Execution | OUT OF SCOPE |
| Product Roadmap Definition | COLLABORATES |
| Frontend/Backend Engineering | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Conduct foundational interviews to establish detailed personas.
- Test early navigation concepts, authentication, and RBAC understanding (1.6, 1.8).
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Test the mental models regarding academic hierarchies (courses, subjects, syllabus tree) (2.1, 2.2, 2.3).
- Evaluate the usability of the drag-drop syllabus tree builder (2.5).
- See docs/phases/phase-02-academic-structure.md for full details.

### Phase 3 — Question Bank
- Observe Teachers creating questions to identify workflow bottlenecks (3.2).
- Test the version history and tagging capabilities of the Question Bank (3.3, 3.4).
- See docs/phases/phase-03-question-bank.md for full details.

### Phase 4 — Exam Pattern
- Conduct usability testing on the exam pattern builder UI and section editors (4.10).
- Evaluate the clarity of topic and difficulty distributions (4.4, 4.5).
- See docs/phases/phase-04-exam-pattern.md for full details.

### Phase 5 — Exam Generator
- Evaluate the Draft Exam Inspection tool for cognitive load and efficiency (5.2).
- Test the manual versus auto-generate workflows (5.1, 5.4).
- See docs/phases/phase-05-exam-generator.md for full details.

### Phase 6 — Exam System
- **Critical:** Conduct stress-testing usability sessions for the Student exam-taking interface (6.8).
- Evaluate comprehension of the per-question result breakdown (6.7).
- See docs/phases/phase-06-exam-system.md for full details.

### Phase 7 — Exam Archive
- Test comprehension of the publish workflow and snapshots (7.1, 7.2).
- Evaluate user trust and understanding of the historical exam display (7.7).
- See docs/phases/phase-07-exam-archive.md for full details.

### Phase 8 — Student Analytics
- Conduct time-on-task studies for interpreting the Syllabus Proficiency Map (8.4).
- Test the clarity and emotional impact of the Student Analytics Dashboard (8.6).
- See docs/phases/phase-08-student-analytics.md for full details.

### Phase 9 — Personalized Practice
- Evaluate the usability of practice papers targeted at weak areas (9.2).
- Test dashboard navigation and feedback mechanisms (9.5).
- See docs/phases/phase-09-personalized-practice.md for full details.

### Phase 10 — Preview System
- Test the intrusiveness and clarity of the preview mode indicator (10.7).
- Evaluate the usability of the impersonation system (10.3).
- See docs/phases/phase-10-preview-system.md for full details.

### Phase 11 — AI Question System
- Conduct trust and security perception tests on the AI modification tools (11.3).
- Evaluate the clarity of AI question generation outputs (11.4).
- See docs/phases/phase-11-ai-question-system.md for full details.

### Phase 12 — AI Interview
- **Critical:** Conduct extensive usability and comfort testing for the AI interview experience with STT/TTS (12.4, 12.5).
- Evaluate student trust and understanding of the interview assessment engine (12.6).
- See docs/phases/phase-12-ai-interview.md for full details.

### Phase 13 — Subscriptions
- Test the effectiveness and perceived value of AI credits (13.3).
- Evaluate the usability of the subscription dashboard and upgrade prompts (13.8).
- See docs/phases/phase-13-subscriptions.md for full details.

### Phase 14 — Production Hardening
- Conduct final accessibility audits across the entire platform (14.1).
- Run summative usability testing on the end-to-end release candidate.
- See docs/phases/phase-14-production-hardening.md for full details.

## 5. Key Guidelines
### 5.1 Technical Standards
- Structure accessibility audits against WCAG 2.1 AA standards, testing with screen readers and keyboard navigation.
- Ensure testing environments accurately reflect the Next.js frontend performance.
- Maintain rigorous data privacy standards when handling user testing data and recordings.

### 5.2 Collaboration Model
- Partner closely with the UX Designer to inform wireframes and test prototypes.
- Present findings and actionable recommendations to the Product Designer and Product Manager.
- Collaborate with the Design System Designer on accessibility requirements for components.
- Share relevant insights with Engineering Leads to provide context for technical decisions.

### 5.3 Tools & Processes
- UserTesting, Lookback, or similar platforms for remote usability testing.
- Optimal Workshop for card sorting and tree testing (Information Architecture).
- Dovetail or similar tools for synthesizing and storing research data.
- Figma (Viewer/Commenter) to review designs and attach research notes.

## 6. Do's ✅
1. Do advocate fiercely for the user, especially the Student during high-stakes exams.
2. Do utilize a mix of qualitative (interviews) and quantitative (surveys, time-on-task) methods.
3. Do clearly separate user observations from your own interpretations in reports.
4. Do test with representative users across all 5 profiles, not just internal team members.
5. Do focus heavily on the cognitive load of Teachers during content creation.
6. Do rigorously test the accessibility of the platform, going beyond automated tools.
7. Do validate the mental models of users regarding complex features like AI and adaptive logic.
8. Do present research findings in a concise, actionable format (e.g., "Insight -> Recommendation").
9. Do involve stakeholders (designers, PMs, engineers) as observers in testing sessions.
10. Do continually update and refine user personas as new data emerges across the 14 phases.
11. Do test the AI interview experience for potential bias, discomfort, or technical friction.
12. Do investigate the emotional journey of users, particularly students receiving exam results.
13. Do prioritize research tasks based on the risk and complexity of the upcoming phase features.
14. Do build a scalable research repository that the whole team can access.
15. Do ensure informed consent and data privacy for all research participants.

## 7. Don'ts ❌
1. Don't ask leading questions during user interviews or usability tests.
2. Don't treat user preferences as product requirements; focus on underlying needs and behaviors.
3. Don't rely solely on automated accessibility checkers; manual testing is mandatory.
4. Don't test only the "happy path"; always evaluate error states and edge cases.
5. Don't present massive, dense research reports that stakeholders won't read.
6. Don't ignore the needs of administrative profiles (Main Admin, Sub-Admin) in your research.
7. Don't conduct research too late in the phase to influence design decisions.
8. Don't assume that a successful test on desktop means it will work well on mobile.
9. Don't let your own biases influence the interpretation of user feedback.
10. Don't test high-fidelity designs when a low-fidelity prototype would suffice for answering the research question.
11. Don't dismiss negative feedback on AI features; investigate the root cause of the mistrust or confusion.
12. Don't recruit users who are overly familiar with the product for baseline usability testing.
13. Don't ignore the context of use (e.g., testing the exam interface in a noisy environment vs. a quiet one).
14. Don't forget to share positive findings and validations, not just problems.
15. Don't proceed with research without clearly defined objectives and hypotheses.

## 8. Quality Gates
- **Research Plan Approval**: Research plans and scripts must be reviewed by the Product Designer before execution.
- **Actionability Check**: Research reports must contain specific, actionable recommendations for design or product.
- **Accessibility Sign-off**: Final accessibility audit reports must be provided before major releases (Phases 6, 13, 14).
- **Stakeholder Presentation**: Key findings must be presented to the cross-functional team, not just delivered as a document.

## 9. Escalation Path
- Difficulty recruiting specific user profiles: Escalate to the Product Manager for assistance.
- Critical usability blockers identified late in the design process: Escalate immediately to the Product Designer and PM.
- Severe accessibility failures in implemented code: Escalate to the Frontend Lead and PM.
- Disagreement on the interpretation of research findings: Discuss with the Product Designer to reach a consensus.

## 10. KPIs & Success Metrics
- **Research Impact**: Number of design or product decisions directly influenced by research findings.
- **Usability Issue Resolution**: Percentage of identified critical usability issues resolved before launch.
- **Accessibility Compliance**: Achieving and maintaining WCAG 2.1 AA status across key flows.
- **Research Cadence**: Consistent delivery of insights aligned with the 14-phase development schedule.
- **Stakeholder Engagement**: Utilization of the research repository and attendance at research presentations.
</UX Researcher — Developer Guidelines & Responsibilities>
