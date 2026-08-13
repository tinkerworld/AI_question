<Notifications & Reports — Functional Specification>
## 1. Overview
The Notifications & Reports system keeps users informed about critical platform events and provides comprehensive data analytics for all user roles. Notifications drive engagement and timely actions, while reports provide actionable insights into academic performance, system usage, and financial metrics.

## 2. User Stories
- As a Student, I want to be notified when a new exam is published or my results are available so that I don't miss important updates.
- As a Teacher, I want a report on my class's performance per exam so that I can identify weak areas and adapt my teaching.
- As a Main Admin, I want to see system-wide statistics on subscriptions, AI usage, and user growth so that I can monitor the platform's health.
- As a User, I want to mark notifications as read and manage my notification preferences.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| View personal notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Access Admin Reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Access Teacher Reports | ❌ | ❌ | ✅ | ❌ | ❌ |
| Access Student Reports | ❌ | ❌ | ❌ | ✅ | ❌ |
| Export Reports | ✅ | ✅ | ✅ | ✅ | ❌ |

## 4. Features & Capabilities

### 4.1 In-App Notification System
**What it does**: Delivers real-time or asynchronous alerts to users within the web application.
**How it works**: A bell icon in the top header displays an unread count. Clicking it opens a dropdown list of recent notifications. Users can click a notification to navigate to the relevant entity (e.g., an exam or result) and mark it as read.
**Business Rules**: Notifications are scoped to the individual user. 
**Edge Cases**: If a user has hundreds of unread notifications, the count caps at "99+".

### 4.2 Notification Preferences
**What it does**: Allows users to opt in or out of specific types of notifications.
**How it works**: In their profile settings, users see toggles for categories like "Exam Updates", "Results", "System Alerts", etc.
**Business Rules**: Critical system alerts (e.g., subscription expiring, security alerts) cannot be disabled.

### 4.3 Admin Reporting Dashboard
**What it does**: Provides aggregate metrics across the entire platform.
**How it works**: Admins view charts and data tables detailing User Statistics (role distributions, active users), Course/Exam Statistics, Question Bank metrics, AI API usage and associated costs, and Subscription revenue.
**Business Rules**: Data is cached and refreshed periodically (e.g., every 1 hour) to reduce database load on complex aggregations.

### 4.4 Teacher Reports
**What it does**: Analyzes student performance within a teacher's specific classes/courses.
**How it works**: Teachers can generate a "Class Performance" report for a specific exam, showing average scores, score distributions, and a "Question Effectiveness" breakdown (percentage of students who answered each question correctly/incorrectly).
**Business Rules**: Teachers can only see data for students enrolled in their assigned courses.

### 4.5 Student Analytics
**What it does**: Provides personal academic insights to the student.
**How it works**: Students see a dashboard tracking their historical scores over time (line charts), subject-wise strengths and weaknesses (radar charts), and comparative percentile rankings against their peers.
**Business Rules**: Peer comparisons are strictly anonymized (e.g., "You scored in the top 15%").

### 4.6 Report Export
**What it does**: Allows users to download tabular data.
**How it works**: On supported report views, an "Export" button generates a CSV or PDF file of the current dataset.
**Business Rules**: Export limits apply (e.g., max 10,000 rows for CSV) to prevent abuse.

## 5. Data Model
```
Table: notifications
├── id (PK, CUID)
├── userId (FK to users) — Recipient
├── type (String) — 'EXAM_PUBLISHED', 'RESULT_AVAILABLE', 'SUB_EXPIRING'
├── title (String)
├── message (Text)
├── actionUrl (String, nullable) — Link to relevant page
├── isRead (Boolean) — Default false
└── createdAt (DateTime)

Table: user_notification_preferences
├── id (PK, CUID)
├── userId (FK to users)
├── type (String)
└── isEnabled (Boolean)

(Reports do not have specific tables; they aggregate data from users, exams, results, and audit_logs tables)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | /api/v1/notifications | Get user notifications | None | Array of Notifications | JWT | All |
| PATCH| /api/v1/notifications/:id/read | Mark as read | None | Success | JWT | All |
| PATCH| /api/v1/notifications/read-all | Mark all as read | None | Success | JWT | All |
| GET | /api/v1/reports/admin/overview | Get admin dashboard stats | None | JSON Stats Object | JWT | Admin |
| GET | /api/v1/reports/teacher/exam/:id | Get exam analysis | None | JSON Analysis Object | JWT | Teacher |
| GET | /api/v1/reports/student/performance| Get student metrics | None | JSON Metrics Object | JWT | Student |
| GET | /api/v1/reports/export | Download report | (Query params) | File Stream | JWT | Varies |

## 7. UI Screens & Components
### Screen: Notification Center (Dropdown/Page)
**URL**: /notifications
**Layout**: List view of notification cards. Unread items have a distinct background color (e.g., pale blue) or a dot indicator.
**Interactive Elements**: "Mark all as read" button. Individual "mark read" icons.

### Screen: Admin / Teacher / Student Dashboard
**URL**: /admin/reports, /teacher/reports, /student/dashboard
**Layout**: Grid layout of metric cards (e.g., Total Users: 1,500) at the top, followed by data visualization components (Chart.js / Recharts) for trends, and a data table for detailed breakdowns.
**Interactive Elements**: Date range selectors, filters by course/subject, Export buttons.
**States**: Skeleton loaders while complex queries execute.

## 8. Business Rules
1. Notifications older than 30 days are automatically deleted or archived to save space.
2. AI usage reports must aggregate data daily to track against token/credit limits.
3. Students cannot view reports for exams they have not yet submitted.
4. Percentile calculations require a minimum of 5 participants in an exam to display, to ensure statistical relevance and privacy.

## 9. Validation Rules
- Export requests must validate that the user has permission to view the requested data subset.

## 10. Error Handling
- **Report Generation Timeout**: If a complex report query takes longer than 15 seconds, the request is aborted and the user is prompted to select a narrower date range or filters.
- **Notification Delivery Failure**: Handled silently; if a notification fails to write, it should not crash the triggering action (e.g., exam publishing must succeed even if notifying students fails).

## 11. Integration Points
- **Exams/Results Modules**: Trigger events that generate notifications.
- **AI Module**: Provides token usage data for Admin reports.
- **Subscriptions Module**: Triggers renewal/expiry notifications and provides revenue data.

## 12. Configuration Options
- **Admin**: Configure global thresholds for "Low AI Credits" alerts.

## 13. Future Enhancements
- Email integration (e.g., via SendGrid or AWS SES) for offline notifications.
- Push notifications via PWA/Service Workers.
- Scheduled email reports (e.g., "Weekly Admin Summary", "Weekly Student Progress").
- Custom report builder for Admins with drag-and-drop column selection.
</Notifications & Reports — Functional Specification>
