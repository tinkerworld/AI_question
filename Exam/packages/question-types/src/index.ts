export type BuiltInQuestionType =
  | 'MCQ'
  | 'MULTIPLE_SELECT'
  | 'TRUE_FALSE'
  | 'FILL_IN_BLANK'
  | 'SHORT_ANSWER'
  | 'NUMERICAL'
  | 'MATCHING'
  | 'SUBJECTIVE'
  | 'INTERVIEW'
  | 'LISTENING'
  | 'WRITING'
  | 'IELTS_WRITING_TASK_1'
  | 'IELTS_WRITING_TASK_2';

export interface InterviewEvidenceQuote {
  turnNumber: number;
  quote: string;
  assessment: string;
}

export interface InterviewRubricCriterion {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
  criteria?: string[];
  feedback?: string;
  evidenceQuotes?: InterviewEvidenceQuote[];
  improvementTip?: string;
}

export interface InterviewKnowledgeDocument {
  title: string;
  content: string;
}

export interface InterviewKnowledgeDataset {
  summary?: string;
  sourceDocuments?: InterviewKnowledgeDocument[];
  groundTruthFacts?: string[];
  facts?: string[];
}

export interface InterviewBehavioralPrompt {
  persona?: string;
  tone?: 'FORMAL' | 'RIGOROUS_PROBING' | 'SUPPORTIVE' | 'CHALLENGING' | string;
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | string;
  focusAreas?: string[];
  avoidList?: string[];
  followUpAggressiveness?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
}

export interface InterviewQuestionData {
  scenario: string;
  rubric: InterviewRubricCriterion[];
  preset?: 'IELTS_SPEAKING' | 'UPSC_PERSONALITY' | 'TECH_SYSTEM_DESIGN' | 'GENERAL_HR' | 'CUSTOM' | string;
  maxTurns?: number;
  expectedDurationMinutes?: number;
  systemInstructions?: string;
  openingQuestion?: string;
  knowledgeDataset?: InterviewKnowledgeDataset;
  behavioralPrompt?: InterviewBehavioralPrompt;
}

export interface EvaluationResult {
  isCorrect: boolean;
  score: number; // Normalized 0.0 to 1.0
  feedback?: string;
}

export interface QuestionTypeHandler<TQuestionData = any, TUserAnswer = any> {
  type: string;
  validate(data: TQuestionData): boolean;
  evaluate(data: TQuestionData, userAnswer: TUserAnswer): EvaluationResult;
  serialize(data: TQuestionData): Record<string, any>;
  deserialize(json: Record<string, any>): TQuestionData;
}

// 1. MCQ Handler
export const MCQHandler: QuestionTypeHandler<{
  options: { id: string; text: string }[];
  correctOptionId: string;
}> = {
  type: 'MCQ',
  validate(data) {
    return (
      Array.isArray(data?.options) &&
      data.options.length >= 2 &&
      typeof data.correctOptionId === 'string'
    );
  },
  evaluate(data, userAnswer) {
    const isCorrect = String(userAnswer) === data.correctOptionId;
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect ? 'Correct option selected' : 'Incorrect option selected',
    };
  },
  serialize(data) {
    return { options: data.options, correctOptionId: data.correctOptionId };
  },
  deserialize(json) {
    return { options: json.options || [], correctOptionId: json.correctOptionId || '' };
  },
};

// 2. Multiple-Select Handler
export const MultipleSelectHandler: QuestionTypeHandler<{
  options: { id: string; text: string }[];
  correctOptionIds: string[];
}> = {
  type: 'MULTIPLE_SELECT',
  validate(data) {
    return (
      Array.isArray(data?.options) &&
      Array.isArray(data?.correctOptionIds) &&
      data.correctOptionIds.length > 0
    );
  },
  evaluate(data, userAnswer) {
    const selected: string[] = Array.isArray(userAnswer) ? userAnswer : [];
    const correctSet = new Set(data.correctOptionIds);
    const selectedSet = new Set(selected);

    let matches = 0;
    selectedSet.forEach((id) => {
      if (correctSet.has(id)) matches++;
    });

    const isExactMatch =
      correctSet.size === selectedSet.size &&
      Array.from(correctSet).every((id) => selectedSet.has(id));

    return {
      isCorrect: isExactMatch,
      score: isExactMatch ? 1 : matches / correctSet.size,
      feedback: isExactMatch ? 'All correct options selected' : 'Partial or incorrect selection',
    };
  },
  serialize(data) {
    return { options: data.options, correctOptionIds: data.correctOptionIds };
  },
  deserialize(json) {
    return { options: json.options || [], correctOptionIds: json.correctOptionIds || [] };
  },
};

// 3. True / False Handler
export const TrueFalseHandler: QuestionTypeHandler<{
  correctValue: boolean;
}> = {
  type: 'TRUE_FALSE',
  validate(data) {
    return typeof data?.correctValue === 'boolean';
  },
  evaluate(data, userAnswer) {
    const isCorrect = Boolean(userAnswer) === data.correctValue;
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect ? 'Correct choice' : 'Incorrect choice',
    };
  },
  serialize(data) {
    return { correctValue: data.correctValue };
  },
  deserialize(json) {
    return { correctValue: Boolean(json.correctValue) };
  },
};

// 4. Fill-in-Blank Handler (Case-insensitive & whitespace trimmed)
export const FillInBlankHandler: QuestionTypeHandler<{
  acceptedAnswers: string[]; // Variations
  caseSensitive?: boolean;
}> = {
  type: 'FILL_IN_BLANK',
  validate(data) {
    return Array.isArray(data?.acceptedAnswers) && data.acceptedAnswers.length > 0;
  },
  evaluate(data, userAnswer) {
    const userStr = String(userAnswer || '').trim();
    const caseSensitive = data.caseSensitive || false;

    const isCorrect = data.acceptedAnswers.some((ans) => {
      const target = ans.trim();
      return caseSensitive
        ? target === userStr
        : target.toLowerCase() === userStr.toLowerCase();
    });

    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect ? 'Correct answer' : 'Answer does not match accepted variations',
    };
  },
  serialize(data) {
    return { acceptedAnswers: data.acceptedAnswers, caseSensitive: data.caseSensitive };
  },
  deserialize(json) {
    return { acceptedAnswers: json.acceptedAnswers || [], caseSensitive: json.caseSensitive };
  },
};

// 5. Short Answer Handler (Keyword matching)
export const ShortAnswerHandler: QuestionTypeHandler<{
  keywords: string[];
  sampleAnswer?: string;
}> = {
  type: 'SHORT_ANSWER',
  validate(data) {
    return Array.isArray(data?.keywords) && data.keywords.length > 0;
  },
  evaluate(data, userAnswer) {
    const userStr = String(userAnswer || '').toLowerCase();
    const matchedCount = data.keywords.filter((kw) =>
      userStr.includes(kw.toLowerCase())
    ).length;

    const isCorrect = matchedCount === data.keywords.length;
    const score = data.keywords.length > 0 ? matchedCount / data.keywords.length : 0;

    return {
      isCorrect,
      score,
      feedback: `Matched ${matchedCount} of ${data.keywords.length} required keywords`,
    };
  },
  serialize(data) {
    return { keywords: data.keywords, sampleAnswer: data.sampleAnswer };
  },
  deserialize(json) {
    return { keywords: json.keywords || [], sampleAnswer: json.sampleAnswer };
  },
};

// 6. Numerical Handler (Tolerance margin)
export const NumericalHandler: QuestionTypeHandler<{
  targetValue: number;
  tolerance: number; // e.g., ± 0.05
}> = {
  type: 'NUMERICAL',
  validate(data) {
    return typeof data?.targetValue === 'number' && typeof data?.tolerance === 'number';
  },
  evaluate(data, userAnswer) {
    const val = parseFloat(userAnswer);
    if (isNaN(val)) {
      return { isCorrect: false, score: 0, feedback: 'Invalid numerical input' };
    }

    const min = data.targetValue - data.tolerance;
    const max = data.targetValue + data.tolerance;
    const isCorrect = val >= min && val <= max;

    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect
        ? 'Within acceptable tolerance range'
        : `Outside acceptable range (${min} to ${max})`,
    };
  },
  serialize(data) {
    return { targetValue: data.targetValue, tolerance: data.tolerance };
  },
  deserialize(json) {
    return { targetValue: Number(json.targetValue), tolerance: Number(json.tolerance || 0) };
  },
};

// 7. Matching Handler (Pair matching)
export const MatchingHandler: QuestionTypeHandler<{
  pairs: { left: string; right: string }[];
}> = {
  type: 'MATCHING',
  validate(data) {
    return Array.isArray(data?.pairs) && data.pairs.length > 0;
  },
  evaluate(data, userAnswer) {
    // userAnswer format: Record<leftItem, rightItem>
    const userMap: Record<string, string> = userAnswer && typeof userAnswer === 'object' ? userAnswer : {};
    let correctCount = 0;

    data.pairs.forEach((p) => {
      if (userMap[p.left] === p.right) correctCount++;
    });

    const isCorrect = correctCount === data.pairs.length;
    const score = data.pairs.length > 0 ? correctCount / data.pairs.length : 0;

    return {
      isCorrect,
      score,
      feedback: `Matched ${correctCount} of ${data.pairs.length} pairs correctly`,
    };
  },
  serialize(data) {
    return { pairs: data.pairs };
  },
  deserialize(json) {
    return { pairs: json.pairs || [] };
  },
};

// 8. Subjective / Long Answer Handler (Manual / Rubric evaluation)
export const SubjectiveHandler: QuestionTypeHandler<{
  rubricCriteria?: string[];
  sampleAnswer?: string;
}> = {
  type: 'SUBJECTIVE',
  validate(data) {
    return true; // Flexible subjective schema
  },
  evaluate(data, userAnswer) {
    const hasResponse = String(userAnswer || '').trim().length > 0;
    return {
      isCorrect: hasResponse,
      score: hasResponse ? 1.0 : 0,
      feedback: hasResponse
        ? 'Submitted for manual evaluation / rubric review'
        : 'Empty response submitted',
    };
  },
  serialize(data) {
    return { rubricCriteria: data.rubricCriteria, sampleAnswer: data.sampleAnswer };
  },
  deserialize(json) {
    return { rubricCriteria: json.rubricCriteria || [], sampleAnswer: json.sampleAnswer };
  },
};

// 9. Interview / Oral Assessment Handler
export class InterviewHandler implements QuestionTypeHandler<InterviewQuestionData> {
  static type = 'INTERVIEW';
  type = 'INTERVIEW';

  static validate(data: any): boolean {
    return new InterviewHandler().validate(data);
  }
  static evaluate(data: any, userAnswer: any): EvaluationResult {
    return new InterviewHandler().evaluate(data, userAnswer);
  }
  static serialize(data: any): any {
    return new InterviewHandler().serialize(data);
  }
  static deserialize(json: any): InterviewQuestionData {
    return new InterviewHandler().deserialize(json);
  }

  validate(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.scenario !== 'string' || data.scenario.trim() === '') return false;
    if (!Array.isArray(data.rubric) || data.rubric.length === 0) return false;
    for (const r of data.rubric) {
      if (!r || typeof r !== 'object') return false;
      if (!r.id || !r.name || typeof r.maxScore !== 'number' || r.maxScore <= 0) return false;
    }
    if (data.knowledgeDataset !== undefined && data.knowledgeDataset !== null) {
      if (typeof data.knowledgeDataset !== 'object') return false;
      if (data.knowledgeDataset.sourceDocuments !== undefined && !Array.isArray(data.knowledgeDataset.sourceDocuments)) return false;
      if (data.knowledgeDataset.groundTruthFacts !== undefined && !Array.isArray(data.knowledgeDataset.groundTruthFacts)) return false;
      if (data.knowledgeDataset.facts !== undefined && !Array.isArray(data.knowledgeDataset.facts)) return false;
    }
    if (data.behavioralPrompt !== undefined && data.behavioralPrompt !== null) {
      if (typeof data.behavioralPrompt !== 'object') return false;
      if (data.behavioralPrompt.focusAreas !== undefined && !Array.isArray(data.behavioralPrompt.focusAreas)) return false;
      if (data.behavioralPrompt.avoidList !== undefined && !Array.isArray(data.behavioralPrompt.avoidList)) return false;
    }
    return true;
  }

  evaluate(data: any, userAnswer: any): EvaluationResult {
    // userAnswer format: full conversation transcript or evaluation payload
    const hasTurns = Array.isArray(userAnswer)
      ? userAnswer.length > 0
      : userAnswer && typeof userAnswer === 'object'
      ? Array.isArray(userAnswer.turns) && userAnswer.turns.length > 0
      : typeof userAnswer === 'string' && userAnswer.trim().length > 0;

    return {
      isCorrect: Boolean(hasTurns),
      score: hasTurns ? 1.0 : 0,
      feedback: hasTurns
        ? 'Interview session recorded and submitted for multi-criteria AI rubric evaluation'
        : 'No interview turns or transcript submitted',
    };
  }

  serialize(data: any) {
    return {
      scenario: data.scenario,
      rubric: data.rubric,
      preset: data.preset,
      maxTurns: data.maxTurns || 5,
      expectedDurationMinutes: data.expectedDurationMinutes || 15,
      systemInstructions: data.systemInstructions,
      openingQuestion: data.openingQuestion,
      knowledgeDataset: data.knowledgeDataset,
      behavioralPrompt: data.behavioralPrompt,
    };
  }

  deserialize(json: any): InterviewQuestionData {
    return {
      scenario: json.scenario || '',
      rubric: json.rubric || [],
      preset: json.preset,
      maxTurns: Number(json.maxTurns || 5),
      expectedDurationMinutes: Number(json.expectedDurationMinutes || 15),
      systemInstructions: json.systemInstructions,
      openingQuestion: json.openingQuestion,
      knowledgeDataset: json.knowledgeDataset,
      behavioralPrompt: json.behavioralPrompt,
    };
  }
}

// ============================================================================
// 10. LISTENING HANDLER (Phase 15 - LISTENING-01)
// ============================================================================
export interface ListeningSubQuestion {
  id: string;
  type: 'MCQ' | 'FILL_IN_BLANK' | 'MATCHING' | 'SHORT_ANSWER';
  prompt: string;
  marks: number;
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  blankKey?: string;
  pairs?: { left: string; right: string }[];
}

export interface ListeningQuestionData {
  audioSource?: 'SYNTHESIZED' | 'UPLOADED' | 'URL' | 'SYNTHETIC';
  audioUrl?: string;
  audioScript?: string;
  speechText?: string;
  transcript?: string;
  voiceProfileId?: string;
  playbackLimit?: number;
  maxPlays?: number;
  playbackSpeed?: number;
  allowPause?: boolean;
  allowTranscriptInReview?: boolean;
  subQuestions?: ListeningSubQuestion[];
}

export class ListeningHandler implements QuestionTypeHandler<ListeningQuestionData, Record<string, any>> {
  type = 'LISTENING';

  validate(data: ListeningQuestionData): boolean {
    if (!data) return false;
    const hasAudio = Boolean(data.audioUrl || data.audioScript || data.speechText || data.transcript);
    if (!hasAudio) return false;
    const subQs = data.subQuestions || (data as any).questions;
    if (subQs && Array.isArray(subQs) && subQs.length > 0) {
      for (const sq of subQs) {
        if (!sq.id || !sq.prompt || typeof sq.marks !== 'number') return false;
      }
    }
    return true;
  }

  evaluate(data: ListeningQuestionData, userAnswer: Record<string, any>): EvaluationResult {
    const subQs = data.subQuestions || (data as any).questions || [];
    if (subQs.length === 0) {
      return { isCorrect: true, score: 1.0, feedback: 'Audio passage completed' };
    }

    if (!userAnswer || typeof userAnswer !== 'object') {
      return { isCorrect: false, score: 0, feedback: 'No answers provided for listening sub-questions' };
    }

    let totalMarks = 0;
    let earnedMarks = 0;
    const details: string[] = [];

    for (const sq of subQs) {
      totalMarks += sq.marks;
      const ans = userAnswer[sq.id];
      if (ans === undefined || ans === null) {
        details.push(`${sq.id}: Unanswered`);
        continue;
      }

      if (sq.type === 'MCQ') {
        const correct = String(ans) === sq.correctOptionId;
        if (correct) {
          earnedMarks += sq.marks;
          details.push(`${sq.id}: Correct`);
        } else {
          details.push(`${sq.id}: Incorrect`);
        }
      } else if (sq.type === 'FILL_IN_BLANK') {
        const correct = String(ans).trim().toLowerCase() === String(sq.blankKey || '').trim().toLowerCase();
        if (correct) {
          earnedMarks += sq.marks;
          details.push(`${sq.id}: Correct`);
        } else {
          details.push(`${sq.id}: Incorrect`);
        }
      } else {
        const correct = String(ans).trim().toLowerCase() === String(sq.blankKey || sq.correctOptionId || '').trim().toLowerCase();
        if (correct) {
          earnedMarks += sq.marks;
          details.push(`${sq.id}: Correct`);
        } else {
          details.push(`${sq.id}: Incorrect`);
        }
      }
    }

    const normalized = totalMarks > 0 ? earnedMarks / totalMarks : 0;
    return {
      isCorrect: normalized === 1,
      score: Number(normalized.toFixed(3)),
      feedback: `Listening score: ${earnedMarks}/${totalMarks} (${details.join(', ')})`,
    };
  }

  serialize(data: ListeningQuestionData): Record<string, any> {
    return {
      audioSource: data.audioSource,
      audioUrl: data.audioUrl,
      audioScript: data.audioScript,
      voiceProfileId: data.voiceProfileId,
      playbackLimit: data.playbackLimit ?? 2,
      allowPause: data.allowPause ?? true,
      subQuestions: data.subQuestions,
    };
  }

  deserialize(json: any): ListeningQuestionData {
    return {
      audioSource: json.audioSource || 'SYNTHESIZED',
      audioUrl: json.audioUrl,
      audioScript: json.audioScript,
      voiceProfileId: json.voiceProfileId,
      playbackLimit: Number(json.playbackLimit || 2),
      allowPause: json.allowPause !== false,
      subQuestions: json.subQuestions || [],
    };
  }
}

// ============================================================================
// 11. WRITING HANDLER (Phase 15 - WRITING-01)
// ============================================================================
export interface WritingRubricCriterion {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
  description?: string;
}

export interface WritingQuestionData {
  promptText?: string;
  promptStem?: string;
  promptImageUrl?: string;
  stimulusText?: string;
  aiVisualContext?: string;
  minWordCount?: number;
  minWords?: number;
  maxWordCount?: number;
  maxWords?: number;
  timeLimitMinutes?: number;
  recommendedTimeMinutes?: number;
  rubric?: WritingRubricCriterion[];
  rubricCriteria?: WritingRubricCriterion[];
  preset?: 'IELTS_TASK_1' | 'IELTS_TASK_2' | 'TOEFL_INDEPENDENT' | 'ACADEMIC_ESSAY' | 'CUSTOM' | string;
  taskType?: 'TASK_1_GRAPH' | 'TASK_1_PROCESS' | 'TASK_1_MAP' | 'TASK_1_GENERAL' | 'TASK_2_ESSAY' | string;
  taskSpecification?: Record<string, any>;
  chartFacts?: Record<string, any>;
  teacherVerifiedChartData?: Record<string, any>;
  sampleAnswer?: string;
}

export class WritingHandler implements QuestionTypeHandler<WritingQuestionData, string> {
  type: string;

  constructor(customType: string = 'WRITING') {
    this.type = customType;
  }

  validate(data: WritingQuestionData): boolean {
    if (!data) return false;
    const prompt = data.promptText || data.promptStem;
    if (!prompt || typeof prompt !== 'string') return false;
    const minWords = data.minWordCount ?? data.minWords ?? 0;
    const maxWords = data.maxWordCount ?? data.maxWords ?? 1000;
    if (typeof minWords !== 'number' || minWords < 0) return false;
    if (typeof maxWords !== 'number' || maxWords < minWords) return false;
    const rubric = data.rubric || data.rubricCriteria;
    if (!Array.isArray(rubric) || rubric.length === 0) return false;
    return true;
  }

  evaluate(data: WritingQuestionData, userAnswer: string): EvaluationResult {
    const text = String(userAnswer || '').trim();
    const minWordCount = data.minWordCount ?? data.minWords ?? 150;
    const maxWordCount = data.maxWordCount ?? data.maxWords ?? 400;

    if (!text) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Submission was blank (0 words). Minimum required: ' + minWordCount,
      };
    }

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    let lengthPenalty = 0;
    if (wordCount < minWordCount) {
      const deficit = minWordCount - wordCount;
      lengthPenalty = Math.min(0.5, deficit / minWordCount);
    }

    const baselineScore = Math.max(0.1, 1 - lengthPenalty);
    return {
      isCorrect: wordCount >= minWordCount,
      score: Number(baselineScore.toFixed(3)),
      feedback: `Written submission recorded: ${wordCount} words (Requirement: ${minWordCount}-${maxWordCount} words). AI diagnostic evaluation queued.`,
    };
  }

  serialize(data: WritingQuestionData): Record<string, any> {
    return {
      promptText: data.promptText || data.promptStem,
      promptStem: data.promptStem || data.promptText,
      promptImageUrl: data.promptImageUrl,
      stimulusText: data.stimulusText,
      aiVisualContext: data.aiVisualContext,
      minWordCount: data.minWordCount ?? data.minWords ?? 150,
      minWords: data.minWords ?? data.minWordCount ?? 150,
      maxWordCount: data.maxWordCount ?? data.maxWords ?? 300,
      maxWords: data.maxWords ?? data.maxWordCount ?? 300,
      timeLimitMinutes: data.timeLimitMinutes ?? data.recommendedTimeMinutes,
      recommendedTimeMinutes: data.recommendedTimeMinutes ?? data.timeLimitMinutes,
      rubric: data.rubric || data.rubricCriteria || [],
      rubricCriteria: data.rubricCriteria || data.rubric || [],
      preset: data.preset,
      taskType: data.taskType,
      taskSpecification: data.taskSpecification,
      chartFacts: data.chartFacts,
      teacherVerifiedChartData: data.teacherVerifiedChartData,
      sampleAnswer: data.sampleAnswer,
    };
  }

  deserialize(json: any): WritingQuestionData {
    return {
      promptText: json.promptText || json.promptStem || '',
      promptStem: json.promptStem || json.promptText || '',
      promptImageUrl: json.promptImageUrl,
      stimulusText: json.stimulusText,
      aiVisualContext: json.aiVisualContext,
      minWordCount: Number(json.minWordCount ?? json.minWords ?? 150),
      minWords: Number(json.minWords ?? json.minWordCount ?? 150),
      maxWordCount: Number(json.maxWordCount ?? json.maxWords ?? 300),
      maxWords: Number(json.maxWords ?? json.maxWordCount ?? 300),
      timeLimitMinutes: json.timeLimitMinutes ? Number(json.timeLimitMinutes) : (json.recommendedTimeMinutes ? Number(json.recommendedTimeMinutes) : undefined),
      recommendedTimeMinutes: json.recommendedTimeMinutes ? Number(json.recommendedTimeMinutes) : (json.timeLimitMinutes ? Number(json.timeLimitMinutes) : undefined),
      rubric: json.rubric || json.rubricCriteria || [],
      rubricCriteria: json.rubricCriteria || json.rubric || [],
      preset: json.preset,
      taskType: json.taskType,
      taskSpecification: json.taskSpecification,
      chartFacts: json.chartFacts,
      teacherVerifiedChartData: json.teacherVerifiedChartData,
      sampleAnswer: json.sampleAnswer,
    };
  }
}

// ============================================================================
// PLUGGABLE QUESTION TYPE REGISTRY ENGINE
// ============================================================================
export class QuestionTypeRegistry {
  private handlers = new Map<string, QuestionTypeHandler>();

  constructor() {
    // Register built-in handlers
    this.registerType(MCQHandler);
    this.registerType(MultipleSelectHandler);
    this.registerType(TrueFalseHandler);
    this.registerType(FillInBlankHandler);
    this.registerType(ShortAnswerHandler);
    this.registerType(NumericalHandler);
    this.registerType(MatchingHandler);
    this.registerType(SubjectiveHandler);
    this.registerType(new InterviewHandler());
    this.registerType(new WritingHandler('WRITING'));
    this.registerType(new WritingHandler('IELTS_WRITING_TASK_1'));
    this.registerType(new WritingHandler('IELTS_WRITING_TASK_2'));
  }

  public registerType(handler: QuestionTypeHandler): void {
    if (!handler || !handler.type) {
      throw new Error('Invalid QuestionTypeHandler: missing type definition');
    }
    this.handlers.set(handler.type.toUpperCase(), handler);
  }

  public getType(type: string): QuestionTypeHandler {
    const key = String(type || '').toUpperCase();
    const handler = this.handlers.get(key);
    if (!handler) {
      throw new Error(`UNKNOWN_QUESTION_TYPE: Unregistered question type '${type}'`);
    }
    return handler;
  }

  public getAllTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  public evaluate(type: string, questionData: any, userAnswer: any): EvaluationResult {
    const handler = this.getType(type);
    if (!handler.validate(questionData)) {
      throw new Error(`INVALID_QUESTION_DATA: Question payload validation failed for type '${type}'`);
    }
    return handler.evaluate(questionData, userAnswer);
  }
}

export const questionTypeRegistry = new QuestionTypeRegistry();
