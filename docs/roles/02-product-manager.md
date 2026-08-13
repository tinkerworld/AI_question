# Product Manager — Developer Guidelines & Responsibilities

## 1. Role Overview
The Product Manager (PdM) is the visionary and strategic owner of the Adaptive Examination & AI Learning Platform. You ensure the product solves real market problems, achieves product-market fit, and delivers exceptional value to students and educators. You drive the overall product roadmap, balancing the 14 phases of development to deliver the 111 features efficiently. You ensure that the platform's core differentiators—the 3-tier subscription model, AI feature differentiation, and the student learning loop—are flawlessly conceptualized and integrated across the Next.js frontend, Express API, and Python AI services.

## 2. Core Responsibilities
1. **Product Roadmap & Strategy**: Define, own, and communicate the long-term vision and roadmap for the platform.
2. **Market & User Research**: Conduct interviews, surveys, and market analysis to understand student and educator needs.
3. **Feature Prioritization**: Prioritize the 111 features across the 14 phases based on value, effort, and strategic alignment.
4. **Value Proposition Definition**: Clearly articulate the value of the 3-tier subscription model and AI capabilities.
5. **Requirements Definition**: Author high-level Product Requirements Documents (PRDs) and user stories.
6. **Go-to-Market Strategy**: Collaborate with marketing and sales for product launches and user acquisition.
7. **Metrics & Analytics**: Define and monitor key product metrics (acquisition, activation, retention, revenue, referral).
8. **Stakeholder Alignment**: Ensure business stakeholders, engineering, and design are aligned on product direction.
9. **Competitive Analysis**: Continuously monitor the EdTech landscape to maintain the platform's competitive edge.
10. **Feedback Loop Management**: Implement mechanisms to capture user feedback and integrate it into the backlog.

## 3. Work Boundaries
| Area | Ownership Level |
| :--- | :--- |
| Product Roadmap & Vision | OWNS |
| Feature Prioritization | OWNS |
| Market Fit & User Research | OWNS |
| High-Level User Stories (Epics) | OWNS |
| UI/UX Design & Architecture | COLLABORATES (with Designers/Architects) |
| Sprint Backlog & Acceptance Criteria | CONSULTS (with Product Owner) |
| Technical Implementation Details | OUT OF SCOPE |
| Project Schedules & Budgets | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **Product Decisions**: Define core user personas, finalize the MVP scope for 1.7 User Management and 1.8 Role & Permission Management.
- **Research**: Validate the pain points in existing examination systems.
- **Metrics**: Establish baseline KPIs for system performance and user onboarding.

### Phase 2 — Academic Structure
- **Product Decisions**: Finalize the taxonomy (2.1 Course, 2.2 Subject, 2.3 Syllabus Tree).
- **Research**: Interview curriculum designers to ensure the structure meets real-world syllabus needs.
- **Metrics**: Taxonomy completeness, admin configuration time.

### Phase 3 — Question Bank
- **Product Decisions**: Prioritize the 3.1 Pluggable Question Type System and 3.5 Question Lifecycle.
- **Research**: Test question authoring workflows (3.2 Question CRUD) with content creators.
- **Metrics**: Question creation efficiency, bulk upload success rate.

### Phase 4 — Exam Pattern
- **Product Decisions**: Define the exam blueprint parameters (4.1 Exam Pattern CRUD, 4.4 Topic Distribution, 4.5 Difficulty Distribution).
- **Research**: Validate blueprint complexity with educators.
- **Metrics**: Time to build an exam pattern, blueprint flexibility satisfaction.

### Phase 5 — Exam Generator
- **Product Decisions**: Define the logic for 5.1 Exam Generation Engine and 5.4 Manual Exam Creation.
- **Research**: Validate generation speed and accuracy with stakeholders.
- **Metrics**: Time to generate an exam, blueprint adherence accuracy.

### Phase 6 — Exam System
- **Product Decisions**: Define the 6.2 Exam Attempt Session experience and 6.5 Auto-Evaluation Engine logic.
- **Research**: Usability testing on the Next.js 6.8 Exam-Taking Frontend under stress.
- **Metrics**: Exam completion rate, reported technical issues per exam.

### Phase 7 — Exam Archive
- **Product Decisions**: Determine requirements for 7.1 Exam Publication Workflow and 7.3 Answer Key Preservation.
- **Research**: Validate historical record keeping needs with institutional admins.
- **Metrics**: Archival reliability, search speed for historical exams.

### Phase 8 — Student Analytics
- **Product Decisions**: Determine critical data points for 8.6 Student Analytics Dashboard and 8.1 Mastery Engine.
- **Research**: Test dashboard comprehension with end-users.
- **Metrics**: Dashboard engagement, report download frequency.

### Phase 9 — Personalized Practice
- **Product Decisions**: Define the student learning loop via 9.1 Weakness Pool Generation and 9.2 Personalized Practice Paper Generation.
- **Research**: Validate recommendation relevance with students.
- **Metrics**: Engagement with recommended practice papers, improvement in subsequent exam scores.

### Phase 10 — Preview System
- **Product Decisions**: Scope the 10.3 Impersonation System and 10.6 Preview Workflow.
- **Research**: Test the preview configurations with content creators.
- **Metrics**: Defect rate found in preview vs production, preview usage time.

### Phase 11 — AI Question System
- **Product Decisions**: Define the "magic" moments for 11.4 AI Question Generation Worker and 11.3 AI Question Modification Worker.
- **Research**: Test AI-generated question quality with subject matter experts.
- **Metrics**: AI generation time, manual correction rate of AI questions.

### Phase 12 — AI Interview
- **Product Decisions**: Shape the 12.3 Controlled Natural Conversation Engine and 12.6 Interview Assessment Engine.
- **Research**: Validate STT/TTS (12.4, 12.5) naturalness with test students.
- **Metrics**: Interview completion rate, feedback generation accuracy.

### Phase 13 — Subscriptions
- **Product Decisions**: Finalize pricing, tier features via 13.1 Entitlement Engine, and 13.3 AI Credit System.
- **Research**: Pricing sensitivity analysis, conversion optimization.
- **Metrics**: Conversion rate by tier, MRR, churn rate, Customer Acquisition Cost (CAC).

### Phase 14 — Production Hardening
- **Product Decisions**: Finalize go-to-market plan, coordinate on 14.8 Data Privacy & Compliance.
- **Research**: Beta user feedback analysis.
- **Metrics**: Day 1 active users, critical bug reports, NPS.

## 5. Key Guidelines

### 5.1 Technical Standards
- Understand the API-first strategy: Ensure product requirements treat the Express + TypeScript API as a standalone product.
- Be aware of the AI Gateway pattern: Plan AI features to be provider-agnostic, avoiding lock-in to OpenAI/Anthropic.
- Ensure product requirements support Module Independence (e.g., Auth module shouldn't strictly depend on Subscriptions).

### 5.2 Collaboration Model
- Work directly with the Product Owner to translate the Roadmap into actionable Sprint Backlogs.
- Collaborate with the Next.js frontend team to ensure the UX matches user expectations.
- Partner with the Python AI team to ground AI feature requests in technical reality.

### 5.3 Tools & Processes
- **Roadmapping**: Aha! / Productboard / Jira Product Discovery
- **Analytics**: Mixpanel / Amplitude / Google Analytics
- **Research**: Dovetail / UserTesting / Qualtrics
- **Design**: Figma (collaboration)

## 6. Do's ✅
1. DO champion the student learning loop in every relevant feature discussion.
2. DO clearly differentiate feature availability across the 3-tier subscription model.
3. DO base product decisions on data, user research, and market trends.
4. DO maintain a prioritized, rolling 6-month product roadmap.
5. DO write clear, concise Product Requirements Documents (PRDs) focusing on the 'Why' and 'What'.
6. DO communicate the product vision frequently to the engineering teams.
7. DO validate assumptions with prototypes before requesting full implementation.
8. DO track both behavioral (Mixpanel) and business (Revenue/Churn) metrics.
9. DO ensure the Next.js frontend delivers a seamless, responsive experience.
10. DO treat the API as a product, ensuring it's robust enough for potential B2B integrations.
11. DO define clear success metrics for every one of the 14 phases.
12. DO participate in sprint reviews to provide direct feedback on built features.
13. DO understand the limitations and costs of AI providers used in the AI Gateway.
14. DO manage stakeholder expectations rigorously.
15. DO conduct post-launch analyses to measure actual performance against projected metrics.

## 7. Don'ts ❌
1. DON'T dictate technical architecture or implementation details (e.g., don't tell the team to use Prisma, let them decide).
2. DON'T change priorities in the middle of a sprint.
3. DON'T assume all users want AI features; provide opt-outs or alternative workflows.
4. DON'T ignore the technical debt implications of rushing features to market.
5. DON'T build features just because a competitor has them without validating user need.
6. DON'T launch Phase 13 (Subscriptions) without fully testing the edge cases of the 3 tiers.
7. DON'T treat QA and the ~1,600 test cases as an afterthought.
8. DON'T hoard user feedback; share it transparently with the development team.
9. DON'T add features to a phase that violate the module independence principle.
10. DON'T ignore the performance requirements of the platform (e.g., load times during exam delivery).
11. DON'T rely solely on internal opinions; talk to real users.
12. DON'T write user stories without clear, measurable business value.
13. DON'T promise features to sales/marketing without engineering alignment.
14. DON'T forget to plan for administrative and support tooling, not just end-user features.
15. DON'T neglect the mobile experience when planning the Next.js web application.

## 8. Quality Gates
- **PRD Review**: PRDs must be reviewed and signed off by Tech Lead and Design Lead.
- **Phase Readiness**: Market research and UI/UX designs must be complete before a phase begins.
- **Launch Gate**: Feature must meet defined adoption or performance metrics in beta before general availability.

## 9. Escalation Path
1. **Feasibility Issue**: Work with Tech Lead/Architect to find alternative solutions.
2. **Timeline Conflict**: Escalate to Project Manager to negotiate scope vs. schedule.
3. **Strategic Misalignment**: Escalate to Executive Stakeholders/Sponsors.

## 10. KPIs & Success Metrics
- **Product-Market Fit**: Net Promoter Score (NPS) and Customer Satisfaction (CSAT).
- **Adoption Rate**: Percentage of target users adopting new features.
- **Engagement**: Monthly Active Users (MAU) and Daily Active Users (DAU).
- **Monetization**: Conversion rate to paid tiers and Monthly Recurring Revenue (MRR).
- **Retention**: Churn rate and Customer Lifetime Value (CLTV).
