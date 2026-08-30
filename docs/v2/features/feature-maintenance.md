# Feature: Feature-Level & Global Maintenance System

## 1. Purpose
The Feature-Level & Global Maintenance System provides centralized, dynamic runtime control over platform availability. It allows administrators to toggle Global Maintenance Mode (putting the entire platform into a graceful maintenance state) or toggle Granular Feature Maintenance (disabling individual sub-modules such as AI Interview, Question Generation, Payment Gateways, or Practice Drills) with custom user messages, scheduled maintenance windows, and staff bypass privileges without requiring server redeployments.

## 2. Current State
Verified against the codebase:
- No maintenance mode entity, maintenance middleware, or feature toggle service exists anywhere in the monorepo.
- If an external dependency or database table is undergoing maintenance, user requests fail abruptly with 500/504 errors rather than returning a polite, structured maintenance notice.

## 3. Problem / Requirement
In a 24/7 online examination and learning platform:
- **Zero Hard Crashes During Upgrades**: Routine database indexing or third-party AI provider maintenance should not crash user sessions with raw error stacks.
- **Granular Feature Isolation**: If an external LLM vendor is experiencing downtime, the system should allow taking the AI Question Generation feature offline while keeping standard exam taking, results viewing, and courses 100% active.
- **Scheduled Maintenance Windows**: Ability to configure scheduled maintenance (e.g., "Sunday 02:00–04:00 UTC") with advance countdown banners displayed to active users.
- **Staff Bypass**: Administrators and supervising teachers must be able to bypass maintenance mode to verify system health before opening the platform to students.

## 4. Proposed Solution
1. Create `maintenance_configs` table and `MaintenanceService` in `apps/api/src/services/maintenance.service.ts`.
2. Implement backend Express middleware `maintenanceGuard(featureKey?: string)`:
   - Checks if Global Maintenance is active.
   - Checks if specific `featureKey` is active.
   - If caller is staff (`MAIN_ADMIN` or `SUB_ADMIN`) with bypass permission, allows request through.
   - Otherwise, short-circuits request with HTTP 503 `SERVICE_UNAVAILABLE` and structured JSON `{ isMaintenance: true, message, estimatedEnd, featureKey }`.
3. Build a global `<MaintenanceBanner>` and feature fallback wrapper `<FeatureMaintenanceWrapper>` in the frontend.
4. Add a "System Maintenance & Feature Control" management workbench in `SettingsPage.tsx`.

## 5. User Experience
- **Granular Feature Maintenance**: If AI Interview is under maintenance, navigating to the Interview tab displays an informative, polite card: *"🔧 AI Interview is temporarily undergoing scheduled maintenance. Expected to resume at 04:00 UTC. Your past scorecards and standard exams remain available."*
- **Global Maintenance**: If global maintenance is activated, all public/student routes redirect to a branded, distraction-free Maintenance Screen with a live countdown timer.

## 6. Admin Experience
- **Maintenance Control Center**: Located in Admin Settings:
  - Global Maintenance Toggle with custom announcement input and estimated downtime selector.
  - Per-Feature Switchboard:
    - ⚡ AI Question Generation (`ai_generation`)
    - 🎙️ AI Oral Interview (`interview`)
    - 💳 Payment Gateways (`billing`)
    - 📝 Student Practice Drills (`practice`)
    - 📋 Exam Taking (`exam_taking`)
    - 🔐 Student Registration (`user_registration`)
  - "Bypass Mode Active" indicator for logged-in admins.

## 7. Technical Architecture
- **Service**: `apps/api/src/services/maintenance.service.ts`.
- **In-Memory Cache**: Maintenance states are cached in memory with a 10-second TTL to guarantee sub-millisecond middleware checks without hitting the database on every HTTP request.
- **Middleware Integration**:
  ```typescript
  export const requireFeatureActive = (featureKey: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const status = await MaintenanceService.checkFeature(featureKey, req.user);
      if (status.isUnderMaintenance) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'FEATURE_UNDER_MAINTENANCE',
            message: status.message,
            estimatedEnd: status.estimatedEnd,
          },
        });
      }
      next();
    };
  };
  ```

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data model:
- `maintenance_configs`: `id`, `scope` (`GLOBAL` | `FEATURE`), `featureKey` (string, nullable for global), `isActive`, `message`, `scheduledStart`, `scheduledEnd`, `allowedRoles` (string[]), `updatedBy`, `updatedAt`.

## 9. API
- `GET /api/v1/maintenance/status` (Auth: Public) — Returns active maintenance status of all features.
- `GET /api/v1/maintenance/configs` (Auth: Admin / `system.maintenance`) — Full admin configuration list.
- `PUT /api/v1/maintenance/global` (Auth: Admin / `system.maintenance`) — Toggle global maintenance mode.
- `PUT /api/v1/maintenance/features/:key` (Auth: Admin / `system.maintenance`) — Toggle individual feature maintenance.

## 10. Frontend
- **Components**:
  - `MaintenanceControlPanel.tsx`: Admin switchboard in `SettingsPage.tsx`.
  - `GlobalMaintenancePage.tsx`: Full-screen maintenance landing page with timer.
  - `FeatureMaintenanceWrapper.tsx`: Reusable container displaying maintenance notice when a feature is toggled off.
  - `MaintenanceBanner.tsx`: Top announcement banner for upcoming scheduled maintenance.

## 11. AI / External Services
- None required.

## 12. Permissions / Entitlements
- **Configuration Management**: Strictly restricted to `MAIN_ADMIN` and `SUB_ADMIN` with `system.maintenance`.
- **Maintenance Bypass**: Users with `roles: ['MAIN_ADMIN', 'SUB_ADMIN']` bypass maintenance checks automatically.

## 13. Maintenance Behaviour
- Self-governing core platform engine.

## 14. Import / Export
- Maintenance configuration states exportable in system audit dumps.

## 15. Edge Cases
- Student in the middle of an active timed exam when maintenance is triggered: Exam taking feature allows in-progress attempts to finish or grants automatic timer extension before locking.
- Database disconnection: Fallback hardcoded in-memory state defaults to safe mode.

## 16. Test Cases
- **Unit (MAINT-U001)**: `MaintenanceService.checkFeature()` accurately identifies active feature maintenance.
- **Unit (MAINT-U002)**: Admin user bypasses maintenance check with `isUnderMaintenance: false`.
- **API (MAINT-A001)**: Calling a route with active feature maintenance returns HTTP 503 `FEATURE_UNDER_MAINTENANCE`.
- **API (MAINT-A002)**: Student cannot update maintenance settings (returns HTTP 403 `PERMISSION_DENIED`).
- **UI (MAINT-UI001)**: `<FeatureMaintenanceWrapper>` renders fallback UI when API returns 503.
- **Integration (MAINT-I001)**: Toggling feature maintenance in Settings updates middleware cache in < 1 second.

## 17. Acceptance Criteria
- [ ] Centralized maintenance service with in-memory caching.
- [ ] Global maintenance toggle and granular per-feature switches.
- [ ] Backend Express middleware returning HTTP 503 with structured notices.
- [ ] Admin/staff bypass privileges verified.
- [ ] Frontend maintenance wrappers and advance notice banners.

## 18. Dependencies
- `@repo/permissions`
- `apps/api/src/routes/preference.routes.ts`

## 19. Future Improvements
- Automated maintenance triggers based on error rate monitoring (e.g. automatically pause payment gateway if failure rate exceeds 15%).
- Webhook dispatch to external status page (e.g. Statuspage.io).
