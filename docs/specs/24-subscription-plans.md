<Subscription Plans — Functional Specification>
## 1. Overview
This feature manages the subscription plans (Free, Premium, Premium+) that dictate access levels to the platform's learning and assessment tools. It ensures users get appropriate access to mock tests, AI interviews, and personalized practice based on their tier, while allowing administrators to configure plan features and limits dynamically without code changes.

## 2. User Stories
- As a Student, I want to view available subscription plans so that I can choose the one that fits my learning needs.
- As a Student on the Free tier, I want to experience a demo AI interview so that I can decide if the Premium tier is worth purchasing.
- As a Premium Student, I want to access detailed assessments and personalized practice so that I can improve my weaknesses.
- As a Main Admin, I want to configure the feature limits for each plan so that I can adjust offerings dynamically.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Plan Offerings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Subscribe to Plan | ❌ | ❌ | ❌ | ✅ | ⚙️ |
| Configure Plan Features | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Subscription Status | ✅ | ✅ | ❌ | ✅ | ✅ |

## 4. Features & Capabilities
### 4.1 Free Tier
**What it does**: Grants basic access to platform features to give users a taste of the capabilities.
**How it works**: Users default to this tier upon registration. They can take up to 2 mock tests and experience one 5-minute sample AI interview. Detailed assessments are locked (displaying 'Detailed Assessment: Premium'). Personalized practice and AI question modification are disabled.
**Business Rules**: The sample AI interview must end strictly at 5 minutes. No personalized practice is generated.
**Edge Cases**: If a user is downgraded to Free, their previous detailed assessments become locked until they resubscribe.

### 4.2 Premium Tier
**What it does**: Provides full access to core learning, AI, and assessment features.
**How it works**: Upon subscribing, users get access to their enrolled courses, all mock tests, and personalized practice papers. Includes weakness/strength tracking, AI question modification, and full AI interviews (2 per day included).
**Business Rules**: AI interviews are capped at 2 per day. Users receive detailed feedback with exactly 5 improvement recommendations.
**Edge Cases**: Daily limits reset exactly at midnight UTC.

### 4.3 Premium+ Tier
**What it does**: Offers higher limits, expanded features, and priority processing for heavy users.
**How it works**: Includes everything in Premium, with higher AI usage limits, additional interview allowances, more advanced analytics, and priority AI processing.
**Business Rules**: Exact limits are CONFIGURABLE via the Entitlement Engine and not hard-coded.
**Edge Cases**: Priority processing ensures faster AI response times during peak loads.

## 5. Data Model
```text
Table: plans
├── id (PK, CUID)
├── name (String) — Plan name (Free, Premium, Premium+)
├── price (Decimal) — Cost of the plan
├── billing_cycle (String) — 'monthly' or 'annual'
├── active (Boolean) — Whether the plan is publicly available
└── timestamps

Table: subscriptions
├── id (PK, CUID)
├── user_id (FK, CUID) — References users
├── plan_id (FK, CUID) — References plans
├── status (Enum) — ACTIVE, EXPIRED, CANCELLED
├── start_date (DateTime)
├── end_date (DateTime)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | /api/v1/plans | List all active subscription plans | None | List of plan objects | No | Public |
| GET | /api/v1/subscriptions/me | Get current user's active subscription | None | Subscription details | Yes | Student |
| POST | /api/v1/subscriptions | Subscribe to a plan | `{ "plan_id": "cuid" }` | Subscription object | Yes | Student |
| PUT | /api/v1/plans/:id | Update plan configuration (Admin) | `{ "price": 99.99 }` | Updated plan | Yes | Main Admin |

## 7. UI Screens & Components
### Screen: Plan Comparison Page
**URL**: /pricing
**Layout**: Side-by-side comparison cards for Free, Premium, and Premium+. Feature list with checkmarks and tooltips for each capability.
**Interactive Elements**: "Subscribe Now" buttons, monthly/annual billing toggle.
**States**: Loading skeleton, error state on fetch failure, success redirect to checkout.

### Screen: Current Subscription Dashboard
**URL**: /dashboard/subscription
**Layout**: Displays active plan details, renewal date, and usage limits (e.g., "AI Interviews: 1/2 used today").
**Interactive Elements**: "Upgrade", "Downgrade", and "Cancel Subscription" buttons.
**States**: Empty state (if no active sub), active display with progress bars for limits.

## 8. Business Rules
1. A user can only have one active subscription at a time.
2. Downgrades take effect at the end of the current billing cycle.
3. Upgrades are pro-rated and take effect immediately.
4. Free tier limits are strictly enforced.

## 9. Validation Rules
- `plan_id` must reference an active plan.
- Cannot subscribe to the currently active plan again.

## 10. Error Handling
- Invalid `plan_id`: 404 Not Found.
- Payment Failure: 402 Payment Required with clear instructions to update payment method.
- Concurrent Upgrade: 409 Conflict if another subscription modification is in progress.

## 11. Integration Points
- **Entitlement Engine**: Called to verify specific feature allowances dynamically.
- **AI Credits & Billing**: For handling payment processing and credit allocation.

## 12. Configuration Options
- Admins can configure the price, name, and visibility of each tier in the platform settings.

## 13. Future Enhancements
- Introduce family or institutional plans.
- Add promotional discount codes and referral rewards.
</Subscription Plans — Functional Specification>
