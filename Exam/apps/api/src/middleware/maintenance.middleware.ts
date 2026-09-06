import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { MaintenanceService } from '../services/maintenance.service';
import { JWT_SECRET } from './auth';

export const requireFeatureActive = (featureKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
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

      const status = await MaintenanceService.checkFeature(featureKey, user);
      if (status.isUnderMaintenance) {
        return res.status(503).json({
          success: false,
          errorCode: 'FEATURE_MAINTENANCE',
          error: {
            code: 'FEATURE_UNDER_MAINTENANCE',
            message: status.message,
            estimatedEnd: status.estimatedEnd,
            featureKey: status.featureKey,
          },
        });
      }
      next();
    } catch (err) {
      // Fail-open for middleware check error
      next();
    }
  };
};
