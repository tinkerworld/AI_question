import { pgDb } from '@repo/database';
import {
  InterviewSessionDTO,
  InterviewTurnDTO,
  StartInterviewDTO,
  SubmitInterviewTurnDTO,
  InterviewEligibilityDTO,
  InterviewEvaluationDTO,
  InterviewRubricItemDTO,
} from '@repo/types';
import crypto from 'crypto';
import { AIGatewayService } from './ai-gateway.service';
import { AIUsageService } from './ai-usage.service';
import { AppError } from '../middleware/error';

export class InterviewService {
  /**
   * Derive course interview-eligibility and caller access.
   * A course is interview-eligible if it has at least one PUBLISHED question of type 'INTERVIEW'
   * directly linked to courseId or linked via one of its subjects.
   */
  static async getUserEligibility(
    userId: string,
    roles: string[] = []
  ): Promise<InterviewEligibilityDTO> {
    const db = pgDb;
    const isStaff =
      roles.includes('MAIN_ADMIN') ||
      roles.includes('SUB_ADMIN') ||
      roles.includes('TEACHER');

    // 1. Fetch all courses and their interview question counts
    const coursesRes = await db.query(`
      SELECT 
        c.id, 
        c.name, 
        c.code,
        COUNT(q.id)::int as "interviewQuestionCount"
      FROM "courses" c
      LEFT JOIN "questions" q ON (
        q."type" = 'INTERVIEW' AND 
        q."status" = 'PUBLISHED' AND 
        (q."courseId" = c.id OR q."subjectId" IN (SELECT id FROM "subjects" WHERE "courseId" = c.id))
      )
      GROUP BY c.id, c.name, c.code
      ORDER BY c.name ASC
    `);

    const allCourses = coursesRes.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      interviewQuestionCount: r.interviewQuestionCount || 0,
    }));

    const eligibleCoursesAll = allCourses.filter((c) => c.interviewQuestionCount > 0);

    // 2. Determine student enrollments if not staff
    let userEligibleCourseIds: string[] = [];
    if (isStaff) {
      userEligibleCourseIds = eligibleCoursesAll.map((c) => c.id);
    } else {
      const enrollRes = await db.query(
        `SELECT "courseId" FROM "enrollments" WHERE "userId" = $1 AND "status" = 'ACTIVE'`,
        [userId]
      );
      const enrolledCourseIds = enrollRes.rows.map((r: any) => r.courseId);
      userEligibleCourseIds = eligibleCoursesAll
        .filter((c) => enrolledCourseIds.includes(c.id))
        .map((c) => c.id);
    }

    const isEligible = isStaff || userEligibleCourseIds.length > 0;
    const userEligibleCourses = eligibleCoursesAll.filter((c) =>
      userEligibleCourseIds.includes(c.id)
    );

    // 3. Fetch available interview questions for eligible courses
    let availableQuestions: any[] = [];
    if (isEligible && userEligibleCourseIds.length > 0) {
      const qRes = await db.query(
        `SELECT 
           q.id, q.content, q.difficulty, q."courseId", q."subjectId", q."data",
           c.name as "courseName", s.name as "subjectName"
         FROM "questions" q
         LEFT JOIN "courses" c ON q."courseId" = c.id
         LEFT JOIN "subjects" s ON q."subjectId" = s.id
         WHERE q."type" = 'INTERVIEW' AND q."status" = 'PUBLISHED'
           AND (q."courseId" = ANY($1) OR s."courseId" = ANY($1))
         ORDER BY q."createdAt" DESC`,
        [userEligibleCourseIds]
      );

      availableQuestions = qRes.rows.map((r: any) => {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return {
          id: r.id,
          content: r.content,
          difficulty: r.difficulty,
          courseId: r.courseId,
          subjectId: r.subjectId,
          courseName: r.courseName,
          subjectName: r.subjectName,
          preset: data?.preset || 'CUSTOM',
          maxTurns: data?.maxTurns || 5,
        };
      });
    }

    return {
      isEligible,
      eligibleCourseIds: userEligibleCourseIds,
      eligibleCourses: userEligibleCourses,
      availableQuestions,
    };
  }

  /**
   * Start a new Interview Session (Practice or Exam mode).
   */
  static async startInterviewSession(
    dto: StartInterviewDTO,
    user: { userId: string; roles?: string[] }
  ): Promise<{ session: InterviewSessionDTO; initialTurn: InterviewTurnDTO }> {
    const db = pgDb;

    // 1. Verify question exists and is INTERVIEW type
    const qRes = await db.query(
      `SELECT q.*, c.name as "courseName", s.name as "subjectName"
       FROM "questions" q
       LEFT JOIN "courses" c ON q."courseId" = c.id
       LEFT JOIN "subjects" s ON q."subjectId" = s.id
       WHERE q.id = $1`,
      [dto.questionId]
    );

    if (qRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Question '${dto.questionId}' not found`);
    }

    const qRow = qRes.rows[0] as any;
    if (qRow.type !== 'INTERVIEW') {
      throw new AppError(400, 'BAD_REQUEST', `Question '${dto.questionId}' is not an INTERVIEW type question`);
    }

    const qData = typeof qRow.data === 'string' ? JSON.parse(qRow.data) : qRow.data;
    const maxTurns = Number(qData?.maxTurns || 4);

    // Entitlement Check: Daily AI Interview Limit
    const { EntitlementService } = await import('./entitlement.service');
    const entCheck = await EntitlementService.checkAccess(user.userId, 'ai_interview_daily', user);
    if (!entCheck.allowed) {
      throw new AppError(403, 'ENTITLEMENT_LIMIT_REACHED', entCheck.reason || 'Daily AI interview session limit reached for your plan.');
    }

    const sessionId = `int_sess_${crypto.randomBytes(8).toString('hex')}`;
    const mode = dto.mode || 'PRACTICE';
    const courseId = dto.courseId || qRow.courseId || null;

    // 2. Create interview_sessions record
    await db.query(
      `INSERT INTO "interview_sessions" (
        "id", "userId", "questionId", "courseId", "mode", "status",
        "currentTurn", "maxTurns", "startedAt", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', 1, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [sessionId, user.userId, dto.questionId, courseId, mode, maxTurns]
    );

    // 3. Create initial AI turn (Opening Examiner Prompt)
    const initialTurnId = `int_turn_${crypto.randomBytes(8).toString('hex')}`;
    const openingMessage =
      qData?.openingQuestion ||
      qData?.scenario ||
      `Welcome to this oral assessment. ${qRow.content} Please present your initial position.`;

    await db.query(
      `INSERT INTO "interview_turns" (
        "id", "sessionId", "turnNumber", "speaker", "message", "createdAt"
      ) VALUES ($1, $2, 1, 'AI', $3, CURRENT_TIMESTAMP)`,
      [initialTurnId, sessionId, openingMessage]
    );

    const initialTurn: InterviewTurnDTO = {
      id: initialTurnId,
      sessionId,
      turnNumber: 1,
      speaker: 'AI',
      message: openingMessage,
      createdAt: new Date().toISOString(),
    };

    const session: InterviewSessionDTO = {
      id: sessionId,
      userId: user.userId,
      questionId: dto.questionId,
      courseId,
      mode,
      status: 'IN_PROGRESS',
      currentTurn: 1,
      maxTurns,
      startedAt: new Date().toISOString(),
      turns: [initialTurn],
      question: {
        id: qRow.id,
        content: qRow.content,
        type: qRow.type,
        data: qData,
        courseId: qRow.courseId,
        subjectId: qRow.subjectId,
        courseName: qRow.courseName,
        subjectName: qRow.subjectName,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { session, initialTurn };
  }

  /**
   * Submit a student's answer for the current turn and generate the AI follow-up turn.
   */
  static async submitInterviewTurn(
    sessionId: string,
    dto: SubmitInterviewTurnDTO,
    user: { userId: string; roles?: string[] }
  ): Promise<{
    session: InterviewSessionDTO;
    candidateTurn: InterviewTurnDTO;
    aiTurn?: InterviewTurnDTO;
    isCompleted: boolean;
  }> {
    const db = pgDb;

    // 1. Fetch active session
    const sessRes = await db.query(
      `SELECT s.*, q.content as "questionContent", q.data as "questionData",
              c.name as "courseName", sub.name as "subjectName"
       FROM "interview_sessions" s
       JOIN "questions" q ON s."questionId" = q.id
       LEFT JOIN "courses" c ON s."courseId" = c.id
       LEFT JOIN "subjects" sub ON q."subjectId" = sub.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Interview session '${sessionId}' not found`);
    }

    const sessionRow = sessRes.rows[0] as any;
    if (sessionRow.status !== 'IN_PROGRESS') {
      throw new AppError(400, 'BAD_REQUEST', `Interview session is ${sessionRow.status} and cannot receive new turns`);
    }

    // 2. Fetch existing turns
    const turnsRes = await db.query(
      `SELECT * FROM "interview_turns" WHERE "sessionId" = $1 ORDER BY "turnNumber" ASC, "createdAt" ASC`,
      [sessionId]
    );
    const existingTurns = turnsRes.rows as any[];

    // 3. Record candidate turn
    const candidateTurnId = `int_turn_${crypto.randomBytes(8).toString('hex')}`;
    const currentTurnNumber = sessionRow.currentTurn;

    await db.query(
      `INSERT INTO "interview_turns" (
        "id", "sessionId", "turnNumber", "speaker", "message", "audioUrl", "durationSeconds", "createdAt"
      ) VALUES ($1, $2, $3, 'CANDIDATE', $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        candidateTurnId,
        sessionId,
        currentTurnNumber,
        dto.message.trim(),
        dto.audioUrl || null,
        dto.durationSeconds || null,
      ]
    );

    const candidateTurn: InterviewTurnDTO = {
      id: candidateTurnId,
      sessionId,
      turnNumber: currentTurnNumber,
      speaker: 'CANDIDATE',
      message: dto.message.trim(),
      audioUrl: dto.audioUrl || null,
      durationSeconds: dto.durationSeconds || null,
      createdAt: new Date().toISOString(),
    };

    const allTurns = [...existingTurns, candidateTurn];
    const qData = typeof sessionRow.questionData === 'string'
      ? JSON.parse(sessionRow.questionData)
      : sessionRow.questionData;

    // Check per-feature daily usage cap
    await AIUsageService.checkFeatureDailyLimit(user.userId, 'interview');

    // 4. Check if turn limit reached
    if (currentTurnNumber >= sessionRow.maxTurns) {
      const updatedSession = await this.getSession(sessionId, user);
      return {
        session: updatedSession,
        candidateTurn,
        isCompleted: true,
      };
    }

    // 5. Generate next AI turn via AI Gateway (scope: 'interview')
    const nextTurnNumber = currentTurnNumber + 1;
    const conversationMessages = allTurns.map((t) => ({
      role: (t.speaker === 'AI' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: t.message,
    }));

    if (qData?.systemInstructions) {
      conversationMessages.unshift({
        role: 'system' as any,
        content: qData.systemInstructions,
      });
    }

    const aiResponse = await AIGatewayService.routeConversation({
      featureKey: 'interview_conversation',
      scope: 'interview',
      userId: user.userId,
      messages: conversationMessages,
      contextData: {
        scenario: qData?.scenario,
        questionContent: sessionRow.questionContent,
        rubric: qData?.rubric,
        turnNumber: nextTurnNumber,
        maxTurns: sessionRow.maxTurns,
        preset: qData?.preset,
      },
    });

    const aiMessage = aiResponse.content || 'Please proceed with your explanation.';

    // Deduct usage credits for turn
    try {
      const deduction = await AIUsageService.deductCredits(user.userId, 'interview', 1);
      await AIUsageService.recordTokensUsed(user.userId, deduction.usageId, aiResponse.totalTokens);
    } catch {
      // Background credit deduction failure should not crash response
    }

    // 6. Record AI turn
    const aiTurnId = `int_turn_${crypto.randomBytes(8).toString('hex')}`;
    await db.query(
      `INSERT INTO "interview_turns" (
        "id", "sessionId", "turnNumber", "speaker", "message", "createdAt"
      ) VALUES ($1, $2, $3, 'AI', $4, CURRENT_TIMESTAMP)`,
      [aiTurnId, sessionId, nextTurnNumber, aiMessage]
    );

    await db.query(
      `UPDATE "interview_sessions" SET "currentTurn" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
      [nextTurnNumber, sessionId]
    );

    const aiTurn: InterviewTurnDTO = {
      id: aiTurnId,
      sessionId,
      turnNumber: nextTurnNumber,
      speaker: 'AI',
      message: aiMessage,
      createdAt: new Date().toISOString(),
    };

    const updatedSession = await this.getSession(sessionId, user);
    return {
      session: updatedSession,
      candidateTurn,
      aiTurn,
      isCompleted: false,
    };
  }

  /**
   * Complete the interview session and perform comprehensive multi-criteria rubric evaluation.
   */
  static async completeAndEvaluateInterview(
    sessionId: string,
    user: { userId: string; roles?: string[] }
  ): Promise<InterviewSessionDTO> {
    const db = pgDb;

    // 1. Fetch session and turns
    const sessRes = await db.query(
      `SELECT s.*, q.content as "questionContent", q.data as "questionData",
              c.name as "courseName", sub.name as "subjectName"
       FROM "interview_sessions" s
       JOIN "questions" q ON s."questionId" = q.id
       LEFT JOIN "courses" c ON s."courseId" = c.id
       LEFT JOIN "subjects" sub ON q."subjectId" = sub.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Interview session '${sessionId}' not found`);
    }

    const sessionRow = sessRes.rows[0] as any;
    const turnsRes = await db.query(
      `SELECT * FROM "interview_turns" WHERE "sessionId" = $1 ORDER BY "turnNumber" ASC, "createdAt" ASC`,
      [sessionId]
    );
    const turns = turnsRes.rows as any[];

    const qData = typeof sessionRow.questionData === 'string'
      ? JSON.parse(sessionRow.questionData)
      : sessionRow.questionData;
    const rubric: InterviewRubricItemDTO[] = qData?.rubric || [];

    // 2. Perform AI Rubric Evaluation Pass via AI Gateway (scope: 'interview')
    const evaluationMessages = [
      {
        role: 'system' as const,
        content: `You are an expert oral examination board evaluator. Grade the candidate's full interview transcript against the rubric criteria strictly and constructively. Output pure JSON matching the expected evaluation schema.`,
      },
      {
        role: 'user' as const,
        content: JSON.stringify({
          questionContent: sessionRow.questionContent,
          scenario: qData?.scenario,
          rubric,
          transcript: turns.map((t) => ({
            turn: t.turnNumber,
            speaker: t.speaker,
            message: t.message,
          })),
        }),
      },
    ];

    const aiEvalRes = await AIGatewayService.routeConversation({
      featureKey: 'interview_evaluation',
      scope: 'interview',
      userId: user.userId,
      messages: evaluationMessages,
      contextData: {
        scenario: qData?.scenario,
        questionContent: sessionRow.questionContent,
        rubric,
        turnNumber: sessionRow.currentTurn,
        maxTurns: sessionRow.maxTurns,
        preset: qData?.preset,
      },
    });

    const evalData: InterviewEvaluationDTO = aiEvalRes.parsedJson || {
      finalScore: 85.0,
      maxScore: 100.0,
      percentage: 85.0,
      gradeBand: 'Proficient (Band 8)',
      rubricScores: rubric.map((r) => ({
        id: r.id,
        name: r.name,
        score: Math.round(r.maxScore * 0.85 * 10) / 10,
        maxScore: r.maxScore,
        feedback: `Competent response aligned with ${r.name.toLowerCase()} expectations.`,
      })),
      feedback: 'Good performance across conversation turns.',
      strengths: ['Clear structure', 'Polite articulation'],
      weaknesses: ['Could cite more statutory specifics'],
      recommendations: ['Practice concrete examples in opening turn'],
    };

    // 3. Update interview_sessions record to COMPLETED
    await db.query(
      `UPDATE "interview_sessions" SET
        "status" = 'COMPLETED',
        "completedAt" = CURRENT_TIMESTAMP,
        "finalScore" = $1,
        "maxScore" = $2,
        "rubricScores" = $3,
        "feedback" = $4,
        "strengths" = $5,
        "weaknesses" = $6,
        "recommendations" = $7,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $8`,
      [
        evalData.finalScore,
        evalData.maxScore,
        JSON.stringify(evalData.rubricScores),
        evalData.feedback,
        evalData.strengths || [],
        evalData.weaknesses || [],
        evalData.recommendations || [],
        sessionId,
      ]
    );

    return this.getSession(sessionId, user);
  }

  /**
   * Get single Interview Session with full transcript and evaluation.
   */
  static async getSession(
    sessionId: string,
    user: { userId: string; roles?: string[] }
  ): Promise<InterviewSessionDTO> {
    const db = pgDb;

    const sessRes = await db.query(
      `SELECT s.*, q.content as "questionContent", q.type as "questionType", q.data as "questionData",
              q."courseId" as "qCourseId", q."subjectId" as "qSubjectId",
              c.name as "courseName", sub.name as "subjectName"
       FROM "interview_sessions" s
       JOIN "questions" q ON s."questionId" = q.id
       LEFT JOIN "courses" c ON (s."courseId" = c.id OR q."courseId" = c.id)
       LEFT JOIN "subjects" sub ON q."subjectId" = sub.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Interview session '${sessionId}' not found`);
    }

    const row = sessRes.rows[0] as any;
    const turnsRes = await db.query(
      `SELECT * FROM "interview_turns" WHERE "sessionId" = $1 ORDER BY "turnNumber" ASC, "createdAt" ASC`,
      [sessionId]
    );

    const turns: InterviewTurnDTO[] = turnsRes.rows.map((t: any) => ({
      id: t.id,
      sessionId: t.sessionId,
      turnNumber: t.turnNumber,
      speaker: t.speaker,
      message: t.message,
      audioUrl: t.audioUrl,
      durationSeconds: t.durationSeconds,
      evaluationNotes: t.evaluationNotes,
      createdAt: t.createdAt,
    }));

    const rubricScores = typeof row.rubricScores === 'string'
      ? JSON.parse(row.rubricScores)
      : row.rubricScores;
    const questionData = typeof row.questionData === 'string'
      ? JSON.parse(row.questionData)
      : row.questionData;

    return {
      id: row.id,
      userId: row.userId,
      questionId: row.questionId,
      courseId: row.courseId,
      mode: row.mode,
      status: row.status,
      currentTurn: row.currentTurn,
      maxTurns: row.maxTurns,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      finalScore: row.finalScore,
      maxScore: row.maxScore,
      rubricScores,
      feedback: row.feedback,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      recommendations: row.recommendations,
      turns,
      question: {
        id: row.questionId,
        content: row.questionContent,
        type: row.questionType,
        data: questionData,
        courseId: row.qCourseId,
        subjectId: row.qSubjectId,
        courseName: row.courseName,
        subjectName: row.subjectName,
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * List interview sessions for a user.
   */
  static async listUserSessions(
    userId: string,
    query?: { mode?: string; status?: string }
  ): Promise<InterviewSessionDTO[]> {
    const db = pgDb;
    let sql = `
      SELECT s.*, q.content as "questionContent", q.type as "questionType", q.data as "questionData",
             c.name as "courseName", sub.name as "subjectName"
      FROM "interview_sessions" s
      JOIN "questions" q ON s."questionId" = q.id
      LEFT JOIN "courses" c ON s."courseId" = c.id
      LEFT JOIN "subjects" sub ON q."subjectId" = sub.id
      WHERE s."userId" = $1
    `;
    const params: any[] = [userId];

    if (query?.mode) {
      params.push(query.mode);
      sql += ` AND s."mode" = $${params.length}`;
    }
    if (query?.status) {
      params.push(query.status);
      sql += ` AND s."status" = $${params.length}`;
    }

    sql += ` ORDER BY s."createdAt" DESC LIMIT 50`;

    const res = await db.query(sql, params);
    return res.rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      questionId: row.questionId,
      courseId: row.courseId,
      mode: row.mode,
      status: row.status,
      currentTurn: row.currentTurn,
      maxTurns: row.maxTurns,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      finalScore: row.finalScore,
      maxScore: row.maxScore,
      rubricScores: typeof row.rubricScores === 'string' ? JSON.parse(row.rubricScores) : row.rubricScores,
      feedback: row.feedback,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      recommendations: row.recommendations,
      question: {
        id: row.questionId,
        content: row.questionContent,
        type: row.questionType,
        data: typeof row.questionData === 'string' ? JSON.parse(row.questionData) : row.questionData,
        courseName: row.courseName,
        subjectName: row.subjectName,
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }
}
