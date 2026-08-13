<AI Credits & Billing — Functional Specification>
## 1. Overview
The AI Credits & Billing system manages the financial transactions, subscription lifecycles, and consumption of AI resources on the platform. It handles the tracking of daily included AI allowances versus purchased premium credits, and provides a pluggable interface for future payment gateway integrations while abstracting internal cost calculations from the end-user.

## 2. User Stories
- As a Premium Student, I want to purchase additional AI credit packages so that I can conduct more interviews beyond my daily limit.
- As a Student, I want to see my credit balance and usage history so that I know exactly what I am paying for.
- As a Main Admin, I want to view AI usage reports so that I can monitor platform infrastructure costs and adjust pricing.
- As a Developer, I want a pluggable billing adapter interface so that I can easily integrate Stripe or Razorpay in the future.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Purchase Credits | ❌ | ❌ | ❌ | ✅ | ⚙️ |
| View Own Usage History | ❌ | ❌ | ❌ | ✅ | ✅ |
| View System Usage Reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure Pricing | ✅ | ❌ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities
### 4.1 AI Credit System
**What it does**: Tracks and consumes AI credits for premium features like AI interviews.
**How it works**: Credits are separated into "Included Usage" (daily allowances via Entitlement Engine) and "Purchased Credits" (+1, +5, +20 packages). When a user starts an interview, the system consumes from the daily limit first. Once exhausted, it consumes from purchased credits.
**Business Rules**: One interview equals one session credit, regardless of how many internal STT/LLM/TTS API calls are made during the session.
**Edge Cases**: If a session fails due to platform error, the consumed credit is returned (configurable behavior). Purchased credits have a configurable expiry date.

### 4.2 Billing & Pricing Model
**What it does**: Manages financial transactions and subscription states.
**How it works**: Uses a pluggable billing adapter interface for future gateway integration. The pricing model calculates: `Student Price = AI Cost + Infrastructure Cost + Platform Margin`.
**Business Rules**: The student only ever sees the final `Student Price`. Internal cost breakdowns are hidden. Generates basic invoices for purchases.
**Edge Cases**: Handles upgrade/downgrade flows with pro-rated billing.

### 4.3 Subscription Lifecycle Management
**What it does**: Tracks the state of user subscriptions.
**How it works**: Subscriptions transition between ACTIVE, EXPIRED, and CANCELLED states based on payment events and time.
**Business Rules**: Cancelled subscriptions remain ACTIVE until the end of the billing period, then transition to CANCELLED.

### 4.4 AI Usage Tracking
**What it does**: Audits every AI action for billing and reporting.
**How it works**: Logs per-user, per-feature usage counts.
**Business Rules**: Enforces daily limits and resets included quotas exactly at midnight UTC.

## 5. Data Model
```text
Table: ai_credits
├── id (PK, CUID)
├── user_id (FK, CUID)
├── balance (Integer) — Number of purchased credits remaining
├── expiry_date (DateTime) — When credits expire
└── timestamps

Table: ai_usage
├── id (PK, CUID)
├── user_id (FK, CUID)
├── feature (String) — e.g., 'ai_interview', 'question_modify'
├── credit_type (Enum) — INCLUDED, PURCHASED
├── status (Enum) — CONSUMED, REFUNDED
└── timestamps

Table: invoices
├── id (PK, CUID)
├── user_id (FK, CUID)
├── amount (Decimal)
├── items (JSON) — Details of purchase
├── status (Enum) — PAID, PENDING, FAILED
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | /api/v1/credits/balance | Get current credit balance | None | `{ "included": 2, "purchased": 5 }` | Yes | Student |
| POST | /api/v1/credits/purchase | Buy credit package | `{ "package_id": "pkg_5" }` | Invoice and checkout URL | Yes | Student |
| GET | /api/v1/credits/usage | Get usage history | None | List of usage logs | Yes | Student |
| GET | /api/v1/admin/reports/usage | Admin usage report | None | Aggregated usage data | Yes | Admin |

## 7. UI Screens & Components
### Screen: Credit Balance & Purchase
**URL**: /dashboard/credits
**Layout**: Prominent display of daily remaining allowance and purchased credit balance. Cards for +1, +5, +20 packages with prices.
**Interactive Elements**: "Buy Now" buttons for credit packages.
**States**: Processing payment overlay, success confirmation modal.

### Screen: Usage History
**URL**: /dashboard/usage
**Layout**: Paginated table showing date, feature used, and whether an included or purchased credit was consumed.
**Interactive Elements**: Date range filter.
**States**: Empty state if no usage.

## 8. Business Rules
1. Included usage is always consumed before purchased credits.
2. Daily limits reset at 00:00 UTC.
3. One session = one credit. Internal API limits are handled transparently.
4. Prices shown to students are final; internal cost margins are strictly confidential.

## 9. Validation Rules
- Cannot start an AI session if `included balance + purchased balance == 0`.
- Credit packages must have valid configuration IDs.

## 10. Error Handling
- Insufficient Credits: 403 Forbidden with prompt to purchase more.
- Session Failure: Automatic logging and asynchronous credit refund.

## 11. Integration Points
- **Entitlement Engine**: To determine the daily included allowance limit.
- **Payment Gateway Adapter**: Abstract interface to handle actual card processing.

## 12. Configuration Options
- Credit package prices, sizes (+1, +5, etc.), and expiry durations.
- Automatic refund behavior for failed sessions.

## 13. Future Enhancements
- Real-time integration with Stripe/Razorpay via webhooks.
- Volume discounts for large credit purchases.
</AI Credits & Billing — Functional Specification>
