import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { ImportExportService } from '../services/import-export.service';
import { AppError } from '../middleware/error';

export const importExportRouter = Router();

importExportRouter.use(authenticate);

// Staff-only guard (Admin or Teacher)
const requireStaff = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  const isStaff = user.roles.some((r) => ['MAIN_ADMIN', 'SUB_ADMIN', 'TEACHER', 'ADMIN'].includes(r));
  if (!isStaff) {
    return next(new AppError(403, 'FORBIDDEN', 'Access denied. Only teachers and administrators can access import/export.'));
  }
  next();
};

importExportRouter.use(requireStaff);

// ----------------------------------------------------------------------------
// Export Questions (GET & POST)
// ----------------------------------------------------------------------------
const handleExportQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = {
      courseId: (req.query.courseId as string) || req.body?.courseId,
      subjectId: (req.query.subjectId as string) || req.body?.subjectId,
      syllabusNodeId: (req.query.syllabusNodeId as string) || req.body?.syllabusNodeId,
      difficulty: (req.query.difficulty as string) || req.body?.difficulty,
      type: (req.query.type as string) || req.body?.type,
      status: (req.query.status as string) || req.body?.status,
      includeAnswerKeys: req.query.includeAnswerKeys !== 'false' && req.body?.includeAnswerKeys !== false,
    };

    const pkg = await ImportExportService.exportQuestions(filter);

    if (req.query.download === 'true') {
      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Disposition', `attachment; filename="examos-questions-${dateStr}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(pkg, null, 2));
    }

    res.json({ success: true, data: pkg });
  } catch (err) {
    next(err);
  }
};

importExportRouter.get('/export/questions', handleExportQuestions);
importExportRouter.post('/export/questions', handleExportQuestions);

// ----------------------------------------------------------------------------
// Export Courses & Hierarchy (GET & POST)
// ----------------------------------------------------------------------------
const handleExportCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let courseIds: string[] | undefined = undefined;
    if (req.query.courseIds) {
      courseIds = (req.query.courseIds as string).split(',').map((id) => id.trim()).filter(Boolean);
    } else if (Array.isArray(req.body?.courseIds)) {
      courseIds = req.body.courseIds;
    }

    const pkg = await ImportExportService.exportCourses(courseIds);

    if (req.query.download === 'true') {
      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Disposition', `attachment; filename="examos-courses-${dateStr}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(pkg, null, 2));
    }

    res.json({ success: true, data: pkg });
  } catch (err) {
    next(err);
  }
};

importExportRouter.get('/export/courses', handleExportCourses);
importExportRouter.post('/export/courses', handleExportCourses);

// ----------------------------------------------------------------------------
// Validate Import Payload (Dry-run preview)
// ----------------------------------------------------------------------------
const handleValidateImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Missing import payload in request body' });
    }

    const dryRunResult = await ImportExportService.validateImportPayload(payload);
    res.json({
      success: true,
      data: dryRunResult,
    });
  } catch (err) {
    next(err);
  }
};

importExportRouter.post('/validate', handleValidateImport);
importExportRouter.post('/import/validate', handleValidateImport);

// ----------------------------------------------------------------------------
// Execute Import
// ----------------------------------------------------------------------------
const handleExecuteImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const conflictStrategy = payload.conflictStrategy || 'SKIP_EXISTING';
    const userId = req.user?.userId || 'usr_admin_test';

    const result = await ImportExportService.executeImport(payload, conflictStrategy, userId);
    res.json({
      success: result.success,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

importExportRouter.post('/execute', handleExecuteImport);
importExportRouter.post('/import/execute', handleExecuteImport);

export default importExportRouter;
