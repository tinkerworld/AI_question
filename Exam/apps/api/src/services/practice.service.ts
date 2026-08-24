import { pgDb } from '@repo/database';
import { AppError } from '../middleware/error';
import {
  PracticePaperDTO,
  PracticeQuestionDTO,
  PracticeAttemptDTO,
  WeaknessPoolItemDTO,
  GeneratePracticeDTO,
  SubmitPracticeAnswerDTO,
  EvaluatePracticeResultDTO,
} from '@repo/types';
import crypto from 'crypto';

function safeParseJson(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export class PracticeService {
  /**
   * 9.1: Retrieve Weakness Pool for a student
   * Queries pre-computed student_weaknesses and student_topic_progress.
   */
  async getWeaknessPool(
    studentId: string,
    requestingUserId: string,
    isElevated: boolean = false
  ): Promise<WeaknessPoolItemDTO[]> {
    if (studentId !== requestingUserId && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_PRACTICE_ACCESS', "Forbidden: You do not have permission to view another student's weakness pool");
    }

    const query = `
      SELECT 
        sw."id",
        sw."userId",
        sw."syllabusNodeId",
        sw."errorRate",
        sw."severity",
        sw."isActive",
        sw."updatedAt" as "lastAttemptDate",
        sn."title" as "topicName",
        sub."name" as "subjectName",
        c."name" as "courseName",
        COALESCE(stp."attemptsCount", 0) as "attemptsCount",
        COALESCE(stp."correctCount", 0) as "correctCount",
        COALESCE(mt."consecutiveCorrect", 0) as "consecutiveCorrect",
        COALESCE(mt."masteryThreshold", 3) as "masteryThreshold",
        COALESCE(mt."isMastered", false) as "isMastered"
      FROM "student_weaknesses" sw
      JOIN "syllabus_nodes" sn ON sw."syllabusNodeId" = sn."id"
      LEFT JOIN "subjects" sub ON sn."subjectId" = sub."id"
      LEFT JOIN "courses" c ON sub."courseId" = c."id"
      LEFT JOIN "student_topic_progress" stp ON sw."userId" = stp."userId" AND sw."syllabusNodeId" = stp."syllabusNodeId"
      LEFT JOIN "mastery_tracking" mt ON sw."userId" = mt."userId" AND sw."syllabusNodeId" = mt."syllabusNodeId"
      WHERE sw."userId" = $1
      ORDER BY sw."isActive" DESC, sw."errorRate" DESC, sw."updatedAt" DESC
    `;

    const res = await pgDb.query(query, [studentId]);
    return res.rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      syllabusNodeId: r.syllabusNodeId,
      topicName: r.topicName || 'Unknown Topic',
      subjectName: r.subjectName,
      courseName: r.courseName,
      severity: r.severity || 'MODERATE',
      errorRate: parseFloat(r.errorRate || '0'),
      failureCount: Math.max(0, (r.attemptsCount || 0) - (r.correctCount || 0)),
      isActive: r.isActive === true,
      consecutiveCorrect: parseInt(r.consecutiveCorrect || '0', 10),
      masteryThreshold: parseInt(r.masteryThreshold || '3', 10),
      isMastered: r.isMastered === true,
      lastAttemptDate: r.lastAttemptDate ? new Date(r.lastAttemptDate).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * 9.2: Generate Personalized Practice Paper
   * Selects questions from targeted weak topic(s) with difficulty progression.
   */
  async generatePracticePaper(
    userId: string,
    options: GeneratePracticeDTO
  ): Promise<{ paper: PracticePaperDTO; questions: PracticeQuestionDTO[]; activeAttemptId: string }> {
    // Entitlement Check: Personalized Practice
    const { EntitlementService } = await import('./entitlement.service');
    const entCheck = await EntitlementService.checkAccess(userId, 'personalized_practice');
    if (!entCheck.allowed) {
      throw new AppError(403, 'ENTITLEMENT_REQUIRED', entCheck.reason || 'Personalized practice requires a Premium subscription');
    }

    let targetNodeIds = options.targetNodeIds || [];
    const count = options.count && options.count > 0 ? Math.min(options.count, 30) : 10;

    // 1. If targetNodeIds is empty, auto-populate from active weaknesses
    if (targetNodeIds.length === 0) {
      const weaknessRes = await pgDb.query(
        `SELECT "syllabusNodeId" FROM "student_weaknesses" WHERE "userId" = $1 AND "isActive" = true ORDER BY "errorRate" DESC LIMIT 5`,
        [userId]
      );
      targetNodeIds = weaknessRes.rows.map((r: any) => r.syllabusNodeId);
    }

    // 2. If still empty (e.g. no weaknesses recorded yet), grab published topics from user's course enrollments or any published syllabus nodes
    if (targetNodeIds.length === 0) {
      const fallbackNodes = await pgDb.query(
        `SELECT sn."id" FROM "syllabus_nodes" sn 
         JOIN "subjects" sub ON sn."subjectId" = sub."id"
         LIMIT 5`
      );
      targetNodeIds = fallbackNodes.rows.map((r: any) => r.id);
    }

    if (targetNodeIds.length === 0) {
      throw new AppError(400, 'NO_SYLLABUS_NODES_AVAILABLE', 'No syllabus topics available to generate practice paper');
    }

    // 3. Find candidate questions for these syllabus nodes
    const nodePlaceholders = targetNodeIds.map((_, i) => `$${i + 1}`).join(',');
    const candidateRes = await pgDb.query(
      `SELECT q.*, sn."title" as "topicTitle"
       FROM "questions" q
       LEFT JOIN "syllabus_nodes" sn ON q."syllabusNodeId" = sn."id"
       WHERE q."syllabusNodeId" IN (${nodePlaceholders})
         AND q."status" = 'PUBLISHED'
       ORDER BY RANDOM()`,
      targetNodeIds
    );

    let candidates = candidateRes.rows as any[];
    if (candidates.length === 0) {
      // Fallback: grab any published questions if topic questions are sparse
      const generalRes = await pgDb.query(
        `SELECT q.*, sn."title" as "topicTitle"
         FROM "questions" q
         LEFT JOIN "syllabus_nodes" sn ON q."syllabusNodeId" = sn."id"
         WHERE q."status" = 'PUBLISHED'
         ORDER BY RANDOM()
         LIMIT $1`,
        [count]
      );
      candidates = generalRes.rows as any[];
    }

    if (candidates.length === 0) {
      throw new AppError(400, 'INSUFFICIENT_PRACTICE_QUESTIONS', 'No published questions available for practice generation');
    }

    // 4. Structure difficulty progression (EASY -> MEDIUM -> HARD)
    const easyQs = candidates.filter((q) => q.difficulty === 'EASY');
    const medQs = candidates.filter((q) => q.difficulty === 'MEDIUM');
    const hardQs = candidates.filter((q) => q.difficulty === 'HARD');

    // Target mix: 30% easy, 40% medium, 30% hard
    const easyTarget = Math.max(1, Math.floor(count * 0.3));
    const medTarget = Math.max(1, Math.floor(count * 0.4));
    const hardTarget = count - easyTarget - medTarget;

    const selected: any[] = [];
    const usedIds = new Set<string>();

    function pickFrom(pool: any[], qty: number) {
      for (const q of pool) {
        if (selected.length >= count) break;
        if (!usedIds.has(q.id)) {
          selected.push(q);
          usedIds.add(q.id);
          if (--qty <= 0) break;
        }
      }
    }

    pickFrom(easyQs, easyTarget);
    pickFrom(medQs, medTarget);
    pickFrom(hardQs, hardTarget);

    // If more needed to meet count, fill with remaining
    if (selected.length < count) {
      pickFrom(candidates, count - selected.length);
    }

    // Sort by difficulty progression (EASY = 1, MEDIUM = 2, HARD = 3)
    const diffWeight: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
    selected.sort((a, b) => (diffWeight[a.difficulty] || 2) - (diffWeight[b.difficulty] || 2));

    // 5. Create Practice Paper record
    const paperId = `prac_paper_${crypto.randomBytes(8).toString('hex')}`;
    const firstTopic = selected[0]?.topicTitle || 'Personalized Weakness Pool';
    const paperTitle = options.title || `Practice Session: ${firstTopic}`;

    await pgDb.query(
      `INSERT INTO "practice_papers" ("id", "userId", "title", "courseId", "targetNodeIds", "totalQuestions", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'GENERATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [paperId, userId, paperTitle, options.courseId || null, JSON.stringify(targetNodeIds), selected.length]
    );

    // 6. Insert Practice Questions
    const practiceQuestions: PracticeQuestionDTO[] = [];
    for (let i = 0; i < selected.length; i++) {
      const q = selected[i];
      const pqId = `prac_q_${crypto.randomBytes(8).toString('hex')}`;
      const qData = safeParseJson(q.data) || {};

      await pgDb.query(
        `INSERT INTO "practice_questions" ("id", "practicePaperId", "questionId", "syllabusNodeId", "difficulty", "displayOrder", "versionNum", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [pqId, paperId, q.id, q.syllabusNodeId, q.difficulty || 'MEDIUM', i + 1, q.versionNum || 1]
      );

      practiceQuestions.push({
        id: pqId,
        practicePaperId: paperId,
        questionId: q.id,
        syllabusNodeId: q.syllabusNodeId,
        topicTitle: q.topicTitle,
        difficulty: q.difficulty || 'MEDIUM',
        displayOrder: i + 1,
        versionNum: q.versionNum || 1,
        content: q.content,
        questionType: q.type || 'MCQ_SINGLE',
        options: qData.options || [],
        explanation: qData.explanation || q.explanation,
        marks: parseFloat(q.marks || '1.0'),
        negativeMarks: parseFloat(q.negativeMarks || '0.0'),
      });
    }

    // 7. Auto-initialize practice attempt session
    const attemptId = `prac_att_${crypto.randomBytes(8).toString('hex')}`;
    await pgDb.query(
      `INSERT INTO "practice_attempts" ("id", "practicePaperId", "userId", "status", "score", "accuracyPercentage", "correctCount", "totalAttempted", "startedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'IN_PROGRESS', 0.0, 0.0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [attemptId, paperId, userId]
    );

    const paperDTO: PracticePaperDTO = {
      id: paperId,
      userId,
      title: paperTitle,
      courseId: options.courseId || null,
      targetNodeIds,
      totalQuestions: selected.length,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: practiceQuestions,
    };

    return { paper: paperDTO, questions: practiceQuestions, activeAttemptId: attemptId };
  }

  /**
   * Retrieve a Practice Paper with questions & state
   */
  async getPracticePaper(paperId: string, userId: string): Promise<PracticePaperDTO> {
    const paperRes = await pgDb.query(
      `SELECT * FROM "practice_papers" WHERE "id" = $1 AND "userId" = $2`,
      [paperId, userId]
    );

    if (paperRes.rows.length === 0) {
      throw new AppError(404, 'PRACTICE_PAPER_NOT_FOUND', 'Practice paper not found');
    }

    const p = paperRes.rows[0];
    const qRes = await pgDb.query(
      `SELECT pq.*, q."content", q."type" as "questionType", q."data", sn."title" as "topicTitle"
       FROM "practice_questions" pq
       JOIN "questions" q ON pq."questionId" = q."id"
       LEFT JOIN "syllabus_nodes" sn ON pq."syllabusNodeId" = sn."id"
       WHERE pq."practicePaperId" = $1
       ORDER BY pq."displayOrder" ASC`,
      [paperId]
    );

    const questions: PracticeQuestionDTO[] = qRes.rows.map((r: any) => {
      const qData = safeParseJson(r.data) || {};
      return {
        id: r.id,
        practicePaperId: r.practicePaperId,
        questionId: r.questionId,
        syllabusNodeId: r.syllabusNodeId,
        topicTitle: r.topicTitle,
        difficulty: r.difficulty,
        displayOrder: r.displayOrder,
        versionNum: r.versionNum,
        content: r.content,
        questionType: r.questionType || 'MCQ_SINGLE',
        options: qData.options || [],
        explanation: qData.explanation,
        marks: parseFloat(r.marks || '1.0'),
        negativeMarks: parseFloat(r.negativeMarks || '0.0'),
      };
    });

    return {
      id: p.id,
      userId: p.userId,
      title: p.title,
      courseId: p.courseId,
      targetNodeIds: safeParseJson(p.targetNodeIds) || [],
      totalQuestions: p.totalQuestions,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      questions,
    };
  }

  /**
   * 9.3 & 9.4: Record practice answer & update Adaptive Mastery Tracking
   * Threshold: 3 consecutive correct answers on different questions mark the concept as mastered.
   */
  async recordPracticeAnswer(
    attemptId: string,
    userId: string,
    payload: SubmitPracticeAnswerDTO
  ): Promise<EvaluatePracticeResultDTO> {
    const attemptRes = await pgDb.query(
      `SELECT * FROM "practice_attempts" WHERE "id" = $1 AND "userId" = $2`,
      [attemptId, userId]
    );
    if (attemptRes.rows.length === 0) {
      throw new AppError(404, 'PRACTICE_ATTEMPT_NOT_FOUND', 'Active practice attempt not found');
    }

    // 1. Fetch Question details
    const qRes = await pgDb.query(
      `SELECT q.*, sn."title" as "topicTitle"
       FROM "questions" q
       LEFT JOIN "syllabus_nodes" sn ON q."syllabusNodeId" = sn."id"
       WHERE q."id" = $1`,
      [payload.questionId]
    );
    if (qRes.rows.length === 0) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found in question bank');
    }

    const q = qRes.rows[0];
    const qData = safeParseJson(q.data) || {};
    const syllabusNodeId = q.syllabusNodeId;

    // 2. Evaluate answer
    let isCorrect = false;
    const correctOptionId = qData.correctOptionId || qData.correctAnswer || (qData.options?.find((o: any) => o.isCorrect)?.id);
    const correctOptionIds = qData.correctOptionIds || (qData.options?.filter((o: any) => o.isCorrect).map((o: any) => o.id)) || [];

    if (q.type === 'MCQ' || q.type === 'MCQ_SINGLE' || !q.type) {
      isCorrect = payload.selectedOption !== undefined && String(payload.selectedOption) === String(correctOptionId);
    } else if (q.type === 'MCQ_MULTIPLE') {
      const selected = Array.isArray(payload.selectedOptions) ? payload.selectedOptions.sort() : [];
      const expected = correctOptionIds.sort();
      isCorrect = selected.length === expected.length && selected.every((v: any, idx: number) => v === expected[idx]);
    } else if (q.type === 'NUMERICAL') {
      const expectedNum = parseFloat(qData.numericalAnswer || qData.correctAnswer || '0');
      const studentNum = parseFloat(payload.numericalAnswer || '');
      isCorrect = !isNaN(studentNum) && Math.abs(studentNum - expectedNum) <= (qData.tolerance || 0.01);
    }

    // 3. Upsert answer in practice_attempt_answers
    const ansId = `prac_ans_${crypto.randomBytes(8).toString('hex')}`;
    await pgDb.query(
      `INSERT INTO "practice_attempt_answers" ("id", "attemptId", "questionId", "selectedOption", "selectedOptions", "numericalAnswer", "isCorrect", "timeSpentSeconds", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT ("attemptId", "questionId") DO UPDATE 
       SET "selectedOption" = EXCLUDED."selectedOption",
           "selectedOptions" = EXCLUDED."selectedOptions",
           "numericalAnswer" = EXCLUDED."numericalAnswer",
           "isCorrect" = EXCLUDED."isCorrect",
           "timeSpentSeconds" = EXCLUDED."timeSpentSeconds"`,
      [
        ansId,
        attemptId,
        payload.questionId,
        payload.selectedOption || null,
        payload.selectedOptions ? JSON.stringify(payload.selectedOptions) : null,
        payload.numericalAnswer || null,
        isCorrect,
        payload.timeSpentSeconds || 0,
      ]
    );

    // 4. Update Mastery Tracking (Adaptive streak counter)
    let consecutiveCorrect = 0;
    const masteryThreshold = 3;
    let isMastered = false;

    if (syllabusNodeId) {
      const mtRes = await pgDb.query(
        `SELECT * FROM "mastery_tracking" WHERE "userId" = $1 AND "syllabusNodeId" = $2`,
        [userId, syllabusNodeId]
      );

      const mtId = mtRes.rows[0]?.id || `mt_${crypto.randomBytes(8).toString('hex')}`;
      const currentStreak = mtRes.rows[0]?.consecutiveCorrect || 0;

      if (isCorrect) {
        consecutiveCorrect = currentStreak + 1;
        isMastered = consecutiveCorrect >= masteryThreshold;

        await pgDb.query(
          `INSERT INTO "mastery_tracking" ("id", "userId", "syllabusNodeId", "consecutiveCorrect", "masteryThreshold", "isMastered", "masteredAt", "lastAttemptedAt", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 = true THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT ("userId", "syllabusNodeId") DO UPDATE
           SET "consecutiveCorrect" = EXCLUDED."consecutiveCorrect",
               "isMastered" = EXCLUDED."isMastered",
               "masteredAt" = CASE WHEN EXCLUDED."isMastered" = true AND "mastery_tracking"."masteredAt" IS NULL THEN CURRENT_TIMESTAMP ELSE "mastery_tracking"."masteredAt" END,
               "lastAttemptedAt" = CURRENT_TIMESTAMP,
               "updatedAt" = CURRENT_TIMESTAMP`,
          [mtId, userId, syllabusNodeId, consecutiveCorrect, masteryThreshold, isMastered]
        );

        // If newly mastered, deactivate active weakness flag
        if (isMastered) {
          await pgDb.query(
            `UPDATE "student_weaknesses" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $1 AND "syllabusNodeId" = $2`,
            [userId, syllabusNodeId]
          );
        }
      } else {
        // Streak broken -> reset to 0
        consecutiveCorrect = 0;
        isMastered = false;

        await pgDb.query(
          `INSERT INTO "mastery_tracking" ("id", "userId", "syllabusNodeId", "consecutiveCorrect", "masteryThreshold", "isMastered", "lastAttemptedAt", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 0, $4, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT ("userId", "syllabusNodeId") DO UPDATE
           SET "consecutiveCorrect" = 0,
               "isMastered" = false,
               "lastAttemptedAt" = CURRENT_TIMESTAMP,
               "updatedAt" = CURRENT_TIMESTAMP`,
          [mtId, userId, syllabusNodeId, masteryThreshold]
        );

        // Reactivate weakness flag
        await pgDb.query(
          `UPDATE "student_weaknesses" SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $1 AND "syllabusNodeId" = $2`,
          [userId, syllabusNodeId]
        );
      }
    }

    return {
      isCorrect,
      correctAnswer: correctOptionId || correctOptionIds || qData.numericalAnswer,
      explanation: qData.explanation || q.explanation,
      consecutiveCorrect,
      masteryThreshold,
      isMastered,
      topicTitle: q.topicTitle,
    };
  }

  /**
   * 9.4: Finalize & Submit Practice Attempt
   */
  async submitPracticeAttempt(attemptId: string, userId: string): Promise<PracticeAttemptDTO> {
    const attemptRes = await pgDb.query(
      `SELECT * FROM "practice_attempts" WHERE "id" = $1 AND "userId" = $2`,
      [attemptId, userId]
    );
    if (attemptRes.rows.length === 0) {
      throw new AppError(404, 'PRACTICE_ATTEMPT_NOT_FOUND', 'Practice attempt not found');
    }

    const answersRes = await pgDb.query(
      `SELECT * FROM "practice_attempt_answers" WHERE "attemptId" = $1`,
      [attemptId]
    );

    const totalAttempted = answersRes.rows.length;
    const correctCount = answersRes.rows.filter((a: any) => a.isCorrect === true).length;
    const accuracyPercentage = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 10000) / 100 : 0.0;
    const score = correctCount * 1.0;

    await pgDb.query(
      `UPDATE "practice_attempts" 
       SET "status" = 'COMPLETED',
           "score" = $1,
           "accuracyPercentage" = $2,
           "correctCount" = $3,
           "totalAttempted" = $4,
           "completedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $5`,
      [score, accuracyPercentage, correctCount, totalAttempted, attemptId]
    );

    // Update parent practice paper status
    const paperId = attemptRes.rows[0].practicePaperId;
    await pgDb.query(
      `UPDATE "practice_papers" SET "status" = 'COMPLETED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [paperId]
    );

    return {
      id: attemptId,
      practicePaperId: paperId,
      userId,
      status: 'COMPLETED',
      score,
      accuracyPercentage,
      correctCount,
      totalAttempted,
      startedAt: attemptRes.rows[0].startedAt,
      completedAt: new Date().toISOString(),
      createdAt: attemptRes.rows[0].createdAt,
      updatedAt: new Date().toISOString(),
      answers: answersRes.rows as any[],
    };
  }

  /**
   * 9.4: Retrieve Practice History for student
   */
  async getPracticeHistory(userId: string, page = 1, limit = 10): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    const countRes = await pgDb.query(
      `SELECT COUNT(*) as c FROM "practice_attempts" WHERE "userId" = $1`,
      [userId]
    );
    const total = parseInt(countRes.rows[0].c, 10);

    const rowsRes = await pgDb.query(
      `SELECT pa.*, pp."title" as "paperTitle", pp."totalQuestions", pp."targetNodeIds"
       FROM "practice_attempts" pa
       JOIN "practice_papers" pp ON pa."practicePaperId" = pp."id"
       WHERE pa."userId" = $1
       ORDER BY pa."createdAt" DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const items = rowsRes.rows.map((r: any) => ({
      id: r.id,
      practicePaperId: r.practicePaperId,
      paperTitle: r.paperTitle,
      totalQuestions: r.totalQuestions,
      status: r.status,
      score: parseFloat(r.score || '0'),
      accuracyPercentage: parseFloat(r.accuracyPercentage || '0'),
      correctCount: r.correctCount,
      totalAttempted: r.totalAttempted,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    }));

    return { items, total, page, limit };
  }

  /**
   * Delete a practice paper, associated questions, attempts, and attempt answers.
   * Enforces ownership check: requesting user must own the paper or possess elevated role/permissions.
   */
  async deletePracticePaper(
    paperId: string,
    requestingUserId: string,
    isElevated: boolean = false
  ): Promise<{ id: string; deleted: boolean }> {
    const paperRes = await pgDb.query(
      `SELECT * FROM "practice_papers" WHERE "id" = $1`,
      [paperId]
    );

    if (paperRes.rows.length === 0) {
      throw new AppError(404, 'PRACTICE_PAPER_NOT_FOUND', 'Practice paper not found');
    }

    const paper = paperRes.rows[0];
    if (!isElevated && paper.userId !== requestingUserId) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot delete another student practice paper');
    }

    // Explicitly delete cascade child rows
    const attemptsRes = await pgDb.query(
      `SELECT "id" FROM "practice_attempts" WHERE "practicePaperId" = $1`,
      [paperId]
    );
    for (const att of attemptsRes.rows) {
      await pgDb.query(`DELETE FROM "practice_attempt_answers" WHERE "attemptId" = $1`, [att.id]);
    }
    await pgDb.query(`DELETE FROM "practice_attempts" WHERE "practicePaperId" = $1`, [paperId]);
    await pgDb.query(`DELETE FROM "practice_questions" WHERE "practicePaperId" = $1`, [paperId]);
    await pgDb.query(`DELETE FROM "practice_papers" WHERE "id" = $1`, [paperId]);

    return { id: paperId, deleted: true };
  }

  /**
   * Diagnostic / Stats check for practice tables
   */
  async getPracticeStats(): Promise<{ papers: number; attempts: number; questions: number; answers: number }> {
    const pRes = await pgDb.query(`SELECT COUNT(*) as c FROM "practice_papers"`);
    const attRes = await pgDb.query(`SELECT COUNT(*) as c FROM "practice_attempts"`);
    const qRes = await pgDb.query(`SELECT COUNT(*) as c FROM "practice_questions"`);
    const ansRes = await pgDb.query(`SELECT COUNT(*) as c FROM "practice_attempt_answers"`);

    return {
      papers: parseInt(pRes.rows[0].c, 10),
      attempts: parseInt(attRes.rows[0].c, 10),
      questions: parseInt(qRes.rows[0].c, 10),
      answers: parseInt(ansRes.rows[0].c, 10),
    };
  }

  async getAllPracticePaperIds(): Promise<string[]> {
    const res = await pgDb.query(`SELECT "id" FROM "practice_papers"`);
    return res.rows.map((r: any) => r.id);
  }
}

export const practiceService = new PracticeService();
