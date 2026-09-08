import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { MaintenanceService } from '../services/maintenance.service';
import { authenticate, JWT_SECRET } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';

export const maintenanceRouter = Router();

// ============================================================================
// 1. PUBLIC ROUTES
// ============================================================================

/**
 * GET /status (Public)
 * Returns status of all features and global platform maintenance state
 */
maintenanceRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await MaintenanceService.getStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /feature/:key AND GET /features/:key (Public / Authenticated)
 * Returns availability and control state for a single feature
 * Resolves the issue where FeatureMaintenanceWrapper requested /maintenance/feature/:key
 */
const handleGetSingleFeature = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    let user = (req as any).user;
    if (!user && req.headers.authorization) {
      try {
        const parts = req.headers.authorization.split(' ');
        const token = parts.length === 2 ? parts[1] : parts[0];
        if (token) {
          user = jwt.verify(token, JWT_SECRET);
          (req as any).user = user;
        }
      } catch {}
    }

    const availability = await MaintenanceService.evaluateFeatureAvailability(key, user, req.path);
    const control = await MaintenanceService.getFeatureControl(key);

    res.json({
      success: true,
      data: {
        featureKey: key,
        isInMaintenance: !availability.isAllowed,
        isUnderMaintenance: !availability.isAllowed,
        status: availability.status,
        message: availability.message,
        reason: availability.reason,
        displayMode: availability.displayMode,
        endAt: control?.endAt || null,
        startAt: control?.startAt || null,
        control,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

maintenanceRouter.get('/feature/:key', handleGetSingleFeature);
maintenanceRouter.get('/features/:key', handleGetSingleFeature);

// ============================================================================
// 2. ADMIN / STAFF FEATURE CONTROL WORKBENCH ROUTES
// ============================================================================

/**
 * GET /controls (Admin / Staff)
 * Returns all seeded FeatureControls with current status badges
 */
maintenanceRouter.get(
  '/controls',
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE),
  async (req: Request, res: Response) => {
    try {
      const controls = await MaintenanceService.getAllFeatureControls();
      res.json({ success: true, data: controls });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * PUT /controls/:key (Admin / Staff)
 * Update status, message, reason, displayMode, role bypass, scheduled window
 */
maintenanceRouter.put(
  '/controls/:key',
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE),
  async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const {
        status,
        message,
        reason,
        startAt,
        endAt,
        allowAdmin,
        allowTeacher,
        allowStudent,
        displayMode,
      } = req.body;

      const actorId = (req as any).user?.userId || (req as any).user?.id || 'admin';

      const updated = await MaintenanceService.updateFeatureControl(
        key,
        {
          status,
          message,
          reason,
          startAt,
          endAt,
          allowAdmin,
          allowTeacher,
          allowStudent,
          displayMode,
        },
        actorId
      );

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /bulk (Admin / Staff)
 * Bulk Deactivate All (set status = MAINTENANCE) or Restore All (set status = ACTIVE)
 */
maintenanceRouter.post(
  '/bulk',
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE),
  async (req: Request, res: Response) => {
    try {
      const { status, message, reason } = req.body;
      if (!status || !['ACTIVE', 'MAINTENANCE'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be ACTIVE or MAINTENANCE for bulk operation',
        });
      }

      const actorId = (req as any).user?.userId || (req as any).user?.id || 'admin';
      const updated = await MaintenanceService.bulkSetStatus(status, message, reason, actorId);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================================
// 3. BACKWARDS COMPATIBILITY & LEGACY ROUTES
// ============================================================================

/**
 * GET /configs (Admin / Staff) - Legacy endpoint
 */
maintenanceRouter.get(
  '/configs',
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE),
  async (req: Request, res: Response) => {
    try {
      const configs = await MaintenanceService.getConfigs();
      res.json({ success: true, data: configs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * PUT /global & POST /global (Admin / Staff) - Legacy global toggle
 */
const handleGlobalToggle = async (req: Request, res: Response) => {
  try {
    const { isActive, enabled, message, scheduledEnd, estimatedEndTime } = req.body;
    const active = isActive !== undefined ? Boolean(isActive) : Boolean(enabled);
    const end = scheduledEnd || estimatedEndTime;
    const actorId = (req as any).user?.userId || (req as any).user?.id || 'admin';

    const config = await MaintenanceService.setGlobalMaintenance(active, message, end, actorId);

    // If global maintenance is activated/deactivated, sync bulk features as well
    if (active) {
      await MaintenanceService.bulkSetStatus('MAINTENANCE', message, 'Global platform maintenance', actorId);
    } else {
      await MaintenanceService.bulkSetStatus('ACTIVE', undefined, 'Restored global platform', actorId);
    }

    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

maintenanceRouter.put('/global', authenticate, requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE), handleGlobalToggle);
maintenanceRouter.post('/global', authenticate, requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE), handleGlobalToggle);

/**
 * PUT /features/:key & POST /feature (Admin / Staff) - Legacy feature toggle
 */
const handleFeatureToggle = async (req: Request, res: Response) => {
  try {
    const key = req.params.key || req.body.featureKey;
    const { isActive, isEnabled, message, scheduledEnd } = req.body;
    const active = isActive !== undefined ? Boolean(isActive) : (isEnabled !== undefined ? !Boolean(isEnabled) : true);
    const actorId = (req as any).user?.userId || (req as any).user?.id || 'admin';

    const config = await MaintenanceService.setFeatureMaintenance(key, active, message, scheduledEnd, actorId);
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

maintenanceRouter.put('/features/:key', authenticate, requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE), handleFeatureToggle);
maintenanceRouter.post('/feature', authenticate, requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE), handleFeatureToggle);
