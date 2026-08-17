const http = require('http');
const { runPhase5Tests } = require('./phase-05-master.test');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const formattedPath = path.startsWith('/api/v1')
      ? path
      : `/api/v1${path.startsWith('/') ? '' : '/'}${path}`;

    const url = new URL(formattedPath, 'http://localhost:4000');
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    };

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function verify() {
  console.log('====================================================');
  console.log(' VERIFYING LIVE DEV DB & AUTOMATIC TEST TEARDOWN');
  console.log('====================================================\n');

  const loginRes = await request('POST', '/auth/login', {
    email: 'admin@examos.com',
    password: 'Admin@123',
  });
  const token = loginRes.body.data?.accessToken;

  // Step 1: Initial state
  const initExams = await request('GET', '/exams', null, token);
  const initPatterns = await request('GET', '/exam-patterns', null, token);
  console.log(`[INITIAL STATE] Exams in DB: ${initExams.body.data?.items?.length || 0}`);
  console.log(`[INITIAL STATE] Patterns in DB: ${initPatterns.body.data?.items?.length || 0}`);
  for (const p of initPatterns.body.data?.items || []) {
    console.log(`  - Pattern: [${p.id}] "${p.name}" (Status: ${p.status}, Marks: ${p.totalMarks})`);
  }

  // Step 2: Run Phase 5 Master Tests
  console.log('\n--- Running Phase 5 Master Tests (with automatic teardown) ---');
  await runPhase5Tests();

  // Step 3: Check state after test run
  const afterExams = await request('GET', '/exams', null, token);
  const afterPatterns = await request('GET', '/exam-patterns', null, token);
  console.log(`\n[AFTER TEST RUN] Exams in DB: ${afterExams.body.data?.items?.length || 0}`);
  console.log(`[AFTER TEST RUN] Patterns in DB: ${afterPatterns.body.data?.items?.length || 0}`);
  for (const p of afterPatterns.body.data?.items || []) {
    console.log(`  - Pattern: [${p.id}] "${p.name}" (Status: ${p.status}, Marks: ${p.totalMarks})`);
  }

  if ((afterExams.body.data?.items?.length || 0) === (initExams.body.data?.items?.length || 0) &&
      (afterPatterns.body.data?.items?.length || 0) === (initPatterns.body.data?.items?.length || 0)) {
    console.log('\n✅ PERFECT TEST ISOLATION CONFIRMED: 0 leftover test fixtures!');
  } else {
    console.warn('\n⚠️ Leftover fixtures detected.');
  }

  console.log('\n====================================================');
}

verify().catch(console.error);
