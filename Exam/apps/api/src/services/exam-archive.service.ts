import { pgDb } from '@repo/database';
import { AppError } from '../middleware/error';
import {
  ExamWorkflowStatus,
  UpdateExamWorkflowStatusDTO,
  AssignExamReviewerDTO,
  InitiateExamCorrectionDTO,
} from '@repo/types';
import * as fs from 'fs';
import * as path from 'path';

export class ExamArchiveService {
  /**
   * Helper: Check if an exam is already PUBLISHED or ARCHIVED to enforce data immutability.
   * Throws 400 EXAM_IMMUTABLE if modification is attempted on a published/archived exam.
   */
  static async assertExamMutable(examId: string) {
    const examRes = await pgDb.query(`SELECT "status" FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    }
    const status = (examRes.rows[0] as any).status;
    if (status === 'PUBLISHED' || status === 'ARCHIVED') {
      throw new AppError(
        400,
        'EXAM_IMMUTABLE',
        `Published exam "${examId}" is strictly immutable. No direct updates, deletions, or question swaps are permitted on published records. Use the formal post-publish correction workflow instead.`
      );
    }
  }

  /**
   * Feature 7.1: Workflow State Machine Transitions (DRAFT -> PREVIEW -> REVIEW -> APPROVED -> PUBLISHED)
   */
  static async updateExamStatus(examId: string, dto: UpdateExamWorkflowStatusDTO, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    }
    const exam = examRes.rows[0] as any;
    const currentStatus = exam.status as ExamWorkflowStatus;
    const targetStatus = dto.status;

    if (currentStatus === targetStatus) {
      return this.getWorkflowSummary(examId);
    }

    if (currentStatus === 'PUBLISHED' && targetStatus !== 'ARCHIVED') {
      throw new AppError(
        400,
        'EXAM_IMMUTABLE',
        'Cannot transition a PUBLISHED exam back to draft or review states. Use post-publish correction workflow.'
      );
    }

    // State machine transition validation
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['PREVIEW', 'REVIEW'],
      PREVIEW: ['REVIEW', 'DRAFT'],
      REVIEW: ['APPROVED', 'DRAFT', 'PREVIEW'],
      APPROVED: ['PUBLISHED', 'DRAFT', 'REVIEW'],
      PUBLISHED: ['ARCHIVED'],
      ARCHIVED: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        400,
        'INVALID_STATE_TRANSITION',
        `Invalid exam state transition from ${currentStatus} to ${targetStatus}. Allowed next states: ${allowed.join(', ') || 'none'}`
      );
    }

    // If transitioning to PUBLISHED, trigger snapshot creation
    if (targetStatus === 'PUBLISHED') {
      return this.publishAndSnapshotExam(examId, actorUserId, dto.notes);
    }

    // Update status in exams table
    await pgDb.query(
      `UPDATE "exams" SET "status" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
      [targetStatus, examId]
    );

    // Record workflow log
    const logId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "exam_workflow_logs" ("id", "examId", "fromStatus", "toStatus", "userId", "notes", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [logId, examId, currentStatus, targetStatus, actorUserId, dto.notes || null]
    );

    // Audit log
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "audit_logs" ("id", "userId", "action", "resource", "resourceId", "details")
       VALUES ($1, $2, 'exam.status_transition', 'exams', $3, $4)`,
      [auditId, actorUserId, examId, JSON.stringify({ from: currentStatus, to: targetStatus, notes: dto.notes })]
    );

    return this.getWorkflowSummary(examId);
  }

  /**
   * Feature 7.1: Assign Reviewer to Exam
   */
  static async assignReviewer(examId: string, dto: AssignExamReviewerDTO, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');

    const userRes = await pgDb.query(`SELECT id, "firstName", "lastName" FROM "users" WHERE "id" = $1`, [dto.reviewerId]);
    if (userRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Reviewer user not found');

    const revId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "exam_reviewers" ("id", "examId", "reviewerId", "assignedById", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT ("examId", "reviewerId") DO UPDATE SET "status" = 'PENDING', "updatedAt" = CURRENT_TIMESTAMP`,
      [revId, examId, dto.reviewerId, actorUserId]
    );

    // Record workflow log
    const logId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "exam_workflow_logs" ("id", "examId", "fromStatus", "toStatus", "userId", "notes", "createdAt")
       VALUES ($1, $2, 'REVIEW_ASSIGNED', 'REVIEW_ASSIGNED', $3, $4, CURRENT_TIMESTAMP)`,
      [logId, examId, actorUserId, `Assigned reviewer: ${dto.reviewerId}`]
    );

    return this.getWorkflowSummary(examId);
  }

  /**
   * Feature 7.1: View Workflow History
   */
  static async getWorkflowHistory(examId: string) {
    const logsRes = await pgDb.query(
      `SELECT w.*, u."firstName" as "userFirstName", u."lastName" as "userLastName", u.email as "userEmail"
       FROM "exam_workflow_logs" w
       LEFT JOIN "users" u ON w."userId" = u.id
       WHERE w."examId" = $1
       ORDER BY w."createdAt" ASC`,
      [examId]
    );

    const reviewersRes = await pgDb.query(
      `SELECT r.*, u."firstName", u."lastName", u.email
       FROM "exam_reviewers" r
       JOIN "users" u ON r."reviewerId" = u.id
       WHERE r."examId" = $1`,
      [examId]
    );

    return {
      examId,
      logs: logsRes.rows.map((r: any) => ({
        id: r.id,
        examId: r.examId,
        fromStatus: r.fromStatus,
        toStatus: r.toStatus,
        userId: r.userId,
        userName: r.userFirstName ? `${r.userFirstName} ${r.userLastName}` : null,
        userEmail: r.userEmail,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
      reviewers: reviewersRes.rows.map((r: any) => ({
        id: r.id,
        reviewerId: r.reviewerId,
        reviewerName: `${r.firstName} ${r.lastName}`,
        email: r.email,
        status: r.status,
        feedback: r.feedback,
        assignedAt: r.createdAt,
      })),
    };
  }

  /**
   * Feature 7.1 & 7.2: Publish exam and create immutable deep snapshot
   */
  static async publishAndSnapshotExam(examId: string, actorUserId: string, notes?: string) {
    const examRes = await pgDb.query(
      `SELECT e.*, c.name as "courseName", c.code as "courseCode", p.name as "patternName"
       FROM "exams" e
       LEFT JOIN "courses" c ON e."courseId" = c.id
       LEFT JOIN "exam_patterns" p ON e."patternId" = p.id
       WHERE e."id" = $1`,
      [examId]
    );
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    const exam = examRes.rows[0] as any;

    // Validate completeness
    const sectionsRes = await pgDb.query(
      `SELECT es.*, (SELECT COUNT(*) FROM "exam_questions" eq WHERE eq."examSectionId" = es.id) as "qCount"
       FROM "exam_sections" es
       WHERE es."examId" = $1
       ORDER BY es."sequenceOrder" ASC`,
      [examId]
    );

    if (sectionsRes.rows.length === 0) {
      throw new AppError(422, 'INCOMPLETE_EXAM', 'Cannot publish exam without any sections');
    }

    for (const sec of sectionsRes.rows as any[]) {
      if (parseInt(sec.qCount, 10) === 0) {
        throw new AppError(422, 'INCOMPLETE_EXAM', `Section "${sec.name}" contains zero questions`);
      }
    }

    // 1. Update status to PUBLISHED in exams table
    await pgDb.query(
      `UPDATE "exams" SET "status" = 'PUBLISHED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [examId]
    );

    // 2. Fetch full pattern details for frozen pattern snapshot
    let patternSnapshot: any = {};
    if (exam.patternId) {
      const pRes = await pgDb.query(`SELECT * FROM "exam_patterns" WHERE "id" = $1`, [exam.patternId]);
      if (pRes.rows.length > 0) patternSnapshot = pRes.rows[0];
    }

    const academicYear = String(new Date().getFullYear());
    const subjectRes = await pgDb.query(
      `SELECT s.id, s.code, s.name FROM "subjects" s
       JOIN "exam_sections" es ON es."subjectId" = s.id
       WHERE es."examId" = $1 LIMIT 1`,
      [examId]
    );
    const primarySubject = subjectRes.rows[0] as any || { id: null, code: 'GEN', name: 'General' };
    const examNameSlug = exam.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const storagePath = `/storage/exams/${academicYear}/${primarySubject.code || 'GEN'}/${examNameSlug}/`;

    // 3. Insert into exam_snapshots (V1)
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "exam_snapshots" (
        "id", "examId", "academicYear", "courseId", "subjectId", "examName",
        "patternSnapshot", "instructions", "durationMinutes", "totalMarks",
        "storagePath", "publishedAt", "publishedById", "version", "status",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12, 1, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        snapshotId,
        examId,
        academicYear,
        exam.courseId || null,
        primarySubject.id || null,
        exam.name,
        JSON.stringify(patternSnapshot),
        exam.instructions,
        exam.durationMinutes || 60,
        exam.totalMarks || 0.0,
        storagePath,
        actorUserId,
      ]
    );

    // 4. Insert sections and questions into snapshot tables
    for (const sec of sectionsRes.rows as any[]) {
      const snapSectionId = `snapsecur_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pgDb.query(
        `INSERT INTO "exam_snapshot_sections" (
          "id", "snapshotId", "name", "sequenceOrder", "subjectId", "numQuestions",
          "marksPerQuestion", "totalMarks", "marksCorrect", "marksWrong", "marksUnattempted",
          "sectionRules", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          snapSectionId,
          snapshotId,
          sec.name,
          sec.sequenceOrder,
          sec.subjectId || null,
          parseInt(sec.qCount, 10),
          sec.marksPerQuestion || 1.0,
          sec.totalMarks || 0.0,
          sec.marksCorrect || 1.0,
          sec.marksWrong || 0.0,
          sec.marksUnattempted || 0.0,
          sec.sectionRules ? JSON.stringify(sec.sectionRules) : null,
        ]
      );

      // Fetch questions in this section
      const qRes = await pgDb.query(
        `SELECT eq."sequenceOrder" as "displayOrder", eq."marksCorrect", eq."marksWrong",
                q.id as "questionId", q.type, q.content, q.data, q.version, q.difficulty, q.marks
         FROM "exam_questions" eq
         JOIN "questions" q ON eq."questionId" = q.id
         WHERE eq."examSectionId" = $1
         ORDER BY eq."sequenceOrder" ASC`,
        [sec.id]
      );

      for (const q of qRes.rows as any[]) {
        const snapQId = `snapq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const qData = typeof q.data === 'string' ? JSON.parse(q.data) : q.data || {};
        
        // Extract type-specific answer key
        let answerKey: any = {};
        if (q.type === 'MCQ') {
          answerKey = {
            correctAnswer: qData.correctAnswer || qData.answer,
            options: qData.options || [],
            explanation: qData.explanation,
          };
        } else if (q.type === 'MULTIPLE_SELECT' || q.type === 'MSQ') {
          answerKey = {
            correctAnswers: qData.correctAnswers || qData.correctAnswer || [],
            options: qData.options || [],
            partialScoring: true,
            explanation: qData.explanation,
          };
        } else if (q.type === 'NUMERICAL') {
          answerKey = {
            correctValue: qData.correctValue !== undefined ? qData.correctValue : qData.correctAnswer,
            tolerance: qData.tolerance !== undefined ? qData.tolerance : 0,
            unit: qData.unit || null,
            explanation: qData.explanation,
          };
        } else if (q.type === 'TRUE_FALSE') {
          answerKey = {
            correctAnswer: qData.correctAnswer,
            explanation: qData.explanation,
          };
        } else if (q.type === 'MATCHING') {
          answerKey = {
            pairs: qData.pairs || [],
            leftItems: qData.leftItems || [],
            rightItems: qData.rightItems || [],
            explanation: qData.explanation,
          };
        } else {
          answerKey = {
            correctAnswer: qData.correctAnswer || qData.answer,
            modelAnswer: qData.modelAnswer,
            rubric: qData.rubric,
            explanation: qData.explanation,
          };
        }

        // Sanitized content for presentation
        const questionContent = {
          content: q.content,
          type: q.type,
          difficulty: q.difficulty,
          options: qData.options || [],
          pairs: qData.pairs || [],
          leftItems: qData.leftItems || [],
          rightItems: qData.rightItems || [],
          images: qData.images || [],
        };

        await pgDb.query(
          `INSERT INTO "exam_snapshot_questions" (
            "id", "snapshotSectionId", "snapshotId", "originalQuestionId",
            "questionVersion", "questionType", "questionContent", "answerKey",
            "marks", "negativeMarks", "displayOrder", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
          [
            snapQId,
            snapSectionId,
            snapshotId,
            q.questionId,
            q.version || 1,
            q.type,
            JSON.stringify(questionContent),
            JSON.stringify(answerKey),
            q.marksCorrect || q.marks || 1.0,
            q.marksWrong || 0.0,
            q.displayOrder || 1,
          ]
        );
      }
    }

    // 5. Generate default question paper PDF record in exam_files
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "exam_files" ("id", "examId", "snapshotId", "fileName", "fileType", "fileSize", "storagePath", "createdById", "createdAt")
       VALUES ($1, $2, $3, $4, 'application/pdf', 1048576, $5, $6, CURRENT_TIMESTAMP)`,
      [fileId, examId, snapshotId, `${examNameSlug}-question-paper.pdf`, `${storagePath}${examNameSlug}-question-paper.pdf`, actorUserId]
    );

    // 6. Record workflow log
    const logId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "exam_workflow_logs" ("id", "examId", "fromStatus", "toStatus", "userId", "notes", "createdAt")
       VALUES ($1, $2, 'APPROVED', 'PUBLISHED', $3, $4, CURRENT_TIMESTAMP)`,
      [logId, examId, actorUserId, notes || 'Exam successfully published and snapshot created']
    );

    // 7. Audit log
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "audit_logs" ("id", "userId", "action", "resource", "resourceId", "details")
       VALUES ($1, $2, 'exam.published_snapshot', 'exam_snapshots', $3, $4)`,
      [auditId, actorUserId, snapshotId, JSON.stringify({ examId, examName: exam.name, totalMarks: exam.totalMarks, version: 1 })]
    );

    return this.getSnapshotDetails(snapshotId);
  }

  /**
   * Feature 7.4: Search / List Published Exams Archive
   */
  static async searchArchive(params: {
    academicYear?: string;
    courseId?: string;
    subjectId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const { academicYear, courseId, subjectId, search, page = 1, limit = 20, sortBy = 'publishedAt', sortOrder = 'DESC' } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (academicYear) {
      conditions.push(`s."academicYear" = $${idx++}`);
      values.push(academicYear);
    }
    if (courseId) {
      conditions.push(`s."courseId" = $${idx++}`);
      values.push(courseId);
    }
    if (subjectId) {
      conditions.push(`s."subjectId" = $${idx++}`);
      values.push(subjectId);
    }
    if (search) {
      conditions.push(`s."examName" ILIKE $${idx++}`);
      values.push(`%${search}%`);
    }

    const allowedSortColumns: Record<string, string> = {
      publishedAt: 'publishedAt',
      examName: 'examName',
      totalMarks: 'totalMarks',
      createdAt: 'createdAt',
    };
    const safeSortBy = allowedSortColumns[sortBy] || 'publishedAt';
    const safeSortOrder = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY s."${safeSortBy}" ${safeSortOrder}`;

    const countRes = await pgDb.query(`SELECT COUNT(*) as total FROM "exam_snapshots" s ${whereClause}`, values);
    const total = parseInt((countRes.rows[0] as any).total, 10);

    const listRes = await pgDb.query(
      `SELECT s.*, c.name as "courseName", sub.name as "subjectName", u."firstName" as "publisherFirstName", u."lastName" as "publisherLastName",
              (SELECT COUNT(*) FROM "exam_snapshot_questions" sq WHERE sq."snapshotId" = s.id) as "questionsCount"
       FROM "exam_snapshots" s
       LEFT JOIN "courses" c ON s."courseId" = c.id
       LEFT JOIN "subjects" sub ON s."subjectId" = sub.id
       LEFT JOIN "users" u ON s."publishedById" = u.id
       ${whereClause}
       ${orderClause}
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );

    return {
      items: listRes.rows.map((r: any) => ({
        id: r.id,
        examId: r.examId,
        academicYear: r.academicYear,
        courseId: r.courseId,
        courseName: r.courseName,
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        examName: r.examName,
        patternSnapshot: typeof r.patternSnapshot === 'string' ? JSON.parse(r.patternSnapshot) : r.patternSnapshot,
        instructions: r.instructions,
        durationMinutes: r.durationMinutes,
        totalMarks: r.totalMarks,
        storagePath: r.storagePath,
        publishedAt: r.publishedAt,
        publishedById: r.publishedById,
        publishedByName: r.publisherFirstName ? `${r.publisherFirstName} ${r.publisherLastName}` : 'System Admin',
        version: r.version,
        status: r.status,
        questionsCount: parseInt(r.questionsCount || 0, 10),
        createdAt: r.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Feature 7.2: Get Full Frozen Exam Snapshot Details
   */
  static async getSnapshotDetails(snapshotIdOrExamId: string) {
    const snapRes = await pgDb.query(
      `SELECT s.*, c.name as "courseName", sub.name as "subjectName", u."firstName" as "publisherFirstName", u."lastName" as "publisherLastName"
       FROM "exam_snapshots" s
       LEFT JOIN "courses" c ON s."courseId" = c.id
       LEFT JOIN "subjects" sub ON s."subjectId" = sub.id
       LEFT JOIN "users" u ON s."publishedById" = u.id
       WHERE s."id" = $1 OR s."examId" = $1
       ORDER BY s."version" DESC LIMIT 1`,
      [snapshotIdOrExamId]
    );

    if (snapRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Exam snapshot not found for ID "${snapshotIdOrExamId}"`);
    }

    const s = snapRes.rows[0] as any;
    const sectionsRes = await pgDb.query(
      `SELECT es.*, sub.name as "subjectName"
       FROM "exam_snapshot_sections" es
       LEFT JOIN "subjects" sub ON es."subjectId" = sub.id
       WHERE es."snapshotId" = $1
       ORDER BY es."sequenceOrder" ASC`,
      [s.id]
    );

    const questionsRes = await pgDb.query(
      `SELECT sq.*
       FROM "exam_snapshot_questions" sq
       WHERE sq."snapshotId" = $1
       ORDER BY sq."displayOrder" ASC`,
      [s.id]
    );

    const sections = sectionsRes.rows.map((sec: any) => {
      const secQs = questionsRes.rows.filter((q: any) => q.snapshotSectionId === sec.id);
      return {
        id: sec.id,
        snapshotId: sec.snapshotId,
        name: sec.name,
        sequenceOrder: sec.sequenceOrder,
        subjectId: sec.subjectId,
        subjectName: sec.subjectName,
        numQuestions: sec.numQuestions,
        marksPerQuestion: sec.marksPerQuestion,
        totalMarks: sec.totalMarks,
        marksCorrect: sec.marksCorrect,
        marksWrong: sec.marksWrong,
        marksUnattempted: sec.marksUnattempted,
        sectionRules: typeof sec.sectionRules === 'string' ? JSON.parse(sec.sectionRules) : sec.sectionRules,
        questions: secQs.map((q: any) => ({
          id: q.id,
          snapshotSectionId: q.snapshotSectionId,
          snapshotId: q.snapshotId,
          originalQuestionId: q.originalQuestionId,
          questionVersion: q.questionVersion,
          questionType: q.questionType,
          questionContent: typeof q.questionContent === 'string' ? JSON.parse(q.questionContent) : q.questionContent,
          answerKey: typeof q.answerKey === 'string' ? JSON.parse(q.answerKey) : q.answerKey || {},
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          displayOrder: q.displayOrder,
          createdAt: q.createdAt,
        })),
      };
    });

    return {
      id: s.id,
      examId: s.examId,
      academicYear: s.academicYear,
      courseId: s.courseId,
      courseName: s.courseName,
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      examName: s.examName,
      patternSnapshot: typeof s.patternSnapshot === 'string' ? JSON.parse(s.patternSnapshot) : s.patternSnapshot,
      instructions: s.instructions,
      durationMinutes: s.durationMinutes,
      totalMarks: s.totalMarks,
      storagePath: s.storagePath,
      publishedAt: s.publishedAt,
      publishedById: s.publishedById,
      publishedByName: s.publisherFirstName ? `${s.publisherFirstName} ${s.publisherLastName}` : 'System Admin',
      version: s.version,
      status: s.status,
      createdAt: s.createdAt,
      sections,
      questionsCount: questionsRes.rows.length,
    };
  }

  /**
   * Feature 7.3: Preserved Answer Key Retrieval (Gated by permission)
   */
  static async getAnswerKey(snapshotIdOrExamId: string) {
    const snapRes = await pgDb.query(
      `SELECT id, "examId", "examName", "version", "publishedAt"
       FROM "exam_snapshots"
       WHERE "id" = $1 OR "examId" = $1
       ORDER BY "version" DESC LIMIT 1`,
      [snapshotIdOrExamId]
    );

    if (snapRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Exam snapshot not found for ID "${snapshotIdOrExamId}"`);
    }

    const s = snapRes.rows[0] as any;
    const sectionsRes = await pgDb.query(
      `SELECT id, name, "sequenceOrder"
       FROM "exam_snapshot_sections"
       WHERE "snapshotId" = $1
       ORDER BY "sequenceOrder" ASC`,
      [s.id]
    );

    const questionsRes = await pgDb.query(
      `SELECT id, "snapshotSectionId", "originalQuestionId", "displayOrder", "questionType", "marks", "negativeMarks", "answerKey"
       FROM "exam_snapshot_questions"
       WHERE "snapshotId" = $1
       ORDER BY "displayOrder" ASC`,
      [s.id]
    );

    return {
      snapshotId: s.id,
      examId: s.examId,
      examName: s.examName,
      version: s.version,
      publishedAt: s.publishedAt,
      sections: sectionsRes.rows.map((sec: any) => {
        const secQs = questionsRes.rows.filter((q: any) => q.snapshotSectionId === sec.id);
        return {
          sectionId: sec.id,
          sectionName: sec.name,
          questions: secQs.map((q: any) => {
            const rawKey = typeof q.answerKey === 'string' ? JSON.parse(q.answerKey) : q.answerKey || {};
            return {
              id: q.id,
              originalQuestionId: q.originalQuestionId,
              displayOrder: q.displayOrder,
              questionType: q.questionType,
              marks: q.marks,
              negativeMarks: q.negativeMarks,
              answerKey: rawKey,
              explanation: rawKey.explanation,
            };
          }),
        };
      }),
    };
  }

  /**
   * Feature 7.5: Post-Publish Formal Correction Workflow (V1 -> V2)
   */
  static async initiateCorrection(examIdOrSnapshotId: string, dto: InitiateExamCorrectionDTO, actorUserId: string) {
    const originalSnap = await this.getSnapshotDetails(examIdOrSnapshotId);
    const newVersion = originalSnap.version + 1;

    // 1. Create a new version snapshot row
    const newSnapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "exam_snapshots" (
        "id", "examId", "academicYear", "courseId", "subjectId", "examName",
        "patternSnapshot", "instructions", "durationMinutes", "totalMarks",
        "storagePath", "publishedAt", "publishedById", "version", "status",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12, $13, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        newSnapshotId,
        originalSnap.examId,
        originalSnap.academicYear,
        originalSnap.courseId || null,
        originalSnap.subjectId || null,
        `${originalSnap.examName} (v${newVersion})`,
        JSON.stringify(originalSnap.patternSnapshot),
        originalSnap.instructions,
        originalSnap.durationMinutes,
        originalSnap.totalMarks,
        originalSnap.storagePath,
        actorUserId,
        newVersion,
      ]
    );

    // 2. Clone sections and update modified questions
    for (const sec of originalSnap.sections || []) {
      const newSecId = `snapsecur_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pgDb.query(
        `INSERT INTO "exam_snapshot_sections" (
          "id", "snapshotId", "name", "sequenceOrder", "subjectId", "numQuestions",
          "marksPerQuestion", "totalMarks", "marksCorrect", "marksWrong", "marksUnattempted",
          "sectionRules", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          newSecId,
          newSnapshotId,
          sec.name,
          sec.sequenceOrder,
          sec.subjectId || null,
          sec.numQuestions,
          sec.marksPerQuestion,
          sec.totalMarks,
          sec.marksCorrect,
          sec.marksWrong,
          sec.marksUnattempted,
          sec.sectionRules ? JSON.stringify(sec.sectionRules) : null,
        ]
      );

      for (const q of sec.questions || []) {
        const newQId = `snapq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        // Check if there is a correction payload for this question
        const correction = dto.changes.find(
          (c) => c.questionId === q.id || c.questionId === q.originalQuestionId
        );

        let finalAnswerKey = q.answerKey || {};
        if (correction) {
          finalAnswerKey = {
            ...finalAnswerKey,
            ...correction.correctedAnswerKey,
            explanation: correction.explanation || finalAnswerKey.explanation,
          };
        }

        await pgDb.query(
          `INSERT INTO "exam_snapshot_questions" (
            "id", "snapshotSectionId", "snapshotId", "originalQuestionId",
            "questionVersion", "questionType", "questionContent", "answerKey",
            "marks", "negativeMarks", "displayOrder", "createdAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
          [
            newQId,
            newSecId,
            newSnapshotId,
            q.originalQuestionId,
            q.questionVersion + (correction ? 1 : 0),
            q.questionType,
            JSON.stringify(q.questionContent),
            JSON.stringify(finalAnswerKey),
            q.marks,
            q.negativeMarks,
            q.displayOrder,
          ]
        );
      }
    }

    // 3. Record correction audit entry in exam_corrections
    const corrId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "exam_corrections" (
        "id", "originalSnapshotId", "correctedSnapshotId", "version", "reason",
        "changesSummary", "initiatedById", "status", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'APPLIED', CURRENT_TIMESTAMP)`,
      [
        corrId,
        originalSnap.id,
        newSnapshotId,
        newVersion,
        dto.reason,
        JSON.stringify(dto.changes),
        actorUserId,
      ]
    );

    // 4. Audit log
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "audit_logs" ("id", "userId", "action", "resource", "resourceId", "details")
       VALUES ($1, $2, 'exam.correction_published', 'exam_snapshots', $3, $4)`,
      [
        auditId,
        actorUserId,
        newSnapshotId,
        JSON.stringify({
          originalSnapshotId: originalSnap.id,
          newVersion,
          reason: dto.reason,
          changesCount: dto.changes.length,
        }),
      ]
    );

    return this.getSnapshotDetails(newSnapshotId);
  }

  /**
   * Feature 7.5: Version History of Exam Snapshots and Corrections
   */
  static async getVersionHistory(examIdOrSnapshotId: string) {
    const snapRes = await pgDb.query(
      `SELECT s.id, s."examId" FROM "exam_snapshots" s WHERE s.id = $1 OR s."examId" = $1 LIMIT 1`,
      [examIdOrSnapshotId]
    );
    if (snapRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Exam snapshot not found');
    }
    const examId = (snapRes.rows[0] as any).examId;

    const versionsRes = await pgDb.query(
      `SELECT s.*, u."firstName" as "publisherFirstName", u."lastName" as "publisherLastName"
       FROM "exam_snapshots" s
       LEFT JOIN "users" u ON s."publishedById" = u.id
       WHERE s."examId" = $1
       ORDER BY s."version" ASC`,
      [examId]
    );

    const correctionsRes = await pgDb.query(
      `SELECT c.*, u."firstName", u."lastName"
       FROM "exam_corrections" c
       JOIN "users" u ON c."initiatedById" = u.id
       WHERE c."originalSnapshotId" IN (SELECT id FROM "exam_snapshots" WHERE "examId" = $1)
          OR c."correctedSnapshotId" IN (SELECT id FROM "exam_snapshots" WHERE "examId" = $1)
       ORDER BY c."createdAt" ASC`,
      [examId]
    );

    return {
      examId,
      versions: versionsRes.rows.map((r: any) => ({
        id: r.id,
        version: r.version,
        examName: r.examName,
        totalMarks: r.totalMarks,
        publishedAt: r.publishedAt,
        publishedByName: r.publisherFirstName ? `${r.publisherFirstName} ${r.publisherLastName}` : 'Admin',
        status: r.status,
      })),
      corrections: correctionsRes.rows.map((c: any) => ({
        id: c.id,
        originalSnapshotId: c.originalSnapshotId,
        correctedSnapshotId: c.correctedSnapshotId,
        version: c.version,
        reason: c.reason,
        changesSummary: typeof c.changesSummary === 'string' ? JSON.parse(c.changesSummary) : c.changesSummary,
        initiatedByName: `${c.firstName} ${c.lastName}`,
        createdAt: c.createdAt,
      })),
    };
  }

  /**
   * Feature 7.6: Exam File Management
   */
  static async listFiles(examIdOrSnapshotId: string) {
    const filesRes = await pgDb.query(
      `SELECT f.*, u."firstName", u."lastName"
       FROM "exam_files" f
       LEFT JOIN "users" u ON f."createdById" = u.id
       WHERE f."examId" = $1 OR f."snapshotId" = $1
       ORDER BY f."createdAt" DESC`,
      [examIdOrSnapshotId]
    );

    return filesRes.rows.map((f: any) => ({
      id: f.id,
      examId: f.examId,
      snapshotId: f.snapshotId,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      storagePath: f.storagePath,
      downloadUrl: `/api/v1/exams/${f.examId}/files/${f.id}/download`,
      createdByName: f.firstName ? `${f.firstName} ${f.lastName}` : null,
      createdAt: f.createdAt,
    }));
  }

  static async uploadFile(examId: string, fileData: { fileName: string; fileType: string; fileSize: number; content?: string }, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');

    // MIME type validation
    const allowedMime = ['application/pdf', 'image/png', 'image/jpeg', 'application/json'];
    if (!allowedMime.includes(fileData.fileType)) {
      throw new AppError(400, 'INVALID_FILE_TYPE', `File type "${fileData.fileType}" is not permitted. Allowed types: ${allowedMime.join(', ')}`);
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const storagePath = `/storage/exams/2026/GEN/${examId}/${fileData.fileName}`;

    await pgDb.query(
      `INSERT INTO "exam_files" ("id", "examId", "fileName", "fileType", "fileSize", "storagePath", "createdById", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [fileId, examId, fileData.fileName, fileData.fileType, fileData.fileSize, storagePath, actorUserId]
    );

    return {
      id: fileId,
      examId,
      fileName: fileData.fileName,
      fileType: fileData.fileType,
      fileSize: fileData.fileSize,
      storagePath,
      downloadUrl: `/api/v1/exams/${examId}/files/${fileId}/download`,
    };
  }

  static async getWorkflowSummary(examId: string) {
    const examRes = await pgDb.query(`SELECT id, name, status, "updatedAt" FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    const exam = examRes.rows[0] as any;

    const history = await this.getWorkflowHistory(examId);
    return {
      examId: exam.id,
      examName: exam.name,
      status: exam.status,
      updatedAt: exam.updatedAt,
      logs: history.logs,
      reviewers: history.reviewers,
    };
  }
}
