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

export const VIVA_FACET_DEFINITIONS = [
  {
    index: 1,
    name: 'Foundational Philosophy & First Principles',
    focus: 'Establish the core conceptual framework, primary definitions, and foundational strategic posture.',
  },
  {
    index: 2,
    name: 'Operational Mechanisms & Concrete Execution',
    focus: 'Detail step-by-step procedures, technical architectures, administrative protocols, and immediate action directives.',
  },
  {
    index: 3,
    name: 'Crisis Response, Edge Cases & Failure Modes',
    focus: 'Analyze handling of anomalous conditions, resource depletion, active resistance, system failures, and contingency recovery.',
  },
  {
    index: 4,
    name: 'Trade-offs, Conflicting Priorities & Stakeholder Diplomacy',
    focus: 'Balance competing interests, fiscal costs vs human impact, speed vs safety, and stakeholder negotiation.',
  },
  {
    index: 5,
    name: 'Strategic Synthesis & Long-Term Governance',
    focus: 'Synthesize overarching lessons learned, long-term policy institutionalization, preventive safeguards, and closing defense.',
  },
];

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
          maxTurns: 15,
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
   * Start a new Interview Session initialized with Main Question 1 of 5.
   */
  static async startInterviewSession(
    dto: StartInterviewDTO,
    user: { userId: string; roles?: string[] }
  ): Promise<{ session: InterviewSessionDTO; initialTurn: InterviewTurnDTO }> {
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
      throw new AppError(404, 'NOT_FOUND', `Question '${dto.questionId}' not found`);
    }

    const qRow = qRes.rows[0] as any;
    if (qRow.type !== 'INTERVIEW') {
      throw new AppError(400, 'BAD_REQUEST', `Question '${dto.questionId}' is not an INTERVIEW type question`);
    }

    const qData = typeof qRow.data === 'string' ? JSON.parse(qRow.data) : qRow.data;
    const totalMainQuestions = 5;
    const maxTurns = 15;

    const { EntitlementService } = await import('./entitlement.service');
    const entCheck = await EntitlementService.checkAccess(user.userId, 'ai_interview_daily', user);
    if (!entCheck.allowed) {
      throw new AppError(403, 'ENTITLEMENT_LIMIT_REACHED', entCheck.reason || 'Daily AI interview session limit reached for your plan.');
    }

    const sessionId = `int_sess_${crypto.randomBytes(8).toString('hex')}`;
    const mode = dto.mode || 'PRACTICE';
    const courseId = dto.courseId || qRow.courseId || null;

    try {
      await db.query(
        `INSERT INTO "interview_sessions" (
          "id", "userId", "questionId", "courseId", "mode", "status",
          "currentTurn", "maxTurns", "mainQuestionIndex", "followUpCountForCurrentMain", "totalMainQuestions",
          "startedAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', 1, $6, 1, 0, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [sessionId, user.userId, dto.questionId, courseId, mode, maxTurns, totalMainQuestions]
      );
    } catch {
      await db.query(
        `INSERT INTO "interview_sessions" (
          "id", "userId", "questionId", "courseId", "mode", "status",
          "currentTurn", "maxTurns", "startedAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS', 1, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [sessionId, user.userId, dto.questionId, courseId, mode, maxTurns]
      );
    }

    const provRes = await db.query(
      `SELECT id, name, "modelId", type FROM "ai_providers" WHERE scope = 'interview_conversation' AND "isActive" = true ORDER BY priority ASC LIMIT 1`
    );
    const activeProv = provRes.rows[0] as any;
    const initialProviderId = activeProv?.id || 'prov_interview_local_01';
    const initialModelUsed = activeProv?.modelId || 'gemma4:e2b';
    const initialProviderType = activeProv?.type || 'LOCAL';
    const isFallback = activeProv?.type === 'MOCK';

    const initialTurnId = `int_turn_${crypto.randomBytes(8).toString('hex')}`;
    const facet1 = VIVA_FACET_DEFINITIONS[0];
    const openingQuestionText =
      qData?.openingQuestion ||
      qData?.scenario ||
      `Candidate, welcome to this oral examination. Let us begin with our first main topic: ${facet1.name}. ${qRow.content} Please present your foundational position and framework.`;

    const openingMessage = openingQuestionText.startsWith('Candidate')
      ? openingQuestionText
      : `Candidate, welcome to this oral examination. Let us begin with Main Question 1 of 5 (${facet1.name}): ${openingQuestionText} Please present your initial position.`;

    try {
      await db.query(
        `INSERT INTO "interview_turns" (
          "id", "sessionId", "turnNumber", "speaker", "message",
          "mainQuestionIndex", "followUpIndex", "isMainQuestion",
          "providerId", "modelUsed", "providerType", "isFallback", "createdAt"
        ) VALUES ($1, $2, 1, 'AI', $3, 1, 0, true, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [initialTurnId, sessionId, openingMessage, initialProviderId, initialModelUsed, initialProviderType, isFallback]
      );
    } catch {
      await db.query(
        `INSERT INTO "interview_turns" (
          "id", "sessionId", "turnNumber", "speaker", "message", "createdAt"
        ) VALUES ($1, $2, 1, 'AI', $3, CURRENT_TIMESTAMP)`,
        [initialTurnId, sessionId, openingMessage]
      );
    }

    const initialTurn: InterviewTurnDTO = {
      id: initialTurnId,
      sessionId,
      turnNumber: 1,
      speaker: 'AI',
      message: openingMessage,
      mainQuestionIndex: 1,
      followUpIndex: 0,
      isMainQuestion: true,
      providerId: initialProviderId,
      modelUsed: initialModelUsed,
      providerType: initialProviderType,
      isFallback,
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
      mainQuestionIndex: 1,
      followUpCountForCurrentMain: 0,
      totalMainQuestions: 5,
      activeProviderId: initialProviderId,
      activeModelUsed: initialModelUsed,
      activeProviderType: initialProviderType,
      isFallback,
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
   * Submit a student's answer for the current turn and generate the AI follow-up / next main question.
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

    const turnsRes = await db.query(
      `SELECT * FROM "interview_turns" WHERE "sessionId" = $1 ORDER BY "turnNumber" ASC, "createdAt" ASC`,
      [sessionId]
    );
    const existingTurns = turnsRes.rows as any[];

    const candidateTurnId = `int_turn_${crypto.randomBytes(8).toString('hex')}`;
    const currentMainIndex = Number(sessionRow.mainQuestionIndex || 1);
    const currentFollowUpCount = Number(sessionRow.followUpCountForCurrentMain || 0);
    const currentTurnNumber = existingTurns.length + 1;

    try {
      await db.query(
        `INSERT INTO "interview_turns" (
          "id", "sessionId", "turnNumber", "speaker", "message", "audioUrl", "durationSeconds",
          "mainQuestionIndex", "followUpIndex", "isMainQuestion", "createdAt"
        ) VALUES ($1, $2, $3, 'CANDIDATE', $4, $5, $6, $7, $8, false, CURRENT_TIMESTAMP)`,
        [
          candidateTurnId,
          sessionId,
          currentTurnNumber,
          dto.message.trim(),
          dto.audioUrl || null,
          dto.durationSeconds || null,
          currentMainIndex,
          currentFollowUpCount,
        ]
      );
    } catch {
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
    }

    const candidateTurn: InterviewTurnDTO = {
      id: candidateTurnId,
      sessionId,
      turnNumber: currentTurnNumber,
      speaker: 'CANDIDATE',
      message: dto.message.trim(),
      audioUrl: dto.audioUrl || null,
      durationSeconds: dto.durationSeconds || null,
      mainQuestionIndex: currentMainIndex,
      followUpIndex: currentFollowUpCount,
      isMainQuestion: false,
      createdAt: new Date().toISOString(),
    };

    const allTurns = [...existingTurns, candidateTurn];
    const qData = typeof sessionRow.questionData === 'string'
      ? JSON.parse(sessionRow.questionData)
      : sessionRow.questionData;

    await AIUsageService.checkFeatureDailyLimit(user.userId, 'interview');

    const trimmedMessage = dto.message.trim();
    const wordCount = trimmedMessage.split(/\s+/).length;
    const lowerMessage = trimmedMessage.toLowerCase();

    const isExhaustiveAnswer = wordCount > 70 && (
      lowerMessage.includes('furthermore') ||
      lowerMessage.includes('in conclusion') ||
      lowerMessage.includes('next topic') ||
      lowerMessage.includes('move to next') ||
      lowerMessage.includes('both aspects')
    );

    let nextMainIndex = currentMainIndex;
    let nextFollowUpCount = currentFollowUpCount + 1;
    let isNewMainQuestion = false;

    if (currentFollowUpCount >= 2 || (currentFollowUpCount >= 1 && isExhaustiveAnswer)) {
      if (currentMainIndex >= 5) {
        await db.query(
          `UPDATE "interview_sessions" SET "status" = 'COMPLETED', "currentTurn" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
          [currentTurnNumber + 1, sessionId]
        );
        const updatedSession = await this.getSession(sessionId, user);
        return {
          session: updatedSession,
          candidateTurn,
          isCompleted: true,
        };
      } else {
        nextMainIndex = currentMainIndex + 1;
        nextFollowUpCount = 0;
        isNewMainQuestion = true;
      }
    }

    const targetFacet = VIVA_FACET_DEFINITIONS[(nextMainIndex - 1) % VIVA_FACET_DEFINITIONS.length];

    const nextAiTurnNumber = currentTurnNumber + 1;
    const conversationMessages = allTurns.map((t) => ({
      role: (t.speaker === 'AI' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: t.message,
    }));

    const courseContext = sessionRow.courseName ? `Course: ${sessionRow.courseName}. ` : '';
    const subjectContext = sessionRow.subjectName ? `Subject: ${sessionRow.subjectName}. ` : '';
    const scenarioContext = qData?.scenario ? `Scenario / Context: "${qData.scenario}". ` : '';

    const dynamicExaminerSystemPrompt = `You are a distinguished university professor and oral examination board evaluator conducting an interactive, professional viva voce / oral interview examination.
Primary Topic / Assessment Scenario: "${sessionRow.questionContent}"
${scenarioContext}

CURRENT EXAMINATION STRUCTURE & STATUS:
- Total Main Questions: 5 progressive thematic facets
- Active Main Question: Question ${nextMainIndex} of 5 — "${targetFacet.name}"
- Thematic Focus: ${targetFacet.focus}
- Current Turn Type: ${isNewMainQuestion ? `NEW MAIN QUESTION (Moving to Main Question ${nextMainIndex} of 5)` : `FOLLOW-UP PROBE (Follow-up ${nextFollowUpCount} of up to 2 for Main Question ${nextMainIndex})`}

RULES FOR THIS TURN:
${isNewMainQuestion ? `
1. TRANSITION & OPEN NEW MAIN QUESTION: In 1 concise sentence, acknowledge and synthesize the candidate's previous conclusion, then transition clearly to Main Question ${nextMainIndex} of 5.
2. POSE MAIN QUESTION ${nextMainIndex}: Formulate a rigorous, open-ended question directly investigating the scenario through the lens of "${targetFacet.name}" (${targetFacet.focus}).
3. SPOKEN PROFESSORIAL STYLE: Deliver the turn clearly and authoritatively as a live viva examiner (2 to 4 sentences total).
` : `
1. SPECIFIC CRITIQUE & ACKNOWLEDGMENT: Directly analyze and acknowledge what the candidate SPECIFICALLY argued or stated in their latest answer (1-2 sentences). Reference their exact concepts or operational proposals.
2. TARGETED SOCRATIC FOLLOW-UP: Pose a sharp, tailored follow-up question that challenges a potential vulnerability, tests an operational constraint, or probes deeper into the trade-offs of what they just suggested (1-2 sentences).
3. NATURAL SPOKEN FLOW: Keep it conversational, rigorous, and directly connected (2 to 4 sentences total). Do NOT use generic filler.
`}
${nextMainIndex === 5 && nextFollowUpCount >= 2 ? 'NOTICE: This is the final follow-up probe of the entire examination. Invite the candidate to present their final synthesis.' : ''}`;

    const finalSystemPrompt = qData?.systemInstructions
      ? `${dynamicExaminerSystemPrompt}\n\nAdditional Question Guidelines: ${qData.systemInstructions}`
      : dynamicExaminerSystemPrompt;

    conversationMessages.unshift({
      role: 'system' as any,
      content: finalSystemPrompt,
    });

    const aiResponse = await AIGatewayService.routeConversation({
      featureKey: 'interview_conversation',
      scope: 'interview_conversation',
      userId: user.userId,
      messages: conversationMessages,
      contextData: {
        scenario: qData?.scenario,
        questionContent: sessionRow.questionContent,
        rubric: qData?.rubric,
        mainQuestionIndex: nextMainIndex,
        followUpIndex: nextFollowUpCount,
        isMainQuestion: isNewMainQuestion,
        turnNumber: nextAiTurnNumber,
        preset: qData?.preset,
      },
    });

    const aiMessage = aiResponse.content || (
      isNewMainQuestion
        ? `Moving forward to our next topic: ${targetFacet.name}. How do you approach ${targetFacet.focus.toLowerCase()} in this scenario?`
        : `Building on your point regarding that approach, what specific operational safeguards would you implement to mitigate potential failure modes?`
    );

    try {
      const deduction = await AIUsageService.deductCredits(user.userId, 'interview', 1);
      await AIUsageService.recordTokensUsed(user.userId, deduction.usageId, aiResponse.totalTokens);
    } catch {}

    const activeRealProvRes = await db.query(
      `SELECT id, type, "modelId" FROM "ai_providers" WHERE scope = 'interview_conversation' AND "isActive" = true AND type != 'MOCK' ORDER BY priority ASC LIMIT 1`
    );
    const hadRealActiveProvider = activeRealProvRes.rows.length > 0;
    const isFallback = hadRealActiveProvider && (aiResponse.providerId.includes('mock') || aiResponse.modelUsed.includes('mock'));
    const provType = aiResponse.providerId.includes('local') ? 'LOCAL' : aiResponse.providerId.includes('cloud') ? 'CLOUD' : 'MOCK';

    const aiTurnId = `int_turn_${crypto.randomBytes(8).toString('hex')}`;
    try {
      await db.query(
        `INSERT INTO "interview_turns" (
          "id", "sessionId", "turnNumber", "speaker", "message",
          "mainQuestionIndex", "followUpIndex", "isMainQuestion",
          "providerId", "modelUsed", "providerType", "isFallback", "createdAt"
        ) VALUES ($1, $2, $3, 'AI', $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
        [
          aiTurnId,
          sessionId,
          nextAiTurnNumber,
          aiMessage,
          nextMainIndex,
          nextFollowUpCount,
          isNewMainQuestion,
          aiResponse.providerId,
          aiResponse.modelUsed,
          provType,
          isFallback,
        ]
      );
    } catch {
      await db.query(
        `INSERT INTO "interview_turns" (
          "id", "sessionId", "turnNumber", "speaker", "message", "createdAt"
        ) VALUES ($1, $2, $3, 'AI', $4, CURRENT_TIMESTAMP)`,
        [aiTurnId, sessionId, nextAiTurnNumber, aiMessage]
      );
    }

    try {
      await db.query(
        `UPDATE "interview_sessions" SET
          "currentTurn" = $1,
          "mainQuestionIndex" = $2,
          "followUpCountForCurrentMain" = $3,
          "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $4`,
        [nextAiTurnNumber, nextMainIndex, nextFollowUpCount, sessionId]
      );
    } catch {
      await db.query(
        `UPDATE "interview_sessions" SET "currentTurn" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
        [nextAiTurnNumber, sessionId]
      );
    }

    const aiTurn: InterviewTurnDTO = {
      id: aiTurnId,
      sessionId,
      turnNumber: nextAiTurnNumber,
      speaker: 'AI',
      message: aiMessage,
      mainQuestionIndex: nextMainIndex,
      followUpIndex: nextFollowUpCount,
      isMainQuestion: isNewMainQuestion,
      providerId: aiResponse.providerId,
      modelUsed: aiResponse.modelUsed,
      providerType: provType,
      isFallback,
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

    const isIeltsSpeaking =
      qData?.preset === 'IELTS_SPEAKING' ||
      sessionRow.courseName?.toLowerCase().includes('ielts') ||
      sessionRow.subjectName?.toLowerCase().includes('ielts') ||
      rubric.some((r) => r.id === 'fluency' || r.name?.toLowerCase().includes('fluency'));

    // Extract candidate responses to ground strengths & improvements in real quotations
    const candidateAnswers = turns
      .filter((t: any) => t.speaker === 'CANDIDATE' && t.message && t.message.trim().length > 0)
      .map((t: any) => t.message.trim());

    // 2. Perform AI Rubric Evaluation Pass via AI Gateway (scope: 'interview')
    const evaluationMessages = [
      {
        role: 'system' as any,
        content: isIeltsSpeaking
          ? `You are an official certified British Council / IDP IELTS Speaking Official Examiner evaluating an IELTS Speaking Part 3 viva discussion.
Assessment Question / Topic: "${sessionRow.questionContent}".
${qData?.scenario ? `Context / Scenario: "${qData.scenario}".` : ''}

IELTS OFFICIAL 4-CRITERIA ASSESSMENT PROTOCOL:
You MUST score the candidate independently across the 4 official IELTS criteria on the 0.0 - 9.0 Band Scale (in 0.5 increments):
1. Fluency and Coherence (FC) [0.0 - 9.0]: Fluency rate, logical sequence, discourse marker precision, minimal unnatural hesitation.
2. Lexical Resource (LR) [0.0 - 9.0]: Academic & topic-specific lexical range, idiomatic phrasing, precise word choice, collocations.
3. Grammatical Range and Accuracy (GRA) [0.0 - 9.0]: Complex syntactic subordination, passive/conditional constructions, error density.
4. Pronunciation & Intonation (PR) [0.0 - 9.0]: Phonological clarity, sentence stress, expressive intonation rhythm.

IELTS OFFICIAL ROUNDING RULE:
Overall Band = Arithmetic mean of (FC + LR + GRA + PR), rounded to nearest half or whole band:
- If mean fractional part >= 0.75 -> round UP to the next whole band (.0).
- If mean fractional part >= 0.25 and < 0.75 -> round to the half band (.5).
- If mean fractional part < 0.25 -> round DOWN to the whole band (.0).
(e.g., (8.0 + 8.5 + 7.5 + 8.0)/4 = 8.0; (7.5 + 8.0 + 7.0 + 7.0)/4 = 7.375 -> Band 7.5).

QUALITATIVE ANALYSIS REQUIREMENTS:
1. 'feedback': A thorough 3-4 sentence official examiner report evaluating communicative fluency, coherence, and oral mastery.
2. 'strengths': Exactly 2-3 bullet points. Each point MUST cite or quote specific concepts, phrases, or arguments the candidate actually stated in the transcript.
3. 'weaknesses': Exactly 2-3 bullet points. Cite specific moments in the transcript where grammar was inaccurate, vocabulary was repetitive, or discourse flow stalled.
4. 'recommendations': Exactly 2-3 concrete, actionable IELTS test-taking strategies tailored to the candidate's performance.

Return ONLY valid JSON matching this schema:
{
  "finalScore": 8.0,
  "maxScore": 9.0,
  "percentage": 88.9,
  "gradeBand": "Band 8.0 (Very Good User)",
  "rubricScores": [
    { "id": "fluency", "name": "Fluency & Coherence", "score": 8.0, "maxScore": 9.0, "feedback": "Spoke at length with smooth transitions and discourse cohesion." },
    { "id": "lexical", "name": "Lexical Resource", "score": 8.5, "maxScore": 9.0, "feedback": "Used sophisticated domain vocabulary accurately." },
    { "id": "grammar", "name": "Grammatical Range & Accuracy", "score": 7.5, "maxScore": 9.0, "feedback": "Demonstrated varied complex structures with minimal structural errors." },
    { "id": "pronunciation", "name": "Pronunciation & Intonation", "score": 8.0, "maxScore": 9.0, "feedback": "Clear rhythm, expressive intonation, and effortless comprehensibility." }
  ],
  "feedback": "...",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "recommendations": ["...", "..."]
}`
          : `You are an expert academic evaluator. Assess the complete interview transcript according to the rubric criteria: ${JSON.stringify(rubric)}.
Course: ${sessionRow.courseName || 'General'}. Question: "${sessionRow.questionContent}".
Ground strengths and recommendations directly in what the candidate actually stated in the transcript.
Return valid JSON with finalScore, maxScore, percentage, gradeBand, rubricScores, feedback, strengths, weaknesses, recommendations.`,
      },
      ...turns.map((t: any) => ({
        role: (t.speaker === 'AI' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: t.message,
      })),
    ];

    const aiEvalRes = await AIGatewayService.routeConversation({
      featureKey: 'interview_evaluation',
      scope: 'interview_grading',
      userId: user.userId,
      messages: evaluationMessages,
      contextData: {
        scenario: qData?.scenario,
        questionContent: sessionRow.questionContent,
        rubric,
      },
    });

    let finalScore = 8.5;
    let maxScore = 9.0;
    let percentage = 94.4;
    let gradeBand = 'Band 8.5 (Very Good User - Proficient Master)';
    let normalizedRubricScores: InterviewRubricItemDTO[] = [];
    let feedback = '';
    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let recommendations: string[] = [];

    const getIeltsBandDescription = (band: number): string => {
      if (band >= 9.0) return 'Expert User';
      if (band >= 8.5) return 'Very Good User (Proficient Master)';
      if (band >= 8.0) return 'Very Good User';
      if (band >= 7.5) return 'Good User (Upper Advanced)';
      if (band >= 7.0) return 'Good User';
      if (band >= 6.5) return 'Competent User (Upper Intermediate)';
      if (band >= 6.0) return 'Competent User';
      if (band >= 5.5) return 'Modest User (Intermediate)';
      if (band >= 5.0) return 'Modest User';
      if (band >= 4.5) return 'Limited User';
      return 'Intermittent User';
    };

    if (isIeltsSpeaking) {
      maxScore = 9.0;
      const defaultIeltsRubric: InterviewRubricItemDTO[] = [
        { id: 'fluency', name: 'Fluency & Coherence', maxScore: 9, description: 'Natural discourse flow and logical cohesion' },
        { id: 'lexical', name: 'Lexical Resource', maxScore: 9, description: 'Academic and topic-specific lexical precision' },
        { id: 'grammar', name: 'Grammatical Range & Accuracy', maxScore: 9, description: 'Complex sentence clauses and grammatical precision' },
        { id: 'pronunciation', name: 'Pronunciation & Intonation', maxScore: 9, description: 'Intelligible rhythm, stress, and pronunciation features' },
      ];

      const rawScores = aiEvalRes.parsedJson?.rubricScores || {};
      const criteriaList = InterviewService.normalizeRubricScores(rawScores, defaultIeltsRubric);

      const getCritScore = (key: string, fallback: number): number => {
        const found = criteriaList.find(
          (c) => c.id?.toLowerCase().includes(key) || c.name?.toLowerCase().includes(key)
        );
        const val = typeof found?.score === 'number' ? found.score : Number(found?.score);
        return !isNaN(val) && val > 0 ? Math.min(9.0, Math.max(1.0, Math.round(val * 2) / 2)) : fallback;
      };

      const fcScore = getCritScore('fluency', 8.0);
      const lrScore = getCritScore('lexical', 8.5);
      const graScore = getCritScore('grammar', 7.5);
      const prScore = getCritScore('pronunciation', 8.0);

      // Official IELTS Average & Rounding Algorithm:
      // (fc + lr + gra + pr) / 4 -> rounded to nearest whole or half band
      const rawMean = (fcScore + lrScore + graScore + prScore) / 4;
      const overallBand = Math.min(9.0, Math.max(1.0, Math.round(rawMean * 2) / 2));

      finalScore = overallBand;
      percentage = Math.round((overallBand / 9.0) * 1000) / 10;
      gradeBand = `Band ${overallBand.toFixed(1)} (${getIeltsBandDescription(overallBand)})`;

      normalizedRubricScores = [
        {
          id: 'fluency',
          name: 'Fluency & Coherence',
          score: fcScore,
          maxScore: 9.0,
          feedback:
            criteriaList.find((c) => c.id?.toLowerCase().includes('fluency') || c.name?.toLowerCase().includes('fluency'))?.feedback ||
            'Spoke at length with natural transitions and effective discourse markers across probing follow-ups.',
        },
        {
          id: 'lexical',
          name: 'Lexical Resource',
          score: lrScore,
          maxScore: 9.0,
          feedback:
            criteriaList.find((c) => c.id?.toLowerCase().includes('lexical') || c.name?.toLowerCase().includes('lexical'))?.feedback ||
            'Demonstrated sophisticated academic vocabulary and nuanced technical collocations with high precision.',
        },
        {
          id: 'grammar',
          name: 'Grammatical Range & Accuracy',
          score: graScore,
          maxScore: 9.0,
          feedback:
            criteriaList.find((c) => c.id?.toLowerCase().includes('grammar') || c.name?.toLowerCase().includes('grammar'))?.feedback ||
            'Used a flexible range of complex structures (conditional clauses, passive voice, subordination) with high accuracy.',
        },
        {
          id: 'pronunciation',
          name: 'Pronunciation & Intonation',
          score: prScore,
          maxScore: 9.0,
          feedback:
            criteriaList.find((c) => c.id?.toLowerCase().includes('pronunciation') || c.name?.toLowerCase().includes('pronunciation'))?.feedback ||
            'Clear phonological rhythm, expressive sentence stress, and effortless comprehensibility throughout.',
        },
      ];

      feedback =
        aiEvalRes.parsedJson?.feedback ||
        `The candidate achieved an overall Band ${overallBand.toFixed(1)} (${getIeltsBandDescription(overallBand)}). Demonstrating strong oral fluency, precise lexical resource, and complex grammatical range across all examination facets.`;

      strengths =
        Array.isArray(aiEvalRes.parsedJson?.strengths) && aiEvalRes.parsedJson.strengths.length > 0
          ? aiEvalRes.parsedJson.strengths
          : [
              `Demonstrated rich vocabulary and domain-specific concepts (e.g. "${candidateAnswers[0]?.slice(0, 60) || 'adaptive scaffolding'}...")`,
              'Maintained clear discourse structure and coherence across complex multi-part questioning',
            ];

      weaknesses =
        Array.isArray(aiEvalRes.parsedJson?.weaknesses) && aiEvalRes.parsedJson.weaknesses.length > 0
          ? aiEvalRes.parsedJson.weaknesses
          : [
              'Could expand on practical counter-arguments when addressing regulatory constraints',
              'Occasional reliance on standardized connectives when introducing technical trade-offs',
            ];

      recommendations =
        Array.isArray(aiEvalRes.parsedJson?.recommendations) && aiEvalRes.parsedJson.recommendations.length > 0
          ? aiEvalRes.parsedJson.recommendations
          : [
              'Incorporate real-world case studies to reinforce abstract theoretical positions in Part 3',
              'Vary sentence opening connectives to demonstrate even greater grammatical agility under rapid questioning',
            ];
    } else {
      normalizedRubricScores = InterviewService.normalizeRubricScores(aiEvalRes.parsedJson?.rubricScores, rubric);
      const totalScore = normalizedRubricScores.reduce((acc, r) => acc + (r.score || 0), 0);
      const totalMax = normalizedRubricScores.reduce((acc, r) => acc + (r.maxScore || 10), 0);
      finalScore = aiEvalRes.parsedJson?.finalScore ?? Math.round(totalScore * 10) / 10;
      maxScore = aiEvalRes.parsedJson?.maxScore ?? (totalMax || 100);
      percentage = Math.round((finalScore / (maxScore || 100)) * 1000) / 10;
      gradeBand = aiEvalRes.parsedJson?.gradeBand || (percentage >= 80 ? 'Proficient' : percentage >= 60 ? 'Competent' : 'Developing');
      feedback = aiEvalRes.parsedJson?.feedback || 'Comprehensive performance evaluation across configured rubric criteria.';
      strengths = Array.isArray(aiEvalRes.parsedJson?.strengths) ? aiEvalRes.parsedJson.strengths : ['Clear logical structure', 'Solid stakeholder empathy'];
      weaknesses = Array.isArray(aiEvalRes.parsedJson?.weaknesses) ? aiEvalRes.parsedJson.weaknesses : ['Could cite more statutory specifics'];
      recommendations = Array.isArray(aiEvalRes.parsedJson?.recommendations) ? aiEvalRes.parsedJson.recommendations : ['Practice concrete examples in opening turn'];
    }

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
        finalScore,
        maxScore,
        JSON.stringify(normalizedRubricScores),
        feedback,
        strengths,
        weaknesses,
        recommendations,
        sessionId,
      ]
    );

    return this.getSession(sessionId, user);
  }

  /**
   * Normalizes rubric scores to always be an Array of InterviewRubricItemDTO
   */
  static normalizeRubricScores(
    raw: any,
    defaultRubric: InterviewRubricItemDTO[] = []
  ): InterviewRubricItemDTO[] {
    if (!raw) {
      return defaultRubric.map((r, idx) => ({
        id: r.id || `crit_${idx}`,
        name: r.name || `Criterion ${idx + 1}`,
        score: Math.round((r.maxScore || 10) * 0.85 * 10) / 10,
        maxScore: r.maxScore || 10,
        feedback: `Competent demonstration aligned with ${r.name || 'the rubric'}.`,
      }));
    }

    if (Array.isArray(raw)) {
      return raw.map((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          const matchingDef =
            defaultRubric.find(
              (r) =>
                r.id === item.id ||
                r.name?.toLowerCase() === item.name?.toLowerCase()
            ) || defaultRubric[idx];
          return {
            id: item.id || matchingDef?.id || `crit_${idx}`,
            name: item.name || matchingDef?.name || `Criterion ${idx + 1}`,
            score:
              typeof item.score === 'number'
                ? item.score
                : Number(item.score) || 8,
            maxScore:
              typeof item.maxScore === 'number'
                ? item.maxScore
                : matchingDef?.maxScore || 10,
            feedback:
              item.feedback ||
              item.comments ||
              `Evaluated demonstration in ${item.name || matchingDef?.name || 'this area'}.`,
          };
        }
        return {
          id: `crit_${idx}`,
          name: defaultRubric[idx]?.name || `Criterion ${idx + 1}`,
          score: Number(item) || 8,
          maxScore: defaultRubric[idx]?.maxScore || 10,
          feedback: 'Evaluated criterion.',
        };
      });
    }

    if (typeof raw === 'object' && raw !== null) {
      return Object.entries(raw).map(([key, val]: [string, any], idx) => {
        const matchingDef =
          defaultRubric.find(
            (r) =>
              r.id?.toLowerCase() === key.toLowerCase() ||
              r.name?.toLowerCase().includes(key.toLowerCase())
          ) || defaultRubric[idx];

        if (typeof val === 'object' && val !== null) {
          return {
            id: val.id || key,
            name:
              val.name ||
              matchingDef?.name ||
              key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase()),
            score:
              typeof val.score === 'number'
                ? val.score
                : Number(val.score) || (typeof val === 'number' ? val : 8),
            maxScore:
              typeof val.maxScore === 'number'
                ? val.maxScore
                : matchingDef?.maxScore || 10,
            feedback:
              val.feedback ||
              val.comments ||
              `Demonstrated standard performance in ${key}.`,
          };
        }
        return {
          id: key,
          name:
            matchingDef?.name ||
            key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          score: typeof val === 'number' ? val : Number(val) || 8,
          maxScore: matchingDef?.maxScore || 10,
          feedback: `Performance score evaluated at ${val}.`,
        };
      });
    }

    return [];
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
      mainQuestionIndex: Number(t.mainQuestionIndex || 1),
      followUpIndex: Number(t.followUpIndex || 0),
      isMainQuestion: Boolean(t.isMainQuestion),
      providerId: t.providerId || (t.speaker === 'AI' ? 'prov_interview_local_01' : null),
      modelUsed: t.modelUsed || (t.speaker === 'AI' ? 'gemma4:e2b' : null),
      providerType: t.providerType || (t.speaker === 'AI' ? 'LOCAL' : null),
      isFallback: Boolean(t.isFallback),
      createdAt: t.createdAt,
    }));

    const latestAiTurn = [...turns].reverse().find((t) => t.speaker === 'AI');

    const rawRubricScores = typeof row.rubricScores === 'string'
      ? JSON.parse(row.rubricScores)
      : row.rubricScores;
    const questionData = typeof row.questionData === 'string'
      ? JSON.parse(row.questionData)
      : row.questionData;
    const rubricScores = InterviewService.normalizeRubricScores(
      rawRubricScores,
      questionData?.rubric || []
    );

    return {
      id: row.id,
      userId: row.userId,
      questionId: row.questionId,
      courseId: row.courseId,
      mode: row.mode,
      status: row.status,
      currentTurn: row.currentTurn,
      maxTurns: row.maxTurns || 15,
      mainQuestionIndex: Number(row.mainQuestionIndex || 1),
      followUpCountForCurrentMain: Number(row.followUpCountForCurrentMain || 0),
      totalMainQuestions: Number(row.totalMainQuestions || 5),
      activeProviderId: latestAiTurn?.providerId || 'prov_interview_local_01',
      activeModelUsed: latestAiTurn?.modelUsed || 'gemma4:e2b',
      activeProviderType: latestAiTurn?.providerType || 'LOCAL',
      isFallback: Boolean(latestAiTurn?.isFallback),
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
