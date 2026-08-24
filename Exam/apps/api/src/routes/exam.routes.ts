import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { ExamGeneratorService } from '../services/exam-generator.service';
import { ExamArchiveService } from '../services/exam-archive.service';
import {
  generateExamSchema,
  createManualExamSchema,
  updateExamMetadataSchema,
  createManualExamSectionSchema,
  addExamQuestionsSchema,
  swapExamQuestionSchema,
  reorderExamQuestionsSchema,
  updateExamWorkflowStatusSchema,
  assignExamReviewerSchema,
  initiateExamCorrectionSchema,
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

      const sessionData = req.impersonation?.sessionData;
      const restrictedCourses =
        sessionData?.courseAccess &&
        (Array.isArray(sessionData.courseAccess)
          ? !sessionData.courseAccess.includes('*') && sessionData.courseAccess.length > 0
            ? sessionData.courseAccess
            : null
          : sessionData.courseAccess !== '*'
          ? [sessionData.courseAccess]
          : null);

      const result = await ExamGeneratorService.listExams({
        status: status as string,
        courseId: courseId as string,
        allowedCourseIds: restrictedCourses || undefined,
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
      await ExamArchiveService.assertExamMutable(req.params.id);
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
      await ExamArchiveService.assertExamMutable(req.params.id);
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
 * Feature 5.2: Reorder questions within a section
 * POST /api/v1/exams/:id/questions/reorder
 * PATCH /api/v1/exams/:id/questions/reorder
 */
examRouter.post(
  '/:id/questions/reorder',
  authenticate,
  requirePermission('exams.create'),
  validate(reorderExamQuestionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ExamArchiveService.assertExamMutable(req.params.id);
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

examRouter.patch(
  '/:id/questions/reorder',
  authenticate,
  requirePermission('exams.create'),
  validate(reorderExamQuestionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ExamArchiveService.assertExamMutable(req.params.id);
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

examRouter.all(
  '/:id/reorder',
  authenticate,
  requirePermission('exams.create'),
  validate(reorderExamQuestionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ExamArchiveService.assertExamMutable(req.params.id);
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
 * Feature 5.2: Regenerate single section questions
 * PATCH /api/v1/exams/:id/sections/:sectionId/regenerate
 */
examRouter.patch(
  '/:id/sections/:sectionId/regenerate',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ExamArchiveService.assertExamMutable(req.params.id);
      const result = await ExamGeneratorService.regenerateSection(
        req.params.id,
        req.params.sectionId,
        req.user!.userId
      );
      res.json({
        success: true,
        data: result,
        message: 'Section questions regenerated successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 5.3: Update exam metadata
 * PATCH /api/v1/exams/:id
 * PUT /api/v1/exams/:id
 */
examRouter.patch(
  '/:id',
  authenticate,
  requirePermission('exams.create'),
  validate(updateExamMetadataSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ExamArchiveService.assertExamMutable(req.params.id);
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

examRouter.put(
  '/:id',
  authenticate,
  requirePermission('exams.create'),
  validate(updateExamMetadataSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ExamArchiveService.assertExamMutable(req.params.id);
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
 * Feature 5.3 & 7.1: Publish finalized exam
 * POST /api/v1/exams/:id/publish
 */
examRouter.post(
  '/:id/publish',
  authenticate,
  requirePermission('exams.publish'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.publishAndSnapshotExam(req.params.id, req.user!.userId);
      const draftDetails = await ExamGeneratorService.getDraftExamDetails(req.params.id);
      res.json({
        success: true,
        data: {
          ...result,
          exam: draftDetails.exam,
        },
        message: 'Exam published successfully for student attempts and immutable snapshot created',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 7.1: Update Exam Workflow Status (DRAFT -> PREVIEW -> REVIEW -> APPROVED -> PUBLISHED)
 * PUT /api/v1/exams/:id/status
 */
examRouter.put(
  '/:id/status',
  authenticate,
  requirePermission('exams.publish'),
  validate(updateExamWorkflowStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.updateExamStatus(req.params.id, req.body, req.user!.userId);
      res.json({
        success: true,
        data: result,
        message: `Exam status transitioned to ${req.body.status}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 7.1: Assign Reviewer to Exam
 * POST /api/v1/exams/:id/reviewers
 */
examRouter.post(
  '/:id/reviewers',
  authenticate,
  requirePermission('exams.create'),
  validate(assignExamReviewerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.assignReviewer(req.params.id, req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Reviewer assigned successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 7.1: Get Exam Workflow History & Reviewers
 * GET /api/v1/exams/:id/workflow-history
 */
examRouter.get(
  '/:id/workflow-history',
  authenticate,
  requirePermission('exams.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.getWorkflowHistory(req.params.id);
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
 * Feature 7.2: Get Frozen Exam Snapshot Details
 * GET /api/v1/exams/:id/snapshot
 */
examRouter.get(
  '/:id/snapshot',
  authenticate,
  requirePermission('archive.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.getSnapshotDetails(req.params.id);
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
 * Feature 7.3: Preserved Answer Key Retrieval
 * GET /api/v1/exams/:id/answer-key
 */
examRouter.get(
  '/:id/answer-key',
  authenticate,
  requirePermission('archive.answer_key'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.getAnswerKey(req.params.id);
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
 * Feature 7.5: Initiate Post-Publish Formal Correction Workflow (V1 -> V2)
 * POST /api/v1/exams/:id/corrections
 */
examRouter.post(
  '/:id/corrections',
  authenticate,
  requirePermission('archive.correct'),
  validate(initiateExamCorrectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.initiateCorrection(req.params.id, req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Post-publish exam correction applied and new version snapshot created',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Feature 7.5: View Exam Snapshot Version History
 * GET /api/v1/exams/:id/history
 */
examRouter.get(
  '/:id/history',
  authenticate,
  requirePermission('archive.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.getVersionHistory(req.params.id);
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
 * Feature 7.6: Exam File Management
 * POST /api/v1/exams/:id/files
 * GET /api/v1/exams/:id/files
 */
examRouter.post(
  '/:id/files',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.uploadFile(req.params.id, req.body, req.user!.userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Exam file asset recorded successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

examRouter.get(
  '/:id/files',
  authenticate,
  requirePermission('archive.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ExamArchiveService.listFiles(req.params.id);
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
      await ExamArchiveService.assertExamMutable(req.params.id);
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
      await ExamArchiveService.assertExamMutable(req.params.id);
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

/**
 * Delete exam paper and cascade sections/questions (Only permitted on non-published exams)
 * DELETE /api/v1/exams/:id
 */
examRouter.delete(
  '/:id',
  authenticate,
  requirePermission('exams.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const examId = req.params.id;
      await ExamArchiveService.assertExamMutable(examId);
      await pgDb.query(`DELETE FROM "exam_questions" WHERE "examId" = $1`, [examId]);
      await pgDb.query(`DELETE FROM "exam_sections" WHERE "examId" = $1`, [examId]);
      await pgDb.query(`DELETE FROM "exams" WHERE "id" = $1`, [examId]);
      res.json({ success: true, message: 'Exam deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default examRouter;
