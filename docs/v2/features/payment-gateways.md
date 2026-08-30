# Feature / Patch: Real Payment Gateway Adapters (Razorpay & Stripe)

## 1. Purpose
This deliverable implements production-grade payment gateway adapters (Razorpay for INR / India and Stripe for USD / EUR / Global) behind the existing `BillingAdapter` interface. It provides multi-currency gateway routing, priority fallback, AES-256 encrypted credential storage, and authoritative webhook signature verification as the single source of truth for payment confirmation.

## 2. Current State
Verified against the codebase:
- `billing-adapter.interface.ts` already defines the pluggable interface: `createCheckoutSession`, `verifyPayment`, and `processRefund`.
- `mock-billing.adapter.ts` provides a functional mock adapter used in Phase 13 for testing and development.
- `billing.service.ts` dispatches checkouts and refunds through `this.adapter`.
- **The Concrete Gap**: No real payment gateway adapters (Razorpay, Stripe, PayPal) are implemented. All transactions currently run through the mock adapter. Gateway API credentials, webhook endpoints, and cryptographic signature verifiers do not exist.

## 3. Problem / Requirement
Monetization and live payments require real financial gateway integrations:
- Must support **Razorpay** as the primary gateway for India / INR transactions (supporting UPI, Netbanking, Credit/Debit Cards, EMI).
- Must support **Stripe** as the primary gateway for International / USD / EUR / GBP transactions (supporting Cards, Apple Pay, Google Pay).
- Gateway Selection Strategy: Gateway should be automatically selected by transaction currency or configured by Admin priority.
- Webhook-First Authority: Payment success must NEVER be trusted from browser client redirects alone. The server must verify HMAC-SHA256 webhook signatures before provisioning enrollments, subscriptions, or credits.
- Credential Security: Gateway API Keys and Webhook Secrets must be stored with AES-256 encryption in the database and NEVER exposed to frontend clients.

## 4. Proposed Solution
1. Implement `RazorpayBillingAdapter` in `apps/api/src/services/billing/razorpay.adapter.ts` implementing `BillingAdapter`.
2. Implement `StripeBillingAdapter` in `apps/api/src/services/billing/stripe.adapter.ts` implementing `BillingAdapter`.
3. Create `GatewayRouter` in `apps/api/src/services/billing/gateway-router.ts` that routes transactions to Razorpay (for INR) and Stripe (for USD/other), with `MockBillingAdapter` fallback for local dev/testing.
4. Implement dedicated webhook endpoint `POST /api/v1/billing/webhooks/:gateway` verifying cryptographic signatures (`x-razorpay-signature` / `stripe-signature`) before completing orders.
5. Add Payment Gateway Configuration subtab in `SettingsPage.tsx` for Admins.

## 5. User Experience
- **Student Checkout**: When clicking "Proceed to Checkout", the student is seamlessly redirected to Razorpay Standard Checkout (modal with UPI QR/Netbanking) or Stripe Hosted Checkout (Card/Apple Pay) matching their currency.
- **Order Confirmation**: Upon payment completion, student is returned to the success page while the server asynchronously verifies the webhook and unlocks the purchased items in < 1 second.

## 6. Admin Experience
- **Payment Settings Workbench**: In Settings, Admins can:
  - Toggle Razorpay and Stripe active/inactive.
  - Enter API Key ID, Secret Key, and Webhook Secret (masked with AES-256 encryption).
  - Set default gateway per currency (INR -> Razorpay, USD -> Stripe).
  - Test live connection with a "Verify Gateway Connection" button.
- **Financial Audit View**: Admins can inspect gateway transaction IDs, webhook delivery logs, and trigger full or partial refunds directly from the ExamOS dashboard.

## 7. Technical Architecture
- **Adapter Boundary**: Both adapters implement `BillingAdapter`:
  ```typescript
  export interface BillingAdapter {
    readonly name: string;
    createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult>;
    verifyPayment(gatewayPaymentId: string): Promise<boolean>;
    processRefund(params: RefundParams): Promise<RefundResult>;
    handleWebhook?(rawBody: Buffer, signature: string): Promise<WebhookEventResult>;
  }
  ```
- **Webhook Processing Pipeline**:
  1. Gateway posts event to `POST /api/v1/billing/webhooks/:gateway`.
  2. Middleware preserves raw buffer body for HMAC verification.
  3. Adapter verifies signature with stored encrypted secret.
  4. On `payment.captured` (Razorpay) or `checkout.session.completed` (Stripe), dispatches fulfillment to `SubscriptionService` or `CourseCommerceService`.
  5. Records transaction in `invoices` and `audit_logs`.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data model:
- `payment_gateway_configs`: `id`, `gatewayName` (`RAZORPAY` | `STRIPE` | `MOCK`), `isActive`, `isDefault`, `supportedCurrencies` (string[]), `encryptedKeyId`, `encryptedKeySecret`, `encryptedWebhookSecret`, `environment` (`TEST` | `LIVE`), `updatedAt`, `updatedBy`.

## 9. API
- `POST /api/v1/billing/webhooks/razorpay` (Public / Webhook Signature Verified) — Razorpay webhook receiver.
- `POST /api/v1/billing/webhooks/stripe` (Public / Webhook Signature Verified) — Stripe webhook receiver.
- `GET /api/v1/billing/gateways/config` (Auth: Admin / `billing.manage`) — Returns masked gateway configs.
- `PUT /api/v1/billing/gateways/config` (Auth: Admin / `billing.manage`) — Update gateway credentials.
- `POST /api/v1/billing/gateways/test-connection` (Auth: Admin) — Verifies gateway API connectivity.

## 10. Frontend
- **Components**:
  - `PaymentGatewaySettings.tsx`: Admin gateway configuration panel in `SettingsPage.tsx` with credential inputs and connection test buttons.
  - `PaymentMethodSelector.tsx`: Checkout modal payment method switcher (UPI / Cards / Netbanking).

## 11. AI / External Services
- **External APIs**: Razorpay REST API (`api.razorpay.com/v1`) and Stripe API (`api.stripe.com/v1`).
- **Resilience**: Exponential backoff retries for gateway API calls, circuit breaker on repeated timeout failures.

## 12. Permissions / Entitlements
- **Configuration**: Strictly restricted to `MAIN_ADMIN` and `SUB_ADMIN` with `billing.manage`.
- **Checkout & Webhooks**: Webhooks authenticated via HMAC signature; checkout requires authenticated student.

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If `featureKey: 'billing_gateway'` is in maintenance, checkout initiation is paused and displays a clear notice, while incoming webhooks are still received and queued to prevent lost payments.

## 14. Import / Export
- Gateway transaction history exportable as CSV in `json-import-export.md`. Secrets are NEVER exported.

## 15. Edge Cases
- Webhook arrives before student redirect: Idempotent processing ensures duplicate webhook events are ignored safely.
- Webhook signature mismatch / spoofing attempt: Request rejected immediately with HTTP 400 `INVALID_WEBHOOK_SIGNATURE` and security alert logged.
- Partial refund on multi-item purchase: Refund engine tracks original gateway transaction ID and decrements remaining refundable balance.

## 16. Test Cases
- **Unit (GATE-U001)**: HMAC-SHA256 signature verification validates authentic test signatures and rejects altered payloads.
- **Unit (GATE-U002)**: Currency router selects Razorpay for INR and Stripe for USD.
- **API (GATE-A001)**: `POST /api/v1/billing/webhooks/razorpay` with valid signature returns HTTP 200 and fulfills order.
- **API (GATE-A002)**: Webhook with invalid signature returns HTTP 400 and rejects fulfillment.
- **Integration (GATE-I001)**: Refund initiated via `POST /api/v1/billing/refund` calls Stripe/Razorpay refund API and records clawback in database.
- **Failure (GATE-F001)**: Gateway timeout triggers fallback or polite retry message to user without double-charging.

## 17. Acceptance Criteria
- [ ] `RazorpayBillingAdapter` implemented behind `BillingAdapter` interface.
- [ ] `StripeBillingAdapter` implemented behind `BillingAdapter` interface.
- [ ] HMAC signature verified webhook endpoints for both gateways.
- [ ] Dynamic currency routing (INR -> Razorpay, USD -> Stripe).
- [ ] AES-256 encrypted credential management in Admin Settings.

## 18. Dependencies
- `apps/api/src/services/billing/billing-adapter.interface.ts`
- `apps/api/src/services/billing.service.ts`
- Course Commerce (`features/course-commerce.md`)

## 19. Future Improvements
- Local payment methods (UPI AutoPay for recurring INR subscriptions).
- PayPal / Mollie / PayU regional adapter add-ons.
