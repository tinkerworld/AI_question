# RBAC & Permission System — Functional Specification

## 1. Overview
The Role-Based Access Control (RBAC) System provides granular, robust permission management across the entire platform. It utilizes atomic permissions grouped into roles to determine user capabilities. The system supports strict separation of duties, custom role creation, and ensures that sensitive actions are deeply protected at the API and UI levels.

## 2. User Stories
- As a Main Admin, I want to create a custom "Content Manager" role with only course creation permissions, so that I can delegate work without granting full admin rights.
- As a Sub-Admin, I want to be restricted from deleting the Main Admin account, so that system hierarchy is preserved.
- As a Teacher, I want to only manage my own courses and students, so that I don't accidentally affect other teachers' data.
- As a developer, I want to easily check if a user has a specific permission in my code using simple utility functions.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Manage System Roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Custom Roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign Roles to Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Permissions | ✅ | ✅ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Permission Model
**What it does**: Defines the atomic capabilities in the system.
**How it works**: Permissions are atomic capabilities (e.g., `users.create`, `courses.publish`). They are checked by middleware before executing an action.
**Business Rules**: Permissions are hardcoded and defined in code. There are 30+ permissions covering all major modules.
**Edge Cases**: Deprecated permissions handling during system upgrades.

### 4.2 Role Management
**What it does**: Groups permissions into named roles.
**How it works**: Includes fixed System Roles (MAIN_ADMIN, SUB_ADMIN, TEACHER, STUDENT) and dynamic Custom Roles created by admins.
**Business Rules**: System roles cannot be deleted or fundamentally modified. Custom roles can be edited and deleted. Default mappings apply to system roles.
**Edge Cases**: Deleting a custom role currently assigned to users.

### 4.3 User-Role Assignment
**What it does**: Links users to their operational roles.
**How it works**: A user can have one or more roles.
**Business Rules**: The user's effective permissions are the union of all permissions from all their assigned roles.
**Edge Cases**: User has conflicting roles (union model always grants access if ANY role permits).

### 4.4 Authorization Middleware & Utilities
**What it does**: Protects API routes and provides programmatic access checks.
**How it works**: `hasPermission('action')` middleware checks the decoded JWT payload or DB. Utilities like `hasAnyPermission` and `hasAllPermissions` are available.
**Business Rules**: If a route lacks permission middleware, it defaults to denying access unless explicitly marked public.
**Edge Cases**: Token payload size management.

### 4.5 Permission Addition & Migration
**What it does**: Process for adding new permissions to the system.
**How it works**: New permissions are added in code and seeded into the DB via migrations.
**Business Rules**: Code and DB must stay in sync regarding available permissions.

## 5. Data Model
```text
Table: roles
├── id (PK, CUID)
├── name (VARCHAR) — e.g., "Content Manager"
├── slug (VARCHAR, Unique) — e.g., "content_manager"
├── is_system (BOOLEAN) — True for MAIN_ADMIN, etc.
├── description (TEXT)
└── timestamps

Table: permissions
├── id (PK, CUID)
├── action (VARCHAR, Unique) — e.g., "courses.create"
├── module (VARCHAR) — e.g., "courses"
├── description (TEXT)
└── timestamps

Table: role_permissions (Join Table)
├── role_id (FK, CUID)
└── permission_id (FK, CUID)

Table: user_roles (Join Table)
├── user_id (FK, CUID)
└── role_id (FK, CUID)
```

## 6. API Endpoints
*(Note: Canonical API contracts and permission definitions are mastered in [API Reference Catalog](../guides/02-api-reference.md))*

| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/v1/permissions` | List all permissions | None | List of perms | Req | `permissions.read` |
| GET | `/api/v1/roles` | List all roles | None | List of roles | Req | `roles.read` |
| POST | `/api/v1/roles` | Create custom role | name, permission_ids | Role object | Req | `roles.create` |
| PUT | `/api/v1/roles/:id` | Update custom role | name, permission_ids | Role object | Req | `roles.update` |
| PUT | `/api/v1/roles/:id/permissions` | Update role permissions | permission_ids | Role object | Req | `roles.update` |
| DELETE| `/api/v1/roles/:id` | Delete custom role | None | Success msg | Req | `roles.delete` |
| PUT | `/api/v1/users/:id/roles` | Assign role to user | role_ids | User object | Req | `roles.update` |

## 7. UI Screens & Components
### Screen: Role Management List
**URL**: `/admin/roles`
**Layout**: Data table listing all roles. Columns: Name, Type (System/Custom), User Count, Actions.
**Interactive Elements**: "Create New Role" button. Edit/Delete icons for custom roles.
**States**: Empty state if no custom roles.

### Screen: Role Builder / Editor
**URL**: `/admin/roles/new` or `/admin/roles/:id/edit`
**Layout**: Form for role name/description. Two-pane layout or nested accordion for assigning permissions.
**Interactive Elements**: Checkboxes for permissions grouped by module. "Select All" toggles per module.
**States**: Validation errors if name is missing or no permissions selected.

## 8. Business Rules
1. System roles (MAIN_ADMIN, SUB_ADMIN, TEACHER, STUDENT) cannot be deleted.
2. A user must have at least one role to access the system beyond public areas.
3. Main Admins bypass all permission checks inherently.
4. Only Main Admins can grant or revoke the MAIN_ADMIN role.
5. The 30+ explicit permissions must be seeded on system initialization (users.create, users.read, courses.create, syllabus.create, questions.create, exams.create, ai.interview, reports.view, billing.manage, etc.).

## 9. Validation Rules
- Role Name: Unique, 3-50 characters.
- Assigned Permissions: Must reference valid, existing permission IDs.

## 10. Error Handling
- 403 Forbidden: Returned when a user attempts an action without the required permission.
- 400 Bad Request: When trying to delete or edit a system role.
- 409 Conflict: Attempting to create a role with a duplicate name.

## 11. Integration Points
- Authentication System: Embeds role slugs and permissions in JWT.
- UI Frontend: Uses user's permissions to hide/show navigation menus and buttons.
- Audit Log System: Logs role creation, modifications, and user-role assignment changes.

## 12. Configuration Options
- Admins can configure custom roles and their permission mappings.

## 13. Future Enhancements
- Attribute-Based Access Control (ABAC) / Resource-level permissions.
- Temporary role assignments.
- Role approval workflows.
