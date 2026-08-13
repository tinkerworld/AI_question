# Authentication System — Functional Specification

## 1. Overview
The Authentication System provides secure identity verification and session management for all platform users. It utilizes JSON Web Tokens (JWT) for stateless authentication, with short-lived access tokens and longer-lived, database-backed refresh tokens to balance security and usability. It supports advanced features like session context (preview, impersonation) and comprehensive security measures including rate limiting, account lockouts, and strict password policies.

## 2. User Stories
- As a new user, I want to securely log in with my email and password so that I can access my personalized dashboard.
- As an administrator, I want to enforce strict password policies and account lockout rules so that the system remains secure against brute-force attacks.
- As a user, I want my session to remain active without constantly logging in, so that my workflow is uninterrupted.
- As a user, I want to securely change my password so that I can maintain the security of my account.
- As an administrator, I want to impersonate a student so that I can troubleshoot their specific issues exactly as they see them.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Login / Logout | ✅ | ✅ | ✅ | ✅ | ⚙️ |
| Change Own Password | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reset Others' Passwords | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure Password Policy | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Auth Logs | ✅ | ✅ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Initial Setup (Main Admin)
**What it does**: Allows the creation of the first Main Admin account if no admins exist.
**How it works**: System checks if any user with MAIN_ADMIN role exists. If not, a setup endpoint accepts an email and password to create the initial admin account.
**Business Rules**: Only functional when the user table has zero MAIN_ADMIN records.
**Edge Cases**: Simultaneous setup requests are prevented by database constraints on roles/emails.

### 4.2 User Login
**What it does**: Authenticates users using email and password.
**How it works**: User submits email and password. System hashes the password and compares it. If valid, generates an access token (15 mins) and a refresh token (7 days). Records device info with the refresh token.
**Business Rules**: Case-insensitive email matching. Must verify account status (active, locked, archived).
**Edge Cases**: Login while already logged in on another device (allowed but tracked).

### 4.3 Token Management
**What it does**: Handles generation, rotation, and revocation of JWTs.
**How it works**: Access token in `Authorization: Bearer <token>` header. Refresh token stored securely (e.g., HttpOnly cookie or secure storage) and in the DB. When access token expires, client uses refresh token to get a new pair (Refresh Token Rotation).
**Business Rules**: Access token expires in 15 mins. Refresh token expires in 7 days. Reusing a rotated refresh token invalidates all tokens in that token family (compromise detection). JWT payload includes user_id, email, roles, permissions, mode, and actorId.
**Edge Cases**: Clock skew between servers causing premature expiration.

### 4.4 Password Management
**What it does**: Handles password hashing, changing, and policies.
**How it works**: Uses bcrypt (12 rounds) for hashing. Password changes require the current password.
**Business Rules**: Password policy (e.g., min length, complexity) enforced. N failed attempts lock the account for a specific duration.
**Edge Cases**: Admin resets a user's password; forces user to change password on next login.

### 4.5 Session Context Modes
**What it does**: Tracks the operational mode of the session.
**How it works**: JWT payload includes `mode` (DIRECT, PREVIEW, IMPERSONATE) and `actorId` (who is actually performing the action).
**Business Rules**: Impersonation mode is highly restricted. Preview mode has limited write access.
**Edge Cases**: Token renewal during an impersonated session requires keeping context alive.

### 4.6 Security Features
**What it does**: Protects the auth system from vulnerabilities and abuse.
**How it works**: Includes rate limiting on auth endpoints, CORS configuration, Helmet security headers, secure cookie options, and JWT blacklisting on logout.
**Business Rules**: Strict security configurations must be applied globally to authentication endpoints.

## 5. Data Model
```text
Table: users
├── id (PK, CUID)
├── email (VARCHAR, Unique) — User's email address
├── password_hash (VARCHAR) — Bcrypt hash
├── failed_login_attempts (INT) — Counter for lockouts
├── locked_until (TIMESTAMP) — Lockout expiration
├── password_changed_at (TIMESTAMP) — For forced resets
└── timestamps

Table: refresh_tokens
├── id (PK, CUID)
├── user_id (FK, CUID) — References users
├── token_hash (VARCHAR) — Hashed refresh token
├── device_info (VARCHAR) — Browser/OS fingerprint
├── ip_address (VARCHAR) — IP at issue time
├── expires_at (TIMESTAMP) — Expiration time
├── revoked_at (TIMESTAMP) — Manual or automatic revocation
├── replaced_by_token (VARCHAR) — For rotation chain
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/v1/auth/setup` | Create initial admin | email, password | Success msg | None | None |
| POST | `/api/v1/auth/login` | Authenticate user | email, password | access_token, user_info | None | None |
| POST | `/api/v1/auth/refresh` | Refresh tokens | refresh_token | access_token, new_refresh_token | None | None |
| POST | `/api/v1/auth/logout` | Revoke tokens | refresh_token | Success msg | Req | None |
| POST | `/api/v1/auth/password/change` | Change password | current_pw, new_pw | Success msg | Req | None |
| GET | `/api/v1/auth/sessions` | List active sessions| None | List of sessions | Req | None |
| DELETE| `/api/v1/auth/sessions/:id` | Revoke specific session | None | Success msg | Req | None |

## 7. UI Screens & Components
### Screen: Login Page
**URL**: `/login`
**Layout**: Centered login card with platform logo, email input, password input (with eye toggle), "Forgot Password" link, and Login button.
**Interactive Elements**: Form fields with inline validation.
**States**: Loading spinner on button, inline error messages (e.g., "Invalid credentials").

### Screen: Change Password Modal
**URL**: Accessible from User Profile
**Layout**: Simple form overlay.
**Interactive Elements**: Current password, new password, confirm new password. Password strength meter.
**States**: Password policy requirements list turning green as conditions are met.

## 8. Business Rules
1. Passwords must never be stored in plain text.
2. An account is locked after N consecutive failed login attempts.
3. Access tokens must have a lifespan of exactly 15 minutes.
4. Refresh tokens must have a lifespan of exactly 7 days and must be rotated on every use.
5. Detecting reuse of a rotated refresh token must immediately revoke all tokens for that user.
6. Main Admin setup can only be executed once.
7. Impersonation sessions must log both the actor (admin) and the target (user).

## 9. Validation Rules
- Email: Standard email format regex.
- Password: Must meet configured policy requirements.
- Current Password: Must match hash in DB to allow change.

## 10. Error Handling
- Invalid Credentials: Generic message to prevent enumeration.
- Account Locked: Specific message indicating lockout duration.
- Token Expired: 401 Unauthorized, prompting client to refresh.
- Invalid Token: 401 Unauthorized.
- Setup Already Done: 403 Forbidden.

## 11. Integration Points
- RBAC System: Embeds role and permissions securely in JWT.
- Audit Log System: Logs logins, logouts, password changes, and impersonations.

## 12. Configuration Options
- Password minimum length and complexity rules.
- Lockout threshold (number of attempts) and duration.

## 13. Future Enhancements
- Multi-Factor Authentication (MFA) via TOTP or SMS.
- Social Login (Google, Microsoft).
- Passwordless login via magic links.
