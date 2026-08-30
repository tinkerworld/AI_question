const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4043/api/v1';

async function test() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@examos.com', password: 'Admin@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  const repRes = await fetch(`${BASE_URL}/ai/admin/usage`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const repData = await repRes.json();
  console.log('API Usage Report:', JSON.stringify(repData, null, 2));
}

test().catch(console.error);
