<Main Admin Profile — Functional Specification>
## 1. Overview
The Main Admin Profile represents the highest authority user role within the Adaptive Examination & AI Learning Platform. It exists to provide complete oversight, configuration, and management capabilities across the entire system, ensuring that structural data, user accounts, and global settings are properly maintained.

## 2. User Stories
- As a Main Admin, I want to create and manage all user accounts (including other Main Admins) so that the platform has the correct operational staff.
- As a Main Admin, I want to configure global system settings and AI limits so that the platform operates within budget and operational constraints.
- As a Main Admin, I want to view full audit logs so that I can trace all critical actions back to the user who performed them.
- As a Main Admin, I want to manage billing plans so that monetization strategies are correctly applied to the system.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| Create/Delete Main Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/Delete Sub-Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/Delete Teacher | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create/Delete Student | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Billing & AI Limits | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure System Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Courses/Syllabus | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Manage Question Bank | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Publish/Withdraw Content | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Preview Student Mode | ✅ | ✅ | ✅ | ❌ | ❌ |
| Revert User Profile / Soft-Delete | ✅ | ✅ (Teachers/Students) | ❌ | ❌ | ❌ |
| Revert Questions/Exam/Syllabus | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Process Refund ("Return Money") | ✅ | ✅ (Configurable limit) | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 System Authority & User Management
**What it does**: Allows creation, modification, suspension, and deletion of all user roles.
**How it works**: Main Admin navigates to User Management, selects role type, fills in details, and assigns permissions/state (Active, Suspended, Archived).
**Business Rules**: The system must enforce that the last active Main Admin cannot be suspended, archived, or deleted.
**Edge Cases**: If a Main Admin tries to delete themselves, the system rejects the request.

### 4.2 Content & Curriculum Management
**What it does**: Full control over courses, subjects, syllabus, question bank, exam patterns, and exam papers.
**How it works**: Main Admin accesses Content Management modules to CRUD content and can trigger publish/withdraw actions to make content live or offline.
**Business Rules**: Withdrawing an active exam paper notifies enrolled students.
**Edge Cases**: Cannot delete a subject if active courses depend on it (must archive instead).

### 4.3 Billing and System Settings
**What it does**: Configuration of subscription plans, AI token limits, and global system parameters.
**How it works**: Main Admin goes to Settings, updates limits or pricing tiers, and saves.
**Business Rules**: Changes to active billing plans apply only to new billing cycles unless forced.
**Edge Cases**: Removing an AI limit entirely triggers a confirmation warning about potential costs.

### 4.4 User Profile & Academic Content Rollback Engine
**What it does**: Allows Main Admin to inspect version history and roll back any User Profile, Question, Exam Pattern, Exam, or Syllabus Node to a previous state using a visual diff tool ([Spec 29](29-entity-versioning-rollback.md)).
**How it works**: Main Admin clicks "Version History" on a user or question, inspects the side-by-side diff, and clicks "Revert to Version X". The system applies the change and logs a new revert commit and audit entry.

### 4.5 Refund Processing & Money Return Engine
**What it does**: Enables Main Admin to approve and process full or partial payment refunds for subscriptions or AI credit purchases ([Spec 30](30-billing-refund-system.md)).
**How it works**: Main Admin opens a student billing record, enters refund amount and reason, and clicks "Process Refund". The system calls the payment gateway adapter, returns funds to the student, revokes unspent credits/plan entitlements, and records the refund audit log.


## 5. Data Model
```
Table: users
├── id (PK, CUID)
├── email (String) — Unique login identifier
├── role (Enum) — MAIN_ADMIN, SUB_ADMIN, TEACHER, STUDENT
├── status (Enum) — ACTIVE, SUSPENDED, ARCHIVED
├── password_hash (String) — Hashed credential
└── timestamps (DateTime)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| POST | /api/v1/admins | Create admin | `{email, role}` | `Admin object` | JWT | `users.create` |
| PUT | /api/v1/admins/:id/status | Change status | `{status}` | `Admin object` | JWT | `users.update` |
| GET | /api/v1/audit-logs | Get system logs | `None` | `List<Log>` | JWT | `audit.read` |
| PUT | /api/v1/settings/billing | Update billing | `{plan_details}`| `Settings obj` | JWT | `billing.manage` |

## 7. UI Screens & Components
### Screen: Admin Dashboard
**URL**: /admin/dashboard
**Layout**: High-level metrics (active users, system health, revenue), quick action buttons.
**Interactive Elements**: Date range filters, metric cards, navigation sidebar.
**States**: Loading skeleton, fully populated dashboard.

### Screen: User Management
**URL**: /admin/users
**Layout**: Data table with user list, filtering sidebar, and "Add User" modal.
**Interactive Elements**: Role dropdowns, status toggles, search bar, pagination.
**States**: Empty state if no users found for filter, error state on fetch failure.

### Screen: System Settings
**URL**: /admin/settings
**Layout**: Tabbed interface for Billing, AI Limits, Notifications, and Security.
**Interactive Elements**: Toggles, input fields, save buttons.
**States**: Unsaved changes warning.

### Screen: Audit Logs
**URL**: /admin/audit
**Layout**: Read-only log table showing timestamp, actor, action, and target.
**Interactive Elements**: Advanced search, CSV export, date range filters.
**States**: Empty if no logs in range.

## 8. Business Rules
1. A Main Admin cannot delete or archive their own account.
2. The system must always maintain at least one Active Main Admin.
3. Cascading deletes are prevented for users with associated historical data (e.g., graded exams); they must be Archived instead.

## 9. Validation Rules
- Email must be valid format and unique across all users.
- Status updates must transition logically (e.g., Active -> Suspended, not Deleted -> Active).

## 10. Error Handling
- HTTP 403 Forbidden: Returned if a non-Main Admin attempts a Main Admin action.
- HTTP 400 Bad Request: "Cannot delete the last active Main Admin account."

## 11. Integration Points
- Email Service: For sending account creation and password reset emails.
- Payment Gateway: For billing plan synchronization.

## 12. Configuration Options
- Session timeout duration.
- Password complexity requirements.
- AI token usage alerts.

## 13. Future Enhancements
- Role-based granular permissions within the Main Admin group (e.g., Billing Admin vs. Super Admin).
- Multi-factor authentication (MFA) enforcement policies.
</Main Admin Profile — Functional Specification>
