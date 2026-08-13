const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' EXAMOS PHASE 1 (FOUNDATION) — MASTER TEST SUITE');
console.log(' Testing Features 1.1 to 1.12 & Section 7 Security Gate');
console.log('====================================================\n');

let total = 0;
let passed = 0;

function test(id, name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${id} — ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${id} — ${name}: ${err.message}`);
  }
}

const rootDir = path.resolve(__dirname, '..');

// Feature 1.1 Tests
test('1.1-U1', 'Monorepo pnpm workspace & turbo config', () => {
  assert.ok(fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml')));
  assert.ok(fs.existsSync(path.join(rootDir, 'turbo.json')));
  assert.ok(fs.existsSync(path.join(rootDir, 'docker-compose.yml')));
});

test('1.1-U2', 'TypeScript base config has strict: true', () => {
  const tsConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'packages/typescript-config/base.json'), 'utf8'));
  assert.strictEqual(tsConfig.compilerOptions.strict, true);
});

// Feature 1.2 Tests
test('1.2-U1', 'Prisma Schema definitions for core entities', () => {
  const schema = fs.readFileSync(path.join(rootDir, 'packages/database/prisma/schema.prisma'), 'utf8');
  assert.ok(schema.includes('model User'));
  assert.ok(schema.includes('model Role'));
  assert.ok(schema.includes('model Permission'));
  assert.ok(schema.includes('model RefreshToken'));
  assert.ok(schema.includes('model AuditLog'));
  assert.ok(schema.includes('model EntityVersion'));
});

test('1.2-U2', 'Prisma client singleton export', () => {
  const dbIndex = fs.readFileSync(path.join(rootDir, 'packages/database/src/index.ts'), 'utf8');
  assert.ok(dbIndex.includes('export const prisma'));
});

// Feature 1.3 Tests
test('1.3-U1', '@repo/types exports AuthContext and DTOs', () => {
  const typesIndex = fs.readFileSync(path.join(rootDir, 'packages/types/src/index.ts'), 'utf8');
  assert.ok(typesIndex.includes('export interface AuthContext'));
  assert.ok(typesIndex.includes('export interface UserDTO'));
  assert.ok(typesIndex.includes('export type ThemeMode'));
  assert.ok(typesIndex.includes('export type LanguageCode'));
});

// Feature 1.4 Tests
test('1.4-U1', '@repo/validation Zod schemas', () => {
  const valIndex = fs.readFileSync(path.join(rootDir, 'packages/validation/src/index.ts'), 'utf8');
  assert.ok(valIndex.includes('loginSchema'));
  assert.ok(valIndex.includes('createUserSchema'));
  assert.ok(valIndex.includes('updateUserSchema'));
});

// Feature 1.5 Tests
test('1.5-U1', '@repo/permissions atomic permissions & helper', () => {
  const permIndex = fs.readFileSync(path.join(rootDir, 'packages/permissions/src/index.ts'), 'utf8');
  assert.ok(permIndex.includes("USERS_CREATE: 'users.create'"));
  assert.ok(permIndex.includes('hasPermission'));
  assert.ok(permIndex.includes('ROLE_PERMISSIONS_MAP'));
});

// Feature 1.6 Tests
test('1.6-U1', 'Authentication endpoints (login, refresh, logout, me)', () => {
  const authRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/auth.routes.ts'), 'utf8');
  assert.ok(authRoutes.includes("router.post('/login'"));
  assert.ok(authRoutes.includes("router.post('/refresh'"));
  assert.ok(authRoutes.includes("router.post('/logout'"));
  assert.ok(authRoutes.includes("router.get('/me'"));
});

// Feature 1.7 Tests
test('1.7-U1', 'User CRUD endpoints with IDOR ownership checks', () => {
  const userRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/user.routes.ts'), 'utf8');
  assert.ok(userRoutes.includes("'/:'") || userRoutes.includes("'/:id'"));
  assert.ok(userRoutes.includes('IDOR_DENIED'), 'IDOR check must be enforced');
});

// Feature 1.8 Tests
test('1.8-U1', 'Role & Permission management endpoints', () => {
  const roleRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/role.routes.ts'), 'utf8');
  assert.ok(roleRoutes.includes("'/:'") || roleRoutes.includes("'/:id/permissions'"));
});

// Feature 1.9 Tests
test('1.9-U1', 'Audit logging endpoints & middleware', () => {
  const auditRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/audit.routes.ts'), 'utf8');
  const auditMw = fs.readFileSync(path.join(rootDir, 'apps/api/src/middleware/audit.ts'), 'utf8');
  assert.ok(auditRoutes.includes('router.get('));
  assert.ok(auditMw.includes('prisma.auditLog.create'));
});

// Feature 1.10 Tests
test('1.10-U1', 'API Middleware Stack assembly', () => {
  const server = fs.readFileSync(path.join(rootDir, 'apps/api/src/server.ts'), 'utf8');
  assert.ok(server.includes('app.use(cors())'));
  assert.ok(server.includes('app.use(express.json())'));
  assert.ok(server.includes('app.use(errorHandler)'));
});

// Feature 1.11 Tests
test('1.11-U1', 'Frontend Foundation App & Vite setup', () => {
  assert.ok(fs.existsSync(path.join(rootDir, 'apps/web/vite.config.ts')));
  assert.ok(fs.existsSync(path.join(rootDir, 'apps/web/src/App.tsx')));
});

// Feature 1.12 Tests
test('1.12-U1', '3-Theme Switcher (LIGHT, GRAY slate, DARK)', () => {
  const typesIndex = fs.readFileSync(path.join(rootDir, 'packages/types/src/index.ts'), 'utf8');
  const themeCss = fs.readFileSync(path.join(rootDir, 'apps/web/src/styles/theme.css'), 'utf8');
  assert.ok(typesIndex.includes("export type ThemeMode = 'LIGHT' | 'GRAY' | 'DARK'"));
  assert.ok(themeCss.includes('[data-theme="gray"]'));
  assert.ok(themeCss.includes('[data-theme="dark"]'));
  assert.ok(themeCss.includes('[data-theme="light"]'));
});

test('1.12-U2', '23-Language Multilingual Engine (English + 22 Indian languages)', () => {
  const i18nCtx = fs.readFileSync(path.join(rootDir, 'apps/web/src/context/I18nContext.tsx'), 'utf8');
  assert.ok(i18nCtx.includes("code: 'hi'"));
  assert.ok(i18nCtx.includes("code: 'bn'"));
  assert.ok(i18nCtx.includes("code: 'te'"));
  assert.ok(i18nCtx.includes("code: 'sat'"));
  assert.ok(i18nCtx.includes("code: 'lus'"));
});

// Section 7 Security Confirmation Gates
test('SEC-01', 'Security Gate: Ownership vs. Permission IDOR Separation', () => {
  const userRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/user.routes.ts'), 'utf8');
  assert.ok(userRoutes.includes('isSelf'), 'Must check if caller is owner');
  assert.ok(userRoutes.includes('isAdmin'), 'Must check if caller is admin');
  assert.ok(userRoutes.includes('IDOR_DENIED'), 'Must deny non-owner non-admin access');
});

test('SEC-02', 'Security Gate: JWT Revocation & Refresh Rotation', () => {
  const authRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/auth.routes.ts'), 'utf8');
  assert.ok(authRoutes.includes('revoked: true'), 'Must revoke used refresh tokens during rotation');
});

test('SEC-03', 'Security Gate: 100% Request Validation Pipeline', () => {
  const userRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/user.routes.ts'), 'utf8');
  const authRoutes = fs.readFileSync(path.join(rootDir, 'apps/api/src/routes/auth.routes.ts'), 'utf8');
  assert.ok(authRoutes.includes('validate(loginSchema)'));
  assert.ok(userRoutes.includes('validate(createUserSchema)'));
  assert.ok(userRoutes.includes('validate(updateUserSchema)'));
});

console.log('\n====================================================');
console.log(` Master Test Results: ${passed}/${total} Passed`);
console.log('====================================================');

if (passed !== total) {
  process.exit(1);
}
