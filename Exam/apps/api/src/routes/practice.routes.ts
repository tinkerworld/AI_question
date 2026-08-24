import { Router, Request, Response, NextFunction } from 'express';
import { practiceService } from '../services/practice.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS, hasPermission } from '@repo/permissions';
import {
  generatePracticePaperSchema,
  submitPracticeAnswerSchema,
} from '@repo/validation';

export const practiceRouter = Router();

practiceRouter.use(authenticate);

function isElevatedUser(user: any): boolean {
  if (!user) return false;
  const perms = user.permissions || [];
  const roles = user.roles || [];
  return (
    hasPermission(perms, (PERMISSIONS as any).ANALYTICS_READ || 'analytics.read') ||
    roles.includes('MAIN_ADMIN') ||
    roles.includes('SUB_ADMIN') ||
    roles.includes('TEACHER')
  );
}

// ----------------------------------------------------------------------------
// Feature 9.1: Retrieve Weakness Pool
// ----------------------------------------------------------------------------
practiceRouter.get(
  ['/weakness-pool', '/weaknesses', '/:id/weakness-pool', '/students/:id/weakness-pool'],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const targetUserId = req.params.id || currentUserId;
      const elevated = isElevatedUser(req.user);

      const pool = await practiceService.getWeaknessPool(targetUserId, currentUserId, elevated);
      res.json({
        success: true,
        data: pool,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Practice Stats (Direct Row Count Verification)
// ----------------------------------------------------------------------------
practiceRouter.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await practiceService.getPracticeStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

practiceRouter.get(
  '/papers',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ids = await practiceService.getAllPracticePaperIds();
      res.json({
        success: true,
        data: ids,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 9.2: Generate Personalized Practice Paper
// ----------------------------------------------------------------------------
practiceRouter.post(
  '/generate',
  requirePermission((PERMISSIONS as any).PRACTICE_CREATE || 'practice.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const parsed = generatePracticePaperSchema.parse(req.body);

      const result = await practiceService.generatePracticePaper(currentUserId, parsed);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 9.4: Practice History
// ----------------------------------------------------------------------------
practiceRouter.get(
  '/history',
  requirePermission((PERMISSIONS as any).PRACTICE_READ || 'practice.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const history = await practiceService.getPracticeHistory(currentUserId, page, limit);
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 9.2: Get Practice Paper Details
// ----------------------------------------------------------------------------
practiceRouter.get(
  '/:id',
  requirePermission((PERMISSIONS as any).PRACTICE_READ || 'practice.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const paperId = req.params.id;

      const paper = await practiceService.getPracticePaper(paperId, currentUserId);
      res.json({
        success: true,
        data: paper,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 9.3 & 9.4: Record / Evaluate Practice Question Answer
// ----------------------------------------------------------------------------
practiceRouter.post(
  ['/:id/answer', '/:id/answers'],
  requirePermission((PERMISSIONS as any).PRACTICE_ATTEMPT || 'practice.attempt'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const attemptId = req.params.id;
      const parsed = submitPracticeAnswerSchema.parse(req.body);

      const evaluation = await practiceService.recordPracticeAnswer(attemptId, currentUserId, parsed);
      res.json({
        success: true,
        data: evaluation,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Feature 9.3 & 9.4: Complete & Evaluate Practice Attempt
// ----------------------------------------------------------------------------
practiceRouter.post(
  '/:id/submit',
  requirePermission((PERMISSIONS as any).PRACTICE_ATTEMPT || 'practice.attempt'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const attemptId = req.params.id;

      const summary = await practiceService.submitPracticeAttempt(attemptId, currentUserId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

practiceRouter.patch(
  '/:id/evaluate',
  requirePermission((PERMISSIONS as any).PRACTICE_EVALUATE || 'practice.evaluate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const attemptId = req.params.id;

      const summary = await practiceService.submitPracticeAttempt(attemptId, currentUserId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ----------------------------------------------------------------------------
// Delete Practice Paper & Associated Attempts
// ----------------------------------------------------------------------------
practiceRouter.delete(
  '/:id',
  requirePermission((PERMISSIONS as any).PRACTICE_CREATE || 'practice.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId || (req.user as any)?.id;
      const paperId = req.params.id;
      const elevated = isElevatedUser(req.user);

      const result = await practiceService.deletePracticePaper(paperId, currentUserId, elevated);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

