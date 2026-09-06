import { Router, Request, Response } from 'express';
import { MaintenanceService } from '../services/maintenance.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';

export const maintenanceRouter = Router();

// 1. GET /status (Public) - Check global and feature maintenance statuses
maintenanceRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await MaintenanceService.getStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /configs (Admin / Staff) - List all maintenance configurations
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

// 3. PUT /global (Admin) - Toggle global maintenance
maintenanceRouter.put(
  '/global',
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE),
  async (req: Request, res: Response) => {
    try {
      const { isActive, message, scheduledEnd } = req.body;
      const config = await MaintenanceService.setGlobalMaintenance(
        Boolean(isActive),
        message,
        scheduledEnd,
        (req as any).user?.userId
      );
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// 4. PUT /features/:key (Admin) - Toggle specific feature maintenance
maintenanceRouter.put(
  '/features/:key',
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_MAINTENANCE),
  async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { isActive, message, scheduledEnd } = req.body;
      const config = await MaintenanceService.setFeatureMaintenance(
        key,
        Boolean(isActive),
        message,
        scheduledEnd,
        (req as any).user?.userId
      );
      res.json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);
