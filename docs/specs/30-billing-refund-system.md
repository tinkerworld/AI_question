# Billing Audit, Log & Refund Engine — Functional Specification

## 1. Overview
The **Billing Audit, Log & Refund Engine** provides comprehensive transaction logging, subscription lifecycle management, and a secure refund ("return money") framework for the platform.

It enables Main Admins and delegated Sub-Admins to inspect all financial events, issue full or partial refunds via pluggable payment gateway adapters (Razorpay, Stripe, etc.), execute automatic credit clawbacks, adjust subscription entitlements upon refund, and record immutable audit logs of every monetary transaction.

---

## 2. User Stories
- **As a Student**, I want to request a refund for an unneeded subscription or unused AI credit package within the eligible refund window.
- **As a Main Admin or Sub-Admin**, I want to view a complete financial audit log of all payment transactions, invoice events, and credit allocations.
- **As a Main Admin or Sub-Admin**, I want to process a full or partial refund for a student ("return money") with a recorded reason so that disputed or erroneous charges can be resolved promptly.
- **As a System Architect**, I want the refund engine to automatically revoke unspent AI credits or downgrade subscription tiers when a refund is approved so that system abuse is prevented.
- **As an Auditor**, I want all refund operations to emit immutable audit logs recording who approved the refund, the gateway transaction ID, the refund amount, and the user affected.

---

## 3. Permissions & Access Control

| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|:---:|:---:|:---:|:---:|:---:|
| View Financial Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Request Refund | ❌ | ❌ | ❌ | ✅ (Own account) | ❌ |
| Approve & Process Full/Partial Refund | ✅ | ✅ (Configurable threshold) | ❌ | ❌ | ❌ |
| Execute Manual Credit Adjustment | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure Refund Policies & Windows | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Features & Capabilities

### 4.1 Comprehensive Financial Audit Logging
- **What it does**: Tracks every billing lifecycle event in the `billing_logs` table.
- **Events Logged**:
  - `subscription.created`, `subscription.renewed`, `subscription.upgraded`, `subscription.downgraded`, `subscription.cancelled`
  - `credits.purchased`, `credits.consumed`, `credits.expired`, `credits.refund_clawbacked`
  - `payment.initiated`, `payment.succeeded`, `payment.failed`, `payment.refunded`
- **Audit Integration**: Every monetary log entry is simultaneously sent to the primary `audit_logs` service.

### 4.2 Pluggable Payment Refund Adapter ("Return Money")
- **What it does**: Dispatches refund commands to external payment gateways (Razorpay, Stripe) via the `BillingAdapter` interface.
- **How it works**:
  - Admin opens `/admin/billing/subscriptions/:id` or `/admin/billing/transactions/:id`.
  - Admin clicks "Issue Refund", enters `amount` (full or partial), `reason`, and selects `clawbackCredits` option.
  - API calls `BillingAdapter.processRefund({ transactionId, gatewayPaymentId, amount, reason })`.
  - Gateway returns `refundId` and status (`SUCCESS`/`PENDING`/`FAILED`).
  - System logs `refund_transactions` record and updates subscription/credit state.

### 4.3 Automated Entitlement & Credit Clawback
- **What it does**: Restores system integrity post-refund by adjusting student balances.
- **How it works**:
  - **Subscription Refund**: Automatically updates subscription status to `CANCELLED` or reverts tier to `FREE`, triggering the `@repo/entitlement-engine` to update user capabilities instantly.
  - **AI Credit Refund**: Automatically calculates remaining unspent credits purchased in that transaction and deducts them from `ai_credits.purchased_balance`. If credits were already spent, the net credit balance adjusts down to zero (never negative).

### 4.4 Simulated Refund Engine for Preview Student Mode
- **What it does**: Allows staff testing the student experience in Preview Mode to simulate payment refunds without touching real money.
- **How it works**: When `mode = 'PREVIEW'`, refund APIs bypass the external payment gateway adapter, return a simulated `refund_id` (e.g., `ref_sim_999`), update the simulated subscription state, and log the action with `mode = 'PREVIEW'` and the original actor ID.

---

## 5. Data Model

```
Table: refund_transactions
├── id                    (CUID, PK)
├── subscriptionId        (FK to subscriptions, Nullable)
├── aiCreditId            (FK to ai_credits, Nullable)
├── userId                (FK to users) — Student receiving refund
├── actorUserId           (FK to users) — Admin approving refund
├── gateway               (String) — 'RAZORPAY', 'STRIPE', 'SIMULATED'
├── gatewayPaymentId      (String) — Original transaction ID
├── gatewayRefundId       (String) — Gateway refund reference ID
├── originalAmount        (Decimal) — Original transaction total
├── refundAmount          (Decimal) — Amount refunded
├── currency              (String) — Default 'INR' / 'USD'
├── isPartial             (Boolean) — True if partial refund
├── clawbackCreditsCount  (Integer, Default 0) — Credits revoked
├── status                (Enum) — 'INITIATED', 'COMPLETED', 'FAILED'
├── reason                (Text) — Reason for return of money
├── createdAt             (DateTime, Default NOW)
└── updatedAt             (DateTime, Updated NOW)

Indexes:
- (userId, createdAt DESC)
- (gatewayPaymentId)
- (actorUserId)
```

---

## 6. API Endpoints

| Method | Endpoint | Description | Auth | Permission |
|---|---|---|---|---|
| `GET` | `/api/v1/billing/transactions` | List all billing & transaction logs | Required | `billing.manage` |
| `POST` | `/api/v1/billing/refunds` | Process full or partial refund ("return money") | Required | `billing.manage` |
| `GET` | `/api/v1/billing/refunds/:id` | Get specific refund transaction details | Required | `billing.manage` |
| `GET` | `/api/v1/billing/users/:userId/financial-history` | View financial history for a student | Required | `billing.manage` |
| `POST` | `/api/v1/billing/preview/refund-sim` | Simulate refund in Preview Student mode | Required | `preview.use` |

---

## 7. Business & Validation Rules
1. **Refund Thresholds**: Partial refunds cannot exceed the original transaction amount.
2. **Double Refund Prevention**: The system checks `refund_transactions` to ensure a payment ID is not refunded twice beyond its total amount.
3. **Clawback First**: Unspent AI credits from a refunded credit pack must be clawbacked before the refund is marked complete.
4. **Audit Immutability**: Refund records cannot be edited or deleted once marked `COMPLETED`.
