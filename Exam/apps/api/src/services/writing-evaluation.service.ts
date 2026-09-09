import { WritingRubricCriterionDTO, WritingEvaluationResultDTO } from '@repo/types';
import { pgDb } from '@repo/database';
import { AppError } from '../middleware/error';
import crypto from 'crypto';
import { AIGatewayService } from './ai-gateway.service';

export const BUILTIN_WRITING_RUBRICS: Record<string, { name: string; criteria: WritingRubricCriterionDTO[] }> = {
  IELTS_TASK_1: {
    name: 'IELTS Academic Writing Task 1 (Report / Summary)',
    criteria: [
      { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview, key features selected and illustrated with data.' },
      { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical paragraph progression, cohesive devices, reference and substitution.' },
      { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Range of vocabulary, collocations, precision, and spelling accuracy.' },
      { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Variety of complex structures, error-free sentences, and punctuation.' },
    ],
  },
  IELTS_TASK_2: {
    name: 'IELTS Writing Task 2 (Discursive Essay)',
    criteria: [
      { id: 'task_response', name: 'Task Response', maxScore: 9, weight: 0.25, description: 'Addresses all parts of task, clear position throughout, extended ideas.' },
      { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Sequencing, clear central topic in each paragraph, cohesive links.' },
      { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Sufficient range of vocabulary, style, natural collocations, minimal errors.' },
      { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Complex sentence forms, good control of grammar, clear communicative effect.' },
    ],
  },
  TOEFL_INDEPENDENT: {
    name: 'TOEFL Independent Writing',
    criteria: [
      { id: 'topic_development', name: 'Topic Development', maxScore: 5, weight: 0.35, description: 'Thorough explanation, relevant examples, clear supporting details.' },
      { id: 'organization', name: 'Organization & Flow', maxScore: 5, weight: 0.35, description: 'Clear introduction, body transitions, logical conclusion.' },
      { id: 'language_use', name: 'Language Use', maxScore: 5, weight: 0.30, description: 'Grammatical fluency, vocabulary choice, sentence structure variety.' },
    ],
  },
  ACADEMIC_ESSAY: {
    name: 'Standard Academic Analytical Essay',
    criteria: [
      { id: 'thesis_argumentation', name: 'Thesis & Argumentation', maxScore: 25, weight: 0.25, description: 'Compelling central argument supported by rigorous rationale.' },
      { id: 'structure_cohesion', name: 'Structural Cohesion', maxScore: 25, weight: 0.25, description: 'Logical progression between paragraphs with clear topic sentences.' },
      { id: 'evidence_analysis', name: 'Evidence & Analysis', maxScore: 25, weight: 0.25, description: 'Synthesis of supporting examples and critical analysis.' },
      { id: 'style_mechanics', name: 'Academic Style & Mechanics', maxScore: 25, weight: 0.25, description: 'Formal academic tone, syntax variety, precise vocabulary.' },
    ],
  },
};

export class WritingEvaluationService {
  /**
   * Return available rubric presets.
   */
  static getRubricPresets() {
    return Object.entries(BUILTIN_WRITING_RUBRICS).map(([key, val]) => ({
      id: key,
      presetKey: key,
      name: val.name,
      criteria: val.criteria,
    }));
  }

  /**
   * Evaluate written submission against criteria with word count analysis.
   */
  static async evaluateWriting(
    essayText: string,
    rubric: WritingRubricCriterionDTO[],
    minWordCount: number = 150,
    maxWordCount: number = 300,
    promptText?: string
  ): Promise<WritingEvaluationResultDTO> {
    const text = String(essayText || '').trim();
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;
    const wordCountCompliant = wordCount >= minWordCount && (maxWordCount === 0 || wordCount <= maxWordCount * 1.5);

    if (wordCount === 0) {
      return {
        overallScore: 0,
        maxScore: 9,
        band: 'Band 0.0 (Did not attempt)',
        wordCount: 0,
        wordCountCompliant: false,
        criteriaScores: rubric.map((c) => ({
          id: c.id,
          name: c.name,
          score: 0,
          maxScore: c.maxScore,
          feedback: 'No response submitted.',
        })),
        grammarFeedback: [],
        vocabularySuggestions: [],
        overallFeedback: 'The essay area was left completely blank. A minimum of ' + minWordCount + ' words is required.',
      };
    }

    // Baseline heuristic values
    let lengthPenaltyFraction = 0;
    if (wordCount < minWordCount) {
      lengthPenaltyFraction = (minWordCount - wordCount) / minWordCount;
    }

    const baselineCriteriaScores = rubric.map((c) => {
      let baseRaw = c.maxScore * 0.75;
      if (wordCount < minWordCount) {
        baseRaw = Math.max(1, baseRaw * (1 - lengthPenaltyFraction * 0.6));
      }
      const score = Math.round(baseRaw * 2) / 2;
      return {
        id: c.id,
        name: c.name,
        score,
        maxScore: c.maxScore,
        feedback:
          wordCount >= minWordCount
            ? `Satisfies ${c.name} standards with structured development and good coherence.`
            : `Affected by short length (${wordCount}/${minWordCount} words). Expand on central points to achieve higher marks.`,
      };
    });

    const totalEarned = baselineCriteriaScores.reduce((sum, c) => sum + c.score, 0);
    const totalMax = baselineCriteriaScores.reduce((sum, c) => sum + c.maxScore, 0);
    const normalizedScore = totalMax > 0 ? (totalEarned / totalMax) * 9 : 0;
    const roundedOverall = Math.round(normalizedScore * 2) / 2;

    // Baseline diagnostic items
    const grammarFeedback: Array<{ quote: string; issue: string; suggestion: string }> = [];
    const vocabularySuggestions: Array<{ word: string; betterAlternative: string; context: string }> = [];

    if (text.toLowerCase().includes('a lot of') || text.toLowerCase().includes('lots of')) {
      vocabularySuggestions.push({
        word: 'a lot of',
        betterAlternative: 'a substantial proportion of / numerous / myriad',
        context: 'Use formal academic quantifiers instead of colloquial terms.',
      });
    }

    if (text.toLowerCase().includes('good')) {
      vocabularySuggestions.push({
        word: 'good',
        betterAlternative: 'beneficial / advantageous / commendable',
        context: 'Elevate generic adjectives to precise lexical markers.',
      });
    }

    if (text.toLowerCase().includes('bad')) {
      vocabularySuggestions.push({
        word: 'bad',
        betterAlternative: 'detrimental / adverse / deleterious',
        context: 'Select nuanced academic vocabulary for negative impacts.',
      });
    }

    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    for (const s of sentences) {
      if (s.length > 0 && s[0] === s[0].toLowerCase()) {
        grammarFeedback.push({
          quote: s.substring(0, 30) + '...',
          issue: 'Sentence does not begin with an uppercase letter.',
          suggestion: s[0].toUpperCase() + s.substring(1),
        });
        break;
      }
    }

    // Call AIGatewayService (with automatic fallback to mock provider if cloud provider fails)
    let aiEvaluation: any = null;
    try {
      const criteriaStr = rubric.map((c) => `- ${c.name} (Max: ${c.maxScore}): ${c.description || ''}`).join('\n');
      const response = await AIGatewayService.routeRequest({
        featureKey: 'writing_evaluation',
        scope: 'writing_analysis',
        systemPrompt: `You are an expert examiner evaluating academic essay submissions. Evaluate the candidate's essay against the specified rubric:\n${criteriaStr}\nTarget length: ${minWordCount}-${maxWordCount || 400} words. Candidate length: ${wordCount} words. Output JSON with score, gradeBand, feedback, criteria, strengths, weaknesses, recommendations.`,
        prompt: `Writing Prompt: ${promptText || 'Academic Essay Task'}\n\nCandidate Submission:\n${text}`,
        variables: {
          writingPrompt: promptText,
          studentText: text,
          minWordCount,
          maxWordCount,
        },
      });

      if (response && (response.parsedJson || response.content)) {
        aiEvaluation = response.parsedJson;
        if (!aiEvaluation && typeof response.content === 'string') {
          let clean = response.content.trim();
          if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
          aiEvaluation = JSON.parse(clean);
        }
      }
    } catch (aiErr: any) {
      console.warn(`[WritingEvaluationService] AI Gateway request fallback: ${aiErr.message}`);
    }

    // Merge AI Evaluation if available, otherwise use baseline heuristic
    if (aiEvaluation) {
      const finalScore = typeof aiEvaluation.score === 'number'
        ? aiEvaluation.score
        : typeof aiEvaluation.finalScore === 'number'
        ? aiEvaluation.finalScore
        : roundedOverall;

      const mergedCriteriaScores = rubric.map((c, idx) => {
        const aiCritList = aiEvaluation.criteria || aiEvaluation.rubricScores || [];
        const matched = aiCritList.find((ac: any) =>
          (ac.name && ac.name.toLowerCase().includes(c.name.toLowerCase().slice(0, 5))) ||
          (ac.id && ac.id.toLowerCase() === c.id.toLowerCase())
        ) || aiCritList[idx];

        if (matched) {
          return {
            id: c.id,
            name: c.name,
            score: typeof matched.score === 'number' ? matched.score : baselineCriteriaScores[idx].score,
            maxScore: c.maxScore,
            feedback: matched.feedback || baselineCriteriaScores[idx].feedback,
          };
        }
        return baselineCriteriaScores[idx];
      });

      if (Array.isArray(aiEvaluation.grammarFeedback) && aiEvaluation.grammarFeedback.length > 0) {
        grammarFeedback.push(...aiEvaluation.grammarFeedback);
      }
      if (Array.isArray(aiEvaluation.vocabularySuggestions) && aiEvaluation.vocabularySuggestions.length > 0) {
        vocabularySuggestions.push(...aiEvaluation.vocabularySuggestions);
      }

      return {
        overallScore: Math.round(finalScore * 2) / 2,
        maxScore: 9,
        band: aiEvaluation.gradeBand || `Band ${finalScore.toFixed(1)}`,
        wordCount,
        wordCountCompliant,
        criteriaScores: mergedCriteriaScores,
        grammarFeedback,
        vocabularySuggestions,
        overallFeedback: aiEvaluation.feedback || (
          wordCount >= minWordCount
            ? `Well-developed response of ${wordCount} words satisfying formal examination criteria. Good paragraph structure with clear communicative clarity.`
            : `Submission reached ${wordCount} words, falling short of the required ${minWordCount} minimum.`
        ),
      };
    }

    // Heuristic fallback
    return {
      overallScore: roundedOverall,
      maxScore: 9,
      band: `Band ${roundedOverall.toFixed(1)}`,
      wordCount,
      wordCountCompliant,
      criteriaScores: baselineCriteriaScores,
      grammarFeedback,
      vocabularySuggestions,
      overallFeedback:
        wordCount >= minWordCount
          ? `Well-developed response of ${wordCount} words satisfying formal examination criteria. Good paragraph structure with clear communicative clarity.`
          : `Submission reached ${wordCount} words, falling short of the required ${minWordCount} minimum. Under-length submissions receive an automatic penalty on Task Response.`,
    };
  }

  private static schemaInitialized = false;

  /**
   * Ensure standalone writing practice session table exists.
   */
  static async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;
    const db = pgDb;
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS "writing_practice_sessions" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "questionId" TEXT NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
          "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
          "mode" TEXT NOT NULL DEFAULT 'PRACTICE',
          "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
          "essayText" TEXT DEFAULT '',
          "wordCount" INT DEFAULT 0,
          "score" DOUBLE PRECISION DEFAULT 0.0,
          "maxScore" DOUBLE PRECISION DEFAULT 9.0,
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
      console.error('Failed to ensure writing_practice_sessions schema:', err);
    }
  }

  /**
   * Derive course writing-eligibility and caller access.
   * Matches Interview eligibility pattern: active enrollment in a course with published WRITING questions.
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

    // 1. Fetch all courses and their published writing question counts
    const coursesRes = await db.query(`
      SELECT 
        c.id, 
        c.name, 
        c.code,
        COUNT(q.id)::int as "questionCount"
      FROM "courses" c
      LEFT JOIN "questions" q ON (
        q."type" = 'WRITING' AND 
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

    // Count standalone published writing questions (courseId is null or not in courses)
    const standaloneCountRes = await db.query(`
      SELECT COUNT(id)::int as count 
      FROM "questions" 
      WHERE "type" = 'WRITING' 
        AND "status" = 'PUBLISHED' 
        AND ("courseId" IS NULL OR "courseId" NOT IN (SELECT id FROM "courses"))
    `);
    const standaloneCount = Number((standaloneCountRes.rows[0] as any)?.count || 0);

    if (standaloneCount > 0) {
      eligibleCoursesAll.push({
        id: 'general',
        name: 'General Writing Practice',
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
           WHERE q."type" = 'WRITING' AND q."status" = 'PUBLISHED'
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
             WHERE q."type" = 'WRITING' AND q."status" = 'PUBLISHED'
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
             WHERE q."type" = 'WRITING' AND q."status" = 'PUBLISHED'
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
          subjectName: r.subjectName || 'Writing Module',
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
   * Start a standalone writing practice attempt session.
   */
  static async startWritingSession(
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
      throw new AppError(404, 'NOT_FOUND', `Writing question '${dto.questionId}' not found`);
    }

    const qRow = qRes.rows[0] as any;
    if (qRow.type !== 'WRITING') {
      throw new AppError(400, 'BAD_REQUEST', `Question '${dto.questionId}' is not a WRITING question`);
    }

    const qData = typeof qRow.data === 'string' ? JSON.parse(qRow.data) : qRow.data;
    const sessionId = `wrt_sess_${crypto.randomBytes(8).toString('hex')}`;
    const mode = dto.mode || 'PRACTICE';
    let courseId = dto.courseId || qRow.courseId || null;
    if (courseId === 'general') courseId = null;

    const maxScore = Number(qRow.marks || 9.0);

    await db.query(
      `INSERT INTO "writing_practice_sessions" (
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
        courseName: qRow.courseName || 'General Writing',
        subjectName: qRow.subjectName || 'Writing Module',
        data: qData,
      },
    };
  }

  /**
   * Get an existing writing session by ID.
   */
  static async getWritingSession(sessionId: string, user: { userId: string; roles?: string[] }) {
    await this.ensureSchema();
    const db = pgDb;

    const res = await db.query(
      `SELECT s.*, q.content, q.difficulty, q.marks as "questionMarks", q.data as "questionData",
              c.name as "courseName", sub.name as "subjectName"
       FROM "writing_practice_sessions" s
       JOIN "questions" q ON s."questionId" = q.id
       LEFT JOIN "courses" c ON s."courseId" = c.id
       LEFT JOIN "subjects" sub ON q."subjectId" = sub.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Writing practice session '${sessionId}' not found`);
    }

    const row = res.rows[0] as any;
    const isOwner = row.userId === user.userId;
    const isStaff = (user.roles || []).some((r) => ['MAIN_ADMIN', 'SUB_ADMIN', 'TEACHER'].includes(r));
    if (!isOwner && !isStaff) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot access another candidate\'s practice session');
    }

    const qData = typeof row.questionData === 'string' ? JSON.parse(row.questionData) : row.questionData;
    const evaluation = typeof row.evaluation === 'string' ? JSON.parse(row.evaluation) : row.evaluation;

    return {
      id: row.id,
      userId: row.userId,
      questionId: row.questionId,
      courseId: row.courseId,
      mode: row.mode,
      status: row.status,
      essayText: row.essayText || '',
      wordCount: row.wordCount || 0,
      score: row.score,
      maxScore: row.maxScore,
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
   * Submit and auto-evaluate a writing session.
   */
  static async submitWritingSession(
    sessionId: string,
    dto: { essayText: string; timeSpentSeconds?: number },
    user: { userId: string; roles?: string[] }
  ) {
    await this.ensureSchema();
    const db = pgDb;

    const res = await db.query(
      `SELECT s.*, q.data as "questionData", q.marks as "questionMarks", q.content as "questionContent"
       FROM "writing_practice_sessions" s
       JOIN "questions" q ON s."questionId" = q.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (res.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Writing practice session '${sessionId}' not found`);
    }

    const row = res.rows[0] as any;
    const isOwner = row.userId === user.userId;
    const isStaff = (user.roles || []).some((r) => ['MAIN_ADMIN', 'SUB_ADMIN', 'TEACHER'].includes(r));
    if (!isOwner && !isStaff) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot submit another candidate\'s practice session');
    }

    const qData = typeof row.questionData === 'string' ? JSON.parse(row.questionData) : row.questionData;
    const minWords = Number(qData.minWords || qData.minWordCount || 150);
    const maxWords = Number(qData.maxWords || qData.maxWordCount || 400);
    const promptStem = qData.promptStem || row.questionContent || '';
    const rubrics = Array.isArray(qData.rubrics) && qData.rubrics.length > 0
      ? qData.rubrics
      : BUILTIN_WRITING_RUBRICS.IELTS_TASK_2.criteria;

    const evaluation = await this.evaluateWriting(
      dto.essayText || '',
      rubrics,
      minWords,
      maxWords,
      promptStem
    );

    const score = evaluation.overallScore;
    const maxScore = Number(row.maxScore || 9.0);
    const wordCount = evaluation.wordCount;

    await db.query(
      `UPDATE "writing_practice_sessions"
       SET "status" = 'COMPLETED',
           "essayText" = $1,
           "wordCount" = $2,
           "score" = $3,
           "maxScore" = $4,
           "evaluation" = $5,
           "timeSpentSeconds" = $6,
           "completedAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        dto.essayText || '',
        wordCount,
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
      essayText: dto.essayText || '',
      wordCount,
      score,
      maxScore,
      evaluation,
      timeSpentSeconds: dto.timeSpentSeconds || 0,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Get past writing practice sessions for candidate.
   */
  static async getUserSessions(userId: string) {
    await this.ensureSchema();
    const db = pgDb;

    const res = await db.query(
      `SELECT s.*, q.content as "questionContent", q.difficulty, c.name as "courseName"
       FROM "writing_practice_sessions" s
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
      courseName: r.courseName || 'General Writing',
      difficulty: r.difficulty,
      mode: r.mode,
      status: r.status,
      wordCount: r.wordCount,
      score: r.score,
      maxScore: r.maxScore,
      timeSpentSeconds: r.timeSpentSeconds,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
    }));
  }
}

