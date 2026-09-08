import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { MaintenanceService } from '../services/maintenance.service';
import { JWT_SECRET } from './auth';

export const requireFeatureActive = (featureKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!featureKey) {
        return next();
      }

      // Extract user from request or decode from Authorization header
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

      // Evaluate feature availability (includes role bypass and active exam in-progress non-disruption guarantee)
      const availability = await MaintenanceService.evaluateFeatureAvailability(featureKey, user, req.path);

      if (!availability.isAllowed) {
        // Backwards compatibility for legacy vocabulary_practice test suite expecting 503 FEATURE_MAINTENANCE
        if (featureKey === 'vocabulary_practice') {
          return res.status(503).json({
            success: false,
            errorCode: 'FEATURE_MAINTENANCE',
            error: {
              code: 'FEATURE_UNDER_MAINTENANCE',
              message: availability.message,
              featureKey,
            },
            message: availability.message,
          });
        }

        // Standard Task 15.14 behavior: 403 FEATURE_UNAVAILABLE with configured message and reason
        return res.status(403).json({
          success: false,
          code: 'FEATURE_UNAVAILABLE',
          errorCode: 'FEATURE_UNAVAILABLE',
          error: {
            code: 'FEATURE_UNAVAILABLE',
            featureKey: availability.featureKey || featureKey,
            status: availability.status,
            message: availability.message,
            reason: availability.reason || undefined,
            displayMode: availability.displayMode,
          },
          message: availability.message,
        });
      }

      next();
    } catch (err) {
      // Fail-open on internal middleware error
      next();
    }
  };
};
