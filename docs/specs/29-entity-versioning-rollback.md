# Entity Versioning & Rollback Engine — Functional Specification

## 1. Overview
The **Entity Versioning & Rollback Engine** provides a Git-like delta tracking and rollback mechanism for critical system entities, including **User Profiles**, **Question Bank Questions**, **Exam Patterns**, **Examination Papers**, **Courses**, **Subjects**, and **Syllabus Nodes (Topics/Concepts)**.

Every addition, edit, status change, or deletion creates an immutable, typed version commit. Authorized administrators (Main Admin and Sub-Admin) can inspect side-by-side diffs, view complete historical chains, and perform one-click rollbacks to any historical state. Revert operations themselves generate new version commits and audit log entries, maintaining zero data destruction and total accountability.

---

## 2. User Stories
- **As a Main Admin**, I want to view the complete edit history of any User Profile (including role changes, status updates, and profile edits) so that I can see who made changes and why.
- **As a Main Admin or Sub-Admin**, I want to compare any past version of a user profile or academic entity with its current state using a visual diff viewer so that I can evaluate changes before reverting.
- **As a Main Admin or Sub-Admin**, I want to perform a one-click rollback on a modified or soft-deleted entity (user, question, exam pattern, topic) so that I can instantly recover from errors or unauthorized edits.
- **As a Teacher or Content Creator**, I want to view previous revisions of a question or syllabus node and restore a previous draft without losing the revision history.
- **As an Auditor**, I want all rollback operations to be recorded as new version commits and audit log entries so that nobody can silently erase or alter system history.

---

## 3. Permissions & Access Control

| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|:---:|:---:|:---:|:---:|:---:|
| View User Profile Version History | ✅ | ✅ (Teachers/Students only) | ❌ | ❌ | ❌ |
| Revert User Profile to Previous Version | ✅ | ✅ (Teachers/Students only) | ❌ | ❌ | ❌ |
| Undelete Soft-Deleted User | ✅ | ✅ (Teachers/Students only) | ❌ | ❌ | ❌ |
| View Academic Entity History (Questions/Syllabus/Patterns) | ✅ | ✅ | ✅ (Own/Assigned) | ❌ | ❌ |
| Revert Question / Syllabus / Exam Pattern | ✅ | ✅ | ✅ (Draft/Review state) | ❌ | ❌ |
| Restore Soft-Deleted Question / Syllabus / Exam | ✅ | ✅ | ❌ | ❌ | ❌ |
| Purge / Hard Delete Version History | ❌ (Immutable) | ❌ | ❌ | ❌ | ❌ |

---

## 4. Features & Capabilities

### 4.1 Git-Like Commit & Delta Model
- **What it does**: Treats entity modifications like Git commits using the `@repo/versioning-engine` package.
- **How it works**: When an entity (User, Question, Exam Pattern, Exam, Syllabus Node) is created or updated, the system writes a record to `entity_versions` containing:
  - `entityType`: `'User'`, `'Question'`, `'ExamPattern'`, `'Exam'`, `'Subject'`, `'SyllabusNode'`.
  - `entityId`: CUID of the entity.
  - `versionNumber`: Incremental integer (`v1`, `v2`, `v3`...) or SHA-256 commit hash.
  - `parentVersionId`: ID of the previous version record (forming a strict DAG/chain).
  - `actionType`: `'CREATE'`, `'UPDATE'`, `'DELETE'`, `'STATUS_CHANGE'`, `'REVERT'`.
  - `actorUserId`: User ID of the administrator/teacher making the change.
  - `effectiveUserId`: Impersonated user ID if in impersonation/preview mode.
  - `snapshot`: Full JSON snapshot of the entity at that point in time.
  - `delta`: JSON patch object showing `{ field: { old: valueA, new: valueB } }`.
  - `commitMessage`: Reason provided by the actor for the change or revert.
- **Business Rules**: Version records are **strictly append-only** and immutable. No user or admin can modify or delete past `entity_versions`.

### 4.2 User Profile Versioning & Rollback
- **What it does**: Tracks changes to user account attributes (name, email, phone, roles, permissions, status: `ACTIVE`/`SUSPENDED`/`ARCHIVED`, subscription level).
- **How it works**:
  - Any call to `PUT /api/v1/users/:id` or `PATCH /api/v1/users/:id/status` generates an `entity_versions` record.
  - When an admin invokes `POST /api/v1/users/:id/revert`, they supply `targetVersionId` and a `commitMessage`.
  - The system loads the snapshot from `targetVersionId`, applies those attribute values back to the `users` table, and generates a **NEW** version `vN+1` with `actionType = 'REVERT'`.
  - An `audit_logs` record is simultaneously emitted with `action = 'user.profile_reverted'`.
- **Soft-Delete Recovery**: If a user is soft-deleted/archived, `POST /api/v1/users/:id/restore` retrieves the last active snapshot version and reinstates the user account without data loss.

### 4.3 Question Bank & Academic Entity Rollback
- **What it does**: Allows teachers and admins to inspect and roll back questions, options, answer keys, syllabus nodes, and exam patterns.
- **How it works**:
  - Questions, Exam Patterns, and Syllabus Nodes maintain their full version chain.
  - Rollback can be performed on draft, under-review, or published items (note: rolling back a question updates the Question Bank master item; published historical exam papers retain their frozen `exam_question_snapshots` as per Spec 18).
  - Soft-deleted questions or syllabus nodes can be undeleted via `POST /api/v1/questions/:id/restore`.

### 4.4 Visual Side-by-Side Diff Inspector
- **What it does**: UI component (`EntityDiffViewer`) displaying green/red highlight differences between any two versions or between a historical version and current state.
- **How it works**: Computes JSON diffs using `@repo/versioning-engine`. Renders added fields in green (`+`), removed fields in red (`-`), and modified values with old/new comparisons.

### 4.5 Audit Trail Integration
- **What it does**: Guarantees every revert action is prominently featured in the global Audit Log.
- **How it works**: The versioning service automatically calls the `AuditLogger` during any revert or restore operation. The audit entry includes `actorUserId`, `action = 'entity.reverted'`, `entityType`, `entityId`, and `metadata: { restoredFromVersion: vX, createdVersion: vY, commitMessage }`.

---

## 5. Data Model

```
Table: entity_versions
├── id                 (CUID, PK)
├── entityType         (String) — 'User', 'Question', 'ExamPattern', 'Exam', 'Subject', 'SyllabusNode'
├── entityId           (String, Indexed) — ID of the target entity
├── versionNumber      (Integer) — 1, 2, 3...
├── parentVersionId    (FK to entity_versions, Nullable) — Previous version in tree
├── actionType         (Enum) — 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'REVERT'
├── actorUserId        (FK to users) — Admin/User who initiated the change
├── effectiveUserId    (FK to users, Nullable) — Persona if impersonating/previewing
├── snapshot           (JSONB) — Full object snapshot at this version
├── delta              (JSONB) — Diffs: { fieldName: { old: X, new: Y } }
├── commitMessage      (Text, Nullable) — Description/reason for change or revert
├── restoredFromVersion (Integer, Nullable) — Populate if actionType == 'REVERT'
└── createdAt          (DateTime, Default NOW)

Indexes:
- (entityType, entityId, versionNumber UNIQUE)
- (entityId, createdAt DESC)
- (actorUserId)
```

---

## 6. API Endpoints

| Method | Endpoint | Description | Auth | Permission |
|---|---|---|---|---|
| `GET` | `/api/v1/versioning/:entityType/:entityId/history` | List complete version history for an entity | Required | `audit.view` or entity read |
| `GET` | `/api/v1/versioning/:entityType/:entityId/versions/:versionNum` | Get specific version snapshot & delta | Required | `audit.view` or entity read |
| `GET` | `/api/v1/versioning/:entityType/:entityId/diff` | Compare any two versions (`?v1=1&v2=3`) | Required | `audit.view` or entity read |
| `POST` | `/api/v1/versioning/:entityType/:entityId/revert` | Revert entity to a previous version | Required | `users.update` / `questions.update` |
| `POST` | `/api/v1/versioning/:entityType/:entityId/restore` | Restore soft-deleted entity | Required | `users.archive` / `questions.delete` |

---

## 7. Business & Validation Rules
1. **Immutable History**: Version records can never be overwritten or deleted.
2. **Revert is a Commit**: Reverting to Version 2 from Version 5 creates Version 6 (whose snapshot matches Version 2). It never deletes Versions 3, 4, or 5.
3. **Impersonation Awareness**: If an admin reverts a user while in Preview or Impersonation mode, `actorUserId` records the admin's true identity, and `effectiveUserId` records the persona.
4. **Scope Control**: Sub-Admins cannot revert Main Admin profiles. Main Admins are protected by system guardrails.
