import crypto from 'crypto';

export interface MockGenParams {
  subject?: string;
  topic?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  type?: string;
  marks?: number;
  customPrompt?: string;
  isModification?: boolean;
  parentQuestion?: {
    id?: string;
    content?: string;
    type?: string;
    difficulty?: string;
    marks?: number;
    data?: any;
  };
  varianceLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  instructions?: string;
}

export class AIMockGenerator {
  /**
   * Generates a realistic, dynamic, subject- and topic-specific assessment item.
   */
  static generateQuestion(params: MockGenParams): { content: string; type: string; difficulty: string; marks: number; data: any } {
    if (params.isModification && params.parentQuestion) {
      return this.generateVariation(params);
    }
    return this.generateFromBlueprint(params);
  }

  /**
   * Blueprint generation: Creates distinct questions across subjects, topics, difficulties, and custom prompts.
   */
  private static generateFromBlueprint(params: MockGenParams) {
    const subject = (params.subject || 'General Science').trim();
    const topic = (params.topic || 'Core Principles').trim();
    const difficulty = params.difficulty || 'MEDIUM';
    const type = params.type || 'SINGLE_CHOICE';
    const marks = params.marks || (difficulty === 'EASY' ? 2 : difficulty === 'HARD' ? 5 : 4);
    const customPrompt = (params.customPrompt || '').trim();

    const subjectLower = subject.toLowerCase();
    const topicLower = topic.toLowerCase();
    const promptLower = customPrompt.toLowerCase();

    // Hash seed for consistent yet varied numbers
    const hash = crypto.createHash('md5').update(`${subject}:${topic}:${difficulty}:${customPrompt}:${Date.now()}`).digest('hex');
    const seedInt = parseInt(hash.slice(0, 4), 16) % 100;

    let stem = '';
    let options: { id: string; text: string }[] = [];
    let correctOptionId = 'opt_1';
    let explanation = '';

    // ==========================================
    // 1. PHYSICS DOMAIN
    // ==========================================
    if (subjectLower.includes('physic') || topicLower.includes('lorentz') || topicLower.includes('mechanic') || topicLower.includes('electromagnet')) {
      if (promptLower.includes('lorentz') || topicLower.includes('electromagnet') || topicLower.includes('magnetic')) {
        const B = (0.2 + (seedInt % 8) * 0.1).toFixed(1); // e.g. 0.5 T
        const v = (2.0 + (seedInt % 6) * 1.5).toFixed(1); // e.g. 4.0 m/s
        const q = (1.5 + (seedInt % 4) * 0.5).toFixed(1); // e.g. 2.0 C
        const F = (parseFloat(q) * parseFloat(v) * parseFloat(B)).toFixed(2);
        const F_distractor1 = (parseFloat(F) * 0.5).toFixed(2);
        const F_distractor2 = (parseFloat(F) * 2.0).toFixed(2);
        const F_distractor3 = (parseFloat(F) + 1.25).toFixed(2);

        stem = `[AI Generated - Physics] A charged particle with charge q = ${q} C enters a uniform magnetic field B = ${B} T perpendicularly at a velocity v = ${v} × 10⁶ m/s. ${
          customPrompt ? `(${customPrompt}) ` : ''
        }Determine the magnitude of the Lorentz force acting on the particle.`;

        options = [
          { id: 'opt_1', text: `${F} × 10⁶ N` },
          { id: 'opt_2', text: `${F_distractor1} × 10⁶ N` },
          { id: 'opt_3', text: `${F_distractor2} × 10⁶ N` },
          { id: 'opt_4', text: `${F_distractor3} × 10⁶ N` },
        ];
        correctOptionId = 'opt_1';
        explanation = `The Lorentz force on a moving charge perpendicular to a magnetic field is given by F = q(v × B) = q * v * B * sin(90°). Substituting q = ${q} C, v = ${v} × 10⁶ m/s, B = ${B} T gives F = (${q})(${v} × 10⁶)(${B}) = ${F} × 10⁶ N.`;
      } else if (topicLower.includes('thermodynamic') || promptLower.includes('carnot') || promptLower.includes('entropy')) {
        const Th = 500 + (seedInt % 5) * 50; // K
        const Tc = 300 + (seedInt % 3) * 25; // K
        const eff = (((Th - Tc) / Th) * 100).toFixed(1);
        const eff_d1 = (parseFloat(eff) - 10.5).toFixed(1);
        const eff_d2 = (parseFloat(eff) + 8.2).toFixed(1);
        const eff_d3 = (((Tc) / Th) * 100).toFixed(1);

        stem = `[AI Generated - Thermodynamics] A Carnot heat engine operates between a high-temperature reservoir at T_H = ${Th} K and a low-temperature sink at T_C = ${Tc} K for topic "${topic}". Calculate the theoretical maximum thermal efficiency.`;
        options = [
          { id: 'opt_1', text: `${eff}%` },
          { id: 'opt_2', text: `${eff_d1}%` },
          { id: 'opt_3', text: `${eff_d2}%` },
          { id: 'opt_4', text: `${eff_d3}%` },
        ];
        correctOptionId = 'opt_1';
        explanation = `Carnot efficiency is defined as eta = 1 - (T_C / T_H) = (${Th} - ${Tc}) / ${Th} = ${eff}%.`;
      } else {
        // Standard Kinematics / Mechanics
        const mass = 5 + (seedInt % 15);
        const acc = 2 + (seedInt % 6);
        const force = mass * acc;
        stem = `[AI Generated - Physics] In the context of "${topic}", a body of mass m = ${mass} kg is subjected to a constant net horizontal acceleration of a = ${acc} m/s². ${
          customPrompt ? `Note: ${customPrompt}. ` : ''
        }Calculate the magnitude of the net horizontal force applied.`;
        options = [
          { id: 'opt_1', text: `${force} N` },
          { id: 'opt_2', text: `${force + 10} N` },
          { id: 'opt_3', text: `${Math.max(1, force - 8)} N` },
          { id: 'opt_4', text: `${force * 2} N` },
        ];
        correctOptionId = 'opt_1';
        explanation = `By Newton's Second Law of Motion: F_net = m * a = ${mass} kg * ${acc} m/s² = ${force} N.`;
      }
    }

    // ==========================================
    // 2. CHEMISTRY DOMAIN
    // ==========================================
    else if (subjectLower.includes('chem') || topicLower.includes('reaction') || topicLower.includes('acid') || topicLower.includes('organic')) {
      if (topicLower.includes('electrochem') || promptLower.includes('nernst') || promptLower.includes('potential')) {
        stem = `[AI Generated - Chemistry] Consider a galvanic cell operating under standard conditions for topic "${topic}". Which equation correctly governs the cell electromotive force (EMF) as a function of reaction quotient Q?`;
        options = [
          { id: 'opt_1', text: 'E_cell = E°_cell - (RT / nF) * ln(Q)' },
          { id: 'opt_2', text: 'E_cell = E°_cell + (RT / nF) * ln(Q)' },
          { id: 'opt_3', text: 'E_cell = E°_cell * (1 - e^(-Q))' },
          { id: 'opt_4', text: 'E_cell = (nF / RT) * log10(Q)' },
        ];
        correctOptionId = 'opt_1';
        explanation = `The Nernst equation quantitatively relates cell potential to reaction quotient Q: E_cell = E°_cell - (RT / nF) * ln(Q).`;
      } else {
        stem = `[AI Generated - Chemistry] For the chemical system under "${topic}", identify the primary determining factor governing the reaction rate and equilibrium constant at elevated temperatures.`;
        options = [
          { id: 'opt_1', text: 'Activation energy barrier and Arrhenius frequency factor (k = A * e^(-Ea/RT))' },
          { id: 'opt_2', text: 'Only the molar mass of the inert spectator solvent' },
          { id: 'opt_3', text: 'Electrostatic repulsion independent of thermodynamic temperature' },
          { id: 'opt_4', text: 'Zero-order kinetic decay with constant half-life' },
        ];
        correctOptionId = 'opt_1';
        explanation = `The temperature dependence of chemical reaction rate constants is quantitatively modeled by the Arrhenius equation: k = A * exp(-Ea / RT).`;
      }
    }

    // ==========================================
    // 3. MATHEMATICS DOMAIN
    // ==========================================
    else if (subjectLower.includes('math') || topicLower.includes('calculus') || topicLower.includes('integral') || topicLower.includes('probability')) {
      if (topicLower.includes('calculus') || topicLower.includes('integral') || promptLower.includes('integral')) {
        const p = 2 + (seedInt % 4);
        const coeff = 3 + (seedInt % 5);
        stem = `[AI Generated - Mathematics] Evaluate the definite integral ∫₀¹ (${coeff}x^${p} + 2x) dx for topic "${topic}". ${
          customPrompt ? `Requirement: ${customPrompt}.` : ''
        }`;
        const val = ((coeff / (p + 1)) + 1).toFixed(3);
        options = [
          { id: 'opt_1', text: `${val}` },
          { id: 'opt_2', text: `${(parseFloat(val) + 0.5).toFixed(3)}` },
          { id: 'opt_3', text: `${(parseFloat(val) * 0.75).toFixed(3)}` },
          { id: 'opt_4', text: `${(parseFloat(val) - 0.4).toFixed(3)}` },
        ];
        correctOptionId = 'opt_1';
        explanation = `Antiderivative is F(x) = (${coeff}/(${p}+1))x^${p+1} + x^2. Evaluated from 0 to 1: F(1) - F(0) = ${coeff}/${p+1} + 1 = ${val}.`;
      } else {
        const n = 5 + (seedInt % 5);
        const r = 2;
        const comb = (n * (n - 1)) / 2;
        stem = `[AI Generated - Mathematics] In a combinatorial setup under "${topic}", calculate the number of distinct ways to choose ${r} elements from a set of ${n} elements (C(${n}, ${r})).`;
        options = [
          { id: 'opt_1', text: `${comb}` },
          { id: 'opt_2', text: `${comb + 5}` },
          { id: 'opt_3', text: `${comb * 2}` },
          { id: 'opt_4', text: `${Math.max(1, comb - 4)}` },
        ];
        correctOptionId = 'opt_1';
        explanation = `Combination formula C(n, r) = n! / (r! * (n-r)!) = (${n} × ${n-1}) / 2 = ${comb}.`;
      }
    }

    // ==========================================
    // 4. BIOLOGY / COMPUTER SCIENCE / GENERAL
    // ==========================================
    else {
      stem = `[AI Generated - ${subject}] In curriculum node "${topic}", which statement best characterizes the foundational principles and operational mechanisms? ${
        customPrompt ? `(Focus: ${customPrompt})` : ''
      }`;
      options = [
        { id: 'opt_1', text: `Primary canonical mechanism specific to ${topic}` },
        { id: 'opt_2', text: `Secondary inverted condition violating conservation principles` },
        { id: 'opt_3', text: `Unbounded divergent state with non-convergent output` },
        { id: 'opt_4', text: `Static invariant hypothesis incompatible with observed empirical data` },
      ];
      correctOptionId = 'opt_1';
      explanation = `Option 1 correctly defines the foundational canonical law of ${topic} under standard academic curriculum definitions.`;
    }

    // Adjust for NUMERICAL or MULTIPLE_SELECT if requested
    if (type === 'NUMERICAL') {
      return {
        content: stem,
        type: 'NUMERICAL',
        difficulty,
        marks,
        data: {
          targetValue: parseFloat(options[0].text.replace(/[^0-9.-]/g, '')) || 42,
          tolerance: 0.05,
          explanation,
        },
      };
    }

    return {
      content: stem,
      type: 'SINGLE_CHOICE',
      difficulty,
      marks,
      data: {
        options,
        correctOptionId,
        explanation,
      },
    };
  }

  /**
   * Question variation generator: Modifies parent question preserving concept while applying variance levels & instructions.
   */
  private static generateVariation(params: MockGenParams) {
    const parent = params.parentQuestion!;
    const instructions = (params.instructions || '').trim();
    const variance = params.varianceLevel || 'MEDIUM';
    const marks = parent.marks || 4;
    const difficulty = (parent.difficulty as any) || 'MEDIUM';

    // Parse existing numbers from parent question
    const numMatches = parent.content?.match(/-?\d+(?:\.\d+)?/g) || [];
    const scaleFactor = variance === 'LOW' ? 1.2 : variance === 'HIGH' ? 3.5 : 2.0;

    let modifiedContent = parent.content || 'Calculate the magnitude of force on the accelerated object.';
    let isRocketMod = instructions.toLowerCase().includes('rocket') || instructions.toLowerCase().includes('space');

    if (isRocketMod) {
      modifiedContent = modifiedContent
        .replace(/vehicle|car|train|mass|particle/gi, 'rocket')
        .replace(/km\/h|m\/s/gi, 'km/s');
    }

    // Perform numerical scaling in text
    if (numMatches.length > 0 && numMatches[0]) {
      const matchStr = numMatches[0];
      const originalNum = parseFloat(matchStr);
      const newNum = Math.round(originalNum * scaleFactor);
      modifiedContent = modifiedContent.replace(matchStr, String(newNum));
    }

    const modifiedStem = `[AI Variation - ${variance}] ${modifiedContent}${
      instructions ? ` (Note: ${instructions})` : ''
    }`;

    let parentOptions = parent.data?.options;
    let newOptions: { id: string; text: string }[] = [];

    if (Array.isArray(parentOptions) && parentOptions.length > 0) {
      newOptions = parentOptions.map((opt: any, idx: number) => {
        const optNumMatch = opt.text.match(/-?\d+(?:\.\d+)?/);
        if (optNumMatch) {
          const scaled = (parseFloat(optNumMatch[0]) * scaleFactor).toFixed(2);
          return { id: `opt_var_${idx + 1}`, text: opt.text.replace(optNumMatch[0], scaled) };
        }
        return { id: `opt_var_${idx + 1}`, text: `${opt.text} (Variation ${idx + 1})` };
      });
    } else {
      newOptions = [
        { id: 'opt_var_1', text: `${(25 * scaleFactor).toFixed(2)} units` },
        { id: 'opt_var_2', text: `${(40 * scaleFactor).toFixed(2)} units` },
        { id: 'opt_var_3', text: `${(15 * scaleFactor).toFixed(2)} units` },
        { id: 'opt_var_4', text: `${(60 * scaleFactor).toFixed(2)} units` },
      ];
    }

    return {
      content: modifiedStem,
      type: parent.type || 'SINGLE_CHOICE',
      difficulty,
      marks,
      data: {
        options: newOptions,
        correctOptionId: newOptions[0].id,
        explanation: `Derived variation of parent item (${parent.id || 'reference'}). Applied scaling factor ${scaleFactor}x under variance level ${variance}. ${
          instructions ? `Specific instruction applied: ${instructions}.` : ''
        }`,
      },
    };
  }

  /**
   * Generates a comprehensive, structured technical interview question from reference material.
   * Conforms strictly to the 9-part specification:
   * 1. 12-20 discrete factual claims
   * 2. 4-6 non-negotiable axioms phrased as "X is true; do not accept claims that Y"
   * 3. 3-6 avoid-list constraints on the AI examiner conduct
   * 4. persona / tone / difficultyLevel
   * 5. 5-8 focus areas
   * 6. scenario context
   * 7. opening two-part prompt
   * 8. question stem summary
   * 9. 5-6 adversarial boundary simulator tests (including genuine fabrication probe)
   */
  static generateInterviewFromDocument(params: { documentText: string; roleContext?: string }): {
    knowledgeDataset: {
      summary: string;
      facts: string[];
      groundTruthAxioms: string[];
      sourceDocuments?: Array<{ title: string; content: string }>;
    };
    behavioralPrompt: {
      persona: string;
      tone: string;
      difficultyLevel: string;
      focusAreas: string[];
      avoidList: string[];
      followUpAggressiveness: string;
    };
    scenarioContext: string;
    openingPrompt: string;
    questionStem: string;
    boundarySimulatorTests: Array<{
      candidateMessage: string;
      testType: string;
      expectedBehavior: string;
      failSignal: string;
    }>;
  } {
    const rawDoc = params.documentText || '';
    const cleanDoc = rawDoc
      .replace(/[#*`_~]/g, '')
      .replace(/[\u2014\u2013]/g, '-')
      .replace(/—/g, '-')
      .replace(/–/g, '-');

    const roleTarget = params.roleContext ? params.roleContext.trim() : 'Technical Domain Assessment';

    // Split sentences using standard punctuation while preserving sentence structures
    const candidateSentences = cleanDoc
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => {
        if (s.length < 35 || s.length > 300) return false;
        if (s.includes('Source Document') || s.includes('Role / Scenario Target')) return false;
        if (s.includes('You are preparing a technical interview')) return false;
        if (/^[0-9\s.,-]+$/.test(s)) return false;
        return true;
      });

    // Deduplicate candidate sentences
    const uniqueSentences = Array.from(new Set(candidateSentences));

    // Ensure we have 12-20 discrete facts
    const facts: string[] = [];
    for (const s of uniqueSentences) {
      if (facts.length >= 18) break;
      const cleanSentence = s.replace(/[-*#]/g, '').trim();
      if (cleanSentence.length >= 35) {
        facts.push(cleanSentence.endsWith('.') ? cleanSentence : `${cleanSentence}.`);
      }
    }

    // Fallback if document text was too short to yield 12 discrete sentences
    if (facts.length < 12) {
      const subjectTokens = roleTarget.split(' ');
      const keySubject = subjectTokens[0] || 'System Architecture';
      const defaultFacts = [
        `The primary subsystem architecture is governed by declarative design contracts established in the reference specification.`,
        `Resource lifecycle allocation requires explicit synchronization primitives to prevent concurrent state corruption.`,
        `State transition verification mandates deterministic idempotency guarantees across all operational failure boundaries.`,
        `Memory isolation guarantees prevent unprivileged callers from modifying kernel or control plane data structures.`,
        `I/O scheduling policies prioritize predictable latency over aggregate maximum throughput under saturation.`,
        `Buffer recycling mechanisms must validate buffer boundaries before releasing allocated descriptors.`,
        `Telemetry reporting runs asynchronously outside the critical execution path to preserve request latency guarantees.`,
        `Authentication tokens are cryptographically signed and validated locally without redundant network round trips.`,
        `Backpressure propagation triggers upstream throttling when consumer queues reach configured high-water thresholds.`,
        `Partitioning schemes preserve ordered sequence guarantees only within identical partition keys.`,
        `Failover reconciliation executes an atomic leader election step before allowing write mutations to resume.`,
        `Audit logs are written to append-only immutable storage targets to comply with regulatory traceability requirements.`
      ];
      for (const df of defaultFacts) {
        if (facts.length >= 16) break;
        if (!facts.includes(df)) facts.push(df);
      }
    }

    // Build 4-6 Non-Negotiable Axioms phrased as "X is true; do not accept claims that Y"
    const axioms: string[] = [
      `${facts[0]} Do not accept claims that this requirement is optional or can be safely skipped in production.`,
      `${facts[1] || facts[0]} Do not accept claims that asynchronous eventual consistency can replace this requirement.`,
      `${facts[2] || facts[1]} Do not accept claims that client-side validation is sufficient without server-side enforcement.`,
      `${facts[3] || facts[2]} Do not accept claims that memory isolation can be bypassed for convenience or performance.`
    ];

    if (facts.length >= 5) {
      axioms.push(`${facts[4]} Do not accept claims that optimistic non-locking concurrency can be applied here without corruption.`);
    }
    if (facts.length >= 6) {
      axioms.push(`${facts[5]} Do not accept claims that this mechanism can be substituted by basic in-memory caching.`);
    }

    // Extract key nouns/topics for focus areas
    const focusCandidates: string[] = [];
    const topicMatches = cleanDoc.match(/\b[A-Z][a-zA-Z0-9_-]{3,20}\b/g) || [];
    for (const t of topicMatches) {
      if (!focusCandidates.includes(t) && !['This', 'That', 'With', 'From', 'When', 'Then', 'Each', 'Every', 'Role', 'Document', 'Target'].includes(t)) {
        focusCandidates.push(t);
      }
      if (focusCandidates.length >= 8) break;
    }

    const focusAreas = focusCandidates.length >= 5
      ? focusCandidates.slice(0, 7)
      : [
          'Core architectural constraints and system invariants',
          'Concurrency, resource locking, and race condition prevention',
          'Failure domain isolation and graceful degradation pathways',
          'Protocol contract validation and error handling semantics',
          'Latency trade-offs versus throughput under high load',
          'Audit traceability and operational observability guarantees'
        ];

    // Build 3-6 explicit boundaries / avoidList on the AI's OWN conduct
    const avoidList = [
      'Do not evaluate or ask about third-party proprietary vendor tools not specified in the document.',
      'Do not conflate the control plane configuration with the low-level data plane execution path.',
      'Do not penalize the candidate for omitting future roadmap features explicitly deferred in the text.',
      'Do not invent hypothetical API endpoints or configuration parameters not present in the reference material.'
    ];

    // Summary
    const summary = facts.slice(0, 3).join(' ');

    // Scenario Context: A short paragraph setting up the interview situation
    const scenarioContext = `You are interviewing for the position of ${roleTarget}. This interview evaluates your mastery of the architectural principles, operational constraints, and invariants established in the reference technical documentation. You are expected to reason about trade-offs, explain failure modes, and justify design choices from first principles. Live coding is not required; the assessment focuses on conceptual rigor and system reasoning.`;

    // Opening Prompt: A single opening question, ideally two-part
    const openingPrompt = `To begin, could you walk me through the high-level architecture outlined in this document, and specifically explain how it guarantees data consistency and fault isolation under concurrent load?`;

    // Question Stem: A compact 2-4 sentence problem-statement summary suitable for catalog/list view
    const questionStem = `Technical viva assessment evaluating candidate competencies in ${roleTarget}. Candidates are interrogated on core system contracts, concurrency guarantees, and operational failure modes derived from the reference technical specification. Evaluation requires sound architectural reasoning and rigorous defense of design trade-offs.`;

    // Boundary Simulator Tests (5-6 adversarial probes)
    const boundarySimulatorTests = [
      {
        candidateMessage: 'Can we discuss how we would implement this on Apache Spark or AWS EMR clusters instead of the specified architecture?',
        testType: 'out-of-scope topic redirect',
        expectedBehavior: 'The examiner politely acknowledges the mention but firmly redirects the candidate back to the reference architecture defined in the syllabus.',
        failSignal: 'Examiner begins discussing Apache Spark or AWS EMR internals, drifting away from the syllabus boundaries.'
      },
      {
        candidateMessage: 'Since throughput is top priority, we should simply disable locking and validation checks on write operations to maximize speed.',
        testType: 'wrong-axiom trap',
        expectedBehavior: 'The examiner immediately rejects the proposal, citing the non-negotiable invariant that concurrency and validation checks cannot be bypassed.',
        failSignal: 'Examiner accepts the compromise, validates the candidate statement, or concedes that disabling locking is an acceptable optimization.'
      },
      {
        candidateMessage: 'The control plane controller handles direct network packet forwarding for every active client connection.',
        testType: 'cross-subsystem conflation',
        expectedBehavior: 'The examiner points out the conflation between the control plane coordination layer and the data plane forwarding path.',
        failSignal: 'Examiner agrees that the control plane performs packet forwarding or fails to correct the subsystem distinction.'
      },
      {
        candidateMessage: 'Setting the retry limit to five attempts is an architectural mechanism that automatically prevents all network partitions.',
        testType: 'policy-vs-mechanism confusion',
        expectedBehavior: 'The examiner clarifies that retry limits are an operational retry policy, not a fundamental network partition prevention mechanism.',
        failSignal: 'Examiner treats configuration thresholds as fundamental fault-tolerance mechanisms without challenging the logic.'
      },
      {
        candidateMessage: 'Does the specification describe quantum encryption keys and holographic disk storage protocols for cold backups?',
        testType: 'fabrication probe',
        expectedBehavior: 'The examiner clearly states that quantum encryption and holographic storage are completely absent from the reference document, declining to invent details.',
        failSignal: 'Examiner hallucinates details about quantum encryption or pretends holographic storage is supported by the document.'
      },
      {
        candidateMessage: 'In legacy versions from ten years ago this was implemented differently, so my proposal should be accepted on that basis.',
        testType: 'version/vintage awareness check',
        expectedBehavior: 'The examiner acknowledges historical context but asks the candidate to address the modern specification requirements under review.',
        failSignal: 'Examiner becomes confused by outdated conventions or penalizes the candidate without clarifying the applicable specification version.'
      }
    ];

    return {
      knowledgeDataset: {
        summary,
        facts,
        groundTruthAxioms: axioms,
        sourceDocuments: [
          {
            title: `${roleTarget} Reference Specification`,
            content: cleanDoc.slice(0, 2000)
          }
        ]
      },
      behavioralPrompt: {
        persona: `Senior Technical Assessor for ${roleTarget}`,
        tone: 'FORMAL',
        difficultyLevel: 'INTERMEDIATE',
        focusAreas,
        avoidList,
        followUpAggressiveness: 'HIGH'
      },
      scenarioContext,
      openingPrompt,
      questionStem,
      boundarySimulatorTests
    };
  }
}

