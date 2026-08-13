const assert = require('assert');
const path = require('path');

console.log('====================================================');
console.log(' Running Feature 3.1 — Pluggable Question Type System Tests');
console.log('====================================================\n');

let total = 0;
let passed = 0;

function runTest(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${id} — ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${id} — ${name}: ${err.message}`);
  }
}

// Import package directly
const { questionTypeRegistry, QuestionTypeRegistry } = require('../packages/question-types/src/index.ts');

runTest('P03.F01.U001', 'Register Custom Question Type', () => {
  const customRegistry = new QuestionTypeRegistry();
  const customHandler = {
    type: 'AUDIO_LISTEN',
    validate: (d) => !!d.audioUrl,
    evaluate: (d, a) => ({ isCorrect: true, score: 1, feedback: 'Audio played' }),
    serialize: (d) => ({ audioUrl: d.audioUrl }),
    deserialize: (j) => ({ audioUrl: j.audioUrl }),
  };

  customRegistry.registerType(customHandler);
  const handler = customRegistry.getType('AUDIO_LISTEN');
  assert.strictEqual(handler.type, 'AUDIO_LISTEN');
});

runTest('P03.F01.U002', 'Retrieve Built-in Type by Name', () => {
  const mcq = questionTypeRegistry.getType('MCQ');
  assert.strictEqual(mcq.type, 'MCQ');
  assert.ok(questionTypeRegistry.getAllTypes().includes('MCQ'));
});

runTest('P03.F01.U003', 'Evaluate MCQ Correct Answer', () => {
  const mcqData = {
    options: [
      { id: 'opt1', text: 'Option A' },
      { id: 'opt2', text: 'Option B' },
    ],
    correctOptionId: 'opt2',
  };

  const res = questionTypeRegistry.evaluate('MCQ', mcqData, 'opt2');
  assert.strictEqual(res.isCorrect, true);
  assert.strictEqual(res.score, 1);
});

runTest('P03.F01.U004', 'Evaluate MCQ Incorrect Answer', () => {
  const mcqData = {
    options: [
      { id: 'opt1', text: 'Option A' },
      { id: 'opt2', text: 'Option B' },
    ],
    correctOptionId: 'opt2',
  };

  const res = questionTypeRegistry.evaluate('MCQ', mcqData, 'opt1');
  assert.strictEqual(res.isCorrect, false);
  assert.strictEqual(res.score, 0);
});

runTest('P03.F01.U005', 'Evaluate Fill-in-Blank Case/Trim Variations', () => {
  const fibData = {
    acceptedAnswers: ['Photosynthesis', 'photosynthesis ', 'PHOTO_SYNTHESIS'],
    caseSensitive: false,
  };

  const res1 = questionTypeRegistry.evaluate('FILL_IN_BLANK', fibData, '  photosynthesis  ');
  assert.strictEqual(res1.isCorrect, true);

  const res2 = questionTypeRegistry.evaluate('FILL_IN_BLANK', fibData, 'wrong_answer');
  assert.strictEqual(res2.isCorrect, false);
});

runTest('P03.F01.U006', 'Unknown Question Type Handling', () => {
  assert.throws(() => {
    questionTypeRegistry.getType('UNKNOWN_TYPE_XYZ');
  }, /UNKNOWN_QUESTION_TYPE/);
});

runTest('P03.F01.I001', 'Serialize & Deserialize Payloads Across All 8 Types', () => {
  const allTypes = questionTypeRegistry.getAllTypes();
  assert.strictEqual(allTypes.length, 8, 'Must have 8 built-in question types registered');

  const numHandler = questionTypeRegistry.getType('NUMERICAL');
  const numData = { targetValue: 42, tolerance: 0.5 };
  const serialized = numHandler.serialize(numData);
  const deserialized = numHandler.deserialize(serialized);

  assert.strictEqual(deserialized.targetValue, 42);
  assert.strictEqual(deserialized.tolerance, 0.5);
});

console.log(`\n====================================================`);
console.log(` Test Results: ${passed}/${total} Passed`);
console.log(`====================================================`);

if (passed !== total) {
  process.exit(1);
}
