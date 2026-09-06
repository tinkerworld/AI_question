// Runner: npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only tests/phase-15-interview-conversation-flow.test.js
const http = require('http');
const assert = require('assert');
const path = require('path');

const API_BASE = process.env.API_BASE || 'http://localhost:4043/api/v1';

function request(method, reqPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${reqPath}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + (url.search || ''),
        method,
        headers,
      },
      (res) => {
        let respBody = '';
        res.on('data', (chunk) => (respBody += chunk));
        res.on('end', () => {
          try {
            const parsed = respBody ? JSON.parse(respBody) : {};
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, data: respBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING INTERVIEW CONVERSATION FLOW & TEMPLATE AUDIT TESTS');
  console.log('================================================================\n');

  // Authenticate Personas
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@examos.com', password: 'Admin@123' });
  assert.strictEqual(adminLogin.status, 200, 'Admin login failed');
  const adminToken = adminLogin.data.data.accessToken;

  const studentLogin = await request('POST', '/auth/login', {
    email: 'student@examos.com',
    password: 'Student@123',
  });
  assert.strictEqual(studentLogin.status, 200, 'Student login must succeed');
  const studentToken = studentLogin.data.data.accessToken;
  const studentUserId = studentLogin.data.data.user.id;

  const { InterviewService } = require(path.resolve(__dirname, '../apps/api/src/services/interview.service.ts'));

  const questionId = 'q_interview_ielts_01';

  // -------------------------------------------------------------
  // Test 1: Code-driven evaluateTurnTemplateSelection logic
  // -------------------------------------------------------------
  await test('INT-FLOW-001: evaluateTurnTemplateSelection selects templates via plain code heuristics', async () => {
    // Under 12 words -> CLARIFY_PROMPT
    const shortDecision = InterviewService.evaluateTurnTemplateSelection({
      wordCount: 5,
      currentMainIndex: 1,
      currentFollowUpCount: 0,
      isExhaustiveAnswer: false,
    });
    assert.strictEqual(shortDecision.selectedTemplate, 'CLARIFY_PROMPT');
    assert.strictEqual(shortDecision.isNewMainQuestion, false);
    assert.strictEqual(shortDecision.isCompleted, false);
    assert.strictEqual(shortDecision.nextMainIndex, 1);

    // Substantive answer (>= 12 words) -> FOLLOW_UP_PROMPT
    const substantiveDecision = InterviewService.evaluateTurnTemplateSelection({
      wordCount: 25,
      currentMainIndex: 1,
      currentFollowUpCount: 0,
      isExhaustiveAnswer: false,
    });
    assert.strictEqual(substantiveDecision.selectedTemplate, 'FOLLOW_UP_PROMPT');
    assert.strictEqual(substantiveDecision.isNewMainQuestion, false);
    assert.strictEqual(substantiveDecision.isCompleted, false);
    assert.strictEqual(substantiveDecision.nextMainIndex, 1);
    assert.strictEqual(substantiveDecision.nextFollowUpCount, 1);

    // Topic sufficiently covered after 2 follow-ups -> NEW_TOPIC_PROMPT
    const advanceDecision = InterviewService.evaluateTurnTemplateSelection({
      wordCount: 30,
      currentMainIndex: 1,
      currentFollowUpCount: 2,
      isExhaustiveAnswer: false,
    });
    assert.strictEqual(advanceDecision.selectedTemplate, 'NEW_TOPIC_PROMPT');
    assert.strictEqual(advanceDecision.isNewMainQuestion, true);
    assert.strictEqual(advanceDecision.nextMainIndex, 2);
    assert.strictEqual(advanceDecision.nextFollowUpCount, 0);

    // Exhaustive answer on turn 1 (> 70 words with conclusion) -> NEW_TOPIC_PROMPT
    const exhaustiveDecision = InterviewService.evaluateTurnTemplateSelection({
      wordCount: 85,
      currentMainIndex: 1,
      currentFollowUpCount: 0,
      isExhaustiveAnswer: true,
    });
    assert.strictEqual(exhaustiveDecision.selectedTemplate, 'NEW_TOPIC_PROMPT');
    assert.strictEqual(exhaustiveDecision.isNewMainQuestion, true);
    assert.strictEqual(exhaustiveDecision.nextMainIndex, 2);

    // Topic 5 sufficiently covered -> Completed
    const completionDecision = InterviewService.evaluateTurnTemplateSelection({
      wordCount: 40,
      currentMainIndex: 5,
      currentFollowUpCount: 2,
      isExhaustiveAnswer: false,
    });
    assert.strictEqual(completionDecision.selectedTemplate, 'NEW_TOPIC_PROMPT');
    assert.strictEqual(completionDecision.isCompleted, true);
  });

  // -------------------------------------------------------------
  // Test 2: Audit buildDecoupledInterviewPrompt contents
  // -------------------------------------------------------------
  await test('INT-FLOW-002: Prompt audit confirms prior history, verbatim answer, uncovered areas, and active template', async () => {
    const priorTurns = [
      { turnNumber: 1, speaker: 'AI', message: 'Welcome. How do you handle cross-region ingestion?' },
      { turnNumber: 2, speaker: 'CANDIDATE', message: 'We deploy Kafka clusters in us-east and eu-central with MirrorMaker.' },
      { turnNumber: 3, speaker: 'AI', message: 'What happens when network partition delays replication beyond 85ms?' },
    ];
    const candidateLatestAnswer = 'We switch producer acks to local-quorum and buffer uncommitted events into durable NVMe tier.';
    const wordCount = candidateLatestAnswer.split(/\s+/).length;

    // A. Audit with FOLLOW_UP_PROMPT
    const followUpPrompt = InterviewService.buildDecoupledInterviewPrompt({
      scenario: 'High-volume streaming assessment',
      questionContent: 'Streaming architecture scenario',
      knowledgeDataset: {
        summary: 'Streaming platform dataset',
        groundTruthFacts: ['RPO is zero', 'Cross-region latency is 85ms'],
      },
      behavioralPrompt: {
        persona: 'Chief Systems Evaluator',
        tone: 'RIGOROUS_PROBING',
        focusAreas: ['Replication latency', 'Partition recovery', 'Data durability'],
        avoidList: ['CSS frameworks'],
      },
      rubric: [
        { id: 'tech_depth', name: 'Technical Depth', maxScore: 10 },
        { id: 'resilience', name: 'Partition Resilience', maxScore: 10 },
      ],
      priorTurns,
      candidateLatestAnswer,
      wordCount,
      selectedTemplate: 'FOLLOW_UP_PROMPT',
      templateReason: 'Candidate gave substantive answer with 15 words.',
      targetFacet: { name: 'Operational Mechanisms & Concrete Execution', focus: 'Detail step-by-step procedures' },
      nextMainIndex: 1,
      nextFollowUpCount: 2,
      isNewMainQuestion: false,
      coveredFocusAreas: ['Replication latency'],
    });

    // Requirement 1(a): Full prior turn history
    assert.ok(followUpPrompt.includes('[FULL_SESSION_CONVERSATION_HISTORY]'), 'Must include full history header');
    assert.ok(followUpPrompt.includes('Turn 1 [AI]: Welcome. How do you handle cross-region ingestion?'), 'Must include Turn 1');
    assert.ok(followUpPrompt.includes('Turn 2 [CANDIDATE]: We deploy Kafka clusters'), 'Must include Turn 2');
    assert.ok(followUpPrompt.includes('Turn 3 [AI]: What happens when network partition delays'), 'Must include Turn 3');

    // Requirement 1(b): Candidate most recent answer verbatim
    assert.ok(followUpPrompt.includes('[CANDIDATE_MOST_RECENT_ANSWER_VERBATIM]'), 'Must include verbatim header');
    assert.ok(followUpPrompt.includes(candidateLatestAnswer), 'Must include exact verbatim answer text');

    // Requirement 1(c): Which rubric / topic areas are still uncovered
    assert.ok(followUpPrompt.includes('[UNCOVERED_EVALUATION_AREAS]'), 'Must include uncovered evaluation areas header');
    assert.ok(followUpPrompt.includes('Partition recovery'), 'Must list uncovered focus area');
    assert.ok(followUpPrompt.includes('Partition Resilience'), 'Must list uncovered rubric criterion');
    assert.ok(followUpPrompt.includes('Remaining Thematic Facets:'), 'Must list remaining facets');

    // Requirement 2: Active single-purpose prompt template
    assert.ok(followUpPrompt.includes('[ACTIVE_PROMPT_TEMPLATE: FOLLOW_UP_PROMPT]'), 'Must include FOLLOW_UP_PROMPT template block');
    assert.ok(followUpPrompt.includes('Do NOT advance to a new topic yet'), 'Must instruct to stay on topic');

    // B. Audit with CLARIFY_PROMPT
    const clarifyPrompt = InterviewService.buildDecoupledInterviewPrompt({
      scenario: 'Streaming architecture scenario',
      priorTurns: [{ turnNumber: 1, speaker: 'AI', message: 'What is your partition strategy?' }],
      candidateLatestAnswer: 'We use hashing.',
      wordCount: 3,
      selectedTemplate: 'CLARIFY_PROMPT',
      templateReason: 'Answer was too brief (3 words < 12).',
      targetFacet: { name: 'Core Foundations', focus: 'Fundamental mechanics' },
      nextMainIndex: 1,
      nextFollowUpCount: 1,
      isNewMainQuestion: false,
    });
    assert.ok(clarifyPrompt.includes('[ACTIVE_PROMPT_TEMPLATE: CLARIFY_PROMPT]'), 'Must include CLARIFY_PROMPT template');
    assert.ok(clarifyPrompt.includes('STRICTLY FORBIDDEN: DO NOT advance to a new topic'), 'Must forbid advancing on clarify');
    assert.ok(clarifyPrompt.includes('We use hashing.'), 'Must quote candidate brief statement');

    // C. Audit with NEW_TOPIC_PROMPT
    const newTopicPrompt = InterviewService.buildDecoupledInterviewPrompt({
      scenario: 'Streaming architecture scenario',
      priorTurns,
      candidateLatestAnswer,
      wordCount,
      selectedTemplate: 'NEW_TOPIC_PROMPT',
      templateReason: 'Topic 1 sufficiently covered after 2 follow-ups.',
      targetFacet: { name: 'Crisis Response, Edge Cases & Failure Modes', focus: 'Contingency recovery' },
      nextMainIndex: 2,
      nextFollowUpCount: 0,
      isNewMainQuestion: true,
    });
    assert.ok(newTopicPrompt.includes('[ACTIVE_PROMPT_TEMPLATE: NEW_TOPIC_PROMPT]'), 'Must include NEW_TOPIC_PROMPT template');
    assert.ok(newTopicPrompt.includes('Main Question 2 of 5'), 'Must command advancement to Question 2');
  });

  // -------------------------------------------------------------
  // Test 3: Live API Turn Flow with Session Debug Logging (Requirement 3)
  // -------------------------------------------------------------
  await test('INT-FLOW-003: Live session tracks code-selected templates and debugInfo history', async () => {
    // Purge previous test sessions for student to guarantee clean daily entitlement
    await request('DELETE', `/interview/admin/user-sessions/${studentUserId}`, null, adminToken);

    // 1. Start Session
    const startRes = await request('POST', '/interview/sessions/start', {
      questionId,
      mode: 'PRACTICE',
    }, studentToken);

    assert.ok(startRes.status === 200 || startRes.status === 201, `Start session failed: ${JSON.stringify(startRes.data)}`);
    const session = startRes.data.data.session;
    const sessionId = session.id;
    assert.ok(sessionId, 'Must return session ID');

    // Initial session has null template and empty history
    assert.strictEqual(session.lastSelectedTemplate, null);
    assert.ok(session.debugInfo, 'debugInfo must be initialized');

    // 2. Submit Turn 1: Short / vague answer (< 12 words) -> CLARIFY_PROMPT
    const turn1Res = await request('POST', `/interview/sessions/${sessionId}/turns`, {
      message: 'Yes, we use microservices.',
    }, studentToken);

    assert.strictEqual(turn1Res.status, 200, `Turn 1 submission failed: ${JSON.stringify(turn1Res.data)}`);
    const turn1Data = turn1Res.data.data;
    assert.strictEqual(turn1Data.candidateTurn.selectedTemplate, 'CLARIFY_PROMPT', 'Candidate turn must record CLARIFY_PROMPT');
    assert.strictEqual(turn1Data.aiTurn.selectedTemplate, 'CLARIFY_PROMPT', 'AI turn must record CLARIFY_PROMPT');
    assert.strictEqual(turn1Data.session.lastSelectedTemplate, 'CLARIFY_PROMPT', 'Session lastSelectedTemplate must be CLARIFY_PROMPT');
    assert.strictEqual(turn1Data.session.mainQuestionIndex, 1, 'Must not advance main question on clarify');
    assert.strictEqual(turn1Data.session.debugInfo.lastSelectedTemplate, 'CLARIFY_PROMPT');
    assert.strictEqual(turn1Data.session.debugInfo.templateHistory.length, 1);
    assert.strictEqual(turn1Data.session.debugInfo.templateHistory[0].selectedTemplate, 'CLARIFY_PROMPT');

    // 3. Submit Turn 2: Substantive answer (>= 12 words) -> FOLLOW_UP_PROMPT
    const turn2Res = await request('POST', `/interview/sessions/${sessionId}/turns`, {
      message: 'To handle high-throughput event streams, we partition topics by merchantId and deploy distributed consumers with consumer groups across two availability zones.',
    }, studentToken);

    assert.strictEqual(turn2Res.status, 200, `Turn 2 submission failed: ${JSON.stringify(turn2Res.data)}`);
    const turn2Data = turn2Res.data.data;
    assert.strictEqual(turn2Data.candidateTurn.selectedTemplate, 'FOLLOW_UP_PROMPT', 'Turn 2 candidate must be FOLLOW_UP_PROMPT');
    assert.strictEqual(turn2Data.session.lastSelectedTemplate, 'FOLLOW_UP_PROMPT');
    assert.strictEqual(turn2Data.session.debugInfo.lastSelectedTemplate, 'FOLLOW_UP_PROMPT');
    assert.strictEqual(turn2Data.session.debugInfo.templateHistory.length, 2);
    assert.strictEqual(turn2Data.session.debugInfo.templateHistory[1].selectedTemplate, 'FOLLOW_UP_PROMPT');

    // 4. Submit Turn 3: Exhaustive answer (> 70 words with conclusion keywords) -> NEW_TOPIC_PROMPT
    const turn3Res = await request('POST', `/interview/sessions/${sessionId}/turns`, {
      message: 'To comprehensively address data integrity during cluster failover, we enforce synchronous ISR replication factors of three with min-insync-replicas set to two. Furthermore, all producer clients publish with idempotent delivery enabled, and consumers commit offsets only after database transactions successfully land. In conclusion, this guarantees that no messages are dropped or duplicated during unplanned network splits, allowing us to move to next topic seamlessly.',
    }, studentToken);

    assert.strictEqual(turn3Res.status, 200, `Turn 3 submission failed: ${JSON.stringify(turn3Res.data)}`);
    const turn3Data = turn3Res.data.data;
    assert.strictEqual(turn3Data.candidateTurn.selectedTemplate, 'NEW_TOPIC_PROMPT', 'Turn 3 candidate must be NEW_TOPIC_PROMPT');
    assert.strictEqual(turn3Data.session.lastSelectedTemplate, 'NEW_TOPIC_PROMPT');
    assert.strictEqual(turn3Data.session.mainQuestionIndex, 2, 'Must advance to main question 2 on NEW_TOPIC_PROMPT');
    assert.strictEqual(turn3Data.session.debugInfo.lastSelectedTemplate, 'NEW_TOPIC_PROMPT');
    assert.strictEqual(turn3Data.session.debugInfo.templateHistory.length, 3);
    assert.strictEqual(turn3Data.session.debugInfo.templateHistory[2].selectedTemplate, 'NEW_TOPIC_PROMPT');

    // 5. Check GET /interview/sessions/:id reflects debugInfo and template history
    const getSessRes = await request('GET', `/interview/sessions/${sessionId}`, null, studentToken);
    assert.strictEqual(getSessRes.status, 200);
    const fetchedSession = getSessRes.data.data;
    assert.strictEqual(fetchedSession.lastSelectedTemplate, 'NEW_TOPIC_PROMPT');
    assert.ok(fetchedSession.debugInfo.templateHistory.length >= 3);
  });

  // -------------------------------------------------------------
  // Test 4: Mid-interview Failover DB Reconstruction (Requirement 4)
  // -------------------------------------------------------------
  await test('INT-FLOW-004: Mid-interview failover reconstructs prompt context directly from DB interview_turns', async () => {
    const { AIGatewayService } = require(path.resolve(__dirname, '../apps/api/src/services/ai-gateway.service.ts'));

    const mockDbTurns = [
      { speaker: 'AI', message: 'Welcome. Describe your caching architecture.', turnNumber: 1 },
      { speaker: 'CANDIDATE', message: 'We utilize Redis clusters with two read replicas in us-east-1.', turnNumber: 2 },
      { speaker: 'AI', message: 'How do you prevent cache stampedes during traffic spikes?', turnNumber: 3 },
      { speaker: 'CANDIDATE', message: 'We enforce probabilistic early expiration with distributed mutex locks via Redlock.', turnNumber: 4 },
    ];
    const systemPrompt = 'You are a Senior Principal Examiner.';

    // Reconstruct messages from DB turns (simulating failover from memory to DB)
    const reconstructed = AIGatewayService.reconstructMessagesFromTurns(systemPrompt, mockDbTurns);

    assert.strictEqual(reconstructed.length, 5, 'Must contain system prompt + 4 turns');
    assert.strictEqual(reconstructed[0].role, 'system');
    assert.strictEqual(reconstructed[0].content, systemPrompt);
    assert.strictEqual(reconstructed[1].role, 'assistant');
    assert.strictEqual(reconstructed[1].content, 'Welcome. Describe your caching architecture.');
    assert.strictEqual(reconstructed[2].role, 'user');
    assert.strictEqual(reconstructed[2].content, 'We utilize Redis clusters with two read replicas in us-east-1.');
    assert.strictEqual(reconstructed[3].role, 'assistant');
    assert.strictEqual(reconstructed[3].content, 'How do you prevent cache stampedes during traffic spikes?');
    assert.strictEqual(reconstructed[4].role, 'user');
    assert.strictEqual(reconstructed[4].content, 'We enforce probabilistic early expiration with distributed mutex locks via Redlock.');
  });

  // -------------------------------------------------------------
  // Test 5: PREP PHASE Bank Generation and Caching (Requirement 1)
  // -------------------------------------------------------------
  await test('INT-FLOW-005: PREP PHASE creates and caches 5-facet x 4-variant follow-up bank in DB', async () => {
    // Purge previous test sessions for clean daily entitlement
    await request('DELETE', `/interview/admin/user-sessions/${studentUserId}`, null, adminToken);

    // Start a new session
    const startRes = await request('POST', '/interview/sessions/start', {
      questionId,
      mode: 'PRACTICE',
    }, studentToken);

    assert.ok(startRes.status === 200 || startRes.status === 201, `Start session failed: ${JSON.stringify(startRes.data)}`);
    const session = startRes.data.data.session;
    const sessionId = session.id;

    // Verify facetFollowUpBank is present on session object
    assert.ok(session.facetFollowUpBank, 'facetFollowUpBank must be present on session');
    const bank = session.facetFollowUpBank;

    // Verify all 5 viva facets exist in the bank
    for (let f = 1; f <= 5; f++) {
      const facetKey = String(f);
      assert.ok(bank[facetKey], `Bank must contain facet ${facetKey}`);
      const facetEntry = bank[facetKey];

      // Verify all 4 required follow-up variants exist
      assert.ok(facetEntry.STRONG_ANSWER, `Facet ${facetKey} must have STRONG_ANSWER variant`);
      assert.ok(facetEntry.VAGUE_ANSWER, `Facet ${facetKey} must have VAGUE_ANSWER variant`);
      assert.ok(facetEntry.OFF_TOPIC_ANSWER, `Facet ${facetKey} must have OFF_TOPIC_ANSWER variant`);
      assert.ok(facetEntry.DONT_KNOW_ANSWER, `Facet ${facetKey} must have DONT_KNOW_ANSWER variant`);
      assert.ok(facetEntry.OPENING, `Facet ${facetKey} must have OPENING question`);

      // Verify bank entries are meaningful non-empty sentences
      assert.ok(facetEntry.STRONG_ANSWER.length > 20, `Facet ${facetKey} STRONG_ANSWER must be substantial`);
      assert.ok(facetEntry.VAGUE_ANSWER.length > 20, `Facet ${facetKey} VAGUE_ANSWER must be substantial`);
      assert.ok(facetEntry.OFF_TOPIC_ANSWER.length > 20, `Facet ${facetKey} OFF_TOPIC_ANSWER must be substantial`);
      assert.ok(facetEntry.DONT_KNOW_ANSWER.length > 20, `Facet ${facetKey} DONT_KNOW_ANSWER must be substantial`);
    }

    // Verify GET /interview/sessions/:id also returns the cached facetFollowUpBank
    const getRes = await request('GET', `/interview/sessions/${sessionId}`, null, studentToken);
    assert.strictEqual(getRes.status, 200);
    const fetchedBank = getRes.data.data.facetFollowUpBank;
    assert.ok(fetchedBank, 'GET session must return cached facetFollowUpBank');
    assert.strictEqual(Object.keys(fetchedBank).length, 5, 'Must contain 5 facets');
  });

  // -------------------------------------------------------------
  // Test 6: Answer Pattern Classification Logic
  // -------------------------------------------------------------
  await test('INT-FLOW-006: classifyAnswerPattern accurately classifies all 4 candidate response patterns', async () => {
    const targetFacet = {
      name: 'Foundational Philosophy & First Principles',
      focus: 'Establish the core conceptual framework and primary definitions.',
    };
    const questionContent = 'Design a scalable multi-region distributed streaming platform.';

    // 1. DONT_KNOW_ANSWER: expressions of uncertainty or minimal concession
    const patternDontKnow1 = InterviewService.classifyAnswerPattern({
      message: "I don't know the exact replication protocol used here.",
      wordCount: 9,
      selectedTemplate: 'CLARIFY_PROMPT',
      targetFacet,
      questionContent,
    });
    assert.strictEqual(patternDontKnow1, 'DONT_KNOW_ANSWER', 'Must classify "don\'t know" as DONT_KNOW_ANSWER');

    const patternDontKnow2 = InterviewService.classifyAnswerPattern({
      message: "I am not sure about this topic.",
      wordCount: 7,
      selectedTemplate: 'CLARIFY_PROMPT',
      targetFacet,
      questionContent,
    });
    assert.strictEqual(patternDontKnow2, 'DONT_KNOW_ANSWER', 'Must classify "not sure" as DONT_KNOW_ANSWER');

    const patternDontKnow3 = InterviewService.classifyAnswerPattern({
      message: "No idea",
      wordCount: 2,
      selectedTemplate: 'CLARIFY_PROMPT',
      targetFacet,
      questionContent,
    });
    assert.strictEqual(patternDontKnow3, 'DONT_KNOW_ANSWER', 'Must classify brief refusal as DONT_KNOW_ANSWER');

    // 2. VAGUE_ANSWER: under 12 words or vague without don't know
    const patternVague = InterviewService.classifyAnswerPattern({
      message: 'Yes, we use microservices for the backend architecture.',
      wordCount: 8,
      selectedTemplate: 'CLARIFY_PROMPT',
      targetFacet,
      questionContent,
    });
    assert.strictEqual(patternVague, 'VAGUE_ANSWER', 'Must classify brief response as VAGUE_ANSWER');

    // 3. OFF_TOPIC_ANSWER: substantive but orthogonal to facet and question keywords
    const patternOffTopic = InterviewService.classifyAnswerPattern({
      message: 'Yesterday I watched the cricket world cup tournament and the weather was sunny throughout the entire weekend afternoon.',
      wordCount: 19,
      selectedTemplate: 'FOLLOW_UP_PROMPT',
      targetFacet,
      questionContent,
    });
    assert.strictEqual(patternOffTopic, 'OFF_TOPIC_ANSWER', 'Must classify irrelevant talk as OFF_TOPIC_ANSWER');

    // 4. STRONG_ANSWER: substantive response addressing system architecture
    const patternStrong = InterviewService.classifyAnswerPattern({
      message: 'To handle streaming throughput, we partition Kafka logs by customerId with synchronous in-sync replicas and NVMe backed storage tiers.',
      wordCount: 19,
      selectedTemplate: 'FOLLOW_UP_PROMPT',
      targetFacet,
      questionContent,
    });
    assert.strictEqual(patternStrong, 'STRONG_ANSWER', 'Must classify technical answer as STRONG_ANSWER');
  });

  // -------------------------------------------------------------
  // Test 7: LIVE PHASE Bank Lookup, Rephrase, and AS-IS Fallback (Requirement 2)
  // -------------------------------------------------------------
  await test('INT-FLOW-007: Live phase uses bank entry, logs answerPattern & bankQuestionUsed, and falls back cleanly', async () => {
    // Purge previous test sessions
    await request('DELETE', `/interview/admin/user-sessions/${studentUserId}`, null, adminToken);

    // 1. Start Session
    const startRes = await request('POST', '/interview/sessions/start', {
      questionId,
      mode: 'PRACTICE',
    }, studentToken);
    assert.ok(startRes.status === 200 || startRes.status === 201);
    const sessionId = startRes.data.data.session.id;

    // 2. Turn 1: Submit uncertain answer -> DONT_KNOW_ANSWER
    const turn1Res = await request('POST', `/interview/sessions/${sessionId}/turns`, {
      message: "I do not know how Kafka partition replication internally coordinates.",
    }, studentToken);
    assert.strictEqual(turn1Res.status, 200);
    const turn1Data = turn1Res.data.data;
    assert.strictEqual(turn1Data.session.debugInfo.lastAnswerPattern, 'DONT_KNOW_ANSWER');
    const turn1History = turn1Data.session.debugInfo.templateHistory[0];
    assert.strictEqual(turn1History.answerPattern, 'DONT_KNOW_ANSWER');
    assert.ok(turn1History.bankQuestionUsed, 'Must record bankQuestionUsed');
    assert.ok(turn1Data.aiTurn.message.length > 10, 'Must provide coherent follow-up question');

    // 3. Turn 2: Submit substantive on-topic answer -> STRONG_ANSWER
    const turn2Res = await request('POST', `/interview/sessions/${sessionId}/turns`, {
      message: 'A significant technological innovation reshaping education is the adoption of AI-driven adaptive learning systems, which offer customized lesson pacing while requiring rigorous governance to prevent student over-reliance.',
    }, studentToken);
    assert.strictEqual(turn2Res.status, 200);
    const turn2Data = turn2Res.data.data;
    assert.strictEqual(turn2Data.session.debugInfo.lastAnswerPattern, 'STRONG_ANSWER');
    const turn2History = turn2Data.session.debugInfo.templateHistory[1];
    assert.strictEqual(turn2History.answerPattern, 'STRONG_ANSWER');
    assert.ok(turn2History.bankQuestionUsed, 'Must record bankQuestionUsed');
    assert.strictEqual(typeof turn2History.rephraseApplied, 'boolean', 'rephraseApplied must be a boolean');
    // Ensure AI response does not contain random keyword-spliced garbage
    assert.ok(!turn2Data.aiTurn.message.includes('regarding "undefined"'), 'Must not produce undefined keyword splice');
  });

  // -------------------------------------------------------------
  // Test 8: Named Timeout Constants and Groq Cloud Provider Activation (Requirements 3 & 5)
  // -------------------------------------------------------------
  await test('INT-FLOW-008: Timeout split constants defined and Groq provider is active in DB', async () => {
    const {
      AIGatewayService,
      LOCAL_PROVIDER_DEFAULT_TIMEOUT_MS,
      LOCAL_PROVIDER_LIVE_TURN_TIMEOUT_MS,
    } = require(path.resolve(__dirname, '../apps/api/src/services/ai-gateway.service.ts'));

    // Requirement 3: Named timeout constants
    assert.strictEqual(LOCAL_PROVIDER_DEFAULT_TIMEOUT_MS, 25000, 'DEFAULT timeout must be 25s (25000ms)');
    assert.strictEqual(LOCAL_PROVIDER_LIVE_TURN_TIMEOUT_MS, 8000, 'LIVE TURN timeout must be 8s (8000ms)');
    assert.strictEqual(AIGatewayService.LOCAL_PROVIDER_DEFAULT_TIMEOUT_MS, 25000);
    assert.strictEqual(AIGatewayService.LOCAL_PROVIDER_LIVE_TURN_TIMEOUT_MS, 8000);

    // Requirement 5: Groq Cloud provider active in DB
    const provRes = await request('GET', '/ai/gateway/providers?scope=interview_conversation', null, adminToken);
    assert.strictEqual(provRes.status, 200, 'Admin can list AI providers');
    const providers = provRes.data.data;
    const groqProv = providers.find((p) => p.id === 'prov_ivconv_cloud_groq');
    assert.ok(groqProv, 'prov_ivconv_cloud_groq must exist in database');
    assert.strictEqual(groqProv.isActive, true, 'prov_ivconv_cloud_groq must be isActive: true');
    assert.strictEqual(groqProv.priority, 1, 'prov_ivconv_cloud_groq must have priority 1');
  });

  // -------------------------------------------------------------
  // Test 9: Avoid-list and Knowledge-boundary Enforcement in Live Turns
  // -------------------------------------------------------------
  await test('INT-FLOW-009: Live interview session enforces avoidList and knowledge-boundary constraints across conversation turns', async () => {
    // 1. Fetch current question data via HTTP to restore later
    const qGetRes = await request('GET', `/questions/${questionId}`, null, adminToken);
    assert.strictEqual(qGetRes.status, 200, 'Target question must exist');
    const rawData = qGetRes.data.data.data;
    const originalData = typeof rawData === 'string'
      ? JSON.parse(rawData)
      : rawData;

    // 2. Define prohibited avoid-list terms and ground-truth facts
    const testAvoidList = [
      'cryptocurrency speculation',
      'bitcoin mining',
      'defi arbitrage',
    ];
    const testGroundTruthFacts = [
      'Digital educational platforms enhance personalized feedback when guided by certified educators.',
      'Unsupervised automated assistance reduces foundational cognitive synthesis.',
    ];

    const updatedData = {
      ...originalData,
      knowledgeDataset: {
        summary: 'Digital learning tools and educational autonomy',
        groundTruthFacts: testGroundTruthFacts,
      },
      behavioralPrompt: {
        ...originalData.behavioralPrompt,
        avoidList: testAvoidList,
        focusAreas: ['Digital learning tools', 'Educational autonomy'],
      },
    };

    // Update question via admin PATCH endpoint
    const patchRes = await request('PATCH', `/questions/${questionId}`, {
      data: updatedData,
    }, adminToken);
    assert.strictEqual(patchRes.status, 200, 'PATCH question with avoidList must succeed');

    try {
      // 3. Purge previous test sessions and reset daily quota
      await request('DELETE', `/interview/admin/user-sessions/${studentUserId}`, null, adminToken);

      // 4. Start real interview session
      const startRes = await request(
        'POST',
        '/interview/sessions/start',
        {
          questionId,
          mode: 'PRACTICE',
        },
        studentToken
      );

      assert.ok(startRes.status === 200 || startRes.status === 201, `Start session failed: ${JSON.stringify(startRes.data)}`);
      const session = startRes.data.data.session;
      const sessionId = session.id;
      assert.ok(sessionId, 'Session ID must be present');

      // Verify opening turn does not contain any avoid-list term
      const openingMsg = (startRes.data.data.initialTurn?.message || '').toLowerCase();
      for (const term of testAvoidList) {
        assert.ok(
          !openingMsg.includes(term.toLowerCase()),
          `Opening AI turn must not contain avoid-list term "${term}"`
        );
      }

      // Verify cached bank in session does not contain any avoid-list term
      const sessionBank = session.facetFollowUpBank;
      if (sessionBank && typeof sessionBank === 'object') {
        for (const facetKey of Object.keys(sessionBank)) {
          for (const variant of Object.keys(sessionBank[facetKey])) {
            const bankQ = (sessionBank[facetKey][variant] || '').toLowerCase();
            for (const term of testAvoidList) {
              assert.ok(
                !bankQ.includes(term.toLowerCase()),
                `Facet ${facetKey} variant ${variant} in pre-generated bank must not contain avoid-list term "${term}"`
              );
            }
          }
        }
      }

      // 5. Submit Turn 1: Candidate answer (even if baiting with avoid terms)
      const turn1Res = await request(
        'POST',
        `/interview/sessions/${sessionId}/turns`,
        {
          message: 'Digital learning tools are effective, but should students also invest in cryptocurrency speculation and bitcoin mining during school hours?',
        },
        studentToken
      );

      assert.strictEqual(turn1Res.status, 200, `Turn 1 submission failed: ${JSON.stringify(turn1Res.data)}`);
      const turn1AiMessage = (turn1Res.data.data.aiTurn?.message || '').toLowerCase();
      for (const term of testAvoidList) {
        assert.ok(
          !turn1AiMessage.includes(term.toLowerCase()),
          `Live turn 1 AI message must NEVER contain avoid-list term "${term}". Received: "${turn1Res.data.data.aiTurn?.message}"`
        );
      }

      // 6. Submit Turn 2: Another turn with substantive feedback
      const turn2Res = await request(
        'POST',
        `/interview/sessions/${sessionId}/turns`,
        {
          message: 'Educators must implement structured pedagogical frameworks so digital learning tools enhance critical thinking without creating passive dependence.',
        },
        studentToken
      );

      assert.strictEqual(turn2Res.status, 200, `Turn 2 submission failed: ${JSON.stringify(turn2Res.data)}`);
      const turn2AiMessage = (turn2Res.data.data.aiTurn?.message || '').toLowerCase();
      for (const term of testAvoidList) {
        assert.ok(
          !turn2AiMessage.includes(term.toLowerCase()),
          `Live turn 2 AI message must NEVER contain avoid-list term "${term}". Received: "${turn2Res.data.data.aiTurn?.message}"`
        );
      }
    } finally {
      // 7. Always restore original question data
      await request('PATCH', `/questions/${questionId}`, {
        data: originalData,
      }, adminToken);
    }
  });

  console.log('\n================================================================');
  console.log(`🏁 FLOW & TEMPLATE AUDIT TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
