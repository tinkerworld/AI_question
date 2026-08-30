const http = require('http');

function req(path, method='GET', body=null, token=null) {
  return new Promise((resolve) => {
    const payload = body !== null ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: process.env.API_PORT || 4043,
      path: '/api/v1' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    if (payload) r.write(payload);
    r.end();
  });
}

async function testGeneratePayloads() {
  const login = await req('/auth/login', 'POST', { email: 'admin@examos.com', password: 'Admin@123' });
  const token = login.body.data?.accessToken;

  console.log('===============================================================');
  console.log(' GENERATE-EXAM REAL PAYLOAD & VALIDATION INVESTIGATION');
  console.log('===============================================================\n');

  // Scenario 1: Empty name field in UI
  // genName = "" -> `genName.trim() || undefined` -> undefined
  // JSON.stringify({ patternId: 'pat_jee_main_standard', name: undefined }) -> '{"patternId":"pat_jee_main_standard"}'
  const payload1 = {
    patternId: 'pat_jee_main_standard',
    name: "".trim() || undefined,
  };
  const rawBody1 = JSON.stringify(payload1);
  console.log('--- SCENARIO 1: Leave Name Field Completely Empty ---');
  console.log('Raw JSON String Sent to API:', rawBody1);
  const res1 = await req('/exams/generate', 'POST', payload1, token);
  console.log('HTTP Status:', res1.status);
  console.log('Response Body:', JSON.stringify(res1.body, null, 2));
  if (res1.body.data?.exam?.id) await req('/exams/' + res1.body.data.exam.id, 'DELETE', null, token);

  // Scenario 2: Name sent explicitly as empty string ""
  const payload2 = { patternId: 'pat_jee_main_standard', name: '' };
  const rawBody2 = JSON.stringify(payload2);
  console.log('\n--- SCENARIO 2: Explicit Empty String ("") in Payload ---');
  console.log('Raw JSON String Sent to API:', rawBody2);
  const res2 = await req('/exams/generate', 'POST', payload2, token);
  console.log('HTTP Status:', res2.status);
  console.log('Response Body:', JSON.stringify(res2.body, null, 2));

  // Scenario 3: Name sent with single character "A"
  const payload3 = { patternId: 'pat_jee_main_standard', name: 'A' };
  const rawBody3 = JSON.stringify(payload3);
  console.log('\n--- SCENARIO 3: Single Character ("A") in Name Field ---');
  console.log('Raw JSON String Sent to API:', rawBody3);
  const res3 = await req('/exams/generate', 'POST', payload3, token);
  console.log('HTTP Status:', res3.status);
  console.log('Response Body:', JSON.stringify(res3.body, null, 2));

  // Scenario 4: Name sent with whitespace "   "
  const payload4 = { patternId: 'pat_jee_main_standard', name: "   ".trim() || undefined };
  const rawBody4 = JSON.stringify(payload4);
  console.log('\n--- SCENARIO 4: Whitespace Only ("   ") in Name Field ---');
  console.log('Raw JSON String Sent to API:', rawBody4);
  const res4 = await req('/exams/generate', 'POST', payload4, token);
  console.log('HTTP Status:', res4.status);
  console.log('Response Body:', JSON.stringify(res4.body, null, 2));
  if (res4.body.data?.exam?.id) await req('/exams/' + res4.body.data.exam.id, 'DELETE', null, token);

  // Scenario 5: Manual Exam Creation without name vs 1-char name
  console.log('\n--- SCENARIO 5: Manual Exam Creation ("POST /exams/manual") with 1 Character ("M") ---');
  const res5 = await req('/exams/manual', 'POST', { name: 'M' }, token);
  console.log('HTTP Status:', res5.status);
  console.log('Response Body:', JSON.stringify(res5.body, null, 2));

  console.log('\n===============================================================');
  console.log(' INVESTIGATION COMPLETE');
  console.log('===============================================================');
}

testGeneratePayloads().catch(console.error);
