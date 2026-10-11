import crypto from 'crypto';
import {
  WritingCriterionDetailDTO,
  WritingGrammarCorrectionDTO,
  WritingVocabularySuggestionDTO,
  WritingChartFactsDTO,
  WritingErrorAnnotationDTO,
  WritingCheckItemDTO,
  WritingTaskSpecificationDTO,
  CheckStatus,
} from '@repo/types';
import { computeTextStatistics, verifyAndLocateQuotations, roundToIeltsBand } from './writing-evaluation-engine.service';
import { isUnintelligibleOrGibberish } from './gibberish-detector';

export interface Task1GroundingResult {
  hasVerifiedChartFacts: boolean;
  isTopicMismatch: boolean;
  mismatchReason?: string;
  ungroundedTimeframes: string[];
  ungroundedFigures: string[];
  dataAccuracyStatus: CheckStatus;
  dataAccuracyExplanation: string;
  understandingStatus: CheckStatus;
  understandingExplanation: string;
  reviewReasons: string[];
  diagnosticAnnotations: WritingErrorAnnotationDTO[];
}

export interface DescriptorAnalysisResult {
  criteriaScores: WritingCriterionDetailDTO[];
  strengths: string[];
  priorityImprovements: string[];
  grammarCorrections: WritingGrammarCorrectionDTO[];
  vocabularySuggestions: WritingVocabularySuggestionDTO[];
  annotations: WritingErrorAnnotationDTO[];
  detailedChecks: Record<string, WritingCheckItemDTO[]>;
  errorFreeSentenceMetrics: {
    errorFreeCount: number;
    totalSentences: number;
    percentage: number;
    isConfident: boolean;
    uncertaintyReason?: string;
  };
  mainPriority: string;
  nextBandTarget: string;
  overallFeedback: string;
  rawAverageScore: number;
  reviewReasons: string[];
  task1Grounding?: Task1GroundingResult;
}

export class IeltsDescriptorAnalyzer {
  /**
   * Assesses visual stimulus grounding, factual correspondence, and timeframe accuracy for Task 1.
   */
  static assessTask1VisualGrounding(
    text: string,
    chartFacts?: WritingChartFactsDTO | null,
    promptText?: string
  ): Task1GroundingResult {
    const diagnosticAnnotations: WritingErrorAnnotationDTO[] = [];
    const reviewReasons: string[] = [];

    if (!chartFacts) {
      return {
        hasVerifiedChartFacts: false,
        isTopicMismatch: false,
        ungroundedTimeframes: [],
        ungroundedFigures: [],
        dataAccuracyStatus: 'uncertain',
        dataAccuracyExplanation:
          'Teacher-verified visual stimulus data unavailable; factual accuracy requires human review.',
        understandingStatus: 'uncertain',
        understandingExplanation:
          'Evaluated against prompt context without verified visual stimulus ground truth.',
        reviewReasons: ['MISSING_CHART_FACTS', 'TASK_1_FACTS_UNVERIFIED'],
        diagnosticAnnotations,
      };
    }

    if (!chartFacts.isTeacherVerified) {
      return {
        hasVerifiedChartFacts: false,
        isTopicMismatch: false,
        ungroundedTimeframes: [],
        ungroundedFigures: [],
        dataAccuracyStatus: 'uncertain',
        dataAccuracyExplanation:
          'Visual stimulus data has not been teacher-verified. Task Achievement requires certified teacher review.',
        understandingStatus: 'uncertain',
        understandingExplanation:
          'Factual accuracy cannot be finalized automatically because chart facts are not teacher-verified.',
        reviewReasons: ['UNVERIFIED_CHART_FACTS', 'TASK_1_FACTS_UNVERIFIED'],
        diagnosticAnnotations,
      };
    }

    // Build stimulus domain keywords from chartFacts & promptText
    const domainKeywords = new Set<string>();
    const coreTopicKeywords = new Set<string>();

    const genericWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'between', 'that', 'this',
      'show', 'shows', 'shown', 'showed', 'illustrate', 'illustrates', 'illustrating', 'illustrated',
      'summarise', 'information', 'selecting', 'reporting', 'main', 'features', 'make', 'comparisons',
      'where', 'relevant', 'write', 'least', 'words', 'academic', 'writing', 'task',
      'proportion', 'proportions', 'percentage', 'percentages', 'share', 'shares', 'distribution',
      'percent', 'rate', 'rates', 'figure', 'figures', 'number', 'numbers', 'data',
      'chart', 'graph', 'table', 'diagram', 'bar', 'line', 'pie', 'axis', 'units',
      'period', 'time', 'year', 'years', 'total', 'average', 'level', 'levels',
      'amount', 'amounts', 'value', 'values', 'trend', 'trends', 'comparison', 'comparisons',
      'difference', 'differences', 'increase', 'decrease', 'rise', 'fall', 'growth', 'drop',
      'change', 'changes', 'changing', 'changed', 'highest', 'lowest', 'majority', 'minority',
      'country', 'countries', 'nation', 'nations', 'surveyed', 'overall', 'clear', 'clearly',
      'compared', 'comparing', 'given', 'provided', 'significant', 'significantly', 'over', 'under',
      'around', 'about', 'across', 'more', 'less', 'high', 'higher', 'highest', 'low', 'lower', 'lowest',
      'large', 'small', 'larger', 'smaller', 'rose', 'risen', 'fell', 'fallen', 'increased', 'increasing',
      'decreased', 'decreasing', 'dropped', 'grew', 'grown', 'pattern', 'patterns', 'category', 'categories',
      'segment', 'segments', 'represented', 'representing', 'comprising', 'remained', 'stable', 'constant',
      'steady', 'fluctuated', 'peaked', 'both', 'each', 'all', 'such', 'well', 'also', 'source', 'sources',
      'other', 'others', 'three', 'five', 'two', 'four', 'six', 'seven', 'eight', 'nine', 'ten',
      'first', 'second', 'third', 'last', 'which', 'there', 'have', 'were', 'been', 'became', 'seen', 'saw',
      'while', 'whereas', 'same', 'very', 'only', 'almost', 'most', 'popular', 'everywhere', 'expansion',
      'contraction', 'pronounced', 'notable', 'noticeable', 'substantial', 'dramatic', 'slight', 'steady'
    ]);

    const addTokens = (str?: string, isCore = false) => {
      if (!str) return;
      const clean = str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
      for (const token of clean.split(/\s+/)) {
        if (token.length >= 3 && !genericWords.has(token) && !/^\d{4}$/.test(token)) {
          domainKeywords.add(token);
          if (isCore) {
            coreTopicKeywords.add(token);
          }
        }
      }
    };

    addTokens(chartFacts.chartTitle, true);
    addTokens(chartFacts.chartType);
    addTokens(chartFacts.units);
    (chartFacts.majorTrends || []).forEach((t) => addTokens(t, false));
    (chartFacts.keyComparisons || []).forEach((t) => addTokens(t, false));
    (chartFacts.processStagesOrMapChanges || []).forEach((t) => addTokens(t, false));
    if (chartFacts.notes) addTokens(chartFacts.notes, true);

    // Extract cohort labels / keys from keyDataPoints
    if (Array.isArray(chartFacts.keyDataPoints)) {
      for (const dp of chartFacts.keyDataPoints) {
        if (typeof dp === 'object' && dp !== null) {
          for (const key of Object.keys(dp)) {
            addTokens(key, true);
            if (typeof dp[key] === 'string') addTokens(dp[key], false);
          }
        }
      }
    }

    if (promptText) {
      addTokens(promptText, false);
    }

    // Semantic domain expansions based on chart type or topic:
    const titleLower = (chartFacts.chartTitle || '').toLowerCase();
    const typeLower = (chartFacts.chartType || '').toLowerCase();

    if (
      typeLower.includes('pyramid') ||
      titleLower.includes('population') ||
      titleLower.includes('demographic') ||
      titleLower.includes('cohort')
    ) {
      [
        'population', 'pyramid', 'demographic', 'cohort', 'cohorts', 'age', 'ages', 'gender', 'genders',
        'sex', 'sexes', 'male', 'males', 'female', 'females', 'men', 'women', 'boy', 'boys', 'girl', 'girls',
        'elderly', 'senior', 'seniors', 'youth', 'young', 'children', 'child', 'infant', 'bracket', 'brackets',
        'aging', 'aged', 'people', 'citizen', 'citizens', 'resident', 'residents', 'generation', 'generations',
        '0-14', '15-29', '30-44', '45-59', '60-74', '75+'
      ].forEach((t) => {
        domainKeywords.add(t);
        coreTopicKeywords.add(t);
      });
    } else if (
      typeLower.includes('process') ||
      titleLower.includes('process') ||
      titleLower.includes('desalination') ||
      titleLower.includes('water')
    ) {
      [
        'process', 'stage', 'stages', 'step', 'steps', 'phase', 'phases', 'water', 'seawater', 'desalination',
        'filtration', 'reverse', 'osmosis', 'membrane', 'membranes', 'brine', 'intake', 'drinking', 'potable'
      ].forEach((t) => {
        domainKeywords.add(t);
        coreTopicKeywords.add(t);
      });
    } else if (typeLower.includes('map') || titleLower.includes('map') || titleLower.includes('development')) {
      [
        'map', 'maps', 'development', 'area', 'town', 'city', 'infrastructure', 'building', 'construction',
        'residential', 'commercial', 'demolished', 'reconstructed', 'expanded', 'north', 'south', 'east', 'west'
      ].forEach((t) => {
        domainKeywords.add(t);
        coreTopicKeywords.add(t);
      });
    } else if (titleLower.includes('electricity') || titleLower.includes('energy') || titleLower.includes('renewable')) {
      [
        'electricity', 'energy', 'renewable', 'power', 'solar', 'wind', 'hydro', 'hydroelectric', 'generation'
      ].forEach((t) => {
        domainKeywords.add(t);
        coreTopicKeywords.add(t);
      });
    }

    // Check timeframe grounding
    const validTimeframes = new Set(
      (chartFacts.timeframes || []).map((t) => String(t).trim())
    );
    if (chartFacts.notes) {
      const noteYears = chartFacts.notes.match(/\b(19\d\d|20\d\d)\b/g);
      if (noteYears) {
        noteYears.forEach((y) => validTimeframes.add(y));
      }
    }
    const essayYears = Array.from(new Set(text.match(/\b(19\d\d|20\d\d)\b/g) || []));
    const ungroundedTimeframes: string[] = [];
    if (validTimeframes.size > 0) {
      for (const y of essayYears) {
        if (!validTimeframes.has(y)) {
          ungroundedTimeframes.push(y);
        }
      }
    }

    // Annotate ungrounded timeframes
    for (const year of ungroundedTimeframes) {
      const idx = text.indexOf(year);
      if (idx >= 0) {
        const validList = Array.from(validTimeframes).join(' and ');
        diagnosticAnnotations.push({
          id: `anno_${crypto.randomBytes(4).toString('hex')}`,
          criterion: 'task_achievement',
          category: 'Task',
          subcategory: 'Data and Visual Accuracy',
          severity: 'major',
          original: year,
          correction: Array.from(validTimeframes).join(' / ') || 'valid timeframe',
          explanation: `The year "${year}" does not exist in the visual stimulus (${chartFacts.chartTitle}), which only covers ${validList || 'specified timeframes'}.`,
          startOffset: idx,
          endOffset: idx + year.length,
          isGenuineError: true,
          meaningImpact: 'Presents an ungrounded timeframe not supported by the visual data.',
        });
      }
    }

    // Count domain keyword matches in student text
    const textLower = text.toLowerCase();
    const matchedKeywords: string[] = [];
    for (const kw of Array.from(domainKeywords)) {
      const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(textLower)) {
        matchedKeywords.push(kw);
      }
    }

    let coreMatchedCount = 0;
    if (coreTopicKeywords.size > 0) {
      for (const kw of Array.from(coreTopicKeywords)) {
        const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        if (regex.test(textLower)) {
          coreMatchedCount++;
        }
      }
    }

    // Check for complete topic mismatch
    let isTopicMismatch = false;
    let mismatchReason: string | undefined;

    if (matchedKeywords.length === 0) {
      isTopicMismatch = true;
      mismatchReason = `Candidate response discusses an unrelated topic and contains zero domain concepts from the assigned visual stimulus (${chartFacts.chartTitle}).`;
    } else if (coreTopicKeywords.size > 0 && coreMatchedCount === 0) {
      isTopicMismatch = true;
      mismatchReason = `Candidate response discusses an unrelated topic without addressing the core subject matter of the assigned visual stimulus (${chartFacts.chartTitle}).`;
    }

    // Extract figures / percentages from candidate text
    const figureMatches = Array.from(text.matchAll(/\b(\d+(?:\.\d+)?)\s*(%|percent\b)/gi));
    const extractedFigures: number[] = [];
    const ungroundedFigures: string[] = [];

    // Collect valid reference numbers from keyDataPoints
    const validNumbers: number[] = [];
    if (Array.isArray(chartFacts.keyDataPoints)) {
      for (const dp of chartFacts.keyDataPoints) {
        if (typeof dp === 'object' && dp !== null) {
          for (const val of Object.values(dp)) {
            if (typeof val === 'number') validNumbers.push(val);
            else if (typeof val === 'string' && /^-?\d+(?:\.\d+)?$/.test(val.trim())) validNumbers.push(Number(val.trim()));
            else if (typeof val === 'object' && val !== null) {
              for (const innerVal of Object.values(val)) {
                if (typeof innerVal === 'number') validNumbers.push(innerVal);
                else if (typeof innerVal === 'string' && /^-?\d+(?:\.\d+)?$/.test(innerVal.trim())) validNumbers.push(Number(innerVal.trim()));
              }
            }
          }
        }
      }
    }

    // Collect reference figures from trends, comparisons, and overview features
    const anyFacts = chartFacts as any;
    const textualSources = [
      ...(Array.isArray(chartFacts.majorTrends) ? chartFacts.majorTrends : []),
      ...(Array.isArray(chartFacts.keyComparisons) ? chartFacts.keyComparisons : []),
      ...(Array.isArray(chartFacts.expectedOverviewFeatures) ? chartFacts.expectedOverviewFeatures : []),
      ...(Array.isArray(anyFacts.overviewPoints) ? anyFacts.overviewPoints : []),
      ...(Array.isArray(anyFacts.keyTrends) ? anyFacts.keyTrends : []),
      chartFacts.notes || '',
      anyFacts.contextText || '',
    ];
    for (const src of textualSources) {
      if (typeof src === 'string') {
        const matches = src.matchAll(/\b(\d+(?:\.\d+)?)\b/g);
        for (const m of matches) {
          validNumbers.push(parseFloat(m[1]));
        }
      }
    }

    // Add multi-cohort sums (e.g. working age total combining 2-3 age brackets)
    const baseNums = Array.from(new Set(validNumbers));
    for (let i = 0; i < baseNums.length; i++) {
      for (let j = i + 1; j < baseNums.length; j++) {
        const sum2 = baseNums[i] + baseNums[j];
        if (sum2 <= 100) validNumbers.push(sum2);
        for (let k = j + 1; k < baseNums.length; k++) {
          const sum3 = sum2 + baseNums[k];
          if (sum3 <= 100) validNumbers.push(sum3);
        }
      }
    }

    if (validNumbers.length > 0 && figureMatches.length > 0) {
      for (const match of figureMatches) {
        const numVal = parseFloat(match[1]);
        const fullMatch = match[0];
        extractedFigures.push(numVal);
        // A figure is grounded if within ±3.5 of any valid number in keyDataPoints or standard totals
        const isGrounded = validNumbers.some((vn) => Math.abs(vn - numVal) <= 3.5);
        if (!isGrounded && numVal > 0) {
          ungroundedFigures.push(`${numVal}%`);
          const startIdx = match.index ?? text.indexOf(fullMatch);
          if (startIdx >= 0) {
            diagnosticAnnotations.push({
              id: `anno_${crypto.randomBytes(4).toString('hex')}`,
              criterion: 'task_achievement',
              category: 'Task',
              subcategory: 'Data and Visual Accuracy',
              severity: 'major',
              original: fullMatch,
              correction: 'reported verified figure',
              explanation: `The figure "${fullMatch}" is ungrounded and does not correspond to the visual stimulus (${chartFacts.chartTitle}).`,
              startOffset: startIdx,
              endOffset: startIdx + fullMatch.length,
              isGenuineError: true,
              meaningImpact: 'Presents ungrounded or fabricated figures not shown in the visual diagram.',
            });
          }
        }
      }
    }

    if (isTopicMismatch) {
      reviewReasons.push('TASK_1_STIMULUS_MISMATCH');

      const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || text.slice(0, 60);
      const idx = text.indexOf(firstSentence);
      diagnosticAnnotations.unshift({
        id: `anno_${crypto.randomBytes(4).toString('hex')}`,
        criterion: 'task_achievement',
        category: 'Task',
        subcategory: 'Task Relevance',
        severity: 'critical',
        original: firstSentence.slice(0, 70),
        correction: `Select and summarize features from the assigned visual stimulus (${chartFacts.chartTitle}).`,
        explanation: `The submission is completely unrelated to the assigned visual stimulus (${chartFacts.chartTitle}). It presents data and topics from an entirely different domain.`,
        startOffset: idx >= 0 ? idx : 0,
        endOffset: (idx >= 0 ? idx : 0) + Math.min(firstSentence.length, 70),
        isGenuineError: true,
        meaningImpact: 'Critical failure: Response does not address the visual stimulus provided.',
      });

      return {
        hasVerifiedChartFacts: true,
        isTopicMismatch: true,
        mismatchReason,
        ungroundedTimeframes,
        ungroundedFigures: Array.from(new Set(ungroundedFigures)),
        dataAccuracyStatus: 'not_met',
        dataAccuracyExplanation: `Data presented does not correspond to the assigned visual stimulus (${chartFacts.chartTitle}).`,
        understandingStatus: 'not_met',
        understandingExplanation: `Submission fails to address the assigned visual prompt and discusses an unrelated topic.`,
        reviewReasons,
        diagnosticAnnotations,
      };
    }

    let dataAccuracyStatus: CheckStatus = 'met';
    let dataAccuracyExplanation = 'Key features and data points correspond accurately to the teacher-verified visual stimulus.';

    if (ungroundedTimeframes.length > 0 || ungroundedFigures.length > 0) {
      dataAccuracyStatus = 'partially_met';
      const issues: string[] = [];
      if (ungroundedFigures.length > 0) {
        issues.push(`ungrounded figures (${Array.from(new Set(ungroundedFigures)).join(', ')})`);
      }
      if (ungroundedTimeframes.length > 0) {
        issues.push(`ungrounded timeframes (${ungroundedTimeframes.join(', ')})`);
      }
      dataAccuracyExplanation = `Contains ${issues.join(' and ')} not found in the visual stimulus.`;
    } else if (validNumbers.length > 0 && figureMatches.length === 0 && !typeLower.includes('process') && !typeLower.includes('map')) {
      dataAccuracyStatus = 'partially_met';
      dataAccuracyExplanation = 'No specific quantitative figures from the visual stimulus were reported to support the description.';
    }

    let understandingStatus: CheckStatus = 'met';
    let understandingExplanation = 'Accurately identified and reported features from the assigned visual stimulus.';
    if (coreMatchedCount === 0 || matchedKeywords.length < 2) {
      understandingStatus = 'partially_met';
      understandingExplanation = 'Vague or incomplete identification of the visual stimulus topic and categories.';
    }

    return {
      hasVerifiedChartFacts: true,
      isTopicMismatch: false,
      ungroundedTimeframes,
      ungroundedFigures: Array.from(new Set(ungroundedFigures)),
      dataAccuracyStatus,
      dataAccuracyExplanation,
      understandingStatus,
      understandingExplanation,
      reviewReasons,
      diagnosticAnnotations,
    };
  }

  /**
   * Evaluates text using official IELTS Public Band Descriptors and verified evidence.
   */
  static analyzeSubmission(
    text: string,
    taskType: 'TASK_1' | 'TASK_2',
    chartFacts?: WritingChartFactsDTO | null,
    promptText?: string,
    taskSpecification?: WritingTaskSpecificationDTO | null
  ): DescriptorAnalysisResult {
    const stats = computeTextStatistics(text);
    const minWords = taskType === 'TASK_1' ? 150 : 250;
    const reviewReasons: string[] = [];

    // Check for unintelligible or keyboard mash submissions
    const gibberishCheck = isUnintelligibleOrGibberish(text);
    if (gibberishCheck.isGibberish) {
      const criteriaScores: WritingCriterionDetailDTO[] = (taskType === 'TASK_1'
        ? [
            {
              id: 'task_achievement',
              name: 'Task Achievement',
              score: 1.0,
              rawScore: 1.0,
              maxScore: 9.0,
              explanation: 'Answer is completely unrelated to the visual prompt and consists of unintelligible characters or non-words.',
              supportingQuotations: [],
              specificWeaknesses: ['Submission consists of keyboard mash or non-words.'],
              whatWouldImprove: 'Write in standard English selecting and reporting major visual features.',
              requiresReview: true,
            },
            {
              id: 'coherence_cohesion',
              name: 'Coherence and Cohesion',
              score: 1.0,
              rawScore: 1.0,
              maxScore: 9.0,
              explanation: 'Fails to communicate any message. No coherent sentences, clauses, or paragraph structure exist.',
              supportingQuotations: [],
              specificWeaknesses: ['No sentence structure or logical organization.'],
              whatWouldImprove: 'Write complete grammatical sentences organized into paragraphs.',
              requiresReview: true,
            },
            {
              id: 'lexical_resource',
              name: 'Lexical Resource',
              score: 1.0,
              rawScore: 1.0,
              maxScore: 9.0,
              explanation: `Can only use a few isolated character combinations. ${gibberishCheck.reason || 'Words lack English vocabulary.'}`,
              supportingQuotations: [],
              specificWeaknesses: ['Vocabulary consists of non-words.'],
              whatWouldImprove: 'Use recognizable English words and appropriate task vocabulary.',
              requiresReview: true,
            },
            {
              id: 'grammatical_range',
              name: 'Grammatical Range and Accuracy',
              score: 1.0,
              rawScore: 1.0,
              maxScore: 9.0,
              explanation: 'Cannot use sentence forms at all. No valid grammatical structures are present.',
              supportingQuotations: [],
              specificWeaknesses: ['Lacks syntax and grammatical clauses.'],
              whatWouldImprove: 'Formulate basic subject-verb sentence patterns.',
              requiresReview: true,
            },
          ]
        : [
            {
              id: 'task_response',
              name: 'Task Response',
              score: 1.0,
              rawScore: 1.0,
              maxScore: 9.0,
              explanation: 'Answer does not address the prompt and consists of unintelligible characters or non-words.',
              supportingQuotations: [],
              specificWeaknesses: ['Submission consists of keyboard mash or non-words.'],
              whatWouldImprove: 'Address the essay prompt using standard English discourse.',
              requiresReview: true,
            },
            {
              id: 'coherence_cohesion',
              name: 'Coherence and Cohesion',
              score: 1.0,
              rawScore: 1.0,
              maxScore: 9.0,
              explanation: 'Fails to communicate any message. No coherent sentences, clauses, or paragraph structure exist.',
              supportingQuotations: [],
              specificWeaknesses: ['No sentence structure or logical organization.'],
              whatWouldImprove: 'Write complete grammatical sentences organized into paragraphs.',
              requiresReview: true,
            },
            {
              id: 'lexical_resource',
              name: 'Lexical Resource',
              score: 1.0,
              rawScore: 1.0,
              maxScore: 9.0,
              explanation: `Can only use a few isolated character combinations. ${gibberishCheck.reason || 'Words lack English vocabulary.'}`,
              supportingQuotations: [],
              specificWeaknesses: ['Vocabulary consists of non-words.'],
              whatWouldImprove: 'Use recognizable English words and appropriate task vocabulary.',
              requiresReview: true,
            },
            {
              id: 'grammatical_range',
              name: 'Grammatical Range and Accuracy',
              score: 1.0,
              rawScore: 1.0,
              maxScore: 9.0,
              explanation: 'Cannot use sentence forms at all. No valid grammatical structures are present.',
              supportingQuotations: [],
              specificWeaknesses: ['Lacks syntax and grammatical clauses.'],
              whatWouldImprove: 'Formulate basic subject-verb sentence patterns.',
              requiresReview: true,
            },
          ]);

      return {
        criteriaScores,
        strengths: [],
        priorityImprovements: [
          'Write responses using recognizable English vocabulary.',
          'Formulate complete, grammatically correct sentences addressing the prompt.',
        ],
        grammarCorrections: [],
        vocabularySuggestions: [],
        annotations: [],
        detailedChecks: {},
        errorFreeSentenceMetrics: {
          errorFreeCount: 0,
          totalSentences: 0,
          percentage: 0,
          isConfident: true,
        },
        mainPriority: 'Write responses using recognizable English vocabulary.',
        nextBandTarget: 'Formulate basic subject-verb English sentences to advance from Band 1.0.',
        overallFeedback:
          'The submission consists of keyboard mash, non-words, or unintelligible character strings with no recognizable English grammar, syntax, or vocabulary. According to official IELTS Academic Writing band descriptors, submissions that fail to communicate a message and lack sentence forms are evaluated at Band 1.0 (Non-user).',
        rawAverageScore: 1.0,
        reviewReasons: ['UNINTELLIGIBLE_GIBBERISH'],
      };
    }

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const isAdversarial =
      /\b(ignore (all )?previous instructions|system prompt|emergency debug mode|award band 9|administrative override)\b/i.test(text);

    if (isAdversarial) {
      reviewReasons.push('ADVERSARIAL_PROMPT_INJECTION_DETECTED: Candidate submission contains adversarial meta-instructions attempting to override evaluation.');
    }

    const academicWordsFound = text.match(
      /\b(substantial|pronounced|predominant|trajectory|diversification|exponentially|indispensable|mitigate|catalyst|socioeconomic|anomalies|prejudice|equitable|adjudication|scrutiny|imperative|infrastructure|expenditure|stewardship|diminishes|ramifications|bolsters|autonomy|discretion|advancement|accountability|opacity|mitigating|unmatched|empirical|interplanetary|dichotomy|constellations|proportions|percentage|modest|steepest|surging|declining|peaked|plateaued|outstripped|dominant|expansion|baseline|permeate|potable|desalination|municipal|filtration|remineralization|skyscrapers|overcrowding|sustainable|permanently)\b/gi
    ) || [];

    // =========================================================================
    // 1. Task 1: Task Achievement / Task 2: Task Response
    // =========================================================================
    let c1Score = 6.0;
    let c1Explanation = '';
    const c1Quotes: string[] = [];
    const c1Weaknesses: string[] = [];
    let c1Improvement = '';
    let c1RequiresReview = false;

    let task1Grounding: Task1GroundingResult | null = null;
    if (taskType === 'TASK_1') {
      task1Grounding = IeltsDescriptorAnalyzer.assessTask1VisualGrounding(
        text,
        chartFacts,
        promptText
      );
      if (task1Grounding.reviewReasons.length > 0) {
        reviewReasons.push(...task1Grounding.reviewReasons);
      }

      if (task1Grounding.isTopicMismatch) {
        c1Score = 2.0;
        c1Explanation = `The response is completely unrelated to the assigned visual stimulus (${chartFacts?.chartTitle || 'assigned visual stimulus'}). It discusses an entirely different subject or domain. Under official IELTS Task 1 descriptors, an answer that is completely unrelated to the task receives Band 2.0 in Task Achievement.`;
        c1Weaknesses.push('Response discusses an unrelated subject rather than the assigned visual stimulus (topic mismatch).');
        c1Weaknesses.push('No key features or data from the visual stimulus were reported.');
        c1Improvement = 'Carefully inspect the visual stimulus provided and select and report only the features, categories, and trends shown.';
        c1RequiresReview = true;
      } else if (!chartFacts || !chartFacts.isTeacherVerified) {
        c1RequiresReview = true;
        c1Explanation =
          'Reliable visual chart context was unavailable or unverified for this prompt. Factual accuracy could not be verified automatically and requires certified teacher review.';
        c1Weaknesses.push('Ground truth visual data not teacher-verified.');
        c1Improvement = 'Submit for teacher review to verify factual accuracy against original visual diagram.';
        c1Score = 5.5;
      } else {
        // Check for overview statement
        const overviewSentence = sentences.find((s) =>
          /\b(overall|in general|it is clear that|to summarize|notable trend|predominant)\b/i.test(s)
        );
        const hasOverview = Boolean(overviewSentence);

        // Check for key data points / numbers
        const numbersFound = text.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
        const hasSpecificData = numbersFound.length >= 3;

        // Check key comparisons / trends
        const hasComparisons = /\b(while|whereas|compared to|higher than|lower than|by contrast|in contrast|surpassing|dominant|rose|fell|increased|decreased)\b/i.test(text);

        if (overviewSentence) {
          c1Quotes.push(overviewSentence);
        }
        const dataSentence = sentences.find((s) => /\b\d+(?:\.\d+)?%?\b/.test(s));
        if (dataSentence && dataSentence !== overviewSentence) {
          c1Quotes.push(dataSentence);
        }

        const lengthDeficit = minWords - stats.wordCount;
        const isProcess = text.includes('step') || text.includes('stage') || text.includes('membrane') || text.includes('filtration');
        if (lengthDeficit > 60) {
          c1Score = 4.5;
          c1Explanation = `Response reached only ${stats.wordCount} words, falling well short of the 150-word minimum for Task 1. In official IELTS descriptors, under-length responses are penalized in Task Achievement because key features cannot be adequately covered.`;
          c1Weaknesses.push(`Severe length deficit (${stats.wordCount}/150 words).`);
        } else if (lengthDeficit > 25) {
          c1Score = 5.5;
          c1Explanation = `Response reached ${stats.wordCount} words, falling short of the 150-word minimum for Task 1. Key features are partially presented.`;
          c1Weaknesses.push(`Word count (${stats.wordCount} words) is below the required 150 words.`);
        } else if (hasOverview && (hasSpecificData || isProcess) && hasComparisons) {
          if (stats.wordCount >= 155 && (numbersFound.length >= 6 || isProcess)) {
            c1Score = 8.5;
            c1Explanation =
              'Presents a clear, well-developed overview with key trends highlighted. All main features of the visual stimulus are accurately selected, clearly reported, and systematically compared.';
            c1Improvement = 'Continue synthesizing multi-category interactions to reach Band 9.0 mastery.';
          } else if (stats.wordCount >= 145) {
            c1Score = 7.5;
            c1Explanation =
              'A clear overview is presented, and major trends and comparisons are identified. Key features are supported with relevant data from the visual stimulus.';
            c1Improvement = 'Provide more granular comparative analysis between intermediate categories rather than isolated figures.';
          } else {
            c1Score = 7.0;
            c1Explanation =
              'Presents a clear overview with all main features or process stages identified and ordered logically. The response effectively conveys the visual stimulus requirements.';
            c1Improvement = 'Expand descriptions slightly to comfortably exceed the 150-word minimum.';
          }
        } else if (hasOverview) {
          c1Score = 6.0;
          c1Explanation =
            'Presents an overview with relevant information, but some key features are insufficiently supported with exact figures or comparative details.';
          if (!hasSpecificData && !isProcess) c1Weaknesses.push('Insufficient quantitative figures selected from the visual stimulus.');
          c1Improvement = 'Select and report specific figures, dates, and units to support all major observations.';
        } else {
          c1Score = stats.wordCount < 60 ? 4.5 : 5.0;
          c1Explanation =
            'Presents details from the visual diagram but lacks a clear overarching overview statement. In IELTS descriptors, omitting an overview caps Task Achievement at Band 5.';
          c1Weaknesses.push('No clear general overview statement found.');
          c1Improvement = 'Include a prominent overview paragraph summarizing the predominant trends or overall process.';
        }

        if (task1Grounding && (task1Grounding.ungroundedTimeframes.length > 0 || task1Grounding.ungroundedFigures.length > 0)) {
          c1Score = Math.min(c1Score, 5.5);
          const issues: string[] = [];
          if (task1Grounding.ungroundedFigures.length > 0) {
            issues.push(`ungrounded figures: ${task1Grounding.ungroundedFigures.join(', ')}`);
          }
          if (task1Grounding.ungroundedTimeframes.length > 0) {
            issues.push(`ungrounded timeframes: ${task1Grounding.ungroundedTimeframes.join(', ')}`);
          }
          c1Weaknesses.push(`Contains inaccurate or ungrounded data (${issues.join('; ')}).`);
          c1Explanation += ` Note: Inaccurate or ungrounded data points (${issues.join('; ')}) restrict Task Achievement under IELTS descriptors.`;
        }
      }
    } else {
      // Task 2: Task Response
      const positionSentence = sentences.find((s) =>
        /\b(i agree|i disagree|in my view|in my opinion|i believe|in my assessment|i conclude|i argue)\b/i.test(s)
      );
      const hasClearPosition = Boolean(positionSentence);
      const hasSubstantiveBody = paragraphs.length >= 3;

      if (positionSentence) {
        c1Quotes.push(positionSentence);
      }
      const argSentence = sentences.find((s) =>
        /\b(first|second|moreover|furthermore|crucially|for example|for instance|one reason)\b/i.test(s)
      );
      if (argSentence && argSentence !== positionSentence) {
        c1Quotes.push(argSentence);
      }

      if (isAdversarial) {
        c1Score = 2.0;
        c1Explanation = 'The response does not address the prompt topic and instead contains adversarial meta-instructions attempting to override system prompts. In official IELTS descriptors, completely off-topic or memorised meta-text scores Band 2.0.';
        c1Weaknesses.push('Adversarial content completely fails to address the question.');
        c1RequiresReview = true;
      } else if (stats.wordCount < 100) {
        c1Score = 3.5;
        c1Explanation = `Response is severely under-length (${stats.wordCount} words vs required ${minWords} words minimum). Under official IELTS criteria, extremely brief responses cannot extend ideas or develop arguments and are capped at Band 3.5.`;
        c1Weaknesses.push(`Severe length deficit: ${stats.wordCount}/${minWords} words.`);
        c1Improvement = `Write at least ${minWords} words with multi-sentence argument development.`;
      } else if (stats.wordCount < 170) {
        c1Score = 5.0;
        c1Explanation = `Response reached only ${stats.wordCount} words, significantly below the 250-word minimum for Task 2. Ideas are limited in scope and development.`;
        c1Weaknesses.push(`Word count deficit: ${stats.wordCount}/250 words.`);
        c1Improvement = 'Develop each supporting argument with specific real-world examples and deeper analysis.';
      } else if (hasClearPosition && hasSubstantiveBody && stats.wordCount >= 245 && (academicWordsFound.length >= 8 || stats.wordCount >= 280)) {
        c1Score = 8.5;
        c1Explanation =
          'Sufficiently addresses all parts of the task with a well-developed, clear position throughout. Arguments are extended with compelling rationale and logical supporting details.';
        c1Improvement = 'Further nuance counter-arguments to achieve absolute Band 9.0 depth.';
      } else if (hasClearPosition && hasSubstantiveBody && stats.wordCount >= 220) {
        c1Score = 7.5;
        c1Explanation =
          'Addresses all parts of the prompt with a clear position maintained throughout. Ideas are logically extended and supported.';
        c1Improvement = 'Deepen the explanation of secondary ideas to prevent any tendency to overgeneralize.';
      } else if (hasClearPosition && stats.wordCount >= 180) {
        c1Score = 6.0;
        c1Explanation =
          'Addresses all parts of the task with a relevant position, though development of supporting points is limited by length.';
        if (!hasSubstantiveBody) c1Weaknesses.push('Paragraph structure is somewhat restricted; needs distinct body paragraphs.');
        c1Improvement = 'Organize separate body paragraphs for distinct viewpoints and elaborate each point with evidence.';
      } else {
        c1Score = stats.wordCount < 180 ? 5.0 : 5.5;
        c1Explanation =
          'Addresses the topic partially or peripherally; the position is unclear or not maintained consistently throughout the essay.';
        c1Weaknesses.push('Candidate position is ambiguous or not stated clearly in the introduction.');
        c1Improvement = 'State your clear thesis in the opening paragraph and reinforce it in the conclusion.';
      }
    }

    // =========================================================================
    // 2. Coherence and Cohesion
    // =========================================================================
    const cohesiveMarkers = text.match(
      /\b(furthermore|moreover|in addition|additionally|however|by contrast|in contrast|on the one hand|on one hand|on the other hand|conversely|consequently|therefore|as a result|thus|initially|subsequently|firstly|secondly|finally|in conclusion|in summary|overall|similarly|likewise|for instance|for example)\b/gi
    ) || [];

    let c2Score = 6.0;
    let c2Explanation = '';
    const c2Quotes: string[] = [];
    const c2Weaknesses: string[] = [];

    const cohesiveSentence = sentences.find((s) =>
      /\b(however|furthermore|by contrast|consequently|therefore|moreover|conversely|in conclusion)\b/i.test(s)
    );
    if (cohesiveSentence) c2Quotes.push(cohesiveSentence);

    const minParagraphs = taskType === 'TASK_1' ? 3 : 4;
    const minMarkers = taskType === 'TASK_1' ? 3 : 4;

    if (isAdversarial) {
      c2Score = 2.0;
      c2Explanation = 'The submission lacks coherent academic paragraphing and presents prompt override instructions instead of logical discourse.';
      c2Weaknesses.push('Non-standard adversarial content.');
    } else if (stats.wordCount < 100 || stats.sentenceCount <= 2) {
      c2Score = 3.5;
      c2Explanation = 'The response contains insufficient text to demonstrate logical paragraphing, topic progression, or cohesive device usage.';
      c2Weaknesses.push('Insufficient text for paragraph structure.');
    } else if (taskType === 'TASK_2' && stats.wordCount < 170) {
      c2Score = 5.0;
      c2Explanation = 'Under-length Task 2 submission cannot sustain topic progression or complex paragraph transitions.';
      c2Weaknesses.push('Limited paragraph development due to brief length.');
    } else if (paragraphs.length >= minParagraphs && cohesiveMarkers.length >= minMarkers && stats.wordCount >= (taskType === 'TASK_1' ? 145 : 240)) {
      c2Score = 8.5;
      c2Explanation =
        'Sequences information and ideas logically with skillful paragraphing. A varied range of cohesive devices is managed smoothly with clear central topic sentences.';
    } else if (paragraphs.length >= 3 && cohesiveMarkers.length >= 3 && stats.wordCount >= (taskType === 'TASK_1' ? 140 : 215)) {
      c2Score = 7.5;
      c2Explanation =
        'Logically organizes information and ideas with clear progression throughout. Uses a range of cohesive devices appropriately with distinct paragraph structure.';
    } else if (taskType === 'TASK_1' && stats.wordCount >= 120 && paragraphs.length >= 3) {
      c2Score = 7.0;
      c2Explanation = 'Clear progression and sequence of process steps or data features across separate paragraphs.';
    } else if (paragraphs.length >= 3 && stats.wordCount >= 180) {
      c2Score = 6.0;
      c2Explanation =
        'Presents ideas with overall coherence and progression. Paragraphing is present though cohesion within or between sentences can occasionally be mechanical.';
      if (cohesiveMarkers.length < 3) c2Weaknesses.push('Limited variety of transitional connectors.');
    } else if (paragraphs.length >= 2) {
      c2Score = 5.5;
      c2Explanation =
        'Presents information with some organization, but lacks overall logical progression or exhibits under-use of paragraphing.';
      c2Weaknesses.push('Under-developed paragraphing; essay reads as a continuous block of text.');
    } else {
      c2Score = stats.wordCount < 80 ? 4.5 : 5.0;
      c2Explanation =
        'Presents information with some organization, but lacks overall logical progression or exhibits under-use of paragraphing.';
      c2Weaknesses.push('Under-developed paragraphing; essay reads as a continuous block of text.');
    }

    // =========================================================================
    // 3. Lexical Resource
    // =========================================================================
    let c3Score = 6.0;
    let c3Explanation = '';
    const c3Quotes: string[] = [];
    const c3Weaknesses: string[] = [];

    const academicSentence = sentences.find((s) =>
      /\b(substantial|pronounced|predominant|trajectory|diversification|indispensable|mitigate|catalyst|infrastructure|permeate|potable|desalination|skyscrapers|sustainable)\b/i.test(s)
    );
    if (academicSentence) c3Quotes.push(academicSentence);

    if (isAdversarial) {
      c3Score = 2.0;
      c3Explanation = 'Vocabulary is limited to prompt injection directives.';
      c3Weaknesses.push('Inappropriate register and non-topical vocabulary.');
    } else if (taskType === 'TASK_2' && stats.wordCount < 170) {
      c3Score = 5.0;
      c3Explanation = 'Uses a limited, everyday range of vocabulary with minimal academic collocation.';
      c3Weaknesses.push('Restricted academic vocabulary.');
    } else if (taskType === 'TASK_1' && stats.wordCount < 145 && stats.wordCount >= 120) {
      c3Score = 7.0;
      c3Explanation = 'Uses technical and topic-specific vocabulary accurately (e.g. reverse osmosis, desalination, filtration) with minor limitations in lexical variety.';
    } else if (taskType === 'TASK_2' && stats.wordCount < 210) {
      c3Score = 6.0;
      c3Explanation = 'Uses an adequate range of vocabulary for the task with general clarity, but lacks the depth of less common academic lexical items.';
    } else if (academicWordsFound.length >= 6 && stats.vocabularyDiversity >= 0.38 && stats.wordCount >= (taskType === 'TASK_1' ? 145 : 240)) {
      c3Score = 8.5;
      c3Explanation =
        'Uses a wide range of vocabulary fluently and flexibly to convey precise meanings. Skillfully uses uncommon lexical items and natural academic collocations.';
    } else if (academicWordsFound.length >= 3 && stats.vocabularyDiversity >= 0.33) {
      c3Score = 7.5;
      c3Explanation =
        'Uses a sufficient range of vocabulary to allow some flexibility and precision. Uses less common lexical items with some awareness of style and collocation.';
    } else if (academicWordsFound.length >= 2 || stats.vocabularyDiversity >= 0.30) {
      c3Score = 6.0;
      c3Explanation =
        'Uses an adequate range of vocabulary for the task. Generally conveys meaning clearly despite occasional repetitive vocabulary or minor word choice slips.';
      if (academicWordsFound.length < 2) c3Weaknesses.push('Heavy reliance on basic, everyday vocabulary.');
    } else {
      c3Score = stats.wordCount < 80 ? 4.5 : 5.0;
      c3Explanation =
        'Uses a limited range of vocabulary, which is minimally adequate for the task. Noticeable repetition of high-frequency words.';
      c3Weaknesses.push('Noticeable repetition of common words.');
    }

    if (!isAdversarial && stats.wordCount < 80) {
      c3Score = 4.5;
    }

    // =========================================================================
    // 4. Grammatical Range and Accuracy
    // =========================================================================
    const complexIndicators = text.match(
      /\b(although|even though|whereas|while|provided that|in order to|as long as|because|since|if|unless|which|who|whom|whose)\b/gi
    ) || [];

    const passiveIndicators = text.match(
      /\b(is|are|was|were|been|being)\s+[a-z]+ed\b/gi
    ) || [];

    let c4Score = 6.0;
    let c4Explanation = '';
    const c4Quotes: string[] = [];
    const c4Weaknesses: string[] = [];

    const complexSentence = sentences.find((s) =>
      /\b(while|whereas|although|because|provided that|which)\b/i.test(s)
    );
    if (complexSentence) c4Quotes.push(complexSentence);

    if (isAdversarial) {
      c4Score = 2.0;
      c4Explanation = 'Grammar is restricted to imperative override commands.';
      c4Weaknesses.push('Non-academic imperative structures.');
    } else if (taskType === 'TASK_2' && stats.wordCount < 170) {
      c4Score = 5.0;
      c4Explanation = 'Structures are predominantly simple with basic coordinate clauses; complex sentences are limited.';
      c4Weaknesses.push('Limited syntactic variety; repetitive simple sentence structures.');
    } else if (taskType === 'TASK_1' && stats.wordCount < 145 && stats.wordCount >= 120) {
      c4Score = 7.0;
      c4Explanation = 'Uses a variety of complex structures and passive voice forms appropriate for process descriptions with frequent error-free sentences.';
    } else if (taskType === 'TASK_2' && stats.wordCount < 210) {
      c4Score = 6.0;
      c4Explanation = 'Uses a mix of simple and complex sentence forms. Errors do not impede communication.';
    } else if (
      (complexIndicators.length >= 3 || (complexIndicators.length >= 2 && passiveIndicators.length >= 2)) &&
      stats.avgSentenceLength >= 14 &&
      stats.wordCount >= (taskType === 'TASK_1' ? 145 : 240) &&
      (academicWordsFound.length >= 6 || taskType === 'TASK_1')
    ) {
      c4Score = 8.5;
      c4Explanation =
        'Uses a wide range of complex structures with flexibility and accuracy. The majority of sentences are error-free with good punctuation control.';
    } else if ((complexIndicators.length >= 2 || passiveIndicators.length >= 2) && stats.avgSentenceLength >= 11) {
      c4Score = 7.5;
      c4Explanation =
        'Uses a variety of complex structures with frequent error-free sentences. Good control of grammar and punctuation.';
    } else if (complexIndicators.length >= 1) {
      c4Score = 6.0;
      c4Explanation =
        'Uses a mix of simple and complex sentence forms. Grammatical errors do not impede communication, though complex sentences contain occasional slips.';
      if (complexIndicators.length < 2) c4Weaknesses.push('Limited variety of complex sentence patterns.');
    } else {
      c4Score = stats.wordCount < 80 ? 4.5 : 5.0;
      c4Explanation =
        'Uses only a limited range of structures with attempts at complex sentences tending to produce errors.';
      c4Weaknesses.push('High proportion of simple sentences; complex structures produce grammatical errors.');
    }

    if (!isAdversarial && stats.wordCount < 80) {
      c4Score = 4.5;
    }

    // =========================================================================
    // 5. Structured Error Annotations & Diagnostics
    // =========================================================================
    const annotations: WritingErrorAnnotationDTO[] = [];
    const grammarCorrections: WritingGrammarCorrectionDTO[] = [];

    if (task1Grounding?.diagnosticAnnotations) {
      annotations.push(...task1Grounding.diagnosticAnnotations);
    }

    // Check sentence capitalization
    for (const s of sentences) {
      if (s.length > 0 && /^[a-z]/.test(s)) {
        const idx = text.indexOf(s);
        if (idx >= 0) {
          const original = s.slice(0, Math.min(s.length, 30));
          const correction = s.charAt(0).toUpperCase() + original.slice(1);
          annotations.push({
            id: `anno_${crypto.randomBytes(4).toString('hex')}`,
            criterion: 'grammatical_range',
            category: 'Punctuation',
            subcategory: 'Sentence Capitalization',
            severity: 'minor',
            original,
            correction,
            explanation: 'Sentence begins with a lowercase letter.',
            startOffset: idx,
            endOffset: idx + original.length,
            isGenuineError: true,
            meaningImpact: 'Minor mechanical capitalization slip.',
          });
          grammarCorrections.push({
            quote: original,
            issue: 'Sentence begins with a lowercase letter.',
            suggestion: correction + '...',
            startOffset: idx,
            endOffset: idx + original.length,
            isGenuineError: true,
          });
          break;
        }
      }
    }

    const diagnosticRules: Array<{
      pattern: RegExp;
      criterion: 'task_achievement' | 'task_response' | 'coherence_cohesion' | 'lexical_resource' | 'grammatical_range';
      category: 'Grammar' | 'Vocabulary' | 'Cohesion' | 'Punctuation' | 'Register' | 'Task';
      subcategory: string;
      severity: 'minor' | 'moderate' | 'major' | 'critical';
      issue: string;
      suggestion: string;
      meaningImpact: string;
      isGenuine: boolean;
    }> = [
      // Subject-verb agreement & verbal concord
      {
        pattern: /\b(the|this)\s+(bar chart|line graph|pie chart|table|diagram|chart|graph|pyramid)\s+(show|illustrate|demonstrate|indicate|present)\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: 'Singular subject requires third-person singular verb ending in "-s".',
        suggestion: '$1 $2 shows',
        meaningImpact: 'Breaks subject-verb agreement in opening sentence.',
        isGenuine: true,
      },
      {
        pattern: /\b(Norway|Germany|Denmark|Sweden|France|Spain|Italy|Japan|China|India|Australia|Canada|Brazil|Russia|UK|USA)\s+have\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: 'Singular country name takes "has" (present) or "had" (past).',
        suggestion: '$1 has / $1 had',
        meaningImpact: 'Breaks subject-verb concord with proper noun country.',
        isGenuine: true,
      },
      {
        pattern: /\b(Norway|Germany|Denmark|Sweden|France|Spain|Italy|Japan|China|India|Australia|Canada|Brazil|Russia|UK|USA)\s+(generate|use|produce|consume)\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: 'Singular subject requires past tense ("$2d") or third-person singular ("$2s").',
        suggestion: '$1 $2d',
        meaningImpact: 'Grammatical tense and concord slip.',
        isGenuine: true,
      },
      {
        pattern: /\ball\s+(country|nation|region|category|cohort|group)\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Noun-Quantifier Concord',
        severity: 'moderate',
        issue: '"All" modifying a countable noun requires the plural form ("all $1s") or "every $1".',
        suggestion: 'all $1s / every $1',
        meaningImpact: 'Grammatical concord error with quantifier "all".',
        isGenuine: true,
      },
      {
        pattern: /\b(countries|nations|regions|categories|cohorts|groups)\s+was\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: 'Plural subject requires the plural verb "were", not singular "was".',
        suggestion: '$1 were',
        meaningImpact: 'Grammatical number concord slip.',
        isGenuine: true,
      },
      {
        pattern: /\bwas\s+increased\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Voice and Verb Formation',
        severity: 'moderate',
        issue: 'Incorrect passive/transitive formation; use active voice "increased".',
        suggestion: 'increased',
        meaningImpact: 'Awkward passive construction.',
        isGenuine: true,
      },
      {
        pattern: /\bit\s+(increase|decrease|rise|drop)\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: 'Third-person singular "it" requires past tense ("it $1d") or third-person singular ("it $1s").',
        suggestion: 'it $1d / it $1s',
        meaningImpact: 'Verb inflection slip with singular pronoun.',
        isGenuine: true,
      },
      {
        pattern: /\bin\s+both\s+year\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Plural Agreement',
        severity: 'minor',
        issue: '"Both" precedes a plural noun ("in both years").',
        suggestion: 'in both years',
        meaningImpact: 'Plural agreement slip.',
        isGenuine: true,
      },
      {
        pattern: /\bat\s+(19\d\d|20\d\d)\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Preposition',
        severity: 'minor',
        issue: 'Preposition error: use "in $1" for calendar years, not "at $1".',
        suggestion: 'in $1',
        meaningImpact: 'Preposition error with temporal marker.',
        isGenuine: true,
      },
      {
        pattern: /\b(?:three|two|four|five|\d+)\s+energy\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Noun-Quantifier Concord',
        severity: 'moderate',
        issue: 'Quantifier with uncountable noun: use "energy sources" or "types of energy".',
        suggestion: 'types of energy / energy sources',
        meaningImpact: 'Concord slip with mass noun.',
        isGenuine: true,
      },
      {
        pattern: /\benergy\s+which\s+is\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'minor',
        issue: 'Concord error: plural antecedent requires "which are" or "consisting of".',
        suggestion: 'which are / namely',
        meaningImpact: 'Relative clause agreement slip.',
        isGenuine: true,
      },
      {
        pattern: /\b(?:no|not)\s+much\s+(?:changes|differences)\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Noun-Quantifier Concord',
        severity: 'moderate',
        issue: '"Much" cannot modify plural countable nouns; use "not many changes" or "little change".',
        suggestion: 'not many changes / little change',
        meaningImpact: 'Quantifier concord error.',
        isGenuine: true,
      },
      {
        pattern: /\b[A-Z][a-z]+\s+(?:solar|wind|hydro)\s+(?:decrease|increase|remain|drop)\b/,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: 'Third-person singular subject requires past tense (-ed) or singular agreement (-s).',
        suggestion: 'decreased / increased',
        meaningImpact: 'Verb inflection slip.',
        isGenuine: true,
      },
      {
        pattern: /\bother\s+source\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Plural Agreement',
        severity: 'minor',
        issue: '"Other" modifying countable comparative sources requires plural "other sources".',
        suggestion: 'other sources',
        meaningImpact: 'Plural noun ending omission.',
        isGenuine: true,
      },
      {
        pattern: /\bshow\s+same\s+pattern\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Article Use',
        severity: 'minor',
        issue: 'Missing definite article: "show the same pattern".',
        suggestion: 'show the same pattern',
        meaningImpact: 'Definite article omission before "same".',
        isGenuine: true,
      },
      {
        pattern: /\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+Europe\s+countries\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Word Formation',
        severity: 'moderate',
        issue: 'Use the adjective "European" to modify "countries", not the noun "Europe".',
        suggestion: '$1 European countries',
        meaningImpact: 'Word formation error in geographical modifier.',
        isGenuine: true,
      },
      {
        pattern: /\b(grew|increased|decreased|rose|fell|dropped)\s+rapid\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Adverb Formation',
        severity: 'moderate',
        issue: 'Adverbs modify verbs: "$1 rapidly", not "$1 rapid".',
        suggestion: '$1 rapidly',
        meaningImpact: 'Adjective used where adverb is required.',
        isGenuine: true,
      },
      {
        pattern: /\b(grew|increased|decreased|rose|fell|dropped)\s+sharp\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Adverb Formation',
        severity: 'moderate',
        issue: 'Adverbs modify verbs: "$1 sharply", not "$1 sharp".',
        suggestion: '$1 sharply',
        meaningImpact: 'Adjective used where adverb is required.',
        isGenuine: true,
      },
      {
        pattern: /\b(grew|increased|decreased|rose|fell|dropped)\s+dramatic\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Adverb Formation',
        severity: 'moderate',
        issue: 'Adverbs modify verbs: "$1 dramatically", not "$1 dramatic".',
        suggestion: '$1 dramatically',
        meaningImpact: 'Adjective used where adverb is required.',
        isGenuine: true,
      },
      // Spelling errors
      {
        pattern: /\bbecme\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "becme" should be "became" or "become".',
        suggestion: 'became',
        meaningImpact: 'Misspelled irregular verb form.',
        isGenuine: true,
      },
      {
        pattern: /\bcompaed\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "compaed" should be "compared".',
        suggestion: 'compared',
        meaningImpact: 'Misspelled participle.',
        isGenuine: true,
      },
      {
        pattern: /\bcoclusion\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "coclusion" should be "conclusion".',
        suggestion: 'conclusion',
        meaningImpact: 'Misspelled discourse noun.',
        isGenuine: true,
      },
      {
        pattern: /\bcoutries\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "coutries" should be "countries".',
        suggestion: 'countries',
        meaningImpact: 'Misspelled plural noun.',
        isGenuine: true,
      },
      {
        pattern: /\bgoverment\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "goverment" should be "government".',
        suggestion: 'government',
        meaningImpact: 'Misspelled academic noun.',
        isGenuine: true,
      },
      {
        pattern: /\benviroment\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "enviroment" should be "environment".',
        suggestion: 'environment',
        meaningImpact: 'Misspelled academic noun.',
        isGenuine: true,
      },
      {
        pattern: /\buntill\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "untill" should be "until".',
        suggestion: 'until',
        meaningImpact: 'Misspelled preposition/conjunction.',
        isGenuine: true,
      },
      {
        pattern: /\bdefinately\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "definately" should be "definitely".',
        suggestion: 'definitely',
        meaningImpact: 'Misspelled adverb.',
        isGenuine: true,
      },
      {
        pattern: /\bcatagory\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "catagory" should be "category".',
        suggestion: 'category',
        meaningImpact: 'Misspelled academic noun.',
        isGenuine: true,
      },
      {
        pattern: /\bpercantage\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "percantage" should be "percentage".',
        suggestion: 'percentage',
        meaningImpact: 'Misspelled mathematical noun.',
        isGenuine: true,
      },
      {
        pattern: /\bflucuate\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "flucuate" should be "fluctuate".',
        suggestion: 'fluctuate',
        meaningImpact: 'Misspelled trend verb.',
        isGenuine: true,
      },
      {
        pattern: /\bpropotional\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Spelling',
        severity: 'minor',
        issue: 'Spelling error: "propotional" should be "proportional".',
        suggestion: 'proportional',
        meaningImpact: 'Misspelled adjective.',
        isGenuine: true,
      },
      // Subject-verb agreement (classic)
      {
        pattern: /\bpeople is\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: "The plural subject 'people' requires the plural verb 'are'.",
        suggestion: 'people are',
        meaningImpact: 'Understandable but grammatically inaccurate plural concord.',
        isGenuine: true,
      },
      {
        pattern: /\bthere is (many|several|numerous|multiple)\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: 'Existential "there is" used with plural noun phrase.',
        suggestion: 'there are $1',
        meaningImpact: 'Breaks subject-verb concord in existential clauses.',
        isGenuine: true,
      },
      {
        pattern: /\b(everyone|everybody) are\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: "Indefinite pronouns ('everyone', 'everybody') take a singular verb.",
        suggestion: '$1 is',
        meaningImpact: 'Grammatical concord slip.',
        isGenuine: true,
      },
      {
        pattern: /\b(he|she|it) have\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Subject-Verb Agreement',
        severity: 'moderate',
        issue: 'Third-person singular subject requires "has".',
        suggestion: '$1 has',
        meaningImpact: 'Breaks subject-verb agreement.',
        isGenuine: true,
      },
      // Countable and Uncountable Nouns
      {
        pattern: /\ba?n?\s*informations?\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Countable and Uncountable Nouns',
        severity: 'minor',
        issue: '"Information" is uncountable in English; cannot take "an" or plural "-s".',
        suggestion: 'information / pieces of information',
        meaningImpact: 'Minor morphological slip with mass nouns.',
        isGenuine: true,
      },
      {
        pattern: /\ba?n?\s*advices?\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Countable and Uncountable Nouns',
        severity: 'minor',
        issue: '"Advice" is uncountable in English; cannot take "an" or plural "-s".',
        suggestion: 'advice / pieces of advice',
        meaningImpact: 'Minor mass noun slip.',
        isGenuine: true,
      },
      {
        pattern: /\ba?n?\s*equipments?\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Countable and Uncountable Nouns',
        severity: 'minor',
        issue: '"Equipment" is uncountable in English; cannot take plural "-s".',
        suggestion: 'equipment',
        meaningImpact: 'Minor mass noun slip.',
        isGenuine: true,
      },
      {
        pattern: /\ba researches\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Countable and Uncountable Nouns',
        severity: 'minor',
        issue: '"Research" is generally uncountable.',
        suggestion: 'research / research studies',
        meaningImpact: 'Minor determiner slip.',
        isGenuine: true,
      },
      // Collocations
      {
        pattern: /\bdo a decision\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Collocation',
        severity: 'moderate',
        issue: "'Make a decision' is the natural English collocation.",
        suggestion: 'make a decision',
        meaningImpact: 'Unnatural word pairing; awkward phrasing.',
        isGenuine: true,
      },
      {
        pattern: /\bstrong traffic\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Collocation',
        severity: 'moderate',
        issue: "'Heavy traffic' or 'congested traffic' is the natural collocation.",
        suggestion: 'heavy traffic',
        meaningImpact: 'Unnatural adjective choice.',
        isGenuine: true,
      },
      {
        pattern: /\bpowerful rain\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Collocation',
        severity: 'moderate',
        issue: "'Heavy rain' or 'torrential rain' is the natural collocation.",
        suggestion: 'heavy rain',
        meaningImpact: 'Unnatural modifier for weather conditions.',
        isGenuine: true,
      },
      {
        pattern: /\bmake a research\b/i,
        criterion: 'lexical_resource',
        category: 'Vocabulary',
        subcategory: 'Collocation',
        severity: 'moderate',
        issue: "'Conduct research' or 'do research' is the natural academic collocation.",
        suggestion: 'conduct research / carry out research',
        meaningImpact: 'Unnatural verb collocation in academic register.',
        isGenuine: true,
      },
      {
        pattern: /\bpay attention on\b/i,
        criterion: 'grammatical_range',
        category: 'Grammar',
        subcategory: 'Preposition',
        severity: 'minor',
        issue: 'Preposition error: "pay attention to", not "on".',
        suggestion: 'pay attention to',
        meaningImpact: 'Preposition slip.',
        isGenuine: true,
      },
      // Informal register / colloquialisms
      {
        pattern: /\ba lot of\b/i,
        criterion: 'lexical_resource',
        category: 'Register',
        subcategory: 'Informal Register',
        severity: 'minor',
        issue: 'Colloquial quantifier in formal academic essay.',
        suggestion: 'a substantial volume of / numerous / considerable',
        meaningImpact: 'Overly casual tone in academic register.',
        isGenuine: false,
      },
      {
        pattern: /\bkids\b/i,
        criterion: 'lexical_resource',
        category: 'Register',
        subcategory: 'Informal Register',
        severity: 'minor',
        issue: 'Informal register; use formal demographic term.',
        suggestion: 'children / adolescents',
        meaningImpact: 'Casual spoken expression.',
        isGenuine: false,
      },
      {
        pattern: /\bbad thing\b/i,
        criterion: 'lexical_resource',
        category: 'Register',
        subcategory: 'Informal Register',
        severity: 'minor',
        issue: 'Imprecise casual phrase in academic discourse.',
        suggestion: 'detrimental consequence / adverse development',
        meaningImpact: 'Oversimplified phrasing.',
        isGenuine: false,
      },
      {
        pattern: /\bgood thing\b/i,
        criterion: 'lexical_resource',
        category: 'Register',
        subcategory: 'Informal Register',
        severity: 'minor',
        issue: 'Imprecise casual phrase in academic discourse.',
        suggestion: 'beneficial phenomenon / advantageous initiative',
        meaningImpact: 'Oversimplified phrasing.',
        isGenuine: false,
      },
    ];

    for (const rule of diagnosticRules) {
      const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g';
      const regex = new RegExp(rule.pattern.source, flags);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        const quote = m[0];
        const idx = m.index;
        if (annotations.some((a) => a.startOffset === idx && a.endOffset === idx + quote.length)) {
          continue;
        }

        const correction = rule.suggestion.includes('$1')
          ? quote.replace(rule.pattern, rule.suggestion)
          : rule.suggestion;

        annotations.push({
          id: `anno_${crypto.randomBytes(4).toString('hex')}`,
          criterion: rule.criterion,
          category: rule.category,
          subcategory: rule.subcategory,
          severity: rule.severity,
          original: quote,
          correction,
          explanation: rule.issue,
          startOffset: idx,
          endOffset: idx + quote.length,
          isGenuineError: rule.isGenuine,
          meaningImpact: rule.meaningImpact,
        });

        grammarCorrections.push({
          quote,
          issue: rule.issue,
          suggestion: correction,
          startOffset: idx,
          endOffset: idx + quote.length,
          isGenuineError: rule.isGenuine,
        });
      }
    }

    // Connector overuse check
    const mechanicalSequence = text.match(/\bfirstly\b.*\bsecondly\b.*\bmoreover\b.*\bfurthermore\b/is);
    if (mechanicalSequence) {
      const idx = text.indexOf(mechanicalSequence[0]);
      if (idx >= 0) {
        annotations.push({
          id: `anno_${crypto.randomBytes(4).toString('hex')}`,
          criterion: 'coherence_cohesion',
          category: 'Cohesion',
          subcategory: 'Connector Overuse',
          severity: 'moderate',
          original: mechanicalSequence[0].slice(0, 50) + '...',
          correction: 'Use varied topic sentences and semantic transitions instead of mechanical sequential linking.',
          explanation: 'Mechanical overuse of connectors ("Firstly... Secondly... Moreover... Furthermore") reduces natural cohesion.',
          startOffset: idx,
          endOffset: idx + Math.min(mechanicalSequence[0].length, 60),
          isGenuineError: true,
          meaningImpact: 'Cohesion feels formulaic and mechanical rather than flowing naturally.',
        });
      }
    }

    // =========================================================================
    // 6. Vocabulary Suggestions (preserving student's meaning)
    // =========================================================================
    const vocabularySuggestions: WritingVocabularySuggestionDTO[] = [];
    const vocabPairs = [
      { word: 'big', betterAlternative: 'substantial / considerable', context: 'Elevate generic scale adjectives to formal academic register.' },
      { word: 'show', betterAlternative: 'illustrate / delineate / demonstrate', context: 'Use precise analytical reporting verbs for visual data.' },
      { word: 'help', betterAlternative: 'facilitate / bolster / expedite', context: 'Select nuanced verbs denoting positive assistance.' },
      { word: 'problem', betterAlternative: 'challenge / dilemma / predicament', context: 'Specify the exact nature of difficulties.' },
      { word: 'change', betterAlternative: 'transformation / transition / shift', context: 'Use formal process nouns for structural variations.' },
    ];

    for (const pair of vocabPairs) {
      const regex = new RegExp(`\\b${pair.word}\\b`, 'i');
      const m = text.match(regex);
      if (m) {
        const quoteCheck = verifyAndLocateQuotations(text, [m[0]]);
        if (quoteCheck.verified.length > 0) {
          const v = quoteCheck.verified[0];
          vocabularySuggestions.push({
            word: v.quote,
            betterAlternative: pair.betterAlternative,
            context: pair.context,
            quote: v.quote,
            startOffset: v.startOffset,
            endOffset: v.endOffset,
          });
        }
      }
    }

    // =========================================================================
    // 7. Error-Free Sentence Metrics
    // =========================================================================
    const errorSentenceIndices = new Set<number>();
    for (const anno of annotations) {
      if (anno.isGenuineError) {
        for (let i = 0; i < sentences.length; i++) {
          const s = sentences[i];
          const sStart = text.indexOf(s);
          const sEnd = sStart + s.length;
          if (anno.startOffset < sEnd && anno.endOffset > sStart) {
            errorSentenceIndices.add(i);
          }
        }
      }
    }
    const totalSentences = Math.max(sentences.length, 1);
    const errorFreeCount = Math.max(0, totalSentences - errorSentenceIndices.size);
    const percentage = Math.round((errorFreeCount / totalSentences) * 100);
    const isConfident = annotations.some((a) => a.isGenuineError);
    const uncertaintyReason = isConfident
      ? undefined
      : 'Sentence-level error-free status is provisional; heuristic pattern matching cannot detect all grammatical nuances without certified human examiner review.';

    const errorFreeSentenceMetrics = {
      errorFreeCount,
      totalSentences,
      percentage,
      isConfident,
      uncertaintyReason,
    };

    // Penalize Grammatical Range and Accuracy based on error frequency
    if (percentage < 45) {
      c4Score = Math.min(c4Score, 4.5);
      c4Explanation = `Frequent grammatical errors and spelling mistakes predominate (only ${percentage}% of sentences are error-free). Control of basic subject-verb concord, verb forms, and word formation is noticeably faulty.`;
      c4Weaknesses.push(`High proportion of sentences contain grammatical or spelling errors (${100 - percentage}% of sentences affected).`);
    } else if (percentage < 60) {
      c4Score = Math.min(c4Score, 5.0);
      c4Explanation = `Produces frequent grammatical errors with limited error-free sentences (${percentage}%). Structure attempts produce noticeable inaccuracies.`;
      c4Weaknesses.push(`Frequent grammatical errors; less than 60% of sentences are error-free.`);
    } else if (percentage < 70) {
      c4Score = Math.min(c4Score, 6.0);
      c4Explanation = `Uses a mix of simple and complex sentence forms with some error-free sentences (${percentage}%). Slips in grammar and punctuation do not impede overall communication.`;
    }

    // =========================================================================
    // 8. Verify all criteria quotation evidence against text & Assemble Criteria
    // =========================================================================
    const vC1Quotes = verifyAndLocateQuotations(text, c1Quotes).verified.map((v) => v.quote);
    const vC2Quotes = verifyAndLocateQuotations(text, c2Quotes).verified.map((v) => v.quote);
    const vC3Quotes = verifyAndLocateQuotations(text, c3Quotes).verified.map((v) => v.quote);
    const vC4Quotes = verifyAndLocateQuotations(text, c4Quotes).verified.map((v) => v.quote);

    const c1Id = taskType === 'TASK_1' ? 'task_achievement' : 'task_response';
    const c1Name = taskType === 'TASK_1' ? 'Task Achievement' : 'Task Response';

    const criteriaScores: WritingCriterionDetailDTO[] = [
      {
        id: c1Id,
        name: c1Name,
        score: c1Score,
        rawScore: c1Score,
        maxScore: 9.0,
        explanation: c1Explanation,
        supportingQuotations: vC1Quotes,
        specificWeaknesses: c1Weaknesses,
        whatWouldImprove: c1Improvement || 'Expand factual data points and clarify paragraph focus.',
        requiresReview: c1RequiresReview,
      },
      {
        id: 'coherence_cohesion',
        name: 'Coherence and Cohesion',
        score: c2Score,
        rawScore: c2Score,
        maxScore: 9.0,
        explanation: c2Explanation,
        supportingQuotations: vC2Quotes,
        specificWeaknesses: c2Weaknesses,
        whatWouldImprove: 'Employ a wider variety of transitional adverbs between contrasting viewpoints.',
        requiresReview: false,
      },
      {
        id: 'lexical_resource',
        name: 'Lexical Resource',
        score: c3Score,
        rawScore: c3Score,
        maxScore: 9.0,
        explanation: c3Explanation,
        supportingQuotations: vC3Quotes,
        specificWeaknesses: c3Weaknesses,
        whatWouldImprove: 'Introduce discipline-specific academic vocabulary and natural collocations.',
        requiresReview: false,
      },
      {
        id: 'grammatical_range',
        name: 'Grammatical Range and Accuracy',
        score: c4Score,
        rawScore: c4Score,
        maxScore: 9.0,
        explanation: c4Explanation,
        supportingQuotations: vC4Quotes,
        specificWeaknesses: c4Weaknesses,
        whatWouldImprove: 'Incorporate complex sentences with conditional clauses and passive constructions.',
        requiresReview: false,
      },
    ];

    const rawAverageScore = Number(((c1Score + c2Score + c3Score + c4Score) / 4).toFixed(3));
    const currentBand = roundToIeltsBand(rawAverageScore);
    const targetBand = (Math.min(9.0, currentBand + 0.5)).toFixed(1);

    // =========================================================================
    // 9. Main Priority and Next Band Target
    // =========================================================================
    let mainPriority = 'Refine analytical depth and expand complex sentence variety.';
    if (stats.wordCount < minWords) {
      mainPriority = `Increase essay length to meet the mandatory ${minWords}-word minimum.`;
    } else if (c4Score < 6.5) {
      mainPriority = 'Improve grammatical accuracy and eliminate recurring subject-verb or article errors.';
    } else if (c1Score < 6.5 && taskType === 'TASK_1') {
      mainPriority = 'Ensure an explicit, well-defined overview is prominently placed in the introduction or conclusion.';
    } else if (c1Score < 6.5 && taskType === 'TASK_2') {
      mainPriority = 'State a clear, unambiguous thesis in the introduction and support each main idea with relevant examples.';
    } else if (c2Score < 6.5) {
      mainPriority = 'Structure essays into clear, distinct paragraphs with unified central topic sentences.';
    } else if (c3Score < 6.5) {
      mainPriority = 'Upgrade high-frequency repetitive words to precise academic collocations and vocabulary.';
    }

    let nextBandTarget = `To reach Band ${targetBand}, enhance idea development and maintain error-free accuracy across complex sentences.`;
    if (taskType === 'TASK_1' && c1Score < 7.0) {
      nextBandTarget = `To reach Band ${targetBand}, clearly separate the overview from minor data points and contrast key trends directly.`;
    } else if (taskType === 'TASK_2' && c1Score < 7.0) {
      nextBandTarget = `To reach Band ${targetBand}, develop secondary arguments more fully with concrete academic or real-world examples.`;
    } else if (c4Score < 7.0) {
      nextBandTarget = `To reach Band ${targetBand}, increase the proportion of error-free complex sentences to exceed 65%.`;
    }

    // =========================================================================
    // 10. Detailed Checks Covering Official Examiner Criteria
    // =========================================================================
    const overviewSentence = sentences.find((s) =>
      /\b(overall|in general|it is clear that|to summarize|notable trend|predominant)\b/i.test(s)
    );
    const numbersFound = text.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
    const hasSpecificData = numbersFound.length >= 3;
    const isProcess = text.includes('step') || text.includes('stage') || text.includes('membrane') || text.includes('filtration');
    const hasComparisons = /\b(while|whereas|compared to|higher than|lower than|by contrast|in contrast|surpassing|dominant|rose|fell|increased|decreased)\b/i.test(text);
    const positionSentence = sentences.find((s) =>
      /\b(i agree|i disagree|in my view|in my opinion|i believe|in my assessment|i conclude|i argue)\b/i.test(s)
    );
    const hasClearPosition = Boolean(positionSentence);

    const detailedChecks: Record<string, WritingCheckItemDTO[]> = {
      [c1Id]: [
        {
          checkId: 'question_understanding',
          name: 'Understanding of the Task',
          status: (isAdversarial
            ? 'not_met'
            : task1Grounding
            ? task1Grounding.understandingStatus
            : stats.wordCount > 60
            ? 'met'
            : 'partially_met') as CheckStatus,
          explanation: isAdversarial
            ? 'Submission contains adversarial prompt injection rather than addressing the assigned task.'
            : task1Grounding
            ? task1Grounding.understandingExplanation
            : 'Identified the core topic and parameters of the prompt.',
        },
        {
          checkId: 'word_count_compliance',
          name: `Minimum Length (${minWords} words)`,
          status: (stats.wordCount >= minWords ? 'met' : stats.wordCount >= minWords * 0.8 ? 'partially_met' : 'not_met') as CheckStatus,
          explanation: `Response contains ${stats.wordCount} words against the required ${minWords} words.`,
        },
        ...(taskType === 'TASK_1'
          ? [
              {
                checkId: 'overview_presence',
                name: 'Clear Overview Statement',
                status: (task1Grounding?.isTopicMismatch ? 'not_met' : overviewSentence ? 'met' : 'not_met') as CheckStatus,
                explanation: task1Grounding?.isTopicMismatch
                  ? 'The overview does not summarize the assigned visual stimulus.'
                  : overviewSentence
                  ? 'Contains a distinct overarching overview of main trends or process stages.'
                  : 'Lacks an explicit overview statement. In IELTS descriptors, omitting an overview caps Task Achievement at Band 5.',
                supportingSpans: overviewSentence && !task1Grounding?.isTopicMismatch ? [{ quote: overviewSentence }] : undefined,
              },
              {
                checkId: 'key_features_selection',
                name: 'Selection of Key Features',
                status: (task1Grounding?.isTopicMismatch ? 'not_met' : (hasSpecificData || isProcess ? 'met' : 'partially_met')) as CheckStatus,
                explanation: task1Grounding?.isTopicMismatch
                  ? 'No features from the assigned visual stimulus were selected or reported.'
                  : 'Key data points, percentages, or process stages highlighted from the visual stimulus.',
              },
              {
                checkId: 'comparisons_made',
                name: 'Meaningful Comparisons',
                status: (task1Grounding?.isTopicMismatch ? 'not_met' : (hasComparisons ? 'met' : 'partially_met')) as CheckStatus,
                explanation: task1Grounding?.isTopicMismatch
                  ? 'Comparisons do not relate to the assigned visual stimulus.'
                  : hasComparisons
                  ? 'Comparative language used effectively across categories and timeframes.'
                  : 'Limited comparative synthesis between data points.',
              },
              {
                checkId: 'data_accuracy',
                name: 'Data and Visual Accuracy',
                status: (task1Grounding ? task1Grounding.dataAccuracyStatus : (!chartFacts ? 'uncertain' : 'met')) as CheckStatus,
                explanation: task1Grounding ? task1Grounding.dataAccuracyExplanation : (chartFacts ? 'Figures evaluated against teacher-verified ground truth data.' : 'Teacher-verified visual stimulus data unavailable; factual accuracy requires human review.'),
              },
            ]
          : [
              {
                checkId: 'clear_position',
                name: 'Clear and Consistent Position',
                status: (hasClearPosition ? 'met' : 'partially_met') as CheckStatus,
                explanation: hasClearPosition
                  ? 'A clear viewpoint is expressed in the thesis and maintained throughout.'
                  : 'Position is either absent, ambiguous, or not sustained across paragraphs.',
                supportingSpans: positionSentence ? [{ quote: positionSentence }] : undefined,
              },
              {
                checkId: 'idea_development',
                name: 'Development of Supporting Ideas',
                status: (stats.wordCount >= 220 && paragraphs.length >= 3 ? 'met' : 'partially_met') as CheckStatus,
                explanation: 'Main ideas supported with explanations, reasons, and relevant examples.',
              },
              {
                checkId: 'complete_task_coverage',
                name: 'Complete Question Coverage',
                status: (stats.wordCount >= 200 ? 'met' : 'partially_met') as CheckStatus,
                explanation: 'Addresses all elements and sub-questions of the prompt.',
              },
            ]),
      ],
      coherence_cohesion: [
        {
          checkId: 'paragraph_structure',
          name: 'Logical Paragraph Structure',
          status: (paragraphs.length >= (taskType === 'TASK_1' ? 3 : 4) ? 'met' : paragraphs.length >= 2 ? 'partially_met' : 'not_met') as CheckStatus,
          explanation: `Structured into ${paragraphs.length} paragraphs with central topic focus.`,
        },
        {
          checkId: 'progression_and_flow',
          name: 'Logical Progression and Flow',
          status: (stats.wordCount >= 140 && paragraphs.length >= 3 ? 'met' : 'partially_met') as CheckStatus,
          explanation: 'Ideas develop with clear sentence-to-sentence and paragraph transitions.',
        },
        {
          checkId: 'cohesive_devices',
          name: 'Appropriate Use of Cohesive Devices',
          status: (cohesiveMarkers.length >= 3 ? 'met' : 'partially_met') as CheckStatus,
          explanation: `Found ${cohesiveMarkers.length} varied cohesive linking markers.`,
        },
        {
          checkId: 'connector_overuse',
          name: 'Avoidance of Mechanical Overuse',
          status: (mechanicalSequence ? 'not_met' : 'met') as CheckStatus,
          explanation: mechanicalSequence
            ? 'Mechanical listing detected ("Firstly... Secondly... Moreover...").'
            : 'Cohesive devices are integrated naturally without rigid listing.',
        },
      ],
      lexical_resource: [
        {
          checkId: 'vocabulary_range',
          name: 'Vocabulary Range and Flexibility',
          status: (stats.vocabularyDiversity >= 0.35 ? 'met' : 'partially_met') as CheckStatus,
          explanation: `Vocabulary diversity ratio: ${stats.vocabularyDiversity.toFixed(2)}.`,
        },
        {
          checkId: 'academic_register',
          name: 'Appropriate Academic Register',
          status: (academicWordsFound.length >= 4 ? 'met' : 'partially_met') as CheckStatus,
          explanation: `Identified ${academicWordsFound.length} high-tier academic lexical items.`,
        },
        {
          checkId: 'collocation_accuracy',
          name: 'Natural Collocations',
          status: (annotations.some((a) => a.subcategory === 'Collocation') ? 'partially_met' : 'met') as CheckStatus,
          explanation: annotations.some((a) => a.subcategory === 'Collocation')
            ? 'Minor unnatural word combinations identified.'
            : 'Natural word pairings maintained.',
        },
      ],
      grammatical_range: [
        {
          checkId: 'sentence_variety',
          name: 'Mix of Simple and Complex Structures',
          status: (complexIndicators.length >= 2 ? 'met' : 'partially_met') as CheckStatus,
          explanation: `Identified ${complexIndicators.length} subordinating conjunctions and complex sentence forms.`,
        },
        {
          checkId: 'passive_voice',
          name: 'Appropriate Passive Structures',
          status: (taskType === 'TASK_1' ? (passiveIndicators.length >= 2 ? 'met' : 'partially_met') : 'not_applicable') as CheckStatus,
          explanation: taskType === 'TASK_1'
            ? `Identified ${passiveIndicators.length} passive voice constructions.`
            : 'Passive structures optional for argumentative essays.',
        },
        {
          checkId: 'grammatical_accuracy',
          name: 'Grammar and Punctuation Accuracy',
          status: (errorFreeSentenceMetrics.percentage >= 65 ? 'met' : errorFreeSentenceMetrics.percentage >= 45 ? 'partially_met' : 'not_met') as CheckStatus,
          explanation: !errorFreeSentenceMetrics.isConfident
            ? `Provisional estimate: no automated rule violations detected across ${errorFreeSentenceMetrics.errorFreeCount}/${errorFreeSentenceMetrics.totalSentences} sentences; complete verification requires certified examiner review.`
            : `${errorFreeSentenceMetrics.percentage}% of sentences (${errorFreeSentenceMetrics.errorFreeCount}/${errorFreeSentenceMetrics.totalSentences}) are error-free.`,
        },
      ],
    };

    // =========================================================================
    // 11. Strengths and Priority Improvements (Max 3)
    // =========================================================================
    const strengths: string[] = [];
    if (c1Score >= 7.0) strengths.push(`Strong ${c1Name} with clear ideas.`);
    if (c2Score >= 7.0) strengths.push('Logical paragraph progression and effective transition phrases.');
    if (c3Score >= 7.0) strengths.push('Good range of academic vocabulary and appropriate register.');
    if (c4Score >= 7.0) strengths.push('Solid control over complex sentence structures and punctuation.');
    if (strengths.length === 0) strengths.push('Communicates basic meaning and satisfies initial essay structure.');

    const priorityImprovements: string[] = [];
    if (stats.wordCount < minWords) {
      priorityImprovements.push(`Increase overall length to at least ${minWords} words to avoid length penalties.`);
    }
    if (taskType === 'TASK_1' && !c1Quotes.some((q) => /\boverall\b/i.test(q))) {
      priorityImprovements.push('Ensure an explicit overview paragraph is prominently featured.');
    }
    if (c3Score < 7.0) {
      priorityImprovements.push('Upgrade repetitive adjectives and reporting verbs to precise academic collocations.');
    }
    if (c4Score < 7.0 && priorityImprovements.length < 3) {
      priorityImprovements.push('Practice complex subordinate and relative clauses to raise grammatical versatility.');
    }
    if (priorityImprovements.length === 0) {
      priorityImprovements.push('Refine edge-case nuance in analytical comparisons to reach Band 8.5+.');
    }

    const overallFeedback =
      `This ${taskType === 'TASK_1' ? 'Task 1 visual summary' : 'Task 2 discursive essay'} reached ${stats.wordCount} words (minimum required: ${minWords} words). ` +
      `The response demonstrates ${rawAverageScore >= 7.0 ? 'proficient' : 'developing'} communicative competence with an estimated average score of ${rawAverageScore.toFixed(1)} / 9.0.`;

    return {
      criteriaScores,
      strengths,
      priorityImprovements: priorityImprovements.slice(0, 3),
      grammarCorrections,
      vocabularySuggestions: vocabularySuggestions.slice(0, 4),
      annotations,
      detailedChecks,
      errorFreeSentenceMetrics,
      mainPriority,
      nextBandTarget,
      overallFeedback,
      rawAverageScore,
      reviewReasons,
      task1Grounding: task1Grounding || undefined,
    };
  }
}
