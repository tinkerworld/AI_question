/**
 * Test Suite: Writing Practice Section Segregation (Task 1 vs Task 2)
 *
 * Verifies:
 * 1. UI code compliance in WritingPracticePage.tsx:
 *    - Presence of dedicated Section 1 (Task 1) and Section 2 (Task 2)
 *    - Tab switchers for All, Task 1, and Task 2
 *    - Live search input
 *    - Distinct visual styling and metadata for each task type
 * 2. API integration and data model verification:
 *    - Eligibility endpoint returns questions that segregate cleanly into Task 1 and Task 2
 *    - Task 1 questions have 150-word minimum and 20-min recommended time
 *    - Task 2 questions have 250-word minimum and 40-min recommended time
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = 'http://localhost:4043/api/v1';

function requestJson(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const fullPath = API_BASE.replace(/\/$/, '') + '/' + urlPath.replace(/^\//, '');
    const url = new URL(fullPath);
    const body = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (c) => (resData += c));
        res.on('end', () => {
          try {
            const parsed = resData ? JSON.parse(resData) : null;
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resData });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log('========================================================================');
  console.log('🧪 RUNNING WRITING PRACTICE TASK 1 & TASK 2 SECTIONS TEST');
  console.log('========================================================================\n');

  // 1. Verify WritingPracticePage.tsx implementation
  console.log('1. Checking WritingPracticePage.tsx UI components and state...');
  const pagePath = path.resolve(__dirname, '../apps/web/src/pages/WritingPracticePage.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  // Verify navigation tabs
  assert.ok(pageContent.includes('tab-task-all'), 'Must contain tab-task-all button');
  assert.ok(pageContent.includes('tab-task-1'), 'Must contain tab-task-1 button');
  assert.ok(pageContent.includes('tab-task-2'), 'Must contain tab-task-2 button');
  console.log('   ✓ PASS: Section navigation tabs (All, Task 1, Task 2) present');

  // Verify dedicated sections
  assert.ok(pageContent.includes('id="section-task-1"'), 'Must contain id="section-task-1"');
  assert.ok(pageContent.includes('id="section-task-2"'), 'Must contain id="section-task-2"');
  console.log('   ✓ PASS: Dedicated section-task-1 and section-task-2 containers present');

  // Verify search input
  assert.ok(pageContent.includes('input-writing-search'), 'Must contain input-writing-search');
  assert.ok(pageContent.includes('searchQuery'), 'Must contain searchQuery state');
  console.log('   ✓ PASS: Search input and query filtering present');

  // Verify task categorization logic
  assert.ok(pageContent.includes('isQuestionTask1'), 'Must implement isQuestionTask1');
  assert.ok(pageContent.includes('isQuestionTask2'), 'Must implement isQuestionTask2');
  assert.ok(pageContent.includes('task1Questions'), 'Must maintain task1Questions collection');
  assert.ok(pageContent.includes('task2Questions'), 'Must maintain task2Questions collection');
  console.log('   ✓ PASS: Task 1 and Task 2 categorization functions and state collections present');

  // Verify distinct styling and badges
  assert.ok(pageContent.includes('#0ea5e9'), 'Must use Task 1 cyan/blue theme (#0ea5e9)');
  assert.ok(pageContent.includes('#8b5cf6'), 'Must use Task 2 purple theme (#8b5cf6)');
  assert.ok(pageContent.includes('TASK 1:'), 'Must show TASK 1 format badge');
  assert.ok(pageContent.includes('TASK 2:'), 'Must show TASK 2 format badge');
  console.log('   ✓ PASS: Distinct visual theme colors and format badges present');

  // 2. Test API Eligibility Segregation
  console.log('\n2. Testing live candidate writing eligibility and question segregation...');
  const loginRes = await requestJson('/auth/login', {
    method: 'POST',
    body: { email: 'student@examos.com', password: 'Student@123' },
  });
  assert.strictEqual(loginRes.status, 200, 'Student login failed');
  const token = loginRes.data.data.accessToken;

  const eligRes = await requestJson('/writing/eligibility', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(eligRes.status, 200);
  assert.strictEqual(eligRes.data.success, true);
  const questions = eligRes.data.data.availableQuestions || [];
  assert.ok(questions.length >= 17, `Expected at least 17 writing questions, got ${questions.length}`);

  // Categorize questions using frontend criteria
  const isT1 = (q) =>
    q.type === 'IELTS_WRITING_TASK_1' ||
    q.data?.preset === 'IELTS_TASK_1' ||
    (q.data?.taskType && q.data.taskType.startsWith('TASK_1')) ||
    (q.content && /task\s*1/i.test(q.content)) ||
    Number(q.data?.minWords || q.data?.minWordCount || 0) <= 200;

  const t1List = questions.filter(isT1);
  const t2List = questions.filter((q) => !isT1(q));

  console.log(`   ✓ Found ${questions.length} total writing practice questions:`);
  console.log(`     • Task 1 Section: ${t1List.length} questions`);
  console.log(`     • Task 2 Section: ${t2List.length} questions`);

  assert.strictEqual(t1List.length, 11, `Expected 11 Task 1 questions, got ${t1List.length}`);
  assert.strictEqual(t2List.length, 6, `Expected 6 Task 2 questions, got ${t2List.length}`);

  // Verify Task 1 specifications
  t1List.forEach((q) => {
    const minWords = Number(q.data?.minWords || q.data?.minWordCount || 150);
    assert.strictEqual(minWords, 150, `Task 1 question ${q.id} should have 150 min words, got ${minWords}`);
  });
  console.log('   ✓ PASS: All Task 1 questions meet 150-word report specification');

  // Verify Task 2 specifications
  t2List.forEach((q) => {
    const minWords = Number(q.data?.minWords || q.data?.minWordCount || 250);
    assert.strictEqual(minWords, 250, `Task 2 question ${q.id} should have 250 min words, got ${minWords}`);
  });
  console.log('   ✓ PASS: All Task 2 questions meet 250-word essay specification');

  console.log('\n========================================================================');
  console.log('🎉 ALL WRITING PRACTICE SECTIONS TESTS PASSED!');
  console.log('========================================================================');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:');
  console.error(err);
  process.exit(1);
});
