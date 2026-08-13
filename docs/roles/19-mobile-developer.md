# Mobile Developer — Developer Guidelines & Responsibilities

> [!NOTE]
> **Status: Deferred / Not Active for Current Build Phase**
> Native mobile app is **out of scope** for the current build phase (Phases 1–14). The delivery sequence is:
> 1. Full desktop web (Current Build Scope)
> 2. Mobile-responsive/bootstrap web
> 3. Native mobile app — to be scoped only after (1) and (2) are complete.
>
> This document is maintained for future roadmap reference and should not be treated as an active development role during initial build phases.

## 1. Role Overview
The Mobile Developer role focuses on future-proofing the Adaptive Examination & AI Learning Platform for mobile environments (React Native or Flutter). While the current focus is web-based, this role ensures all APIs built today are mobile-ready.

## 2. Core Responsibilities
1. Review API designs from a mobile consumer perspective.
2. Validate API response formats for mobile efficiency.
3. Review and plan mobile authentication flows (e.g., token storage).
4. Plan offline support and synchronization strategies for future mobile apps.
5. Plan push notification API structures.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Mobile App Planning | OWNS |
| API Design (Mobile perspective) | CONSULTS |
| Push Notification API Design | COLLABORATES |
| Backend Implementation | OUT OF SCOPE |
| Frontend Web Implementation | OUT OF SCOPE |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- **1.6 Authentication System:** Review JWT and refresh token strategies for secure mobile token storage.
- **1.10 API Middleware Stack:** Validate API envelope sizes and pagination for mobile efficiency.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- **2.3 Syllabus Tree & 2.6 Student Course Enrollment:** Review payload sizes and plan local caching strategies for the hierarchical tree.

### Phase 3 — Question Bank
- **3.1 Pluggable Question Type System:** Plan mobile UI rendering strategies for varied and rich-text question types.

### Phase 4 — Exam Pattern
- **4.1 Exam Pattern CRUD:** No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- **5.1 Exam Generation Engine:** No primary deliverables. Support other teams as needed.

### Phase 6 — Exam System
- **6.2 Exam Attempt Session & 6.3 Answer Submission:** Plan offline-first mobile sync capabilities for active exams.
- **6.8 Exam-Taking Frontend:** Wireframe the mobile-optimized exam taking interface.

### Phase 7 — Exam Archive
- **7.6 Exam File Storage:** Plan for efficient media delivery and caching on mobile devices.

### Phase 8 — Student Analytics
- **8.4 Syllabus Proficiency Map & 8.6 Student Analytics Dashboard:** Review analytics payloads to prevent over-fetching on mobile.

### Phase 9 — Personalized Practice
- **9.5 Practice Paper Frontend:** Plan mobile-friendly practice interfaces.

### Phase 10 — Preview System
- **10.1 Preview Student Profile:** Ensure mobile API consumption respects impersonation headers and preview audit.

### Phase 11 — AI Question System
- **11.9 AI Question Frontend:** No primary deliverables. Support other teams as needed.

### Phase 12 — AI Interview
- **12.4 Speech-to-Text (STT) Integration & 12.5 Text-to-Speech (TTS) Integration:** Evaluate mobile native API access for STT/TTS vs web endpoints.

### Phase 13 — Subscriptions
- **13.5 Billing Integration:** Plan for in-app purchase (Apple/Google) parity with web billing.

### Phase 14 — Production Hardening
- **14.1 Security Hardening:** Finalize mobile architectural vision (React Native/Flutter) for future development.

## 5. Key Guidelines
### 5.1 Technical Standards
- APIs must follow mobile-first principles (lightweight, minimal chatty requests).
- Authentication must support secure mobile token storage.
### 5.2 Collaboration Model
- Consults with Backend and Software Architects on API design.
### 5.3 Tools & Processes
- Uses Postman/Insomnia for API testing.
- Uses Figma for mobile wireframing.

## 6. Do's ✅
1. Do advocate for minimal payload sizes.
2. Do consider mobile network latency in API reviews.
3. Do plan for offline first capabilities.
4. Do ensure secure token storage patterns are planned.
5. Do review pagination strategies for mobile scrolling.
6. Do consider battery impact of background syncing.
7. Do advocate for bulk/batch API endpoints.
8. Do plan for push notification infrastructure early.
9. Do consider biometric authentication flows.
10. Do document mobile-specific API constraints.
11. Do review image/media delivery formats.
12. Do plan for deep linking architecture.
13. Do consider app store review guidelines in feature planning.
14. Do plan for graceful degradation on poor networks.
15. Do collaborate closely with API designers.

## 7. Don'ts ❌
1. Don't assume mobile networks are as reliable as web.
2. Don't ignore payload size.
3. Don't plan for complex business logic on the mobile client.
4. Don't forget about offline edge cases.
5. Don't ignore token refresh flows.
6. Don't assume all APIs are suitable for mobile without review.
7. Don't delay push notification planning.
8. Don't write backend code.
9. Don't block web development unnecessarily.
10. Don't ignore platform-specific (iOS/Android) design patterns.
11. Don't forget to plan for accessibility on mobile.
12. Don't overcomplicate the initial mobile MVP plan.
13. Don't rely on web-only authentication flows (like strict cookies).
14. Don't ignore deep linking requirements.
15. Don't assume constant connectivity.

## 8. Quality Gates
- All major API designs must pass a mobile-suitability review.
- Mobile architecture document must be reviewed by Software Architect.

## 9. Escalation Path
- Escalate API incompatibilities to Software Architect.
- Escalate feature feasibility issues to Product Manager.

## 10. KPIs & Success Metrics
- Zero major API redesigns required when mobile development starts.
- Completeness of mobile architecture planning.
