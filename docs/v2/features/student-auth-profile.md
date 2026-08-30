# Feature: Student Self-Registration & Profile

## 1. Purpose
The Student Self-Registration & Profile system provides a frictionless student onboarding experience, public self-registration with minimal required data collection, unified single-identity authentication, secure profile management (personal info, avatar upload, contact details), password changes with mandatory re-authentication verification, and granular communication preference controls.

## 2. Current State
Verified against the codebase:
- `auth.routes.ts` and `auth.ts` handle `/api/v1/auth/login` and refresh tokens for existing users.
- Users are currently provisioned only by Admins via `POST /api/v1/users` (`UsersPage.tsx`) or database seeds.
- **The Concrete Gap**: No public student self-registration endpoint (`/register`) or public registration UI exists. There is no dedicated Student Profile editing page for students to update their name, avatar, contact number, or notification preferences; `UsersPage.tsx` is exclusively an administrative user roster.

## 3. Problem / Requirement
In a commercial education platform, prospective students must be able to sign up independently without administrative pre-creation:
- Minimal Data Onboarding: Registration should require only essential fields (Full Name, Email Address, Password, Terms Acceptance) to minimize signup friction and respect data minimization principles.
- Single Unified Identity Model: Student registrations must use the existing `users` and `user_roles` database tables—no parallel student auth tables or duplicate identities.
- Student Profile Workbench: Students need a dedicated profile page to manage their personal details, phone number, bio, avatar, and communication preferences.
- Security-Critical Password Updates: Changing password must strictly require verifying the current password to prevent session-hijacking account takeovers.

## 4. Proposed Solution
1. Add public endpoint `POST /api/v1/auth/student-register` that validates inputs, hashes password with `bcrypt`, creates a `users` row with `status: 'ACTIVE'`, assigns `role: 'STUDENT'`, and issues JWT auth tokens with `FREE` plan tier.
2. Add Student Profile endpoints `GET /api/v1/students/me` and `PATCH /api/v1/students/me`.
3. Add secure password change endpoint `POST /api/v1/auth/change-password` requiring `{ currentPassword, newPassword }`.
4. Build `StudentRegisterModal.tsx` and a dedicated `StudentProfilePage.tsx` accessible from the top navigation bar.

## 5. User Experience
- **Registration**: From `LoginPage.tsx`, the student clicks "Create a Student Account", fills in Name, Email, Password, checks "I agree to Terms & Conditions", and is immediately logged in to their dashboard.
- **Profile Management**: Student clicks their avatar in the top-right header, opening their Profile page. They can update their display name, phone number, upload an avatar picture, toggle email/in-app notification categories, or change their password.

## 6. Admin Experience
- **User Management Integration**: Registered students appear automatically in `UsersPage.tsx` tagged as `STUDENT` with registration timestamps, active enrollments, and status controls (suspend/archive/reset).

## 7. Technical Architecture
- **Single Identity Architecture**: Reuses existing `users`, `user_roles`, and `roles` tables.
- **Role Assignment**: Automatically assigns role ID corresponding to `STUDENT` in `user_roles`.
- **Entitlement Initialization**: Auto-provisions initial `FREE` tier baseline entitlements in `@repo/entitlement-engine`.
- **Security Check**: Section 7 IDOR ownership check enforced on all `/api/v1/students/me` operations.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed additions in `users` model:
- `users`: Add `avatarUrl`, `phone`, `bio`, `termsAcceptedAt`, `communicationPreferences` (JSON).

## 9. API
- `POST /api/v1/auth/student-register` (Auth: Public) — Self-registration with validation.
- `GET /api/v1/students/me` (Auth: Student / `analytics.read_own`) — Fetch current user profile.
- `PATCH /api/v1/students/me` (Auth: Student / `analytics.read_own`) — Update profile details.
- `POST /api/v1/auth/change-password` (Auth: Authenticated) — Change password requiring current password.

## 10. Frontend
- **Components**:
  - `StudentRegisterModal.tsx`: Clean registration form with real-time password strength meter.
  - `StudentProfilePage.tsx`: Dedicated student profile dashboard with personal info, avatar uploader, and security tab.
  - `AvatarDropdown.tsx`: Top navbar profile pill showing user avatar, name, and quick navigation.

## 11. AI / External Services
- None required.

## 12. Permissions / Entitlements
- **Self-Registration**: Public.
- **Profile Updates**: Gated on authenticated user ID matching token `sub` (Section 7 IDOR check).
- **Admin Management**: Gated on `users.read`, `users.update`.

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If `featureKey: 'user_registration'` is toggled off, registration displays "Registration temporarily paused" while existing logins operate normally.

## 14. Import / Export
- Student profile data exportable per GDPR / privacy compliance in `json-import-export.md`.

## 15. Edge Cases
- Email already registered: Returns clean HTTP 409 `EMAIL_ALREADY_EXISTS` without leaking sensitive user details.
- Weak password: Zod validation rejects passwords < 8 characters or missing mixed case/numbers.
- Wrong current password during password change: Rejects with HTTP 401 `INVALID_CURRENT_PASSWORD`.

## 16. Test Cases
- **Unit (AUTH-U001)**: Registration DTO validates email syntax and password complexity requirements.
- **API (AUTH-A001)**: `POST /api/v1/auth/student-register` creates user and returns valid JWT token.
- **API (AUTH-A002)**: Duplicate email registration returns HTTP 409 `EMAIL_ALREADY_EXISTS`.
- **API (AUTH-A003)**: `POST /api/v1/auth/change-password` fails when `currentPassword` is incorrect.
- **UI (AUTH-UI001)**: Registration modal switches to login view with one click.
- **Security (AUTH-S001)**: User A cannot edit User B's profile via `PATCH /api/v1/students/me`.

## 17. Acceptance Criteria
- [ ] Friction-free student self-registration endpoint with minimal fields.
- [ ] Single unified identity model in `users` table.
- [ ] Dedicated student profile page with personal info and preferences.
- [ ] Secure password change endpoint requiring current password validation.
- [ ] Complete unit, API, and security test coverage.

## 18. Dependencies
- `apps/api/src/routes/auth.routes.ts`
- `apps/api/src/routes/user.routes.ts`
- Entitlement Engine (`@repo/entitlement-engine`)

## 19. Future Improvements
- Social OAuth Login (Google, GitHub, Apple) using standard OpenID Connect.
- Multi-factor authentication (TOTP authenticator app support).
