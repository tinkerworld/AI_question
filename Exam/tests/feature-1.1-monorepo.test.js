const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' Running Feature 1.1 — Monorepo Setup & Infrastructure Tests');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function runTest(id, name, fn) {
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

// Unit Tests
runTest('P01.F01.U001', 'TS Config Validation (strict: true)', () => {
  const baseTsPath = path.join(rootDir, 'packages', 'typescript-config', 'base.json');
  assert.ok(fs.existsSync(baseTsPath), 'base.json exists');
  const baseTs = JSON.parse(fs.readFileSync(baseTsPath, 'utf8'));
  assert.strictEqual(baseTs.compilerOptions.strict, true, 'strict must be true');
});

runTest('P01.F01.U002', 'ESLint Config Validation', () => {
  const eslintPath = path.join(rootDir, 'packages', 'eslint-config', 'index.js');
  assert.ok(fs.existsSync(eslintPath), 'index.js exists');
  const eslintConfig = require(eslintPath);
  assert.ok(eslintConfig.extends, 'eslint config has extends array');
});

runTest('P01.F01.U003', 'Prettier Config Validation', () => {
  const prettierPath = path.join(rootDir, '.prettierrc');
  assert.ok(fs.existsSync(prettierPath), '.prettierrc exists');
  const prettierConfig = JSON.parse(fs.readFileSync(prettierPath, 'utf8'));
  assert.strictEqual(prettierConfig.singleQuote, true, 'singleQuote must be true');
  assert.strictEqual(prettierConfig.tabWidth, 2, 'tabWidth must be 2');
});

runTest('P01.F01.U004', 'Turbo Cache Configuration', () => {
  const turboPath = path.join(rootDir, 'turbo.json');
  assert.ok(fs.existsSync(turboPath), 'turbo.json exists');
  const turboConfig = JSON.parse(fs.readFileSync(turboPath, 'utf8'));
  assert.ok(turboConfig.tasks.build, 'build pipeline exists');
  assert.ok(Array.isArray(turboConfig.tasks.build.outputs), 'build outputs array exists');
});

runTest('P01.F01.U005', 'Workspace Package Naming', () => {
  const tsPkgPath = path.join(rootDir, 'packages', 'typescript-config', 'package.json');
  const eslintPkgPath = path.join(rootDir, 'packages', 'eslint-config', 'package.json');
  const tsPkg = JSON.parse(fs.readFileSync(tsPkgPath, 'utf8'));
  const eslintPkg = JSON.parse(fs.readFileSync(eslintPkgPath, 'utf8'));
  assert.ok(tsPkg.name.startsWith('@repo/'), 'typescript-config uses @repo/ prefix');
  assert.ok(eslintPkg.name.startsWith('@repo/'), 'eslint-config uses @repo/ prefix');
});

// Integration Tests
runTest('P01.F01.I001', 'Cross-package Workspace Configuration', () => {
  const workspacePath = path.join(rootDir, 'pnpm-workspace.yaml');
  assert.ok(fs.existsSync(workspacePath), 'pnpm-workspace.yaml exists');
  const content = fs.readFileSync(workspacePath, 'utf8');
  assert.ok(content.includes('packages/*'), 'includes packages/*');
  assert.ok(content.includes('apps/*'), 'includes apps/*');
});

runTest('P01.F01.I002', 'Docker PostgreSQL 16 Configuration', () => {
  const dockerPath = path.join(rootDir, 'docker-compose.yml');
  assert.ok(fs.existsSync(dockerPath), 'docker-compose.yml exists');
  const dockerContent = fs.readFileSync(dockerPath, 'utf8');
  assert.ok(dockerContent.includes('postgres:16-alpine'), 'uses PostgreSQL 16 alpine image');
  assert.ok(dockerContent.includes('5432:5432'), 'exposes port 5432');
});

runTest('P01.F01.I003', 'Docker Redis 7 Configuration', () => {
  const dockerPath = path.join(rootDir, 'docker-compose.yml');
  const dockerContent = fs.readFileSync(dockerPath, 'utf8');
  assert.ok(dockerContent.includes('redis:7-alpine'), 'uses Redis 7 alpine image');
  assert.ok(dockerContent.includes('6379:6379'), 'exposes port 6379');
});

// E2E Tests
runTest('P01.F01.E001', 'Full Workspace Monorepo Root Integrity', () => {
  const pkgPath = path.join(rootDir, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'root package.json exists');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.strictEqual(pkg.private, true, 'root package.json is private');
  assert.ok(pkg.scripts.build, 'build script present');
  assert.ok(pkg.scripts.test, 'test script present');
  assert.ok(pkg.scripts.lint, 'lint script present');
});

console.log(`\n====================================================`);
console.log(` Test Results: ${passed}/${total} Passed`);
console.log(`====================================================`);

if (passed !== total) {
  process.exit(1);
}
