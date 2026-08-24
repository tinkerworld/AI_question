import { pgDb } from '@repo/database';
import { AIQuestionService } from './ai-question.service';
import {
  AIJobType,
  AIGenerationJobDTO,
} from '@repo/types';
import crypto from 'crypto';

export class AIQueueService {
  /**
   * Submit an async AI generation job.
   */
  static async submitJob(
    userId: string,
    type: AIJobType,
    params: any
  ): Promise<AIGenerationJobDTO> {
    const db = pgDb;
    const jobId = `job_${crypto.randomBytes(8).toString('hex')}`;
    const totalCount = params.count || 1;

    const row = await db.query(
      `INSERT INTO "ai_generation_jobs" (
        "id", "userId", "type", "params", "status", "totalCount", "completedCount", "progress", "resultQuestionIds"
      ) VALUES ($1, $2, $3, $4, 'QUEUED', $5, 0, 0, '[]'::jsonb)
      RETURNING *`,
      [jobId, userId, type, JSON.stringify(params), totalCount]
    );

    // Fire off async processing
    this.processJobAsync(jobId, userId, type, params).catch((err) => {
      console.error(`AI Job ${jobId} failed:`, err);
    });

    const job = row.rows[0] as any;
    return {
      id: job.id,
      userId: job.userId,
      type: job.type,
      params: typeof job.params === 'string' ? JSON.parse(job.params) : job.params,
      status: job.status,
      totalCount: job.totalCount,
      completedCount: job.completedCount,
      progress: job.progress,
      resultQuestionIds: typeof job.resultQuestionIds === 'string' ? JSON.parse(job.resultQuestionIds) : job.resultQuestionIds || [],
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  /**
   * Worker queue processing with progress reporting.
   */
  private static async processJobAsync(
    jobId: string,
    userId: string,
    type: AIJobType,
    params: any
  ): Promise<void> {
    const db = pgDb;

    // Mark as PROCESSING
    await db.query(
      `UPDATE "ai_generation_jobs" SET "status" = 'PROCESSING', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
      [jobId]
    );

    try {
      if (type === 'MODIFY_VARIATION') {
        const result = await AIQuestionService.modifyQuestion(userId, params);
        await db.query(
          `UPDATE "ai_generation_jobs" 
           SET "status" = 'COMPLETED', "completedCount" = 1, "progress" = 100, 
               "resultQuestionIds" = $1, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $2`,
          [JSON.stringify([result.id]), jobId]
        );
      } else {
        const count = params.count || 1;
        const generatedIds: string[] = [];

        for (let i = 0; i < count; i++) {
          // Check if cancelled
          const statusCheck = await db.query(`SELECT "status" FROM "ai_generation_jobs" WHERE "id" = $1`, [jobId]);
          if (statusCheck.rows[0]?.status === 'CANCELLED') {
            return;
          }

          const q = await AIQuestionService.generateQuestions(userId, {
            ...params,
            count: 1,
          });

          if (q.length > 0) {
            generatedIds.push(q[0].id);
          }

          const completed = i + 1;
          const progress = Math.round((completed / count) * 100);

          await db.query(
            `UPDATE "ai_generation_jobs" 
             SET "completedCount" = $1, "progress" = $2, "resultQuestionIds" = $3, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "id" = $4`,
            [completed, progress, JSON.stringify(generatedIds), jobId]
          );
        }

        await db.query(
          `UPDATE "ai_generation_jobs" SET "status" = 'COMPLETED', "progress" = 100, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
          [jobId]
        );
      }
    } catch (err: any) {
      await db.query(
        `UPDATE "ai_generation_jobs" 
         SET "status" = 'FAILED', "errorMessage" = $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $2`,
        [err.message || 'Worker processing failed', jobId]
      );
    }
  }

  /**
   * Get job status and progress.
   */
  static async getJobStatus(jobId: string): Promise<AIGenerationJobDTO> {
    const db = pgDb;
    const res = await db.query(`SELECT * FROM "ai_generation_jobs" WHERE "id" = $1`, [jobId]);
    if (res.rows.length === 0) {
      throw new Error('JOB_NOT_FOUND');
    }
    const job = res.rows[0] as any;
    return {
      id: job.id,
      userId: job.userId,
      type: job.type,
      params: typeof job.params === 'string' ? JSON.parse(job.params) : job.params,
      status: job.status,
      totalCount: job.totalCount,
      completedCount: job.completedCount,
      progress: job.progress,
      resultQuestionIds: typeof job.resultQuestionIds === 'string' ? JSON.parse(job.resultQuestionIds) : job.resultQuestionIds || [],
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  /**
   * Cancel a job in progress or queue.
   */
  static async cancelJob(jobId: string, userId: string): Promise<boolean> {
    const db = pgDb;
    const res = await db.query(
      `UPDATE "ai_generation_jobs" SET "status" = 'CANCELLED', "updatedAt" = CURRENT_TIMESTAMP 
       WHERE "id" = $1 AND "userId" = $2 AND "status" IN ('QUEUED', 'PROCESSING')`,
      [jobId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
