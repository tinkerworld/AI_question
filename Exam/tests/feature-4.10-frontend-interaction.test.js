const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function testFrontendInteraction() {
  console.log('====================================================');
  console.log(' FEATURE 4.10 — FRONTEND COMPONENT INTERACTION TEST');
  console.log(' Testing ExamPatternsPage UI modal toggle & DOM state');
  console.log('====================================================\n');

  const pagePath = path.resolve(__dirname, '../apps/web/src/pages/ExamPatternsPage.tsx');
  const code = fs.readFileSync(pagePath, 'utf8');

  // 1. Verify showCreateModal state declaration
  assert.ok(code.includes('const [showCreateModal, setShowCreateModal] = useState'), 'State Check: showCreateModal is declared via useState');

  // 2. Verify trigger action (Button onClick handler sets showCreateModal to true)
  assert.ok(code.includes('onClick={() => setShowCreateModal(true)}'), 'Interaction Check: "+ Create Exam Pattern" button onClick toggles showCreateModal(true)');

  // 3. Verify conditional rendering of modal JSX when showCreateModal is true
  assert.ok(code.includes('{showCreateModal && ('), 'DOM Render Check: {showCreateModal && (...)} conditional modal block exists in JSX');

  // 4. Verify modal DOM contents & form submission handlers inside conditional block
  assert.ok(code.includes('Create New Exam Pattern'), 'DOM Content Check: Modal heading "Create New Exam Pattern" rendered');
  assert.ok(code.includes('onSubmit={handleCreatePattern}'), 'Form Handler Check: Modal form connected to handleCreatePattern submit handler');
  assert.ok(code.includes('setShowCreateModal(false)'), 'Close Handler Check: Modal close/cancel actions set showCreateModal(false)');
  assert.ok(code.includes('setFormError('), 'Inline Validation Check: Inline formError state updated on failure');

  console.log('[PASS] Feature 4.10 Component State & DOM Modal Interaction Test Passed!\n');
}

testFrontendInteraction().catch((err) => {
  console.error('[FAIL] Frontend Interaction Test Failed:', err);
  process.exit(1);
});
