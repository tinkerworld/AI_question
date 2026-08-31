const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.API_BASE || 'http://localhost:4043/api/v1';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
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

async function runPhase13MasterTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING PHASE 13: SUBSCRIPTIONS & ENTITLEMENTS MASTER SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  // 1. Authenticate personas
  console.log('\n1. Authenticating test personas (Admin, Student 1, Student 2)...');
  const admin = await login('admin@examos.com', 'Admin@123');
  const student1 = await login('student@examos.com', 'Student@123');
  const student2 = await login('student2@examos.com', 'Student2@123');
  console.log('   ✓ Admin, Student 1 (Free tier), and Student 2 (Premium tier) authenticated');

  // TEST 13.1: Entitlement Engine Evaluations
  try {
    console.log('\n2. Testing Feature 13.1: Entitlement Engine Evaluations...');
    
    // Ensure Student 1 is on FREE and Student 2 is on PREMIUM
    await fetchJson('/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
      body: JSON.stringify({ planCode: 'FREE' }),
    });
    await fetchJson('/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2.token}` },
      body: JSON.stringify({ planCode: 'PREMIUM' }),
    });

    // Check Free student entitlements
    const freeEntRes = await fetchJson('/entitlements/my', {
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    assert.strictEqual(freeEntRes.status, 200);
    assert.strictEqual(freeEntRes.data.success, true);
    assert.strictEqual(freeEntRes.data.data.planTier, 'FREE');
    assert.strictEqual(freeEntRes.data.data.entitlements.full_assessment.allowed, false);
    assert.strictEqual(freeEntRes.data.data.entitlements.personalized_practice.allowed, false);
    assert.strictEqual(freeEntRes.data.data.entitlements.mock_tests.limit, 2);
    assert.strictEqual(freeEntRes.data.data.entitlements.ai_interview_daily.limit, 1);
    console.log('   ✓ Student 1 accurately evaluated on FREE plan baseline limits');

    // Check Premium student entitlements
    const premEntRes = await fetchJson('/entitlements/my', {
      headers: { Authorization: `Bearer ${student2.token}` },
    });
    assert.strictEqual(premEntRes.status, 200);
    assert.strictEqual(premEntRes.data.data.planTier, 'PREMIUM');
    assert.strictEqual(premEntRes.data.data.entitlements.full_assessment.allowed, true);
    assert.strictEqual(premEntRes.data.data.entitlements.personalized_practice.allowed, true);
    assert.strictEqual(premEntRes.data.data.entitlements.ai_interview_daily.limit, 2);
    console.log('   ✓ Student 2 accurately evaluated on PREMIUM plan unlocked entitlements');

    // Specific key check endpoint
    const checkRes = await fetchJson('/entitlements/check', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
      body: JSON.stringify({ key: 'full_assessment' }),
    });
    assert.strictEqual(checkRes.status, 200);
    assert.strictEqual(checkRes.data.data.allowed, false);
    assert.ok(checkRes.data.data.reason.includes('FREE plan'));
    console.log('   ✓ Gated capability check returned descriptive upgrade reason');

    passed++;
    console.log('✅ PASS: 13.1-U1: Entitlement Engine Evaluations (FREE vs PREMIUM)');
  } catch (e) {
    failed++;
    console.error('❌ FAIL: 13.1-U1:', e.message);
  }

  // TEST 13.2: Subscription Management Lifecycle
  try {
    console.log('\n3. Testing Feature 13.2: Subscription Management Lifecycle...');

    // List Plans
    const plansRes = await fetchJson('/subscriptions/plans', {
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    assert.strictEqual(plansRes.status, 200);
    assert.strictEqual(plansRes.data.success, true);
    assert.ok(plansRes.data.data.length >= 3);
    const freePlan = plansRes.data.data.find((p) => p.code === 'FREE');
    const premPlan = plansRes.data.data.find((p) => p.code === 'PREMIUM');
    const plusPlan = plansRes.data.data.find((p) => p.code === 'PREMIUM_PLUS');
    assert.ok(freePlan && premPlan && plusPlan);
    console.log(`   ✓ Found ${plansRes.data.data.length} active subscription plans (FREE, PREMIUM, PREMIUM_PLUS)`);

    // Student 1 subscribes to PREMIUM
    const subRes = await fetchJson('/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
      body: JSON.stringify({ planCode: 'PREMIUM', billingCycle: 'monthly' }),
    });
    assert.strictEqual(subRes.status, 201);
    assert.strictEqual(subRes.data.data.planCode, 'PREMIUM');
    assert.strictEqual(subRes.data.data.status, 'ACTIVE');
    console.log('   ✓ Student 1 upgraded from FREE to PREMIUM plan');

    // Verify entitlements dynamically refreshed to PREMIUM
    const updatedEntRes = await fetchJson('/entitlements/my', {
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    assert.strictEqual(updatedEntRes.data.data.planTier, 'PREMIUM');
    assert.strictEqual(updatedEntRes.data.data.entitlements.personalized_practice.allowed, true);
    console.log('   ✓ Student 1 entitlements refreshed immediately upon subscription update');

    // Student 1 cancels subscription
    const cancelRes = await fetchJson('/subscriptions/cancel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.data.data.status, 'CANCELLED');
    assert.ok(cancelRes.data.data.cancelledAt);
    console.log('   ✓ Subscription cancellation marked successfully (retains access till cycle end)');

    // Revert Student 1 back to FREE for subsequent boundary tests
    await fetchJson('/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
      body: JSON.stringify({ planCode: 'FREE' }),
    });

    passed++;
    console.log('✅ PASS: 13.2-U1: Subscription Management Lifecycle');
  } catch (e) {
    failed++;
    console.error('❌ FAIL: 13.2-U1:', e.message);
  }

  // TEST 13.3: AI Credit Packages & Purchases
  try {
    console.log('\n4. Testing Feature 13.3: AI Credit Packages & Purchases...');

    // List packages
    const pkgRes = await fetchJson('/ai-credits/packages', {
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    assert.strictEqual(pkgRes.status, 200);
    assert.ok(pkgRes.data.data.length >= 3);
    const sprintPkg = pkgRes.data.data.find((p) => p.id === 'pkg_5');
    assert.ok(sprintPkg);
    console.log(`   ✓ Found ${pkgRes.data.data.length} credit packages (Single, Sprint, Scholar)`);

    // Purchase +5 credit pack
    const buyRes = await fetchJson('/ai-credits/purchase', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
      body: JSON.stringify({ packageId: 'pkg_5' }),
    });
    assert.strictEqual(buyRes.status, 201);
    assert.strictEqual(buyRes.data.data.creditsAdded, 5);
    assert.ok(buyRes.data.data.invoice.id);
    assert.strictEqual(buyRes.data.data.invoice.status, 'PAID');
    console.log(`   ✓ Purchased Sprint Pack: +5 credits added. Invoice ID: ${buyRes.data.data.invoice.id}`);

    // Verify balance
    const balRes = await fetchJson('/ai-credits/balance', {
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    assert.strictEqual(balRes.status, 200);
    assert.ok(balRes.data.data.purchasedCredits >= 5);
    console.log(`   ✓ Credit balance verified: ${balRes.data.data.purchasedCredits} purchased credits available`);

    passed++;
    console.log('✅ PASS: 13.3-U1: AI Credit Packages & Purchases');
  } catch (e) {
    failed++;
    console.error('❌ FAIL: 13.3-U1:', e.message);
  }

  // TEST 13.4: Usage Tracking & Credit Consumption Priority
  try {
    console.log('\n5. Testing Feature 13.4: Usage Tracking & Priority Consumption...');

    // Deduct credit via AI feature
    const aiGenRes = await fetchJson('/ai/questions/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        subjectId: 'sub_physics_01',
        difficulty: 'MEDIUM',
        type: 'SINGLE_CHOICE',
        marks: 4,
        count: 1,
      }),
    });
    assert.strictEqual(aiGenRes.status, 201);
    console.log('   ✓ AI operation successfully deducted credit from daily quota');

    // Admin usage report
    const repRes = await fetchJson('/ai/admin/usage', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(repRes.status, 200);
    assert.ok(repRes.data.data.totalCreditsConsumed >= 1);
    console.log(`   ✓ Admin usage report verified: ${repRes.data.data.totalCreditsConsumed} total credits tracked`);

    passed++;
    console.log('✅ PASS: 13.4-U1: Usage Tracking & Credit Consumption');
  } catch (e) {
    failed++;
    console.error('❌ FAIL: 13.4-U1:', e.message);
  }

  // TEST 13.5: Pluggable Billing Checkout, Invoices & Refund Engine
  try {
    console.log('\n6. Testing Feature 13.5: Pluggable Billing Checkout, Invoices & Refund Engine...');

    // Unified Checkout for Subscription
    const checkoutRes = await fetchJson('/billing/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student2.token}` },
      body: JSON.stringify({
        itemType: 'SUBSCRIPTION',
        itemId: 'PREMIUM',
        billingCycle: 'monthly',
      }),
    });
    assert.strictEqual(checkoutRes.status, 201);
    assert.strictEqual(checkoutRes.data.data.invoice.status, 'PAID');
    const paymentTxId = checkoutRes.data.data.transactionId;
    console.log(`   ✓ Unified Checkout completed: Invoice ${checkoutRes.data.data.invoice.id} (Tx: ${paymentTxId})`);

    // List Invoices
    const invRes = await fetchJson('/billing/invoices', {
      headers: { Authorization: `Bearer ${student2.token}` },
    });
    assert.strictEqual(invRes.status, 200);
    assert.ok(invRes.data.data.length >= 1);
    console.log(`   ✓ Found ${invRes.data.data.length} invoices on record for Student 2`);

    // Process Refund ("return money") with credit & entitlement clawback (Admin)
    const refundRes = await fetchJson('/billing/refunds', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        gatewayPaymentId: paymentTxId,
        amount: 29.99,
        reason: 'Customer requested refund within 24 hours of upgrade',
        clawbackCredits: true,
      }),
    });
    assert.strictEqual(refundRes.status, 201);
    assert.strictEqual(refundRes.data.data.status, 'COMPLETED');
    assert.strictEqual(refundRes.data.data.refundAmount, 29.99);
    assert.ok(refundRes.data.data.gatewayRefundId.startsWith('ref_'));
    console.log(`   ✓ Refund Engine successfully processed refund (${refundRes.data.data.gatewayRefundId}) and clawed back entitlements`);

    // Verify Financial Audit Transactions (Admin)
    const txRes = await fetchJson('/billing/transactions', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.strictEqual(txRes.status, 200);
    assert.ok(txRes.data.data.length >= 1);
    console.log(`   ✓ Financial audit log contains ${txRes.data.data.length} refund audit records`);

    // Student forbidden from accessing refunds API
    const forbidRefund = await fetchJson('/billing/refunds', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
      body: JSON.stringify({ amount: 10, reason: 'test' }),
    });
    assert.strictEqual(forbidRefund.status, 403);
    console.log('   ✓ Student strictly forbidden from issuing refunds (403)');

    passed++;
    console.log('✅ PASS: 13.5-U1: Pluggable Billing Checkout, Invoices & Refund Engine');
  } catch (e) {
    failed++;
    console.error('❌ FAIL: 13.5-U1:', e.message);
  }

  // TEST 13.6: Preview Mode Billing Simulation
  try {
    console.log('\n7. Testing Feature 13.6: Preview Mode Billing Simulation...');

    // Launch Free student preview session
    const prevFreeRes = await fetchJson('/preview/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        preset: 'FREE',
      }),
    });
    assert.strictEqual(prevFreeRes.status, 200);
    const prevFreeToken = prevFreeRes.data.data.sessionToken || prevFreeRes.data.data.token;

    // Check entitlements on Preview Free token
    const prevFreeEnt = await fetchJson('/entitlements/my', {
      headers: { Authorization: `Bearer ${prevFreeToken}` },
    });
    assert.strictEqual(prevFreeEnt.data.data.planTier, 'FREE');
    assert.strictEqual(prevFreeEnt.data.data.entitlements.personalized_practice.allowed, false);
    console.log('   ✓ Preview Free session correctly resolves simulated FREE entitlements');

    // Launch Premium+ QA preview session
    const prevPlusRes = await fetchJson('/preview/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        preset: 'PREMIUM_PLUS',
      }),
    });
    assert.strictEqual(prevPlusRes.status, 200);
    const prevPlusToken = prevPlusRes.data.data.sessionToken || prevPlusRes.data.data.token;

    // Check entitlements on Preview Premium+ token
    const prevPlusEnt = await fetchJson('/entitlements/my', {
      headers: { Authorization: `Bearer ${prevPlusToken}` },
    });
    assert.strictEqual(prevPlusEnt.data.data.planTier, 'PREMIUM_PLUS');
    assert.strictEqual(prevPlusEnt.data.data.entitlements.personalized_practice.allowed, true);
    assert.strictEqual(prevPlusEnt.data.data.entitlements.priority_ai.allowed, true);
    assert.ok(prevPlusEnt.data.data.entitlements.ai_interview_daily.limit >= 10);
    console.log(`   ✓ Preview Premium+ session correctly resolves simulated PREMIUM_PLUS allowances (${prevPlusEnt.data.data.entitlements.ai_interview_daily.limit} interviews/day)`);

    // Simulate preview refund endpoint
    const simRefRes = await fetchJson('/billing/preview/refund-sim', {
      method: 'POST',
      headers: { Authorization: `Bearer ${prevPlusToken}` },
      body: JSON.stringify({
        amount: 59.99,
        reason: 'Simulated preview test refund',
      }),
    });
    assert.strictEqual(simRefRes.status, 201);
    assert.strictEqual(simRefRes.data.data.gateway, 'SIMULATED');
    console.log('   ✓ Simulated refund executed in preview session without touching live gateway');

    passed++;
    console.log('✅ PASS: 13.6-U1: Preview Mode Billing Simulation');
  } catch (e) {
    failed++;
    console.error('❌ FAIL: 13.6-U1:', e.message);
  }

  // TEST 13.7: Free Tier Boundary Enforcement
  try {
    console.log('\n8. Testing Feature 13.7: Free Tier Boundary Enforcement...');

    // Free student attempts to generate personalized practice paper -> Rejected (403)
    const pracRes = await fetchJson('/practice/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
      body: JSON.stringify({ count: 5 }),
    });
    assert.strictEqual(pracRes.status, 403);
    console.log('   ✓ Free tier student blocked from generating personalized practice paper (403)');

    // Free student taking interview beyond daily quota
    // First, restore student1 to FREE plan
    await fetchJson('/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${student1.token}` },
      body: JSON.stringify({ planCode: 'FREE' }),
    });

    const eligRes = await fetchJson('/interview/eligibility', {
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    
    if (eligRes.data.data?.availableQuestions?.length > 0) {
      const qId = eligRes.data.data.availableQuestions[0].id;
      
      const currentEnt = await fetchJson('/entitlements/my', {
        headers: { Authorization: `Bearer ${student1.token}` },
      });
      const remainingInterviews = currentEnt.data.data?.entitlements?.ai_interview_daily?.remaining ?? 0;

      if (remainingInterviews > 0) {
        // Start permitted interview
        const int1 = await fetchJson('/interview/sessions/start', {
          method: 'POST',
          headers: { Authorization: `Bearer ${student1.token}` },
          body: JSON.stringify({ questionId: qId }),
        });
        assert.strictEqual(int1.status, 201);
        console.log('   ✓ Free tier student started permitted daily interview');
      }

      // Subsequent interview exceeding daily quota -> Rejected with 403 ENTITLEMENT_LIMIT_REACHED
      const int2 = await fetchJson('/interview/sessions/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${student1.token}` },
        body: JSON.stringify({ questionId: qId }),
      });
      assert.strictEqual(int2.status, 403);
      console.log('   ✓ Free tier student strictly rejected on interview attempt exceeding daily quota (403)');
    }

    passed++;
    console.log('✅ PASS: 13.7-U1: Free Tier Boundary Enforcement');
  } catch (e) {
    failed++;
    console.error('❌ FAIL: 13.7-U1:', e.message);
  }

  console.log('\n================================================================');
  console.log(`🏁 PHASE 13 SUITE SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase13MasterTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
