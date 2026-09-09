import { pgDb } from '@repo/database';
import { AudioVoiceProfileDTO } from '@repo/types';
import { AudioConfigService } from './audio/audio-config.service';
import { questionTypeRegistry, ListeningQuestionData } from '@repo/question-types';
import { AppError } from '../middleware/error';
import crypto from 'crypto';

export interface ListeningValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ListeningEvaluationResult {
  isCorrect: boolean;
  score: number;
  earnedMarks: number;
  totalMarks: number;
  details: string[];
  feedback: string;
}

export class ListeningService {
  /**
   * List available voice and accent profiles.
   */
  static async getVoiceProfiles(): Promise<AudioVoiceProfileDTO[]> {
    return AudioConfigService.getVoiceProfiles();
  }

  /**
   * Get a specific voice profile by ID.
   */
  static async getVoiceProfileById(id: string): Promise<AudioVoiceProfileDTO | null> {
    const res = await pgDb.query(
      `SELECT * FROM "audio_voice_profiles" WHERE "id" = $1 AND "isActive" = true`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const r: any = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      provider: r.provider,
      voiceId: r.voiceId,
      accent: r.accent,
      gender: r.gender,
      sampleAudioUrl: r.sampleAudioUrl || undefined,
      isDefault: Boolean(r.isDefault),
      isActive: Boolean(r.isActive),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Synthesize audio preview for authoring or playback.
   */
  static async synthesizePreview(script: string, voiceId?: string, speed: number = 1.0) {
    return AudioConfigService.synthesizePreview(script, voiceId, speed);
  }

  /**
   * Validate a listening question data payload according to V2 specs.
   */
  static validateListeningConfig(data: Partial<ListeningQuestionData>): ListeningValidationResult {
    const errors: string[] = [];

    if (!data) {
      return { isValid: false, errors: ['Question data is required'] };
    }

    const audioSource = String(data.audioSource || 'SYNTHESIZED');
    if ((audioSource === 'URL' || audioSource === 'UPLOADED') && !data.audioUrl) {
      errors.push('Audio URL is required when audioSource is URL');
    }
    if ((audioSource === 'SYNTHESIZED' || audioSource === 'SYNTHETIC') && !data.audioScript && !(data as any).speechText) {
      errors.push('Audio script is required when audioSource is SYNTHESIZED');
    }

    if (data.playbackLimit !== undefined && (data.playbackLimit < 1 || data.playbackLimit > 10)) {
      errors.push('Playback limit must be between 1 and 10 plays');
    }

    if (Array.isArray(data.subQuestions)) {
      data.subQuestions.forEach((sq, idx) => {
        if (!sq.prompt || typeof sq.prompt !== 'string') {
          errors.push(`Sub-question #${idx + 1} requires a valid prompt`);
        }
        if (typeof sq.marks !== 'number' || sq.marks <= 0) {
          errors.push(`Sub-question #${idx + 1} requires positive marks`);
        }
        if (sq.type === 'MCQ' && (!Array.isArray(sq.options) || sq.options.length < 2)) {
          errors.push(`Sub-question #${idx + 1} (MCQ) requires at least 2 options`);
        }
        if (sq.type === 'MCQ' && !sq.correctOptionId) {
          errors.push(`Sub-question #${idx + 1} (MCQ) requires a correct option ID`);
        }
        if (sq.type === 'FILL_IN_BLANK' && !sq.blankKey) {
          errors.push(`Sub-question #${idx + 1} (Fill in Blank) requires an answer key`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate immutable checksum hash for published audio passage to ensure non-mutation.
   */
  static computeAudioHash(audioScript?: string, audioUrl?: string, subQuestions?: any[]): string {
    const payload = JSON.stringify({
      script: audioScript || '',
      url: audioUrl || '',
      subQuestions: subQuestions || [],
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Evaluate listening answers using pluggable ListeningHandler.
   */
  static evaluateAnswers(questionData: ListeningQuestionData, userAnswers: Record<string, any>): ListeningEvaluationResult {
    const evalRes = questionTypeRegistry.evaluate('LISTENING', questionData, userAnswers);

    let totalMarks = 0;
    let earnedMarks = 0;
    const details: string[] = [];

    if (Array.isArray(questionData.subQuestions)) {
      for (const sq of questionData.subQuestions) {
        totalMarks += sq.marks;
        const ans = userAnswers ? userAnswers[sq.id] : undefined;
        if (ans === undefined || ans === null) {
          details.push(`${sq.id}: Unanswered`);
          continue;
        }

        if (sq.type === 'MCQ') {
          const isCorrect = String(ans) === sq.correctOptionId;
          if (isCorrect) {
            earnedMarks += sq.marks;
            details.push(`${sq.id}: Correct (+${sq.marks})`);
          } else {
            details.push(`${sq.id}: Incorrect`);
          }
        } else if (sq.type === 'FILL_IN_BLANK') {
          const isCorrect = String(ans).trim().toLowerCase() === String(sq.blankKey || '').trim().toLowerCase();
          if (isCorrect) {
            earnedMarks += sq.marks;
            details.push(`${sq.id}: Correct (+${sq.marks})`);
          } else {
            details.push(`${sq.id}: Incorrect`);
          }
        }
      }
    }

    return {
      isCorrect: evalRes.isCorrect,
      score: evalRes.score,
      earnedMarks,
      totalMarks,
      details,
      feedback: evalRes.feedback || `Listening Score: ${earnedMarks}/${totalMarks}`,
    };
  }

  private static schemaInitialized = false;

  /**
   * Ensure standalone listening practice session table exists.
   */
  static async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;
    const db = pgDb;
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS "listening_practice_sessions" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
          "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
          "mode" TEXT NOT NULL DEFAULT 'PRACTICE',
          "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
          "answers" JSONB DEFAULT '{}'::jsonb,
          "score" DOUBLE PRECISION DEFAULT 0.0,
          "maxScore" DOUBLE PRECISION DEFAULT 10.0,
          "evaluation" JSONB DEFAULT '{}'::jsonb,
          "timeSpentSeconds" INT DEFAULT 0,
          "startedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completedAt" TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.schemaInitialized = true;
    } catch (err) {
      console.error('Failed to ensure listening_practice_sessions schema:', err);
    }
  }

  /**
   * Derive course listening-eligibility and caller access.
   * Matches Interview eligibility pattern: active enrollment in a course with published LISTENING questions.
   */
  static async getUserEligibility(
    userId: string,
    roles: string[] = []
  ): Promise<{
    isEligible: boolean;
    eligibleCourseIds: string[];
    eligibleCourses: Array<{ id: string; name: string; code: string; questionCount: number }>;
    availableQuestions: any[];
  }> {
    await this.ensureSchema();
    const db = pgDb;
    const isStaff =
      roles.includes('MAIN_ADMIN') ||
      roles.includes('SUB_ADMIN') ||
      roles.includes('TEACHER');

    // 1. Fetch all courses and their published listening question counts
    const coursesRes = await db.query(`
      SELECT 
        c.id, 
        c.name, 
        c.code,
        COUNT(q.id)::int as "questionCount"
      FROM "courses" c
      LEFT JOIN "questions" q ON (
        q."type" = 'LISTENING' AND 
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
      questionCount: r.questionCount || 0,
    }));

    const eligibleCoursesAll = allCourses.filter((c) => c.questionCount > 0);

    // Count standalone published listening questions (courseId is null or not in courses)
    const standaloneCountRes = await db.query(`
      SELECT COUNT(id)::int as count 
      FROM "questions" 
      WHERE "type" = 'LISTENING' 
        AND "status" = 'PUBLISHED' 
        AND ("courseId" IS NULL OR "courseId" NOT IN (SELECT id FROM "courses"))
    `);
    const standaloneCount = Number((standaloneCountRes.rows[0] as any)?.count || 0);

    if (standaloneCount > 0) {
      eligibleCoursesAll.push({
        id: 'general',
        name: 'General Listening Practice',
        code: 'GENERAL',
        questionCount: standaloneCount,
      });
    }

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
        .filter((c) => enrolledCourseIds.includes(c.id) || c.id === 'general')
        .map((c) => c.id);
    }

    const isEligible = isStaff || userEligibleCourseIds.length > 0;
    const userEligibleCourses = eligibleCoursesAll.filter((c) =>
      userEligibleCourseIds.includes(c.id)
    );

    let availableQuestions: any[] = [];
    if (isEligible) {
      let qRes: any;
      if (isStaff) {
        qRes = await db.query(
          `SELECT 
             q.id, q.content, q.difficulty, q.marks, q."courseId", q."subjectId", q."data",
             c.name as "courseName", s.name as "subjectName"
           FROM "questions" q
           LEFT JOIN "courses" c ON q."courseId" = c.id
           LEFT JOIN "subjects" s ON q."subjectId" = s.id
           WHERE q."type" = 'LISTENING' AND q."status" = 'PUBLISHED'
           ORDER BY q."createdAt" DESC`
        );
      } else {
        const realCourseIds = userEligibleCourseIds.filter((id) => id !== 'general');
        if (realCourseIds.length > 0) {
          qRes = await db.query(
            `SELECT 
               q.id, q.content, q.difficulty, q.marks, q."courseId", q."subjectId", q."data",
               c.name as "courseName", s.name as "subjectName"
             FROM "questions" q
             LEFT JOIN "courses" c ON q."courseId" = c.id
             LEFT JOIN "subjects" s ON q."subjectId" = s.id
             WHERE q."type" = 'LISTENING' AND q."status" = 'PUBLISHED'
               AND (
                 q."courseId" = ANY($1) 
                 OR s."courseId" = ANY($1)
                 OR q."courseId" IS NULL 
                 OR q."courseId" NOT IN (SELECT id FROM "courses")
               )
             ORDER BY q."createdAt" DESC`,
            [realCourseIds]
          );
        } else {
          qRes = await db.query(
            `SELECT 
               q.id, q.content, q.difficulty, q.marks, q."courseId", q."subjectId", q."data",
               c.name as "courseName", s.name as "subjectName"
             FROM "questions" q
             LEFT JOIN "courses" c ON q."courseId" = c.id
             LEFT JOIN "subjects" s ON q."subjectId" = s.id
             WHERE q."type" = 'LISTENING' AND q."status" = 'PUBLISHED'
               AND (
                 q."courseId" IS NULL 
                 OR q."courseId" NOT IN (SELECT id FROM "courses")
               )
             ORDER BY q."createdAt" DESC`
          );
        }
      }

      availableQuestions = qRes.rows.map((r: any) => {
        const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return {
          id: r.id,
          content: r.content,
          difficulty: r.difficulty,
          marks: Number(r.marks || 10),
          courseId: r.courseId || 'general',
          subjectId: r.subjectId || undefined,
          courseName: r.courseName || 'General Assessment',
          subjectName: r.subjectName || 'Listening Module',
          data,
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
   * Start a standalone listening practice attempt session.
   */
  static async startListeningSession(
    dto: { questionId: string; mode?: string; courseId?: string },
    user: { userId: string; roles?: string[] }
  ) {
    await this.ensureSchema();
    const db = pgDb;

    const qRes = await db.query(
      `SELECT q.*, c.name as "courseName", s.name as "subjectName"
       FROM "questions" q
       LEFT JOIN "courses" c ON q."courseId" = c.id
       LEFT JOIN "subjects" s ON q."subjectId" = s.id
       WHERE q.id = $1`,
      [dto.questionId]
    );

    if (qRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Listening question '${dto.questionId}' not found`);
    }

    const qRow = qRes.rows[0] as any;
    if (qRow.type !== 'LISTENING') {
      throw new AppError(400, 'BAD_REQUEST', `Question '${dto.questionId}' is not a LISTENING question`);
    }

    const qData = typeof qRow.data === 'string' ? JSON.parse(qRow.data) : qRow.data;
    const sessionId = `lis_sess_${crypto.randomBytes(8).toString('hex')}`;
    const mode = dto.mode || 'PRACTICE';
    let courseId = dto.courseId || qRow.courseId || null;
    if (courseId === 'general') courseId = null;

    const maxScore = Number(qRow.marks || 10.0);

    await db.query(
      `INSERT INTO "listening_practice_sessions" (
        "id", "userId", "questionId", "courseId", "mode", "status",
        "score", "maxScore", "startedAt", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', 0.0, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [sessionId, user.userId, dto.questionId, courseId, mode, maxScore]
    );

    return {
      session: {
        id: sessionId,
        userId: user.userId,
        questionId: dto.questionId,
        courseId,
        mode,
        status: 'IN_PROGRESS',
        score: 0.0,
        maxScore,
        startedAt: new Date().toISOString(),
      },
      question: {
        id: qRow.id,
        content: qRow.content,
        difficulty: qRow.difficulty,
        marks: maxScore,
        courseName: qRow.courseName || 'General Listening',
        subjectName: qRow.subjectName || 'Listening Module',
        data: qData,
      },
    };
  }

  /**
   * Get an existing listening session by ID.
   */
  static async getListeningSession(sessionId: string, user: { userId: string; roles?: string[] }) {
    await this.ensureSchema();
    const db = pgDb;

    const res = await db.query(
      `SELECT s.*, q.content, q.difficulty, q.marks as "questionMarks", q.data as "questionData",
              c.name as "courseName", sub.name as "subjectName"
       FROM "listening_practice_sessions" s
       JOIN "questions" q ON s."questionId" = q.id
       LEFT JOIN "courses" c ON s."courseId" = c.id
       LEFT JOIN "subjects" sub ON q."subjectId" = sub.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Listening practice session '${sessionId}' not found`);
    }

    const row = res.rows[0] as any;
    const isOwner = row.userId === user.userId;
    const isStaff = (user.roles || []).some((r) => ['MAIN_ADMIN', 'SUB_ADMIN', 'TEACHER'].includes(r));
    if (!isOwner && !isStaff) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot access another candidate\'s practice session');
    }

    const qData = typeof row.questionData === 'string' ? JSON.parse(row.questionData) : row.questionData;
    const answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
    const evaluation = typeof row.evaluation === 'string' ? JSON.parse(row.evaluation) : row.evaluation;

    return {
      id: row.id,
      userId: row.userId,
      questionId: row.questionId,
      courseId: row.courseId,
      mode: row.mode,
      status: row.status,
      score: row.score,
      maxScore: row.maxScore,
      answers,
      evaluation,
      timeSpentSeconds: row.timeSpentSeconds || 0,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      question: {
        id: row.questionId,
        content: row.content,
        difficulty: row.difficulty,
        marks: row.questionMarks,
        courseName: row.courseName,
        subjectName: row.subjectName,
        data: qData,
      },
    };
  }

  /**
   * Submit and auto-evaluate a listening session.
   */
  static async submitListeningSession(
    sessionId: string,
    dto: { userAnswers: Record<string, any>; timeSpentSeconds?: number },
    user: { userId: string; roles?: string[] }
  ) {
    await this.ensureSchema();
    const db = pgDb;

    const res = await db.query(
      `SELECT s.*, q.data as "questionData", q.marks as "questionMarks"
       FROM "listening_practice_sessions" s
       JOIN "questions" q ON s."questionId" = q.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Listening practice session '${sessionId}' not found`);
    }

    const row = res.rows[0] as any;
    const isOwner = row.userId === user.userId;
    const isStaff = (user.roles || []).some((r) => ['MAIN_ADMIN', 'SUB_ADMIN', 'TEACHER'].includes(r));
    if (!isOwner && !isStaff) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot submit another candidate\'s practice session');
    }

    const qData = typeof row.questionData === 'string' ? JSON.parse(row.questionData) : row.questionData;
    const evaluation = this.evaluateAnswers(qData, dto.userAnswers || {});
    const maxScore = Number(row.maxScore || row.questionMarks || 10.0);
    const score = evaluation.earnedMarks;

    await db.query(
      `UPDATE "listening_practice_sessions"
       SET "status" = 'COMPLETED',
           "answers" = $1,
           "score" = $2,
           "maxScore" = $3,
           "evaluation" = $4,
           "timeSpentSeconds" = $5,
           "completedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        JSON.stringify(dto.userAnswers || {}),
        score,
        maxScore,
        JSON.stringify(evaluation),
        dto.timeSpentSeconds || 0,
        sessionId,
      ]
    );

    return {
      sessionId,
      status: 'COMPLETED',
      score,
      maxScore,
      evaluation,
      timeSpentSeconds: dto.timeSpentSeconds || 0,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Get past listening practice sessions for candidate.
   */
  static async getUserSessions(userId: string) {
    await this.ensureSchema();
    const db = pgDb;

    const res = await db.query(
      `SELECT s.*, q.content as "questionContent", q.difficulty, c.name as "courseName"
       FROM "listening_practice_sessions" s
       JOIN "questions" q ON s."questionId" = q.id
       LEFT JOIN "courses" c ON s."courseId" = c.id
       WHERE s."userId" = $1
       ORDER BY s."startedAt" DESC
       LIMIT 50`,
      [userId]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      questionId: r.questionId,
      questionContent: r.questionContent,
      courseName: r.courseName || 'General Listening',
      difficulty: r.difficulty,
      mode: r.mode,
      status: r.status,
      score: r.score,
      maxScore: r.maxScore,
      timeSpentSeconds: r.timeSpentSeconds,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
    }));
  }
}

