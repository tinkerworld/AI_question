# Phase 13 — Subscription & Entitlements
## Overview
This phase introduces the centralized Entitlement Engine and Subscription Management system. It implements billing integration, AI credit tracking, and enforces limits based on simulated or actual plans (FREE, PREMIUM, PREMIUM+), establishing a robust monetization framework.

## Prerequisites
- Core interview flow and assessment capabilities (Phases 1-8).
- User authentication and role management.
- Centralized logging and initial database schemas.

## Features

### Feature 13.1 — Entitlement Engine (@repo/entitlement-engine)

#### Description
Provides centralized entitlement rules to avoid hard-coding permissions throughout the app. Defines logic for plan limits (FREE, PREMIUM, PREMIUM+) and dynamically handles feature flags.

#### Sub-Features
- Centralized entitlement rule evaluation.
- Plan definitions (FREE: mock_tests=2, demo_interview=1, demo_duration=5min, full_assessment=false).
- Plan definitions (PREMIUM: ai_interview_daily=2, custom_topic=true, full_assessment=true, personalized_practice=true).
- Premium+ dynamic configuration capabilities.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/entitlements/check` | Evaluates if the current user has access to a specific feature | Bearer, Any |
| GET | `/api/entitlements/plan/:planId` | Returns the definitions and limits for a specific plan | Bearer, Any |

#### Database Changes
- `Plan` table: Stores plan metadata and limits.
- `FeatureFlag` table: Stores configurable flags per plan.

#### Frontend Pages/Components
- Global HOC or Hook (`useEntitlement`) to show/hide features dynamically based on rules.

#### Acceptance Criteria
1. The engine accurately evaluates feature access based on the user's active plan.
2. FREE plan limits are strictly respected.
3. PREMIUM plan unlocks full assessment and custom topics.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F01.U001 | Free Plan Entitlement | Check FREE plan mock test limits | FREE Plan, Action: mock_test | Allowed if < 2 | High |
| P13.F01.U002 | Premium Entitlement | Check PREMIUM plan access | PREMIUM Plan, Action: custom_topic | Allowed | High |
| P13.F01.U003 | Feature Flag Config | Fetch feature flags for PREMIUM+ | Plan: PREMIUM+ | Full flag list | Medium |
| P13.F01.U004 | Unknown Plan Fallback | Check missing plan behavior | Plan: NULL | Fallback to FREE | High |
| P13.F01.U005 | Missing Feature Flag | Check non-existent flag | Flag: invalid_flag | False/Denied | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P13.F01.I001 | API Plan Fetch | Fetch plan details via API | Seed Plan data | GET /api/v1/entitlements/plan/FREE | Returns correct limits | High |
| P13.F01.I002 | Engine DB Integration | Engine resolves DB flags | Connect Engine to DB | Check custom flag | DB value matches | High |
| P13.F01.I003 | Plan Check Endpoints | API checks feature access | Authenticate as FREE | GET /api/v1/entitlements/check | Returns false for premium | Medium |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F01.E001 | Hidden Premium UI | Ensure premium buttons are locked | Login as FREE, navigate to custom topic | Button is locked/disabled | High |
| P13.F01.E002 | Premium UI Access | Ensure premium buttons are unlocked | Login as PREMIUM, navigate to custom topic | Button is active | High |


### Feature 13.2 — Subscription Management

#### Description
Manages plan CRUD operations and handles the student subscription lifecycle, tracking status transitions like ACTIVE, EXPIRED, and CANCELLED.

#### Sub-Features
- Plan CRUD: name, features, limits, price, duration.
- Student subscription status tracking.
- Automated subscription expiry and renewal handlers.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/subscriptions/plans` | Create a new plan | Bearer, Admin |
| GET | `/api/subscriptions` | Get current user's subscription | Bearer, Any |
| PATCH | `/api/subscriptions/:id` | Update subscription status | Bearer, Admin |

#### Database Changes
- `Subscription` table: `userId`, `planId`, `startDate`, `endDate`, `status`.

#### Frontend Pages/Components
- Admin panel for Plan CRUD.

#### Acceptance Criteria
1. Admins can create and edit plans.
2. Students can view their active subscription and expiry date.
3. Subscriptions accurately transition to EXPIRED when `endDate` is reached.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F02.U001 | Status Expiry | Check if past endDate is EXPIRED | endDate < now | Status: EXPIRED | High |
| P13.F02.U002 | Plan CRUD Validation | Validate plan creation inputs | Negative price | ValidationError | Medium |
| P13.F02.U003 | Active Subscription | Check current active subscription | valid dates | Status: ACTIVE | High |
| P13.F02.U004 | Cancel Subscription | Manual cancellation | action: cancel | Status: CANCELLED | High |
| P13.F02.U005 | Plan Modification | Modify plan limits | new limit: 5 | Plan updated | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P13.F02.I001 | Subscription Fetch | Get user subscription API | Assign sub to user | GET /api/v1/subscriptions | Returns sub details | High |
| P13.F02.I002 | Admin Plan Create | Admin creates plan API | Auth as Admin | POST /api/v1/subscriptions/plans | Plan stored in DB | Medium |
| P13.F02.I003 | Expiry Cron | Verify background expiry job | Seed expired sub | Run Cron | Status updated to EXPIRED | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F02.E001 | Subscription View | Student views sub details | Login, go to profile | Shows active plan and expiry | Medium |
| P13.F02.E002 | Admin Plan Config | Admin edits a plan | Login admin, edit plan | Plan updates reflect globally | Medium |


### Feature 13.3 — AI Credit System

#### Description
Manages consumable AI credits separate from daily allowances. Tracks included usage versus purchased credits, prioritizing daily limits before consuming purchased credits.

#### Sub-Features
- Credit packages (+1, +5, +20).
- Dual tracking: daily allowance vs. purchased packages.
- Credit consumption priority logic.
- Credit expiry handling.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/ai-credits/purchase` | Purchase a credit package | Bearer, Any |
| GET | `/api/ai-credits/balance` | Get current credit balance | Bearer, Any |

#### Database Changes
- `AICreditPackage` table: Predefined packages.
- `UserAICredit` table: Tracks purchased, consumed, and expiring credits per user.

#### Frontend Pages/Components
- Credit Balance display component.
- Purchase Credit modal.

#### Acceptance Criteria
1. System consumes daily included credits before purchased ones.
2. Balances reflect accurate consumption.
3. Expiry dates on purchased credits are enforced if configured.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F03.U001 | Priority Consumption | Consume with daily + purchased | action: consume | Daily -1, Purchased 0 | High |
| P13.F03.U002 | Purchased Consumption | Consume with daily=0 | action: consume | Purchased -1 | High |
| P13.F03.U003 | Insufficient Credits | Consume with 0 total | action: consume | InsufficientFundsError| High |
| P13.F03.U004 | Credit Expiry | Check balance of expired credits | Date > expiry | Balance excludes expired | Medium |
| P13.F03.U005 | Purchase Add | Add credits via purchase | package: +5 | Balance +5 | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P13.F03.I001 | Balance Fetch API | Fetch balance | Add 5 credits | GET /api/v1/ai-credits/balance | Returns 5 | High |
| P13.F03.I002 | Purchase API | Call purchase endpoint | Mock payment success| POST /api/v1/ai-credits/purchase | DB adds credits | High |
| P13.F03.I003 | Consume Event | Trigger consume via interview | Start interview | Credit deducted | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F03.E001 | Purchase Flow | User buys credits | Click buy +5, mock checkout | UI updates balance | High |
| P13.F03.E002 | Display Balance | Check balance display | Login | Header shows correct balance | Low |


### Feature 13.4 — AI Usage Tracking & Limits

#### Description
Tracks AI usage strictly at the session level to prevent abuse. One interview equals one session, enforcing daily limits and managing credit returns for failed sessions.

#### Sub-Features
- Session-based usage counting (ignoring internal STT/LLM retry counts for billing).
- Daily limit enforcement and reset logic.
- Automated credit return for system-failed sessions.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/ai/usage/summary` | Get current usage summary | Bearer, Any |
| GET | `/api/ai/usage/history` | Get detailed usage history | Bearer, Any |

#### Database Changes
- `UsageLog` table: Tracks `sessionId`, `type`, `creditsConsumed`, `status`.

#### Frontend Pages/Components
- Usage History timeline.

#### Acceptance Criteria
1. One complete interview strictly deducts one credit/session allowance.
2. Daily limits reset exactly at midnight UTC.
3. System failures automatically refund the session credit.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F04.U001 | Session Count | One interview counts as one | 5 LLM calls | 1 Session billed | High |
| P13.F04.U002 | Daily Reset | Enforce midnight UTC reset | Time passes midnight| Daily usage = 0 | High |
| P13.F04.U003 | Credit Return | Handle failed session | Status = failed | Credit refunded | High |
| P13.F04.U004 | Over Limit Deny | Start session over limit | Usage = Limit | AccessDeniedError | High |
| P13.F04.U005 | History Log | Log creation on session | Session ends | Log entry created | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P13.F04.I001 | Usage Summary API | Fetch usage stats | Mock 2 sessions | GET /api/v1/ai/usage/summary | Returns count=2 | High |
| P13.F04.I002 | Limit Enforcement | Exceed limit via API | Set usage=limit | Start new session | HTTP 403 / Denied | High |
| P13.F04.I003 | Refund Trigger | Trigger system fail event | Session active | Emit sys_fail | Credit refunded in DB | Medium |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F04.E001 | Limit UI Block | User exceeds limit | Consume all limits, try interview | UI shows limit reached | High |


### Feature 13.5 — Billing Integration & Refund Engine (Pluggable)

#### Description
Implements a pluggable billing adapter interface (`BillingAdapter`) supporting payment gateways (Razorpay, Stripe), webhook processing, and a full/partial refund engine ("return money") with automated credit clawbacks ([Spec 30](../specs/30-billing-refund-system.md)).

#### Sub-Features
- Pluggable billing adapter interface (`BillingAdapter`).
- Pricing model: Price = AI Cost + Infrastructure Cost + Platform Margin.
- Refund Engine ("return money"): Full or partial refund processing via gateway adapters.
- Automatic entitlement downgrade & unspent credit clawback upon refund approval.
- Simulated refund engine for Preview Student mode (`mode = 'PREVIEW'`).
- Financial audit trail and invoice generation.

#### API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/billing/checkout` | Initiate checkout process | Bearer, Any |
| GET | `/api/v1/billing/invoices` | Get user invoices | Bearer, Any |
| GET | `/api/v1/billing/transactions` | Financial audit logs | Bearer, Admin (`billing.manage`) |
| POST | `/api/v1/billing/refunds` | Process refund ("return money") | Bearer, Admin (`billing.manage`) |

#### Database Changes
- `Invoice` table: `userId`, `amount`, `status`, `externalId`.
- `refund_transactions` table: `userId`, `actorUserId`, `gateway`, `gatewayPaymentId`, `gatewayRefundId`, `refundAmount`, `isPartial`, `clawbackCreditsCount`, `status`, `reason`.

#### Frontend Pages/Components
- Invoice History table, Refund Request modal, Admin Refund Approval panel.

#### Acceptance Criteria
1. Adapter interface can be mocked for testing without actual payment APIs.
2. User sees flat product price regardless of underlying variable AI costs.
3. Invoices are generated accurately upon successful checkout simulation.
4. Refunds successfully execute via payment adapters and log `billing.refund_processed` audit entries.
5. Unspent AI credits are automatically clawbacked upon refund processing.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F05.U001 | Pricing Calculation | Test internal margin calc | Base=10, Margin=5 | Price=15 | Medium |
| P13.F05.U002 | Adapter Interface | Test mock adapter success | action: charge | Status: success | High |
| P13.F05.U003 | Adapter Failure | Test mock adapter failure | action: charge | Status: failed | High |
| P13.F05.U004 | Invoice Generation | Generate PDF data | invoice record | Valid blob/text | Low |
| P13.F05.U005 | Flat Pricing | Ensure variable costs hidden| dynamic cost=var | Price=fixed | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P13.F05.I001 | Checkout API | Initiate checkout | Mock adapter active | POST checkout | Returns checkout URL | High |
| P13.F05.I002 | Invoice Fetch | Get invoices API | Seed invoices | GET invoices | List of invoices | Medium |
| P13.F05.I003 | Adapter Swap | Change adapter config | Use TestAdapter | Checkout uses TestAdapter | success | Medium |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F05.E001 | Checkout Flow | End to end mock checkout | Click checkout, confirm | Success page, invoice generated | High |


### Feature 13.6 — Preview Mode Billing

#### Description
Allows simulated plan testing where users can preview "Free" or "Premium" experiences without actual payment processing.

#### Sub-Features
- Simulated plans that behave identically to real plans.
- Bypass payment adapter in preview mode.

#### API Endpoints
None specific (uses existing billing/entitlement endpoints with flags).

#### Database Changes
- None (Configuration-driven).

#### Frontend Pages/Components
- "Preview Mode" toggle (Admin/Dev only).

#### Acceptance Criteria
1. Selecting Preview Premium immediately unlocks premium features.
2. No payment gateways are triggered in Preview mode.
3. System accurately reflects the previewed plan's entitlements.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F06.U001 | Preview Toggle | Activate preview mode | plan: PREMIUM | Entitlements: PREMIUM | High |
| P13.F06.U002 | Payment Bypass | Checkout in preview | trigger checkout | Bypassed, Success | High |
| P13.F06.U003 | Preview Reset | Disable preview mode | toggle off | Returns to actual plan | Medium |
| P13.F06.U004 | Free Preview | Activate FREE preview | user is PREMIUM | Entitlements: FREE | Medium |
| P13.F06.U005 | Preview Limits | Check usage in preview | consume credit | Deducted from preview limit| Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P13.F06.I001 | API Preview Header | Send request with preview | Auth + Preview | GET /entitlements/check | Returns preview plan access | High |
| P13.F06.I002 | Checkout Bypass | Preview checkout API | Auth + Preview | POST checkout | Immediate success response | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F06.E001 | Preview Premium UI | Toggle premium preview | Toggle -> navigate | Premium features unlocked instantly | High |


### Feature 13.7 — Free Tier Experience

#### Description
Restricts usage gracefully for free-tier users, offering a limited 5-minute sample interview and locking detailed assessments to encourage upgrades.

#### Sub-Features
- Enforce 2 mock tests limit.
- Enforce 5-minute hard limit on free interviews.
- Lock detailed assessment UI behind premium banner.

#### API Endpoints
None specific (enforced via Entitlement Engine).

#### Database Changes
None.

#### Frontend Pages/Components
- Locked Assessment Component (Blur effect + Premium CTA).
- Interview Timer override for Free tier.

#### Acceptance Criteria
1. Free users are forcibly ended at 5 minutes during interviews.
2. Free users cannot access detailed assessments.
3. Call-to-action is clearly visible on locked content.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F07.U001 | Timer Enforce | Free plan timer limit | Free plan | MaxTime: 300s | High |
| P13.F07.U002 | Assess Lock | Check assessment flag | Free plan | AssesmentAccess: false| High |
| P13.F07.U003 | Mock Test Limit | Start 3rd mock test | Free plan, usages: 2| Denied | High |
| P13.F07.U004 | Timer Premium | Premium timer limit | Premium plan | MaxTime: config | Medium |
| P13.F07.U005 | Assess Unlock | Premium assessment access | Premium plan | AssesmentAccess: true | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P13.F07.I001 | Timer Disconnect | WebSocket enforces 5min | Start WS as Free | Wait 5 mins | WS disconnected by server | High |
| P13.F07.I002 | Assessment API Lock | Fetch detailed assess | Auth as Free | GET /assessment/:id | HTTP 403 / Partial data | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F07.E001 | UI Blur & CTA | View completed interview | Login Free, open result| Assessment is blurred, shows CTA | High |
| P13.F07.E002 | 5 Min Cutoff | Take sample interview | Login Free, start int | Ends abruptly at 5m with CTA | High |


### Feature 13.8 — Subscription Frontend

#### Description
User interfaces for managing subscriptions, viewing credit balances, purchasing upgrades, and checking usage history.

#### Sub-Features
- Plan comparison table.
- Current subscription and credit balance dashboard.
- Purchase extra credits flow.
- Upgrade/Downgrade workflow.

#### API Endpoints
None (Frontend only).

#### Database Changes
None.

#### Frontend Pages/Components
- `/subscription` page.
- Plan Comparison component.
- Usage Graph component.

#### Acceptance Criteria
1. Users can seamlessly compare plans.
2. The UI accurately reflects real-time credit balances and subscription states.
3. Users can initiate upgrades and purchases.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F08.U001 | Plan Render | Render plan table | Plan data array | Renders N columns | Low |
| P13.F08.U002 | Current Plan Highlight | Highlight active plan | ActivePlan=PREMIUM| Premium column highlighted | Low |
| P13.F08.U003 | Balance Format | Format balance display | credits: 15 | Displays "15 Credits" | Low |
| P13.F08.U004 | Upgrade Action | Trigger upgrade | click PREMIUM | Calls checkout callback | Medium |
| P13.F08.U005 | History Render | Render usage history | usage array | Renders list items | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P13.F08.I001 | Dashboard Mount | Load subscription page | Mock API responses | Mount component | Displays accurate sub data | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P13.F08.E001 | Upgrade Flow | User upgrades plan | Navigate plans -> Buy | Success modal, dashboard updates | High |
| P13.F08.E002 | Buy Credits | User buys +5 credits | Click +5 -> Buy | Balance increases by 5 | High |


## Modularity Checklist
- [x] All business logic in service layer (not controllers)
- [x] No cross-module direct database access
- [x] Shared types used from @repo/types
- [x] Validation schemas in @repo/validation
- [x] Module can be extracted to microservice without code changes in other modules
- [x] All dependencies injected, not imported directly
- [x] Feature flags / config for optional features

## Upgrade Path
This phase lays the foundation for real payment gateway integration in the future. The pluggable billing adapter allows for zero-friction swapping to Stripe/PayPal when the platform exits beta.

## Definition of Done
- Entitlement engine completely enforces plan limits across APIs and WS.
- Credit and subscription lifecycle management is fully tested.
- Frontend properly hides/shows features based on entitlements.
- All unit, integration, and E2E tests are passing.
- Pluggable billing interface is established and mock-tested.


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 24: Subscription Plans](../specs/24-subscription-plans.md)
- [Spec 25: Entitlement Engine](../specs/25-entitlement-engine.md)
- [Spec 26: AI Credits & Billing](../specs/26-ai-credits-billing.md)
- [Spec 30: Billing Audit & Refund Engine](../specs/30-billing-refund-system.md)

### Key Team Role Guidelines
- [Backend Engineer](../roles/16-backend-engineer.md) — Features 13.1, 13.2, 13.3, 13.4, 13.5
- [Frontend Engineer](../roles/15-frontend-engineer.md) — Feature 13.8
- [Business Analyst](../roles/05-business-analyst.md) — Plan & credit model definitions

### Operational Standards & Guides
- [Third-Party Integrations](../guides/16-third-party-integrations.md)
- [API Reference Catalog](../guides/02-api-reference.md)