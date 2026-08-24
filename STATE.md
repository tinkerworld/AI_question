# ExamOS Build State

**Last updated:** 2026-08-24T19:50:00+05:30  
**Current phase:** Phase 13 — Subscriptions & Entitlements (Entitlement Engine `@repo/entitlement-engine`, Subscription Plans & Upgrades, AI Credits, Pluggable Billing Adapter, Refund Engine & Clawback, Preview Mode Billing, Free Tier Boundary Enforcement) — **COMPLETED & FULLY TESTED**  
**Task Status:**
- **Phase 13 Tasks (13.1 to 13.8)**: `tested` in `tools/build-tracker/state.json` (Implemented, verified across Phase 13 Master Backend Suite + Playwright E2E UI Tests + Full 14-Suite Master Regression Suite).
- **Phase 12 Tasks (12.1 to 12.11)**: `tested` in `tools/build-tracker/state.json` (Implemented, verified across Phase 12 Master Backend Suite + Playwright E2E UI Tests + Full 12-Suite Master Regression Suite).
- **Phase 11 Tasks (11.1 to 11.9)**: `tested` in `tools/build-tracker/state.json` (Implemented, verified across Phase 11 Master Backend Suite + Multi-Provider Stacking + Daily Caps + Frontend Tests).
- **Phase 10 Tasks (10.1 to 10.7)**: `tested` in `tools/build-tracker/state.json` (Implemented, verified across Phase 10 Master Backend Suite + Playwright E2E UI Tests).
- **Phase 9 Tasks (9.1 to 9.5)**: `tested` in `tools/build-tracker/state.json` (Implemented, verified across Phase 9 Master Backend Suite + Playwright E2E UI Tests).
- **Phase 8 Tasks (8.1 to 8.7)**: `tested` in `tools/build-tracker/state.json` (Implemented, verified across Phase 8 Master Backend Suite + Playwright E2E UI Tests).
- **Phase 7 Tasks (7.1 to 7.7)**: `tested` in `tools/build-tracker/state.json` (Implemented, verified across Phase 7 Master Backend Suite + Playwright E2E tests).
- **Phase 6 Tasks (6.1 to 6.8)**: `tested` in `tools/build-tracker/state.json` (Implemented, verified across 19 backend tests + Playwright UI tests + Section 7 IDOR cross-account tests).
- **Task 6.9 (Exam Player Container Sizing Bug)**: `pending` in `tools/build-tracker/state.json` (Root cause documented, pending targeted styling sprint).
- **Phase 5 Tasks (5.1 to 5.4)**: `tested` in `tools/build-tracker/state.json` (Implemented & verified).
- **Task 2.5 (Course-Subject-Syllabus Frontend)**: `tested` in `tools/build-tracker/state.json`.
- **Task 3.7 (Question Bank Frontend)**: `tested` in `tools/build-tracker/state.json`.

---

## 0. Phase 13: Subscriptions & Entitlements Architecture & Implementation

Phase 13 establishes the enterprise subscription management and entitlement enforcement engine. It introduces an isolated `@repo/entitlement-engine` package, dynamic plan definitions (`FREE`, `PREMIUM`, `PREMIUM_PLUS`), feature gating and allowance evaluations, pluggable billing adapter architecture with mock/test default, top-up AI credit booster packages, automated financial refund and entitlement clawback, and live Preview Mode simulated billing tier enforcement.

### 0.1 Entitlement Engine & Plan Definitions (`@repo/entitlement-engine`)
- **Package Architecture**: Pure, framework-agnostic entitlement calculation engine located in `packages/entitlement-engine`.
- **Three Core Tiers**:
  - `FREE`: 2 mock tests, 1 AI interview/day, 20 daily AI credits, 10-min demo duration; personalized practice and full assessment disabled.
  - `PREMIUM`: Unlimited mock tests, 2 AI interviews/day, 50 daily AI credits, unlimited duration; full assessment, personalized practice, and custom topics enabled.
  - `PREMIUM_PLUS`: Unlimited mock tests, 10 AI interviews/day, 100 daily AI credits, unlimited duration; priority AI routing and all features enabled.
- **Rule Resolution**: Supports `BOOLEAN` feature gates, `NUMERIC` quotas, and `STRING_MATCH` rules with fallbacks and custom rule override capabilities.

### 0.2 Pluggable Billing Adapter Architecture (`BillingAdapter`)
- **Interface**: Pluggable `BillingAdapter` (`apps/api/src/services/billing/billing-adapter.interface.ts`) defining `createCheckoutSession`, `handleWebhookEvent`, `issueRefund`, and `cancelSubscription`.
- **Default Adapter**: Deterministic `MockBillingAdapter` for instant, reliable, zero-external-dependency test execution and simulated checkouts.
- **Unified Checkout**: Dispatches checkout sessions for recurring plan subscriptions or one-time AI credit booster packs (`pkg_1`, `pkg_5`, `pkg_20`).

### 0.3 Financial Refund Engine & Entitlement Clawback
- **Refund Processing**: Main Admin can issue full or partial refunds for completed invoices (`POST /api/v1/billing/refund`).
- **Entitlement Clawback**:
  - **Plan Subscriptions**: Automatically cancels active subscription and downgrades user immediately to `FREE` tier.
  - **Credit Packages**: Claws back unspent purchased credits without taking user balance negative.
- **Dual-Entry Financial Audit Trail**: Logs every refund action with original transaction ID, refunded amount, reason, and actor ID.

### 0.4 Preview Mode Simulated Billing Integration
- **Dormant Setting Activated**: Connects the `billingPlan` selector in `PreviewConfigurationModal.tsx` directly to the `sessionData.simulatedPlan` JWT payload.
- **In-Memory Enforcement**: When `impersonationMode === 'PREVIEW_STUDENT'`, `EntitlementService` evaluates the simulated tier without mutating database rows, enabling staff to accurately test plan limits and upgrade paywalls as a student.

### 0.5 Subscription & Billing Dashboard UI ([`SubscriptionPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/SubscriptionPage.tsx))
- **Student Dashboard**: Plan comparison matrix with current tier badge, AI credit booster packs, simulated checkout modal with test card presets, and user invoice history table.
- **Admin Financial Workbench**: Financial overview stats (Gross Revenue, Total Invoiced, Total Refunded), system transaction log, and interactive refund issuance modal.

---

## 0. Phase 12: AI Interview System Architecture & Implementation

Phase 12 establishes the conversational AI Interview and Oral Assessment System. It integrates conversational AI into the ExamOS question type registry, enforces derived course eligibility, provides Web Speech API speech-to-text (STT) and text-to-speech (TTS) capabilities, implements multi-turn Socratic oral interviews, and delivers multi-criteria post-interview rubric evaluations.

### 0.1 `INTERVIEW` Question Type & Rubric Data Structure
- **Question Type Engine**: Registered `INTERVIEW` as a first-class `BuiltInQuestionType` in `@repo/question-types` with `InterviewHandler` and schema validation.
- **Rubric Flexibility**: Dynamic rubric structure supporting varying evaluation paradigms:
  - **UPSC Personality Test**: 4 Criteria (Analytical & Problem-Solving Depth, Constitutional Awareness & Integrity, Crisis Management & Decisiveness, Communication & Balanced Demeanor) on a 0-100 scale.
  - **IELTS Speaking**: 4 Band Criteria (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation & Oral Delivery) on a 0-9 scale.
  - **System Design / Technical Interview**: 4 Criteria (Requirements & Scope Clarification, Architectural Decomposition & Tradeoffs, Scalability & Resilience, Technical Articulation).
  - **Behavioral / HR**: 4 Criteria (STAR Method Structure, Leadership & Team Collaboration, Conflict Resolution, Self-Awareness).
  - **Custom Rubrics**: Arbitrary user-defined criteria, max points, and weightages.

### 0.2 Derived Course Interview Eligibility
- **Eligibility Definition**: Course interview eligibility is **derived directly from content**, not a manual boolean column.
  - A course $C$ is interview-eligible iff $\exists Q \in \text{questions} \text{ where } Q.\text{type} = \text{'INTERVIEW'} \land Q.\text{status} = \text{'PUBLISHED'} \land (Q.\text{courseId} = C.\text{id} \lor Q.\text{subjectId} \in \text{subjects}(C))$.
  - A student is eligible to take interviews iff they have an active enrollment in $\ge 1$ interview-eligible course.
- **Sidebar Two-Part Gate**: The `AI Interview` navigation item in [`App.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx) performs a two-part gate:
  1. Permission check: `interview.attempt`
  2. Active enrollment eligibility: verified via `/api/v1/interview/eligibility`. Students enrolled exclusively in non-interview courses (e.g. JEE/NEET only) see **no** interview tab.

### 0.3 Multi-Turn Conversational Gateway (`scope: 'interview'`)
- Routed through `AIService.routeConversation()` strictly isolated under `scope: 'interview'`.
- Respects the 6-provider priority cascade (`prov_interview_cloud_groq` -> `prov_interview_cloud_gemini` -> `prov_interview_cloud_openrouter` -> `prov_interview_cloud_openai` -> `prov_interview_local_ollama` -> `prov_interview_mock_01`), independent circuit breakers, and per-feature daily usage limits.
- Examiner AI adopts the specified persona and asks probing Socratic follow-up questions tailored to candidate answers.

### 0.4 Post-Session Rubric Evaluation & Scorecard
- Evaluates the full transcript against the question's rubric criteria.
- Computes overall score, percentage, band descriptor / rating tier, per-criterion numerical marks and feedback, key strengths, and constructive coaching recommendations.
- Interactive frontend in [`InterviewPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/InterviewPage.tsx) with Practice vs Exam modes, voice recording/readout, and historical attempts scorecard viewer.

---

## 0. Phase 11: AI Question System Architecture & Implementation

Phase 11 establishes the enterprise-grade AI Question System within ExamOS. It introduces a multi-tiered AI Gateway with circuit-breaker protection, an isolated `@repo/ai-client` SDK package, automated question blueprint generation, question variation modification preserving concept lineage, active daily credit & monthly token cap enforcement, an asynchronous batch worker queue, and an educator draft review workflow with human-in-the-loop governance.

### 0.1 AI Gateway Architecture & Model Routing (Features 11.1, 11.2, 11.7, 11.8)
- **Multi-Provider Priority Routing**:
  - `MOCK` (Priority: 1): Deterministic mock completion engine for 100% zero-cost test/dev execution.
  - `LOCAL` (Priority: 2): Ollama / LocalAI API integration (`http://localhost:11434/v1`).
  - `CLOUD` (Priority: 3): OpenAI API integration with server-side credentials and rate-limit backoff.
- **Circuit Breaker Pattern**:
  - If a provider encounters 3 consecutive failures (timeouts, 5xx server errors, rate limits), the circuit breaker trips for 5 minutes, bypassing the provider and cascading to the next priority tier.
- **Schema Validation & Self-Correction**:
  - Output JSON is parsed and validated against expected question structures. If the model produces invalid JSON or missing fields, the gateway automatically retries once with explicit JSON correction instructions before falling back.
- **`@repo/ai-client` SDK Package**:
  - Encapsulated client with custom typed error hierarchy (`AIClientError`, `AITimeoutError`, `AIRateLimitError`, `AIQuotaExhaustedError`, `AIValidationError`, `AIVendorUnavailableError`), exponential backoff retries, and timeout abort controllers.

### 0.2 Question Generation, Variations & Version History (Features 11.3 & 11.4)
- **AI Question Modification (`/api/v1/ai/questions/modify`)**:
  - Takes a source question and generates an academic variation with parameterized variance levels (`LOW`, `MEDIUM`, `HIGH`).
  - Inherits course, subject, and syllabus topic linkages automatically.
  - Saves as a new question in `DRAFT` status with `isAiGenerated = true` and `derivedFromId = <sourceId>`.
  - Records an immutable revision entry in `question_versions` with change summary: `"AI-modified variation derived from <id> (<instructions>)"`.
- **AI Question Generation (`/api/v1/ai/questions/generate`)**:
  - Authors brand-new questions from blueprint parameters (subject, topic, difficulty, type, marks, custom instructions).
  - Defaults to `DRAFT` status to preserve human educator review governance.
  - Records initial version entry in `question_versions` with summary `"AI-generated draft question"`.

### 0.3 Credit Balances, Token Quotas & Usage Tracking (Feature 11.5)
- **Daily Included Credits**: Automatically replenished at 00:00 UTC each day (Teachers: 150 credits, Admins: 500 credits, Students: 20 credits).
- **Purchased Credits**: Non-expiring credit pool used when daily credits are exhausted.
- **Hard Quota Enforcement**: If total available credits reach 0 or monthly token cap is reached, requests are strictly rejected with `402 Payment Required` (`CREDITS_EXHAUSTED` / `MONTHLY_TOKEN_CAP_REACHED`).
- **Automated Failure Refund**: If an AI generation attempt fails downstream, credits are automatically refunded to the user's balance.
- **Audit History**: Every AI call records tokens used, credits deducted, latency, and status in `ai_usage_history` and `ai_gateway_logs`.

### 0.4 Async Batch Worker Queue (Feature 11.6)
- **Background Worker Queue**:
  - When batch size $N > 1$, generation requests are immediately assigned a job ID (`job_*`) and enqueued in `QUEUED` status.
  - Asynchronous worker processes items with progressive status updates (`QUEUED` -> `PROCESSING` -> `COMPLETED`/`FAILED`).
  - Polling endpoint `GET /api/v1/ai/questions/generation-jobs/:jobId` returns real-time progress percentages and array of generated question IDs.

### 0.5 Educator Draft Review Queue & Frontend UI (Feature 11.9)
- **Human-in-the-Loop Review Workflow**:
  - Dedicated `✨ AI Draft Review Queue` subtab in [`QuestionBankPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/QuestionBankPage.tsx) displaying pending draft AI questions.
  - Review actions: `✅ Approve & Publish` (transitions question status `DRAFT` -> `PUBLISHED`, version incremented) and `❌ Reject` (transitions `DRAFT` -> `ARCHIVED` with rejection reason audited).
- **Interactive Modals**:
  - [`AIGeneratorModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/ai/AIGeneratorModal.tsx): Subject/Topic selection, difficulty, marks, count, custom instructions, and live progress bar.
  - [`AIQuestionModifierModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/ai/AIQuestionModifierModal.tsx): Question reference stem, variance selector, instructions, and variation generation.
  - [`AIUsageModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/ai/AIUsageModal.tsx): Daily credit allowances, purchased balances, monthly token quota bar, and recent audit log history table.
- **Permission Boundaries & IDOR Security**:
  - `MAIN_ADMIN`, `SUB_ADMIN`, `TEACHER`: Authorized for AI generation, variation modification, and draft reviews.
  - `STUDENT`: Strictly forbidden from question generation or draft review (returns 403 `PERMISSION_DENIED`). Students are only authorized to read their own usage and balance (`ai.usage_read`).

---

## 0. Phase 10: Preview System & Impersonation Architecture

Phase 10 establishes the secure Preview Persona and Real Student Impersonation subsystem. It enables staff (Teachers and Administrators) to test draft exams and curriculum structures from a simulated student perspective with parameterized entitlements, and enables Administrators to troubleshoot real student accounts with strict role-gating, dual-identity cryptographic tokens, mandatory audit justifications, global sticky warning banners, and an in-app Security Audit Trail Viewer.

### 0.1 Security Architecture & Impersonation RBAC
- **Strict Role Permissions Matrix**:
  - `MAIN_ADMIN` & `SUB_ADMIN`: Granted `preview.use`, `preview.config`, `impersonate.use`, `preview.audit_read`. Can use Preview Student mode and impersonate real students.
  - `TEACHER`: Granted `preview.use`, `preview.config`. Can use Preview Student mode to test courses and draft exams. **STRICTLY FORBIDDEN** from impersonating real students (403 `TEACHER_IMPERSONATION_FORBIDDEN`). Impersonate button is strictly hidden on teacher/admin rows in UI.
  - `STUDENT`: Neither preview nor impersonation permissions. Cannot launch preview sessions or read preview audit logs (403).
  - **Staff Protection**: Administrators cannot impersonate other staff (Admin or Teacher) — returns 403 `CANNOT_IMPERSONATE_STAFF` and button is not rendered in UI for staff rows.
- **Dual-Identity JWT Mechanism**:
  - `sub`: Effective user ID (e.g., `usr_preview_student` or `usr_student_test`).
  - `email`: Effective user email.
  - `roles`: `['STUDENT']`.
  - `isImpersonation`: `true`.
  - `actorUserId`: Staff user ID (e.g., `usr_admin_test`).
  - `actorEmail`: Staff user email.
  - `impersonationMode`: `'PREVIEW_STUDENT'` | `'IMPERSONATE_REAL_STUDENT'`.
  - `sessionData`: `{ simulatedPlan, contentVersion, usageMode, courseAccess, featureFlags }`.
- **Mandatory Justification Audit Rule**:
  - Impersonating a real student strictly requires a justification `reason` string of at least 10 characters (validated by Zod and backend service).
- **Dual-Entry Audit Logging & In-App Viewer**:
  - Every session start, stop, or entitlement switch is permanently written to `preview_audit_logs` and mirrored into `audit_logs`, capturing `actorUserId`, `effectiveUserId`, `impersonationMode`, `action`, `resource`, `details`, `ipAddress`, and `createdAt`.
  - Gated on `preview.audit_read`, the dedicated `🛡️ Security & Impersonation Audit Trail` viewer in [`UsersPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/UsersPage.tsx) allows authorized administrators to inspect, search, and filter all live and historical audit logs.

### 0.2 Feature Scope (10.1 to 10.7)
- **Feature 10.1: Preview Student Profile (`preview.service.ts`)**: Profile CRUD with simulated billing plans (`FREE`, `PREMIUM`, `PREMIUM_PLUS`), content versions (`DRAFT`, `REVIEW`, `PUBLISHED`), and QA limit enforcement modes.
- **Feature 10.2: Preview Configuration UI ([`PreviewConfigurationModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/PreviewConfigurationModal.tsx))**: Quick presets ("Free Student", "Premium Student", "Premium+ QA", "Draft Reviewer"), custom plan selectors, and course multi-select.
- **Feature 10.3: Impersonation System & Modal ([`ImpersonationModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/ImpersonationModal.tsx))**: User table row trigger for Admins (hidden on staff rows), security warning, mandatory 10-char justification input, and session issuance.
- **Feature 10.4: Entitlement Integration**: Full pass-through of simulated plans and bypass modes into downstream engine checks.
- **Feature 10.5: Preview Audit Trail & Viewer**: `GET /api/v1/preview/audit-logs` endpoint with pagination and permission gating, rendered in the `🛡️ Security & Impersonation Audit Trail` subtab of [`UsersPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/UsersPage.tsx).
- **Feature 10.6: Preview Workflow**: One-click "⚡ Preview as Student" directly from Exam Generator inspector header.
- **Feature 10.7: Preview Frontend Banner ([`PreviewBanner.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/PreviewBanner.tsx))**: Sticky top banner displaying mode styling (amber for preview, red for real student impersonation), persona details, countdown timer, quick config trigger, and instant session exit.

---

## 0. Phase 8: Student Analytics & Mastery Engine Architecture

Phase 8 establishes the recency-weighted Mastery Engine (`@repo/mastery-engine`), syllabus-linked topic performance analytics, automatic strength and weakness ranking, hierarchical syllabus proficiency roll-up trees, historical timeseries progress tracking, and dedicated interactive dashboards for students and faculty.

### 0.1 Architecture & Database Schema
- **Tables Added & Migrated**:
  - `student_mastery`: `userId` (UNIQUE FK), `overallProficiency`, `totalExamsTaken`, `totalQuestionsAttempted`, timestamps.
  - `student_topic_progress`: `userId`, `syllabusNodeId` (UNIQUE pair), `proficiencyScore`, `attemptsCount`, `correctCount`, `status`, `statusChangedAt`, `lastEvaluatedAt`, timestamps.
  - `student_weaknesses`: `userId`, `syllabusNodeId` (UNIQUE pair), `errorRate`, `severity` (`CRITICAL`, `MODERATE`, `MINOR`), `isActive`, `firstWeakAt`, timestamps.
  - `student_strengths`: `userId`, `syllabusNodeId` (UNIQUE pair), `masteryScore`, `confidenceCount`, timestamps.
  - `mastery_score_history`: `userId`, `syllabusNodeId`, `attemptId`, `score`, `status`, `recordedAt`.
- **Topic Linkage at Attempt-Start (ADR Freeze)**: `syllabusNodeId`, `subjectId`, and `courseId` are frozen in `questionSnapshot` during `startAttempt` with live metadata fallback for legacy attempts.
- **Automated Recalculation on Exam Submission**: When an exam attempt is submitted and auto-evaluated in `attempt.service.ts`, `analyticsService.recalculateStudentMastery(userId)` is automatically triggered.

### 0.2 Feature Scope & Implementation Details (8.1 to 8.7)
- **Feature 8.1: Mastery Engine Package (`@repo/mastery-engine`)**:
  - `calculateTimeWeightedScore()`: Recency-weighted proficiency calculation ($w_i = 1.0 + 0.5 \times i$).
  - `mapScoreToStatus()`: Maps scores to `MASTERED` (>=85, GREEN), `STRONG` (70-84, BLUE), `DEVELOPING` (50-69, YELLOW), `NEEDS_PRACTICE` (30-49, ORANGE), `WEAK` (<30, RED), `NOT_ATTEMPTED` (0, GREY).
- **Feature 8.2: Strengths Identification**:
  - `identifyStrengths()`: Surfaces GREEN/BLUE topics with $\ge 2$ attempts, ranked by score descending and attempts descending.
- **Feature 8.3: Weakness Identification**:
  - `identifyWeaknesses()`: Surfaces RED/ORANGE topics, classified into `CRITICAL` (<30%), `MODERATE` (30-45%), `MINOR` (45-50%), with duration tracking in days.
- **Feature 8.4: Syllabus Proficiency Map**:
  - `buildSyllabusProficiencyTree()`: Hierarchical roll-up of scores and completion percentages across Subject -> Topic -> Subtopic -> Concept.
- **Feature 8.5: Progress Tracking & Historical Trends**:
  - `calculateStudentProgress()`: Timeseries score aggregation and trend detection (`IMPROVING`, `DEGRADING`, `PLATEAU`).
- **Feature 8.6: Student Analytics Dashboard UI**:
  - [`StudentAnalyticsPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/StudentAnalyticsPage.tsx): Summary metric cards, Top Strengths & Priority Focus Areas dual panels, SVG timeseries progression charts, and interactive collapsible syllabus tree.
- **Feature 8.7: Faculty & Institutional Analytics UI**:
  - [`TeacherAnalyticsPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/TeacherAnalyticsPage.tsx): Class course selector, aggregate metrics, cohort common weaknesses matrix, searchable student roster, and modal student drilldown.
  - [`AnalyticsPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/AnalyticsPage.tsx): Unified router wired into [`App.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx) supporting role-switching.
- **Section 7 IDOR Security Enforced**:
  - Strictly verifies requesting user matches target student ID on `/api/v1/students/:id/*` endpoints unless caller possesses elevated permissions (`analytics.read` or `TEACHER`/`ADMIN` role). Rejected with 403 Forbidden.

---

## 1. Phase 7: Published Exam Archive Implementation & Architecture

Phase 7 establishes the immutable exam vault, publication workflow state machine, snapshot creation with Question Bank isolation, permission-gated answer key preservation, and post-publish errata correction workflow.

### 1.1 Architecture & ADR-007 Immutability Guarantee
- **Frozen Published Exam Snapshots (ADR-007)**: When an exam reaches `PUBLISHED` status, a deep frozen copy of the exam metadata, sections, and questions is written to `exam_snapshots`, `exam_snapshot_sections`, and `exam_snapshot_questions`.
- **Question Bank Isolation**: The frozen snapshot stores full decoupled JSON content (`questionContent`, `answerKey`, `marks`, `negativeMarks`). Subsequent edits or deletions in the Question Bank do NOT mutate published exams.
- **Strict Immutability**: Any direct `PATCH`, `PUT`, `DELETE`, or question swap on published exams returns `400 EXAM_IMMUTABLE`.
- **Post-Publish Errata Workflow**: Errata corrections are executed via `POST /api/v1/exams/:id/corrections`, generating an immutable version 2 snapshot (`v2.0`) and auditing changes in `exam_corrections`.

### 1.2 Feature Scope (7.1 to 7.7)

#### Feature 7.1: Exam Publication Workflow
- **State Machine Transitions**: `DRAFT` -> `PREVIEW` -> `REVIEW` -> `APPROVED` -> `PUBLISHED` -> `ARCHIVED`. Invalid transitions (e.g. `DRAFT` -> `PUBLISHED` directly) are rejected with `400 INVALID_STATE_TRANSITION`.
- **Reviewer Assignment**: `POST /api/v1/exams/:id/reviewers` records reviewer assignment in `exam_reviewers` and logs workflow transitions.
- **Workflow History**: `GET /api/v1/exams/:id/workflow-history` provides complete audit logs of state transitions and reviewer remarks.

#### Feature 7.2: Published Exam Snapshot Creation
- `GET /api/v1/archive/exams/:id/snapshot`: Returns full frozen question paper snapshot including sections, question content, options, marks, and negative marking configuration.

#### Feature 7.3: Preserved Answer Key & Permission Gating
- `GET /api/v1/archive/exams/:id/answer-key`: Returns preserved answer keys and step-by-step solutions.
- **Permission Gating (ADR-005)**: Strictly requires `archive.answer_key` permission. Unprivileged users (e.g., students) receive `403 Forbidden`.

#### Feature 7.4: Exam Archive Search & Filtering
- `GET /api/v1/archive/exams`: Multi-criteria search across academic year, course, subject, and text query with pagination and total vault statistics.

#### Feature 7.5: Historical Exam Integrity & Version History
- `GET /api/v1/archive/exams/:id/history`: Retrieves version history showing all snapshot versions (V1, V2) and errata logs.
- `POST /api/v1/exams/:id/corrections`: Creates versioned errata snapshot without mutating historical records.

#### Feature 7.6: Exam File Storage & Assets
- `POST /api/v1/exams/:id/files`: Secure exam asset upload with MIME type enforcement (`application/pdf`, `image/png`, `image/jpeg`).
- `GET /api/v1/archive/exams/:id/pdf`: Retrieves published question paper PDF download record.

#### Feature 7.7: Published Exam Archive Workbench
- **[`ExamArchivePage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/ExamArchivePage.tsx)**: Full workbench UI for searching archived exams, viewing frozen paper snapshots in a read-only viewer modal, viewing preserved answer keys with permission gating, inspecting version history, and applying official post-publish errata corrections.
- **Navigation Integration**: Wired into [`App.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/App.tsx) `NAV_ITEMS` gated strictly on `archive.read` permission.

---

## 2. Standing E2E Browser Test Suite (`tools/e2e-tester`)

A permanent, automated Playwright UI regression test suite is established in [`tools/e2e-tester`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester) and run directly via [`run_ui_tests.bat`](file:///D:/Download/Company/Software/Test%20os/Exam/run_ui_tests.bat).

- **Current Suite Status**: **33 / 33 Tests Passing (100%)** across 9 spec files.

### 2.1 Spec Coverage Summary (33 Tests)
1. **[`e2e/courses.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/courses.spec.ts)** (3 tests): Course creation, subject CRUD roundtrip, syllabus tree.
2. **[`e2e/exam-archive.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-archive.spec.ts)** (4 tests): Vault navigation, stats, frozen snapshot viewer, preserved answer key permission gating, version history & post-publish errata.
3. **[`e2e/exam-generator.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-generator.spec.ts)** (3 tests): Blueprint generation, inspection, publishing locks.
4. **[`e2e/exam-patterns.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-patterns.spec.ts)** (3 tests): Admin pattern creation, edit PATCH, sub-admin permissions.
5. **[`e2e/navigation.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/navigation.spec.ts)** (5 tests): Nav tab rendering, placeholder validation.
6. **[`e2e/question-bank.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/question-bank.spec.ts)** (4 tests): Question authoring, version history drawer, status lifecycle, multi-filtering.
7. **[`e2e/role-based-access.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/role-based-access.spec.ts)** (5 tests): Persona authentication, 403 API permission rejection, student nav tab gating, teacher nav tab gating.
8. **[`e2e/student-exams.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/student-exams.spec.ts)** (2 tests): Student assessment dashboard, instructions modal, live exam player, countdown timer, question palette, answer submission, auto-evaluation, scorecard & solution review, layout stability floor (480px) across questions of varying lengths.
9. **[`e2e/exam-exit-protection.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-exit-protection.spec.ts)** (4 tests): Live exam exit protection — browser back-button popstate trapping & in-app warning modal, page refresh beforeunload confirmation, tab close/navigate-away scoping & disengagement on submit, app-level sidebar nav & header logout locking during active attempt.

---

## 3. Master Test Results Summary

### 3.1 Backend API Master Suites (122/122 PASS)
| Test Suite | File | Tests Run | Result |
| :--- | :--- | :--- | :--- |
| **Phase 1 Master Suite** | [`Exam/tests/phase-01-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-01-master.test.js) | 18 | **18/18 PASS** |
| **Phase 2 Master Suite** | [`Exam/tests/phase-02-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-02-master.test.js) | 10 | **10/10 PASS** |
| **Phase 3 Master Suite** | [`Exam/tests/phase-03-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-03-master.test.js) | 9 | **9/9 PASS** |
| **Phase 4 Master Suite** | [`Exam/tests/phase-04-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-04-master.test.js) | 26 | **26/26 PASS** |
| **Phase 5 Master Suite** | [`Exam/tests/phase-05-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-05-master.test.js) | 18 | **18/18 PASS** |
| **Phase 6 Master Suite** | [`Exam/tests/phase-06-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-06-master.test.js) | 19 | **19/19 PASS** |
| **Phase 7 Master Suite** | [`Exam/tests/phase-07-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-07-master.test.js) | 22 | **22/22 PASS** |
| **Total Backend Tests** | — | **122** | **122/122 PASS (100%)** |

### 3.2 Frontend E2E / Browser Simulation Suite (33/33 PASS)
| Test Suite | Spec File | Tests Run | Result |
| :--- | :--- | :--- | :--- |
| **Academic Structure UI** | [`e2e/courses.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/courses.spec.ts) | 3 | **3/3 PASS** |
| **Published Exam Archive UI** | [`e2e/exam-archive.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-archive.spec.ts) | 4 | **4/4 PASS** |
| **Exam Generator UI** | [`e2e/exam-generator.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-generator.spec.ts) | 3 | **3/3 PASS** |
| **Exam Patterns UI** | [`e2e/exam-patterns.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-patterns.spec.ts) | 3 | **3/3 PASS** |
| **Navigation & Tab Shells** | [`e2e/navigation.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/navigation.spec.ts) | 5 | **5/5 PASS** |
| **Question Bank UI** | [`e2e/question-bank.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/question-bank.spec.ts) | 4 | **4/4 PASS** |
| **Role-Based Access Control** | [`e2e/role-based-access.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/role-based-access.spec.ts) | 5 | **5/5 PASS** |
| **Student Exam-Taking & Results** | [`e2e/student-exams.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/student-exams.spec.ts) | 2 | **2/2 PASS** |
| **Live Exam Exit Protection** | [`e2e/exam-exit-protection.spec.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/tools/e2e-tester/e2e/exam-exit-protection.spec.ts) | 4 | **4/4 PASS** |
| **Total E2E Tests** | — | **33** | **33/33 PASS (100%)** |

---

## 4. Reviewer Hand-off & Next Steps
1. All Phase 7 (7.1–7.7) features, data immutability checks, answer key preservation, and published archive workbenches are completed and verified (122/122 Backend Tests PASS, 33/33 Playwright E2E Tests PASS).
2. Phase 7 tasks (7.1–7.7) are marked `tested` in `tools/build-tracker/state.json`.
3. Reviewer can review and sign off Phase 7 tasks from `tested` to `done` in `tools/build-tracker`.
4. Task 6.9 (see Section 5 below) remains an open, tracked item and is intentionally excluded from sign-off.

---

## 5. Known Issues / Open Conflicts

### 5.1 Task 6.9 — Exam player container sizing is unstable (UNSOLVED)

**Status:** Root cause identified across multiple review rounds; fix NOT yet applied or verified. Tracked in `tools/build-tracker/state.json` as task 6.9, `state: pending`.

**Symptom:** In `ExamPlayerPage.tsx`, containers (question card, palette sidebar, spacing between them) visually resize depending on question content length, instead of staying fixed with only inner content scrolling.

**Root cause:** Not inside `ExamPlayerPage.tsx` itself — its own internal layout (question card, split panes, divider, zoom, action bar) was independently verified correct against a reference implementation. The actual cause is in `App.tsx`, in the ancestor chain that `ExamPlayerPage` is nested inside:
- Line 92 (app root div): uses `minHeight: '100vh'` instead of `height: '100vh'`.
- Line 208 (main dashboard layout row, `flex: 1, display: 'flex'`): missing `minHeight: 0`.
- Line 267 (`<main>` content wrapper, `flex: 1, display: 'flex'`): missing `minHeight: 0`.

---

## 6. ADR-010: Git-Style Tooling & Version Audit Chain (Question Bank & User Profiles)

### 6.1 Status Breakdown
- **User Profiles (ADR-010 Gap Closure)**: **CLOSED**. Fully implemented and verified across database, backend API, and frontend workbench.
  - **Audit Storage**: Backed by `entity_versions` table with full JSON snapshot, timestamp, author (`createdBy`), and automated commit messages (`changeSummary`).
  - **Automated Commit Inference**: `inferUserChangeSummary()` infers specific changed fields (e.g. `First name changed 'Alice' -> 'Dr. Alice', Role changed from TEACHER to SUB_ADMIN`, `Status changed ACTIVE -> SUSPENDED`) without requiring manual message entry.
  - **Field-Level Diff Viewer**: [`EntityDiffViewer.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/EntityDiffViewer.tsx) computes field-level differences between any two revisions or against live profile state with visual strikethrough for old values and accent coloring for new values.
  - **Non-Destructive Rollback**: `POST /api/v1/users/:id/versions/:version/rollback` restores target snapshot state and commits a new version entry (`Rollback to version X`).
  - **User Workbench**: [`UsersPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/UsersPage.tsx) provides full user management table, user edit modal, and Version History & Diff drawer.
- **Question Bank (ADR-010 Tooling)**: **COMPLETED**.
  - Added `changeSummary` column to `question_versions` table and automated commit inference (`inferQuestionChangeSummary()`) detecting changes across difficulty, marks, status, content, options, correct answers, and syllabus mapping.
  - Version History drawer in [`QuestionBankPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/QuestionBankPage.tsx) displays inline `changeSummary` per revision and integrates [`EntityDiffViewer`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/EntityDiffViewer.tsx) with version-to-version and version-to-live comparison.
- **Syllabus Nodes (ADR-010 Gap)**: **STILL OPEN / PENDING**. Syllabus Nodes versioning remains a separate, open item to be addressed in subsequent work (not closed by this User Profile / Question Bank implementation).

### 6.2 Standing E2E Suite Update
- Full Playwright E2E Suite: **34 / 34 Tests Passing (100%)** recorded in `tools/e2e-tester/logs/history.txt`.

---

## 7. Phase 8: Student Analytics Architecture & Design Decisions

### 7.1 Topic-Linkage Data Sourcing Decision
- **Architectural Decision**: **Option B (Extend `questionSnapshot` at Attempt-Start Time)** with fallback.
- **Rationale**:
  - `question_attempts.questionSnapshot` is designed to be an immutable record of the question at the exact moment the student answered it.
  - In alignment with ADR-007 and the Phase 6/7 snapshot isolation philosophy, if a curriculum designer subsequently moves a question to a different syllabus topic or edits it, the historical mastery record for the student must remain true to what was tested when they took the exam.
  - Freezing `syllabusNodeId`, `subjectId`, and `courseId` in `questionSnapshot` guarantees deterministic, immutable mastery computation.
  - For backward compatibility with attempts created prior to Phase 8, the Mastery Engine falls back to the live question's `syllabusNodeId` when absent in legacy snapshot payloads.

### 7.2 Permission Gating & RBAC
- **`analytics.read_own`**: Granted to `STUDENT`, `TEACHER`, `SUB_ADMIN`, and `MAIN_ADMIN`. Gated with Section 7 IDOR ownership check (requesting user ID must match student ID unless elevated).
- **`analytics.read`**: Granted to `TEACHER`, `SUB_ADMIN`, and `MAIN_ADMIN`. Authorizes class/cohort-level aggregate views, cohort weakness heatmaps, and cross-student drill-downs.

### 7.3 Feature Scope (8.1 to 8.7)
- **8.1 Mastery Engine (`@repo/mastery-engine`)**: Recency-weighted proficiency scoring, threshold color mapping (GREEN, BLUE, YELLOW, ORANGE, RED, GREY), syllabus tree aggregation.
- **8.2 Strengths Identification**: GREEN/BLUE topics filtered with confidence attempt threshold ($\ge 2$).
- **8.3 Weakness Identification**: RED/ORANGE topics ranked by severity with persistence duration tracking.
- **8.4 Syllabus Proficiency Map**: Full hierarchical tree with color badges and completion percentages.
- **8.5 Progress Tracking**: Timeseries historical scores with trend indicators (`IMPROVING`, `DEGRADING`, `PLATEAU`).
---

## 8. Standing Demo Dataset Baseline & Deterministic Reseed Specification

`packages/database/prisma/seed.ts` now establishes the standing **Clean Demo Dataset** baseline for ExamOS. It executes all real service layer pipelines (exam generation, archival snapshots, attempt evaluation, and mastery engine recalculation) rather than inserting hand-crafted placeholder rows.

### 8.1 Repeatability & Reset Procedure
A fresh reset and reseed reliably reproduces this exact dataset at any time:
```bash
# 1. Stop active servers & wipe database directory
rmdir /s /q postgres-data

# 2. Run fresh native PostgreSQL 16 schema migration
node packages/database/prisma/migrate-postgres.js

# 3. Execute extended demo seed script
npx ts-node packages/database/prisma/seed.ts
```

### 8.2 Dataset Contents & Architectural Guarantees
1. **Academic Structure & Syllabus**:
   - Courses: 2 (`c1` Engineering Entrance JEE, `c2` Medical Entrance NEET).
   - Subjects: 4 (Physics, Chemistry, Mathematics, Biology).
   - Topics: 12 syllabus nodes with complete hierarchical parent-child relationships.
2. **Question Bank**:
   - 120 rich, multi-difficulty published questions across all 12 syllabus topics (10 questions per topic: 3 EASY, 4 MEDIUM, 3 HARD) with full LaTeX equations, explanations, and metadata.
3. **Exam Patterns & Blueprints**:
   - Standard authentic JEE Main Grand Blueprint (`pat_jee_main_standard`) with 3 sections (Physics, Chemistry, Mathematics, 10 questions each, +4 / -1 marking).
4. **Pre-Published Exams & Immutable Archive**:
   - 3 authentic mock exams generated via `ExamGeneratorService.generateExam()` and published via `ExamArchiveService.publishAndSnapshotExam()`:
     1. *JEE Main Grand Mock Exam 1 (All India Test Series)*
     2. *JEE Main Grand Mock Exam 2 (Physics & Chemistry Intensive)*
     3. *JEE Main Grand Mock Exam 3 (Full Syllabus Simulation)*
   - Fully accessible in the Published Exam Archive vault with frozen question paper snapshots, version history (v1), and preserved answer keys.
5. **Enrolled Students & Contrasting Mastery Profiles**:
   - Both students enrolled in Course `c1` with active enrollment status.
   - Each student has 2 completed and auto-evaluated exam attempts with deliberate topic-specific answer profiles:
     - **`student@examos.com` ("Student Learner")**:
       - Proven Strengths ($\ge 2$ attempts, 100% accuracy): *Mechanics & Dynamics*, *Physical Chemistry & Kinetics*.
       - Critical Weaknesses (0% accuracy): *Organic Reactions & Mechanisms*, *Probability, Permutations & Statistics*.
       - Overall Mastery: **60.94%** (`DEVELOPING`).
     - **`student2@examos.com` ("Priya Patel")**:
       - Proven Strengths ($\ge 2$ attempts, 100% accuracy): *Organic Reactions & Mechanisms*, *Probability, Permutations & Statistics*.
       - Critical Weaknesses (0% accuracy): *Mechanics & Dynamics*, *Physical Chemistry & Kinetics*.
       - Overall Mastery: **58.09%** (`DEVELOPING`).
6. **Real Mastery Engine Calculation**:
   - Derived exclusively by calling `analyticsService.recalculateStudentMastery(userId)` during seed execution.
7. **Institutional & Teacher Roster**:
   - Class Analytics (`/api/v1/analytics/class/c1`) immediately displays both students with distinct proficiency scores, status badges, exams completed, and weakness counts, supporting live per-student drilldown inspection.

---

## 9. Phase 9: Personalized Practice & Adaptive Mastery Architecture

Phase 9 implements an adaptive practice generation and weakness recovery pipeline that targets identified student knowledge gaps with difficulty-progression practice papers, tracks concept mastery streaks, and provides immediate feedback.

### 9.1 Architecture & Database Schema
- **Tables Added & Migrated**:
  - `practice_papers`: `id`, `userId`, `courseId`, `title`, `targetNodeIds` (JSON), `totalQuestions`, `status` (`ACTIVE`, `ARCHIVED`), timestamps.
  - `practice_questions`: `id`, `practicePaperId`, `questionId`, `syllabusNodeId`, `displayOrder`, `versionNum`, `difficulty`, `marks`, `negativeMarks`.
  - `practice_attempts`: `id`, `practicePaperId`, `userId`, `startedAt`, `completedAt`, `score`, `maxScore`, `accuracyPercentage`, `status` (`IN_PROGRESS`, `COMPLETED`, `ABANDONED`).
  - `practice_attempt_answers`: `id`, `attemptId`, `questionId`, `selectedOption`, `selectedOptions`, `numericalAnswer`, `isCorrect`, `timeSpentSeconds`, timestamps.
  - `mastery_tracking`: `id`, `userId`, `syllabusNodeId`, `consecutiveCorrect`, `isMastered`, `lastAttemptAt`, timestamps.

### 9.2 Feature Scope & Implementation Details (9.1 to 9.5)
- **Feature 9.1: Weakness Pool Generation**:
  - `GET /api/v1/students/:id/weakness-pool` & `GET /api/v1/practice/weakness-pool`: Aggregates active weak syllabus nodes, current proficiency, error rates, and mastery tracking status. Gated with Section 7 IDOR ownership check.
- **Feature 9.2: Personalized Practice Paper Generation**:
  - `POST /api/v1/practice/generate`: Builds 10-question practice papers targeting weak topics with difficulty progression (30% EASY -> 40% MEDIUM -> 30% HARD) and automatically initializes practice attempts.
  - `GET /api/v1/practice/:id`: Fetches practice paper and question payloads.
- **Feature 9.3: Adaptive Mastery Confirmation**:
  - `POST /api/v1/practice/:id/answer`: Evaluates student answers, provides immediate feedback explanations, and tracks consecutive correct streaks.
  - **Mastery Rule**: 3 consecutive correct answers on different questions mark the concept as mastered (`isMastered = true`), update `mastery_tracking`, and deactivate the weakness in `student_weaknesses` (`isActive = false`). Incorrect answers reset streak to 0.
- **Feature 9.4: Practice Attempt Tracking**:
  - `POST /api/v1/practice/:id/submit`: Finalizes practice attempt, calculates accuracy percentage and score, and triggers mastery recalculation.
  - `GET /api/v1/practice/history`: Paginated list of completed practice sessions with accuracy metrics.
- **Feature 9.5: Practice Paper Frontend & Interactive Player**:
  - [`PracticePlayerModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/PracticePlayerModal.tsx): Interactive practice player with `#exam-question-card`, question palette, difficulty badges, immediate feedback mode, explanation display, live streak counter (`🔥 Streak: X/3`), and session completion scorecard.

---

## 10. Phase 10: Preview & Impersonation System Architecture

Phase 10 delivers dual-identity preview personas, plan-gated entitlement simulation, and administrative impersonation with strict IDOR protections, justification requirements, and an immutable audit trail.

### 10.1 Architecture & Database Schema
- **Tables Migrated & Seeded**:
  - `preview_profiles`: `id`, `name`, `description`, `role`, `tier`, `courseIds` (JSON), `features` (JSON), `createdAt`, `updatedAt`.
  - `preview_audit_logs`: `id`, `actorUserId`, `effectiveUserId`, `sessionType` (`PREVIEW_PROFILE`, `FREE_STUDENT`, `IMPERSONATE_REAL_STUDENT`), `reason`, `metadata` (JSON), `createdAt`.
  - `preview_sessions`: `id`, `actorUserId`, `effectiveUserId`, `sessionType`, `previewProfileId`, `token`, `isActive`, `startedAt`, `endedAt`.
- **Dual-Identity JWTs**: Standard JWT claims include `actorId`, `effectiveId`, `isImpersonating`, and `impersonationReason`.

### 10.2 Feature Scope & Implementation Details (10.1 to 10.7)
- **Feature 10.1: Preview Student Profile Management**: CRUD for test personas simulating `FREE`, `STANDARD`, `PREMIUM`, and `PRO` tiers. Gated on `preview.manage`.
- **Feature 10.2: Preview Configuration UI**: [`PreviewConfigurationModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/PreviewConfigurationModal.tsx) allows quick selection between pre-built archetypes or real student impersonation.
### 10.3 Security Architecture: Server-Side Session Revocation (ADR Security Decision)
- **Problem Statement**: Standard stateless JWT tokens remain signature-valid until expiration (60 min). If a preview or impersonation session is ended by the user or terminated by an admin, simply clearing local client state leaves the JWT valid for replay attacks.
- **Architectural Decision (Option 1 Selected)**:
  - In `authenticate` middleware ([`auth.ts`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/api/src/middleware/auth.ts)), whenever `payload.isImpersonation === true`, the server queries `impersonation_sessions` for the specific `impersonationSessionId`.
  - If the session row is missing, marked `isActive = false`, or expired (`expiresAt < CURRENT_TIMESTAMP`), the request is immediately rejected with `401 Unauthorized` (`IMPERSONATION_SESSION_REVOKED` / `IMPERSONATION_SESSION_EXPIRED`).
  - **Tradeoff Analysis**: This introduces a sub-millisecond single-row indexed lookup on impersonation requests. Given that impersonation sessions represent < 0.1% of platform traffic, this provides immediate, zero-window revocation security with negligible latency overhead.
- **Database-Backed Unified Permissions**:
  - Preview sessions and real student impersonations derive effective permissions directly from the database (`fetchRolePermissionsFromDb` and `fetchUserEffectivePermissions`) rather than a duplicated static mapping, ensuring perfect parity with real user login flows.
- **Exploit Verification Proof**:
  - Tested in [`tests/phase-10-master.test.js`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/tests/phase-10-master.test.js): A valid impersonation JWT captured during an active session is replayed after session termination (`POST /api/v1/preview/impersonate/stop`); the server strictly blocks the replayed request with `401 Unauthorized` (`IMPERSONATION_SESSION_REVOKED`).

---

## 11. Phase 11: AI Question System & Multi-Tier Gateway Architecture

Phase 11 introduces a high-rigor, multi-provider AI item authoring system supporting dynamic question generation from blueprints, concept variation modification with version lineages, hard token/credit quotas, asynchronous batch processing, and educator review workflows.

### 11.1 Multi-Provider Priority Engine & Fallback Discipline (Features 11.1, 11.7, 11.8)
- **Priority Routing Hierarchy (`AIGatewayService.routeRequest`)**:
  - **Priority 1: Cloud OpenAI / Anthropic (`prov_cloud_01`)**: Production high-capability provider (e.g. `gpt-4o-mini`). Inactive by default in dev/test; activated when admin provides API key.
  - **Priority 2: Local Ollama / LocalAI (`prov_local_01`)**: Air-gapped, zero-cloud-cost on-premise inference (`http://localhost:11434/api/generate`).
  - **Priority 999: Dynamic Fallback Mock Engine (`prov_mock_01`)**: Zero-cost, parameter-responsive offline safety net and test runner engine.
- **Circuit Breaker Pattern**: Automatically trips provider for 5 minutes after 3 consecutive failures.
- **Self-Correcting Schema Validator**: Validates JSON schema structure; retries once with auto-correction formatting prompts upon syntax irregularity.
- **AES-256-GCM API Key Encryption**:
  - Outbound cloud API keys are encrypted at rest using server-side AES-256-GCM.
  - API responses (`GET /api/v1/ai/gateway/providers`) return strictly masked keys (`sk-...5678`), preventing plaintext leakage over the wire.
- **Live Provider Connection Testing**: `POST /api/v1/ai/gateway/providers/:id/test` verifies real model response latency and schema compatibility directly from the admin settings UI.

### 11.2 Parameter-Responsive Dynamic Mock Engine (`AIMockGenerator` & `@repo/ai-client`)
- Unlike static templates, the mock generator analyzes `subject`, `topic`, `difficulty`, `type`, `marks`, `customPrompt`, `varianceLevel`, and `parentQuestion` to generate dynamically varied, scientifically accurate items with distinct stems, calculations, formulas, distractor options, and explanations across Physics, Chemistry, Mathematics, Biology, and General Science.

### 11.3 AI Modification & Blueprint Question Generation (Features 11.3 & 11.4)
- **Question Modification**: `POST /api/v1/ai/questions/modify` produces derived variations (`isAiGenerated = true`, `derivedFromId = <id>`) with customizable variance (`LOW`, `MEDIUM`, `HIGH`), saving as `DRAFT` and logging audit revisions in `question_versions`.
- **Blueprint Generation**: `POST /api/v1/ai/questions/generate` creates new curriculum items based on syllabus topic and difficulty, storing initial version 1 in `question_versions`.

### 11.4 Credit Balances & Hard Quota Limits (Feature 11.5)
- **Daily Included Quotas**: Automatically reset at 00:00 UTC (Teachers: 150, Admins: 500, Students: 20).
- **Purchased Balance**: Non-expiring auxiliary credit pool.
- **Strict Enforcement**: Hard block with `402 Payment Required` (`CREDITS_EXHAUSTED` / `MONTHLY_TOKEN_CAP_REACHED`) when balance or monthly caps are exceeded.
- **Automatic Failure Refund**: Deducted credits are immediately refunded if an upstream provider execution fails.

### 11.7 Multi-Provider Stacking, Scope Isolation & Per-Feature Daily Usage Caps

1. **Multi-Provider Stacking**:
   - Multiple OpenAI-compatible free-tier `CLOUD` providers can be stacked in a priority cascade sequence alongside `LOCAL` (Ollama) and `MOCK` providers.
   - Default stacked cascade:
     - **Groq Cloud Provider** (Llama 3.3 70B Versatile) — Priority 1
     - **Google Gemini Provider** (Flash 1.5 OpenAI-compatible) — Priority 2
     - **OpenRouter Provider** (Meta/Mistral Free Cascade) — Priority 3
     - **OpenAI Cloud Provider** (GPT-4o Mini / GPT-4o) — Priority 4
     - **Local LLM** (Ollama / LocalAI) — Priority 10
     - **Deterministic Fallback Mock Engine** (Offline Safety Net) — Priority 999
   - The Gateway executes providers in order of lowest priority number. If an upstream provider fails (e.g. invalid key / rate limit / 5xx), the Gateway automatically falls back through the cascade to the next tier without breaking the user request.

2. **Scope Isolation Architecture & Parity**:
   - `ai_providers` table includes `scope TEXT NOT NULL DEFAULT 'question_authoring'`.
   - Both scopes now have full parity with 6 providers each (12 total in system):
     - **Question Authoring**: `prov_cloud_groq` (P1), `prov_cloud_gemini` (P2), `prov_cloud_openrouter` (P3), `prov_cloud_01` (P4), `prov_local_01` (P10), `prov_mock_01` (P999).
     - **Interview & Oral Grading**: `prov_interview_cloud_groq` (P1), `prov_interview_cloud_gemini` (P2), `prov_interview_cloud_openrouter` (P3), `prov_interview_cloud_01` (P4), `prov_interview_local_01` (P10), `prov_interview_mock_01` (P999).
   - Callers of `AIGatewayService.routeRequest` MUST pass an explicit `scope` parameter (`'question_authoring'` | `'interview'`). Missing scope is rejected with HTTP 400 (`SCOPE_REQUIRED`) to prevent accidental leakage into a shared pool.
   - Quotas, circuit breakers, and failure counters are strictly isolated per scope. Force-failing or circuit-tripping a provider in `question_authoring` has zero impact on `interview`-scoped operations, and the interview cascade independently falls through failing cloud providers to its mock tier.
   - *Preparatory Isolation Note:* The `interview` scope providers are configured and verified in preparation for future oral interview and viva voce assessment features.

3. **Per-Feature Daily Usage Caps (Generalized)**:
   - Configurable per-feature limits stored in `ai_prompt_templates.dailyLimit` (e.g., `question_generation: 50`, `question_modification: 100`, `interview: 2`, `rephrase: null / uncapped`).
   - `AIUsageService.checkFeatureDailyLimit(userId, featureKey)` queries `ai_usage_history` for consumed requests today and enforces daily caps.
   - Checked BEFORE credit balance deduction in question generation and modification endpoints.
   - When a user reaches their daily cap for a feature, the endpoint rejects with `429 Too Many Requests` (`FEATURE_DAILY_LIMIT_EXCEEDED: Daily limit of X requests for feature 'Y' has been reached for today.`), while other features (or uncapped features) continue operating normally.

4. **Settings UI Scope Segregation**:
   - In [`SettingsPage.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/pages/SettingsPage.tsx), the AI Configuration subtab is cleanly partitioned into two dedicated scope sections:
     - **Question Authoring AI Cascade** (`#scope-section-question_authoring`) — 6 providers
     - **Interview & Oral Grading AI Cascade (Preparatory Isolation)** (`#scope-section-interview`) — 6 providers
   - Includes quick scope filter pills (`All Scopes`, `Question Authoring AI`, `Interview & Grading AI`) and per-provider AES-256 API key encryption, active toggle, priority adjustment, and live latency testing.

---

## 12. Preview Mode Configuration Enforcement

Preview mode session attributes configured via [`PreviewConfigurationModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/PreviewConfigurationModal.tsx) and passed in `req.impersonation.sessionData` are now directly wired into backend queries and permissions:

1. **`contentVersion` (Active Filter Enforced)**:
   - When `contentVersion === 'DRAFT'`:
     - `GET /api/v1/student/exams` & `GET /api/v1/exams/active`: Returns both `PUBLISHED` and `DRAFT` status exams, allowing staff to preview unpublished draft exams.
     - `GET /api/v1/student/exams/:id/instructions` & `POST /api/v1/attempts/start`: Allows accessing metadata and starting attempts on `DRAFT` exams.
     - `GET /api/v1/courses`: Allows viewing `DRAFT` courses alongside `PUBLISHED` courses.
     - `GET /api/v1/questions`: Returns `DRAFT` questions without requiring elevated teacher/admin status filter.
   - When `contentVersion === 'PUBLISHED'` (default): Normal student visibility strictly applies (`PUBLISHED` content only).

2. **`courseAccess` (Active Filter Enforced)**:
   - When `courseAccess` is set to a restricted list of course IDs (not `['*']`):
     - `GET /api/v1/courses`: Scoped to only return courses matching the allowed IDs.
     - `GET /api/v1/courses/:id`: Accessing an excluded course ID is forbidden with HTTP 403 (`COURSE_ACCESS_RESTRICTED`).
     - `GET /api/v1/student/exams` & `GET /api/v1/exams`: Returns only exams belonging to the allowed courses.
     - `GET /api/v1/questions`: Filters question listing to only questions belonging to the allowed courses.

3. **`billingPlan` / `simulatedPlan`, `usageMode`, & `featureFlags` (Reserved — Transparently Labeled)**:
   - There is no paid-tier feature-gating or artificial rate-limiting in the application. To maintain architectural honesty without inventing fake gating mocks, these fields are preserved in JWT session data and clearly marked in [`PreviewConfigurationModal.tsx`](file:///D:/Download/Company/Software/Test%20os/Exam/Exam/apps/web/src/components/PreviewConfigurationModal.tsx) as `"(Reserved for future plan tier system — not currently enforced)"` and `"(Reserved for future rate-limit system — not currently enforced)"`.

---

## 13. Verification & Regression Status

- **Preview Configuration Enforcement Test Suite**:
  - `node tests/phase-10-preview-config-enforcement.test.js`: **5 / 5 Tests PASS (100%)**
- **Master Integration Test Suites**:
  - Phase 1 (Auth & RBAC): 18/18 PASS
  - Phase 2 (Course & Syllabus): 10/10 PASS
  - Phase 3 (Question Bank): 9/9 PASS
  - Phase 4 (Exam Blueprint Engine): 26/26 PASS
  - Phase 5 (Exam Lifecycle & State Machine): 18/18 PASS
  - Phase 6 (Exam Player & Evaluation): 19/19 PASS
  - Phase 7 (Exam Archive & Snapshots): 22/22 PASS
  - Phase 8 (Mastery Engine & Student Analytics): 29/29 PASS
  - Phase 9 (Personalized Practice): 12/12 PASS
  - Phase 10 (Preview & Impersonation System): 14/14 PASS
  - Phase 11 (AI Question System & Priority Gateway): 16/16 PASS
  - Phase 11 (Stacking, Scope Isolation & Daily Caps): 5/5 PASS
  - **Total Master Tests Across All Phases: 203 / 203 PASS (100%)**
- **Frontend Interaction Test Suite**:
  - Phase 11 UI Spec: 6 / 6 Test Groups PASS (100%)
- **Playwright Human-Simulation E2E Suite (`tools/e2e-tester`)**:
  - 14 Spec Files / 51 Tests: **51 / 51 PASS (100%)**
  - Verified run log: `tools/e2e-tester/logs/e2e-run-2026-08-24_00-46-54.txt`
  - History log: `2026-08-24_00-46-54 | passed=51 failed=0 skipped=0 flaky=0 duration=126.8s | report=reports\2026-08-24_00-46-54`
- **Task 6.9 Pending Status**: Preserved as `pending` in `tools/build-tracker/state.json`.

