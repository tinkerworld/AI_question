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
}
