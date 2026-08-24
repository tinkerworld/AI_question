import { pgDb } from '@repo/database';
import { questionTypeRegistry } from '@repo/question-types';
import { AppError } from '../middleware/error';
import { analyticsService } from './analytics.service';
import crypto from 'crypto';

// ----------------------------------------------------------------------------
// Deterministic Seeded PRNG & Shuffling Engine (Spec 17 / Spec 16)
// ----------------------------------------------------------------------------
function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash >>> 0;
}

export function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  if (!Array.isArray(array) || array.length <= 1) return [...(array || [])];
  const result = [...array];
  const rng = mulberry32(stringToSeed(seed));
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

function safeParseJson(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

// ----------------------------------------------------------------------------
// Attempt & Evaluation Service Layer
// ----------------------------------------------------------------------------
export class AttemptService {
  /**
   * List available exams for student (Feature 6.1)
   */
  async getStudentExams(
    userId: string,
    previewOptions?: { contentVersion?: string; courseAccess?: string[] | string }
  ) {
    let enrolledCourseIds: string[] = [];
    const restrictedCourses =
      previewOptions?.courseAccess &&
      (Array.isArray(previewOptions.courseAccess)
        ? !previewOptions.courseAccess.includes('*') && previewOptions.courseAccess.length > 0
          ? previewOptions.courseAccess
          : null
        : previewOptions.courseAccess !== '*'
        ? [previewOptions.courseAccess]
        : null);

    if (restrictedCourses) {
      enrolledCourseIds = restrictedCourses;
    } else {
      const userEnrollments = await pgDb.query(
        `SELECT "courseId" FROM "enrollments" WHERE "userId" = $1 AND "status" = 'ACTIVE'`,
        [userId]
      );
      enrolledCourseIds = userEnrollments.rows.map((r: any) => r.courseId);
    }

    // Content version status filter: DRAFT preview session includes DRAFT content
    const isDraftPreview = previewOptions?.contentVersion === 'DRAFT';
    const statusClause = isDraftPreview
      ? `("status" = 'PUBLISHED' OR "status" = 'DRAFT')`
      : `"status" = 'PUBLISHED'`;

    let examsQuery = `SELECT * FROM "exams" WHERE ${statusClause}`;
    const queryParams: any[] = [];

    if (restrictedCourses) {
      queryParams.push(restrictedCourses);
      examsQuery += ` AND "courseId" = ANY($${queryParams.length})`;
    }

    examsQuery += ` ORDER BY "createdAt" DESC`;
    const examsRes = await pgDb.query(examsQuery, queryParams);

    const now = new Date();
    const result = [];

    for (const exam of examsRes.rows as any[]) {
      // Check attempts
      const attemptsRes = await pgDb.query(
        `SELECT * FROM "exam_attempts" WHERE "examId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
        [exam.id, userId]
      );
      const attempts = attemptsRes.rows as any[];
      const latestAttempt = attempts[0] || null;

      // Calculate time window status
      let timeStatus = 'OPEN';
      if (exam.startTime && now < new Date(exam.startTime)) {
        timeStatus = 'UPCOMING';
      } else if (exam.endTime && now > new Date(exam.endTime)) {
        timeStatus = 'EXPIRED';
      }

      // Check section count & question count
      const secRes = await pgDb.query(`SELECT COUNT(*) as count FROM "exam_sections" WHERE "examId" = $1`, [exam.id]);
      const qRes = await pgDb.query(`SELECT COUNT(*) as count FROM "exam_questions" WHERE "examId" = $1`, [exam.id]);

      result.push({
        id: exam.id,
        name: exam.name,
        courseId: exam.courseId,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        startTime: exam.startTime,
        endTime: exam.endTime,
        status: exam.status,
        timeStatus,
        isEnrolled: exam.courseId ? enrolledCourseIds.includes(exam.courseId) : true,
        sectionCount: parseInt((secRes.rows[0] as any).count, 10),
        totalQuestions: parseInt((qRes.rows[0] as any).count, 10),
        attemptsCount: attempts.length,
        latestAttempt: latestAttempt ? {
          id: latestAttempt.id,
          status: latestAttempt.status,
          startTime: latestAttempt.startTime,
          endTime: latestAttempt.endTime,
          totalScore: latestAttempt.totalScore,
          percentage: latestAttempt.percentage,
        } : null,
      });
    }

    return result;
  }

  /**
   * Get exam instructions & metadata (Feature 6.1)
   */
  async getExamInstructions(
    examId: string,
    userId: string,
    previewOptions?: { contentVersion?: string; courseAccess?: string[] | string }
  ) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) {
      throw new AppError(404, 'EXAM_550', 'Exam not found');
    }
    const exam = examRes.rows[0] as any;

    const restrictedCourses =
      previewOptions?.courseAccess &&
      (Array.isArray(previewOptions.courseAccess)
        ? !previewOptions.courseAccess.includes('*') && previewOptions.courseAccess.length > 0
          ? previewOptions.courseAccess
          : null
        : previewOptions.courseAccess !== '*'
        ? [previewOptions.courseAccess]
        : null);

    if (restrictedCourses && exam.courseId && !restrictedCourses.includes(exam.courseId)) {
      throw new AppError(403, 'COURSE_ACCESS_RESTRICTED', 'Access to this course is restricted in current preview session');
    }

    if (exam.status !== 'PUBLISHED' && previewOptions?.contentVersion !== 'DRAFT') {
      throw new AppError(404, 'EXAM_550', 'Exam not found or not published');
    }

    const sectionsRes = await pgDb.query(
      `SELECT * FROM "exam_sections" WHERE "examId" = $1 ORDER BY "sequenceOrder" ASC`,
      [examId]
    );

    const questionsRes = await pgDb.query(
      `SELECT COUNT(*) as count FROM "exam_questions" WHERE "examId" = $1`,
      [examId]
    );

    return {
      id: exam.id,
      name: exam.name,
      instructions: exam.instructions || 'Read all questions carefully. Each section carries specific marks and negative penalties. Submit once completed.',
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      startTime: exam.startTime,
      endTime: exam.endTime,
      status: exam.status,
      totalQuestions: parseInt((questionsRes.rows[0] as any).count, 10),
      sections: sectionsRes.rows.map((s: any) => ({
        id: s.id,
        name: s.name,
        sequenceOrder: s.sequenceOrder,
        numQuestions: s.numQuestions,
        marksPerQuestion: s.marksPerQuestion,
        marksCorrect: s.marksCorrect,
        marksWrong: s.marksWrong,
        totalMarks: s.totalMarks,
      })),
    };
  }

  /**
   * Start a new exam attempt (Feature 6.2)
   */
  async startAttempt(
    examId: string,
    userId: string,
    previewOptions?: { contentVersion?: string; courseAccess?: string[] | string; bypassLimits?: boolean; isSystem?: boolean; [key: string]: any }
  ) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) {
      throw new AppError(404, 'EXAM_550', 'Exam not found');
    }
    const exam = examRes.rows[0] as any;

    const restrictedCourses =
      previewOptions?.courseAccess &&
      (Array.isArray(previewOptions.courseAccess)
        ? !previewOptions.courseAccess.includes('*') && previewOptions.courseAccess.length > 0
          ? previewOptions.courseAccess
          : null
        : previewOptions.courseAccess !== '*'
        ? [previewOptions.courseAccess]
        : null);

    if (restrictedCourses && exam.courseId && !restrictedCourses.includes(exam.courseId)) {
      throw new AppError(403, 'COURSE_ACCESS_RESTRICTED', 'Access to this course is restricted in current preview session');
    }

    if (exam.status !== 'PUBLISHED' && previewOptions?.contentVersion !== 'DRAFT') {
      throw new AppError(400, 'EXAM_551', 'Exam is not published and cannot be attempted');
    }

    const now = new Date();
    if (exam.startTime && now < new Date(exam.startTime)) {
      throw new AppError(403, 'ATTEMPT_655', 'Exam scheduled window has not started yet');
    }
    if (exam.endTime && now > new Date(exam.endTime)) {
      throw new AppError(403, 'ATTEMPT_655', 'Exam scheduled window has expired');
    }

    // Check if user already has an IN_PROGRESS attempt
    const existingAttemptRes = await pgDb.query(
      `SELECT * FROM "exam_attempts" WHERE "examId" = $1 AND "userId" = $2 AND "status" = 'IN_PROGRESS'`,
      [examId, userId]
    );

    if (existingAttemptRes.rows.length > 0) {
      const existing = existingAttemptRes.rows[0] as any;
      const state = await this.getAttemptState(existing.id, userId);
      return { ...state, isResumed: true };
    }

    // Entitlement Check: mock_tests limit
    if (!previewOptions?.bypassLimits && !previewOptions?.isSystem) {
      const { EntitlementService } = await import('./entitlement.service');
      const entCheck = await EntitlementService.checkAccess(userId, 'mock_tests', previewOptions);
      if (!entCheck.allowed) {
        throw new AppError(403, 'ENTITLEMENT_LIMIT_REACHED', entCheck.reason || 'Mock test limit reached for your plan. Please upgrade to unlock unlimited exams.');
      }
    }

    // Fetch sections
    const sectionsRes = await pgDb.query(
      `SELECT * FROM "exam_sections" WHERE "examId" = $1 ORDER BY "sequenceOrder" ASC`,
      [examId]
    );
    const sections = sectionsRes.rows as any[];

    if (sections.length === 0) {
      throw new AppError(400, 'EXAM_553', 'Exam has no configured sections or questions');
    }

    // Generate unique deterministic shuffle seed
    const shuffleSeed = `seed_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const attemptId = `att_${crypto.randomUUID()}`;

    // Create attempt record
    await pgDb.query(
      `INSERT INTO "exam_attempts" (
        "id", "examId", "userId", "shuffleSeed", "startTime", "status", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'IN_PROGRESS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [attemptId, examId, userId, shuffleSeed]
    );

    let totalQuestionsCount = 0;
    let globalOrder = 0;

    for (const section of sections) {
      const eqRes = await pgDb.query(
        `SELECT eq."questionId", eq."marksCorrect", eq."marksWrong", eq."sequenceOrder",
                q."type", q."content", q."data", q."difficulty", q."marks",
                q."syllabusNodeId", q."subjectId", q."courseId"
         FROM "exam_questions" eq
         JOIN "questions" q ON eq."questionId" = q."id"
         WHERE eq."examId" = $1 AND eq."examSectionId" = $2
         ORDER BY eq."sequenceOrder" ASC`,
        [examId, section.id]
      );

      const questionsList = eqRes.rows as any[];
      // Deterministically shuffle questions within section
      const shuffledSectionQuestions = shuffleWithSeed(questionsList, `${shuffleSeed}_sec_${section.id}`);

      for (const q of shuffledSectionQuestions) {
        globalOrder++;
        totalQuestionsCount++;
        const qData = safeParseJson(q.data);

        // Deterministically shuffle options for MCQ / Multi-select
        let sanitizedOptions = undefined;
        if (qData?.options && Array.isArray(qData.options)) {
          const shuffledOpts = shuffleWithSeed(qData.options, `${shuffleSeed}_q_${q.questionId}`);
          sanitizedOptions = shuffledOpts.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
          }));
        }

        let pairs = undefined;
        if (qData?.pairs && Array.isArray(qData.pairs)) {
          pairs = qData.pairs.map((p: any) => ({ left: p.left, right: p.right }));
        }

        // Create sanitized question snapshot (strip answers / explanations)
        const studentSnapshot = {
          type: q.type,
          content: q.content,
          difficulty: q.difficulty,
          marks: q.marks,
          marksCorrect: q.marksCorrect ?? section.marksCorrect,
          marksWrong: q.marksWrong ?? section.marksWrong,
          syllabusNodeId: q.syllabusNodeId,
          subjectId: q.subjectId,
          courseId: q.courseId,
          options: sanitizedOptions,
          pairs,
          rubricCriteria: qData?.rubricCriteria,
        };

        const qaId = `qa_${crypto.randomUUID()}`;
        await pgDb.query(
          `INSERT INTO "question_attempts" (
            "id", "attemptId", "questionId", "examSectionId", "sequenceOrder",
            "questionSnapshot", "studentAnswer", "isMarkedForReview", "timeSpentSeconds",
            "marksAwarded", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, NULL, false, 0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [qaId, attemptId, q.questionId, section.id, globalOrder, JSON.stringify(studentSnapshot)]
        );
      }
    }

    // Update totalQuestions in attempt
    await pgDb.query(
      `UPDATE "exam_attempts" SET "totalQuestions" = $1 WHERE "id" = $2`,
      [totalQuestionsCount, attemptId]
    );

    return this.getAttemptState(attemptId, userId);
  }

  /**
   * Get current state of an attempt (Feature 6.2)
   */
  async getAttemptState(attemptId: string, requestingUserId: string, isElevated: boolean = false) {
    const attemptRes = await pgDb.query(`SELECT * FROM "exam_attempts" WHERE "id" = $1`, [attemptId]);
    if (attemptRes.rows.length === 0) {
      throw new AppError(404, 'ATTEMPT_650', 'Attempt not found');
    }
    const attempt = attemptRes.rows[0] as any;

    // SECTION 7 SECURITY: IDOR Protection
    if (attempt.userId !== requestingUserId && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_ATTEMPT_ACCESS', 'Forbidden: You do not have permission to access another user\'s attempt session');
    }

    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [attempt.examId]);
    const exam = examRes.rows[0] as any;

    // Check timer expiry
    const startTime = new Date(attempt.startTime).getTime();
    const durationMs = (exam.durationMinutes || 60) * 60 * 1000;
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const totalAllowedSeconds = (exam.durationMinutes || 60) * 60;
    const timeRemainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

    // Auto-submit if expired and still in progress
    if (attempt.status === 'IN_PROGRESS' && timeRemainingSeconds <= 0) {
      await this.submitAttempt(attemptId, requestingUserId, true);
      const updated = await pgDb.query(`SELECT * FROM "exam_attempts" WHERE "id" = $1`, [attemptId]);
      return this.formatAttemptState(updated.rows[0], exam, 0);
    }

    return this.formatAttemptState(attempt, exam, timeRemainingSeconds);
  }

  private async formatAttemptState(attempt: any, exam: any, timeRemainingSeconds: number) {
    const sectionsRes = await pgDb.query(
      `SELECT * FROM "exam_sections" WHERE "examId" = $1 ORDER BY "sequenceOrder" ASC`,
      [attempt.examId]
    );

    const qaRes = await pgDb.query(
      `SELECT qa.*, s."name" as "sectionName"
       FROM "question_attempts" qa
       LEFT JOIN "exam_sections" s ON qa."examSectionId" = s."id"
       WHERE qa."attemptId" = $1
       ORDER BY qa."sequenceOrder" ASC`,
      [attempt.id]
    );

    const questions = qaRes.rows.map((qa: any) => {
      const snap = safeParseJson(qa.questionSnapshot);
      const ans = safeParseJson(qa.studentAnswer);
      return {
        id: qa.id,
        questionId: qa.questionId,
        examSectionId: qa.examSectionId,
        sectionName: qa.sectionName,
        sequenceOrder: qa.sequenceOrder,
        type: snap?.type,
        content: snap?.content,
        difficulty: snap?.difficulty,
        marks: snap?.marks,
        marksCorrect: snap?.marksCorrect,
        marksWrong: snap?.marksWrong,
        options: snap?.options,
        pairs: snap?.pairs,
        rubricCriteria: snap?.rubricCriteria,
        studentAnswer: ans,
        isMarkedForReview: qa.isMarkedForReview,
        timeSpentSeconds: qa.timeSpentSeconds,
        isCorrect: qa.isCorrect,
        marksAwarded: qa.marksAwarded,
      };
    });

    return {
      id: attempt.id,
      examId: attempt.examId,
      examName: exam?.name || 'Exam',
      userId: attempt.userId,
      shuffleSeed: attempt.shuffleSeed,
      startTime: attempt.startTime,
      endTime: attempt.endTime,
      status: attempt.status,
      durationMinutes: exam?.durationMinutes || 60,
      timeRemainingSeconds,
      totalQuestions: attempt.totalQuestions,
      totalScore: attempt.totalScore,
      percentage: attempt.percentage,
      sections: sectionsRes.rows.map((s: any) => ({
        id: s.id,
        name: s.name,
        sequenceOrder: s.sequenceOrder,
        numQuestions: s.numQuestions,
        marksCorrect: s.marksCorrect,
        marksWrong: s.marksWrong,
        totalMarks: s.totalMarks,
      })),
      questions,
    };
  }

  /**
   * Sync answers in real-time (Feature 6.3)
   */
  async syncAnswers(
    attemptId: string,
    userId: string,
    payload: {
      questionId?: string;
      studentAnswer?: any;
      isMarkedForReview?: boolean;
      timeSpentSeconds?: number;
      answers?: { questionId: string; studentAnswer?: any; isMarkedForReview?: boolean; timeSpentSeconds?: number }[];
    }
  ) {
    const attemptRes = await pgDb.query(`SELECT * FROM "exam_attempts" WHERE "id" = $1`, [attemptId]);
    if (attemptRes.rows.length === 0) {
      throw new AppError(404, 'ATTEMPT_650', 'Attempt not found');
    }
    const attempt = attemptRes.rows[0] as any;

    // SECTION 7 SECURITY: IDOR Protection
    if (attempt.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN_ATTEMPT_ACCESS', 'Forbidden: You do not have permission to sync answers for another user\'s attempt');
    }

    if (attempt.status === 'SUBMITTED' || attempt.status === 'EVALUATED') {
      throw new AppError(400, 'ATTEMPT_652', 'Cannot autosave to a submitted or evaluated attempt');
    }

    // Check timer
    const examRes = await pgDb.query(`SELECT "durationMinutes" FROM "exams" WHERE "id" = $1`, [attempt.examId]);
    const durationMinutes = (examRes.rows[0] as any)?.durationMinutes || 60;
    const elapsedSeconds = (Date.now() - new Date(attempt.startTime).getTime()) / 1000;
    if (elapsedSeconds > durationMinutes * 60 + 30) {
      // Expired -> auto-submit
      await this.submitAttempt(attemptId, userId, true);
      throw new AppError(400, 'ATTEMPT_653', 'Time expired: Exam attempt has been automatically finalized');
    }

    const itemsToUpdate = [];
    if (payload.questionId) {
      itemsToUpdate.push({
        questionId: payload.questionId,
        studentAnswer: payload.studentAnswer,
        isMarkedForReview: payload.isMarkedForReview,
        timeSpentSeconds: payload.timeSpentSeconds,
      });
    }
    if (payload.answers && Array.isArray(payload.answers)) {
      itemsToUpdate.push(...payload.answers);
    }

    let savedCount = 0;
    for (const item of itemsToUpdate) {
      const qRes = await pgDb.query(
        `SELECT * FROM "question_attempts" WHERE "attemptId" = $1 AND "questionId" = $2`,
        [attemptId, item.questionId]
      );
      if (qRes.rows.length > 0) {
        const current = qRes.rows[0] as any;
        const newAnswer = item.studentAnswer !== undefined ? JSON.stringify(item.studentAnswer) : current.studentAnswer;
        const newReview = item.isMarkedForReview !== undefined ? item.isMarkedForReview : current.isMarkedForReview;
        const newTime = item.timeSpentSeconds !== undefined ? item.timeSpentSeconds : current.timeSpentSeconds;

        await pgDb.query(
          `UPDATE "question_attempts"
           SET "studentAnswer" = $1, "isMarkedForReview" = $2, "timeSpentSeconds" = $3, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "attemptId" = $4 AND "questionId" = $5`,
          [newAnswer, newReview, newTime, attemptId, item.questionId]
        );
        savedCount++;
      }
    }

    await pgDb.query(
      `UPDATE "exam_attempts" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [attemptId]
    );

    return {
      success: true,
      syncedAt: new Date().toISOString(),
      savedCount,
    };
  }

  /**
   * Submit attempt and run Auto-Evaluation Engine (Feature 6.4, 6.5, 6.6)
   */
  async submitAttempt(attemptId: string, userId: string, isAutoSubmit: boolean = false) {
    const attemptRes = await pgDb.query(`SELECT * FROM "exam_attempts" WHERE "id" = $1`, [attemptId]);
    if (attemptRes.rows.length === 0) {
      throw new AppError(404, 'ATTEMPT_650', 'Attempt not found');
    }
    const attempt = attemptRes.rows[0] as any;

    // SECTION 7 SECURITY: IDOR Protection
    if (attempt.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN_ATTEMPT_ACCESS', 'Forbidden: You cannot submit another user\'s attempt');
    }

    if (attempt.status === 'SUBMITTED' || attempt.status === 'EVALUATED') {
      throw new AppError(400, 'ATTEMPT_652', 'Attempt has already been submitted');
    }

    // Set end time and submitted status
    await pgDb.query(
      `UPDATE "exam_attempts"
       SET "endTime" = CURRENT_TIMESTAMP, "status" = 'SUBMITTED', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [attemptId]
    );

    // Run Auto-Evaluation Engine & Result Generation
    return this.evaluateAttempt(attemptId);
  }

  /**
   * Auto-Evaluation Engine (Feature 6.5) & Result Aggregator (Feature 6.6)
   */
  async evaluateAttempt(attemptId: string) {
    const attemptRes = await pgDb.query(`SELECT * FROM "exam_attempts" WHERE "id" = $1`, [attemptId]);
    const attempt = attemptRes.rows[0] as any;

    const qaRes = await pgDb.query(
      `SELECT qa.*, q."data" as "originalData", q."type" as "originalType",
              es."marksCorrect" as "sectionCorrect", es."marksWrong" as "sectionWrong", es."marksUnattempted" as "sectionUnattempted"
       FROM "question_attempts" qa
       JOIN "questions" q ON qa."questionId" = q."id"
       LEFT JOIN "exam_sections" es ON qa."examSectionId" = es."id"
       WHERE qa."attemptId" = $1`,
      [attemptId]
    );

    let totalScore = 0.0;
    let maxMarks = 0.0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unattempted = 0;
    let hasSubjectivePending = false;

    for (const qa of qaRes.rows as any[]) {
      const snap = safeParseJson(qa.questionSnapshot);
      const qData = safeParseJson(qa.originalData);
      const studentAnswer = safeParseJson(qa.studentAnswer);

      const marksCorrect = snap?.marksCorrect ?? qa.sectionCorrect ?? 1.0;
      const marksWrong = snap?.marksWrong ?? qa.sectionWrong ?? 0.0;
      const marksUnattempted = qa.sectionUnattempted ?? 0.0;

      maxMarks += marksCorrect;

      const isUnanswered =
        studentAnswer === null ||
        studentAnswer === undefined ||
        (typeof studentAnswer === 'string' && studentAnswer.trim() === '') ||
        (Array.isArray(studentAnswer) && studentAnswer.length === 0);

      if (isUnanswered) {
        unattempted++;
        await pgDb.query(
          `UPDATE "question_attempts"
           SET "isCorrect" = NULL, "marksAwarded" = $1, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $2`,
          [marksUnattempted, qa.id]
        );
        totalScore += marksUnattempted;
      } else if (qa.originalType === 'SUBJECTIVE') {
        hasSubjectivePending = true;
        // Subjective flagged for review
        await pgDb.query(
          `UPDATE "question_attempts"
           SET "isCorrect" = NULL, "marksAwarded" = 0.0, "evaluatorComments" = 'Pending teacher subjective review', "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          [qa.id]
        );
      } else {
        // Evaluate using pluggable question types
        const evalResult = questionTypeRegistry.evaluate(qa.originalType, qData, studentAnswer);
        let awardedMarks = 0.0;

        if (evalResult.isCorrect) {
          correctAnswers++;
          awardedMarks = (evalResult.score || 1.0) * marksCorrect;
        } else {
          // If partial score exists (e.g. partial multiple-select)
          if (evalResult.score > 0) {
            awardedMarks = evalResult.score * marksCorrect;
          } else {
            wrongAnswers++;
            // Apply negative marking
            awardedMarks = marksWrong < 0 ? marksWrong : -Math.abs(marksWrong);
          }
        }

        totalScore += awardedMarks;

        await pgDb.query(
          `UPDATE "question_attempts"
           SET "isCorrect" = $1, "marksAwarded" = $2, "evaluatorComments" = $3, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $4`,
          [evalResult.isCorrect, awardedMarks, evalResult.feedback || null, qa.id]
        );
      }
    }

    const totalQuestions = qaRes.rows.length;
    const finalScore = Math.round(totalScore * 100) / 100;
    const percentage = maxMarks > 0 ? Math.round(((finalScore / maxMarks) * 100) * 100) / 100 : 0.0;
    const finalStatus = hasSubjectivePending ? 'PENDING_REVIEW' : 'EVALUATED';

    await pgDb.query(
      `UPDATE "exam_attempts"
       SET "status" = $1, "totalScore" = $2, "marksObtained" = $2, "maxMarks" = $3,
           "percentage" = $4, "totalQuestions" = $5, "correctAnswers" = $6,
           "wrongAnswers" = $7, "unattempted" = $8, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $9`,
      [finalStatus, finalScore, maxMarks, percentage, totalQuestions, correctAnswers, wrongAnswers, unattempted, attemptId]
    );

    // Automatically recalculate student mastery asynchronously upon attempt submission & evaluation (Phase 8)
    try {
      await analyticsService.recalculateStudentMastery(attempt.userId);
    } catch (recalcErr) {
      console.error('[Analytics] Failed to recalculate mastery for student:', attempt.userId, recalcErr);
    }

    return this.getAttemptResults(attemptId, attempt.userId, true);
  }

  /**
   * Get detailed results & review (Feature 6.7)
   */
  async getAttemptResults(attemptId: string, requestingUserId: string, isElevated: boolean = false) {
    const attemptRes = await pgDb.query(`SELECT * FROM "exam_attempts" WHERE "id" = $1`, [attemptId]);
    if (attemptRes.rows.length === 0) {
      throw new AppError(404, 'ATTEMPT_650', 'Attempt not found');
    }
    const attempt = attemptRes.rows[0] as any;

    // SECTION 7 SECURITY: IDOR Protection
    if (attempt.userId !== requestingUserId && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_ATTEMPT_ACCESS', 'Forbidden: You do not have permission to view another user\'s results');
    }

    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [attempt.examId]);
    const exam = examRes.rows[0] as any;

    const userRes = await pgDb.query(`SELECT "firstName", "lastName", "email" FROM "users" WHERE "id" = $1`, [attempt.userId]);
    const user = userRes.rows[0] as any;

    const sectionsRes = await pgDb.query(
      `SELECT * FROM "exam_sections" WHERE "examId" = $1 ORDER BY "sequenceOrder" ASC`,
      [attempt.examId]
    );

    const qaRes = await pgDb.query(
      `SELECT qa.*, q."content" as "originalContent", q."data" as "originalData", q."type" as "originalType",
              q."difficulty", s."name" as "sectionName"
       FROM "question_attempts" qa
       JOIN "questions" q ON qa."questionId" = q."id"
       LEFT JOIN "exam_sections" s ON qa."examSectionId" = s."id"
       WHERE qa."attemptId" = $1
       ORDER BY qa."sequenceOrder" ASC`,
      [attemptId]
    );

    // Section score aggregations
    const sectionScores = sectionsRes.rows.map((sec: any) => {
      const secQs = qaRes.rows.filter((q: any) => q.examSectionId === sec.id);
      let secScore = 0;
      let secAttempted = 0;
      let secCorrect = 0;
      let secWrong = 0;

      secQs.forEach((q: any) => {
        secScore += q.marksAwarded || 0;
        if (q.studentAnswer) secAttempted++;
        if (q.isCorrect === true) secCorrect++;
        if (q.isCorrect === false) secWrong++;
      });

      return {
        sectionId: sec.id,
        sectionName: sec.name,
        totalQuestions: secQs.length,
        attemptedCount: secAttempted,
        correctCount: secCorrect,
        wrongCount: secWrong,
        score: Math.round(secScore * 100) / 100,
        maxScore: sec.totalMarks || (secQs.length * (sec.marksCorrect || 1.0)),
      };
    });

    const questionsReview = qaRes.rows.map((qa: any) => {
      const snap = safeParseJson(qa.questionSnapshot);
      const qData = safeParseJson(qa.originalData);
      const ans = safeParseJson(qa.studentAnswer);

      // Extract correct answer and explanation for review mode
      let correctAnswer = null;
      if (qa.originalType === 'MCQ') {
        correctAnswer = qData?.correctOptionId;
      } else if (qa.originalType === 'MULTIPLE_SELECT') {
        correctAnswer = qData?.correctOptionIds;
      } else if (qa.originalType === 'TRUE_FALSE') {
        correctAnswer = qData?.correctValue;
      } else if (qa.originalType === 'FILL_IN_BLANK') {
        correctAnswer = qData?.acceptedAnswers;
      } else if (qa.originalType === 'NUMERICAL') {
        correctAnswer = `${qData?.targetValue} (±${qData?.tolerance || 0})`;
      } else if (qa.originalType === 'MATCHING') {
        correctAnswer = qData?.pairs;
      } else if (qa.originalType === 'SHORT_ANSWER') {
        correctAnswer = qData?.sampleAnswer || qData?.keywords;
      }

      return {
        id: qa.id,
        questionId: qa.questionId,
        examSectionId: qa.examSectionId,
        sectionName: qa.sectionName,
        sequenceOrder: qa.sequenceOrder,
        type: qa.originalType,
        content: qa.originalContent,
        difficulty: qa.difficulty,
        marks: snap?.marks,
        marksCorrect: snap?.marksCorrect,
        marksWrong: snap?.marksWrong,
        options: snap?.options,
        pairs: snap?.pairs,
        studentAnswer: ans,
        isMarkedForReview: qa.isMarkedForReview,
        timeSpentSeconds: qa.timeSpentSeconds,
        isCorrect: qa.isCorrect,
        marksAwarded: qa.marksAwarded,
        correctAnswer,
        explanation: qData?.explanation || 'No additional explanation provided.',
        evaluatorComments: qa.evaluatorComments,
      };
    });

    const durationSeconds = (exam?.durationMinutes || 60) * 60;
    const timeSpentSeconds = attempt.endTime && attempt.startTime
      ? Math.floor((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 1000)
      : durationSeconds;

    const attemptedCount = (attempt.correctAnswers || 0) + (attempt.wrongAnswers || 0);
    const accuracy = attemptedCount > 0
      ? Math.round(((attempt.correctAnswers || 0) / attemptedCount) * 100 * 100) / 100
      : 0;

    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examName: exam?.name || 'Exam',
      userId: attempt.userId,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Student',
      startTime: attempt.startTime,
      endTime: attempt.endTime || attempt.updatedAt,
      durationMinutes: exam?.durationMinutes || 60,
      timeSpentSeconds,
      status: attempt.status,
      totalScore: attempt.totalScore ?? 0.0,
      maxMarks: attempt.maxMarks ?? exam?.totalMarks ?? 0.0,
      percentage: attempt.percentage ?? 0.0,
      accuracy,
      totalQuestions: attempt.totalQuestions,
      correctAnswers: attempt.correctAnswers,
      wrongAnswers: attempt.wrongAnswers,
      unattempted: attempt.unattempted,
      isFlagged: attempt.isFlagged,
      flagReason: attempt.flagReason,
      sectionScores,
      questions: questionsReview,
    };
  }

  /**
   * Flag result for teacher review (Feature 6.7)
   */
  async flagResult(attemptId: string, userId: string, reason: string, reqIp?: string, userAgent?: string) {
    const attemptRes = await pgDb.query(`SELECT * FROM "exam_attempts" WHERE "id" = $1`, [attemptId]);
    if (attemptRes.rows.length === 0) {
      throw new AppError(404, 'ATTEMPT_650', 'Attempt not found');
    }
    const attempt = attemptRes.rows[0] as any;

    // SECTION 7 SECURITY: IDOR Protection
    if (attempt.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN_ATTEMPT_ACCESS', 'Forbidden: You cannot flag another user\'s result');
    }

    if (attempt.isFlagged) {
      throw new AppError(409, 'ATTEMPT_656', 'Result has already been flagged for teacher review');
    }

    await pgDb.query(
      `UPDATE "exam_attempts"
       SET "isFlagged" = true, "flagReason" = $1, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $2`,
      [reason, attemptId]
    );

    // Insert into audit_logs (Spec 17 & ERD Section 3.8)
    const auditId = `aud_${crypto.randomUUID()}`;
    await pgDb.query(
      `INSERT INTO "audit_logs" (
        "id", "userId", "action", "resource", "resourceId", "details", "ipAddress", "userAgent", "createdAt"
      ) VALUES ($1, $2, 'result.flagged_by_student', 'exam_attempts', $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        auditId,
        userId,
        attemptId,
        JSON.stringify({ reason, examId: attempt.examId, totalScore: attempt.totalScore }),
        reqIp || null,
        userAgent || null,
      ]
    );

    return {
      success: true,
      message: 'Result successfully flagged for review and recorded in audit log',
      auditLogId: auditId,
    };
  }
}

export const attemptService = new AttemptService();
