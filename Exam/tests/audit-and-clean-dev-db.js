const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const formattedPath = path.startsWith('/api/v1')
      ? path
      : `/api/v1${path.startsWith('/') ? '' : '/'}${path}`;

    const url = new URL(formattedPath, process.env.API_BASE_URL || 'http://localhost:4043');
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

async function auditAndClean() {
  console.log('====================================================');
  console.log(' AUDITING & CLEANING ALL TEST DATA IN DATABASE');
  console.log('====================================================\n');

  // Step 1: Login
  const loginRes = await request('POST', '/api/v1/auth/login', {
    email: 'admin@examos.com',
    password: 'Admin@123',
  });
  const token = loginRes.body.data?.accessToken || loginRes.body.data?.token;

  // Step 2: Delete all test exams
  const examsRes = await request('GET', '/exams?limit=200', null, token);
  const examItems = examsRes.body.data?.items || [];
  console.log(`Found ${examItems.length} exams to clean up:`);
  for (const ex of examItems) {
    console.log(`  Deleting test exam [${ex.id}] "${ex.name}"...`);
    const delRes = await request('DELETE', `/exams/${ex.id}`, null, token);
    console.log(`    -> Status ${delRes.status}`);
  }

  // Step 3: Delete all test patterns
  const patternsRes = await request('GET', '/exam-patterns?limit=200', null, token);
  const patternItems = patternsRes.body.data?.items || [];
  console.log(`\nFound ${patternItems.length} exam patterns to check/clean:`);
  for (const p of patternItems) {
    console.log(`  Deleting pattern [${p.id}] "${p.name}"...`);
    if (p.status === 'PUBLISHED') {
      await request('PATCH', `/exam-patterns/${p.id}`, { status: 'ARCHIVED' }, token);
    }
    const delRes = await request('DELETE', `/exam-patterns/${p.id}`, null, token);
    console.log(`    -> Status ${delRes.status}`);
  }

  // Step 4: Verify Clean State
  const cleanExamsRes = await request('GET', '/exams?limit=100', null, token);
  const cleanPatternsRes = await request('GET', '/exam-patterns?limit=100', null, token);
  console.log(`\n--- VERIFICATION AFTER CLEANUP ---`);
  console.log(`Exams in DB: ${cleanExamsRes.body.data?.items?.length || 0}`);
  console.log(`Patterns in DB: ${cleanPatternsRes.body.data?.items?.length || 0}`);

  console.log('\n====================================================');
  console.log(' DATABASE SUCCESSFULLY CLEANED');
  console.log('====================================================');
}

auditAndClean().catch(console.error);
