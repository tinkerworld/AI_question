import { pgDb } from '@repo/database';
import { VocabularyWordDTO, StudentVocabularyProgressDTO } from '@repo/types';
import crypto from 'crypto';

export class VocabularyService {
  /**
   * List vocabulary words with filtering and pagination.
   */
  static async listWords(params: {
    courseId?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ words: VocabularyWordDTO[]; total: number }> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 20)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.courseId) {
      conditions.push(`"courseId" = $${idx++}`);
      values.push(params.courseId);
    }
    if (params.difficulty) {
      conditions.push(`"difficulty" = $${idx++}`);
      values.push(params.difficulty);
    }
    if (params.search) {
      conditions.push(`("word" ILIKE $${idx} OR "definition" ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pgDb.query(
      `SELECT COUNT(*)::int as count FROM "vocabulary_words" ${whereClause}`,
      values
    );
    const total = (countRes.rows[0] as any)?.count || 0;

    const listRes = await pgDb.query(
      `SELECT * FROM "vocabulary_words" ${whereClause} ORDER BY "word" ASC LIMIT ${limit} OFFSET ${offset}`,
      values
    );

    const words = listRes.rows.map((r: any) => ({
      id: r.id,
      word: r.word,
      phonetic: r.phonetic || undefined,
      partOfSpeech: r.partOfSpeech || undefined,
      definition: r.definition,
      exampleSentence: r.exampleSentence || undefined,
      synonyms: Array.isArray(r.synonyms) ? r.synonyms : JSON.parse(r.synonyms || '[]'),
      antonyms: Array.isArray(r.antonyms) ? r.antonyms : JSON.parse(r.antonyms || '[]'),
      difficulty: r.difficulty || 'B2',
      audioUrl: r.audioUrl || undefined,
      courseId: r.courseId || undefined,
      syllabusNodeId: r.syllabusNodeId || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));

    return { words, total };
  }

  /**
   * Create a new vocabulary word entry.
   */
  static async createWord(data: {
    word: string;
    phonetic?: string;
    partOfSpeech?: string;
    definition: string;
    exampleSentence?: string;
    synonyms?: string[];
    antonyms?: string[];
    difficulty?: string;
    courseId?: string;
    syllabusNodeId?: string;
  }): Promise<VocabularyWordDTO> {
    const id = `vocab_${crypto.randomBytes(6).toString('hex')}`;
    const res = await pgDb.query(
      `INSERT INTO "vocabulary_words" ("id", "word", "phonetic", "partOfSpeech", "definition", "exampleSentence", "synonyms", "antonyms", "difficulty", "courseId", "syllabusNodeId")
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)
       RETURNING *`,
      [
        id,
        data.word.trim(),
        data.phonetic || null,
        data.partOfSpeech || null,
        data.definition.trim(),
        data.exampleSentence || null,
        JSON.stringify(data.synonyms || []),
        JSON.stringify(data.antonyms || []),
        data.difficulty || 'B2',
        data.courseId || null,
        data.syllabusNodeId || null,
      ]
    );

    const r: any = res.rows[0];
    return {
      id: r.id,
      word: r.word,
      phonetic: r.phonetic || undefined,
      partOfSpeech: r.partOfSpeech || undefined,
      definition: r.definition,
      exampleSentence: r.exampleSentence || undefined,
      synonyms: Array.isArray(r.synonyms) ? r.synonyms : JSON.parse(r.synonyms || '[]'),
      antonyms: Array.isArray(r.antonyms) ? r.antonyms : JSON.parse(r.antonyms || '[]'),
      difficulty: r.difficulty,
      courseId: r.courseId || undefined,
      syllabusNodeId: r.syllabusNodeId || undefined,
      createdAt: new Date(r.createdAt).toISOString(),
    };
  }

  /**
   * Fetch words due for review for the student.
   * If student has fewer due words than limit, supplements with unpracticed words.
   */
  static async getPracticeDeck(
    userId: string,
    courseId?: string,
    limit: number = 10
  ): Promise<any[]> {
    // 1. Fetch due words (where nextReviewDue <= NOW())
    const dueRes = await pgDb.query(
      `SELECT p.*, w."word", w."phonetic", w."partOfSpeech", w."definition", w."exampleSentence", w."synonyms", w."antonyms", w."difficulty", w."audioUrl"
       FROM "student_vocabulary_progress" p
       JOIN "vocabulary_words" w ON p."wordId" = w."id"
       WHERE p."userId" = $1 AND p."nextReviewDue" <= CURRENT_TIMESTAMP
       ORDER BY p."nextReviewDue" ASC
       LIMIT $2`,
      [userId, limit]
    );

    const deck: any[] = dueRes.rows.map((r: any) => ({
      progressId: r.id,
      wordId: r.wordId,
      word: r.word,
      phonetic: r.phonetic,
      partOfSpeech: r.partOfSpeech,
      definition: r.definition,
      exampleSentence: r.exampleSentence,
      synonyms: Array.isArray(r.synonyms) ? r.synonyms : JSON.parse(r.synonyms || '[]'),
      antonyms: Array.isArray(r.antonyms) ? r.antonyms : JSON.parse(r.antonyms || '[]'),
      difficulty: r.difficulty,
      audioUrl: r.audioUrl,
      masteryLevel: r.masteryLevel,
      repetitionCount: r.repetitionCount,
      intervalDays: r.intervalDays,
      isNew: false,
    }));

    // 2. If deck is smaller than limit, supplement with fresh unpracticed words
    if (deck.length < limit) {
      const needed = limit - deck.length;
      const unpracticedRes = await pgDb.query(
        `SELECT w.* FROM "vocabulary_words" w
         WHERE w."id" NOT IN (SELECT "wordId" FROM "student_vocabulary_progress" WHERE "userId" = $1)
         ORDER BY w."createdAt" ASC
         LIMIT $2`,
        [userId, needed]
      );

      for (const w of (unpracticedRes.rows as any[])) {
        deck.push({
          wordId: w.id,
          word: w.word,
          phonetic: w.phonetic,
          partOfSpeech: w.partOfSpeech,
          definition: w.definition,
          exampleSentence: w.exampleSentence,
          synonyms: Array.isArray(w.synonyms) ? w.synonyms : JSON.parse(w.synonyms || '[]'),
          antonyms: Array.isArray(w.antonyms) ? w.antonyms : JSON.parse(w.antonyms || '[]'),
          difficulty: w.difficulty,
          audioUrl: w.audioUrl,
          masteryLevel: 'LEARNING',
          repetitionCount: 0,
          intervalDays: 0,
          isNew: true,
        });
      }
    }

    return deck;
  }

  /**
   * Submit drill result and advance SM-2 spaced repetition schedule.
   */
  static async submitDrillResult(
    userId: string,
    wordId: string,
    isCorrect: boolean,
    qualityRating: number = 4
  ): Promise<StudentVocabularyProgressDTO> {
    // Quality q in [0, 5]
    let q = isCorrect ? Math.max(3, Math.min(5, qualityRating)) : 1;

    // Fetch existing progress
    const existingRes = await pgDb.query(
      `SELECT * FROM "student_vocabulary_progress" WHERE "userId" = $1 AND "wordId" = $2`,
      [userId, wordId]
    );

    let repetitionCount = 0;
    let easinessFactor = 2.5;
    let intervalDays = 0;
    let masteryLevel: 'LEARNING' | 'WEAK' | 'FAMILIAR' | 'MASTERED' = 'LEARNING';

    if (existingRes.rows.length > 0) {
      const row: any = existingRes.rows[0];
      repetitionCount = row.repetitionCount;
      easinessFactor = row.easinessFactor || 2.5;
      intervalDays = row.intervalDays || 0;
    }

    if (q < 3) {
      // Failed recall: reset repetitions, review tomorrow
      repetitionCount = 0;
      intervalDays = 1;
      masteryLevel = 'WEAK';
    } else {
      // Successful recall: advance interval
      if (repetitionCount === 0) {
        intervalDays = 1;
      } else if (repetitionCount === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easinessFactor);
      }
      repetitionCount += 1;

      // Update mastery status
      if (repetitionCount >= 4) {
        masteryLevel = 'MASTERED';
      } else if (repetitionCount >= 2) {
        masteryLevel = 'FAMILIAR';
      } else {
        masteryLevel = 'LEARNING';
      }
    }

    // Update Easiness Factor (SM-2 equation)
    easinessFactor = Math.max(
      1.3,
      easinessFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    );

    const nextReviewDue = new Date(Date.now() + intervalDays * 24 * 3600 * 1000);
    const id = `prog_${crypto.randomBytes(6).toString('hex')}`;

    const upsertRes = await pgDb.query(
      `INSERT INTO "student_vocabulary_progress"
       ("id", "userId", "wordId", "masteryLevel", "repetitionCount", "easinessFactor", "intervalDays", "nextReviewDue", "lastPracticedAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT ("userId", "wordId") DO UPDATE SET
         "masteryLevel" = EXCLUDED."masteryLevel",
         "repetitionCount" = EXCLUDED."repetitionCount",
         "easinessFactor" = EXCLUDED."easinessFactor",
         "intervalDays" = EXCLUDED."intervalDays",
         "nextReviewDue" = EXCLUDED."nextReviewDue",
         "lastPracticedAt" = CURRENT_TIMESTAMP,
         "updatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, userId, wordId, masteryLevel, repetitionCount, easinessFactor, intervalDays, nextReviewDue]
    );

    const r: any = upsertRes.rows[0];
    return {
      id: r.id,
      userId: r.userId,
      wordId: r.wordId,
      masteryLevel: r.masteryLevel,
      repetitionCount: r.repetitionCount,
      easinessFactor: r.easinessFactor,
      intervalDays: r.intervalDays,
      nextReviewDue: new Date(r.nextReviewDue).toISOString(),
      lastPracticedAt: r.lastPracticedAt ? new Date(r.lastPracticedAt).toISOString() : undefined,
    };
  }

  /**
   * Get student mastery overview statistics.
   */
  static async getStudentStats(userId: string): Promise<{
    totalPracticed: number;
    learning: number;
    weak: number;
    familiar: number;
    mastered: number;
    dueForReview: number;
  }> {
    const res = await pgDb.query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE "masteryLevel" = 'LEARNING')::int as learning,
         COUNT(*) FILTER (WHERE "masteryLevel" = 'WEAK')::int as weak,
         COUNT(*) FILTER (WHERE "masteryLevel" = 'FAMILIAR')::int as familiar,
         COUNT(*) FILTER (WHERE "masteryLevel" = 'MASTERED')::int as mastered,
         COUNT(*) FILTER (WHERE "nextReviewDue" <= CURRENT_TIMESTAMP)::int as due
       FROM "student_vocabulary_progress"
       WHERE "userId" = $1`,
      [userId]
    );

    const r: any = res.rows[0] || {};
    return {
      totalPracticed: r.total || 0,
      learning: r.learning || 0,
      weak: r.weak || 0,
      familiar: r.familiar || 0,
      mastered: r.mastered || 0,
      dueForReview: r.due || 0,
    };
  }
}
