# Feature / Patch: Premium Entitlements, Feature Registry & Guardrails

## 1. Purpose
This deliverable extends the existing `@repo/entitlement-engine` package by adding a centralized **Dynamic Feature Registry**, an **Admin Entitlement Configuration Workbench**, **Date-Based Promotional Access** ("Free access to all IELTS tests until Dec 31"), and a standardized frontend **Premium Guardrail & Teaser Component** (`<PremiumGuardrail />`) providing elegant blurred previews and upgrade call-to-action cards.

## 2. Current State
Verified against the codebase:
- `@repo/entitlement-engine` is a fully functional, pure TypeScript package with `FREE`, `PREMIUM`, `PREMIUM_PLUS` tier definitions, numeric quota rules (e.g. `mock_tests`, `ai_interview_daily`, `daily_ai_credits`), and boolean feature gates (e.g. `full_assessment`, `personalized_practice`, `custom_topic`).
- `entitlement.service.ts` evaluates effective plans and integrates with `PreviewConfigurationModal.tsx` for simulating student plan tiers in staff preview sessions.
- **The Concrete Gaps**:
  1. Entitlement rules and plan definitions are statically hardcoded in TypeScript files (`BASELINE_PLAN_CONFIGS`); there is no Admin UI to dynamically adjust plan quotas or add new feature keys.
  2. No date-based promotional access mechanism exists (e.g., granting temporary free access to a premium course/feature until a set date without modifying the user's permanent plan).
  3. No standardized frontend guardrail component exists: premium-locked features either fail abruptly or hide buttons entirely, lacking a standardized "blurred preview with upgrade teaser" UX.

## 3. Problem / Requirement
Monetization and product management require dynamic operational control over feature access:
- **Centralized Feature Registry**: Admins must be able to define new feature keys (e.g. `speaking_analysis`, `vocab_drills`, `ai_essay_grader`) with default types (BOOLEAN or NUMBER) and description metadata.
- **Dynamic Plan Rule Matrix**: Ability to adjust tier allowances (e.g. increase Free daily interviews from 1 to 2) in the database without code redeployments.
- **Date-Based Promotional Access**: Support promotional campaigns (e.g., "Full assessment free for all students during National Exam Week until Oct 15").
- **Premium Guardrail / Teaser UX**: When a student encounters a premium feature (such as detailed AI writing feedback or deep analytics), they should see a blurred preview teaser with an "Upgrade to Unlock" card rather than an empty page or abrupt error.

## 4. Proposed Solution
1. Introduce `feature_registry` and `plan_entitlement_rules` database models to store dynamic rules overriding `@repo/entitlement-engine` baselines.
2. Extend `EntitlementEngine.evaluateEntitlement()` with:
   - Date-based promotional rule checks (`promotional_access_rules`).
   - Dynamic database rule overrides with caching.
3. Build the `<PremiumGuardrail>` React component:
   - Props: `requiredPlan`, `featureKey`, `fallbackPreview`, `blurAmount`.
   - Wraps premium content, evaluating the active user's plan.
   - If allowed: Renders children normally.
   - If locked: Renders blurred children with overlay upgrade banner linking to `/subscription`.
4. Add an "Entitlements & Feature Registry" subtab in `SettingsPage.tsx`.

## 5. User Experience
- **Student (Free Tier)**:
  - On the Interview or Writing scorecard, the student sees their overall score clearly.
  - The detailed "Deep AI Diagnostic Breakdown" section is softly blurred with an overlay card: *"🔒 Detailed Rubric Diagnostics are a Premium Feature. Upgrade to Scholar Plan to unlock instant sentence-by-sentence feedback."* with a direct "Upgrade Now" button.
- **Student (Promotional Window)**:
  - During a promotional campaign, the student sees a top ribbon: *"🎉 Promotional Access Active: Full diagnostics are FREE until Oct 15!"* and accesses premium features seamlessly.

## 6. Admin Experience
- **Feature Registry Workbench**: In Settings -> Entitlements:
  - Admins view the interactive matrix of all registered features against tiers (`FREE`, `PREMIUM`, `PREMIUM_PLUS`).
  - Admins can edit numerical limits, toggle boolean flags, or create a new Feature Key.
  - Admins can launch a "Promotional Free Window" specifying feature key, target course, and expiration date.
- **Staff Preview Integration**: Leverages existing Preview Mode (`PreviewConfigurationModal.tsx`) to test how the UI renders for Free vs Premium students.

## 7. Technical Architecture
- **Package Extended**: `@repo/entitlement-engine` retains its pure, zero-dependency calculation core.
- **Database Storage**: Dynamic rule rows are cached in Redis / in-memory memory map (1-minute TTL) in `apps/api/src/services/entitlement.service.ts`.
- **Evaluation Precedence**:
  1. Staff / Preview Simulated Plan (highest precedence).
  2. Active Promotional Date Access (`validUntil >= NOW()`).
  3. Database Plan Override Rules.
  4. Baseline Hardcoded Plan Configs (`BASELINE_PLAN_CONFIGS`).

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `feature_registry`: `id`, `key` (UNIQUE), `name`, `type` (`BOOLEAN` | `NUMBER`), `defaultValue`, `category`, `description`, `createdAt`.
- `plan_entitlement_rules`: `id`, `planCode`, `featureKey`, `value` (string: `'true'`, `'false'`, or `'5'`), `updatedBy`, `updatedAt`.
- `promotional_entitlement_rules`: `id`, `featureKey`, `courseId` (nullable), `startsAt`, `expiresAt`, `isActive`, `description`.

## 9. API
- `GET /api/v1/entitlements/features` (Auth: Authenticated) — List registered features and descriptions.
- `GET /api/v1/entitlements/matrix` (Auth: Admin / `subscriptions.manage`) — Full plan vs feature matrix.
- `PUT /api/v1/entitlements/rules` (Auth: Admin / `subscriptions.manage`) — Update rule value for a plan.
- `POST /api/v1/entitlements/promotions` (Auth: Admin / `subscriptions.manage`) — Create date-based promo window.
- `GET /api/v1/entitlements/my-status` (Auth: Authenticated) — Returns current caller's evaluated feature map.

## 10. Frontend
- **Components**:
  - `PremiumGuardrail.tsx`: High-reusability blur & paywall overlay container in `apps/web/src/components/entitlements/PremiumGuardrail.tsx`.
  - `FeatureMatrixEditor.tsx`: Admin interactive grid for editing tier allowances.
  - `PromotionalBanner.tsx`: Announcement ribbon for active free access windows.

## 11. AI / External Services
- None required.

## 12. Permissions / Entitlements
- **Matrix Administration**: Strictly gated on `MAIN_ADMIN` or `subscriptions.manage`.
- **Evaluation**: Any authenticated or guest user.

## 13. Maintenance Behaviour
- Self-governing; falls back to restrictive baseline rules if DB queries fail.

## 14. Import / Export
- Feature matrix definitions and rules exportable as JSON in `json-import-export.md`.

## 15. Edge Cases
- Promotional date expires while student is actively viewing page: The next navigation or API call gracefully prompts the upgrade guardrail without terminating the in-progress session abruptly.
- Negative numerical quota set by admin: Validation strictly enforces `value >= 0`.

## 16. Test Cases
- **Unit (ENT-U001)**: Promotional window with `expiresAt > NOW()` overrides a `false` plan rule to `true`.
- **Unit (ENT-U002)**: Expired promotional window falls back to normal user plan tier.
- **API (ENT-A001)**: `GET /api/v1/entitlements/my-status` returns consolidated permissions and quotas in < 10ms.
- **UI (ENT-UI001)**: `<PremiumGuardrail>` applies CSS blur filter to children when user is on `FREE` tier.
- **UI (ENT-UI002)**: Clicking "Upgrade" in guardrail modal routes user directly to `/subscription`.
- **Integration (ENT-I001)**: Admin modifying a rule in the matrix is reflected in student evaluation within 5 seconds.

## 17. Acceptance Criteria
- [ ] Centralized Feature Registry data model and service.
- [ ] Admin Entitlement Configuration Matrix UI in Settings.
- [ ] Date-based promotional access rule evaluation.
- [ ] Reusable `<PremiumGuardrail>` component with blurred preview state.
- [ ] Seamless integration with existing `@repo/entitlement-engine` and Preview Mode.

## 18. Dependencies
- `@repo/entitlement-engine`
- `apps/api/src/services/entitlement.service.ts`
- `apps/web/src/components/PreviewConfigurationModal.tsx`

## 19. Future Improvements
- Targeted user-specific entitlement overrides (e.g. scholarship grant to an individual student).
- Usage-based micro-billing hooks (e.g. pay $0.10 per extra AI interview).
