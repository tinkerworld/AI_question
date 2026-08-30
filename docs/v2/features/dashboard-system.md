# Feature / Patch: Role-Based Interactive Dashboard System

## 1. Purpose
This deliverable transforms the current placeholder welcome screen on the `dashboard` navigation tab into dynamic, high-value, role-specific interactive dashboards for **Students**, **Teachers**, and **Administrators**. It surfaces key academic metrics, upcoming exams, recent performance, quick resume actions, at-risk student cohorts, and administrative platform health insights by reusing existing analytical engines.

## 2. Current State
Verified against the codebase:
- `App.tsx` renders a static placeholder container for `activeTab === 'dashboard'` (`Welcome to ExamOS. Use the sidebar to navigate...`).
- Sophisticated calculation services already exist: `@repo/mastery-engine` (Phase 8), `attempt.service.ts` (Phase 6), `interview.service.ts` (Phase 12), `billing.service.ts` (Phase 13), and `ai-usage.service.ts` (Phase 11).
- **The Concrete Gap**: The landing dashboard is an unpopulated placeholder that does not surface or synthesize any of these existing backend analytics for users upon logging in.

## 3. Problem / Requirement
When students, teachers, or administrators log in, they need immediate, actionable visibility into their current status without digging through multi-level navigation menus:
- **Student Dashboard**: Needs active course progress, upcoming scheduled exams with countdowns, recent exam results, oral interview scorecards, top priority weak topics needing practice, and quick resume shortcuts.
- **Teacher Dashboard**: Needs assigned class rosters, active exam submissions awaiting subjective review, cohort weakness heatmaps, at-risk students (overall score < 50%), and question draft approval queue status.
- **Admin Dashboard**: Needs platform health indicators, total active students/teachers, exam session volume, daily gross revenue/invoices, AI provider consumption and token caps, and quick security audit log stream.
- Must NOT duplicate aggregation logic; must reuse the existing `@repo/mastery-engine` and backend service outputs.

## 4. Proposed Solution
1. Create a unified Dashboard API endpoint `GET /api/v1/dashboard/summary` that returns tailored data payloads based on the caller's role (`STUDENT`, `TEACHER`, `ADMIN`).
2. Build role-specific frontend dashboard views:
   - `StudentDashboardView.tsx`
   - `TeacherDashboardView.tsx`
   - `AdminDashboardView.tsx`
3. Replace the placeholder div in `App.tsx` with `<DashboardPage />`, which dynamically routes to the appropriate view based on `user.roles`.
4. Provide interactive widgets with one-click action triggers ("Resume Exam", "Review Drafts", "Practice Weak Topics").

## 5. User Experience
- **Student View**:
  - **Hero Greeting**: Personalized greeting with current study streak (e.g. "🔥 5-Day Study Streak").
  - **Quick Resume**: Banner showing the next scheduled or in-progress exam with a prominent "Start / Resume" button.
  - **Performance Overview**: Average mastery percentage ring, recent exam and interview scorecards with band ratings.
  - **Focus Areas**: 3 recommended weakness topics with instant "Targeted Practice" buttons (launching Phase 9 practice sessions).
- **Teacher View**:
  - Metrics cards: Total Students, Active Exams, Pending Reviews, Average Class Mastery.
  - Submissions Queue: Quick table of student essays and subjective answers needing manual review.
  - Cohort Alerts: List of students scoring below passing threshold across recent tests.
- **Admin View**:
  - Platform Stats: Total Users, Active Courses, Published Exams, 24h Revenue.
  - AI Gateway Status: Active cloud/local providers, daily token consumption vs quota bar.
  - Recent Security Audits: Real-time feed of user role modifications and refund transactions.

## 6. Admin Experience
- Administrators can customize widget visibility, toggle demo dataset pre-population, and view cross-system throughput metrics directly on login.

## 7. Technical Architecture
- **Service**: `apps/api/src/services/dashboard.service.ts`.
- **Data Reuse Strategy**:
  - Student data aggregated from `analyticsService.getStudentMastery()`, `attemptService.getStudentAttempts()`, and `interviewService.getUserSessions()`.
  - Teacher data aggregated from `analyticsService.getClassAnalytics()` and `examService.getPendingReviewCount()`.
  - Admin data aggregated from `billingService.getFinancialSummary()`, `aiUsageService.getUsageSummary()`, and `auditService.getRecentLogs()`.
- **Zero Redundant Calculations**: Leverages existing DB indexes and service methods.

## 8. Database
*No database change required. Pure aggregation over existing tables.*

## 9. API
- `GET /api/v1/dashboard/summary` (Auth: Authenticated) — Returns role-tailored dashboard payload.
- `GET /api/v1/dashboard/student-widgets` (Auth: Student / `analytics.read_own`) — Dedicated student metrics.
- `GET /api/v1/dashboard/faculty-widgets` (Auth: Teacher / Admin / `analytics.read`) — Teacher metrics.
- `GET /api/v1/dashboard/admin-widgets` (Auth: Admin / `audit.read`) — System & revenue metrics.

## 10. Frontend
- **Pages / Components**:
  - `DashboardPage.tsx`: Main dashboard router container in `apps/web/src/pages/DashboardPage.tsx`.
  - `StudentDashboardView.tsx`: Student metrics, active test alerts, and weak topic practice shortcuts.
  - `TeacherDashboardView.tsx`: Class overview, pending review table, and cohort weakness radar.
  - `AdminDashboardView.tsx`: Platform health, AI token meter, revenue cards, and security log ticker.
  - `StatCard.tsx`, `StreakBadge.tsx`, `ProgressRing.tsx`: Reusable widget components.

## 11. AI / External Services
- Surfacing AI Gateway token metrics from `AIUsageService`.

## 12. Permissions / Entitlements
- **Access**: Any authenticated user can access the `/dashboard` tab.
- **Data Gating**: Gated by role and Section 7 IDOR check (students receive only their personal data; teachers receive enrolled class data; admins receive global stats).

## 13. Maintenance Behaviour
- Inherits system maintenance state. If individual sub-modules are under maintenance (e.g. AI Interview), corresponding dashboard widgets display a badge without breaking other dashboard widgets.

## 14. Import / Export
- Dashboard views provide quick "Export Summary (PDF/CSV)" for teachers and admins.

## 15. Edge Cases
- Brand new student with 0 exam attempts: Displays welcoming "Get Started" onboarding cards with "Take First Diagnostic Test" CTA instead of empty error graphs.
- High concurrent dashboard loads: Aggregation queries use lightweight SQL `COUNT` and indexed joins with 30-second in-memory response caching.

## 16. Test Cases
- **Unit (DASH-U001)**: `DashboardService.getStudentSummary()` computes study streak accurately from attempt timestamps.
- **API (DASH-A001)**: `GET /api/v1/dashboard/summary` returns student payload when called with `STUDENT` JWT.
- **API (DASH-A002)**: `GET /api/v1/dashboard/summary` returns admin stats when called with `MAIN_ADMIN` JWT.
- **Integration (DASH-I001)**: Completing an exam attempt immediately updates recent scores and weakness recommendations on the dashboard.
- **UI (DASH-UI001)**: Dashboard renders correct view matching current role without flickering.
- **Security (DASH-S001)**: Student caller requesting admin dashboard widget returns HTTP 403 `PERMISSION_DENIED`.

## 17. Acceptance Criteria
- [ ] Placeholder welcome screen in `App.tsx` replaced with dynamic `<DashboardPage />`.
- [ ] Dedicated Student Dashboard with upcoming exams, recent scorecards, and weak topics.
- [ ] Dedicated Teacher Dashboard with class rosters, pending reviews, and cohort radar.
- [ ] Dedicated Admin Dashboard with system stats, AI token usage, and revenue metrics.
- [ ] Zero duplicate aggregation queries; reuse of existing services verified.

## 18. Dependencies
- `@repo/mastery-engine`
- `apps/api/src/services/analytics.service.ts`
- `apps/api/src/services/attempt.service.ts`
- `apps/api/src/services/billing.service.ts`
- `apps/api/src/services/ai-usage.service.ts`

## 19. Future Improvements
- Customizable drag-and-drop dashboard widget layout per user.
- Goal tracking widget (e.g., "Target: IELTS 7.5 by November 15" with progress milestones).
