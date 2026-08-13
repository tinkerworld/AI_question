<Preview Student — Functional Specification>
## 1. Overview
Preview Student is a system-controlled student persona used by staff (Admins and Teachers) to test and validate the student experience without needing a separate login, password, payment, or real subscription. It allows staff to simulate various billing plans, course access combinations, and content versions before making content available to real students.

## 2. User Stories
- As a Main Admin, I want to preview content as a student so that I can verify the end-to-end user experience.
- As a Teacher, I want to test a draft course using different billing levels so that I can ensure access controls work properly.
- As a Sub-Admin, I want to use the preview mode with unlimited QA mode so that I don't get blocked by plan usage limits while testing.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| Activate Preview (preview.use) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configure Preview Plan | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Draft Content | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Exit Preview | ✅ | ✅ | ✅ | ❌ | ✅ |

## 4. Features & Capabilities

### 4.1 Preview Activation and Configuration
**What it does**: Allows staff to start a preview session and configure the simulated environment.
**How it works**:
1. User clicks the "Preview as Student" button from the staff dashboard or course builder.
2. A configuration modal appears.
3. User selects Billing Level (Free, Premium, Premium+).
4. User selects Course Access (Add/remove courses, select multiple, select all).
5. User selects Content Version (Draft, Review, Published).
6. User selects Usage Mode (Normal Plan Limits, Unlimited QA).
7. User configures Feature Flags if needed.
8. User clicks "Start Preview". The system switches context.
**Business Rules**: Bypasses payment but NOT authorization (entitlement system still operates using the simulated plan).
**Edge Cases**: If a staff member tries to start a preview while already in preview, they are prompted to update the configuration instead.

### 4.2 Preview Workflow
**What it does**: The end-to-end content creation and testing lifecycle.
**How it works**: Create Content → Draft → Preview as Student → Select Plan → Select Courses → Test Experience → Fix → Preview Again → Review → Approve → Publish → Real Students.
**Business Rules**: Preview students can access draft content if configured to do so.
**Edge Cases**: Content transitions from draft to published during an active preview session. The preview student will still see the content based on their configured version preference.

### 4.3 Visual Indication & Session Exit
**What it does**: Clearly indicates that the user is in preview mode and allows them to return to their normal staff view.
**How it works**: A persistent visual banner or badge is displayed on the screen. It includes an "Exit Preview" button.
**Business Rules**: All actions in preview mode are audited with the original actor identity.
**Edge Cases**: Session expiry. If the staff session expires, the preview session also expires.

## 5. Data Model
```
Table: preview_profiles
├── id (PK, CUID)
├── staff_user_id (FK, User) — The staff member who owns this profile
├── billing_level (ENUM) — Simulated plan
├── usage_mode (ENUM) — Normal or Unlimited
├── content_version (ENUM) — Draft, Review, Published
├── feature_flags (JSON)
└── timestamps

Table: preview_courses
├── id (PK, CUID)
├── profile_id (FK, preview_profiles)
├── course_id (FK, Course)
└── timestamps

Table: preview_contexts
├── id (PK, CUID)
├── session_id (String)
├── profile_id (FK, preview_profiles)
├── expires_at (Timestamp)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| POST | /api/v1/preview/start | Start preview | `{ billing_level, courses, version, mode, flags }` | `{ session_token }` | Bearer | preview.use |
| POST | /api/v1/preview/stop | End preview | `{}` | `{ success }` | Bearer | preview.use |
| GET | /api/v1/preview/config | Get current config | `{}` | `{ config }` | Bearer | preview.use |
| PUT | /api/v1/preview/config | Update config | `{ config }` | `{ success }` | Bearer | preview.use |

## 7. UI Screens & Components
### Screen: Preview Configuration Modal
**URL**: Triggered via UI button, no specific URL
**Layout**: Modal overlay with form fields for Billing Level, Course Access, Content Version, Usage Mode, and Feature Flags.
**Interactive Elements**: Dropdowns, multi-select checkboxes, toggle switches, "Start Preview" button, "Cancel" button.
**States**: Loading (fetching courses), active, submitting, error (validation failed).

### Screen: Active Preview Banner
**URL**: Global across student-facing pages
**Layout**: Fixed banner at top or bottom of screen.
**Interactive Elements**: "Exit Preview" button, "Edit Configuration" button.
**States**: Active.

## 8. Business Rules
1. Preview Student bypasses payment gateways but respects the authorization logic of the simulated plan.
2. All actions taken as a Preview Student must be audited with the original staff actor's ID.
3. Preview sessions are temporary and do not create permanent student records or statistics.
4. If Usage Mode is 'Normal', standard plan limits apply. If 'Unlimited QA', limits are ignored.

## 9. Validation Rules
- Billing Level must be a valid enum (Free, Premium, Premium+).
- Course Access array must contain valid course IDs.
- Content Version must be valid (Draft, Review, Published).

## 10. Error Handling
- Invalid configuration payload: Return 400 Bad Request with specific field errors.
- Unauthorized access (missing permission): Return 403 Forbidden.
- Session expired: Redirect to login or staff dashboard with an informational message.

## 11. Integration Points
- Entitlement System: To evaluate access based on the simulated plan.
- Audit Logging System: To record actions with dual identities (Actor + Effective User).
- Course Player: To render content based on the selected Content Version.

## 12. Configuration Options
- Admins can configure which roles are allowed to use the 'Unlimited QA' mode.

## 13. Future Enhancements
- Saveable preview configurations/presets.
- Shareable preview links for external reviewers.
</Preview Student — Functional Specification>
