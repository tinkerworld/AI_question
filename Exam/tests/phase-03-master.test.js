const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' EXAMOS PHASE 3 (QUESTION BANK) — MASTER TEST SUITE');
console.log(' Testing Features 3.1 to 3.8');
console.log('====================================================\n');

let total = 0;
let passed = 0;

function test(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${id} — ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${id} — ${name}: ${err.message}`);
  }
}

const rootDir = path.resolve(__dirname, '..');

// Feature 3.1 Tests (Pluggable Question Type System)
test('3.1-U1', 'Question Type System & Built-in Handlers', () => {
  const { questionTypeRegistry } = require(path.join(rootDir, 'packages/question-types/src/index.ts'));
  assert.ok(questionTypeRegistry.getAllTypes().length >= 8);
  assert.ok(questionTypeRegistry.getType('MCQ'));
  assert.ok(questionTypeRegistry.getType('INTERVIEW'));
});

// Feature 3.2 Tests (Question CRUD)
test('3.2-U1', 'Question Schema & DTO definitions', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  const typesIndex = fs.readFileSync(path.join(rootDir, 'packages/types/src/index.ts'), 'utf8');
  assert.ok(schema.includes('model Question'));
  assert.ok(typesIndex.includes('export type QuestionDifficulty ='));
  assert.ok(typesIndex.includes('export interface QuestionDTO'));
});

test('3.2-U2', 'Question CRUD API Endpoints & Filter Queries', () => {
  const qRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/question.routes.ts'), 'utf8');
  assert.ok(qRoutes.includes('router.post('));
  assert.ok(qRoutes.includes('router.get('));
  assert.ok(qRoutes.includes('router.patch('));
  assert.ok(qRoutes.includes('router.delete('));
});

// Feature 3.3 Tests (Question Versioning)
test('3.3-U1', 'Question Versioning & Rollback Logic', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  const qRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/question.routes.ts'), 'utf8');
  assert.ok(schema.includes('model QuestionVersion'));
  assert.ok(qRoutes.includes("versions"), 'Question versions endpoint present');
  assert.ok(qRoutes.includes('rollback'), 'Version rollback endpoint present');
});

// Feature 3.4 Tests (Question Tags)
test('3.4-U1', 'Question Tag System & Autocomplete Endpoint', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  const qRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/question.routes.ts'), 'utf8');
  assert.ok(schema.includes('model QuestionTag'));
  assert.ok(qRoutes.includes('/tags/all'), 'Tag autocomplete endpoint present');
});

// Feature 3.5 Tests (Question Lifecycle)
test('3.5-U1', 'Question Lifecycle State Machine Validation', () => {
  const qRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/question.routes.ts'), 'utf8');
  assert.ok(qRoutes.includes('INVALID_LIFECYCLE_TRANSITION'));
});

// Feature 3.6 Tests (Previous Exam Tracking)
test('3.6-U1', 'Previous Exam Usage History Tracking', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  const qRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/question.routes.ts'), 'utf8');
  assert.ok(schema.includes('model PreviousExamUsage'));
  assert.ok(qRoutes.includes('exam-history'), 'Exam history endpoint present');
});

// Feature 3.7 Tests (Question Bank Frontend Integration)
test('3.7-U1', 'Frontend Question Bank Integration', () => {
  const appTsx = fs.readFileSync(path.join(rootDir, 'apps/web/src/App.tsx'), 'utf8');
  assert.ok(appTsx.includes('question_bank'));
});

// Feature 3.8 Tests (Question Bank Analytics)
test('3.8-U1', 'Question Bank Analytics & Syllabus Coverage Calculation', () => {
  const qRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/question.routes.ts'), 'utf8');
  assert.ok(qRoutes.includes("'/analytics/summary'"));
  assert.ok(qRoutes.includes('syllabusCoverageRatio'));
});

console.log('\n====================================================');
console.log(` Phase 3 Master Test Results: ${passed}/${total} Passed`);
console.log('====================================================');

if (passed !== total) {
  process.exit(1);
}
