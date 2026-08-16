import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { ExamGeneratorService } from '../services/exam-generator.service';
import {
  generateExamSchema,
  createManualExamSchema,
  updateExamMetadataSchema,
  createManualExamSectionSchema,
  addExamQuestionsSchema,
  swapExamQuestionSchema,
  reorderExamQuestionsSchema,
} from '@repo/validation';

export const examRouter = Router();

/**
 * Feature 5.1: Generate exam from pattern blueprint
 * POST /api/v1/exams/generate
 */
examRouter.post(
  '/generate',
  authenticate,
  requirePermission('exams.create'),
  validate(generateExamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.generateExam(req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Exam generated successfully from pattern blueprint',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * List exams with pagination & filters
 * GET /api/v1/exams
 */
examRouter.get(
  '/',
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, courseId, page, limit } = req.query;
      const result = await ExamGeneratorService.listExams({
        status: status as string,
        courseId: courseId as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.4: Create manual exam (no pattern blueprint)
 * POST /api/v1/exams/manual
 * POST /api/v1/exams
 */
examRouter.post(
  ['/manual', '/'],
  authenticate,
  requirePermission('exams.create'),
  validate(createManualExamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.createManualExam(req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Manual blank exam created successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.2: Get draft exam details and stats
 * GET /api/v1/exams/:id/draft
 * GET /api/v1/exams/:id
 */
examRouter.get(
  ['/:id/draft', '/:id'],
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.getDraftExamDetails(req.params.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.2: Swap question in exam
 * PATCH /api/v1/exams/:id/questions/:qId/swap
 * POST /api/v1/exams/:id/questions/swap
 */
examRouter.patch(
  '/:id/questions/:qId/swap',
  authenticate,
  requirePermission('exams.create'),
  validate(swapExamQuestionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.swapQuestion(
        req.params.id,
        req.params.qId,
        req.body,
        req.user!.userId
      );
      res.json({
        success: true,
        data: result,
        message: 'Question swapped successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

examRouter.post(
  '/:id/questions/swap',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldQuestionId, newQuestionId } = req.body;
      const result = await ExamGeneratorService.swapQuestion(
        req.params.id,
        oldQuestionId,
        { newQuestionId },
        req.user!.userId
      );
      res.json({
        success: true,
        data: result,
        message: 'Question swapped successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.2: Regenerate an entire section
 * PATCH /api/v1/exams/:id/sections/:secId/regenerate
 * POST /api/v1/exams/:id/sections/:secId/regenerate
 */
examRouter.all(
  '/:id/sections/:secId/regenerate',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.regenerateSection(
        req.params.id,
        req.params.secId,
        req.user!.userId
      );
      res.json({
        success: true,
        data: result,
        message: 'Section regenerated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.2: Reorder questions within a section
 * PATCH /api/v1/exams/:id/reorder
 * PUT /api/v1/exams/:id/reorder
 */
examRouter.all(
  '/:id/reorder',
  authenticate,
  requirePermission('exams.create'),
  validate(reorderExamQuestionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.reorderQuestions(
        req.params.id,
        req.body,
        req.user!.userId
      );
      res.json({
        success: true,
        data: result,
        message: 'Question sequence order updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.3: Update exam metadata
 * PATCH /api/v1/exams/:id
 */
examRouter.patch(
  '/:id',
  authenticate,
  requirePermission('exams.create'),
  validate(updateExamMetadataSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.updateExamMetadata(
        req.params.id,
        req.body,
        req.user!.userId
      );
      res.json({
        success: true,
        data: result,
        message: 'Exam metadata updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.3: Publish finalized exam
 * POST /api/v1/exams/:id/publish
 */
examRouter.post(
  '/:id/publish',
  authenticate,
  requirePermission('exams.publish'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.publishExam(req.params.id, req.user!.userId);
      res.json({
        success: true,
        data: result,
        message: 'Exam published successfully for student attempts',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.4: Add section to manual exam
 * POST /api/v1/exams/:id/sections
 */
examRouter.post(
  '/:id/sections',
  authenticate,
  requirePermission('exams.create'),
  validate(createManualExamSectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.addManualSection(
        req.params.id,
        req.body,
        req.user!.userId
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'Section added to exam successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.4: Add questions directly to section
 * POST /api/v1/exams/:id/questions
 */
examRouter.post(
  '/:id/questions',
  authenticate,
  requirePermission('exams.create'),
  validate(addExamQuestionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamGeneratorService.addQuestionsToSection(
        req.params.id,
        req.body,
        req.user!.userId
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Questions added to section successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default examRouter;
