const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const formattedPath = path.startsWith('/api/v1') ? path : `/api/v1${path.startsWith('/') ? '' : '/'}${path}`;
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
    if (payload) req.write(payload);
    req.end();
  });
}

async function seedBaseline() {
  console.log('--- Logging in as Admin ---');
  const loginRes = await request('POST', '/auth/login', {
    email: 'admin@examos.com',
    password: 'Admin@123',
  });
  const token = loginRes.body.data.accessToken;

  console.log('--- Checking existing patterns ---');
  const patListRes = await request('GET', '/exam-patterns?limit=100', null, token);
  const patterns = patListRes.body.data?.items || [];
  const existing = patterns.find((p) => p.name === 'JEE Main Grand Blueprint (PCM)');
  if (existing) {
    console.log('Pattern already exists:', existing.id);
    return;
  }

  console.log('--- Creating JEE Main Grand Blueprint (PCM) ---');
  const createPatRes = await request('POST', '/exam-patterns', {
    name: 'JEE Main Grand Blueprint (PCM)',
    courseId: 'c1',
    durationMinutes: 180,
    type: 'MULTI',
    description: 'Standard 3-hour examination covering Physics, Chemistry, and Mathematics (10 questions each, +4 / -1)',
  }, token);

  const patternId = createPatRes.body.data.id;
  console.log('Created Pattern ID:', patternId);

  // Sections
  console.log('Adding Section A: Physics...');
  await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Section A (Physics)',
    subjectId: 'sub_phy',
    numQuestions: 10,
    marksPerQuestion: 4.0,
    marksCorrect: 4.0,
    marksWrong: -1.0,
    marksUnattempted: 0.0,
  }, token);

  console.log('Adding Section B: Chemistry...');
  await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Section B (Chemistry)',
    subjectId: 'sub_chem',
    numQuestions: 10,
    marksPerQuestion: 4.0,
    marksCorrect: 4.0,
    marksWrong: -1.0,
    marksUnattempted: 0.0,
  }, token);

  console.log('Adding Section C: Mathematics...');
  await request('POST', `/exam-patterns/${patternId}/sections`, {
    name: 'Section C (Mathematics)',
    subjectId: 'sub_math',
    numQuestions: 10,
    marksPerQuestion: 4.0,
    marksCorrect: 4.0,
    marksWrong: -1.0,
    marksUnattempted: 0.0,
  }, token);

  // Publish pattern
  console.log('Publishing pattern blueprint...');
  await request('PATCH', `/exam-patterns/${patternId}`, { status: 'PUBLISHED' }, token);

  console.log('✅ Baseline JEE Main Pattern created and published successfully!');
}

seedBaseline().catch(console.error);
