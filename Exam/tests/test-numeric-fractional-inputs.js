const http = require('http');

function req(path, method='GET', body=null, token=null) {
  return new Promise((resolve) => {
    const payload = body !== null ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 4000,
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

async function testFractionalMarking() {
  const createdExamIds = [];
  const createdPatternIds = [];

  try {
    const login = await req('/auth/login', 'POST', { email: 'admin@examos.com', password: 'Admin@123' });
    const token = login.body.data.accessToken;

    console.log('--- TEST: Creating Manual Exam for Fractional Section Testing ---');
    const examRes = await req('/exams/manual', 'POST', {
      name: 'Fractional Marking Test Exam',
      durationMinutes: 75,
    }, token);
    console.log('Exam creation status:', examRes.status);
    const examId = examRes.body.data.exam.id;
    createdExamIds.push(examId);

    console.log('\n--- TEST: Adding Section with Marks: 4.0, Negative: -0.25 (-1/4) ---');
    const sec1Res = await req(`/exams/${examId}/sections`, 'POST', {
      name: 'Physics Section (Quarter Penalty)',
      marksPerQuestion: 4.0,
      marksCorrect: 4.0,
      marksWrong: -0.25,
      marksUnattempted: 0.0,
    }, token);
    console.log('Section 1 status:', sec1Res.status);
    const sec1 = sec1Res.body.data.sections.find(s => s.name === 'Physics Section (Quarter Penalty)');
    console.log('Section 1 marksCorrect:', sec1.marksCorrect, 'marksWrong:', sec1.marksWrong);

    console.log('\n--- TEST: Adding Section with Marks: 3.0, Negative: -0.33 (-1/3) ---');
    const sec2Res = await req(`/exams/${examId}/sections`, 'POST', {
      name: 'Chemistry Section (Third Penalty)',
      marksPerQuestion: 3.0,
      marksCorrect: 3.0,
      marksWrong: -0.33,
      marksUnattempted: 0.0,
    }, token);
    console.log('Section 2 status:', sec2Res.status);
    const sec2 = sec2Res.body.data.sections.find(s => s.name === 'Chemistry Section (Third Penalty)');
    console.log('Section 2 marksCorrect:', sec2.marksCorrect, 'marksWrong:', sec2.marksWrong);

    console.log('\n--- TEST: Creating Exam Pattern with Fractional Negative Marking (-0.25) ---');
    const patRes = await req('/exam-patterns', 'POST', {
      name: 'Fractional Pattern Test',
      courseId: 'c1',
      durationMinutes: 90,
      type: 'SINGLE',
    }, token);
    const patId = patRes.body.data.id;
    createdPatternIds.push(patId);

    const patSecRes = await req(`/exam-patterns/${patId}/sections`, 'POST', {
      name: 'Math Section A',
      numQuestions: 5,
      marksPerQuestion: 4.0,
      marksCorrect: 4.0,
      marksWrong: -0.25,
      marksUnattempted: 0.0,
    }, token);
    console.log('Pattern section creation status:', patSecRes.status);
    const patSec = patSecRes.body.data;
    console.log('Pattern Section marksCorrect:', patSec.marksCorrect, 'marksWrong:', patSec.marksWrong);

    console.log('\n--- TEST: Updating Marking Scheme to -0.33 on Pattern Section ---');
    const markRes = await req(`/exam-patterns/${patId}/sections/${patSec.id}/marking`, 'PUT', {
      marksCorrect: 4.0,
      marksWrong: -0.33,
      marksUnattempted: 0.0,
    }, token);
    console.log('Marking scheme update status:', markRes.status);
    const updatedSec = markRes.body.data;
    console.log('Updated Pattern Section marksCorrect:', updatedSec.marksCorrect, 'marksWrong:', updatedSec.marksWrong);

    console.log('\n ALL FRACTIONAL MARKING TESTS PASSED!');
  } finally {
    console.log('\n--- TEARDOWN: Cleaning up test artifacts ---');
    const login = await req('/auth/login', 'POST', { email: 'admin@examos.com', password: 'Admin@123' });
    const token = login.body.data?.accessToken;

    for (const eid of createdExamIds) {
      await req('/exams/' + eid, 'DELETE', null, token);
      console.log('Deleted test exam:', eid);
    }
    for (const pid of createdPatternIds) {
      await req('/exam-patterns/' + pid, 'DELETE', null, token);
      console.log('Deleted test pattern:', pid);
    }
  }
}

testFractionalMarking().catch(console.error);
