# Feature: Course Creation & Commerce

## 1. Purpose
The Course Commerce system treats academic courses as first-class commercial products. It enables institutions and educators to configure multi-currency pricing (explicit per-currency pricing without volatile live exchange rate dependencies), promotional sale prices, access durations (lifetime vs. fixed-day expiry), coupon integration, and seamless enrollment upon verified checkout. The commerce engine is designed polymorphically to support future products (such as mock test packs, vocabulary packs, and bundle offerings) through a unified payment and checkout pipeline.

## 2. Current State
Verified against the codebase:
- The `courses` database table stores academic hierarchy data (`name`, `code`, `description`, `status`).
- `enrollments` links `userId` to `courseId` with status (`ACTIVE`, `COMPLETED`, `DROPPED`).
- `billing.service.ts` and `SubscriptionService` handle recurring subscriptions and AI credit top-up packages.
- **The Concrete Gap**: No course-level pricing, currency configurations, commercial SKUs, sale pricing, or individual course checkout mechanisms exist. Courses cannot be sold as standalone one-time purchases.

## 3. Problem / Requirement
Institutions need to monetize specific courses individually (e.g., "UPSC Mains 2027 Masterclass for ₹14,999" or "IELTS Speaking Intensive for $49") in addition to platform-wide subscriptions:
- Need explicit admin-defined pricing per currency (e.g. INR ₹, USD $, EUR €, GBP £) rather than live auto-conversion, ensuring predictable regional pricing.
- Need flexible access durations: Lifetime access or Fixed Duration (e.g. 90 days / 180 days access from purchase date).
- Need unified checkout flow integrating with the existing `BillingAdapter` interface and promotional coupon engine.
- Need automated enrollment provisioning upon verified payment webhook receipt.

## 4. Proposed Solution
1. Introduce a polymorphic Product layer in the commerce domain: `products` (linked to `courseId` or standalone product type) and `product_prices` (storing per-currency pricing).
2. Extend `BillingService` and `BillingAdapter` to handle `itemType: 'COURSE_PURCHASE'`.
3. Build an automated order fulfillment handler that activates an `enrollments` row with `validUntil` expiration upon payment confirmation.
4. Upgrade `CoursesPage.tsx` and create a public Course Catalog / Detail view with pricing cards and instant checkout modals.

## 5. User Experience
- **Course Catalog**: Students browse available courses, viewing pricing tags in their local currency (e.g., `₹4,999` or `$59`), discount badges (e.g. `20% OFF`), syllabus overview, and included practice tests/interviews.
- **Checkout Modal**: One-click "Enroll Now" opens a checkout drawer showing order summary, optional coupon entry field, payment method selection, and total payable amount.
- **Instant Access**: Upon payment completion, the student is instantly redirected to the course dashboard with active enrollment.

## 6. Admin Experience
- **Course Pricing Tab**: In the Academic Structure workbench (`CoursesPage.tsx`), teachers/admins configure the commercial status (`FREE` vs. `PAID`), set regular price and sale price across multiple currencies, define access duration (Lifetime or $N$ days), and toggle coupon eligibility.
- **Sales Analytics**: Admins view course sales volume, gross revenue, active enrollments, and refund requests.

## 7. Technical Architecture
- **Service**: `apps/api/src/services/commerce/course-commerce.service.ts`.
- **Fulfillment Engine**: Listens to verified checkout webhooks dispatched by `BillingService`. On `itemType: 'COURSE_PURCHASE'`, it:
  1. Creates an immutable `invoices` and `orders` record.
  2. Inserts or updates `enrollments` with `status: 'ACTIVE'` and calculated `validUntil` timestamp.
  3. Records financial audit log.
- **Polymorphic Product Schema**: Product table supports `productType: 'COURSE' | 'MOCK_TEST_PACK' | 'VOCAB_PACK' | 'BUNDLE'`, allowing future items to reuse this exact billing pipeline.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `products`: `id`, `productType`, `referenceId` (e.g. `courseId`), `title`, `description`, `isPublished`, `accessDurationDays` (null = lifetime), `allowCoupons`, `createdAt`.
- `product_prices`: `id`, `productId`, `currency` (e.g. `INR`, `USD`, `EUR`), `regularPrice`, `salePrice`, `isActive`.
- `orders`: `id`, `orderNumber`, `userId`, `productId`, `currency`, `subtotal`, `discountAmount`, `taxAmount`, `totalAmount`, `couponId`, `status` (`PENDING`, `PAID`, `REFUNDED`, `FAILED`), `gatewayPaymentId`, `createdAt`.

## 9. API
- `GET /api/v1/commerce/courses` (Auth: Public / Optional Bearer) — List published courses with regional pricing.
- `GET /api/v1/commerce/courses/:id` (Auth: Public / Optional Bearer) — Course product detail with syllabus summary.
- `POST /api/v1/commerce/checkout` (Auth: Student) — Initiates checkout session with optional coupon.
- `PUT /api/v1/commerce/courses/:id/pricing` (Auth: Admin / `courses.update`) — Update pricing and currencies.

## 10. Frontend
- **Components**:
  - `CourseProductCard.tsx`: Course card with pricing tag, sale badge, and enroll trigger.
  - `CourseCheckoutModal.tsx`: Checkout drawer with coupon input and payment gateway trigger.
  - `CoursePricingEditor.tsx`: Admin multi-currency price table inside course editor.

## 11. AI / External Services
- Integrates with Real Payment Gateways (`payment-gateways.md`) via the `BillingAdapter` interface.

## 12. Permissions / Entitlements
- **Pricing Management**: `courses.update` / `billing.manage`.
- **Course Purchase**: Authenticated `STUDENT` or staff.
- **Entitlements**: Course purchase grants enrolled access independent of subscription tier (a `FREE` plan student who buys a specific course gets full access to that course's content).

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If `featureKey: 'course_commerce'` is in maintenance, checkout buttons display a notice while free course access continues operating normally.

## 14. Import / Export
- Course pricing definitions and multi-currency structures exportable in `json-import-export.md`.

## 15. Edge Cases
- Student buys a course they are already actively enrolled in: System detects active enrollment and prompts user or extends access duration additively.
- Price mismatch during checkout: Server verifies database price at moment of transaction creation to prevent frontend tampering.

## 16. Test Cases
- **Unit (COMM-U001)**: `CourseCommerceService.calculateTotal()` correctly applies sale price and valid coupon discount.
- **API (COMM-A001)**: `POST /api/v1/commerce/checkout` generates valid checkout URL for Razorpay/Stripe.
- **API (COMM-A002)**: Accessing course content with expired `validUntil` returns 403 `ENROLLMENT_EXPIRED`.
- **Integration (COMM-I001)**: Webhook completion triggers active enrollment record creation.
- **UI (COMM-UI001)**: Course card displays currency matching user locale preference.
- **Entitlement (COMM-E001)**: Student enrolled in paid course bypasses plan paywalls for that specific course's exams.

## 17. Acceptance Criteria
- [ ] Course-as-a-Product model with multi-currency pricing.
- [ ] Sale price and access duration configurations.
- [ ] Automated enrollment fulfillment upon payment webhook confirmation.
- [ ] Coupon integration at checkout.
- [ ] Comprehensive test coverage across checkout and expiration workflows.

## 18. Dependencies
- `apps/api/src/services/billing.service.ts`
- Real Payment Gateways (`features/payment-gateways.md`)
- Promotional Coupon Engine (`features/coupon-system.md`)

## 19. Future Improvements
- Course Bundles (buy Course A + Course B together at a 25% discount).
- Automated installment / EMI payment split options.
