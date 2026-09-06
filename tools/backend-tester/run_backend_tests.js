#!/usr/bin/env node

/**
 * ExamOS Canonical Backend Test Runner
 *
 * Runs all tests/phase-*.test.js suites with auto-detected execution environment:
 *   - Plain `node tests/<file>.test.js` for suites using standard HTTP / fetch.
 *   - `npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only tests/<file>.test.js`
 *     for suites that require raw .ts source directly.
 *
 * Appends execution results to tools/backend-tester/logs/history.txt and writes run logs.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Determine repo root and Exam paths
function getPaths() {
  let cur = __dirname;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(cur, 'start_all.bat')) || fs.existsSync(path.join(cur, 'ExamOS-Build-Directive.md'))) {
      const examDir = fs.existsSync(path.join(cur, 'Exam', 'tests')) ? path.join(cur, 'Exam') : cur;
      return { repoRoot: cur, examDir, testsDir: path.join(examDir, 'tests') };
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  const fallback = process.cwd();
  const examDir = fs.existsSync(path.join(fallback, 'Exam', 'tests')) ? path.join(fallback, 'Exam') : fallback;
  return { repoRoot: fallback, examDir, testsDir: path.join(examDir, 'tests') };
}

const { repoRoot, examDir, testsDir } = getPaths();

// Inspect file content to auto-detect if ts-node is required
function requiresTsNode(content) {
  const hasTsRequire = /require\s*\([^)]*\.ts['"`\)]/.test(content);
  const hasTsPath = /\.ts['"`]\s*\)/.test(content);
  const hasTsImport = /from\s+['"][^'"]*\.ts['"]/.test(content);
  return hasTsRequire || hasTsPath || hasTsImport;
}

// Generate zero-padded timestamp: YYYY-MM-DD_HH-mm-ss
function getTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

async function main() {
  console.log('================================================================');
  console.log('🧪 ExamOS Canonical Backend Test Runner');
  console.log('================================================================');
  console.log(`Repo Root : ${repoRoot}`);
  console.log(`Exam Dir  : ${examDir}`);
  console.log(`Tests Dir : ${testsDir}`);
  console.log('----------------------------------------------------------------\n');

  if (!fs.existsSync(testsDir)) {
    console.error(`ERROR: Tests directory not found at: ${testsDir}`);
    process.exit(1);
  }

  // Discover test files
  let allFiles = fs.readdirSync(testsDir)
    .filter((f) => f.startsWith('phase-') && f.endsWith('.test.js'))
    .sort();

  // Handle CLI filter if provided
  const args = process.argv.slice(2);
  const filterIndex = args.findIndex((a) => a === '--filter' || a.startsWith('--filter='));
  let filterPattern = null;
  if (filterIndex !== -1) {
    if (args[filterIndex].startsWith('--filter=')) {
      filterPattern = args[filterIndex].split('=')[1];
    } else if (args[filterIndex + 1]) {
      filterPattern = args[filterIndex + 1];
    }
  }

  if (filterPattern) {
    allFiles = allFiles.filter((f) => f.includes(filterPattern));
  } else if (args.length > 0 && !args[0].startsWith('-')) {
    allFiles = allFiles.filter((f) => args.includes(f) || args.some((a) => f.includes(a)));
  }

  console.log(`Found ${allFiles.length} backend test suite(s) to execute.\n`);

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  const suiteStartTime = Date.now();
  const runLogLines = [];

  runLogLines.push(`ExamOS Backend Test Run - ${new Date().toISOString()}`);
  runLogLines.push(`Total Suites: ${allFiles.length}\n`);

  for (let i = 0; i < allFiles.length; i++) {
    const filename = allFiles[i];
    const filePath = path.join(testsDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const needsTs = requiresTsNode(content);
    const runner = needsTs ? 'ts-node' : 'node';

    const testRelPath = path.join('tests', filename);
    process.stdout.write(`[${i + 1}/${allFiles.length}] Running ${filename} (${runner})... `);

    const testStart = Date.now();
    let execCmd = 'node';
    let execArgs = [testRelPath];

    if (needsTs) {
      execCmd = 'npx';
      execArgs = [
        'ts-node',
        '-r',
        'tsconfig-paths/register',
        '--project',
        'apps/api/tsconfig.json',
        '--transpile-only',
        testRelPath,
      ];
    }

    const proc = spawnSync(execCmd, execArgs, {
      cwd: examDir,
      shell: true,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '1' },
      maxBuffer: 10 * 1024 * 1024,
    });

    const duration = ((Date.now() - testStart) / 1000).toFixed(2);
    const passed = proc.status === 0;

    if (passed) {
      process.stdout.write(`✅ PASSED (${duration}s)\n`);
      totalPassed++;
    } else {
      process.stdout.write(`❌ FAILED (${duration}s, exit code: ${proc.status})\n`);
      totalFailed++;
    }

    const testResult = {
      filename,
      runner,
      passed,
      exitCode: proc.status,
      duration: `${duration}s`,
      stdout: proc.stdout || '',
      stderr: proc.stderr || '',
    };
    results.push(testResult);

    runLogLines.push(`----------------------------------------------------------------`);
    runLogLines.push(`Suite: ${filename} | Runner: ${runner} | Result: ${passed ? 'PASSED' : 'FAILED'} | Duration: ${duration}s | Exit: ${proc.status}`);
    runLogLines.push(`Output:`);
    runLogLines.push(proc.stdout || '(no stdout)');
    if (proc.stderr) {
      runLogLines.push(`Stderr:`);
      runLogLines.push(proc.stderr);
    }
  }

  const totalDuration = ((Date.now() - suiteStartTime) / 1000).toFixed(1);
  const statusStr = totalFailed === 0 ? 'PASSED' : 'FAILED';

  console.log('\n================================================================');
  console.log('📊 BACKEND TEST SUITES EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`  Total Suites:    ${allFiles.length}`);
  console.log(`  Passed:          ${totalPassed}`);
  console.log(`  Failed:          ${totalFailed}`);
  console.log(`  Total Duration:  ${totalDuration}s`);
  console.log(`  Final Status:    ${statusStr}`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    console.log('Failed Suites Details:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.filename} (Exit: ${r.exitCode})`);
      if (r.stderr) {
        const errorSummary = r.stderr.trim().split('\n').slice(0, 4).join('\n');
        console.log(`    ${errorSummary.replace(/\n/g, '\n    ')}`);
      }
    });
    console.log('');
  }

  // Ensure log directory exists
  const logsDir = path.join(repoRoot, 'tools', 'backend-tester', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Write run log
  const timestamp = getTimestamp();
  const runLogPath = path.join(logsDir, `run-${timestamp}.txt`);
  runLogLines.push(`\n================================================================`);
  runLogLines.push(`Final Status: ${statusStr} | Passed: ${totalPassed}/${allFiles.length} | Duration: ${totalDuration}s`);
  fs.writeFileSync(runLogPath, runLogLines.join('\n'), 'utf8');

  // Append history line: format matching tools/e2e-tester/logs/history.txt with commit hash
  let commitHash = 'unknown';
  try {
    const gitRes = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
    if (gitRes.status === 0 && gitRes.stdout) {
      commitHash = gitRes.stdout.trim();
    }
  } catch {}

  const historyPath = path.join(logsDir, 'history.txt');
  const historyLine = `${timestamp} | commit=${commitHash} | total=${allFiles.length} passed=${totalPassed} failed=${totalFailed} duration=${totalDuration}s | status=${statusStr} | report=logs/run-${timestamp}.txt\n`;
  fs.appendFileSync(historyPath, historyLine, 'utf8');

  console.log(`✓ Run log written to: ${path.relative(repoRoot, runLogPath)}`);
  console.log(`✓ History entry appended to: ${path.relative(repoRoot, historyPath)}\n`);

  process.exit(totalFailed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal backend test runner error:', err);
  process.exit(1);
});
