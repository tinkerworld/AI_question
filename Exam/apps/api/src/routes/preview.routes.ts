import { Router, Request, Response, NextFunction } from 'express';
import { previewService } from '../services/preview.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import {
  createPreviewProfileSchema,
  updatePreviewProfileSchema,
  startPreviewSessionSchema,
  startImpersonationSchema,
} from '@repo/validation';

export const previewRouter = Router();

// All preview endpoints require authentication
previewRouter.use(authenticate);

// ============================================================================
// 10.1: Preview Profile CRUD
// ============================================================================

// POST /api/v1/preview/profiles (or /api/preview/profiles)
previewRouter.post(
  '/profiles',
  requirePermission((PERMISSIONS as any).PREVIEW_CONFIG || 'preview.config'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createPreviewProfileSchema.parse(req.body);
      const createdById = req.user?.userId || (req.user as any)?.id;
      const profile = await previewService.createPreviewProfile(validated as any, createdById);
      res.status(201).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/preview/profiles/:id
previewRouter.get(
  '/profiles/:id',
  requirePermission((PERMISSIONS as any).PREVIEW_USE || 'preview.use'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await previewService.getPreviewProfile(req.params.id);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/preview/profiles/:id
previewRouter.patch(
  '/profiles/:id',
  requirePermission((PERMISSIONS as any).PREVIEW_CONFIG || 'preview.config'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updatePreviewProfileSchema.parse(req.body);
      const profile = await previewService.updatePreviewProfile(req.params.id, validated as any);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/preview/profiles
previewRouter.get(
  '/profiles',
  requirePermission((PERMISSIONS as any).PREVIEW_USE || 'preview.use'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profiles = await previewService.listPreviewProfiles();
      res.json({
        success: true,
        data: profiles,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// 10.3: Preview Session Lifecycle (Simulated Student)
// ============================================================================

// POST /api/v1/preview/start (or /api/preview/start)
previewRouter.post(
  '/start',
  requirePermission((PERMISSIONS as any).PREVIEW_USE || 'preview.use'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = startPreviewSessionSchema.parse(req.body);
      const actorUser = {
        userId: req.user?.userId || (req.user as any)?.id,
        email: req.user?.email || '',
        roles: req.user?.roles || [],
        permissions: req.user?.permissions || [],
      };

      const result = await previewService.startPreviewSession(
        validated as any,
        actorUser,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/preview/stop & POST /api/v1/preview/end
previewRouter.post(
  ['/stop', '/end'],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.body?.sessionId || (req as any).impersonation?.sessionId;
      const actorUserId = (req as any).actor?.userId || req.user?.userId;
      const result = await previewService.stopSession(
        sessionId || 'active_session',
        actorUserId || 'unknown',
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/preview/status
previewRouter.get(
  '/status',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = (req.query?.sessionId as string) || (req as any).impersonation?.sessionId;
      if (!sessionId) {
        return res.json({
          success: true,
          data: {
            active: false,
            mode: null,
            effectiveUser: null,
          },
        });
      }

      const session = await previewService.getSessionStatus(sessionId);
      res.json({
        success: true,
        data: {
          active: session ? session.isActive : false,
          session,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// 10.3: Impersonation of Real Students (Admins only)
// ============================================================================

// POST /api/v1/preview/impersonate/start (or /api/v1/impersonate/start)
previewRouter.post(
  ['/impersonate/start', '/impersonate'],
  requirePermission((PERMISSIONS as any).IMPERSONATE_USE || 'impersonate.use'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = startImpersonationSchema.parse(req.body);
      const actorUser = {
        userId: req.user?.userId || (req.user as any)?.id,
        email: req.user?.email || '',
        roles: req.user?.roles || [],
        permissions: req.user?.permissions || [],
      };

      const result = await previewService.startImpersonationSession(
        validated as any,
        actorUser,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/preview/impersonate/stop (or /api/v1/impersonate/stop)
previewRouter.post(
  ['/impersonate/stop', '/impersonate/end'],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.body?.sessionId || (req as any).impersonation?.sessionId;
      const actorUserId = (req as any).actor?.userId || req.user?.userId;
      const result = await previewService.stopSession(
        sessionId || 'active_session',
        actorUserId || 'unknown',
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// 10.5: Preview & Impersonation Audit Logs (Main Admin)
// ============================================================================

// GET /api/v1/preview/audit-logs
previewRouter.get(
  '/audit-logs',
  requirePermission((PERMISSIONS as any).PREVIEW_AUDIT_READ || (PERMISSIONS as any).AUDIT_READ || 'audit.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const actorUserId = req.query.actorUserId as string | undefined;
      const mode = req.query.mode as string | undefined;

      const logs = await previewService.getAuditLogs({ page, limit, actorUserId, mode });
      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);
