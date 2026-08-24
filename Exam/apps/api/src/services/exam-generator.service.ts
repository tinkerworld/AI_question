import { pgDb } from '@repo/database';
import {
  GenerateExamDTO,
  SwapExamQuestionDTO,
  ReorderExamQuestionsDTO,
  UpdateExamMetadataDTO,
  CreateManualExamDTO,
  CreateExamSectionDTO,
  AddExamQuestionsDTO,
} from '@repo/types';
import { AppError } from '../middleware/error';

export class ExamGeneratorService {
  /**
   * Feature 5.1: Automatic Exam Generation from Exam Pattern Blueprint
   */
  static async generateExam(dto: GenerateExamDTO, actorUserId: string) {
    // 1. Fetch pattern blueprint
    const patternRes = await pgDb.query(
      `SELECT * FROM "exam_patterns" WHERE "id" = $1`,
      [dto.patternId]
    );

    if (patternRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Exam pattern not found');
    }

    const pattern = patternRes.rows[0] as any;
    if (pattern.status === 'ARCHIVED') {
      throw new AppError(400, 'INVALID_PATTERN_STATUS', 'Cannot generate exam from an ARCHIVED pattern');
    }

    // 2. Fetch all sections for the pattern
    const sectionsRes = await pgDb.query(
      `SELECT * FROM "exam_pattern_sections" WHERE "examPatternId" = $1 ORDER BY "sequenceOrder" ASC, "createdAt" ASC`,
      [dto.patternId]
    );

    if (sectionsRes.rows.length === 0) {
      throw new AppError(400, 'NO_SECTIONS', 'Exam pattern has no sections configured for generation');
    }

    const sections = sectionsRes.rows as any[];
    const globalUsedQuestionIds = new Set<string>(dto.excludeQuestionIds || []);

    // 3. If avoidRecentDays configured, query recently used questions to exclude
    if (dto.avoidRecentDays && dto.avoidRecentDays > 0) {
      const recentRes = await pgDb.query(
        `SELECT DISTINCT "questionId" FROM "previous_exam_usages"
         WHERE "createdAt" >= CURRENT_TIMESTAMP - ($1 || ' days')::INTERVAL`,
        [dto.avoidRecentDays]
      );
      recentRes.rows.forEach((r: any) => globalUsedQuestionIds.add(r.questionId));
    }

    const sectionGenerationPlan: Array<{
      section: any;
      selectedQuestions: any[];
    }> = [];

    // 4. Process each section and select questions adhering to rules
    for (const sec of sections) {
      // Fetch section rules
      const ruleRes = await pgDb.query(
        `SELECT * FROM "exam_pattern_section_rules" WHERE "sectionId" = $1`,
        [sec.id]
      );
      const rule = (ruleRes.rows[0] as any) || null;

      // Fetch topic distributions
      const topicsRes = await pgDb.query(
        `SELECT t.*, sn.title as "topicTitle"
         FROM "exam_pattern_section_topics" t
         JOIN "syllabus_nodes" sn ON t."topicId" = sn.id
         WHERE t."sectionId" = $1`,
        [sec.id]
      );
      const topicConfigs = topicsRes.rows as any[];

      // Fetch difficulty distributions
      const diffsRes = await pgDb.query(
        `SELECT * FROM "exam_pattern_section_difficulties" WHERE "sectionId" = $1`,
        [sec.id]
      );
      const diffConfigs = diffsRes.rows as any[];

      const numQuestionsNeeded = sec.numQuestions || 10;
      const sectionSelectedQuestions: any[] = [];
      const sectionUsedIds = new Set<string>();

      // Build base query conditions for this section
      let baseConditions = `WHERE q."status" = 'PUBLISHED'`;
      const queryParams: any[] = [];
      let paramIdx = 1;

      if (sec.subjectId) {
        baseConditions += ` AND (q."subjectId" = $${paramIdx} OR q."subjectId" IS NULL)`;
        queryParams.push(sec.subjectId);
        paramIdx++;
      } else if (pattern.courseId) {
        baseConditions += ` AND (q."courseId" = $${paramIdx} OR q."courseId" IS NULL)`;
        queryParams.push(pattern.courseId);
        paramIdx++;
      }

      // Check allowedQuestionTypes in rules
      if (rule && rule.allowedQuestionTypes) {
        const types = typeof rule.allowedQuestionTypes === 'string'
          ? JSON.parse(rule.allowedQuestionTypes)
          : rule.allowedQuestionTypes;
        if (Array.isArray(types) && types.length > 0) {
          baseConditions += ` AND q."type" = ANY($${paramIdx}::text[])`;
          queryParams.push(types);
          paramIdx++;
        }
      }

      // Fetch all eligible questions for this section
      const eligibleRes = await pgDb.query(
        `SELECT q.*, sn.title as "topicTitle"
         FROM "questions" q
         LEFT JOIN "syllabus_nodes" sn ON q."syllabusNodeId" = sn.id
         ${baseConditions}
         ORDER BY RANDOM()`,
        queryParams
      );

      const allEligibleQuestions = (eligibleRes.rows as any[]).filter(
        (q: any) => !globalUsedQuestionIds.has(q.id)
      );

      // A) First satisfy Topic-Specific counts if configured
      if (topicConfigs.length > 0) {
        for (const tc of topicConfigs) {
          let neededForTopic = 0;
          if (tc.distributionType === 'COUNT' && tc.count) {
            neededForTopic = tc.count;
          } else if (tc.distributionType === 'PERCENT' && tc.percentage) {
            neededForTopic = Math.round((tc.percentage / 100) * numQuestionsNeeded);
          }

          if (neededForTopic > 0) {
            const topicCandidates = allEligibleQuestions.filter(
              (q: any) => q.syllabusNodeId === tc.topicId && !sectionUsedIds.has(q.id)
            );

            const picked = topicCandidates.slice(0, neededForTopic);
            picked.forEach((q: any) => {
              sectionSelectedQuestions.push(q);
              sectionUsedIds.add(q.id);
              globalUsedQuestionIds.add(q.id);
            });
          }
        }
      }

      // B) Second satisfy Difficulty-Specific counts if configured
      if (diffConfigs.length > 0 && sectionSelectedQuestions.length < numQuestionsNeeded) {
        for (const dc of diffConfigs) {
          let neededForDiff = 0;
          if (dc.distributionType === 'COUNT' && dc.count) {
            neededForDiff = dc.count;
          } else if (dc.distributionType === 'PERCENT' && dc.percentage) {
            neededForDiff = Math.round((dc.percentage / 100) * numQuestionsNeeded);
          }

          // Adjust for already picked questions of this difficulty
          const alreadyPicked = sectionSelectedQuestions.filter((q) => q.difficulty === dc.difficulty).length;
          const remainingNeeded = Math.max(0, neededForDiff - alreadyPicked);

          if (remainingNeeded > 0) {
            const diffCandidates = allEligibleQuestions.filter(
              (q: any) => q.difficulty === dc.difficulty && !sectionUsedIds.has(q.id)
            );

            const picked = diffCandidates.slice(0, remainingNeeded);
            picked.forEach((q: any) => {
              if (sectionSelectedQuestions.length < numQuestionsNeeded) {
                sectionSelectedQuestions.push(q);
                sectionUsedIds.add(q.id);
                globalUsedQuestionIds.add(q.id);
              }
            });
          }
        }
      }

      // C) Fill remaining slots from general eligible pool
      const remainingSlots = numQuestionsNeeded - sectionSelectedQuestions.length;
      if (remainingSlots > 0) {
        const remainingCandidates = allEligibleQuestions.filter(
          (q: any) => !sectionUsedIds.has(q.id)
        );

        const fillPicked = remainingCandidates.slice(0, remainingSlots);
        fillPicked.forEach((q: any) => {
          sectionSelectedQuestions.push(q);
          sectionUsedIds.add(q.id);
          globalUsedQuestionIds.add(q.id);
        });
      }

      if (sectionSelectedQuestions.length < numQuestionsNeeded) {
        throw new AppError(
          422,
          'INSUFFICIENT_QUESTIONS',
          `Insufficient questions in Question Bank for Section "${sec.name}". Required: ${numQuestionsNeeded}, Available: ${sectionSelectedQuestions.length}`
        );
      }

      sectionGenerationPlan.push({
        section: sec,
        selectedQuestions: sectionSelectedQuestions.slice(0, numQuestionsNeeded),
      });
    }

    // 5. Persist the generated Exam, Sections, and Questions into PostgreSQL
    const examId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const examName = dto.name || `${pattern.name} - Generated Paper`;
    const examInstructions = dto.instructions || pattern.description || 'Complete all questions within the allocated time.';
    const durationMinutes = pattern.durationMinutes || 60;
    const totalMarks = pattern.totalMarks || sections.reduce((acc: number, s: any) => acc + (s.totalMarks || 0), 0);

    await pgDb.query(
      `INSERT INTO "exams" (
        "id", "patternId", "courseId", "name", "instructions", "durationMinutes",
        "totalMarks", "startTime", "endTime", "status", "createdById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        examId,
        pattern.id,
        pattern.courseId,
        examName,
        examInstructions,
        durationMinutes,
        totalMarks,
        dto.startTime ? new Date(dto.startTime) : null,
        dto.endTime ? new Date(dto.endTime) : null,
        actorUserId,
      ]
    );

    let secOrder = 1;
    for (const plan of sectionGenerationPlan) {
      const examSectionId = `exsec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const sec = plan.section;

      await pgDb.query(
        `INSERT INTO "exam_sections" (
          "id", "examId", "name", "sequenceOrder", "subjectId", "numQuestions",
          "marksPerQuestion", "totalMarks", "marksCorrect", "marksWrong", "marksUnattempted", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          examSectionId,
          examId,
          sec.name,
          secOrder++,
          sec.subjectId,
          plan.selectedQuestions.length,
          sec.marksPerQuestion || 1.0,
          sec.totalMarks || plan.selectedQuestions.length * (sec.marksPerQuestion || 1.0),
          sec.marksCorrect || sec.marksPerQuestion || 1.0,
          sec.marksWrong || 0.0,
          sec.marksUnattempted || 0.0,
        ]
      );

      let qOrder = 1;
      for (const q of plan.selectedQuestions) {
        const eqId = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await pgDb.query(
          `INSERT INTO "exam_questions" (
            "id", "examId", "examSectionId", "questionId", "sequenceOrder", "marksCorrect", "marksWrong", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            eqId,
            examId,
            examSectionId,
            q.id,
            qOrder++,
            sec.marksCorrect || sec.marksPerQuestion || 1.0,
            sec.marksWrong || 0.0,
          ]
        );

        // Record usage history
        const usageId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await pgDb.query(
          `INSERT INTO "previous_exam_usages" ("id", "questionId", "examName", "year", "createdAt")
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [usageId, q.id, examName, new Date().getFullYear()]
        );
      }
    }

    // 6. Record audit log
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "audit_logs" ("id", "userId", "action", "resource", "resourceId", "details")
       VALUES ($1, $2, 'exam.generated', 'exams', $3, $4)`,
      [
        auditId,
        actorUserId,
        examId,
        JSON.stringify({ patternId: pattern.id, name: examName, totalMarks }),
      ]
    );

    return this.getDraftExamDetails(examId);
  }

  /**
   * Fetch full draft exam structure, sections, assigned questions, and validation statistics
   */
  static async getDraftExamDetails(examId: string) {
    const examRes = await pgDb.query(
      `SELECT e.*, c.name as "courseName", p.name as "patternName"
       FROM "exams" e
       LEFT JOIN "courses" c ON e."courseId" = c.id
       LEFT JOIN "exam_patterns" p ON e."patternId" = p.id
       WHERE e."id" = $1`,
      [examId]
    );

    if (examRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    }

    const exam = examRes.rows[0] as any;

    const sectionsRes = await pgDb.query(
      `SELECT es.*, s.name as "subjectName"
       FROM "exam_sections" es
       LEFT JOIN "subjects" s ON es."subjectId" = s.id
       WHERE es."examId" = $1
       ORDER BY es."sequenceOrder" ASC, es."createdAt" ASC`,
      [examId]
    );

    const sectionsWithQuestions = [];
    const allQuestions = [];
    const topicStats: Record<string, { topicId: string; topicTitle: string; count: number }> = {};
    const difficultyStats: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
    const typeStats: Record<string, number> = {};

    for (const sec of sectionsRes.rows as any[]) {
      const questionsRes = await pgDb.query(
        `SELECT eq."id" as "examQuestionId", eq."sequenceOrder", eq."marksCorrect", eq."marksWrong",
                q."id" as "questionId", q."type", q."content", q."data", q."difficulty", q."marks", q."status",
                q."syllabusNodeId", sn.title as "topicTitle", s.name as "subjectName"
         FROM "exam_questions" eq
         JOIN "questions" q ON eq."questionId" = q."id"
         LEFT JOIN "syllabus_nodes" sn ON q."syllabusNodeId" = sn.id
         LEFT JOIN "subjects" s ON q."subjectId" = s.id
         WHERE eq."examSectionId" = $1
         ORDER BY eq."sequenceOrder" ASC, eq."createdAt" ASC`,
        [sec.id]
      );

      const qs = questionsRes.rows.map((q: any) => {
        allQuestions.push(q);

        // Aggregate topic stats
        if (q.syllabusNodeId) {
          if (!topicStats[q.syllabusNodeId]) {
            topicStats[q.syllabusNodeId] = {
              topicId: q.syllabusNodeId,
              topicTitle: q.topicTitle || 'Unknown Topic',
              count: 0,
            };
          }
          topicStats[q.syllabusNodeId].count++;
        }

        // Aggregate difficulty stats
        if (q.difficulty) {
          difficultyStats[q.difficulty] = (difficultyStats[q.difficulty] || 0) + 1;
        }

        // Aggregate type stats
        if (q.type) {
          typeStats[q.type] = (typeStats[q.type] || 0) + 1;
        }

        return {
          id: q.examQuestionId,
          questionId: q.questionId,
          sequenceOrder: q.sequenceOrder,
          marksCorrect: q.marksCorrect,
          marksWrong: q.marksWrong,
          type: q.type,
          content: q.content,
          difficulty: q.difficulty,
          marks: q.marks,
          status: q.status,
          topicId: q.syllabusNodeId,
          topicTitle: q.topicTitle,
          subjectName: q.subjectName,
          options: q.data?.options || [],
        };
      });

      sectionsWithQuestions.push({
        id: sec.id,
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
        questions: qs,
      });
    }

    return {
      exam,
      sections: sectionsWithQuestions,
      stats: {
        totalQuestions: allQuestions.length,
        totalMarks: exam.totalMarks,
        topics: Object.values(topicStats),
        difficulties: difficultyStats,
        types: typeStats,
      },
    };
  }

  /**
   * Feature 5.2: Swap a specific question with a compatible alternative
   */
  static async swapQuestion(examId: string, oldQuestionId: string, dto: SwapExamQuestionDTO, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    }
    const exam = examRes.rows[0] as any;
    if (exam.status !== 'DRAFT') {
      throw new AppError(400, 'INVALID_EXAM_STATUS', 'Only DRAFT exams can have questions swapped');
    }

    const eqRes = await pgDb.query(
      `SELECT * FROM "exam_questions" WHERE "examId" = $1 AND "questionId" = $2`,
      [examId, oldQuestionId]
    );
    if (eqRes.rows.length === 0) {
      throw new AppError(404, 'QUESTION_NOT_IN_EXAM', 'Question does not exist in this exam');
    }
    const existingEq = eqRes.rows[0] as any;

    // Check duplicate in current exam
    const dupCheck = await pgDb.query(
      `SELECT * FROM "exam_questions" WHERE "examId" = $1 AND "questionId" = $2`,
      [examId, dto.newQuestionId]
    );
    if (dupCheck.rows.length > 0) {
      throw new AppError(409, 'DUPLICATE_QUESTION', 'Replacement question is already present in this exam');
    }

    // Verify replacement question exists in Question Bank
    const newQRes = await pgDb.query(
      `SELECT * FROM "questions" WHERE "id" = $1`,
      [dto.newQuestionId]
    );
    if (newQRes.rows.length === 0 || (newQRes.rows[0] as any).status !== 'PUBLISHED') {
      throw new AppError(400, 'INVALID_QUESTION', 'Replacement question must be an active, PUBLISHED question');
    }
    const newQ = newQRes.rows[0] as any;

    // Update the question link
    await pgDb.query(
      `UPDATE "exam_questions" SET "questionId" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
      [newQ.id, existingEq.id]
    );

    // Audit log
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "audit_logs" ("id", "userId", "action", "resource", "resourceId", "details")
       VALUES ($1, $2, 'exam.question_swapped', 'exams', $3, $4)`,
      [
        auditId,
        actorUserId,
        examId,
        JSON.stringify({ oldQuestionId, newQuestionId: newQ.id, sectionId: existingEq.examSectionId }),
      ]
    );

    return this.getDraftExamDetails(examId);
  }

  /**
   * Feature 5.2: Regenerate an entire individual section according to pattern rules
   */
  static async regenerateSection(examId: string, sectionId: string, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    const exam = examRes.rows[0] as any;
    if (exam.status !== 'DRAFT') {
      throw new AppError(400, 'INVALID_EXAM_STATUS', 'Only DRAFT exams can be regenerated');
    }

    const secRes = await pgDb.query(
      `SELECT * FROM "exam_sections" WHERE "id" = $1 AND "examId" = $2`,
      [sectionId, examId]
    );
    if (secRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam section not found');
    const sec = secRes.rows[0] as any;

    // Collect questions used in OTHER sections to prevent cross-section duplicates
    const otherQsRes = await pgDb.query(
      `SELECT "questionId" FROM "exam_questions" WHERE "examId" = $1 AND "examSectionId" != $2`,
      [examId, sectionId]
    );
    const excludeIds = new Set<string>((otherQsRes.rows as any[]).map((r: any) => r.questionId));

    // Query eligible questions for this section
    const numQuestionsNeeded = sec.numQuestions || 10;
    let query = `SELECT * FROM "questions" WHERE "status" = 'PUBLISHED'`;
    const params: any[] = [];
    if (sec.subjectId) {
      query += ` AND ("subjectId" = $1 OR "subjectId" IS NULL)`;
      params.push(sec.subjectId);
    }
    query += ` ORDER BY RANDOM()`;

    const candidatesRes = await pgDb.query(query, params);
    const eligible = (candidatesRes.rows as any[]).filter((q: any) => !excludeIds.has(q.id));

    if (eligible.length < numQuestionsNeeded) {
      throw new AppError(
        422,
        'INSUFFICIENT_QUESTIONS',
        `Insufficient questions to regenerate section "${sec.name}". Required: ${numQuestionsNeeded}, Available: ${eligible.length}`
      );
    }

    const chosen = eligible.slice(0, numQuestionsNeeded);

    // Delete old exam_questions for this section
    await pgDb.query(`DELETE FROM "exam_questions" WHERE "examSectionId" = $1`, [sectionId]);

    // Insert new questions
    let qOrder = 1;
    for (const q of chosen) {
      const eqId = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pgDb.query(
        `INSERT INTO "exam_questions" (
          "id", "examId", "examSectionId", "questionId", "sequenceOrder", "marksCorrect", "marksWrong", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [eqId, examId, sectionId, q.id, qOrder++, sec.marksCorrect || 1.0, sec.marksWrong || 0.0]
      );
    }

    return this.getDraftExamDetails(examId);
  }

  /**
   * Feature 5.2: Reorder questions within a section
   */
  static async reorderQuestions(examId: string, dto: ReorderExamQuestionsDTO, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    if ((examRes.rows[0] as any).status !== 'DRAFT') {
      throw new AppError(400, 'INVALID_EXAM_STATUS', 'Only DRAFT exams can be reordered');
    }

    let order = 1;
    for (const qId of dto.questionIds) {
      await pgDb.query(
        `UPDATE "exam_questions"
         SET "sequenceOrder" = $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "examSectionId" = $2 AND "questionId" = $3`,
        [order++, dto.sectionId, qId]
      );
    }

    return this.getDraftExamDetails(examId);
  }

  /**
   * Feature 5.3: Update exam operational metadata
   */
  static async updateExamMetadata(examId: string, dto: UpdateExamMetadataDTO, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    const existing = examRes.rows[0] as any;

    const name = dto.name !== undefined ? dto.name : existing.name;
    const instructions = dto.instructions !== undefined ? dto.instructions : existing.instructions;
    const durationMinutes = dto.durationMinutes !== undefined ? dto.durationMinutes : existing.durationMinutes;
    const startTime = dto.startTime !== undefined ? (dto.startTime ? new Date(dto.startTime) : null) : existing.startTime;
    const endTime = dto.endTime !== undefined ? (dto.endTime ? new Date(dto.endTime) : null) : existing.endTime;
    const status = dto.status !== undefined ? dto.status : existing.status;

    if (durationMinutes <= 0) {
      throw new AppError(400, 'INVALID_DURATION', 'Duration minutes must be greater than 0');
    }

    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      throw new AppError(400, 'INVALID_SCHEDULE', 'Scheduled end time must be strictly after start time');
    }

    await pgDb.query(
      `UPDATE "exams" SET
        "name" = $1, "instructions" = $2, "durationMinutes" = $3,
        "startTime" = $4, "endTime" = $5, "status" = $6, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $7`,
      [name, instructions, durationMinutes, startTime, endTime, status, examId]
    );

    return this.getDraftExamDetails(examId);
  }

  /**
   * Feature 5.3: Finalize and publish an exam
   */
  static async publishExam(examId: string, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    const exam = examRes.rows[0] as any;

    if (exam.status === 'PUBLISHED') {
      return this.getDraftExamDetails(examId);
    }

    // Validate completeness
    if (!exam.name || exam.name.trim().length < 2) {
      throw new AppError(422, 'INCOMPLETE_EXAM', 'Exam must have a valid name before publishing');
    }
    if (!exam.durationMinutes || exam.durationMinutes <= 0) {
      throw new AppError(422, 'INCOMPLETE_EXAM', 'Exam must have a positive duration before publishing');
    }

    const sectionsRes = await pgDb.query(
      `SELECT es.*, (SELECT COUNT(*) FROM "exam_questions" eq WHERE eq."examSectionId" = es.id) as "qCount"
       FROM "exam_sections" es
       WHERE es."examId" = $1`,
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

    await pgDb.query(
      `UPDATE "exams" SET "status" = 'PUBLISHED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [examId]
    );

    // Create immutable entity_version snapshot
    const details = await this.getDraftExamDetails(examId);
    const vId = `ent_ver_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "entity_versions" ("id", "entityType", "entityId", "version", "data", "changeSummary", "createdBy")
       VALUES ($1, 'EXAM', $2, 1, $3, 'Published Exam Blueprint Snapshot', $4)`,
      [vId, examId, JSON.stringify(details), actorUserId]
    );

    // Record audit log
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pgDb.query(
      `INSERT INTO "audit_logs" ("id", "userId", "action", "resource", "resourceId", "details")
       VALUES ($1, $2, 'exam.published', 'exams', $3, $4)`,
      [auditId, actorUserId, examId, JSON.stringify({ name: exam.name, totalMarks: exam.totalMarks })]
    );

    return details;
  }

  /**
   * Feature 5.4: Create a blank manual exam without a pattern blueprint
   */
  static async createManualExam(dto: CreateManualExamDTO, actorUserId: string) {
    const examId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const durationMinutes = dto.durationMinutes || 60;
    const instructions = dto.instructions || 'Manual exam paper.';

    await pgDb.query(
      `INSERT INTO "exams" (
        "id", "patternId", "courseId", "name", "instructions", "durationMinutes",
        "totalMarks", "startTime", "endTime", "status", "createdById", "createdAt", "updatedAt"
      ) VALUES ($1, NULL, $2, $3, $4, $5, 0.0, $6, $7, 'DRAFT', $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        examId,
        dto.courseId || null,
        dto.name,
        instructions,
        durationMinutes,
        dto.startTime ? new Date(dto.startTime) : null,
        dto.endTime ? new Date(dto.endTime) : null,
        actorUserId,
      ]
    );

    return this.getDraftExamDetails(examId);
  }

  /**
   * Feature 5.4: Add a manual section to an exam
   */
  static async addManualSection(examId: string, dto: CreateExamSectionDTO, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    if ((examRes.rows[0] as any).status !== 'DRAFT') {
      throw new AppError(400, 'INVALID_EXAM_STATUS', 'Only DRAFT exams can have sections added');
    }

    const examSectionId = `exsec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const marksPerQuestion = dto.marksPerQuestion || 1.0;
    const marksCorrect = dto.marksCorrect !== undefined ? dto.marksCorrect : marksPerQuestion;
    const marksWrong = dto.marksWrong !== undefined ? dto.marksWrong : 0.0;
    const marksUnattempted = dto.marksUnattempted !== undefined ? dto.marksUnattempted : 0.0;

    await pgDb.query(
      `INSERT INTO "exam_sections" (
        "id", "examId", "name", "sequenceOrder", "subjectId", "numQuestions",
        "marksPerQuestion", "totalMarks", "marksCorrect", "marksWrong", "marksUnattempted", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, 0, $6, 0.0, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        examSectionId,
        examId,
        dto.name,
        dto.sequenceOrder || 0,
        dto.subjectId || null,
        marksPerQuestion,
        marksCorrect,
        marksWrong,
        marksUnattempted,
      ]
    );

    return this.getDraftExamDetails(examId);
  }

  /**
   * Feature 5.4: Add specific questions directly from Question Bank into a section
   */
  static async addQuestionsToSection(examId: string, dto: AddExamQuestionsDTO, actorUserId: string) {
    const examRes = await pgDb.query(`SELECT * FROM "exams" WHERE "id" = $1`, [examId]);
    if (examRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam not found');
    if ((examRes.rows[0] as any).status !== 'DRAFT') {
      throw new AppError(400, 'INVALID_EXAM_STATUS', 'Only DRAFT exams can have questions added');
    }

    const secRes = await pgDb.query(
      `SELECT * FROM "exam_sections" WHERE "id" = $1 AND "examId" = $2`,
      [dto.sectionId, examId]
    );
    if (secRes.rows.length === 0) throw new AppError(404, 'NOT_FOUND', 'Exam section not found');
    const sec = secRes.rows[0] as any;

    // Check duplicate questions across the exam
    for (const qId of dto.questionIds) {
      const dupCheck = await pgDb.query(
        `SELECT * FROM "exam_questions" WHERE "examId" = $1 AND "questionId" = $2`,
        [examId, qId]
      );
      if (dupCheck.rows.length > 0) {
        throw new AppError(409, 'DUPLICATE_QUESTION', `Question ID "${qId}" is already present in this exam`);
      }
    }

    // Get current max order
    const maxOrderRes = await pgDb.query(
      `SELECT COALESCE(MAX("sequenceOrder"), 0) as "maxOrder" FROM "exam_questions" WHERE "examSectionId" = $1`,
      [dto.sectionId]
    );
    let currOrder = parseInt((maxOrderRes.rows[0] as any).maxOrder, 10) + 1;

    for (const qId of dto.questionIds) {
      const eqId = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pgDb.query(
        `INSERT INTO "exam_questions" (
          "id", "examId", "examSectionId", "questionId", "sequenceOrder", "marksCorrect", "marksWrong", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [eqId, examId, dto.sectionId, qId, currOrder++, sec.marksCorrect || 1.0, sec.marksWrong || 0.0]
      );
    }

    // Recalculate section totalMarks and numQuestions
    const countRes = await pgDb.query(
      `SELECT COUNT(*) as "qCount", SUM("marksCorrect") as "sumMarks" FROM "exam_questions" WHERE "examSectionId" = $1`,
      [dto.sectionId]
    );
    const newCount = parseInt((countRes.rows[0] as any).qCount, 10);
    const newSecMarks = parseFloat((countRes.rows[0] as any).sumMarks || '0');

    await pgDb.query(
      `UPDATE "exam_sections" SET "numQuestions" = $1, "totalMarks" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $3`,
      [newCount, newSecMarks, dto.sectionId]
    );

    // Recalculate exam totalMarks
    const examTotalRes = await pgDb.query(
      `SELECT SUM("totalMarks") as "examMarks" FROM "exam_sections" WHERE "examId" = $1`,
      [examId]
    );
    const newExamMarks = parseFloat((examTotalRes.rows[0] as any).examMarks || '0');

    await pgDb.query(
      `UPDATE "exams" SET "totalMarks" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
      [newExamMarks, examId]
    );

    return this.getDraftExamDetails(examId);
  }

  /**
   * List all exams with filtering and pagination
   */
  static async listExams(filters: { status?: string; courseId?: string; allowedCourseIds?: string[]; page?: number; limit?: number }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = `WHERE 1=1`;
    const params: any[] = [];
    let paramIdx = 1;

    if (filters.status) {
      whereClause += ` AND e."status" = $${paramIdx++}`;
      params.push(filters.status);
    }
    if (filters.courseId) {
      whereClause += ` AND e."courseId" = $${paramIdx++}`;
      params.push(filters.courseId);
    }
    if (filters.allowedCourseIds && filters.allowedCourseIds.length > 0) {
      whereClause += ` AND e."courseId" = ANY($${paramIdx++})`;
      params.push(filters.allowedCourseIds);
    }

    const countRes = await pgDb.query(
      `SELECT COUNT(*) as total FROM "exams" e ${whereClause}`,
      params
    );
    const total = parseInt((countRes.rows[0] as any).total, 10);

    const listRes = await pgDb.query(
      `SELECT e.*, c.name as "courseName", p.name as "patternName",
              (SELECT COUNT(*) FROM "exam_sections" es WHERE es."examId" = e.id) as "sectionCount",
              (SELECT COUNT(*) FROM "exam_questions" eq WHERE eq."examId" = e.id) as "questionCount"
       FROM "exams" e
       LEFT JOIN "courses" c ON e."courseId" = c.id
       LEFT JOIN "exam_patterns" p ON e."patternId" = p.id
       ${whereClause}
       ORDER BY e."createdAt" DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    return {
      items: listRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
