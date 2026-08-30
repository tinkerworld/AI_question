# Feature: Audience & Contact Segmentation

## 1. Purpose
The Audience & Contact Segmentation engine enables administrators and educators to construct dynamic, rule-based student cohorts based on academic performance, course enrollment, subscription tier, activity recency, and communication consent. It provides live cohort size calculations, saved audience filters, CSV/JSON exports with audit logging, and strict privacy/anti-spam compliance.

## 2. Current State
Verified against the codebase:
- `user.routes.ts` supports basic user listing with role filtering (`role=STUDENT`).
- No audience segmentation, query builder, dynamic cohort grouping, or targeted communication query engine exists in the monorepo.
- No user communication consent tracking or export audit trails exist.

## 3. Problem / Requirement
Institutions need to segment their student base for targeted academic interventions, progress tracking, and communication campaigns:
- **Academic Interventions**: E.g. "Students enrolled in UPSC Course with Mastery < 50% in Polity who haven't taken a test in 7 days".
- **Monetization & Marketing**: E.g. "Students on Free Tier who completed >= 2 mock tests and have active study streaks".
- **Compound Rule Logic**: Support AND/OR combinations across multiple dimensions (Role, Course, Subject, Mastery Band, Purchase History, Subscription Status, Last Active Date, Communication Opt-in).
- **Privacy & Compliance**: Must respect user communication consent preferences and enforce strict role gating and export auditing—never serve as an unrestricted personal data dump.

## 4. Proposed Solution
1. Create `audience_segments` and `audience_rules` data models.
2. Implement `AudienceSegmentationService` in `apps/api/src/services/audience.service.ts` that compiles structured filter rules into parameterized SQL queries.
3. Build an Audience Query Builder UI with live count estimation ("Estimated Audience: 142 students").
4. Provide secure, audit-logged CSV/JSON export with field selection and PII masking options.
5. Integrate with Promotional Coupons (`coupon-system.md`) and Notifications (`notifications.md`).

## 5. User Experience
- (Student): Experience targeted announcements and relevant remedial recommendations without receiving spam. Students can toggle their communication consent flags in their Profile settings.

## 6. Admin Experience
- **Audience Workbench**: In User Management (`UsersPage.tsx`) or a dedicated Audience subtab, Admins can build custom segments using an intuitive visual condition builder:
  - `Course`: Equals "IELTS Academic Masterclass"
  - `AND` `Mastery Score`: Less than 65%
  - `AND` `Last Activity`: More than 14 days ago
  - `AND` `Consent`: Promotional / Remedial Communication = true
- **Live Preview & Export**: Admin clicks "Preview Match" to see matched student count and sample anonymized rows, saves the segment as "At-Risk IELTS Candidates", or exports a CSV with audit logging.

## 7. Technical Architecture
- **Service**: `apps/api/src/services/audience.service.ts`.
- **Query Compiler**: Translates JSON rule trees into parameterized SQL `WHERE` clauses with strict column whitelisting to prevent SQL injection:
  ```typescript
  export interface AudienceRuleGroup {
    combinator: 'AND' | 'OR';
    rules: Array<AudienceRule | AudienceRuleGroup>;
  }
  ```
- **Audit Logging**: Every export action writes to `audit_logs` capturing `actorUserId`, `segmentId`, `matchedCount`, `exportedFields`, and timestamp.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `audience_segments`: `id`, `name`, `description`, `ruleDefinition` (JSON), `isDynamic`, `lastCalculatedCount`, `createdBy`, `createdAt`, `updatedAt`.
- `segment_export_logs`: `id`, `segmentId`, `actorUserId`, `exportFormat` (`CSV` | `JSON`), `recordCount`, `createdAt`.

## 9. API
- `POST /api/v1/audiences/preview` (Auth: Admin / `audience.manage`) — Evaluates rule group and returns count + sample.
- `POST /api/v1/audiences` (Auth: Admin / `audience.manage`) — Save a named audience segment.
- `GET /api/v1/audiences` (Auth: Admin / `audience.manage`) — List saved segments with matched counts.
- `GET /api/v1/audiences/:id/export` (Auth: Admin / `audience.export`) — Download CSV/JSON with audit log.

## 10. Frontend
- **Components**:
  - `AudienceQueryBuilder.tsx`: Visual condition row editor with dropdowns for field, operator, and value.
  - `AudienceManagerPage.tsx`: Saved segments library with quick actions (Preview, Export, Broadcast).
  - `AudiencePreviewTable.tsx`: Live matched student preview drawer.

## 11. AI / External Services
- None required.

## 12. Permissions / Entitlements
- **Management**: Restricted to `MAIN_ADMIN` and `SUB_ADMIN` with `audience.manage`.
- **Exporting PII**: Gated on elevated permission `audience.export`.
- **Consent Enforcement**: Always excludes users who have set `communicationPreferences.marketing = false` when generating marketing segments.

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If in maintenance, query execution returns cached count estimates.

## 14. Import / Export
- Segment rule definitions exportable in `json-import-export.md`.

## 15. Edge Cases
- Complex recursive nested rule groups: Query compiler enforces max nesting depth of 3 levels to prevent exponential query plans.
- Segment query matches 0 students: UI clearly indicates "0 users matched your criteria" with suggestions to widen filters.

## 16. Test Cases
- **Unit (AUD-U001)**: Query compiler converts JSON rule tree to valid parameterized SQL with zero string concatenation.
- **API (AUD-A001)**: `POST /api/v1/audiences/preview` returns correct count for enrolled active students.
- **API (AUD-A002)**: Requesting export without `audience.export` permission returns HTTP 403 `PERMISSION_DENIED`.
- **Integration (AUD-I001)**: Exporting audience records an immutable entry in `segment_export_logs` and `audit_logs`.
- **Privacy (AUD-P001)**: Users with `optOut = true` are strictly filtered out from promotional audience queries.

## 17. Acceptance Criteria
- [ ] Visual compound rule builder (AND/OR logic across academic, activity, and billing criteria).
- [ ] Parameterized SQL query compilation with SQL-injection safety.
- [ ] Live matched count preview.
- [ ] Export to CSV/JSON with full audit trail logging.
- [ ] Privacy and communication consent filters enforced.

## 18. Dependencies
- `@repo/permissions`
- `apps/api/src/services/analytics.service.ts`
- Promotional Coupon Engine (`features/coupon-system.md`)

## 19. Future Improvements
- Automated trigger actions (e.g. automatically send a practice notification when a student enters a segment).
- Lookalike cohort suggestions based on learning velocity.
