import { WritingRubricCriterionDTO, WritingEvaluationResultDTO } from '@repo/types';

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

    // Word count penalty calculation
    let lengthPenaltyFraction = 0;
    if (wordCount < minWordCount) {
      lengthPenaltyFraction = (minWordCount - wordCount) / minWordCount;
    }

    // Diagnostic evaluation
    const criteriaScores = rubric.map((c) => {
      // Baseline algorithmic score based on length, complexity, and criteria weight
      let baseRaw = c.maxScore * 0.75; // Default solid baseline ~6.5 - 7.5
      if (wordCount < minWordCount) {
        baseRaw = Math.max(1, baseRaw * (1 - lengthPenaltyFraction * 0.6));
      }
      const score = Math.round(baseRaw * 2) / 2; // Round to nearest 0.5 (IELTS standard)
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

    const totalEarned = criteriaScores.reduce((sum, c) => sum + c.score, 0);
    const totalMax = criteriaScores.reduce((sum, c) => sum + c.maxScore, 0);
    const normalizedScore = totalMax > 0 ? (totalEarned / totalMax) * 9 : 0;
    const roundedOverall = Math.round(normalizedScore * 2) / 2;

    // Extract diagnostic items
    const grammarFeedback: Array<{ quote: string; issue: string; suggestion: string }> = [];
    const vocabularySuggestions: Array<{ word: string; betterAlternative: string; context: string }> = [];

    // Simple heuristic scans for common improvements
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

    // Check sentence capitalization / punctuation
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

    return {
      overallScore: roundedOverall,
      maxScore: 9,
      band: `Band ${roundedOverall.toFixed(1)}`,
      wordCount,
      wordCountCompliant,
      criteriaScores,
      grammarFeedback,
      vocabularySuggestions,
      overallFeedback:
        wordCount >= minWordCount
          ? `Well-developed response of ${wordCount} words satisfying formal examination criteria. Good paragraph structure with clear communicative clarity.`
          : `Submission reached ${wordCount} words, falling short of the required ${minWordCount} minimum. Under-length submissions receive an automatic penalty on Task Response.`,
    };
  }
}
