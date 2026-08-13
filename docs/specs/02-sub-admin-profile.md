<Sub-Admin Profile — Functional Specification>
## 1. Overview
The Sub-Admin Profile is a delegated administrative role designed to handle day-to-day operational tasks within the Adaptive Examination & AI Learning Platform. It exists to manage content, teachers, and students without having access to critical system configurations or the ability to manage Main Admins.

## 2. User Stories
- As a Sub-Admin, I want to create and manage Teacher and Student accounts so that I can onboard new users.
- As a Sub-Admin, I want to manage courses, syllabus, and question banks so that the curriculum remains up-to-date.
- As a Sub-Admin, I want to view operational reports so that I can monitor platform usage and performance.
- As a Sub-Admin, I want to use Preview Student mode so that I can verify how exams appear to students before publishing.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| Create/Delete Main Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/Delete Sub-Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/Delete Teacher | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create/Delete Student | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Courses/Syllabus | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Manage Question Bank | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Publish/Withdraw Content | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| View System Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Preview Student Mode | ✅ | ✅ | ✅ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Delegated User Management
**What it does**: Allows creation and management of Teachers and Students.
**How it works**: Sub-Admin navigates to User Management, creates users, or changes their states (Active, Suspended, Archived).
**Business Rules**: Cannot view, edit, or delete any Main Admin or other Sub-Admin accounts.
**Edge Cases**: If a Sub-Admin tries to access a Main Admin profile via direct URL, access is denied.

### 4.2 Curriculum and Content Workflow
**What it does**: Manages courses, question banks, and exam papers, including publishing workflows.
**How it works**: Sub-Admin can create, edit, approve, and publish content created by Teachers or themselves.
**Business Rules**: Sub-Admins bypass standard Teacher approval workflows and can directly publish.
**Edge Cases**: Concurrent editing of a question bank by a Teacher and Sub-Admin utilizes optimistic locking.

### 4.3 Reporting and Preview
**What it does**: Access to user reports and student perspective previews.
**How it works**: Sub-Admin can generate reports on exam performance or impersonate a 'Preview Student' session.
**Business Rules**: Preview sessions do not generate actual analytics or billing events.
**Edge Cases**: Preview mode ignores strict time-window constraints on exams for testing purposes.

### 4.4 Delegated User Profile & Content Rollback
**What it does**: Allows Sub-Admin to roll back Teacher and Student profiles or academic content (Questions, Exams, Syllabus) to previous versions ([Spec 29](29-entity-versioning-rollback.md)).
**How it works**: Sub-Admin inspects version history of a Teacher/Student or Question, views diff, and clicks "Revert".
**Business Rules**: Sub-Admins CANNOT revert Main Admin or other Sub-Admin profiles. All revert actions are recorded in the audit log.

### 4.5 Delegated Refund & Credit Adjustment
**What it does**: Permits Sub-Admins to process student refund requests or return money within designated policy guidelines ([Spec 30](30-billing-refund-system.md)).
**How it works**: Sub-Admin reviews student refund ticket, selects full/partial refund, and submits. Payment adapter processes refund, and credits/entitlements are clawbacked automatically.


## 5. Data Model
```
Table: users
├── id (PK, CUID)
├── email (String)
├── role (Enum) — SUB_ADMIN
├── status (Enum) — ACTIVE, SUSPENDED, ARCHIVED
├── created_by (CUID, FK users.id) — Must be a Main Admin
└── timestamps (DateTime)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| POST | /api/v1/teachers | Create teacher | `{email, profile}` | `Teacher obj`| JWT | `users.create` |
| POST | /api/v1/students | Create student | `{email, profile}` | `Student obj`| JWT | `users.create` |
| PUT | /api/v1/content/publish | Publish content | `{content_id}` | `Success msg`| JWT | `content.publish` |
| POST | /api/v1/preview/session | Start preview | `{exam_id}` | `Session token`| JWT | `preview.create` |

## 7. UI Screens & Components
### Screen: Operations Dashboard
**URL**: /subadmin/dashboard
**Layout**: Focus on active exams, pending teacher approvals, and student enrollments.
**Interactive Elements**: Quick links to approve content, recent activity feed.
**States**: Empty states for no pending tasks.

### Screen: Content Management
**URL**: /subadmin/content
**Layout**: Folder or list view of all syllabus and question bank items.
**Interactive Elements**: Bulk select, publish/withdraw toggles, edit buttons.
**States**: Loading indicator during bulk operations.

### Screen: Delegated User Management
**URL**: /subadmin/users
**Layout**: List of teachers and students under their jurisdiction.
**Interactive Elements**: Add/edit user forms, status change actions.
**States**: Active, Suspended, Archived views.

## 8. Business Rules
1. Sub-Admins can only be created, deleted, or archived by a Main Admin.
2. A Sub-Admin has full authority over Teacher and Student records, subject to standard data retention policies.
3. Sub-Admins cannot access billing, global AI limits, or system security settings.

## 9. Validation Rules
- Operations targeting `role=MAIN_ADMIN` or `role=SUB_ADMIN` by a Sub-Admin must throw a validation error.
- Content must pass completeness validation before publishing.

## 10. Error Handling
- HTTP 403 Forbidden: When attempting to access Main Admin settings or audit logs.
- HTTP 404 Not Found: When querying an account type they lack visibility into.

## 11. Integration Points
- Notification System: For alerting Teachers when their content is published or rejected.
- Reporting Engine: For generating PDF/Excel reports of student progress.

## 12. Configuration Options
- Default views (List vs Grid) in content management.
- Notification preferences for content approval requests.

## 13. Future Enhancements
- Scoped Sub-Admins (e.g., Sub-Admin restricted to a specific geographical region or department).
- Advanced content workflow with multi-stage Sub-Admin approvals.
</Sub-Admin Profile — Functional Specification>
