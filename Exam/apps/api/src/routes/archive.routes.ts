import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { ExamArchiveService } from '../services/exam-archive.service';

export const archiveRouter = Router();

/**
 * Feature 7.4: Search / list published exam archive
 * GET /api/v1/archive/exams
 */
archiveRouter.get(
  '/exams',
  authenticate,
  requirePermission('archive.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { academicYear, courseId, subjectId, search, page, limit, sortBy, sortOrder } = req.query;
      const result = await ExamArchiveService.searchArchive({
        academicYear: academicYear as string,
        courseId: courseId as string,
        subjectId: subjectId as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string,
        sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC',
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
 * Feature 7.2: Get full frozen exam snapshot
 * GET /api/v1/archive/exams/:id
 * GET /api/v1/archive/exams/:id/snapshot
 */
archiveRouter.get(
  ['/exams/:id', '/exams/:id/snapshot'],
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
 * Feature 7.3: Preserved Answer Key retrieval
 * GET /api/v1/archive/exams/:id/answer-key
 * GET /api/v1/archive/exams/:id/key
 */
archiveRouter.get(
  ['/exams/:id/answer-key', '/exams/:id/key'],
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
 * Feature 7.5: Version History of Exam Snapshots and Corrections
 * GET /api/v1/archive/exams/:id/history
 */
archiveRouter.get(
  '/exams/:id/history',
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
 * Feature 7.6: Get Question Paper PDF URL / Download
 * GET /api/v1/archive/exams/:id/pdf
 */
archiveRouter.get(
  '/exams/:id/pdf',
  authenticate,
  requirePermission('archive.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const snapshot = await ExamArchiveService.getSnapshotDetails(req.params.id);
      const files = await ExamArchiveService.listFiles(snapshot.id);
      const pdfFile = files.find((f) => f.fileType === 'application/pdf') || files[0];
      
      res.json({
        success: true,
        data: {
          snapshotId: snapshot.id,
          examName: snapshot.examName,
          storagePath: snapshot.storagePath,
          file: pdfFile || null,
          downloadUrl: pdfFile ? pdfFile.downloadUrl : `/storage/exams/sample.pdf`,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default archiveRouter;
