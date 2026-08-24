import { pgDb } from '@repo/database';
import { AppError } from '../middleware/error';
import {
  calculateTimeWeightedScore,
  mapScoreToStatus,
  identifyStrengths,
  identifyWeaknesses,
  buildSyllabusProficiencyTree,
  calculateStudentProgress,
  calculateClassAnalytics,
  NodeProgressInput,
  AttemptScoreRecord,
  RawSyllabusNode,
} from '@repo/mastery-engine';
import {
  StudentMasteryDTO,
  StudentStrengthDTO,
  StudentWeaknessDTO,
  SyllabusProficiencyNodeDTO,
  StudentProgressDTO,
  ClassAnalyticsDTO,
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

export class AnalyticsService {
  /**
   * Recalculates student mastery scores across all topics and overall proficiency.
   * Invoked asynchronously upon exam submission or on-demand.
   */
  async recalculateStudentMastery(userId: string): Promise<StudentMasteryDTO> {
    // 1. Fetch all evaluated attempts for this student
    const qaRes = await pgDb.query(
      `SELECT qa."id" as "qaId", qa."attemptId", qa."questionId", qa."isCorrect", qa."marksAwarded",
              qa."questionSnapshot", qa."studentAnswer", qa."createdAt",
              q."syllabusNodeId" as "liveSyllabusNodeId", q."subjectId" as "liveSubjectId", q."courseId" as "liveCourseId",
              sn."title" as "nodeTitle", sn."type" as "nodeType",
              sub."id" as "subjectId", sub."name" as "subjectName"
       FROM "question_attempts" qa
       JOIN "exam_attempts" ea ON qa."attemptId" = ea."id"
       JOIN "questions" q ON qa."questionId" = q."id"
       LEFT JOIN "syllabus_nodes" sn ON COALESCE(
         (qa."questionSnapshot"->>'syllabusNodeId')::text,
         q."syllabusNodeId"
       ) = sn."id"
       LEFT JOIN "subjects" sub ON COALESCE(
         (qa."questionSnapshot"->>'subjectId')::text,
         q."subjectId",
         sn."subjectId"
       ) = sub."id"
       WHERE ea."userId" = $1 AND ea."status" IN ('EVALUATED', 'SUBMITTED')
       ORDER BY qa."createdAt" ASC`,
      [userId]
    );

    // Group attempts by syllabusNodeId
    const nodeAttemptsMap = new Map<string, {
      nodeId: string;
      nodeTitle: string;
      nodeType: string;
      subjectId?: string;
      subjectName?: string;
      attempts: AttemptScoreRecord[];
      correctCount: number;
    }>();

    for (const row of qaRes.rows as any[]) {
      const snap = safeParseJson(row.questionSnapshot);
      const syllabusNodeId = snap?.syllabusNodeId || row.liveSyllabusNodeId;

      if (!syllabusNodeId) continue;

      if (!nodeAttemptsMap.has(syllabusNodeId)) {
        nodeAttemptsMap.set(syllabusNodeId, {
          nodeId: syllabusNodeId,
          nodeTitle: row.nodeTitle || 'Topic',
          nodeType: row.nodeType || 'TOPIC',
          subjectId: row.subjectId || snap?.subjectId,
          subjectName: row.subjectName,
          attempts: [],
          correctCount: 0,
        });
      }

      const entry = nodeAttemptsMap.get(syllabusNodeId)!;
      const isCorrect = row.isCorrect === true || (row.marksAwarded && row.marksAwarded > 0);
      if (isCorrect) {
        entry.correctCount++;
      }

      const marksPossible = snap?.marksCorrect || snap?.marks || 1.0;
      entry.attempts.push({
        isCorrect: row.isCorrect,
        marksAwarded: row.marksAwarded || 0,
        marksPossible,
        timestamp: row.createdAt,
        attemptId: row.attemptId,
        syllabusNodeId,
      });
    }

    let overallScoreSum = 0;
    let nodesWithScores = 0;
    const now = new Date().toISOString();

    // 2. Compute and persist mastery for each syllabus node
    for (const [nodeId, data] of nodeAttemptsMap.entries()) {
      const weightedScore = calculateTimeWeightedScore(data.attempts);
      const totalAttempts = data.attempts.length;
      const { status } = mapScoreToStatus(weightedScore, totalAttempts);

      overallScoreSum += weightedScore;
      nodesWithScores++;

      // Check existing progress to track status change date
      const existingRes = await pgDb.query(
        `SELECT "status", "statusChangedAt" FROM "student_topic_progress" WHERE "userId" = $1 AND "syllabusNodeId" = $2`,
        [userId, nodeId]
      );

      let statusChangedAt = now;
      if (existingRes.rows.length > 0) {
        const prev = existingRes.rows[0] as any;
        if (prev.status === status && prev.statusChangedAt) {
          statusChangedAt = prev.statusChangedAt;
        }
      }

      // Upsert student_topic_progress
      const progressId = `stp_${crypto.randomUUID()}`;
      await pgDb.query(
        `INSERT INTO "student_topic_progress" (
          "id", "userId", "syllabusNodeId", "proficiencyScore", "attemptsCount", "correctCount",
          "status", "statusChangedAt", "lastEvaluatedAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("userId", "syllabusNodeId") DO UPDATE SET
          "proficiencyScore" = EXCLUDED."proficiencyScore",
          "attemptsCount" = EXCLUDED."attemptsCount",
          "correctCount" = EXCLUDED."correctCount",
          "status" = EXCLUDED."status",
          "statusChangedAt" = EXCLUDED."statusChangedAt",
          "lastEvaluatedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP`,
        [progressId, userId, nodeId, weightedScore, totalAttempts, data.correctCount, status, statusChangedAt]
      );

      // Manage Weaknesses
      if (status === 'WEAK' || status === 'NEEDS_PRACTICE') {
        const errorRate = totalAttempts > 0 ? Math.round(((totalAttempts - data.correctCount) / totalAttempts) * 100) / 100 : 1.0;
        const severity = weightedScore < 30 || errorRate >= 0.7 ? 'CRITICAL' : 'MODERATE';
        const weakId = `weak_${crypto.randomUUID()}`;

        await pgDb.query(
          `INSERT INTO "student_weaknesses" (
            "id", "userId", "syllabusNodeId", "errorRate", "severity", "isActive", "firstWeakAt", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, true, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("userId", "syllabusNodeId") DO UPDATE SET
            "errorRate" = EXCLUDED."errorRate",
            "severity" = EXCLUDED."severity",
            "isActive" = true,
            "updatedAt" = CURRENT_TIMESTAMP`,
          [weakId, userId, nodeId, errorRate, severity, statusChangedAt]
        );
      } else {
        // Remove or deactivate weakness
        await pgDb.query(
          `DELETE FROM "student_weaknesses" WHERE "userId" = $1 AND "syllabusNodeId" = $2`,
          [userId, nodeId]
        );
      }

      // Manage Strengths (Requires min 2 attempts and Mastered/Strong)
      if ((status === 'MASTERED' || status === 'STRONG') && totalAttempts >= 2) {
        const strId = `str_${crypto.randomUUID()}`;
        await pgDb.query(
          `INSERT INTO "student_strengths" (
            "id", "userId", "syllabusNodeId", "masteryScore", "confidenceCount", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("userId", "syllabusNodeId") DO UPDATE SET
            "masteryScore" = EXCLUDED."masteryScore",
            "confidenceCount" = EXCLUDED."confidenceCount",
            "updatedAt" = CURRENT_TIMESTAMP`,
          [strId, userId, nodeId, weightedScore, totalAttempts]
        );
      } else {
        await pgDb.query(
          `DELETE FROM "student_strengths" WHERE "userId" = $1 AND "syllabusNodeId" = $2`,
          [userId, nodeId]
        );
      }

      // Record latest in history
      const latestAttempt = data.attempts[data.attempts.length - 1];
      const histId = `msh_${crypto.randomUUID()}`;
      await pgDb.query(
        `INSERT INTO "mastery_score_history" (
          "id", "userId", "syllabusNodeId", "attemptId", "score", "status", "recordedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [histId, userId, nodeId, latestAttempt?.attemptId || null, weightedScore, status]
      );
    }

    // 3. Overall Student Mastery Stats
    const examCountsRes = await pgDb.query(
      `SELECT COUNT(DISTINCT "examId") as "totalExams", COUNT(*) as "totalAttempts"
       FROM "exam_attempts"
       WHERE "userId" = $1 AND "status" IN ('EVALUATED', 'SUBMITTED')`,
      [userId]
    );
    const totalExamsTaken = parseInt((examCountsRes.rows[0] as any)?.totalExams || '0', 10);

    const questionsCountRes = await pgDb.query(
      `SELECT COUNT(*) as "totalQuestions"
       FROM "question_attempts" qa
       JOIN "exam_attempts" ea ON qa."attemptId" = ea."id"
       WHERE ea."userId" = $1 AND qa."studentAnswer" IS NOT NULL`,
      [userId]
    );
    const totalQuestionsAttempted = parseInt((questionsCountRes.rows[0] as any)?.totalQuestions || '0', 10);

    const overallProficiency = nodesWithScores > 0
      ? Math.round((overallScoreSum / nodesWithScores) * 100) / 100
      : 0.0;

    const masterId = `sm_${crypto.randomUUID()}`;
    await pgDb.query(
      `INSERT INTO "student_mastery" (
        "id", "userId", "overallProficiency", "totalExamsTaken", "totalQuestionsAttempted", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO UPDATE SET
        "overallProficiency" = EXCLUDED."overallProficiency",
        "totalExamsTaken" = EXCLUDED."totalExamsTaken",
        "totalQuestionsAttempted" = EXCLUDED."totalQuestionsAttempted",
        "updatedAt" = CURRENT_TIMESTAMP`,
      [masterId, userId, overallProficiency, totalExamsTaken, totalQuestionsAttempted]
    );

    return this.getStudentMastery(userId, userId, true);
  }

  /**
   * Get student summary profile and overall mastery (Feature 8.1)
   */
  async getStudentMastery(
    studentId: string,
    requestingUserId: string,
    isElevated: boolean = false
  ): Promise<StudentMasteryDTO> {
    // SECTION 7 SECURITY: IDOR Protection
    if (studentId !== requestingUserId && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_ANALYTICS_ACCESS', 'Forbidden: You do not have permission to access another user\'s analytics');
    }

    const smRes = await pgDb.query(
      `SELECT * FROM "student_mastery" WHERE "userId" = $1`,
      [studentId]
    );

    if (smRes.rows.length === 0) {
      // If not yet calculated, calculate now
      return this.recalculateStudentMastery(studentId);
    }

    const sm = smRes.rows[0] as any;

    // Count strong & weak topics
    const strengthsRes = await pgDb.query(
      `SELECT COUNT(*) as count FROM "student_strengths" WHERE "userId" = $1`,
      [studentId]
    );
    const weaknessesRes = await pgDb.query(
      `SELECT COUNT(*) as count FROM "student_weaknesses" WHERE "userId" = $1 AND "isActive" = true`,
      [studentId]
    );

    const strongCount = parseInt((strengthsRes.rows[0] as any)?.count || '0', 10);
    const weakCount = parseInt((weaknessesRes.rows[0] as any)?.count || '0', 10);

    const { status, color } = mapScoreToStatus(sm.overallProficiency, sm.totalExamsTaken);

    return {
      id: sm.id,
      userId: sm.userId,
      overallProficiency: sm.overallProficiency,
      totalExamsTaken: sm.totalExamsTaken,
      totalQuestionsAttempted: sm.totalQuestionsAttempted,
      strongCount,
      weakCount,
      status,
      color,
      updatedAt: sm.updatedAt,
    };
  }

  /**
   * Get ranked strengths for student (Feature 8.2)
   */
  async getStudentStrengths(
    studentId: string,
    requestingUserId: string,
    isElevated: boolean = false
  ): Promise<StudentStrengthDTO[]> {
    if (studentId !== requestingUserId && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_ANALYTICS_ACCESS', 'Forbidden: You do not have permission to access another user\'s analytics');
    }

    const progressRes = await pgDb.query(
      `SELECT stp.*, sn."title" as "nodeTitle", sn."type" as "nodeType", sub."name" as "subjectName"
       FROM "student_topic_progress" stp
       JOIN "syllabus_nodes" sn ON stp."syllabusNodeId" = sn."id"
       LEFT JOIN "subjects" sub ON sn."subjectId" = sub."id"
       WHERE stp."userId" = $1`,
      [studentId]
    );

    const inputList: NodeProgressInput[] = progressRes.rows.map((r: any) => ({
      nodeId: r.syllabusNodeId,
      nodeTitle: r.nodeTitle,
      nodeType: r.nodeType,
      subjectName: r.subjectName,
      proficiencyScore: r.proficiencyScore,
      attemptsCount: r.attemptsCount,
      correctCount: r.correctCount,
      status: r.status,
      statusChangedAt: r.statusChangedAt,
    }));

    const strengths = identifyStrengths(inputList, 2);
    strengths.forEach((s) => (s.userId = studentId));
    return strengths;
  }

  /**
   * Get ranked weaknesses with persistence tracking (Feature 8.3)
   */
  async getStudentWeaknesses(
    studentId: string,
    requestingUserId: string,
    isElevated: boolean = false
  ): Promise<StudentWeaknessDTO[]> {
    if (studentId !== requestingUserId && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_ANALYTICS_ACCESS', 'Forbidden: You do not have permission to access another user\'s analytics');
    }

    const progressRes = await pgDb.query(
      `SELECT stp.*, sn."title" as "nodeTitle", sn."type" as "nodeType", sub."name" as "subjectName"
       FROM "student_topic_progress" stp
       JOIN "syllabus_nodes" sn ON stp."syllabusNodeId" = sn."id"
       LEFT JOIN "subjects" sub ON sn."subjectId" = sub."id"
       WHERE stp."userId" = $1`,
      [studentId]
    );

    const inputList: NodeProgressInput[] = progressRes.rows.map((r: any) => ({
      nodeId: r.syllabusNodeId,
      nodeTitle: r.nodeTitle,
      nodeType: r.nodeType,
      subjectName: r.subjectName,
      proficiencyScore: r.proficiencyScore,
      attemptsCount: r.attemptsCount,
      correctCount: r.correctCount,
      status: r.status,
      statusChangedAt: r.statusChangedAt,
    }));

    const weaknesses = identifyWeaknesses(inputList);
    weaknesses.forEach((w) => (w.userId = studentId));
    return weaknesses;
  }

  /**
   * Get full Syllabus Proficiency Tree for a Course (Feature 8.4)
   */
  async getSyllabusProficiencyMap(
    studentId: string,
    courseId: string,
    requestingUserId: string,
    isElevated: boolean = false
  ): Promise<SyllabusProficiencyNodeDTO[]> {
    if (studentId !== requestingUserId && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_ANALYTICS_ACCESS', 'Forbidden: You do not have permission to access another user\'s analytics');
    }

    // Fetch subjects and syllabus nodes for course
    const nodesRes = await pgDb.query(
      `SELECT sn.*
       FROM "syllabus_nodes" sn
       JOIN "subjects" s ON sn."subjectId" = s."id"
       WHERE s."courseId" = $1
       ORDER BY sn."depth" ASC, sn."orderIndex" ASC`,
      [courseId]
    );

    const progressRes = await pgDb.query(
      `SELECT * FROM "student_topic_progress" WHERE "userId" = $1`,
      [studentId]
    );

    const progressMap = new Map<string, { score: number; attempts: number; correct: number }>();
    for (const r of progressRes.rows as any[]) {
      progressMap.set(r.syllabusNodeId, {
        score: r.proficiencyScore,
        attempts: r.attemptsCount,
        correct: r.correctCount,
      });
    }

    // Build raw tree from nodes
    const nodeMap = new Map<string, RawSyllabusNode>();
    const rootNodes: RawSyllabusNode[] = [];

    for (const n of nodesRes.rows as any[]) {
      nodeMap.set(n.id, {
        id: n.id,
        title: n.title,
        type: n.type,
        parentId: n.parentId,
        orderIndex: n.orderIndex,
        depth: n.depth,
        children: [],
      });
    }

    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return buildSyllabusProficiencyTree(rootNodes, progressMap);
  }

  /**
   * Get student progress and timeseries trends (Feature 8.5)
   */
  async getStudentProgress(
    studentId: string,
    requestingUserId: string,
    isElevated: boolean = false,
    range: '7d' | '30d' | 'all' = 'all'
  ): Promise<StudentProgressDTO> {
    if (studentId !== requestingUserId && !isElevated) {
      throw new AppError(403, 'FORBIDDEN_ANALYTICS_ACCESS', 'Forbidden: You do not have permission to access another user\'s analytics');
    }

    const attemptsRes = await pgDb.query(
      `SELECT "totalScore", "percentage", "createdAt", "correctAnswers", "totalQuestions"
       FROM "exam_attempts"
       WHERE "userId" = $1 AND "status" IN ('EVALUATED', 'SUBMITTED')
       ORDER BY "createdAt" ASC`,
      [studentId]
    );

    const history = attemptsRes.rows.map((r: any) => ({
      score: r.percentage !== null && r.percentage !== undefined ? r.percentage : (r.totalScore || 0),
      recordedAt: r.createdAt,
      examCount: 1,
      questionsCount: r.totalQuestions || 1,
    }));

    return calculateStudentProgress(history, range);
  }

  /**
   * Get class-level aggregated analytics for teachers and admins (Feature 8.7)
   */
  async getClassAnalytics(courseId: string): Promise<ClassAnalyticsDTO> {
    const courseRes = await pgDb.query(`SELECT * FROM "courses" WHERE "id" = $1`, [courseId]);
    if (courseRes.rows.length === 0) {
      throw new AppError(404, 'COURSE_404', 'Course not found');
    }
    const course = courseRes.rows[0] as any;

    // Get all enrolled students in course
    const studentsRes = await pgDb.query(
      `SELECT u."id" as "userId", u."firstName", u."lastName", u."email",
              COALESCE(sm."overallProficiency", 0.0) as "overallProficiency",
              COALESCE(sm."totalExamsTaken", 0) as "totalExamsTaken"
       FROM "enrollments" e
       JOIN "users" u ON e."userId" = u."id"
       LEFT JOIN "student_mastery" sm ON u."id" = sm."userId"
       WHERE e."courseId" = $1 AND e."status" = 'ACTIVE'`,
      [courseId]
    );

    const studentDataList = [];

    for (const s of studentsRes.rows as any[]) {
      const progressRes = await pgDb.query(
        `SELECT stp.*, sn."title" as "nodeTitle", sn."type" as "nodeType"
         FROM "student_topic_progress" stp
         JOIN "syllabus_nodes" sn ON stp."syllabusNodeId" = sn."id"
         JOIN "subjects" sub ON sn."subjectId" = sub."id"
         WHERE stp."userId" = $1 AND sub."courseId" = $2`,
        [s.userId, courseId]
      );

      const nodesProgress: NodeProgressInput[] = progressRes.rows.map((r: any) => ({
        nodeId: r.syllabusNodeId,
        nodeTitle: r.nodeTitle,
        nodeType: r.nodeType,
        proficiencyScore: r.proficiencyScore,
        attemptsCount: r.attemptsCount,
        correctCount: r.correctCount,
        status: r.status,
        statusChangedAt: r.statusChangedAt,
      }));

      studentDataList.push({
        userId: s.userId,
        name: `${s.firstName} ${s.lastName}`.trim(),
        email: s.email,
        overallProficiency: s.overallProficiency,
        examsTaken: s.totalExamsTaken,
        nodesProgress,
      });
    }

    return calculateClassAnalytics(course.id, course.name, studentDataList);
  }

  /**
   * Get topic-level aggregate performance across the class (Feature 8.7)
   */
  async getTopicAnalytics(courseId: string) {
    const classData = await this.getClassAnalytics(courseId);
    return {
      courseId,
      courseName: classData.courseName,
      topics: classData.topWeakTopics,
      averageMastery: classData.averageMastery,
      totalStudents: classData.totalStudents,
    };
  }
}

export const analyticsService = new AnalyticsService();
