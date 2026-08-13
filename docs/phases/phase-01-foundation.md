# Phase 1 — Foundation

## Overview
This phase establishes the foundational architecture and infrastructure for the Adaptive Examination & AI Learning Platform. It encompasses the monorepo setup, shared packages (database, types, validation, permissions), core API middleware, secure authentication, role-based user management, audit logging, and the initial frontend scaffolding with a premium aesthetic and role-aware navigation.

## Prerequisites
- Node.js (v20+) and pnpm (v9+) installed.
- Docker and Docker Compose installed for local database and Redis provisioning.
- Basic architectural decisions and design language (colors, typography) finalized.
- Target environment domains and hosting providers identified.

## Features

### Feature 1.1 — Monorepo Setup & Infrastructure

#### Description
Sets up the pnpm workspaces and Turborepo configuration to manage multiple packages and applications within a single repository, ensuring efficient caching and task orchestration. Includes shared TypeScript, ESLint, and Prettier configurations.

#### Sub-Features
- pnpm workspaces configuration (`pnpm-workspace.yaml`).
- Turborepo orchestration (`turbo.json`) for build, test, and lint pipelines.
- Docker Compose configuration provisioning PostgreSQL 16 and Redis 7.
- Centralized TypeScript configuration (`@repo/typescript-config`).
- Centralized ESLint and Prettier configs (`@repo/eslint-config`).
- Environment variable management strategy across local and CI/CD environments.

#### API Endpoints (if applicable)
N/A

#### Database Changes (if applicable)
N/A

#### Frontend Pages/Components (if applicable)
N/A

#### Acceptance Criteria
1. pnpm install works successfully from the root without errors.
2. `turbo run build`, `turbo run lint`, and `turbo run test` execute across all packages honoring dependency graphs.
3. Docker Compose successfully spins up PostgreSQL and Redis, accessible on standard ports.
4. Shared configurations (TS, ESLint, Prettier) are correctly inherited by all workspace packages.
5. Workspace packages can import each other seamlessly.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F01.U001 | TS Config Validation | Verify base tsconfig is strict | Base tsconfig | `strict: true` | High |
| P01.F01.U002 | ESLint Config Validation | Verify ESLint rules loaded | ESLint base | No parsing errors | Medium |
| P01.F01.U003 | Prettier Config Validation | Verify Prettier settings | Prettier base | Expected formatting | Medium |
| P01.F01.U004 | Turbo Cache Configuration | Verify turbo cache settings | turbo.json | `outputs` configured | High |
| P01.F01.U005 | Workspace Package Names | Verify valid package naming | package.json | `@repo/*` namespace | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F01.I001 | Cross-package imports | Test if apps can import from packages | Create dummy app and pkg | Build app using pkg | Build succeeds | Critical |
| P01.F01.I002 | Docker DB Connection | Ensure DB is accessible | Run `docker-compose up -d` | Connect via pg client | Connection successful | Critical |
| P01.F01.I003 | Docker Redis Connection | Ensure Redis is accessible | Run `docker-compose up -d` | Ping via redis-cli | PONG | Critical |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F01.E001 | Full Workspace Build | Verify entire repo builds from scratch | Clean repo -> `pnpm i` -> `turbo build` | Zero errors, cache populated | Critical |
| P01.F01.E002 | Cached Workspace Build | Verify Turborepo caching | Run `turbo build` twice | Second run is "FULL TURBO" (cached) | High |

### Feature 1.2 — Database Package (@repo/database)

#### Description
Centralized database package using Prisma ORM. Defines core models, singleton client, and migration strategy.

#### Sub-Features
- Prisma schema containing: `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `RefreshToken`, `AuditLog`.
- User statuses enum: `ACTIVE`, `SUSPENDED`, `ARCHIVED`.
- Prisma client singleton initialization for shared consumption.
- Prisma migration workflow.
- Seed script to inject initial required roles and permissions.

#### API Endpoints (if applicable)
N/A

#### Database Changes (if applicable)
- Added tables: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `audit_logs`.

#### Frontend Pages/Components (if applicable)
N/A

#### Acceptance Criteria
1. Prisma schema compiles cleanly without warnings.
2. `prisma generate` creates the typed client.
3. `prisma migrate dev` successfully applies tables to the local database.
4. Seed script successfully inserts default roles and permissions without duplication on re-runs.
5. `@repo/database` exports the PrismaClient instance correctly.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F02.U001 | Client Singleton Export | Verify client is exported | Package import | PrismaClient instance | Critical |
| P01.F02.U002 | Schema Compilation | Verify schema validates | `prisma validate` | Validation success | Critical |
| P01.F02.U003 | User Status Enum | Check status enum values | Enum definition | ACTIVE, SUSPENDED, ARCHIVED | High |
| P01.F02.U004 | Relation Definitions | Check User-Role relations | Prisma AST | Many-to-Many defined | High |
| P01.F02.U005 | Audit Log Structure | Check AuditLog fields | Prisma AST | JSON metadata field present | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F02.I001 | DB Connection test | Connect to test DB | Docker test DB running | Execute `prisma.$queryRaw` | Returns 1 | Critical |
| P01.F02.I002 | Migration execution | Run migrations on empty DB | Empty PostgreSQL | `prisma migrate deploy` | Tables created | Critical |
| P01.F02.I003 | Seed execution | Run seed script | Migrated DB | `ts-node seed.ts` | Base roles exist in DB | Critical |
| P01.F02.I004 | User CRUD ops | Test Prisma User functions | Migrated DB | Create, Read, Update, Delete User | Operations succeed | High |
| P01.F02.I005 | Cascading deletes | Test User-Token cascade | DB with User + Token | Delete User | Token is deleted | Medium |

##### E2E Tests (if applicable)
N/A (Covered by API E2E)

### Feature 1.3 — Shared Types Package (@repo/types)

#### Description
Provides a single source of truth for TypeScript types and interfaces used across the frontend, backend, and auxiliary scripts.

#### Sub-Features
- User, Role, and Permission Data Transfer Objects (DTOs).
- Standardized API response envelope: `{ success: boolean, data?: T, error?: string, meta?: any }`.
- Pagination types (`PaginatedRequest`, `PaginatedResponse`).
- JWT payload types.
- Auth context types, explicitly including impersonation fields (`actor_user_id`, `effective_user_id`, `mode`).

#### API Endpoints (if applicable)
N/A

#### Database Changes (if applicable)
N/A

#### Frontend Pages/Components (if applicable)
N/A

#### Acceptance Criteria
1. Package compiles cleanly with `tsc`.
2. Types can be imported by both API and Frontend packages without runtime errors.
3. Impersonation fields are strictly typed in AuthContext.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F03.U001 | Package Compilation | Run `tsc` on types | Source files | No compilation errors | Critical |
| P01.F03.U002 | API Envelope Type | Check envelope generics | generic type `<T>` | Infers correct data shape | High |
| P01.F03.U003 | AuthContext Impersonation | Check impersonation fields | Type definition | Fields are properly typed | High |
| P01.F03.U004 | Pagination Generics | Check pagination limits | Type definition | `limit`, `page`, `total` | Medium |
| P01.F03.U005 | JWT Payload Shape | Check JWT claims | Type definition | Includes `sub`, `roles`, `permissions` | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F03.I001 | API consumer test | Import types in API | API package | Build API | Compiles successfully | High |
| P01.F03.I002 | Web consumer test | Import types in NextJS | Web package | Build NextJS | Compiles successfully | High |
| P01.F03.I003 | Type isolation | Ensure no runtime deps | Package | Check bundle/exports | Only type declarations emitted | Medium |

##### E2E Tests (if applicable)
N/A

### Feature 1.4 — Validation Package (@repo/validation)

#### Description
Centralized Zod schemas for request validation to ensure structural integrity of data across API boundaries.

#### Sub-Features
- Schemas for: registration, login, user creation, user update, password change, pagination parameters.
- Reusable primitive schemas (e.g., strong password rules, standard email validation).

#### API Endpoints (if applicable)
N/A

#### Database Changes (if applicable)
N/A

#### Frontend Pages/Components (if applicable)
N/A

#### Acceptance Criteria
1. Zod schemas accurately reflect `@repo/types` interfaces (using `z.infer`).
2. Valid payloads parse successfully.
3. Invalid payloads throw structured Zod errors with clear messages.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F04.U001 | Login Schema Valid | Test valid login payload | Valid email & pwd | Parsed output matches input | High |
| P01.F04.U002 | Login Schema Invalid | Test bad email | `bad-email`, `pwd` | Error: Invalid email format | High |
| P01.F04.U003 | Password Policy | Test password strength | `123` | Error: Too short/weak | High |
| P01.F04.U004 | Pagination Schema | Test valid page params | `page=1, limit=10` | Parsed as numbers | Medium |
| P01.F04.U005 | Pagination Bounds | Test max limit bypass | `limit=5000` | Error: Exceeds max limit | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F04.I001 | Form validation sync | Use zod schema in react-hook-form | NextJS app | Submit form | Validation triggers correctly | High |
| P01.F04.I002 | Middleware validation | Use zod in Express middleware | API app | Send HTTP request | 400 Bad Request on error | High |
| P01.F04.I003 | Type matching | Validate `z.infer` matches `@repo/types` | TypeScript checker | Run `tsc` | No type assignment errors | Critical |

##### E2E Tests (if applicable)
N/A

### Feature 1.5 — Permissions Package (@repo/permissions)

#### Description
Defines the granular permission model and role bindings for the platform. Provides utilities for checking permissions.

#### Sub-Features
- 30+ string constants representing permissions (e.g., `users.create`, `exam.publish`, `ai.interview`).
- Default Role mapping dictionaries (MAIN_ADMIN, SUB_ADMIN, TEACHER, STUDENT).
- Utility functions: `hasPermission`, `hasAnyPermission`, `hasAllPermissions`.

#### API Endpoints (if applicable)
N/A

#### Database Changes (if applicable)
N/A

#### Frontend Pages/Components (if applicable)
N/A

#### Acceptance Criteria
1. Permissions are distinct, clearly named strings.
2. `hasPermission` returns true only if the required permission exists in the provided list.
3. Mappings cover all defined default roles comprehensively.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F05.U001 | `hasPermission` True | Check existing permission | `['a','b']`, `a` | `true` | Critical |
| P01.F05.U002 | `hasPermission` False | Check missing permission | `['a','b']`, `c` | `false` | Critical |
| P01.F05.U003 | `hasAnyPermission` | Check multiple (1 match) | `['a','b']`, `['b','c']` | `true` | High |
| P01.F05.U004 | `hasAllPermissions` | Check multiple (all match) | `['a','b','c']`, `['a','b']` | `true` | High |
| P01.F05.U005 | `hasAllPermissions` Fails | Missing one requirement | `['a','b']`, `['a','c']` | `false` | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F05.I001 | Default Admin Perms | Verify MAIN_ADMIN has all | Role mappings | Check MAIN_ADMIN array | Contains all permissions | Critical |
| P01.F05.I002 | Default Student Perms | Verify STUDENT limits | Role mappings | Check STUDENT array | Lacks admin/creation perms | High |
| P01.F05.I003 | DB Seeder Integration | Ensure seed uses mappings | Seed script | Run seed | Perms match package constants | High |

##### E2E Tests (if applicable)
N/A

### Feature 1.6 — Authentication System

#### Description
Provides token-based authentication using custom JWTs, secure password hashing, and refresh token rotation.

#### Sub-Features
- `POST /api/v1/auth/login`: email/password -> short-lived JWT (15m) + refresh token (7d).
- `POST /api/v1/auth/refresh`: Accepts refresh token, issues new JWT + rotated refresh token.
- `POST /api/v1/auth/logout`: Revokes current refresh token.
- `POST /api/v1/auth/change-password`: Authenticated endpoint to change password.
- `POST /api/v1/auth/setup`: One-time setup endpoint to create the initial MAIN_ADMIN if zero users exist.
- bcrypt password hashing (12 rounds).
- Refresh tokens stored in PostgreSQL with device tracking context.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/setup` | Create initial admin | No |
| POST | `/api/auth/login` | Authenticate user | No |
| POST | `/api/auth/refresh` | Rotate tokens | No (Needs Refresh Token) |
| POST | `/api/auth/logout` | Revoke session | Yes |
| POST | `/api/auth/change-password` | Update password | Yes |

#### Database Changes (if applicable)
- `users.password_hash` column.
- `refresh_tokens` table rows mapping to users.

#### Frontend Pages/Components (if applicable)
N/A (API focused)

#### Acceptance Criteria
1. Setup endpoint works only if 0 users exist.
2. Passwords are never returned in responses and are securely hashed.
3. JWTs contain user ID, primary role, and permissions list.
4. Refresh tokens are successfully rotated and old ones invalidated.
5. Logout successfully deletes/invalidates the refresh token.
6. Suspended/Archived users cannot log in.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F06.U001 | Bcrypt Hash | Verify password hashing | `password123` | Valid bcrypt hash | Critical |
| P01.F06.U002 | Bcrypt Verify | Verify hash matching | Hash + `password123` | `true` | Critical |
| P01.F06.U003 | JWT Sign | Verify token generation | User payload | Signed JWT string | Critical |
| P01.F06.U004 | JWT Verify | Verify valid token decode | Signed JWT | Original User payload | Critical |
| P01.F06.U005 | JWT Expired | Verify expired token | Expired JWT | TokenExpiredError | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F06.I001 | Setup lock | Call setup twice | DB empty | Call setup -> Call setup again | 1st: 200, 2nd: 403 Forbidden | Critical |
| P01.F06.I002 | Login flow | Login with valid creds | Seeded user | POST `/login` | 200 OK + access & refresh tokens | Critical |
| P01.F06.I003 | Invalid login | Login with bad password | Seeded user | POST `/login` | 401 Unauthorized | High |
| P01.F06.I004 | Refresh token | Rotate tokens | Valid refresh token | POST `/refresh` | 200 OK + new tokens, old revoked | Critical |
| P01.F06.I005 | Suspended login | Login suspended user | Suspended user | POST `/login` | 403 Forbidden (Account suspended) | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F06.E001 | Complete Auth Cycle | Test end-to-end auth | Setup -> Login -> Refresh -> Logout | All steps succeed sequentially | Critical |
| P01.F06.E002 | Auth Middleware Protection | Access protected route | Try access without token | 401 Unauthorized | Critical |

### Feature 1.7 — User Management (CRUD)

#### Description
Endpoints and logic for administrators to manage users, enforcing hierarchical role boundaries and system protections.

#### Sub-Features
- `POST /api/v1/users`: Create a user with specified roles.
- `GET /api/v1/users`: Paginated list of users, filterable by role/status, searchable.
- `GET /api/v1/users/:id`: Retrieve detailed user info including role/permissions.
- `PATCH /api/v1/users/:id`: Update basic user details (creates `entity_versions` commit).
- `PATCH /api/v1/users/:id/status`: Change status (Active/Suspended/Archived).
- `POST /api/v1/users/:id/revert`: One-click rollback of profile to past version ([Spec 29](../specs/29-entity-versioning-rollback.md)).
- `POST /api/v1/users/:id/restore`: Undelete/unarchive a soft-deleted user account.
- Hierarchical boundaries: Sub-Admins cannot create or revert Main Admins.
- Last Main Admin protection: Prevents suspending, archiving, or changing the role of the final Main Admin.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/v1/users` | Create user | Yes (`users.create`) |
| GET | `/api/v1/users` | List users | Yes (`users.view`) |
| GET | `/api/v1/users/:id` | Get user | Yes (`users.view`) |
| PATCH | `/api/v1/users/:id` | Update user | Yes (`users.update`) |
| PATCH | `/api/v1/users/:id/status` | Update status | Yes (`users.manage_status`) |
| POST | `/api/v1/users/:id/revert` | Revert profile | Yes (`users.update`) |
| POST | `/api/v1/users/:id/restore` | Restore user | Yes (`users.archive`) |

#### Database Changes (if applicable)
- Interactions with `users`, `user_roles`, `entity_versions`.

#### Frontend Pages/Components (if applicable)
- User Profile History Modal, Visual Diff Viewer component.

#### Acceptance Criteria
1. Pagination parameters correctly slice database results.
2. Role hierarchy prevents privilege escalation.
3. Cannot alter the status of the final MAIN_ADMIN.
4. Searches handle partial name and email matching.
5. Profile edits create immutable `entity_versions` commits with diffs.
6. Reverting a profile restores the exact previous snapshot and logs a new `user.profile_reverted` audit entry.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F07.U001 | Role Hierarchy Check | Sub-Admin creates Admin | Action: SUB_ADMIN -> MAIN_ADMIN | `false` (Rejected) | Critical |
| P01.F07.U002 | Role Hierarchy Pass | Sub-Admin creates Teacher | Action: SUB_ADMIN -> TEACHER | `true` (Allowed) | High |
| P01.F07.U003 | Search Query Builder | Validate ILIKE construction | Term: "john" | OR array for name/email | Medium |
| P01.F07.U004 | Pagination Math | Validate offset/skip | Page 2, Limit 10 | Skip 10, Take 10 | Medium |
| P01.F07.U005 | Envelope Formatting | Format success response | Valid user object | `{ success: true, data: user }` | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F07.I001 | List Users | Fetch paginated list | 15 users in DB | GET `/api/users?page=1&limit=10` | 10 users, meta.total = 15 | High |
| P01.F07.I002 | Create User | Admin creates student | Admin token | POST `/api/users` | 201 Created, DB verifies | Critical |
| P01.F07.I003 | Last Admin Protection | Suspend last admin | 1 MAIN_ADMIN | PATCH `/api/users/1/status` (Suspend) | 400 Bad Request (Last Admin) | Critical |
| P01.F07.I004 | Privilege Escalation | Sub-Admin creates Admin | Sub-Admin token | POST `/api/users` (Admin role) | 403 Forbidden | Critical |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F07.E001 | User Lifecycle Flow | Create, update, suspend, archive | Auth as admin -> POST -> PATCH -> PATCH status | Data transitions correctly through API | High |

### Feature 1.8 — Role & Permission Management

#### Description
Allows administrators to manage custom roles and modify permissions on existing roles.

#### Sub-Features
- `GET /api/v1/roles`: List all roles.
- `GET /api/v1/roles/:id`: Detail of role with bound permissions.
- `POST /api/v1/roles`: Create a new custom role.
- `PATCH /api/v1/roles/:id/permissions`: Update the list of permissions for a role.
- System roles (MAIN_ADMIN, SUB_ADMIN, etc.) cannot be deleted, but permissions can be augmented safely.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/roles` | List roles | Yes (`roles.view`) |
| GET | `/api/roles/:id` | Get role | Yes (`roles.view`) |
| POST | `/api/roles` | Create role | Yes (`roles.create`) |
| PATCH | `/api/roles/:id/permissions`| Update permissions | Yes (`roles.update`) |

#### Database Changes (if applicable)
- Interactions with `roles`, `permissions`, `role_permissions`.

#### Frontend Pages/Components (if applicable)
N/A

#### Acceptance Criteria
1. Creating a role correctly binds valid permissions in `role_permissions`.
2. System default roles cannot be deleted.
3. Invalid permissions are rejected during role creation/update.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F08.U001 | System Role Check | Is MAIN_ADMIN protected | Role enum | `isSystem: true` | High |
| P01.F08.U002 | Valid Permission Check | Input validation | Valid perms array | Validates successfully | Medium |
| P01.F08.U003 | Invalid Permission Check | Input validation | `['fake.perm']` | Validation error | High |
| P01.F08.U004 | Role Formatter | Output DTO mapping | Role DB record | Formatted DTO | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F08.I001 | Create Custom Role | Create new role | Admin token | POST `/api/roles` with perms | 201 Created, Perms linked | High |
| P01.F08.I002 | Modify Role Perms | Change role permissions | Custom role exists | PATCH `/api/roles/:id/permissions` | DB reflects new perms array | High |
| P01.F08.I003 | Delete System Role | Attempt delete (if endpoint exists) | MAIN_ADMIN exists | DELETE `/api/roles/1` | 403 Forbidden | Critical |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F08.E001 | Custom Role Workflow | Create role, assign to user, check access | Create Role -> Create User with Role -> Login User | User has exact permissions defined | High |

### Feature 1.9 — Audit Logging

#### Description
Automatic tracking of sensitive actions within the system for compliance and troubleshooting.

#### Sub-Features
- Middleware-based automatic logging interceptor for state-changing operations (POST, PUT, PATCH, DELETE).
- Fields logged: `actorUserId`, `effectiveUserId`, `action`, `module`, `entityType`, `entityId`, `metadata`, `ipAddress`, `userAgent`, `mode`.
- Impersonation awareness: Correctly logs the real actor vs. the effective user.
- `GET /api/v1/audit-logs`: Query endpoint with filtering and date ranges.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/audit-logs` | List audit logs | Yes (`audit.view`) |

#### Database Changes (if applicable)
- Interactions with `audit_logs` table.

#### Frontend Pages/Components (if applicable)
N/A

#### Acceptance Criteria
1. All `POST`, `PATCH`, `PUT`, `DELETE` requests automatically generate an audit log unless explicitly excluded.
2. Metadata captures diffs or relevant request body subsets (excluding passwords).
3. If `mode=impersonation`, both `actorUserId` and `effectiveUserId` are populated accurately.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F09.U001 | Log Sanitizer | Strip passwords from log | Req body with `password` | Body without `password` | Critical |
| P01.F09.U002 | Module Extractor | Determine module from URL | URL: `/api/users/123` | Module: `users` | Medium |
| P01.F09.U003 | Action Extractor | Determine action from method| Method: `POST` | Action: `CREATE` | Medium |
| P01.F09.U004 | Impersonation Flag | Parse AuthContext correctly | Context with `actor_id` | `actorUserId` populated | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F09.I001 | Auto-logging Middleware | Execute standard request | Audit middleware on | PATCH `/api/users/1` | Audit log written to DB | Critical |
| P01.F09.I002 | Log Retrieval | Filter logs by module | Logs in DB | GET `/api/audit-logs?module=users` | Returns matching logs | High |
| P01.F09.I003 | IP/UserAgent capture | Check request headers log | Request with headers | Execute request | IP & UA correctly stored in DB| Medium |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F09.E001 | Full Audit Trace | Verify action is traced | Login -> Create User -> View Logs | Audit log shows Admin created User | High |

### Feature 1.10 — API Middleware Stack

#### Description
Global and route-level middlewares ensuring security, standardized logging, rate limiting, and structured error handling.

#### Sub-Features
- `helmet()` for security headers.
- CORS configured for frontend domains.
- Rate limiting to prevent brute force (general limit + strict auth limit).
- Pino-based request logging with Request ID generation.
- Global Error Handler catching all unhandled exceptions and formatting as Envelope.
- `authenticate` JWT middleware.
- `authorize(permissions[])` RBAC middleware.
- `validate(schema)` Zod middleware.

#### API Endpoints (if applicable)
N/A

#### Database Changes (if applicable)
N/A

#### Frontend Pages/Components (if applicable)
N/A

#### Acceptance Criteria
1. Unhandled errors do not leak stack traces in production (500 Internal Error generic message).
2. Requests failing validation return 400 Bad Request with Zod formatting.
3. Requests missing auth return 401. Requests missing permissions return 403.
4. Security headers are present on all responses.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F10.U001 | Error Handler (Dev) | Check dev error format | Error object | Envelope + Stack trace | Low |
| P01.F10.U002 | Error Handler (Prod) | Check prod error format | Error object | Envelope WITHOUT Stack | Critical |
| P01.F10.U003 | Authorize Middleware | Pass sufficient perms | Requires `a`, User has `a` | `next()` called | Critical |
| P01.F10.U004 | Authorize Middleware | Fail insufficient perms | Requires `a`, User has `b` | 403 Forbidden | Critical |
| P01.F10.U005 | Validate Middleware | Pass valid body | Valid body | `next()` called | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F10.I001 | Rate Limiting | Trigger rate limit | Configured route | Send 100 requests quickly | 429 Too Many Requests | High |
| P01.F10.I002 | CORS Blocking | Invalid origin | Route active | Request from `evil.com` | CORS Error / Blocked | High |
| P01.F10.I003 | Pino Request Logging | Check stdout for logs | Route active | Send request | JSON log with request ID | Medium |

##### E2E Tests (if applicable)
N/A

### Feature 1.11 — Frontend Foundation

#### Description
Next.js 15 App Router initialization with a premium UI framework, responsive layouts, and core administrative screens.

#### Sub-Features
- Tailwind CSS setup with custom properties, Inter font, dark mode, glassmorphism utilities.
- `AuthProvider`: Context managing JWT, decoding claims, auto-refresh intervals.
- `RoleGuard`: Wrapper component to show/hide UI elements based on permissions.
- Public Pages: `/login`.
- Protected Admin Layout: Sidebar, header, breadcrumbs.
- Admin Pages: `/admin/dashboard`, `/admin/users`, `/admin/users/new`, `/admin/users/[id]`, `/admin/roles`, `/admin/audit-log`.
- Reusable UI Components: DataTable, StatusBadge, Modal, Dialog, Toast.

#### API Endpoints (if applicable)
N/A (Consumes API)

#### Database Changes (if applicable)
N/A

#### Frontend Pages/Components (if applicable)
- Layouts: `AdminLayout`, `AuthLayout`
- Pages: Login, Dashboard, User List, User Detail, Role Management, Audit Logs
- Components: `Sidebar`, `Navbar`, `DataTable`, `RoleGuard`, `Toast`

#### Acceptance Criteria
1. Next.js application runs and hot-reloads locally.
2. Login page successfully interfaces with API, stores token securely, and redirects to dashboard.
3. Sidebar navigation correctly hides links the user lacks permissions for.
4. User Management page displays the DataTable, fetches paginated data from API, and supports basic actions.
5. UI reflects a premium, polished design language with smooth transitions.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F11.U001 | RoleGuard Render | User has perm | Perm: `users.view` | Children rendered | High |
| P01.F11.U002 | RoleGuard Hide | User lacks perm | Perm: `sys.admin` | Null/Fallback rendered | High |
| P01.F11.U003 | AuthProvider State | Token Decode | Valid JWT | User context populated | High |
| P01.F11.U004 | StatusBadge Styling | Check active status UI | Status: `ACTIVE` | Green classes applied | Low |
| P01.F11.U005 | DataTable Pagination | Check page calculation | 50 items, 10 per page | 5 pages rendered | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F11.I001 | Login Form Submission | Test form -> provider hook | Mocked API | Submit valid creds | AuthContext updated, Redirect | Critical |
| P01.F11.I002 | Auto-Refresh Logic | Test interceptor | Expired token | Make API call | Refresh called, request retried | Critical |
| P01.F11.I003 | User List Fetching | Verify DataTable | Mocked Users API | Render `/admin/users` | Table populates 10 rows | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F11.E001 | Complete Login Flow | Browser E2E Login | Visit `/login` -> enter details -> submit | Land on `/admin/dashboard` | Critical |
| P01.F11.E002 | Create User UI Flow | Browser E2E User Creation | Navigate to `/admin/users/new` -> fill form -> submit | Redirect to user list, see toast | High |
| P01.F11.E003 | Route Protection | Anonymous access | Visit `/admin/users` anonymously | Redirected to `/login` | Critical |

### Feature 1.12 — 3-Theme Switcher & Multilingual i18n Engine

#### Description
Establishes the foundational 3-Theme Switcher (`LIGHT`, `GRAY` slate low-contrast mode, `DARK` obsidian mode) and Database-Driven Multilingual Engine across all tabs and screens, supporting 22 official Schedule 8 languages of India + English (23 baseline languages) with Redis-cached translation dictionary lookup and fallback.

#### Sub-Features
- Database translation tables (`languages`, `translation_keys`, `translations`, `user_preferences`).
- Redis translation dictionary caching (`i18n:dict:<langCode>`).
- 3 Theme CSS Token sets (`LIGHT`, `GRAY` slate neutral, `DARK`).
- Top-bar Theme & Language Switcher components across all portal views.
- User preference persistence API and local storage sync.
- English fallback strategy for missing localized translation keys.

#### API Endpoints (if applicable)
- `GET /api/v1/i18n/languages`
- `GET /api/v1/i18n/translations/:langCode`
- `POST /api/v1/i18n/languages`
- `POST /api/v1/i18n/translations`
- `GET /api/v1/users/me/preferences`
- `PATCH /api/v1/users/me/preferences`

#### Database Changes (if applicable)
- Tables: `languages`, `translation_keys`, `translations`, `user_preferences`.

#### Frontend Pages/Components (if applicable)
- Components: `ThemeSwitcher`, `LanguageSelector`, `I18nProvider`.

#### Acceptance Criteria
1. UI supports seamless instant toggling between LIGHT, GRAY, and DARK modes.
2. GRAY mode applies low-contrast slate warm neutral styling to reduce eye strain.
3. Language switcher allows switching between 23 baseline languages with instant UI string updates.
4. User theme and language preferences persist across reloads and sync to `user_preferences` upon login.
5. Missing translation keys gracefully fall back to default English text.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F12.U001 | Theme Switcher Token | Apply GRAY theme | Theme: `GRAY` | `data-theme="gray"` set on root | High |
| P01.F12.U002 | I18n Fallback Logic | Missing key lookup | Key: `unknown.key` | Returns English default text | High |
| P01.F12.U003 | Preference Serialization | Preference DTO | Mode: `DARK`, Lang: `hi` | Validated JSON payload | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P01.F12.I001 | Language Dict API | Fetch Hindi dictionary | DB seeded with Hindi | GET `/api/v1/i18n/translations/hi` | 200 OK with key-value map | High |
| P01.F12.I002 | Preferences Patch | Update user theme | Auth token active | PATCH `/api/v1/users/me/preferences` | 200 OK, preference saved in DB | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P01.F12.E001 | Theme & Language Toggle | Browser E2E Theme/Lang Switch | Click theme toggle -> select GRAY -> select Hindi | Theme changes to slate, UI text renders Hindi | High |

## Modularity Checklist
- [x] All business logic in service layer (not controllers)
- [x] No cross-module direct database access
- [x] Shared types used from `@repo/types`
- [x] Validation schemas in `@repo/validation`
- [x] Module can be extracted to microservice without code changes in other modules
- [x] All dependencies injected, not imported directly
- [x] Feature flags / config for optional features

## Upgrade Path
Completing Phase 1 provides the secure, typed, and scalable foundation required for Phase 2 (Institution & Examination Core). The authentication and RBAC context established here will be consumed by all future modules to enforce multi-tenancy constraints and domain-specific permissions (e.g., Exam Creation, Test Taking). The shared DB, types, and validation packages allow subsequent features to be implemented strictly within their domain bounds without reinventing cross-cutting concerns.

## Definition of Done
- All code committed and passing CI checks (`turbo build lint test`).
- Database migrations successfully apply to a clean environment.
- Initial Main Admin can be created via setup endpoint.
- Auth flow (login, refresh, logout) is fully operational in the frontend.
- Admin dashboard is accessible and capable of creating Sub-Admins, Teachers, and Students.
- Audit logs correctly record user management actions.
- Minimum 80% test coverage across core utility and API packages.

## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 07: Authentication System](../specs/07-authentication-system.md)
- [Spec 08: RBAC & Permission System](../specs/08-rbac-permission-system.md)
- [Spec 27: Audit Logging](../specs/27-audit-logging.md)
- [Spec 31: 3-Theme Switcher & Multilingual i18n Engine](../specs/31-i18n-localization-theme-engine.md)
- [Spec 01: Main Admin Profile](../specs/01-main-admin-profile.md)
- [Spec 02: Sub-Admin Profile](../specs/02-sub-admin-profile.md)

### Key Team Role Guidelines
- [Software Engineer](../roles/14-software-engineer.md) — Features 1.1, 1.2, 1.3
- [Backend Engineer](../roles/16-backend-engineer.md) — Features 1.6, 1.7, 1.8, 1.9, 1.10, 1.12
- [Frontend Engineer](../roles/15-frontend-engineer.md) — Feature 1.11, 1.12
- [API Developer](../roles/18-api-developer.md) — Features 1.6, 1.7, 1.8, 1.10
- [QA Engineer](../roles/33-qa-engineer.md) — 150+ Phase 1 Test Cases
- [DevOps Engineer](../roles/39-devops-engineer.md) — Feature 1.1 Monorepo, Docker & CI

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [API Reference Catalog](../guides/02-api-reference.md)
- [Coding Standards & Conventions](../guides/03-coding-standards.md)
- [Git Workflow & Branching](../guides/04-git-workflow.md)
- [Environment Setup Guide](../guides/05-environment-setup.md)

