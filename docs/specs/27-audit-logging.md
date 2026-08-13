<Audit Logging — Functional Specification>
## 1. Overview
The Audit Logging system provides a comprehensive, immutable record of all significant actions performed within the platform. It exists to ensure accountability, aid in debugging, track unauthorized access attempts, and fulfill compliance requirements by recording who did what, when, and from where, with robust support for impersonation and preview modes.

## 2. User Stories
- As a Main Admin, I want to view a centralized audit log so that I can monitor system activity and investigate issues.
- As a Main Admin, I want to filter logs by user, action, module, or entity so that I can quickly find specific events.
- As a System Architect, I want to automatically capture API interactions via middleware so that developers don't have to manually log every action.
- As a Main Admin, I want to clearly distinguish between actions performed directly by a user versus actions performed while impersonating another user or in preview mode.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| View all audit logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Filter/Search logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export audit logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure retention | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete logs | ❌ | ❌ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Automatic Event Capture (Middleware)
**What it does**: Intercepts incoming API requests and records the corresponding action based on the route and method.
**How it works**: A global middleware inspects incoming requests. For non-GET requests (or specifically annotated GET requests), it extracts the user ID, impersonated user ID (if any), IP address, User-Agent, and the payload. It masks sensitive fields (like passwords) before saving the payload asynchronously to the `audit_logs` table.
**Business Rules**: Must not block the main request flow (asynchronous logging). Must not log highly sensitive data in plain text (e.g., passwords, full credit card numbers).
**Edge Cases**: If the logging service fails, the main transaction should still succeed, but an error should be written to system error logs.

### 4.2 Impersonation & Mode Awareness
**What it does**: Accurately tracks actions taken when a user is in a special mode (e.g., Teacher previewing as a student, or Admin impersonating a user).
**How it works**: The system logs the `actorUserId` (the actual person logged in) and the `effectiveUserId` (the persona they are acting as). The `mode` field explicitly states if this was a DIRECT action, an IMPERSONATE action, or a PREVIEW action.
**Business Rules**: If `mode` is not DIRECT, `effectiveUserId` must be populated.
**Edge Cases**: Nested impersonation is strictly prohibited by the authentication module, but if attempted, the system logs the original actor.

### 4.3 Audit Log Viewer & Search
**What it does**: A UI interface for admins to browse and search the audit trail.
**How it works**: Admins navigate to the Audit Logs section. They see a paginated table of recent events. They can use filters for `actorUserId`, `action`, `module`, `entityType`, `entityId`, `date range`, and `mode`.
**Business Rules**: Search results are capped to 10,000 records at a time to prevent performance degradation.
**Edge Cases**: Searching by a deleted user's name should still work if their ID is retained, or it can be searched by ID.

### 4.4 Configurable Retention Policy
**What it does**: Automatically purges old logs to save database space.
**How it works**: A background cron job runs daily, checking the configured retention period (e.g., 90 days, 365 days). It deletes records older than this threshold.
**Business Rules**: Default retention is 180 days. Admins can configure this setting.
**Edge Cases**: If compliance requires indefinite retention, the auto-delete job can be disabled or configured to archive logs to cold storage (e.g., S3).

### 4.5 User Profile Activity & Revert Logging
**What it does**: Dedicated audit pipeline for user additions, profile edits, role changes, status updates, and one-click rollback operations.
**How it works**: Every mutation to `users`, `user_roles`, or `user_permissions` records the actor (`actorUserId`), effective user (`effectiveUserId`), `action` (`user.created`, `user.profile_updated`, `user.status_changed`, `user.reverted`, `user.restored`), and a JSON delta of altered fields.
**Business Rules**: Revert actions MUST record `restoredFromVersion` and `createdVersion` in metadata. Reverting a profile is itself logged as a top-level audit event.

### 4.6 Academic Content & Version Delta Tracking
**What it does**: Integrates with [Spec 29: Entity Versioning & Rollback Engine](29-entity-versioning-rollback.md) to log modifications and rollbacks to Questions, Exam Patterns, Exams, Subjects, and Syllabus Nodes.
**How it works**: Logs version commits (`question.updated`, `question.reverted`, `exam_pattern.reverted`, `syllabus.node_reverted`) with parent version pointers and commit messages.

### 4.7 Billing & Refund Financial Audit Trail
**What it does**: Integrates with [Spec 30: Billing Refund System](30-billing-refund-system.md) to record monetary events.
**How it works**: Logs `billing.subscription_created`, `billing.credit_purchased`, `billing.refund_processed` (recording gateway refund ID, refund amount, reason, and actor ID).


## 5. Data Model
```
Table: audit_logs
├── id (PK, CUID)
├── actorUserId (FK to users, nullable for system actions) — The actual user performing the action
├── effectiveUserId (FK to users, nullable) — The user being impersonated, if applicable
├── action (String) — E.g., 'user.created', 'exam.published'
├── module (String) — E.g., 'auth', 'users', 'exams', 'ai'
├── entityType (String) — E.g., 'User', 'Exam', 'Question'
├── entityId (String) — ID of the affected entity
├── metadata (JSON) — Additional context, old/new values, masked request payload
├── ipAddress (String) — IP address of the actor
├── userAgent (String) — Browser/Client user agent string
├── mode (Enum) — 'DIRECT', 'PREVIEW', 'IMPERSONATE'
└── timestamp (DateTime) — When the action occurred
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | /api/v1/admin/audit-logs | List logs with filters | (Query params: action, user, etc.) | Array of Logs + Pagination | JWT | Main Admin |
| GET | /api/v1/admin/audit-logs/export | Export logs to CSV | (Query params: filters) | CSV File Stream | JWT | Main Admin |
| GET | /api/v1/admin/audit-logs/:id | Get single log details | None | Audit Log Object | JWT | Main Admin |
| POST | /api/v1/admin/settings/audit | Update retention settings | `{ retentionDays: 365 }` | Success Message | JWT | Main Admin |

## 7. UI Screens & Components
### Screen: Audit Log Viewer
**URL**: /admin/audit-logs
**Layout**: A complex data table filling most of the screen. At the top, a comprehensive filter bar.
**Interactive Elements**:
- Date range picker
- Dropdowns for Module, Action, Entity Type, Mode
- Text input for Actor ID / Entity ID
- "Export to CSV" button
- "View Details" action on each row, opening a modal to view the raw JSON `metadata`.
**States**: Loading spinner during fetch. Empty state if no logs match filters. Error state if fetch fails.

## 8. Business Rules
1. Audit logs are immutable via the application layer; there are no API endpoints to update or manually delete individual records.
2. The `actorUserId` must always reflect the authenticated session's true owner.
3. Passwords, API keys, and sensitive PII must be masked or omitted from the `metadata` JSON before saving.
4. Any change to the retention policy must itself be logged as an audit event.

## 9. Validation Rules
- Export date ranges cannot exceed 31 days to prevent memory issues.
- `retentionDays` must be an integer between 30 and 3650.

## 10. Error Handling
- **Database Failure during logging**: Logs should fallback to a local file or standard output if the database is unreachable, to prevent losing critical audit data.
- **Invalid Filter Query**: Returns a 400 Bad Request with specific validation messages.

## 11. Integration Points
- **Authentication Module**: To retrieve `actorUserId`, `effectiveUserId`, and `mode` from the current context.
- **Settings Module**: To read the configured retention policy.
- **Global Middleware**: Integrates across all API routes to capture actions automatically.

## 12. Configuration Options
- **Retention Period**: Number of days to keep logs (default 180).
- **Log Level/Verbosity**: Option to log all GET requests (read operations) or only state-changing requests (POST/PUT/DELETE/PATCH).

## 13. Future Enhancements
- Archive old logs to AWS S3 / Cold Storage instead of hard deleting.
- Real-time alerts/webhooks based on specific critical audit events (e.g., alert if an Admin creates another Admin).
- Integration with external SIEM tools (e.g., Datadog, Splunk) via structured logging.
</Audit Logging — Functional Specification>
