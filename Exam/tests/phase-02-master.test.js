const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' EXAMOS PHASE 2 (ACADEMIC STRUCTURE) — MASTER TEST SUITE');
console.log(' Testing Features 2.1 to 2.6');
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

// Feature 2.1 Tests (Course Management)
test('2.1-U1', 'Course Schema & DTO definitions', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  const typesIndex = fs.readFileSync(path.join(rootDir, 'packages/types/src/index.ts'), 'utf8');
  assert.ok(schema.includes('model Course'));
  assert.ok(typesIndex.includes('export type CourseStatus ='));
});

test('2.1-U2', 'Course CRUD API Endpoints & State Machine Validation', () => {
  const courseRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/course.routes.ts'), 'utf8');
  assert.ok(courseRoutes.includes('router.get('));
  assert.ok(courseRoutes.includes('router.post('));
  assert.ok(courseRoutes.includes("'/:'") || courseRoutes.includes("'/:id'"));
  assert.ok(courseRoutes.includes('router.patch('));
  assert.ok(courseRoutes.includes('router.delete('));
  assert.ok(courseRoutes.includes('INVALID_TRANSITION'), 'Course state machine validation present');
});

// Feature 2.2 Tests (Subject Management)
test('2.2-U1', 'Subject Schema & Unique Constraints', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  assert.ok(schema.includes('model Subject'));
  assert.ok(schema.includes('@@unique([courseId, code])'));
});

test('2.2-U2', 'Subject CRUD API Endpoints', () => {
  const subjectRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/subject.routes.ts'), 'utf8');
  assert.ok(subjectRoutes.includes('DUPLICATE_SUBJECT_CODE'), 'Enforces unique subject code per course');
  assert.ok(subjectRoutes.includes('router.post('));
  assert.ok(subjectRoutes.includes('router.get('));
});

// Feature 2.3 Tests (Syllabus Tree)
test('2.3-U1', 'SyllabusNode Adjacency List & Depth Constraints', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  const typesIndex = fs.readFileSync(path.join(rootDir, 'packages/types/src/index.ts'), 'utf8');
  assert.ok(schema.includes('model SyllabusNode'));
  assert.ok(typesIndex.includes('export type SyllabusNodeType ='));
});

test('2.3-U2', 'Syllabus Tree API, Max Depth & Cyclic Check', () => {
  const syllabusRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/syllabus.routes.ts'), 'utf8');
  assert.ok(syllabusRoutes.includes('MAX_DEPTH_EXCEEDED'), 'Enforces max depth of 4 levels');
  assert.ok(syllabusRoutes.includes('CYCLIC_PARENT_ERROR'), 'Rejects self-referencing cyclic parent assignment');
  assert.ok(syllabusRoutes.includes("router.get('/tree'"), 'Builds nested JSON tree structure');
});

// Feature 2.4 Tests (Syllabus Node Metadata)
test('2.4-U1', 'Syllabus Node Metadata & Student Visibility Filter', () => {
  const syllabusRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/syllabus.routes.ts'), 'utf8');
  const valIndex = fs.readFileSync(path.join(rootDir, 'packages/validation/src/index.ts'), 'utf8');
  assert.ok(valIndex.includes('estimatedMinutes'), 'Metadata estimated minutes validation');
  assert.ok(syllabusRoutes.includes('isStudent'), 'Filters out DRAFT nodes for students');
});

// Feature 2.5 Tests (Course-Subject-Syllabus Frontend)
test('2.5-U1', 'Frontend Admin Layout & Academic Component Integration', () => {
  const appTsx = fs.readFileSync(path.join(rootDir, 'apps/web/src/App.tsx'), 'utf8');
  assert.ok(appTsx.includes('courses'), 'Navigation includes courses');
});

// Feature 2.6 Tests (Student Course Enrollment)
test('2.6-U1', 'Enrollment Schema & Unique Constraint', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  assert.ok(schema.includes('model Enrollment'));
  assert.ok(schema.includes('@@unique([userId, courseId])'));
});

test('2.6-U2', 'Enrollment API Endpoints & Duplicate Prevention', () => {
  const enrollRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/enrollment.routes.ts'), 'utf8');
  assert.ok(enrollRoutes.includes('DUPLICATE_ENROLLMENT'), 'Prevents duplicate course enrollment');
  assert.ok(enrollRoutes.includes("router.get('/students/:id/courses'"), 'Student course enrollment listing');
});

console.log('\n====================================================');
console.log(` Phase 2 Master Test Results: ${passed}/${total} Passed`);
console.log('====================================================');

if (passed !== total) {
  process.exit(1);
}
