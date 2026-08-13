<Entitlement Engine — Functional Specification>
## 1. Overview
The Entitlement Engine is a centralized service responsible for determining user access and limits for platform features. By completely decoupling entitlement logic from feature code, it ensures subscription limits are never hard-coded, allowing administrators to dynamically configure allowances (e.g., mock test counts, AI interview duration) per subscription plan.

## 2. User Stories
- As a Developer, I want to call a single engine to check if a user can access a feature so that I don't have to duplicate subscription logic.
- As a Main Admin, I want to adjust the number of daily AI interviews for the Premium plan via configuration so that I don't need a code deployment.
- As a Preview Student, I want the system to simulate a Premium plan entitlement so that I can experience features without bypassing real payment gateways.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Modify Entitlement Config | ✅ | ❌ | ❌ | ❌ | ❌ |
| Check Entitlements (API) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Simulate Entitlement | ❌ | ❌ | ❌ | ❌ | ✅ |

## 4. Features & Capabilities
### 4.1 Centralized Access Checking
**What it does**: Provides a unified interface for all system components to verify user access rights.
**How it works**: When a component needs to gate a feature, it queries the Entitlement Engine with the user ID and the requested entitlement key (e.g., `ai_interview_daily`). The engine checks the user's active plan, looks up the configured rule, and returns whether access is allowed or the numerical limit.
**Business Rules**: Never hard-code subscription logic in components.
**Edge Cases**: If a user has no active subscription, the engine defaults to the 'Free' plan entitlements.

### 4.2 Configurable Entitlement Rules
**What it does**: Defines what each plan can do using configurable keys.
**How it works**: Standard keys include `mock_tests` (number), `demo_interview` (boolean/count), `demo_duration` (minutes), `full_assessment` (boolean), `ai_interview_daily` (number), `custom_topic` (boolean), `personalized_practice` (boolean), `ai_question_modify` (boolean), and `priority_ai` (boolean).
**Business Rules**: Adding new entitlements requires only a configuration change in the database, not a code change.
**Edge Cases**: Missing entitlement configurations default to the most restrictive access (usually false or 0).

### 4.3 Preview Mode Simulation
**What it does**: Allows simulated plan entitlements for preview environments.
**How it works**: If the user is a Preview Student, the engine intercepts the check and applies simulated entitlements based on their selected simulation context (Free/Premium/Premium+).
**Business Rules**: No real payment is required or bypassed in production, but payment gates are bypassed in preview mode.

## 5. Data Model
```text
Table: entitlements
├── id (PK, CUID)
├── plan_id (FK, CUID) — References plans
├── entitlement_key (String) — e.g., 'ai_interview_daily'
├── entitlement_type (Enum) — BOOLEAN, NUMBER
├── entitlement_value (String) — 'true', 'false', or numeric string like '2'
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| POST | /api/v1/entitlements/check | Check specific entitlement | `{ "key": "ai_interview_daily" }` | `{ "allowed": true, "limit": 2 }` | Yes | Any |
| GET | /api/v1/entitlements/my | Get all entitlements for current user | None | Key-value map of entitlements | Yes | Student |
| GET | /api/v1/admin/entitlements | List all entitlement configurations | None | List of entitlements | Yes | Main Admin |
| PUT | /api/v1/admin/entitlements/:id | Update entitlement configuration | `{ "entitlement_value": "5" }` | Updated config | Yes | Main Admin |

## 7. UI Screens & Components
### Screen: Admin Entitlement Configuration
**URL**: /admin/entitlements
**Layout**: A data grid displaying all subscription plans as columns and entitlement keys as rows.
**Interactive Elements**: Inline editing for boolean toggles and number inputs. "Save Changes" button.
**States**: Read-only for unauthorized admins. Success toast on save.

## 8. Business Rules
1. Components must query the engine dynamically and cache the result only for the duration of the request.
2. Preview mode bypasses real database checks and uses simulated in-memory entitlements.
3. If an entitlement rule changes, it takes effect immediately on the next check.

## 9. Validation Rules
- `entitlement_key` must match a predefined list of valid keys.
- `entitlement_value` must be a valid number if `entitlement_type` is NUMBER.

## 10. Error Handling
- Unknown entitlement key: Returns default restrictive value (false/0) and logs a warning.
- Database timeout: Fail-safe mode (restrictive) to prevent unauthorized access.

## 11. Integration Points
- **Subscription Plans**: The engine relies on the user's active plan ID to resolve rules.
- **AI Credits & Billing**: To enforce limits like `ai_interview_daily` before consuming credits.

## 12. Configuration Options
- Completely data-driven; admins can map any predefined entitlement key to a plan with specific values.

## 13. Future Enhancements
- Time-based entitlements (e.g., access only valid during weekends).
- Feature flags integrated directly into the entitlement engine for A/B testing.
</Entitlement Engine — Functional Specification>
