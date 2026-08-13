# Phase 10 — Preview System
## Overview
This phase introduces a comprehensive Preview and Impersonation System, allowing staff to preview content and the platform experience exactly as a student would see it, without needing real credentials. It supports simulated billing plans, draft content visibility, and configurable usage limits.

## Prerequisites
- Core Platform & Auth (Phases 1-4)
- Entitlement System
- Draft/Publish Workflow (Content Versioning)

## Features

### Feature 10.1 — Preview Student Profile

#### Description
Creates a system-controlled student persona for preview purposes. This profile doesn't require a real login, password, or payment, but contains all necessary fields to simulate a real user's context (billing plan, course access, content version).

#### Sub-Features
- Transient or pseudo-persistent preview profiles.
- Configurable attributes (billing_plan, course_access, content_version, usage_mode).
- Bypass actual payment gateway requirements.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/preview/profiles` | Create a new preview profile | Yes (Staff/Admin) |
| GET | `/api/preview/profiles/:id` | Get preview profile details | Yes (Staff/Admin) |
| PATCH | `/api/preview/profiles/:id` | Update preview profile configuration | Yes (Staff/Admin) |

#### Database Changes
- `preview_profiles` table (id, name, billing_plan, content_version, usage_mode, created_by)
- `preview_profile_courses` table (profile_id, course_id)

#### Frontend Pages/Components
- N/A (Backend logic for profile management)

#### Acceptance Criteria
1. Staff can create preview profiles with specific simulated plans (Free/Premium/Premium+).
2. Profiles can access Draft/Review/Published content based on configuration.
3. No real auth credentials or payment info are required.
4. Profiles can be updated dynamically.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P10.F01.U001 | Create profile | Test profile creation logic | Profile config object | Profile created with UUID | High |
| P10.F01.U002 | Plan simulation | Test plan assignment | 'Premium+' string | Profile reflects Premium+ entitlements | High |
| P10.F01.U003 | Update profile | Test patching profile | New course access list | Profile updated with new access | High |
| P10.F01.U004 | Payment bypass logic | Ensure no payment validation occurs | Profile creation request | Success without payment error | High |
| P10.F01.U005 | Default values | Test creation with missing optional fields | Empty config | Profile created with default (Free, Published) | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P10.F01.I001 | API CRUD operations | Test POST, GET, PATCH flow | Authenticated Admin | POST -> GET -> PATCH -> GET | Profile created and updated correctly | High |
| P10.F01.I002 | Unauthorized access | Test staff-only restriction | Authenticated Student | POST `/api/preview/profiles` | 403 Forbidden | High |
| P10.F01.I003 | Invalid plan | Test validation | Admin auth | POST with plan='SuperUltra' | 400 Bad Request | Medium |

### Feature 10.2 — Preview Configuration UI

#### Description
A staff-facing UI to configure the preview environment before launching it. Allows selection of billing levels, course access, content version visibility, usage modes, and feature flags.

#### Sub-Features
- Billing Level dropdown (Free, Premium, Premium+).
- Course Access multi-select.
- Content Version toggle (Draft, Review, Published).
- Usage Mode selection (Normal Limits vs. Unlimited QA).
- Feature flag overrides.

#### API Endpoints
- (Uses endpoints from 10.1)

#### Database Changes
- N/A

#### Frontend Pages/Components
- `PreviewConfigurationModal`
- Staff Dashboard Preview Section

#### Acceptance Criteria
1. UI presents all configurable options clearly.
2. Staff can quickly apply preset configurations (e.g., "Free Student", "Premium with Drafts").
3. Selections are sent correctly to the backend API.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P10.F02.U001 | Form rendering | Verify all fields render | Mount component | Dropdowns and toggles present | High |
| P10.F02.U002 | Preset application | Test preset buttons | Click 'Premium Preset' | Fields populate with Premium config | High |
| P10.F02.U003 | Form submission | Test payload structure | Submit form | Correct JSON payload emitted | High |
| P10.F02.U004 | Course selection | Test multi-select logic | Select 2 courses | Both courses in selected state | Medium |
| P10.F02.U005 | Validation | Test required fields | Submit empty form (if applicable) | Validation errors shown | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P10.F02.I001 | Config to API | Test frontend calling backend | Render UI | Fill config and submit | API called, success notification | High |
| P10.F02.I002 | Preset API flow | Test preset submission | Render UI | Click preset, submit | API called with preset payload | High |
| P10.F02.I003 | Error handling | Test UI on API error | Mock API 500 error | Submit form | Error toast displayed | Medium |

### Feature 10.3 — Impersonation System

#### Description
The core mechanism that switches the user's session context into the preview mode or impersonates a real student securely.

#### Sub-Features
- Support for `PREVIEW_STUDENT` and `IMPERSONATE_REAL_STUDENT` modes.
- Secure session token containing `actor_user_id`, `effective_user_id`, `mode`, `started_at`, `expires_at`, and context (plan, flags).
- Session expiry enforcement.
- Seamless context switching without re-login.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/preview/start` | Start impersonation/preview session | Yes (Staff/Admin) |
| POST | `/api/preview/end` | End session and revert to actor | Yes (Valid Session) |

#### Database Changes
- `impersonation_sessions` table (session_id, actor_id, effective_id, mode, context_json, expires_at)

#### Frontend Pages/Components
- Global session context provider updates.

#### Acceptance Criteria
1. Staff can switch to preview context seamlessly.
2. The system correctly identifies the `effective_user_id` for authorization but logs the `actor_user_id`.
3. Session expires automatically after a set duration.
4. User can manually end the session to return to staff view.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P10.F03.U001 | Token generation | Generate impersonation token | Actor ID, Preview Config | Token with embedded context | High |
| P10.F03.U002 | Context resolution | Middleware resolves effective user | Request with Impersonation Token | req.user = effective_user, req.actor = actor | High |
| P10.F03.U003 | Expiry validation | Reject expired token | Expired Token | 401 Unauthorized | High |
| P10.F03.U004 | End session | Revert token logic | End session request | Returns original actor token | High |
| P10.F03.U005 | Mode validation | Ensure valid modes only | Request with invalid mode | Error thrown | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P10.F03.I001 | Full session lifecycle | Start, use, and end session | Admin user | POST start -> GET profile -> POST end | Switch context, read as student, revert to admin | High |
| P10.F03.I002 | Auto-expiry | Test token expiration | Active session | Fast-forward time, make request | 401 Unauthorized | High |
| P10.F03.I003 | Real student impersonation | Test impersonating existing user | Admin and Student exist | POST start with student ID | Context switched to real student | High |

### Feature 10.4 — Entitlement Integration

#### Description
Ensures that the preview mode bypasses payment but strictly adheres to the platform's authorization and entitlement rules based on the simulated plan.

#### Sub-Features
- Entitlement checks read from the session context (simulated plan) rather than the database.
- Free previews are blocked from premium features.
- Premium previews have access to premium features.

#### API Endpoints
- N/A (Middleware/Service layer changes)

#### Database Changes
- N/A

#### Frontend Pages/Components
- N/A

#### Acceptance Criteria
1. A Free preview session gets 403 Forbidden on Premium API endpoints.
2. A Premium preview session successfully accesses Premium API endpoints.
3. No payment verification is triggered for preview sessions.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P10.F04.U001 | Free entitlement check | Check premium feature access | Free Preview Session | Access Denied (false) | High |
| P10.F04.U002 | Premium entitlement check | Check premium feature access | Premium Preview Session | Access Granted (true) | High |
| P10.F04.U003 | Payment bypass | Check payment guard | Preview Session | Bypass granted | High |
| P10.F04.U004 | Course access check | Access unassigned course | Preview Session without Course A | Access Denied (false) | High |
| P10.F04.U005 | Usage limit check | Test normal limits in preview | Preview Session (Normal Mode), max attempts | Limit reached error | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P10.F04.I001 | API enforcement - Free | Access premium endpoint | Free Preview Session | GET `/api/premium-feature` | 403 Forbidden | High |
| P10.F04.I002 | API enforcement - Premium | Access premium endpoint | Premium Preview Session | GET `/api/premium-feature` | 200 OK | High |
| P10.F04.I003 | Draft content access | Access draft exam | Preview Session (Draft Mode) | GET `/api/exams/draft-id` | 200 OK | High |

### Feature 10.5 — Preview Audit Trail

#### Description
Modifies the audit logging system to accurately record actions performed during impersonation or preview, tracking both the effective user and the original actor.

#### Sub-Features
- Include `actor_id` and `effective_id` in all audit logs.
- Include `mode` (e.g., PREVIEW_STUDENT) in audit logs.
- Distinctly mark preview-generated data (e.g., mock exam submissions) to exclude them from real analytics.

#### API Endpoints
- N/A (Background logging updates)

#### Database Changes
- Update `audit_logs` table to include `actor_id`, `mode`.
- Add `is_preview` flag to operational tables (e.g., `exam_attempts`).

#### Frontend Pages/Components
- Audit Log viewer for Staff.

#### Acceptance Criteria
1. Every action in preview mode logs the original staff member as the actor.
2. Actions are tagged with the impersonation mode.
3. Preview data does not pollute global analytics or real student metrics.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P10.F05.U001 | Log generation | Test audit log formatting | Action in preview session | Log entry with actor and effective IDs | High |
| P10.F05.U002 | Flagging operational data | Test `is_preview` flag on creation | Create attempt in preview | Attempt saved with `is_preview=true` | High |
| P10.F05.U003 | Analytics exclusion | Test analytics aggregation query | Mix of real and preview data | Query excludes preview data | High |
| P10.F05.U004 | Missing actor fallback | Ensure normal actions log correctly | Normal user session | Log entry with actor=null or actor=user | High |
| P10.F05.U005 | Log retrieval formatting | Test audit log DTO | DB audit record | Formatted for frontend with actor info | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P10.F05.I001 | E2E Audit trail | Perform action and check log | Preview Session | Submit mock exam, check DB logs | Audit log shows Admin X acting as Preview Student | High |
| P10.F05.I002 | Analytics pollution check | Check global stats | Preview Session | Complete 10 exams | Global stats remain unchanged | High |
| P10.F05.I003 | Audit UI display | Test staff viewing logs | Populated audit logs | View Audit UI | UI clearly shows "Admin impersonated Student" | Medium |

### Feature 10.6 — Preview Workflow

#### Description
Integrates the preview system seamlessly into the content creation lifecycle (Draft -> Preview -> Review -> Publish).

#### Sub-Features
- One-click "Preview as Student" from content authoring tools.
- Draft content automatically visible in the initiated preview session.

#### API Endpoints
- N/A (Orchestration of existing APIs)

#### Database Changes
- N/A

#### Frontend Pages/Components
- "Preview" button in Content Editor.

#### Acceptance Criteria
1. Staff can click "Preview" from an unpublished exam/course.
2. They are taken directly to the student view of that draft content.
3. Ending the preview returns them to the authoring tool.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P10.F06.U001 | Quick start config | Test default config generation | Content ID | Config auto-set to (Draft, Premium+) | High |
| P10.F06.U002 | Return URL handling | Test return routing | Start preview from editor | Return URL saved in session/localstorage | High |
| P10.F06.U003 | Draft visibility flag | Ensure config includes drafts | Quick start | `content_version=Draft` | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P10.F06.E001 | Content lifecycle preview | Full creation to preview flow | 1. Create Draft Exam 2. Click Preview 3. Take Exam 4. Exit | Successfully taken as student, returned to editor | High |
| P10.F06.E002 | Plan switching mid-preview | Test changing plans | 1. Preview as Premium 2. Switch to Free 3. Access premium feature | Blocked when switched to Free | High |

### Feature 10.7 — Preview Frontend

#### Description
The UI wrapper and visual indicators that inform the user they are currently in a preview or impersonation session.

#### Sub-Features
- Persistent, highly visible banner ("PREVIEW MODE - ACTING AS: [Name]").
- "Exit Preview" button in the banner.
- Config panel accessible from the banner to change settings on the fly.
- Rendering the exact student frontend application.

#### API Endpoints
- N/A (Frontend components)

#### Database Changes
- N/A

#### Frontend Pages/Components
- `PreviewBanner` (Global component)
- `QuickConfigFlyout`

#### Acceptance Criteria
1. The preview banner is always visible on screen during a session.
2. The banner clearly states the current mode and simulated plan.
3. Clicking "Exit Preview" immediately restores the staff session.
4. The underlying UI is identical to the actual student experience.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P10.F07.U001 | Banner rendering | Render banner when active | Session state = Preview | Banner visible | High |
| P10.F07.U002 | Banner hidden | Do not render normally | Session state = Normal | Banner not in DOM | High |
| P10.F07.U003 | Exit button action | Test exit callback | Click 'Exit' | End session API called, state cleared | High |
| P10.F07.U004 | Dynamic data display | Show current plan | Session context (Free) | Banner displays "Plan: Free" | Medium |
| P10.F07.U005 | Quick config toggle | Test flyout | Click config gear | Config flyout opens | Medium |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P10.F07.E001 | Visual indicator E2E | Enter preview and verify UI | 1. Start Preview 2. Navigate pages | Banner remains visible on all student pages | High |
| P10.F07.E002 | Exit flow E2E | Enter and exit | 1. Start Preview 2. Click Exit | Returned to staff dashboard, banner gone | High |
| P10.F07.E003 | Quick config change | Change plan via banner | 1. Open config flyout 2. Change to Premium | App reloads/updates with Premium access | High |

## Modularity Checklist
- [ ] All business logic in service layer (not controllers)
- [ ] No cross-module direct database access
- [ ] Shared types used from @repo/types
- [ ] Validation schemas in @repo/validation
- [ ] Module can be extracted to microservice without code changes in other modules
- [ ] All dependencies injected, not imported directly
- [ ] Feature flags / config for optional features

## Upgrade Path
- Supports future roles (e.g., Parent/Tutor previewing student views).
- Foundation for A/B test previewing (viewing variant A vs variant B).
- Can be extended for sales demos without creating dummy accounts.

## Definition of Done
- Preview profile and impersonation session logic implemented.
- Entitlement checks respect preview context.
- Audit logs capture actor vs effective user.
- Global preview banner implemented in frontend.
- Authoring workflow includes one-click preview.
- All unit, integration, and E2E tests passing.
</Phase 10 — Preview System>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 05: Preview Student](../specs/05-preview-student.md)
- [Spec 06: Impersonation System](../specs/06-impersonation-system.md)

### Key Team Role Guidelines
- [Full Stack Engineer](../roles/17-fullstack-engineer.md) — Features 10.1 through 10.7
- [Security Engineer](../roles/46-security-engineer.md) — Feature 10.5 Audit Trail & Access isolation
- [QA Lead](../roles/38-qa-lead.md) — Preview mode test strategy

### Operational Standards & Guides
- [Security Policy](../guides/08-security-policy.md)
- [Audit Logging Spec](../specs/27-audit-logging.md)