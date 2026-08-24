export type BuiltInQuestionType =
  | 'MCQ'
  | 'MULTIPLE_SELECT'
  | 'TRUE_FALSE'
  | 'FILL_IN_BLANK'
  | 'SHORT_ANSWER'
  | 'NUMERICAL'
  | 'MATCHING'
  | 'SUBJECTIVE'
  | 'INTERVIEW';

export interface InterviewRubricCriterion {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
  criteria?: string[];
}

export interface InterviewQuestionData {
  scenario: string;
  rubric: InterviewRubricCriterion[];
  preset?: 'IELTS_SPEAKING' | 'UPSC_PERSONALITY' | 'TECH_SYSTEM_DESIGN' | 'GENERAL_HR' | 'CUSTOM' | string;
  maxTurns?: number;
  expectedDurationMinutes?: number;
  systemInstructions?: string;
  openingQuestion?: string;
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
export const InterviewHandler: QuestionTypeHandler<InterviewQuestionData> = {
  type: 'INTERVIEW',
  validate(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.scenario !== 'string' || data.scenario.trim() === '') return false;
    if (!Array.isArray(data.rubric) || data.rubric.length === 0) return false;
    for (const r of data.rubric) {
      if (!r || typeof r !== 'object') return false;
      if (!r.id || !r.name || typeof r.maxScore !== 'number' || r.maxScore <= 0) return false;
    }
    return true;
  },
  evaluate(data, userAnswer) {
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
  },
  serialize(data) {
    return {
      scenario: data.scenario,
      rubric: data.rubric,
      preset: data.preset,
      maxTurns: data.maxTurns || 5,
      expectedDurationMinutes: data.expectedDurationMinutes || 15,
      systemInstructions: data.systemInstructions,
      openingQuestion: data.openingQuestion,
    };
  },
  deserialize(json) {
    return {
      scenario: json.scenario || '',
      rubric: json.rubric || [],
      preset: json.preset,
      maxTurns: Number(json.maxTurns || 5),
      expectedDurationMinutes: Number(json.expectedDurationMinutes || 15),
      systemInstructions: json.systemInstructions,
      openingQuestion: json.openingQuestion,
    };
  },
};

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
    this.registerType(InterviewHandler);
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
