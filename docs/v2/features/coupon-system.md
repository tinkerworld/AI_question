# Feature: Promotional Coupon Engine

## 1. Purpose
The Promotional Coupon Engine provides a flexible discounting system for subscriptions, individual course purchases, and AI credit packs. It supports percentage and fixed discounts, redemption limits (global and per-user), scoping (all products, specific courses, or target audiences), expiration dates, minimum purchase thresholds, and complete financial audit logging.

## 2. Current State
Verified against the codebase:
- No coupon model, verification routes, discount calculation logic, or redemption tracking tables exist anywhere in the monorepo.
- `billing.service.ts` processes fixed prices for subscriptions and credit packages without discount hooks.

## 3. Problem / Requirement
Monetization requires promotional campaigns (e.g. early bird discounts, festival sales, institutional partner codes, targeted recovery codes for disengaged students):
- Need multiple discount types: Percentage off (e.g., `20% OFF` with optional maximum discount cap) and Fixed amount off (e.g., `₹500 OFF`).
- Need strict scoping: Valid for all products, specific courses only, subscription upgrades only, or restricted to a specific audience segment.
- Need fraud prevention: Expiry dates, maximum global redemptions, maximum redemptions per user (e.g. 1 per student), and minimum cart spend.
- Need auditability: Every redemption must be recorded in financial logs with original amount, discount applied, and net invoiced amount.

## 4. Proposed Solution
1. Introduce `coupons` and `coupon_redemptions` database concepts and service `apps/api/src/services/commerce/coupon.service.ts`.
2. Provide coupon validation pipeline checking:
   - `isActive` flag.
   - Date range validity (`startsAt <= NOW() <= expiresAt`).
   - Global usage counter (`usedCount < maxUses`).
   - Per-user redemption limit (`COUNT(redemptions WHERE userId = X) < perUserLimit`).
   - Product scope match (coupon allowed on target `courseId` or `planCode`).
   - Minimum spend requirements.
3. Integrate into `CourseCommerceService` and `BillingService` checkout pipelines.
4. Build an Admin Coupon Manager workbench and a frontend coupon validation input in checkout modals.

## 5. User Experience
- **Checkout Modal**: Student enters coupon code (e.g. `WELCOME20`) and clicks "Apply".
- **Real-Time Validation**: Code is verified instantly via API, displaying a green success tag (e.g. `✓ WELCOME20 applied: -₹1,000 off`) and updating the total payable amount, or an informative error (e.g. `Coupon expired` or `Minimum order value of ₹2,000 required`).

## 6. Admin Experience
- **Coupon Dashboard**: Admins view active coupons, redemption counts, total discount given, and generated revenue.
- **Coupon Creator Modal**: Step-by-step wizard to set code, discount type/value, start/end dates, max global uses, per-user limit, eligible courses/plans, and optional audience segment restriction.

## 7. Technical Architecture
- **Service**: `apps/api/src/services/commerce/coupon.service.ts`.
- **Validation Pipeline**: Pure calculation function returning `{ isValid, discountAmount, finalAmount, reason }`.
- **Concurrency Safety**: Atomic database updates on coupon usage counters (`UPDATE coupons SET "usedCount" = "usedCount" + 1 WHERE id = $1 AND "usedCount" < "maxUses"`) to prevent race conditions.
- **Auditing**: Every redemption permanently recorded in `coupon_redemptions` linked to the resulting `invoices` row.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `coupons`: `id`, `code` (UNIQUE, uppercase), `discountType` (`PERCENTAGE` | `FIXED`), `discountValue`, `maxDiscountAmount`, `minOrderAmount`, `currency`, `maxUses` (null = unlimited), `usedCount`, `perUserLimit`, `startsAt`, `expiresAt`, `scope` (`GLOBAL` | `COURSE` | `SUBSCRIPTION` | `AUDIENCE`), `scopedItemIds` (string[]), `isActive`, `createdAt`, `createdBy`.
- `coupon_redemptions`: `id`, `couponId`, `userId`, `orderId`, `invoiceId`, `discountApplied`, `redeemedAt`.

## 9. API
- `POST /api/v1/coupons/validate` (Auth: Student) — Dry-run validation of code against cart payload.
- `GET /api/v1/coupons` (Auth: Admin / `billing.manage`) — List all coupons with stats.
- `POST /api/v1/coupons` (Auth: Admin / `billing.manage`) — Create coupon code.
- `PATCH /api/v1/coupons/:id` (Auth: Admin / `billing.manage`) — Toggle active or edit limits.

## 10. Frontend
- **Components**:
  - `CouponInput.tsx`: Reusable input field with inline validation, apply button, and clear action.
  - `CouponManagerPage.tsx`: Admin management table with usage progress bars and creator modal.

## 11. AI / External Services
- None required.

## 12. Permissions / Entitlements
- **Management**: Gated strictly on `billing.manage` or `MAIN_ADMIN` / `SUB_ADMIN`.
- **Redemption**: Any authenticated `STUDENT` or staff.

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If `featureKey: 'coupons'` is in maintenance, checkout continues at regular price with a message indicating promo codes are temporarily unavailable.

## 14. Import / Export
- Bulk coupon creation and export via `json-import-export.md` for distribution via marketing channels.

## 15. Edge Cases
- Two checkout requests submit the final available redemption simultaneously: Atomic DB query prevents over-redemption.
- Discount exceeds total order amount: Final amount floored at 0.00 (or minimal gateway transaction floor).
- Coupon applied to multi-item cart where only 1 item is eligible: Discount calculates only against eligible item subtotal.

## 16. Test Cases
- **Unit (COUP-U001)**: 20% discount on ₹5,000 calculates to ₹1,000 discount with ₹4,000 final amount.
- **Unit (COUP-U002)**: Max discount cap of ₹500 restricts a 50% discount on ₹2,000 to ₹500.
- **API (COUP-A001)**: Expired coupon code returns HTTP 400 `COUPON_EXPIRED`.
- **API (COUP-A002)**: User attempting a second redemption on a 1-use-per-user coupon returns 400 `USAGE_LIMIT_EXCEEDED`.
- **Integration (COUP-I001)**: Successful checkout records immutable row in `coupon_redemptions`.
- **UI (COUP-UI001)**: Frontend coupon input converts text to uppercase automatically.

## 17. Acceptance Criteria
- [ ] Percentage and fixed discount calculations with min spend and max cap.
- [ ] Global and per-user redemption limit enforcement.
- [ ] Product and course scoping rules.
- [ ] Atomic concurrency-safe usage increments.
- [ ] Admin management workbench and financial audit tracking.

## 18. Dependencies
- Course Commerce (`features/course-commerce.md`)
- `apps/api/src/services/billing.service.ts`
- Audience Segmentation (`features/audience-segmentation.md`)

## 19. Future Improvements
- Referral Program coupons (auto-generated student referral codes with revenue share).
- Dynamic auto-applying cart coupons (e.g. automatic 10% off for new students).
