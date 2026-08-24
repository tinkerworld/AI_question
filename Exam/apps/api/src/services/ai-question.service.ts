import { pgDb } from '@repo/database';
import { AIGatewayService } from './ai-gateway.service';
import { AIUsageService } from './ai-usage.service';
import {
  ModifyQuestionAIDTO,
  GenerateQuestionsAIDTO,
  ReviewDraftQuestionDTO,
} from '@repo/types';
import crypto from 'crypto';

export class AIQuestionService {
  /**
   * Modify an existing question to produce a pedagogical variation.
   */
  static async modifyQuestion(userId: string, dto: ModifyQuestionAIDTO): Promise<any> {
    const db = pgDb;

    // 1. Fetch parent question
    const origRes = await db.query(`SELECT * FROM "questions" WHERE "id" = $1`, [dto.questionId]);
    if (origRes.rows.length === 0) {
      throw new Error('ORIGINAL_QUESTION_NOT_FOUND');
    }
    const orig = origRes.rows[0] as any;
    const origData = typeof orig.data === 'string' ? JSON.parse(orig.data) : orig.data;

    // 1. Check per-feature daily cap BEFORE credit deduction
    await AIUsageService.checkFeatureDailyLimit(userId, 'question_modification');

    // 2. Deduct 1 AI Credit
    const { usageId } = await AIUsageService.deductCredits(userId, 'question_modification', 1);

    try {
      // 3. Call AI Gateway with explicit question_authoring scope
      const aiResponse = await AIGatewayService.routeRequest({
        featureKey: 'question_modification',
        scope: 'question_authoring',
        prompt: dto.instructions || `Create a distinct variation with ${dto.varianceLevel || 'MEDIUM'} variance.`,
        variables: {
          originalQuestion: orig.content,
          instructions: dto.instructions || 'Vary numbers and scenario context while preserving formulas and core concept.',
          varianceLevel: dto.varianceLevel || 'MEDIUM',
        },
        userId,
      });

      // 4. Record token usage
      await AIUsageService.recordTokensUsed(userId, usageId, aiResponse.totalTokens);

      const generatedData = aiResponse.parsedJson;
      const newQuestionId = `q_ai_${crypto.randomBytes(8).toString('hex')}`;
      const questionData = generatedData.data || origData;

      // 5. Insert new DRAFT question linking to parent
      await db.query(
        `INSERT INTO "questions" (
          "id", "type", "content", "data", "difficulty", "marks", "status", "version",
          "courseId", "subjectId", "syllabusNodeId", "isAiGenerated", "derivedFromId", "createdById"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', 1, $7, $8, $9, true, $10, $11)`,
        [
          newQuestionId,
          orig.type,
          generatedData.content || `[AI Variation] ${orig.content}`,
          JSON.stringify(questionData),
          orig.difficulty,
          orig.marks,
          orig.courseId,
          orig.subjectId,
          orig.syllabusNodeId,
          orig.id,
          userId,
        ]
      );

      // 6. Write version history record (Phase 3 integration)
      const versionId = `qv_${crypto.randomBytes(8).toString('hex')}`;
      const changeSummary = `AI-modified variation derived from ${orig.id} (${dto.instructions || `variance: ${dto.varianceLevel || 'MEDIUM'}`})`;
      await db.query(
        `INSERT INTO "question_versions" (
          "id", "questionId", "version", "content", "data", "difficulty", "marks", "changeSummary", "changedById"
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)`,
        [
          versionId,
          newQuestionId,
          generatedData.content || `[AI Variation] ${orig.content}`,
          JSON.stringify(questionData),
          orig.difficulty,
          orig.marks,
          changeSummary,
          userId,
        ]
      );

      return {
        id: newQuestionId,
        content: generatedData.content,
        type: orig.type,
        difficulty: orig.difficulty,
        marks: orig.marks,
        status: 'DRAFT',
        isAiGenerated: true,
        derivedFromId: orig.id,
        courseId: orig.courseId,
        subjectId: orig.subjectId,
        syllabusNodeId: orig.syllabusNodeId,
        data: questionData,
        createdAt: new Date().toISOString(),
      };
    } catch (err: any) {
      // Refund credits on failure
      await AIUsageService.refundCredits(userId, usageId);
      throw err;
    }
  }

  /**
   * Generate brand new questions from blueprint parameters.
   */
  static async generateQuestions(userId: string, dto: GenerateQuestionsAIDTO): Promise<any[]> {
    const db = pgDb;
    const count = dto.count || 1;

    // 1. Check per-feature daily cap BEFORE credit deduction
    await AIUsageService.checkFeatureDailyLimit(userId, 'question_generation');

    // 2. Deduct credits upfront
    const { usageId } = await AIUsageService.deductCredits(userId, 'question_generation', count);

    // Fetch subject/topic metadata
    let subjectName = 'Physics';
    let topicName = 'General';
    let courseId = null;

    const subRes = await db.query(`SELECT * FROM "subjects" WHERE "id" = $1`, [dto.subjectId]);
    if (subRes.rows.length > 0) {
      subjectName = (subRes.rows[0] as any).name;
      courseId = (subRes.rows[0] as any).courseId;
    }

    if (dto.topicId) {
      const topRes = await db.query(`SELECT * FROM "syllabus_nodes" WHERE "id" = $1`, [dto.topicId]);
      if (topRes.rows.length > 0) {
        topicName = (topRes.rows[0] as any).title;
      }
    }

    const createdQuestions = [];
    let totalTokensConsumed = 0;

    try {
      for (let i = 0; i < count; i++) {
        const aiResponse = await AIGatewayService.routeRequest({
          featureKey: 'question_generation',
          scope: 'question_authoring',
          prompt: dto.customPrompt || `Generate item #${i + 1} with high academic rigor.`,
          variables: {
            subject: subjectName,
            topic: topicName,
            difficulty: dto.difficulty || 'MEDIUM',
            type: dto.type || 'SINGLE_CHOICE',
            marks: dto.marks || 4,
          },
          userId,
        });

        totalTokensConsumed += aiResponse.totalTokens;
        const generatedData = aiResponse.parsedJson;
        const newQuestionId = `q_ai_${crypto.randomBytes(8).toString('hex')}`;
        const questionData = generatedData.data || {
          options: [
            { id: 'opt_1', text: 'Option A' },
            { id: 'opt_2', text: 'Option B' },
            { id: 'opt_3', text: 'Option C' },
            { id: 'opt_4', text: 'Option D' },
          ],
          correctOptionId: 'opt_1',
          explanation: 'Standard derived solution.',
        };

        const validSubjectId = subRes.rows.length > 0 ? dto.subjectId : null;
        // Insert into questions table with status DRAFT
        await db.query(
          `INSERT INTO "questions" (
            "id", "type", "content", "data", "difficulty", "marks", "status", "version",
            "courseId", "subjectId", "syllabusNodeId", "isAiGenerated", "createdById"
          ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', 1, $7, $8, $9, true, $10)`,
          [
            newQuestionId,
            dto.type || 'SINGLE_CHOICE',
            generatedData.content || `[AI Generated] Question for ${topicName}`,
            JSON.stringify(questionData),
            dto.difficulty || 'MEDIUM',
            dto.marks || 4,
            courseId,
            validSubjectId,
            dto.topicId || null,
            userId,
          ]
        );

        // Write version history
        const versionId = `qv_${crypto.randomBytes(8).toString('hex')}`;
        await db.query(
          `INSERT INTO "question_versions" (
            "id", "questionId", "version", "content", "data", "difficulty", "marks", "changeSummary", "changedById"
          ) VALUES ($1, $2, 1, $3, $4, $5, $6, 'AI-generated draft question', $7)`,
          [
            versionId,
            newQuestionId,
            generatedData.content,
            JSON.stringify(questionData),
            dto.difficulty || 'MEDIUM',
            dto.marks || 4,
            userId,
          ]
        );

        createdQuestions.push({
          id: newQuestionId,
          content: generatedData.content,
          type: dto.type || 'SINGLE_CHOICE',
          difficulty: dto.difficulty || 'MEDIUM',
          marks: dto.marks || 4,
          status: 'DRAFT',
          isAiGenerated: true,
          courseId,
          subjectId: dto.subjectId,
          syllabusNodeId: dto.topicId || null,
          data: questionData,
          createdAt: new Date().toISOString(),
        });
      }

      await AIUsageService.recordTokensUsed(userId, usageId, totalTokensConsumed);
      return createdQuestions;
    } catch (err: any) {
      await AIUsageService.refundCredits(userId, usageId);
      throw err;
    }
  }

  /**
   * Review AI draft question (Approve -> ACTIVE, Reject -> REJECTED).
   */
  static async reviewDraft(userId: string, questionId: string, dto: ReviewDraftQuestionDTO): Promise<any> {
    const db = pgDb;
    const qRes = await db.query(`SELECT * FROM "questions" WHERE "id" = $1`, [questionId]);
    if (qRes.rows.length === 0) {
      throw new Error('QUESTION_NOT_FOUND');
    }

    const question = qRes.rows[0] as any;
    const newStatus = dto.action === 'APPROVE' ? 'PUBLISHED' : 'ARCHIVED';
    const newVersion = (question.version || 1) + 1;

    await db.query(
      `UPDATE "questions" SET "status" = $1, "version" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $3`,
      [newStatus, newVersion, questionId]
    );

    const versionId = `qv_${crypto.randomBytes(8).toString('hex')}`;
    const summary =
      dto.action === 'APPROVE'
        ? `Approved AI draft question by ${userId}`
        : `Rejected AI draft question: ${dto.rejectionReason || 'Quality check'}`;

    await db.query(
      `INSERT INTO "question_versions" (
        "id", "questionId", "version", "content", "data", "difficulty", "marks", "changeSummary", "changedById"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        versionId,
        questionId,
        newVersion,
        question.content,
        typeof question.data === 'string' ? question.data : JSON.stringify(question.data),
        question.difficulty,
        question.marks,
        summary,
        userId,
      ]
    );

    return {
      id: questionId,
      status: newStatus,
      version: newVersion,
      reviewedBy: userId,
      action: dto.action,
    };
  }

  /**
   * List draft questions awaiting review.
   */
  static async listDraftQuestions(options: { subjectId?: string; isAiOnly?: boolean } = {}): Promise<any[]> {
    const db = pgDb;
    let query = `SELECT q.*, s."name" as "subjectName", sn."title" as "topicName" 
                 FROM "questions" q
                 LEFT JOIN "subjects" s ON q."subjectId" = s."id"
                 LEFT JOIN "syllabus_nodes" sn ON q."syllabusNodeId" = sn."id"
                 WHERE q."status" = 'DRAFT'`;
    const params: any[] = [];

    if (options.isAiOnly) {
      query += ` AND q."isAiGenerated" = true`;
    }

    if (options.subjectId) {
      params.push(options.subjectId);
      query += ` AND q."subjectId" = $${params.length}`;
    }

    query += ` ORDER BY q."createdAt" DESC`;

    const res = await db.query(query, params);
    return res.rows;
  }
}
