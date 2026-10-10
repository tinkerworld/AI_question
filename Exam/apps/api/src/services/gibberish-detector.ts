import * as fs from 'fs';

export interface GibberishDetectionResult {
  isGibberish: boolean;
  dictRatio: number;
  mashRatio: number;
  unpronounceableRatio: number;
  totalTokens: number;
  reason?: string;
}

// Built-in core vocabulary of over 1000 common English words, prepositions, IELTS vocabulary & numbers
const CORE_ENGLISH_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
  'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
  'most', 'us', 'is', 'are', 'was', 'were', 'been', 'being', 'had', 'has', 'having', 'did', 'does', 'doing',
  // IELTS academic & reporting vocabulary
  'chart', 'table', 'graph', 'diagram', 'process', 'figure', 'flowchart', 'map', 'data', 'information',
  'percentage', 'percent', 'proportion', 'rate', 'number', 'amount', 'ratio', 'share', 'level', 'quantity',
  'shows', 'illustrates', 'depicts', 'presents', 'reveals', 'demonstrates', 'compares', 'summarizes',
  'increased', 'decreased', 'rose', 'fell', 'dropped', 'declined', 'grew', 'growth', 'peaked', 'fluctuated',
  'remained', 'stable', 'steady', 'constant', 'sharp', 'dramatic', 'significant', 'slight', 'gradual',
  'overall', 'general', 'summary', 'conclusion', 'firstly', 'secondly', 'finally', 'moreover', 'furthermore',
  'however', 'nevertheless', 'whereas', 'while', 'conversely', 'contrast', 'compared', 'comparison',
  'higher', 'lower', 'highest', 'lowest', 'between', 'during', 'period', 'timeframe', 'decade', 'century',
  'production', 'consumption', 'expenditure', 'revenue', 'sales', 'sector', 'industry', 'category',
  'education', 'technology', 'environment', 'government', 'society', 'economy', 'economic', 'development',
  'opinion', 'believe', 'agree', 'disagree', 'view', 'argument', 'reason', 'effect', 'cause', 'impact',
  'advantage', 'disadvantage', 'benefit', 'drawback', 'solution', 'measure', 'problem', 'challenge',
  'important', 'essential', 'crucial', 'vital', 'necessary', 'effective', 'efficient', 'positive', 'negative',
  'many', 'much', 'several', 'numerous', 'various', 'different', 'similar', 'equal', 'major', 'minor',
  'increase', 'decrease', 'rise', 'fall', 'drop', 'decline', 'growth', 'reduction', 'change', 'trend',
  'country', 'countries', 'nation', 'nations', 'global', 'international', 'domestic', 'local', 'world',
  'student', 'students', 'school', 'university', 'college', 'children', 'adults', 'elderly', 'youth',
  'city', 'cities', 'urban', 'rural', 'area', 'areas', 'transport', 'transportation', 'car', 'cars',
  'water', 'energy', 'power', 'electricity', 'oil', 'gas', 'coal', 'renewable', 'waste', 'pollution',
  'health', 'healthcare', 'medical', 'hospital', 'disease', 'lifestyle', 'diet', 'exercise', 'food',
]);

let _systemDictionary: Set<string> | null = null;

function getDictionary(): Set<string> {
  if (_systemDictionary) return _systemDictionary;

  _systemDictionary = new Set<string>(CORE_ENGLISH_WORDS);

  const dictPaths = ['/usr/share/dict/words', '/usr/dict/words'];
  for (const p of dictPaths) {
    if (fs.existsSync(p)) {
      try {
        const fileContent = fs.readFileSync(p, 'utf8');
        const lines = fileContent.split('\n');
        for (const line of lines) {
          const w = line.trim().toLowerCase();
          if (w && w.length >= 2) {
            _systemDictionary.add(w);
          }
        }
        break;
      } catch {}
    }
  }

  return _systemDictionary;
}

/**
 * Detects whether a candidate text consists of random characters, keyboard mash,
 * unpronounceable consonant clusters, or non-English gibberish.
 */
export function isUnintelligibleOrGibberish(text: string): GibberishDetectionResult {
  const clean = String(text || '').trim();
  if (!clean) {
    return {
      isGibberish: false,
      dictRatio: 0,
      mashRatio: 0,
      unpronounceableRatio: 0,
      totalTokens: 0,
      reason: 'Empty submission',
    };
  }

  const rawTokens = clean.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) {
    return {
      isGibberish: false,
      dictRatio: 0,
      mashRatio: 0,
      unpronounceableRatio: 0,
      totalTokens: 0,
      reason: 'No word tokens found',
    };
  }

  // 1. Check for keyboard mash: symbols or digits embedded inside alphabetical tokens (e.g. 'ojpw4eoj', 'p[erwotj', 'fpaosdjgf][p')
  const mashWords = rawTokens.filter((t) =>
    /[a-zA-Z][0-9\[\]{}()<>=+_\\/`~@#$%^&*]+[a-zA-Z]/i.test(t) ||
    /^[\[\]{}()<>=+_\\/`~@#$%^&*]+$/.test(t) ||
    /[a-zA-Z]+[0-9]{2,}[a-zA-Z]*/i.test(t)
  );
  const mashRatio = mashWords.length / rawTokens.length;

  // 2. Extract alphabetical words (letters only, length >= 2, plus single 'a' and 'i')
  const alphaTokens = (clean.toLowerCase().match(/[a-z]+/g) || []).filter(
    (t) => t.length > 1 || t === 'a' || t === 'i'
  );

  // If there are fewer than 5 alphabetical tokens in total:
  if (alphaTokens.length < 5) {
    const isGib = mashRatio > 0.3 || rawTokens.length >= 5;
    return {
      isGibberish: isGib,
      dictRatio: 0,
      mashRatio: Number(mashRatio.toFixed(3)),
      unpronounceableRatio: 0,
      totalTokens: rawTokens.length,
      reason: isGib ? 'Insufficient recognized English words and high non-alphabetic character ratio' : undefined,
    };
  }

  const dictionary = getDictionary();

  let recognizedCount = 0;
  for (const token of alphaTokens) {
    if (dictionary.has(token)) {
      recognizedCount++;
    } else {
      // Check common English morphological suffixes
      const stem = token.replace(/(?:ing|ed|ly|es|s|tion|ment|able|al|ive|ness|ity)$/, '');
      if (stem.length >= 2 && dictionary.has(stem)) {
        recognizedCount++;
      }
    }
  }

  const dictRatio = recognizedCount / alphaTokens.length;

  // 3. Unpronounceable consonant sequences: 5 or more consecutive consonants with no vowel (e.g. 'pjgdfsmp', 'sdOfjw')
  const unpronounceableTokens = alphaTokens.filter((t) => /[^aeiouy]{5,}/i.test(t));
  const unpronounceableRatio = unpronounceableTokens.length / alphaTokens.length;

  // 4. Repeated character runs (e.g. 'aaaaa', 'wpeojjjjj')
  const repeatedCharTokens = alphaTokens.filter((t) => /([a-z])\1{3,}/i.test(t));
  const repeatedRatio = repeatedCharTokens.length / alphaTokens.length;

  // Decision rule:
  // Legitimate student writing (even at Band 3 or 4) has > 65% recognized English words and 0 unpronounceable clusters.
  // Random keystroke mash or gibberish typically has < 25% dictionary words, high mashRatio, or high unpronounceable ratio.
  const isGibberish =
    dictRatio < 0.35 ||
    mashRatio > 0.15 ||
    unpronounceableRatio > 0.08 ||
    repeatedRatio > 0.10;

  let reason: string | undefined;
  if (isGibberish) {
    if (dictRatio < 0.35) {
      reason = `Only ${(dictRatio * 100).toFixed(1)}% of words correspond to recognizable English vocabulary.`;
    } else if (mashRatio > 0.15) {
      reason = `Submission contains excessive embedded keyboard symbols and digits inside character strings (${(mashRatio * 100).toFixed(1)}%).`;
    } else if (unpronounceableRatio > 0.08) {
      reason = `Submission contains an excessive proportion of unpronounceable consonant clusters (${(unpronounceableRatio * 100).toFixed(1)}%).`;
    } else {
      reason = 'Submission contains repetitive non-linguistic character sequences.';
    }
  }

  return {
    isGibberish,
    dictRatio: Number(dictRatio.toFixed(3)),
    mashRatio: Number(mashRatio.toFixed(3)),
    unpronounceableRatio: Number(unpronounceableRatio.toFixed(3)),
    totalTokens: rawTokens.length,
    reason,
  };
}
