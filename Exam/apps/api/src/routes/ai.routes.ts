import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { PERMISSIONS } from '@repo/permissions';
import {
  modifyQuestionAISchema,
  generateQuestionsAISchema,
  reviewDraftQuestionSchema,
  updateAIProviderSchema,
} from '@repo/validation';
import { AIGatewayService } from '../services/ai-gateway.service';
import { AIQuestionService } from '../services/ai-question.service';
import { AIUsageService } from '../services/ai-usage.service';
import { AIQueueService } from '../services/ai-queue.service';

const router = Router();

// ========================================================
// 1. AI Gateway Core Endpoints
// ========================================================

/**
 * Health check for AI Gateway
 */
router.get('/gateway/health', async (_req: Request, res: Response) => {
  try {
    const providers = await AIGatewayService.listProviders();
    const active = providers.filter((p) => p.isActive && !p.circuitBroken);
    return res.json({
      success: true,
      data: {
        status: active.length > 0 ? 'HEALTHY' : 'DEGRADED',
        totalProviders: providers.length,
        activeProviders: active.map((p) => ({ id: p.id, name: p.name, model: p.modelId })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Internal / Direct Gateway Route (used by AIClient SDK & internal workers)
 */
router.post('/gateway/route', async (req: Request, res: Response) => {
  try {
    const { featureKey, scope, prompt, variables, userId, preferredProviderId } = req.body;
    if (!featureKey) {
      return res.status(400).json({ success: false, message: 'featureKey is required' });
    }
    if (!scope) {
      return res.status(400).json({ success: false, message: 'scope is required (e.g. question_authoring, interview)' });
    }

    const response = await AIGatewayService.routeRequest({
      featureKey,
      scope,
      prompt,
      variables,
      userId,
      preferredProviderId,
    });

    return res.json({ success: true, data: response });
  } catch (err: any) {
    if (err.message.includes('FEATURE_DAILY_LIMIT_EXCEEDED')) {
      return res.status(429).json({ success: false, errorCode: 'FEATURE_DAILY_LIMIT_EXCEEDED', message: err.message });
    }
    const status = err.message?.startsWith('NO_AI_PROVIDERS_AVAILABLE') ? 503 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

/**
 * List AI Providers (Admin)
 */
router.get(
  '/gateway/providers',
  authenticate,
  requirePermission(PERMISSIONS.AI_ADMIN_CONFIG),
  async (req: Request, res: Response) => {
    try {
      const scope = req.query.scope as string | undefined;
      const providers = await AIGatewayService.listProviders(scope);
      return res.json({ success: true, data: providers });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Update AI Provider Settings (Admin)
 */
router.patch(
  '/gateway/providers/:id',
  authenticate,
  requirePermission(PERMISSIONS.AI_ADMIN_CONFIG),
  async (req: Request, res: Response) => {
    try {
      const parseResult = updateAIProviderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error.errors[0]?.message || 'Invalid input',
        });
      }

      const updated = await AIGatewayService.updateProvider(req.params.id, parseResult.data);
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Test AI Provider Live Connection & Latency (Admin)
 */
router.post(
  '/gateway/providers/:id/test',
  authenticate,
  requirePermission(PERMISSIONS.AI_ADMIN_CONFIG),
  async (req: Request, res: Response) => {
    try {
      const result = await AIGatewayService.testProviderConnection(req.params.id, req.body);
      return res.json({ success: result.success, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ========================================================
// 2. AI Question Authoring & Batch Queue Endpoints
// ========================================================

/**
 * AI Question Modification (Generate Variation)
 */
router.post(
  '/questions/modify',
  authenticate,
  requirePermission(PERMISSIONS.AI_MODIFY),
  async (req: Request, res: Response) => {
    try {
      const parseResult = modifyQuestionAISchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error.errors[0]?.message || 'Invalid input',
        });
      }

      const result = await AIQuestionService.modifyQuestion(req.user!.userId, parseResult.data);
      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      if (err.message?.includes('FEATURE_DAILY_LIMIT_EXCEEDED')) {
        return res.status(429).json({ success: false, errorCode: 'FEATURE_DAILY_LIMIT_EXCEEDED', message: err.message });
      }
      if (err.message === 'INSUFFICIENT_AI_CREDITS' || err.message === 'AI_MONTHLY_TOKEN_CAP_REACHED') {
        return res.status(402).json({ success: false, errorCode: err.message, message: err.message });
      }
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * AI Question Generation (Single or Batch Queue)
 */
router.post(
  '/questions/generate',
  authenticate,
  requirePermission(PERMISSIONS.AI_GENERATE),
  async (req: Request, res: Response) => {
    try {
      const parseResult = generateQuestionsAISchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error.errors[0]?.message || 'Invalid input',
        });
      }

      const count = parseResult.data.count || 1;

      // For batch generation (> 1 questions), queue asynchronously
      if (count > 1) {
        const job = await AIQueueService.submitJob(
          req.user!.userId,
          'BATCH_GENERATE',
          parseResult.data
        );
        return res.status(202).json({
          success: true,
          data: {
            jobId: job.id,
            status: job.status,
            totalCount: job.totalCount,
            message: `Batch generation job queued for ${count} questions`,
          },
        });
      }

      // Synchronous single generation for instant feedback
      const created = await AIQuestionService.generateQuestions(
        req.user!.userId,
        parseResult.data
      );
      return res.status(201).json({ success: true, data: created[0] });
    } catch (err: any) {
      if (err.message?.includes('FEATURE_DAILY_LIMIT_EXCEEDED')) {
        return res.status(429).json({ success: false, errorCode: 'FEATURE_DAILY_LIMIT_EXCEEDED', message: err.message });
      }
      if (err.message === 'INSUFFICIENT_AI_CREDITS' || err.message === 'AI_MONTHLY_TOKEN_CAP_REACHED') {
        return res.status(402).json({ success: false, errorCode: err.message, message: err.message });
      }
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Poll Batch Generation Job Status
 */
router.get(
  '/questions/generation-jobs/:id',
  authenticate,
  requirePermission(PERMISSIONS.AI_GENERATE),
  async (req: Request, res: Response) => {
    try {
      const job = await AIQueueService.getJobStatus(req.params.id);
      return res.json({ success: true, data: job });
    } catch (err: any) {
      const status = err.message === 'JOB_NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
);

/**
 * List Draft Questions Awaiting Review
 */
router.get(
  '/questions/drafts',
  authenticate,
  requirePermission(PERMISSIONS.AI_REVIEW),
  async (req: Request, res: Response) => {
    try {
      const drafts = await AIQuestionService.listDraftQuestions({
        subjectId: req.query.subjectId as string,
        isAiOnly: req.query.isAiOnly === 'true',
      });
      return res.json({ success: true, data: drafts });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Review Draft Question (Approve or Reject)
 */
router.post(
  '/questions/drafts/:id/review',
  authenticate,
  requirePermission(PERMISSIONS.AI_REVIEW),
  async (req: Request, res: Response) => {
    try {
      const parseResult = reviewDraftQuestionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error.errors[0]?.message || 'Invalid input',
        });
      }

      const result = await AIQuestionService.reviewDraft(
        req.user!.userId,
        req.params.id,
        parseResult.data
      );
      return res.json({ success: true, data: result });
    } catch (err: any) {
      const status = err.message === 'QUESTION_NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ success: false, message: err.message });
    }
  }
);

// ========================================================
// 3. AI Usage, Credits & Reporting Endpoints
// ========================================================

/**
 * Get Current User's AI Usage & Credit Balance
 */
router.get(
  '/usage',
  authenticate,
  requirePermission(PERMISSIONS.AI_USAGE_READ),
  async (req: Request, res: Response) => {
    try {
      const credits = await AIUsageService.getUserCredits(req.user!.userId);
      const history = await AIUsageService.getUserUsageHistory(req.user!.userId);
      return res.json({
        success: true,
        data: {
          credits,
          history,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * Admin AI System Usage & Cost Analytics
 */
router.get(
  '/admin/usage',
  authenticate,
  requirePermission(PERMISSIONS.AI_ADMIN_CONFIG),
  async (_req: Request, res: Response) => {
    try {
      const report = await AIUsageService.getAdminUsageReport();
      return res.json({ success: true, data: report });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
