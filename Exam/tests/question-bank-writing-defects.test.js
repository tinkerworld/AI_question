/**
 * Test Suite: Question Bank IELTS Writing Task 1 & Task 2 Category and Image Matching
 *
 * Verifies:
 * 1. Zero legacy generic 'WRITING' questions in DB.
 * 2. Proper segregation into 'IELTS_WRITING_TASK_1' and 'IELTS_WRITING_TASK_2'.
 * 3. Type-based API query filtering works for both types.
 * 4. Image/diagram matching is 100% accurate:
 *    - q_ielts_wrt_09 has student enrolments table (NOT renewable energy bar chart).
 *    - q_ielts_wrt_12 has CO2 trends line graph.
 *    - q_ielts_wrt_13 has household expenditure pie charts.
 *    - GT questions (gt_01, gt_02) do NOT have images.
 *    - Task 2 questions do NOT have images.
 * 5. All linked SVG chart files exist and are valid SVGs.
 * 6. Verified chart facts exist in writing_question_chart_facts for all visual Task 1 prompts.
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

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 RUNNING QUESTION BANK IELTS WRITING TASK 1 & 2 DEFECT VERIFICATION');
  console.log('========================================================================\n');

  // Step 1: Authenticate as Admin
  console.log('1. Authenticating Admin persona...');
  const loginRes = await requestJson('/auth/login', {
    method: 'POST',
    body: { email: 'admin@examos.com', password: 'Admin@123' },
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login failed');
  const adminToken = loginRes.data.data.accessToken;
  console.log('   ✓ Admin authenticated successfully\n');

  // Step 2: Fetch all questions and check category distribution
  console.log('2. Verifying Question Bank category categorization...');
  const allQRes = await requestJson('/questions?limit=500', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(allQRes.status, 200);
  const allQuestions = allQRes.data.data.items;

  const genericWriting = allQuestions.filter((q) => q.type === 'WRITING');
  const task1Questions = allQuestions.filter((q) => q.type === 'IELTS_WRITING_TASK_1');
  const task2Questions = allQuestions.filter((q) => q.type === 'IELTS_WRITING_TASK_2');

  assert.strictEqual(
    genericWriting.length,
    0,
    `Found ${genericWriting.length} generic WRITING questions. Expected 0.`
  );
  console.log(`   ✓ PASS: Generic WRITING questions = 0`);
  assert.ok(task1Questions.length >= 10, `Expected at least 10 Task 1 questions, got ${task1Questions.length}`);
  console.log(`   ✓ PASS: IELTS_WRITING_TASK_1 questions = ${task1Questions.length}`);
  assert.ok(task2Questions.length >= 6, `Expected at least 6 Task 2 questions, got ${task2Questions.length}`);
  console.log(`   ✓ PASS: IELTS_WRITING_TASK_2 questions = ${task2Questions.length}\n`);

  // Step 3: Test API filtering by type
  console.log('3. Verifying API filtering by question type...');
  const filterT1 = await requestJson('/questions?type=IELTS_WRITING_TASK_1&limit=100', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(filterT1.status, 200);
  const t1Filtered = filterT1.data.data.items;
  assert.ok(t1Filtered.length > 0, 'No questions returned for type=IELTS_WRITING_TASK_1');
  t1Filtered.forEach((q) => {
    assert.strictEqual(q.type, 'IELTS_WRITING_TASK_1', `Expected type IELTS_WRITING_TASK_1, got ${q.type}`);
  });
  console.log(`   ✓ PASS: API filter for type=IELTS_WRITING_TASK_1 returns exclusively Task 1 (${t1Filtered.length} items)`);

  const filterT2 = await requestJson('/questions?type=IELTS_WRITING_TASK_2&limit=100', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(filterT2.status, 200);
  const t2Filtered = filterT2.data.data.items;
  assert.ok(t2Filtered.length > 0, 'No questions returned for type=IELTS_WRITING_TASK_2');
  t2Filtered.forEach((q) => {
    assert.strictEqual(q.type, 'IELTS_WRITING_TASK_2', `Expected type IELTS_WRITING_TASK_2, got ${q.type}`);
  });
  console.log(`   ✓ PASS: API filter for type=IELTS_WRITING_TASK_2 returns exclusively Task 2 (${t2Filtered.length} items)\n`);

  // Step 4: Verify specific question picture/image matching
  console.log('4. Verifying accurate picture and diagram matching for all questions...');

  const expectedMatches = [
    {
      id: 'q_ielts_wrt_01',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: '/assets/charts/ielts_task1_renewable_energy.svg',
      taskType: 'TASK_1_GRAPH',
      description: 'Renewable Electricity Generation Bar Chart',
    },
    {
      id: 'q_ielts_wrt_02',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: '/assets/charts/ielts_task1_desalination_process.svg',
      taskType: 'TASK_1_PROCESS',
      description: 'Desalination Process Flowchart',
    },
    {
      id: 'q_ielts_wrt_05',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: '/assets/charts/ielts_task1_population_pyramid.svg',
      taskType: 'TASK_1_GRAPH',
      description: 'Population Pyramid Age Cohorts Diagram',
    },
    {
      id: 'q_ielts_wrt_06',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: '/assets/charts/ielts_task1_airport_redevelopment.svg',
      taskType: 'TASK_1_MAP',
      description: 'Airport Redevelopment Map Comparison',
    },
    {
      id: 'q_ielts_wrt_09',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: '/assets/charts/ielts_task1_student_enrolments_table.svg',
      taskType: 'TASK_1_TABLE',
      description: 'Student Enrolments Comparative Table (Defect Fix Verified)',
    },
    {
      id: 'q_ielts_wrt_12',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: '/assets/charts/ielts_task1_global_co2_trends.svg',
      taskType: 'TASK_1_GRAPH',
      description: 'Global CO2 Trends Line Graph',
    },
    {
      id: 'q_ielts_wrt_13',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: '/assets/charts/ielts_task1_household_expenditure_pie.svg',
      taskType: 'TASK_1_PIE',
      description: 'Household Expenditure Comparative Pie Charts',
    },
    {
      id: 'q_ielts_wrt_gt_01',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: null,
      taskType: 'TASK_1_GENERAL',
      description: 'General Training Task 1 Letter (Formal road repair letter - NO false image)',
    },
    {
      id: 'q_ielts_wrt_gt_02',
      type: 'IELTS_WRITING_TASK_1',
      expectedImage: null,
      taskType: 'TASK_1_GENERAL',
      description: 'General Training Task 1 Letter (Informal friend letter - NO false image)',
    },
    {
      id: 'q_ielts_wrt_03',
      type: 'IELTS_WRITING_TASK_2',
      expectedImage: null,
      taskType: 'TASK_2_ESSAY',
      description: 'Task 2 Essay (Automation in workplace - NO image)',
    },
    {
      id: 'q_ielts_wrt_04',
      type: 'IELTS_WRITING_TASK_2',
      expectedImage: null,
      taskType: 'TASK_2_ESSAY',
      description: 'Task 2 Essay (Urbanization housing shortage - NO image)',
    },
    {
      id: 'q_ielts_wrt_07',
      type: 'IELTS_WRITING_TASK_2',
      expectedImage: null,
      taskType: 'TASK_2_ESSAY',
      description: 'Task 2 Essay (Public services vs space exploration - NO image)',
    },
    {
      id: 'q_ielts_wrt_08',
      type: 'IELTS_WRITING_TASK_2',
      expectedImage: null,
      taskType: 'TASK_2_ESSAY',
      description: 'Task 2 Essay (Tourism economic vs environmental impact - NO image)',
    },
    {
      id: 'q_ielts_wrt_10',
      type: 'IELTS_WRITING_TASK_2',
      expectedImage: null,
      taskType: 'TASK_2_ESSAY',
      description: 'Task 2 Essay (Obesity health policy two-part question - NO image)',
    },
    {
      id: 'q_ielts_wrt_11',
      type: 'IELTS_WRITING_TASK_2',
      expectedImage: null,
      taskType: 'TASK_2_ESSAY',
      description: 'Task 2 Essay (Aging population advantages/disadvantages - NO image)',
    },
  ];

  for (const item of expectedMatches) {
    const q = allQuestions.find((x) => x.id === item.id);
    assert.ok(q, `Question ${item.id} not found in database`);
    assert.strictEqual(q.type, item.type, `Question ${item.id} type mismatch: got ${q.type}, expected ${item.type}`);

    const qData = typeof q.data === 'string' ? JSON.parse(q.data) : q.data;
    const actualImage = qData?.promptImageUrl || null;

    assert.strictEqual(
      actualImage,
      item.expectedImage,
      `Image mismatch for ${item.id} (${item.description}): got "${actualImage}", expected "${item.expectedImage}"`
    );

    console.log(`   ✓ PASS: [${item.id}] [${item.type}] Image: ${actualImage || 'none (text prompt)'} -> ${item.description}`);
  }

  // Step 5: Verify all SVG assets exist on disk and are valid SVG XML
  console.log('\n5. Verifying physical SVG assets on disk...');
  const publicChartsDir = path.resolve(__dirname, '../apps/web/public/assets/charts');
  const requiredSvgs = [
    'ielts_task1_renewable_energy.svg',
    'ielts_task1_desalination_process.svg',
    'ielts_task1_population_pyramid.svg',
    'ielts_task1_airport_redevelopment.svg',
    'ielts_task1_student_enrolments_table.svg',
    'ielts_task1_global_co2_trends.svg',
    'ielts_task1_household_expenditure_pie.svg',
  ];

  for (const svgFile of requiredSvgs) {
    const svgPath = path.join(publicChartsDir, svgFile);
    assert.ok(fs.existsSync(svgPath), `SVG asset missing on disk: ${svgPath}`);
    const content = fs.readFileSync(svgPath, 'utf8');
    assert.ok(content.includes('<svg') && content.includes('</svg>'), `File ${svgFile} is not valid SVG XML`);
    console.log(`   ✓ PASS: Asset ${svgFile} exists and is valid SVG (${content.length} bytes)`);
  }

  // Step 6: Verify verified chart facts for all visual Task 1 prompts
  console.log('\n6. Verifying teacher-verified chart facts endpoints...');
  const visualTask1Ids = [
    'q_ielts_wrt_01',
    'q_ielts_wrt_02',
    'q_ielts_wrt_05',
    'q_ielts_wrt_06',
    'q_ielts_wrt_09',
    'q_ielts_wrt_12',
    'q_ielts_wrt_13',
  ];

  for (const qId of visualTask1Ids) {
    const factsRes = await requestJson(`/writing/chart-facts/${qId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(factsRes.status, 200, `Failed to retrieve chart facts for ${qId}`);
    assert.strictEqual(factsRes.data.success, true);
    assert.strictEqual(factsRes.data.data.isTeacherVerified, true);
    assert.ok(factsRes.data.data.chartTitle, `Chart title missing for ${qId}`);
    assert.ok(factsRes.data.data.majorTrends?.length > 0, `Major trends missing for ${qId}`);
    console.log(`   ✓ PASS: Verified chart facts for ${qId} -> "${factsRes.data.data.chartTitle}" (${factsRes.data.data.chartType})`);
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL QUESTION BANK IELTS WRITING DEFECT VERIFICATIONS PASSED!');
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:');
  console.error(err);
  process.exit(1);
});
