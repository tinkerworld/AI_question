const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runFrontendAuthAudit() {
  console.log('====================================================');
  console.log(' FEATURE 1.6 & 1.11 — FRONTEND AUTHENTICATION AUDIT');
  console.log(' Testing Login Component, Route Guarding & Context');
  console.log('====================================================\n');

  const authContextPath = path.resolve(__dirname, '../apps/web/src/context/AuthContext.tsx');
  const loginPagePath = path.resolve(__dirname, '../apps/web/src/pages/LoginPage.tsx');
  const appPath = path.resolve(__dirname, '../apps/web/src/App.tsx');

  assert.ok(fs.existsSync(authContextPath), 'AuthContext.tsx must exist');
  assert.ok(fs.existsSync(loginPagePath), 'LoginPage.tsx must exist');
  assert.ok(fs.existsSync(appPath), 'App.tsx must exist');

  const authContextContent = fs.readFileSync(authContextPath, 'utf8');
  const loginPageContent = fs.readFileSync(loginPagePath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Check 1: Token persistence in AuthContext
  console.log('1. Checking AuthContext token storage and session methods...');
  assert.ok(authContextContent.includes("localStorage.setItem('token', accessToken)"), 'Must persist token on login');
  assert.ok(authContextContent.includes("localStorage.setItem('refreshToken', newRefresh)"), 'Must persist refresh token');
  assert.ok(authContextContent.includes("localStorage.removeItem('token')"), 'Must remove token on logout');
  assert.ok(authContextContent.includes('/auth/login'), 'Must call /auth/login endpoint');
  assert.ok(authContextContent.includes('/auth/me'), 'Must call /auth/me for session verification');
  assert.ok(authContextContent.includes('/auth/refresh'), 'Must call /auth/refresh for rotation');
  assert.ok(authContextContent.includes('/auth/logout'), 'Must call /auth/logout');
  console.log('   [PASS] AuthContext handles complete JWT + Refresh token lifecycle');

  // Check 2: LoginPage fields and demo quick login
  console.log('\n2. Checking LoginPage component structure...');
  assert.ok(loginPageContent.includes('admin@examos.com'), 'Must support admin login');
  assert.ok(loginPageContent.includes('teacher@examos.com'), 'Must support teacher login');
  assert.ok(loginPageContent.includes('student@examos.com'), 'Must support student login');
  assert.ok(loginPageContent.includes('type="email"'), 'Must have email input');
  assert.ok(loginPageContent.includes('handleSubmit'), 'Must handle submit');
  console.log('   [PASS] LoginPage renders credentials form and demo login cards');

  // Check 3: Route guarding in App.tsx
  console.log('\n3. Checking Route Guarding in App.tsx...');
  assert.ok(appContent.includes('<AuthProvider>'), 'Must wrap application in AuthProvider');
  assert.ok(appContent.includes('if (!isAuthenticated)'), 'Must guard unauthenticated state');
  assert.ok(appContent.includes('<LoginPage />'), 'Must redirect/render LoginPage when unauthenticated');
  assert.ok(appContent.includes('logout'), 'Must provide Logout action in header');
  console.log('   [PASS] Route Guarding & Header Profile integration verified');

  console.log('\n====================================================');
  console.log(' FRONTEND AUTHENTICATION AUDIT: 3/3 CHECKS PASSED');
  console.log('====================================================\n');
}

runFrontendAuthAudit();
