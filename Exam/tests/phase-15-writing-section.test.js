const assert = require('assert');

const API_BASE = 'http://localhost:4043/api/v1';
const WEB_BASE = 'http://localhost:3000';

async function fetchJson(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email, password) {
  const res = await fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = res.data.data?.accessToken || res.data.data?.token;
  if (!res.data.success || !token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token, user: res.data.data.user };
}

async function runWritingSuite() {
  console.log('================================================================');
  console.log('✍️  RUNNING EXAMOS WRITING SECTION & IELTS TASK 1 / TASK 2 SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Authenticate Personas
    console.log('1. Authenticating test personas (Admin, Student)...');
    const admin = await login('admin@examos.com', 'Admin@123');
    const student = await login('student@examos.com', 'Student@123');
    console.log('   ✓ Admin and Student personas authenticated successfully');

    // 2. Authoring Mechanism: Create custom Writing Question via API
    console.log('\n2. Testing Authoring Mechanism: Create & Publish Custom Writing Questions...');
    const customTask1 = {
      type: 'IELTS_WRITING_TASK_1',
      difficulty: 'MEDIUM',
      marks: 9.0,
      status: 'PUBLISHED',
      courseId: 'c3',
      subjectId: 'sub_ielts_writing',
      content: 'IELTS Academic Writing Task 1: Authoring API Test Prompt on Wind Power',
      data: {
        preset: 'IELTS_TASK_1',
        taskType: 'TASK_1_GRAPH',
        promptStem: 'IELTS Academic Writing Task 1: Authoring API Test Prompt on Wind Power',
        promptImageUrl: '/assets/charts/ielts_task1_renewable_energy.svg',
        stimulusText: 'Summarize the wind energy growth figures across nations.',
        minWords: 150,
        maxWords: 250,
        recommendedTimeMinutes: 20,
        rubricCriteria: [
          { id: 'task_achievement', name: 'Task Achievement', maxScore: 9, weight: 0.25, description: 'Accurate overview' },
          { id: 'coherence_cohesion', name: 'Coherence & Cohesion', maxScore: 9, weight: 0.25, description: 'Logical progression' },
          { id: 'lexical_resource', name: 'Lexical Resource', maxScore: 9, weight: 0.25, description: 'Lexical precision' },
          { id: 'grammatical_range', name: 'Grammatical Range & Accuracy', maxScore: 9, weight: 0.25, description: 'Grammar accuracy' },
        ],
      },
    };

    const createRes = await fetchJson('/questions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify(customTask1),
    });
    assert.strictEqual(createRes.status, 201, 'Should create question with 201 status');
    assert.ok(createRes.data.data?.id, 'Should return generated question ID');
    const authoredQId = createRes.data.data.id;
    console.log(`   ✓ Successfully authored and published custom Task 1 question (${authoredQId})`);

    // 3. Verify Student Writing Eligibility & Available Questions
    console.log('\n3. Verifying Student Writing Eligibility & Sample Question Roster...');
    const eligRes = await fetchJson('/writing/eligibility', {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert.strictEqual(eligRes.status, 200);
    assert.strictEqual(eligRes.data.success, true);
    assert.strictEqual(eligRes.data.data.isEligible, true, 'Student must be marked isEligible: true');
    assert.ok(eligRes.data.data.availableQuestions.length >= 8, 'At least 8 sample writing questions must be available');
    console.log(`   ✓ Student writing eligibility: isEligible=true (${eligRes.data.data.availableQuestions.length} published questions available)`);

    // Verify all 8 core sample questions exist
    const qIds = ['q_ielts_wrt_01', 'q_ielts_wrt_02', 'q_ielts_wrt_03', 'q_ielts_wrt_04', 'q_ielts_wrt_05', 'q_ielts_wrt_06', 'q_ielts_wrt_07', 'q_ielts_wrt_08'];
    for (const qId of qIds) {
      const found = eligRes.data.data.availableQuestions.find((q) => q.id === qId);
      assert.ok(found, `Question ${qId} must exist in available questions`);
    }
    console.log('   ✓ Verified all 8 core IELTS sample questions (Task 1: 01,02,05,06; Task 2: 03,04,07,08)');

    // 4. Verify High-Resolution SVG Visual Assets
    console.log('\n4. Verifying High-Resolution SVG Chart Asset Delivery on Port 3000...');
    const charts = [
      '/assets/charts/ielts_task1_renewable_energy.svg',
      '/assets/charts/ielts_task1_desalination_process.svg',
      '/assets/charts/ielts_task1_global_co2_trends.svg',
      '/assets/charts/ielts_task1_household_expenditure_pie.svg',
      '/assets/charts/ielts_task1_population_pyramid.svg',
      '/assets/charts/ielts_task1_airport_redevelopment.svg',
    ];
    for (const chartPath of charts) {
      const res = await fetch(`${WEB_BASE}${chartPath}`);
      assert.strictEqual(res.status, 200, `Chart ${chartPath} should return HTTP 200`);
      assert.ok(res.headers.get('content-type')?.includes('svg'), `Chart ${chartPath} should be SVG`);
      console.log(`   ✓ ${chartPath} delivered successfully (HTTP 200 image/svg+xml)`);
    }

    // 5. Test IELTS Task 1 Session Lifecycle (Bar Chart)
    console.log('\n5. Testing End-to-End Task 1 Session with Visual Diagram...');
    const t1SessionRes = await fetchJson('/writing/sessions/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({ questionId: 'q_ielts_wrt_01', mode: 'PRACTICE' }),
    });
    assert.strictEqual(t1SessionRes.status, 201);
    const t1Session = t1SessionRes.data.data.session;
    const t1Question = t1SessionRes.data.data.question;
    assert.strictEqual(t1Question.data?.promptImageUrl, '/assets/charts/ielts_task1_renewable_energy.svg');

    const t1Essay = `The provided bar chart compares the percentage shares of renewable electricity generated via solar, wind, and hydroelectric sources across five European countries over a 14-year period from 2010 to 2024. Overall, renewable energy generation expanded substantially in all five nations, with wind and solar recording the most pronounced percentage gains, while hydroelectric power remained dominant in Norway. In 2010, Norway led all surveyed nations with hydroelectricity accounting for nearly 90% of its domestic output, a proportion that remained virtually unchanged by 2024 at approximately 88%. By contrast, wind power in Denmark witnessed the steepest upward trajectory, surging from roughly 21% in 2010 to over 55% in 2024, eclipsing all other sources combined. Germany and Spain also demonstrated substantial transformations. In Germany, solar PV generation climbed from 3% to nearly 18%, while wind electricity rose from 9% to 32%. Spain exhibited a parallel diversification, with solar and wind collectively contributing over 45% of total generation in 2024 compared to under 20% in 2010. The United Kingdom experienced notable growth in offshore wind, rising from 5% to 28% across the period, underscoring a continent-wide transition toward decarbonised power grids.`;

    const t1SubmitRes = await fetchJson(`/writing/sessions/${t1Session.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({ essayText: t1Essay, timeSpentSeconds: 1100 }),
    });
    assert.strictEqual(t1SubmitRes.status, 200);
    const t1Eval = t1SubmitRes.data.data.evaluation;
    assert.ok(t1Eval.overallScore >= 6.5, 'Task 1 proficient essay should score Band 6.5+');
    const taskAch = t1Eval.criteriaScores.find((c) => c.name === 'Task Achievement');
    assert.ok(taskAch, 'Task 1 evaluation must evaluate Task Achievement');
    console.log(`   ✓ Task 1 evaluated: ${t1Eval.band}, Overall: ${t1Eval.overallScore}/9, Task Achievement: ${taskAch.score}/9`);

    // 6. Test IELTS Task 2 Session Lifecycle (Discursive Essay)
    console.log('\n6. Testing End-to-End Task 2 Discursive Essay Lifecycle...');
    const t2SessionRes = await fetchJson('/writing/sessions/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({ questionId: 'q_ielts_wrt_07', mode: 'PRACTICE' }),
    });
    assert.strictEqual(t2SessionRes.status, 201);
    const t2Session = t2SessionRes.data.data.session;

    const t2Essay = `In an era marked by profound social inequality, escalating climate instability, and overburdened healthcare systems, allocating billions of dollars to extraterrestrial exploration frequently evokes intense moral reproach. Many critics maintain that humanitarian crises on Earth demand total fiscal prioritization over speculative interplanetary voyages. While addressing human suffering is undeniably an ethical imperative, I disagree that defunding space exploration is the remedy, as astronomical research provides the technological, ecological, and economic tools essential for solving terrestrial problems.

First, the perceived dichotomy between space spending and domestic poverty alleviation relies on a fundamental misconception regarding how space budgets are utilized. Governments do not literally send piles of cash into orbit; rather, capital is invested terrestrially in scientists, engineers, manufacturing supply chains, and academic research institutions. The aerospace sector drives high-wage employment, scientific infrastructure, and tax revenues that directly finance social welfare programs. Furthermore, global space budgets represent a minuscule fraction of national expenditures compared to military defense and corporate subsidies, making it illogical to blame space initiatives for socioeconomic neglect.

More importantly, space exploration yields indispensable technological spin-offs that directly mitigate acute planetary and human suffering. Modern satellite constellations provide the real-time meteorological and orbital imagery required to model climate change, track agricultural drought patterns, optimize freshwater distribution, and orchestrate humanitarian disaster relief during catastrophic typhoons. Medical innovations originally developed for astronaut survival—such as advanced dialysis filtration, portable cardiac monitors, and robotic micro-surgical tools—have transformed public healthcare worldwide. Defunding space programs would cripple our ability to safeguard global food security and monitor environmental collapse.

In conclusion, astronomical exploration is not an extravagant vanity project, but an indispensable catalyst for scientific progress and planetary stewardship. Rather than curtailing space exploration, governments should reallocate wasteful military spending toward poverty alleviation while sustaining the orbital innovations that protect humanity's collective future.`;

    const t2SubmitRes = await fetchJson(`/writing/sessions/${t2Session.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
      body: JSON.stringify({ essayText: t2Essay, timeSpentSeconds: 2100 }),
    });
    assert.strictEqual(t2SubmitRes.status, 200);
    const t2Eval = t2SubmitRes.data.data.evaluation;
    assert.ok(t2Eval.overallScore >= 7.5, 'Proficient Task 2 essay should score Band 7.5+');
    assert.strictEqual(t2Eval.wordCountCompliant, true);
    assert.ok(t2Eval.wordCount >= 250);
    const taskResp = t2Eval.criteriaScores.find((c) => c.name === 'Task Response');
    assert.ok(taskResp, 'Task 2 evaluation must evaluate Task Response');
    console.log(`   ✓ Task 2 evaluated: ${t2Eval.band}, Overall: ${t2Eval.overallScore}/9, Task Response: ${taskResp.score}/9`);
    console.log(`   ✓ Word Count: ${t2Eval.wordCount} words (compliant >= 250 min)`);

    // 7. Test AI Question Generator Endpoint for WRITING type
    console.log('\n7. Testing AI Question Generator Endpoint for WRITING type...');
    const aiGenRes = await fetchJson('/ai/questions/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        subjectId: 'sub_ielts_writing',
        topicId: 'top_ielts_write_t1',
        type: 'WRITING',
        difficulty: 'MEDIUM',
        marks: 9.0,
        count: 1,
        customPrompt: 'Task 1 bar chart on urban renewable energy trends',
      }),
    });
    assert.strictEqual(aiGenRes.status, 201, 'AI generation should return 201');
    const aiQ = aiGenRes.data.data?.questions ? aiGenRes.data.data.questions[0] : aiGenRes.data.data;
    assert.ok(aiQ, 'Should generate at least 1 draft question');
    assert.strictEqual(aiQ.status, 'DRAFT');
    console.log(`   ✓ AI generator created draft writing question (${aiQ.id}) with status DRAFT`);

    // 8. Cleanup test-generated questions to keep Question Bank clean
    console.log('\n8. Cleaning up ephemeral test-generated questions...');
    if (authoredQId) {
      await fetchJson(`/questions/${authoredQId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      console.log(`   ✓ Cleaned up test-authored question: ${authoredQId}`);
    }
    if (aiQ?.id) {
      await fetchJson(`/questions/${aiQ.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      console.log(`   ✓ Cleaned up test-generated AI question: ${aiQ.id}`);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL EXAMOS WRITING SECTION & AUTHORING TESTS PASSED!');
    console.log('================================================================\n');
    passed++;
  } catch (err) {
    console.error('\n❌ Writing test suite failure:', err);
    failed++;
  }

  process.exit(failed > 0 ? 1 : 0);
}

runWritingSuite();
