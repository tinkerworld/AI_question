/**
 * Human Simulation Personas
 * Defines behavioral characteristics, pacing, error rates, and interaction quirks.
 */

const PERSONAS = {
  speedrunner: {
    id: 'speedrunner',
    name: 'Speedrunner / Rapid Student',
    description: 'Fast paces, skips reading instructions, quickly clicks answers, minimal dwell time.',
    wpm: 600, // Very fast skimming
    minPauseMs: 300,
    maxPauseMs: 1200,
    typingDelayMs: { min: 20, max: 60 },
    typoRate: 0.02,
    doubleClickProbability: 0.05,
    revisitProbability: 0.05,
    hesitationBeforeClickMs: 150,
    viewport: { width: 1440, height: 900 }
  },

  careful: {
    id: 'careful',
    name: 'Careful / Diligent Student',
    description: 'Reads questions thoroughly, hesitates before answering, reviews answers, smooth mouse movements.',
    wpm: 220, // Standard attentive reading
    minPauseMs: 2500,
    maxPauseMs: 7000,
    typingDelayMs: { min: 70, max: 150 },
    typoRate: 0.05,
    doubleClickProbability: 0.01,
    revisitProbability: 0.25,
    hesitationBeforeClickMs: 800,
    viewport: { width: 1280, height: 800 }
  },

  hesitant: {
    id: 'hesitant',
    name: 'Hesitant / Uncertain Student',
    description: 'Frequently changes selected options, pauses mid-answer, scrolls up and down repeatedly.',
    wpm: 160,
    minPauseMs: 4000,
    maxPauseMs: 9000,
    typingDelayMs: { min: 100, max: 250 },
    typoRate: 0.10,
    doubleClickProbability: 0.03,
    revisitProbability: 0.60,
    hesitationBeforeClickMs: 1800,
    optionFlipCount: 2, // Changes mind before confirming
    viewport: { width: 1366, height: 768 }
  },

  erratic_cheater: {
    id: 'erratic_cheater',
    name: 'Erratic / Proctoring Stress Tester',
    description: 'Attempts tab switching, window blur, rapid spam clicks, right clicks, and copy-paste shortcuts.',
    wpm: 400,
    minPauseMs: 500,
    maxPauseMs: 2000,
    typingDelayMs: { min: 30, max: 80 },
    typoRate: 0.08,
    doubleClickProbability: 0.35,
    revisitProbability: 0.30,
    hesitationBeforeClickMs: 200,
    testTabSwitch: true,
    testCopyPaste: true,
    testEscapeKey: true,
    viewport: { width: 1280, height: 720 }
  },

  keyboard_a11y: {
    id: 'keyboard_a11y',
    name: 'Accessibility / Keyboard Only',
    description: 'Navigates UI purely using Tab, Shift+Tab, Enter, Space, and Arrow keys.',
    wpm: 240,
    minPauseMs: 1500,
    maxPauseMs: 4000,
    typingDelayMs: { min: 80, max: 180 },
    typoRate: 0.03,
    doubleClickProbability: 0.0,
    revisitProbability: 0.15,
    hesitationBeforeClickMs: 400,
    keyboardOnly: true,
    viewport: { width: 1280, height: 800 }
  }
};

module.exports = { PERSONAS };
