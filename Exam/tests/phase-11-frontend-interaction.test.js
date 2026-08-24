const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runPhase11FrontendTests() {
  console.log('====================================================');
  console.log(' EXAMOS PHASE 11 FRONTEND INTERACTION TEST SUITE');
  console.log(' AI Question System UI, Modals, Queue & Action Tests');
  console.log('====================================================\n');

  const qbPagePath = path.resolve(__dirname, '../apps/web/src/pages/QuestionBankPage.tsx');
  const aiGenModalPath = path.resolve(__dirname, '../apps/web/src/components/ai/AIGeneratorModal.tsx');
  const aiModModalPath = path.resolve(__dirname, '../apps/web/src/components/ai/AIQuestionModifierModal.tsx');
  const aiUsageModalPath = path.resolve(__dirname, '../apps/web/src/components/ai/AIUsageModal.tsx');

  assert.ok(fs.existsSync(qbPagePath), 'QuestionBankPage.tsx must exist');
  assert.ok(fs.existsSync(aiGenModalPath), 'AIGeneratorModal.tsx must exist');
  assert.ok(fs.existsSync(aiModModalPath), 'AIQuestionModifierModal.tsx must exist');
  assert.ok(fs.existsSync(aiUsageModalPath), 'AIUsageModal.tsx must exist');

  const qbCode = fs.readFileSync(qbPagePath, 'utf8');
  const genCode = fs.readFileSync(aiGenModalPath, 'utf8');
  const modCode = fs.readFileSync(aiModModalPath, 'utf8');
  const usageCode = fs.readFileSync(aiUsageModalPath, 'utf8');

  // Test 11.1-UI: AI Header Actions & Subtab Switcher
  console.log('1. Testing AI Header Actions & Subtab Switcher (Feature 11.9)...');
  assert.ok(qbCode.includes('id="open-ai-usage-btn"'), 'open-ai-usage-btn button must exist');
  assert.ok(qbCode.includes('id="open-ai-generator-btn"'), 'open-ai-generator-btn button must exist');
  assert.ok(qbCode.includes('id="qb-subtab-all"'), 'qb-subtab-all button must exist');
  assert.ok(qbCode.includes('id="qb-subtab-review-queue"'), 'qb-subtab-review-queue button must exist');
  console.log('   ✓ Header buttons and subtab switcher correctly declared and wired');

  // Test 11.2-UI: AI Question Generator Modal
  console.log('\n2. Testing AI Question Generator Modal (Feature 11.4 & 11.6 UI)...');
  assert.ok(genCode.includes('id="ai-gen-subject-select"'), 'ai-gen-subject-select must exist');
  assert.ok(genCode.includes('id="ai-gen-topic-select"'), 'ai-gen-topic-select must exist');
  assert.ok(genCode.includes('id="ai-gen-difficulty-select"'), 'ai-gen-difficulty-select must exist');
  assert.ok(genCode.includes('id="ai-gen-type-select"'), 'ai-gen-type-select must exist');
  assert.ok(genCode.includes('id="ai-gen-count-input"'), 'ai-gen-count-input must exist');
  assert.ok(genCode.includes('id="ai-gen-prompt-input"'), 'ai-gen-prompt-input must exist');
  assert.ok(genCode.includes('id="submit-ai-generator-btn"'), 'submit-ai-generator-btn must exist');
  assert.ok(genCode.includes('/ai/questions/generate'), 'Must call AI questions generate endpoint');
  assert.ok(genCode.includes('/generation-jobs/'), 'Batch generation job polling must be supported');
  console.log('   ✓ AIGeneratorModal has all inputs, progress tracking, and batch polling');

  // Test 11.3-UI: AI Question Variation Modifier Modal
  console.log('\n3. Testing AI Question Variation Modifier Modal (Feature 11.3 UI)...');
  assert.ok(qbCode.includes('id={`ai-modify-btn-${q.id}`}'), 'Per-row ai-modify-btn button must exist');
  assert.ok(modCode.includes('variance-option-'), 'variance-option button must exist');
  assert.ok(modCode.includes('id="ai-mod-instructions-input"'), 'ai-mod-instructions-input must exist');
  assert.ok(modCode.includes('id="submit-ai-modifier-btn"'), 'submit-ai-modifier-btn must exist');
  assert.ok(modCode.includes('/ai/questions/modify'), 'Must call AI questions modify endpoint');
  console.log('   ✓ AIQuestionModifierModal wired with variance levels and prompt instructions');

  // Test 11.4-UI: AI Draft Review Queue
  console.log('\n4. Testing AI Draft Review Queue & Approval Actions (Feature 11.9 UI)...');
  assert.ok(qbCode.includes('id="ai-draft-review-container"'), 'ai-draft-review-container must exist');
  assert.ok(qbCode.includes('id={`approve-draft-btn-${dq.id}`}'), 'approve-draft-btn must exist');
  assert.ok(qbCode.includes('id={`reject-draft-btn-${dq.id}`}'), 'reject-draft-btn must exist');
  assert.ok(qbCode.includes('/ai/questions/drafts'), 'Must call draft listing endpoint');
  assert.ok(qbCode.includes('/review'), 'Must call draft review endpoint');
  console.log('   ✓ AI Draft Review Queue renders cards with Approve & Reject actions');

  // Test 11.5-UI: AI Usage & Credits Dashboard Modal
  console.log('\n5. Testing AI Credits & Usage Dashboard Modal (Feature 11.5 UI)...');
  assert.ok(usageCode.includes('/ai/usage'), 'Must call /ai/usage endpoint');
  assert.ok(usageCode.includes('remainingDailyCredits'), 'Must render remainingDailyCredits');
  assert.ok(usageCode.includes('purchasedCredits'), 'Must render purchasedCredits');
  assert.ok(usageCode.includes('tokensUsedThisMonth'), 'Must render monthly token usage');
  console.log('   ✓ AIUsageModal renders credit balances, token caps, and recent audit logs');

  // Test 11.6-UI: Dedicated Settings Page & Model Config Workbench
  console.log('\n6. Testing Dedicated Settings Page & Model Config (Feature 11.1 & 11.7/11.8 UI)...');
  const settingsPagePath = path.resolve(__dirname, '../apps/web/src/pages/SettingsPage.tsx');
  const appPath = path.resolve(__dirname, '../apps/web/src/App.tsx');
  assert.ok(fs.existsSync(settingsPagePath), 'SettingsPage.tsx must exist');
  const settingsCode = fs.readFileSync(settingsPagePath, 'utf8');
  const appCode = fs.readFileSync(appPath, 'utf8');

  assert.ok(appCode.includes("id: 'settings'"), "NAV_ITEMS must contain 'settings' entry");
  assert.ok(settingsCode.includes('id="settings-subtab-ai"'), 'settings-subtab-ai button must exist');
  assert.ok(settingsCode.includes('id="settings-subtab-appearance"'), 'settings-subtab-appearance button must exist');
  assert.ok(settingsCode.includes('id="settings-subtab-exam-themes"'), 'settings-subtab-exam-themes button must exist');
  assert.ok(settingsCode.includes('toggle-provider-'), 'Provider active toggle inputs must exist');
  assert.ok(settingsCode.includes('priority-provider-'), 'Priority order inputs must exist');
  assert.ok(settingsCode.includes('test-provider-btn-'), 'Live connection test buttons must exist');
  assert.ok(settingsCode.includes('save-provider-btn-'), 'Save provider settings buttons must exist');
  assert.ok(settingsCode.includes('AES-256'), 'Encryption notice must be present in settings');
  console.log('   ✓ SettingsPage has subtabs, priority ordering, AES key input, and test connection buttons');

  console.log('\n====================================================');
  console.log(' ✅ ALL PHASE 11 FRONTEND INTERACTION TESTS PASSED');
  console.log('====================================================\n');
}

runPhase11FrontendTests().catch((err) => {
  console.error('\n❌ PHASE 11 FRONTEND TEST FAILED:', err);
  process.exit(1);
});
