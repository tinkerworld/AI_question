<Impersonation System — Functional Specification>
## 1. Overview
The Impersonation System allows authorized staff members to securely view and interact with the platform as either a simulated Preview Student or a specific real student. This feature is crucial for testing content, debugging user issues, and providing accurate customer support while maintaining a strict audit trail of who performed which actions.

## 2. User Stories
- As a Main Admin, I want to impersonate a specific real student so that I can reproduce a bug they reported.
- As a Teacher, I want to use the preview persona so that I can test my newly drafted course.
- As a Sub-Admin, I want all impersonation actions logged under my name so that accountability is maintained.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| Use Preview Student Mode | ✅ | ✅ | ✅ | ❌ | ❌ |
| Impersonate Real Student | ✅ | ⚙️ | ❌ | ❌ | ❌ |
| View Impersonation Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Mode Selection & Activation
**What it does**: Initiates the impersonation session in either PREVIEW_STUDENT or IMPERSONATE_REAL_STUDENT mode.
**How it works**:
1. Staff selects the target (either clicking "Preview" or searching for a real student and clicking "Impersonate").
2. For real students, staff must provide a brief reason for impersonation (for audit purposes).
3. The system generates a secure session context encompassing `actor_user_id`, `effective_user_id`, and `mode`.
4. The user's interface reloads with the effective user's permissions and data.
**Business Rules**: Teachers cannot impersonate real students. Impersonating real students does not bypass payment or modify the student's actual subscription.
**Edge Cases**: Trying to impersonate a student who is currently logged in. (Allowed, but handled independently).

### 4.2 Secure Session Context
**What it does**: Manages the underlying data structure representing the dual-identity session.
**How it works**: A session token is issued containing:
- `actor_user_id` (who is actually doing this)
- `effective_user_id` (who they appear as)
- `mode` (PREVIEW or IMPERSONATE)
- `started_at`, `expires_at`
- `course_context` (for preview mode)
- `content_version` (for preview mode)
- `simulated_plan` (for preview mode)
- `feature_flags` (for preview mode)
**Business Rules**: Session expires automatically after a set duration (e.g., 60 minutes) of inactivity.
**Edge Cases**: Session expires mid-exam. System should save partial progress (if applicable) and prompt the user to re-authenticate as staff.

### 4.3 Audit Trail & Accountability
**What it does**: Ensures every action taken during impersonation is correctly attributed.
**How it works**: API middleware detects the impersonation context. Database writes and audit logs record the `actor_user_id` as the initiator and `effective_user_id` as the subject.
**Business Rules**: Example log entry: Actor: Teacher A, Effective User: Preview Student, Action: Submitted Mock Exam, Mode: PREVIEW.
**Edge Cases**: Actions that trigger asynchronous background jobs must pass the impersonation context to the workers.

### 4.4 Session Cleanup & Exit
**What it does**: Safely terminates the impersonation session and restores the staff context.
**How it works**: User clicks "Exit Impersonation". The session token is revoked or modified, and the user is redirected to the staff dashboard.
**Business Rules**: Any temporary data (like preview mock exam submissions) can be configured to be cleaned up automatically.
**Edge Cases**: Forceful logout by main admin revokes all active impersonation sessions.

## 5. Data Model
```
Table: impersonation_sessions
├── id (PK, CUID)
├── actor_user_id (FK, User)
├── effective_user_id (FK, User) — Can be a system ID for Preview
├── mode (ENUM) — PREVIEW_STUDENT, IMPERSONATE_REAL_STUDENT
├── reason (String) — Provided for real student impersonation
├── session_data (JSON) — course_context, simulated_plan, etc.
├── started_at (Timestamp)
├── expires_at (Timestamp)
└── timestamps

Table: audit_logs (updated)
├── ... existing fields
├── actor_user_id (FK, User) — The real human
├── effective_user_id (FK, User) — The persona
├── impersonation_mode (ENUM)
└── ...
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| POST | /api/v1/impersonate/start | Start session | `{ target_user_id, mode, reason, config }` | `{ session_token }` | Bearer | impersonate.use |
| POST | /api/v1/impersonate/stop | End session | `{}` | `{ success }` | Bearer | Valid Session |
| GET | /api/v1/impersonate/status | Get session info | `{}` | `{ active, mode, effective_user }` | Bearer | Valid Session |

## 7. UI Screens & Components
### Screen: Impersonation Banner
**URL**: Global across student pages during active session
**Layout**: Highly visible, color-coded banner (e.g., yellow for preview, red for real student).
**Interactive Elements**: "Exit Impersonation" button, Session timer.
**States**: Counting down, Expired warning.

### Screen: Impersonation Dialog (Real Student)
**URL**: Triggered from Student Management list
**Layout**: Modal asking for confirmation and a required text area for the reason.
**Interactive Elements**: "Confirm Impersonation", "Cancel".
**States**: Active, Submitting, Error.

## 8. Business Rules
1. Impersonation of real students requires explicit justification logged to the database.
2. The `actor_user_id` must always be preserved in the session context and passed to all downstream services.
3. Impersonation sessions have a hard maximum TTL (Time To Live) regardless of activity.
4. Staff cannot impersonate other staff members with equal or higher privileges.

## 9. Validation Rules
- `target_user_id` must exist and be a valid student.
- `reason` is mandatory when `mode` is IMPERSONATE_REAL_STUDENT (min 10 characters).

## 10. Error Handling
- Attempt to impersonate Admin: 403 Forbidden.
- Session expiry mid-action: 401 Unauthorized with `reason="impersonation_expired"`. Front-end should intercept and show a graceful error.

## 11. Integration Points
- Authentication/Session Service: To issue and validate dual-identity tokens.
- Auditing Service: To accurately record actions.
- Notification System: Prevent real students from receiving emails triggered by staff impersonating them.

## 12. Configuration Options
- Max session duration (default: 60 mins).
- Require reason for impersonation (toggle).
- Restrict real student impersonation to specific sub-admin roles.

## 13. Future Enhancements
- Read-only impersonation mode for support staff (cannot mutate data).
- Automated weekly reports of all real student impersonations sent to Main Admins.
</Impersonation System — Functional Specification>
