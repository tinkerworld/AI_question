# Feature: In-App Notification Center

## 1. Purpose
The In-App Notification Center provides real-time and persistent alerts for students, teachers, and administrators. It informs users of critical academic and platform events (exam publication, result availability, oral interview grading completion, course enrollment confirmations, payment receipts, subscription renewals/expirations, and system announcements) with read/unread tracking and actionable deep links.

## 2. Current State
Verified against the codebase:
- No notification entities, database tables, API routes, or notification UI bell/drawer components exist anywhere in the monorepo.
- System events (e.g. exam publishing, submission grading, payments) execute without generating persistent user alerts.

## 3. Problem / Requirement
Users currently have no in-app mechanism to know when an exam is ready, when an AI interview has finished evaluating, or when a payment receipt is generated:
- Need in-app notification inbox with unread counter badges.
- Need structured categories: `EXAMS`, `RESULTS`, `INTERVIEWS`, `BILLING`, `ANNOUNCEMENTS`, and `SYSTEM`.
- Need actionable deep links (e.g. clicking "Your IELTS Interview Scorecard is Ready" navigates directly to `/interviews/:id/scorecard`).
- Need user notification preferences to allow toggling specific alert categories.
- Must be designed so external notification channels (Email via SMTP/SendGrid or Web Push) can plug in later without schema restructuring.

## 4. Proposed Solution
1. Introduce `notifications` and `user_notification_preferences` data models in the database.
2. Implement `NotificationService` in `apps/api/src/services/notification.service.ts` with methods to dispatch targeted user alerts and system-wide broadcast announcements.
3. Hook `NotificationService.send()` into existing lifecycle events:
   - `attempt.service.ts`: On submission evaluation complete.
   - `interview.service.ts`: On rubric evaluation finalized.
   - `exam.service.ts`: On exam published to an enrolled course.
   - `billing.service.ts`: On payment receipt / invoice generated.
4. Add an interactive Notification Bell icon in the top header with a slide-out drawer, filter tabs, "Mark All as Read", and direct navigation handlers.

## 5. User Experience
- **Header Bell Icon**: Displays a red badge with the unread count (e.g. `🔔 3`).
- **Slide-out Drawer**: Clicking the bell opens a sleek slide-out panel showing recent notifications grouped by date. Unread items are highlighted with an accent dot.
- **Deep Navigation**: Clicking a notification marks it as read and immediately routes the user to the target screen (e.g. the exam result page).
- **Preferences**: In the profile settings, the user can customize which notifications they receive.

## 6. Admin Experience
- **System Broadcast Manager**: Admins can compose and broadcast platform announcements (e.g. "Scheduled maintenance tonight at 11 PM UTC" or "New IELTS Masterclass launched") to all users or specific role cohorts (`STUDENT`, `TEACHER`).

## 7. Technical Architecture
- **Service**: `apps/api/src/services/notification.service.ts`.
- **Event-Driven Dispatch**: Synchronous in-memory dispatch or lightweight event bus triggering DB inserts.
- **Channel Adapter Ready**: Notification payload includes structured channel flags (`channels: ['IN_APP', 'EMAIL']`), allowing an email worker to poll or listen to the same stream in the future.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `notifications`: `id`, `userId`, `category` (`EXAMS` | `RESULTS` | `INTERVIEWS` | `BILLING` | `ANNOUNCEMENTS` | `SYSTEM`), `title`, `message`, `deepLink`, `isRead`, `readAt`, `metadata` (JSON), `createdAt`.
- `user_notification_preferences`: `userId`, `category`, `inAppEnabled`, `emailEnabled`.

## 9. API
- `GET /api/v1/notifications` (Auth: Authenticated) — Paginated list of notifications with unread count.
- `PATCH /api/v1/notifications/:id/read` (Auth: Authenticated) — Mark individual notification as read.
- `POST /api/v1/notifications/mark-all-read` (Auth: Authenticated) — Mark all notifications as read.
- `POST /api/v1/notifications/broadcast` (Auth: Admin / `notifications.manage`) — Send broadcast announcement.
- `GET /api/v1/notifications/preferences` (Auth: Authenticated) — Get notification settings.
- `PUT /api/v1/notifications/preferences` (Auth: Authenticated) — Update notification settings.

## 10. Frontend
- **Components**:
  - `NotificationBell.tsx`: Top header icon with live animated unread counter.
  - `NotificationDrawer.tsx`: Slide-over panel with category filter pills (`All`, `Exams`, `Results`, `Billing`).
  - `NotificationItem.tsx`: Single notification card with category icon, timestamp, and click router.

## 11. AI / External Services
- Future-ready for email delivery services (SendGrid/AWS SES/Resend).

## 12. Permissions / Entitlements
- **Reading / Managing Own Notifications**: Any authenticated user (Section 7 IDOR check enforces `userId = req.user.userId`).
- **Broadcast Announcements**: Restricted to `MAIN_ADMIN` and `SUB_ADMIN` with `system.broadcast` or `notifications.manage`.

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If in maintenance, notifications remain queryable in read-only mode while new broadcast creation is paused.

## 14. Import / Export
- Notifications are transient user records and excluded from general curriculum export.

## 15. Edge Cases
- User has 5,000 notifications: Default pagination limit of 20 with infinite scroll keeps load times under 100ms.
- Notification clicked for an exam that was archived/deleted: Deep link handler checks resource existence and displays a friendly notice instead of a 404 crash.

## 16. Test Cases
- **Unit (NOTIF-U001)**: `NotificationService.send()` checks user preference before creating notification.
- **API (NOTIF-A001)**: `GET /api/v1/notifications` returns only notifications belonging to the requesting user.
- **API (NOTIF-A002)**: `POST /api/v1/notifications/mark-all-read` updates all unread rows for the caller.
- **Integration (NOTIF-I001)**: Submitting exam attempt automatically triggers an unread notification to the student.
- **UI (NOTIF-UI001)**: Bell badge count updates immediately when "Mark all as read" is clicked.
- **Security (NOTIF-S001)**: User A cannot read or modify User B's notifications via API.

## 17. Acceptance Criteria
- [ ] Notification database models with category and deepLink support.
- [ ] Event hooks wired into Exam, Interview, Attempt, and Billing services.
- [ ] In-app notification bell with unread badge in top navbar.
- [ ] Slide-out notification drawer with category filters.
- [ ] Section 7 IDOR security and user preference controls verified.

## 18. Dependencies
- `apps/api/src/services/attempt.service.ts`
- `apps/api/src/services/interview.service.ts`
- `apps/api/src/services/billing.service.ts`

## 19. Future Improvements
- Web Push Notification integration with browser Service Worker.
- WebSocket / Server-Sent Events (SSE) for instantaneous real-time delivery without polling.
