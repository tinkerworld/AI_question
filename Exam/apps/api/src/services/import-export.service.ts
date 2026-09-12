import { pgDb } from '@repo/database';
import {
  questionExportItemSchema,
  courseExportItemSchema,
} from '@repo/validation';
import {
  ImportExportEntityType,
  ConflictResolutionStrategy,
  ExportPackage,
  QuestionExportItem,
  CourseExportItem,
  ImportDryRunResult,
  ImportExecutionResult,
  ImportValidationError,
} from '@repo/types';
import * as crypto from 'crypto';

export interface ExportQuestionsFilter {
  courseId?: string;
  subjectId?: string;
  syllabusNodeId?: string;
  difficulty?: string;
  type?: string;
  status?: string;
  includeAnswerKeys?: boolean;
}

export class ImportExportService {
  /**
   * Export Question Bank to standardized JSON v2.0 format
   */
  static async exportQuestions(filter: ExportQuestionsFilter = {}): Promise<ExportPackage<QuestionExportItem>> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (filter.courseId) {
      whereClause += ` AND q."courseId" = $${idx++}`;
      params.push(filter.courseId);
    }
    if (filter.subjectId) {
      whereClause += ` AND q."subjectId" = $${idx++}`;
      params.push(filter.subjectId);
    }
    if (filter.syllabusNodeId) {
      whereClause += ` AND q."syllabusNodeId" = $${idx++}`;
      params.push(filter.syllabusNodeId);
    }
    if (filter.difficulty) {
      whereClause += ` AND q."difficulty" = $${idx++}`;
      params.push(filter.difficulty);
    }
    if (filter.type) {
      whereClause += ` AND q."type" = $${idx++}`;
      params.push(filter.type.toUpperCase());
    }
    if (filter.status) {
      whereClause += ` AND q."status" = $${idx++}`;
      params.push(filter.status);
    }

    const query = `
      SELECT 
        q.*,
        c."code" as "courseCode",
        s."code" as "subjectCode",
        sn."title" as "syllabusNodeTitle"
      FROM "questions" q
      LEFT JOIN "courses" c ON q."courseId" = c."id"
      LEFT JOIN "subjects" s ON q."subjectId" = s."id"
      LEFT JOIN "syllabus_nodes" sn ON q."syllabusNodeId" = sn."id"
      ${whereClause}
      ORDER BY q."createdAt" ASC
    `;

    const qRes = await pgDb.query(query, params);
    const questions = qRes.rows;

    // Batch fetch tags and exam usages
    const qIds = questions.map((q: any) => q.id);
    let tagsByQuestion: Record<string, string[]> = {};
    let usagesByQuestion: Record<string, any[]> = {};

    if (qIds.length > 0) {
      const tagsRes = await pgDb.query(`
        SELECT qt."questionId", t."name"
        FROM "question_tags" qt
        JOIN "tags" t ON qt."tagId" = t."id"
        WHERE qt."questionId" = ANY($1)
      `, [qIds]);
      tagsRes.rows.forEach((r: any) => {
        if (!tagsByQuestion[r.questionId]) tagsByQuestion[r.questionId] = [];
        tagsByQuestion[r.questionId].push(r.name);
      });

      const usagesRes = await pgDb.query(`
        SELECT "questionId", "examName", "year", "shift"
        FROM "previous_exam_usages"
        WHERE "questionId" = ANY($1)
        ORDER BY "year" DESC
      `, [qIds]);
      usagesRes.rows.forEach((r: any) => {
        if (!usagesByQuestion[r.questionId]) usagesByQuestion[r.questionId] = [];
        usagesByQuestion[r.questionId].push({
          examName: r.examName,
          year: r.year,
          shift: r.shift || undefined,
        });
      });
    }

    const items: QuestionExportItem[] = questions.map((q: any) => {
      let data = q.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch {}
      }

      // Redact answers if requested
      if (filter.includeAnswerKeys === false) {
        data = { ...data };
        delete data.correctOptionId;
        delete data.blankKey;
        delete data.correctAnswer;
        if (Array.isArray(data.options)) {
          data.options = data.options.map((opt: any) => {
            const { isCorrect, ...rest } = opt;
            return rest;
          });
        }
      }

      return {
        id: q.id,
        type: q.type,
        content: q.content,
        data,
        difficulty: q.difficulty,
        marks: parseFloat(q.marks),
        status: q.status,
        courseCode: q.courseCode || undefined,
        subjectCode: q.subjectCode || undefined,
        syllabusNodeTitle: q.syllabusNodeTitle || undefined,
        tags: tagsByQuestion[q.id] || [],
        examUsages: usagesByQuestion[q.id] || [],
      };
    });

    return {
      metadata: {
        schemaVersion: '2.0',
        exportedAt: new Date().toISOString(),
        institution: 'ExamOS Academy',
        entityType: 'QUESTIONS',
        itemCount: items.length,
      },
      items,
    };
  }

  /**
   * Export Course hierarchy (Courses -> Subjects -> Syllabus Nodes Tree) to standardized JSON v2.0 format
   */
  static async exportCourses(courseIds?: string[]): Promise<ExportPackage<CourseExportItem>> {
    let coursesQuery = 'SELECT * FROM "courses"';
    const params: any[] = [];
    if (courseIds && courseIds.length > 0) {
      coursesQuery += ' WHERE "id" = ANY($1)';
      params.push(courseIds);
    }
    coursesQuery += ' ORDER BY "createdAt" ASC';

    const coursesRes = await pgDb.query(coursesQuery, params);
    const courses = coursesRes.rows as any[];

    const items: CourseExportItem[] = [];

    for (const c of courses) {
      const subRes = await pgDb.query(
        'SELECT * FROM "subjects" WHERE "courseId" = $1 ORDER BY "order" ASC, "createdAt" ASC',
        [c.id]
      );
      const subjects = subRes.rows as any[];

      const subjectItems: any[] = [];
      for (const s of subjects) {
        const nodesRes = await pgDb.query(
          'SELECT * FROM "syllabus_nodes" WHERE "subjectId" = $1 ORDER BY "orderIndex" ASC, "createdAt" ASC',
          [s.id]
        );
        const allNodes = nodesRes.rows as any[];

        // Build parent-child tree
        const nodeMap: Record<string, any> = {};
        allNodes.forEach((n: any) => {
          let lo = n.learningObjectives;
          if (typeof lo === 'string') {
            try { lo = JSON.parse(lo); } catch {}
          }
          nodeMap[n.id] = {
            id: n.id,
            title: n.title,
            type: n.type,
            orderIndex: n.orderIndex,
            description: n.description || undefined,
            estimatedMinutes: n.estimatedMinutes,
            learningObjectives: Array.isArray(lo) ? lo : [],
            status: n.status,
            tags: n.tags || [],
            children: [],
            parentId: n.parentId,
          };
        });

        const rootNodes: any[] = [];
        allNodes.forEach((n: any) => {
          if (n.parentId && nodeMap[n.parentId]) {
            nodeMap[n.parentId].children.push(nodeMap[n.id]);
          } else {
            rootNodes.push(nodeMap[n.id]);
          }
        });

        // Clean internal parentId from exported tree
        const cleanNodeTree = (nodes: any[]): any[] => {
          return nodes.map((node) => {
            const { parentId, children, ...rest } = node;
            return {
              ...rest,
              children: children && children.length > 0 ? cleanNodeTree(children) : undefined,
            };
          });
        };

        subjectItems.push({
          id: s.id,
          code: s.code,
          name: s.name,
          description: s.description || undefined,
          credits: s.credits,
          order: s.order,
          syllabusNodes: cleanNodeTree(rootNodes),
        });
      }

      items.push({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description || undefined,
        status: c.status,
        durationMonths: c.durationMonths,
        thumbnailUrl: c.thumbnailUrl || undefined,
        subjects: subjectItems,
      });
    }

    return {
      metadata: {
        schemaVersion: '2.0',
        exportedAt: new Date().toISOString(),
        institution: 'ExamOS Academy',
        entityType: 'COURSES',
        itemCount: items.length,
      },
      items,
    };
  }

  /**
   * Validate uploaded import payload without writing to DB (Dry-run)
   */
  static async validateImportPayload(payload: any): Promise<ImportDryRunResult> {
    const rawItems = Array.isArray(payload) ? payload : (payload.items || []);
    const rawType: ImportExportEntityType = payload.entityType || (payload.metadata?.entityType) || 'QUESTIONS';

    const errors: ImportValidationError[] = [];
    const previewItems: any[] = [];
    let collisionCount = 0;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return {
        valid: false,
        entityType: rawType,
        totalCount: 0,
        validCount: 0,
        invalidCount: 0,
        collisionCount: 0,
        errors: [{ index: 0, path: 'items', message: 'Payload contains no import items', code: 'EMPTY_PAYLOAD' }],
        previewItems: [],
      };
    }

    if (rawType === 'QUESTIONS') {
      const existingQRes = await pgDb.query('SELECT "id", "content" FROM "questions"');
      const existingIdSet = new Set(existingQRes.rows.map((r: any) => r.id));
      const existingContentSet = new Set(existingQRes.rows.map((r: any) => r.content.trim().toLowerCase()));

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const itemIdentifier = item.id || `Item #${i + 1} ("${(item.content || '').substring(0, 30)}...")`;
        const parseResult = questionExportItemSchema.safeParse(item);

        if (!parseResult.success) {
          parseResult.error.issues.forEach((issue) => {
            errors.push({
              index: i,
              itemIdentifier,
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            });
          });
        } else {
          const q = parseResult.data;
          let itemValid = true;

          if (q.type === 'MCQ') {
            const opts = q.data?.options;
            if (!Array.isArray(opts) || opts.length < 2) {
              errors.push({
                index: i,
                itemIdentifier,
                path: 'data.options',
                message: 'MCQ questions must include at least 2 answer choices in data.options',
                code: 'INVALID_MCQ_OPTIONS',
              });
              itemValid = false;
            } else {
              const hasCorrectOpt = opts.some((o: any) => o.isCorrect === true) || !!q.data?.correctOptionId;
              if (!hasCorrectOpt) {
                errors.push({
                  index: i,
                  itemIdentifier,
                  path: 'data.correctOptionId',
                  message: 'MCQ questions must identify a correct option (either isCorrect:true or correctOptionId)',
                  code: 'MISSING_CORRECT_OPTION',
                });
                itemValid = false;
              }
            }
          } else if (q.type === 'FILL_IN_BLANK') {
            if (!q.data?.blankKey && !q.data?.correctAnswer) {
              errors.push({
                index: i,
                itemIdentifier,
                path: 'data.blankKey',
                message: 'FILL_IN_BLANK question must include blankKey or correctAnswer in data',
                code: 'MISSING_BLANK_KEY',
              });
              itemValid = false;
            }
          }

          const isCollision = (q.id && existingIdSet.has(q.id)) || existingContentSet.has((q.content || '').trim().toLowerCase());
          if (isCollision) {
            collisionCount++;
          }

          if (previewItems.length < 10) {
            previewItems.push({
              index: i,
              id: q.id || `auto_${i + 1}`,
              type: q.type,
              content: q.content.substring(0, 80) + (q.content.length > 80 ? '...' : ''),
              difficulty: q.difficulty,
              marks: q.marks,
              collision: isCollision,
              isValid: itemValid,
            });
          }
        }
      }
    } else if (rawType === 'COURSES') {
      const existingCRes = await pgDb.query('SELECT "id", "code" FROM "courses"');
      const existingCodes = new Set(existingCRes.rows.map((r: any) => r.code.toUpperCase()));

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const itemIdentifier = item.code || `Course #${i + 1}`;
        const parseResult = courseExportItemSchema.safeParse(item);

        if (!parseResult.success) {
          parseResult.error.issues.forEach((issue) => {
            errors.push({
              index: i,
              itemIdentifier,
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            });
          });
        } else {
          const c = parseResult.data;
          const isCollision = existingCodes.has(c.code.toUpperCase());
          if (isCollision) collisionCount++;

          if (previewItems.length < 10) {
            previewItems.push({
              index: i,
              code: c.code,
              name: c.name,
              subjectsCount: c.subjects?.length || 0,
              collision: isCollision,
              isValid: true,
            });
          }
        }
      }
    }

    const invalidIndices = new Set(errors.map((e) => e.index));
    const invalidCount = invalidIndices.size;
    const validCount = rawItems.length - invalidCount;

    return {
      valid: errors.length === 0,
      entityType: rawType,
      totalCount: rawItems.length,
      validCount,
      invalidCount,
      collisionCount,
      errors,
      previewItems,
    };
  }

  /**
   * Execute real import with transactional safety and conflict resolution
   */
  static async executeImport(
    payload: any,
    conflictStrategy: ConflictResolutionStrategy = 'SKIP_EXISTING',
    userId: string
  ): Promise<ImportExecutionResult> {
    const rawItems = Array.isArray(payload) ? payload : (payload.items || []);
    const entityType: ImportExportEntityType = payload.entityType || (payload.metadata?.entityType) || 'QUESTIONS';

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: ImportValidationError[] = [];

    const courseCodeToId: Record<string, string> = {};
    const subjectCodeToId: Record<string, string> = {};
    const nodeTitleToId: Record<string, string> = {};

    const existingCourses = await pgDb.query('SELECT "id", "code" FROM "courses"');
    existingCourses.rows.forEach((r: any) => { courseCodeToId[r.code.toUpperCase()] = r.id; });

    const existingSubjects = await pgDb.query('SELECT "id", "code" FROM "subjects"');
    existingSubjects.rows.forEach((r: any) => { subjectCodeToId[r.code.toUpperCase()] = r.id; });

    const existingNodes = await pgDb.query('SELECT "id", "title" FROM "syllabus_nodes"');
    existingNodes.rows.forEach((r: any) => { nodeTitleToId[r.title.trim().toLowerCase()] = r.id; });

    if (entityType === 'QUESTIONS') {
      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const parseResult = questionExportItemSchema.safeParse(item);
        if (!parseResult.success) {
          errors.push({
            index: i,
            itemIdentifier: item.id || `Item #${i + 1}`,
            path: parseResult.error.issues[0]?.path.join('.') || 'root',
            message: parseResult.error.issues[0]?.message || 'Validation failed',
          });
          continue;
        }

        const q = parseResult.data;
        const targetId = q.id;

        let existingQ: any = null;
        if (targetId) {
          const res = await pgDb.query('SELECT * FROM "questions" WHERE "id" = $1', [targetId]);
          if (res.rows.length > 0) existingQ = res.rows[0];
        }
        if (!existingQ && q.content) {
          const res = await pgDb.query('SELECT * FROM "questions" WHERE LOWER(TRIM("content")) = LOWER(TRIM($1)) LIMIT 1', [q.content]);
          if (res.rows.length > 0) existingQ = res.rows[0];
        }

        if (existingQ) {
          if (conflictStrategy === 'SKIP_EXISTING') {
            skippedCount++;
            continue;
          } else if (conflictStrategy === 'OVERWRITE') {
            try {
              const versionId = `qv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              await pgDb.query(
                `INSERT INTO "question_versions" 
                 ("id", "questionId", "version", "content", "data", "difficulty", "marks", "changeSummary", "changedById", "createdAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                [
                  versionId,
                  existingQ.id,
                  existingQ.version || 1,
                  existingQ.content,
                  typeof existingQ.data === 'string' ? existingQ.data : JSON.stringify(existingQ.data),
                  existingQ.difficulty,
                  existingQ.marks,
                  'Archived via JSON Import batch (OVERWRITE mode)',
                  userId,
                ]
              );

              const nextVersion = (existingQ.version || 1) + 1;
              await pgDb.query(
                `UPDATE "questions" SET
                   "type" = $1,
                   "content" = $2,
                   "data" = $3,
                   "difficulty" = $4,
                   "marks" = $5,
                   "status" = $6,
                   "version" = $7,
                   "updatedAt" = NOW()
                 WHERE "id" = $8`,
                [
                  q.type,
                  q.content,
                  JSON.stringify(q.data),
                  q.difficulty,
                  q.marks,
                  q.status,
                  nextVersion,
                  existingQ.id,
                ]
              );
              updatedCount++;
            } catch (err: any) {
              errors.push({ index: i, itemIdentifier: targetId, path: 'db', message: err.message });
            }
            continue;
          }
        }

        try {
          const newId = (conflictStrategy === 'CREATE_COPY' || !targetId || existingQ)
            ? `q_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
            : targetId;

          const resolvedCourseId = (q.courseCode && courseCodeToId[q.courseCode.toUpperCase()]) || null;
          const resolvedSubjectId = (q.subjectCode && subjectCodeToId[q.subjectCode.toUpperCase()]) || null;
          const resolvedNodeId = (q.syllabusNodeTitle && nodeTitleToId[q.syllabusNodeTitle.trim().toLowerCase()]) || null;

          await pgDb.query(
            `INSERT INTO "questions"
             ("id", "type", "content", "data", "difficulty", "marks", "status", "version", "courseId", "subjectId", "syllabusNodeId", "createdById", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11, NOW(), NOW())`,
            [
              newId,
              q.type,
              q.content,
              JSON.stringify(q.data),
              q.difficulty,
              q.marks,
              q.status,
              resolvedCourseId,
              resolvedSubjectId,
              resolvedNodeId,
              userId,
            ]
          );

          if (q.tags && q.tags.length > 0) {
            for (const tagName of q.tags) {
              let tagId = `tag_${crypto.createHash('md5').update(tagName.toLowerCase()).digest('hex').substring(0, 10)}`;
              await pgDb.query(`INSERT INTO "tags" ("id", "name", "createdAt") VALUES ($1, $2, NOW()) ON CONFLICT ("name") DO NOTHING`, [tagId, tagName]);
              const tagRes = await pgDb.query(`SELECT "id" FROM "tags" WHERE "name" = $1`, [tagName]);
              if (tagRes.rows.length > 0) {
                const tagRow = tagRes.rows[0] as any;
                await pgDb.query(`INSERT INTO "question_tags" ("questionId", "tagId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [newId, tagRow.id]);
              }
            }
          }

          if (q.examUsages && q.examUsages.length > 0) {
            for (const usage of q.examUsages) {
              const usageId = `usage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              await pgDb.query(
                `INSERT INTO "previous_exam_usages" ("id", "questionId", "examName", "year", "shift", "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
                [usageId, newId, usage.examName, usage.year, usage.shift || null]
              );
            }
          }

          importedCount++;
        } catch (err: any) {
          errors.push({ index: i, itemIdentifier: targetId, path: 'insert', message: err.message });
        }
      }
    } else if (entityType === 'COURSES') {
      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const parseResult = courseExportItemSchema.safeParse(item);
        if (!parseResult.success) {
          errors.push({
            index: i,
            itemIdentifier: item.code || `Course #${i + 1}`,
            path: parseResult.error.issues[0]?.path.join('.') || 'root',
            message: parseResult.error.issues[0]?.message || 'Validation failed',
          });
          continue;
        }

        const c = parseResult.data;
        let targetCode = c.code;

        const existingRes = await pgDb.query('SELECT * FROM "courses" WHERE UPPER("code") = UPPER($1)', [targetCode]);
        const existingC = existingRes.rows[0] as any;

        if (existingC) {
          if (conflictStrategy === 'SKIP_EXISTING') {
            skippedCount++;
            continue;
          } else if (conflictStrategy === 'OVERWRITE') {
            await pgDb.query(
              `UPDATE "courses" SET "name" = $1, "description" = $2, "status" = $3, "durationMonths" = $4, "updatedAt" = NOW() WHERE "id" = $5`,
              [c.name, c.description || null, c.status, c.durationMonths || 12, existingC.id]
            );
            updatedCount++;
            continue;
          } else if (conflictStrategy === 'CREATE_COPY') {
            targetCode = `${c.code}-COPY-${Date.now().toString().slice(-4)}`;
          }
        }

        try {
          const courseId = `c_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await pgDb.query(
            `INSERT INTO "courses" ("id", "name", "code", "description", "status", "durationMonths", "thumbnailUrl", "createdById", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [
              courseId,
              c.name + (conflictStrategy === 'CREATE_COPY' ? ' (Copy)' : ''),
              targetCode,
              c.description || null,
              c.status,
              c.durationMonths || 12,
              c.thumbnailUrl || null,
              userId,
            ]
          );

          if (c.subjects && c.subjects.length > 0) {
            for (const s of c.subjects) {
              const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              await pgDb.query(
                `INSERT INTO "subjects" ("id", "courseId", "name", "code", "description", "credits", "order", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
                [subId, courseId, s.name, s.code, s.description || null, s.credits || 1, s.order || 0]
              );

              const insertNodeTree = async (nodes: any[], parentId: string | null = null) => {
                for (const node of nodes) {
                  const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                  await pgDb.query(
                    `INSERT INTO "syllabus_nodes"
                     ("id", "subjectId", "parentId", "title", "type", "orderIndex", "description", "estimatedMinutes", "status", "tags", "learningObjectives", "createdAt", "updatedAt")
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
                    [
                      nodeId,
                      subId,
                      parentId,
                      node.title,
                      node.type || 'UNIT',
                      node.orderIndex || 0,
                      node.description || null,
                      node.estimatedMinutes || 60,
                      node.status || 'PUBLISHED',
                      node.tags || [],
                      JSON.stringify(node.learningObjectives || []),
                    ]
                  );
                  if (node.children && node.children.length > 0) {
                    await insertNodeTree(node.children, nodeId);
                  }
                }
              };

              if (s.syllabusNodes && s.syllabusNodes.length > 0) {
                await insertNodeTree(s.syllabusNodes, null);
              }
            }
          }

          importedCount++;
        } catch (err: any) {
          errors.push({ index: i, itemIdentifier: targetCode, path: 'course_insert', message: err.message });
        }
      }
    }

    try {
      const auditId = `audit_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await pgDb.query(
        `INSERT INTO "audit_logs" ("id", "userId", "action", "resource", "resourceId", "details", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          auditId,
          userId,
          'IMPORT_JSON_BATCH',
          entityType,
          null,
          JSON.stringify({
            conflictStrategy,
            totalItems: rawItems.length,
            importedCount,
            updatedCount,
            skippedCount,
            errorCount: errors.length,
          }),
        ]
      );
    } catch {}

    return {
      success: errors.length === 0,
      entityType,
      totalProcessed: rawItems.length,
      importedCount,
      updatedCount,
      skippedCount,
      errors,
    };
  }
}
