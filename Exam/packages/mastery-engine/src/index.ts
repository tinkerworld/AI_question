import {
  MasteryStatus,
  MasteryColor,
  StudentStrengthDTO,
  StudentWeaknessDTO,
  SyllabusProficiencyNodeDTO,
  ProgressDatapointDTO,
  StudentProgressDTO,
  ClassAnalyticsDTO,
} from '@repo/types';

export interface AttemptScoreRecord {
  isCorrect?: boolean | null;
  marksAwarded?: number;
  marksPossible?: number;
  scorePercentage?: number;
  timestamp?: Date | string;
  attemptId?: string;
  syllabusNodeId?: string;
}

export interface MasteryThresholdConfig {
  mastered: number; // default 85
  strong: number; // default 70
  developing: number; // default 50
  needsPractice: number; // default 30
}

export const DEFAULT_THRESHOLDS: MasteryThresholdConfig = {
  mastered: 85,
  strong: 70,
  developing: 50,
  needsPractice: 30,
};

export interface ThresholdResult {
  status: MasteryStatus;
  color: MasteryColor;
  label: string;
}

/**
 * Maps a numerical score (0-100) and attempt count to a MasteryStatus and Color.
 */
export function mapScoreToStatus(
  score: number,
  totalAttempts: number = 1,
  thresholds: MasteryThresholdConfig = DEFAULT_THRESHOLDS
): ThresholdResult {
  if (totalAttempts <= 0) {
    return { status: 'NOT_ATTEMPTED', color: 'GREY', label: 'Not Attempted' };
  }

  const clampedScore = Math.max(0, Math.min(100, score));

  if (clampedScore >= thresholds.mastered) {
    return { status: 'MASTERED', color: 'GREEN', label: 'Mastered' };
  }
  if (clampedScore >= thresholds.strong) {
    return { status: 'STRONG', color: 'BLUE', label: 'Strong' };
  }
  if (clampedScore >= thresholds.developing) {
    return { status: 'DEVELOPING', color: 'YELLOW', label: 'Developing' };
  }
  if (clampedScore >= thresholds.needsPractice) {
    return { status: 'NEEDS_PRACTICE', color: 'ORANGE', label: 'Needs Practice' };
  }
  return { status: 'WEAK', color: 'RED', label: 'Weak' };
}

/**
 * Calculates a recency-weighted average proficiency score (0.0 to 100.0) from attempt scores.
 * Newer attempts carry significantly higher weight than older ones.
 */
export function calculateTimeWeightedScore(attempts: AttemptScoreRecord[]): number {
  if (!attempts || attempts.length === 0) {
    return 0.0;
  }

  // Sort chronologically ascending if timestamps present
  const sorted = [...attempts].sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    return 0;
  });

  const n = sorted.length;
  if (n === 1) {
    const single = sorted[0];
    if (single.scorePercentage !== undefined) {
      return Math.round(Math.max(0, Math.min(100, single.scorePercentage)) * 100) / 100;
    }
    if (single.marksPossible && single.marksPossible > 0) {
      return Math.round(Math.max(0, Math.min(100, ((single.marksAwarded || 0) / single.marksPossible) * 100)) * 100) / 100;
    }
    return single.isCorrect ? 100.0 : 0.0;
  }

  let totalWeightedScore = 0.0;
  let totalWeight = 0.0;

  // Weight formula: w_i = 1 + 0.4 * i (where i=0 is oldest, i=n-1 is newest)
  // For n >= 3, this gives the recent attempts dominant weight
  for (let i = 0; i < n; i++) {
    const item = sorted[i];
    let score = 0.0;

    if (item.scorePercentage !== undefined) {
      score = item.scorePercentage;
    } else if (item.marksPossible && item.marksPossible > 0) {
      score = ((item.marksAwarded || 0) / item.marksPossible) * 100;
    } else {
      score = item.isCorrect ? 100.0 : 0.0;
    }

    score = Math.max(0, Math.min(100, score));

    // Linear progression weight: oldest has weight 1.0, newest has weight 1.0 + 0.5 * (n-1)
    const weight = 1.0 + 0.5 * i;
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }

  const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0.0;
  return Math.round(finalScore * 100) / 100;
}

export interface NodeProgressInput {
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  subjectId?: string;
  subjectName?: string;
  proficiencyScore: number;
  attemptsCount: number;
  correctCount: number;
  status: MasteryStatus;
  statusChangedAt?: Date | string;
}

/**
 * Identifies top strengths: GREEN/BLUE nodes with attemptsCount >= minAttempts.
 * Sorted by proficiencyScore DESC, then attemptsCount DESC.
 */
export function identifyStrengths(
  nodesProgress: NodeProgressInput[],
  minAttemptsThreshold: number = 2
): StudentStrengthDTO[] {
  if (!nodesProgress || nodesProgress.length === 0) {
    return [];
  }

  const qualifying = nodesProgress.filter((np) => {
    const isMasteredOrStrong = np.status === 'MASTERED' || np.status === 'STRONG';
    const hasMinAttempts = np.attemptsCount >= minAttemptsThreshold;
    return isMasteredOrStrong && hasMinAttempts;
  });

  qualifying.sort((a, b) => {
    if (b.proficiencyScore !== a.proficiencyScore) {
      return b.proficiencyScore - a.proficiencyScore;
    }
    return b.attemptsCount - a.attemptsCount;
  });

  return qualifying.map((item) => {
    const { color } = mapScoreToStatus(item.proficiencyScore, item.attemptsCount);
    return {
      id: `str_${item.nodeId}`,
      userId: '',
      syllabusNodeId: item.nodeId,
      nodeTitle: item.nodeTitle,
      nodeType: item.nodeType,
      subjectName: item.subjectName,
      masteryScore: item.proficiencyScore,
      attemptsCount: item.attemptsCount,
      status: item.status,
      color,
    };
  });
}

/**
 * Identifies weaknesses: RED/ORANGE nodes with attemptsCount >= 1.
 * Sorted by severity (CRITICAL first, then MODERATE), then proficiencyScore ASC (lowest first).
 */
export function identifyWeaknesses(nodesProgress: NodeProgressInput[]): StudentWeaknessDTO[] {
  if (!nodesProgress || nodesProgress.length === 0) {
    return [];
  }

  const weakNodes = nodesProgress.filter((np) => {
    const isWeakOrNeedsPractice = np.status === 'WEAK' || np.status === 'NEEDS_PRACTICE';
    return isWeakOrNeedsPractice && np.attemptsCount > 0;
  });

  const now = Date.now();

  const mapped = weakNodes.map((item) => {
    const errorRate =
      item.attemptsCount > 0
        ? Math.round(((item.attemptsCount - item.correctCount) / item.attemptsCount) * 100) / 100
        : 1.0;

    let severity: 'CRITICAL' | 'MODERATE' | 'MINOR' = 'MINOR';
    if (item.proficiencyScore < 30 || errorRate >= 0.7) {
      severity = 'CRITICAL';
    } else if (item.proficiencyScore < 50 || errorRate >= 0.5) {
      severity = 'MODERATE';
    }

    let daysInWeakness = 1;
    if (item.statusChangedAt) {
      const changedTime = new Date(item.statusChangedAt).getTime();
      const diffDays = Math.floor((now - changedTime) / (1000 * 60 * 60 * 24));
      daysInWeakness = Math.max(1, diffDays);
    }

    const { color } = mapScoreToStatus(item.proficiencyScore, item.attemptsCount);

    return {
      id: `weak_${item.nodeId}`,
      userId: '',
      syllabusNodeId: item.nodeId,
      nodeTitle: item.nodeTitle,
      nodeType: item.nodeType,
      subjectName: item.subjectName,
      proficiencyScore: item.proficiencyScore,
      errorRate,
      severity,
      daysInWeakness,
      status: item.status,
      color,
    };
  });

  const severityPriority = { CRITICAL: 3, MODERATE: 2, MINOR: 1 };

  mapped.sort((a, b) => {
    const pA = severityPriority[a.severity];
    const pB = severityPriority[b.severity];
    if (pB !== pA) {
      return pB - pA; // Higher severity first
    }
    return a.proficiencyScore - b.proficiencyScore; // Lowest score first
  });

  return mapped;
}

export interface RawSyllabusNode {
  id: string;
  title: string;
  type: string;
  parentId?: string | null;
  orderIndex?: number;
  depth?: number;
  children?: RawSyllabusNode[];
}

/**
 * Builds full hierarchical syllabus tree with aggregated mastery scores and completion percentages.
 */
export function buildSyllabusProficiencyTree(
  rawNodes: RawSyllabusNode[],
  nodeProgressMap: Map<string, { score: number; attempts: number; correct: number }>
): SyllabusProficiencyNodeDTO[] {
  if (!rawNodes || rawNodes.length === 0) {
    return [];
  }

  // Helper to recursively process node and compute aggregated score and completion
  function processNode(node: RawSyllabusNode, currentDepth: number = 0): SyllabusProficiencyNodeDTO {
    const childDtos: SyllabusProficiencyNodeDTO[] = [];

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        childDtos.push(processNode(child, currentDepth + 1));
      }
    }

    let calculatedScore = 0.0;
    let totalAttempts = 0;
    let completionPercentage = 0.0;

    const directProgress = nodeProgressMap.get(node.id);

    if (childDtos.length > 0) {
      // Parent node: aggregate child scores
      const validChildren = childDtos.filter((c) => c.attemptsCount > 0);
      const totalScoreSum = childDtos.reduce((acc, c) => acc + c.proficiencyScore, 0);
      calculatedScore = childDtos.length > 0 ? Math.round((totalScoreSum / childDtos.length) * 100) / 100 : 0.0;
      totalAttempts = childDtos.reduce((acc, c) => acc + c.attemptsCount, 0);

      // Completion percentage = (children with attempts / total children) * 100
      completionPercentage = Math.round((validChildren.length / childDtos.length) * 100 * 100) / 100;
    } else if (directProgress) {
      // Leaf node: direct progress
      calculatedScore = directProgress.score;
      totalAttempts = directProgress.attempts;
      completionPercentage = totalAttempts > 0 ? 100.0 : 0.0;
    }

    const { status, color } = mapScoreToStatus(calculatedScore, totalAttempts);

    return {
      id: node.id,
      title: node.title,
      type: node.type,
      orderIndex: node.orderIndex || 0,
      depth: node.depth !== undefined ? node.depth : currentDepth,
      proficiencyScore: calculatedScore,
      attemptsCount: totalAttempts,
      status,
      color,
      completionPercentage,
      children: childDtos,
    };
  }

  return rawNodes.map((n) => processNode(n, 0));
}

/**
 * Calculates historical progress and trend indicators (IMPROVING, DEGRADING, PLATEAU).
 */
export function calculateStudentProgress(
  history: Array<{ score: number; recordedAt: Date | string; examCount?: number; questionsCount?: number }>,
  range: '7d' | '30d' | 'all' = 'all'
): StudentProgressDTO {
  if (!history || history.length === 0) {
    return {
      trend: 'PLATEAU',
      trendDelta: 0.0,
      timeseries: [],
      totalAttempts: 0,
    };
  }

  const now = Date.now();
  let filteredHistory = [...history];

  if (range === '7d') {
    const cutoff = now - 7 * 24 * 60 * 60 * 1000;
    filteredHistory = history.filter((h) => new Date(h.recordedAt).getTime() >= cutoff);
  } else if (range === '30d') {
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    filteredHistory = history.filter((h) => new Date(h.recordedAt).getTime() >= cutoff);
  }

  if (filteredHistory.length === 0) {
    filteredHistory = [...history];
  }

  // Sort ascending
  filteredHistory.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const timeseries: ProgressDatapointDTO[] = filteredHistory.map((item) => ({
    date: new Date(item.recordedAt).toISOString().split('T')[0],
    score: Math.round(item.score * 100) / 100,
    examCount: item.examCount || 1,
    questionsCount: item.questionsCount || 1,
  }));

  // Trend detection: compare second half average with first half average
  let trend: 'IMPROVING' | 'DEGRADING' | 'PLATEAU' = 'PLATEAU';
  let trendDelta = 0.0;

  if (timeseries.length >= 2) {
    const mid = Math.floor(timeseries.length / 2);
    const firstHalf = timeseries.slice(0, mid);
    const secondHalf = timeseries.slice(mid);

    const firstAvg = firstHalf.reduce((a, b) => a + b.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.score, 0) / secondHalf.length;

    trendDelta = Math.round((secondAvg - firstAvg) * 100) / 100;

    if (trendDelta >= 5.0) {
      trend = 'IMPROVING';
    } else if (trendDelta <= -5.0) {
      trend = 'DEGRADING';
    } else {
      trend = 'PLATEAU';
    }
  }

  return {
    trend,
    trendDelta,
    timeseries,
    totalAttempts: history.length,
  };
}

/**
 * Calculates class-level aggregate analytics and cohort weakness heatmaps.
 */
export function calculateClassAnalytics(
  courseId: string,
  courseName: string,
  students: Array<{
    userId: string;
    name: string;
    email: string;
    overallProficiency: number;
    examsTaken: number;
    nodesProgress: NodeProgressInput[];
  }>
): ClassAnalyticsDTO {
  if (!students || students.length === 0) {
    return {
      courseId,
      courseName,
      totalStudents: 0,
      averageMastery: 0.0,
      passRate: 0.0,
      masteryDistribution: {
        mastered: 0,
        strong: 0,
        developing: 0,
        needsPractice: 0,
        weak: 0,
        unattempted: 0,
      },
      topWeakTopics: [],
      students: [],
    };
  }

  let totalProficiencySum = 0;
  let passingCount = 0;

  const distribution = {
    mastered: 0,
    strong: 0,
    developing: 0,
    needsPractice: 0,
    weak: 0,
    unattempted: 0,
  };

  const studentList = [];
  const topicStatsMap = new Map<
    string,
    { title: string; totalScore: number; count: number; failCount: number }
  >();

  for (const s of students) {
    totalProficiencySum += s.overallProficiency;
    const { status, color } = mapScoreToStatus(s.overallProficiency, s.examsTaken);

    if (s.overallProficiency >= 50.0) {
      passingCount++;
    }

    if (s.examsTaken === 0) distribution.unattempted++;
    else if (status === 'MASTERED') distribution.mastered++;
    else if (status === 'STRONG') distribution.strong++;
    else if (status === 'DEVELOPING') distribution.developing++;
    else if (status === 'NEEDS_PRACTICE') distribution.needsPractice++;
    else distribution.weak++;

    const studentWeaknesses = identifyWeaknesses(s.nodesProgress || []);

    studentList.push({
      userId: s.userId,
      name: s.name,
      email: s.email,
      overallProficiency: s.overallProficiency,
      examsTaken: s.examsTaken,
      status,
      color,
      weaknessesCount: studentWeaknesses.length,
    });

    // Aggregate topic performance across students
    for (const np of s.nodesProgress || []) {
      if (!topicStatsMap.has(np.nodeId)) {
        topicStatsMap.set(np.nodeId, {
          title: np.nodeTitle,
          totalScore: 0,
          count: 0,
          failCount: 0,
        });
      }
      const stat = topicStatsMap.get(np.nodeId)!;
      stat.totalScore += np.proficiencyScore;
      stat.count++;
      if (np.proficiencyScore < 50.0) {
        stat.failCount++;
      }
    }
  }

  const averageMastery = Math.round((totalProficiencySum / students.length) * 100) / 100;
  const passRate = Math.round((passingCount / students.length) * 100 * 100) / 100;

  // Rank top weak topics
  const topWeakTopics = Array.from(topicStatsMap.entries())
    .map(([nodeId, stat]) => {
      const avg = stat.count > 0 ? Math.round((stat.totalScore / stat.count) * 100) / 100 : 0.0;
      const failRate = stat.count > 0 ? Math.round((stat.failCount / stat.count) * 100 * 100) / 100 : 0.0;
      return {
        syllabusNodeId: nodeId,
        title: stat.title,
        averageScore: avg,
        failureRate: failRate,
        affectedStudentsCount: stat.failCount,
      };
    })
    .filter((t) => t.failureRate > 0)
    .sort((a, b) => b.failureRate - a.failureRate || a.averageScore - b.averageScore)
    .slice(0, 10);

  return {
    courseId,
    courseName,
    totalStudents: students.length,
    averageMastery,
    passRate,
    masteryDistribution: distribution,
    topWeakTopics,
    students: studentList,
  };
}
