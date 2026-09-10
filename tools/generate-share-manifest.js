/**
 * ExamOS Share Package Manifest Generator
 * ==============================================================
 * Generates share-manifest.txt containing metadata about the
 * export event (timestamp, git commit hash, exporting machine & OS).
 * Written to repo root and postgres-data/ for install-time verification.
 * ==============================================================
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'not a git repo';
  }
}

function findRepoRoot() {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(cur, 'share_db.bat')) || fs.existsSync(path.join(cur, 'start_all.bat'))) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return path.resolve(__dirname, '..');
}

const targetRoot = process.argv[2] ? path.resolve(process.argv[2]) : findRepoRoot();
const timestamp = process.env.OVERRIDE_EXPORT_TIMESTAMP || new Date().toISOString();
const gitCommit = getGitCommit();
const machine = os.hostname();
const platform = `${os.platform()} ${os.release()} (${os.type()})`;

const manifestContent = [
  '================================================================================',
  ' ExamOS Database Share Manifest',
  '================================================================================',
  `EXPORT_TIMESTAMP=${timestamp}`,
  `GIT_COMMIT=${gitCommit}`,
  `EXPORT_MACHINE=${machine}`,
  `EXPORT_OS=${platform}`,
  `EXPORT_NODE_VERSION=${process.version}`,
  '================================================================================',
  ''
].join('\n');

const rootManifest = path.join(targetRoot, 'share-manifest.txt');
fs.writeFileSync(rootManifest, manifestContent, 'utf8');

const pgDataDir = path.join(targetRoot, 'postgres-data');
if (fs.existsSync(pgDataDir)) {
  fs.writeFileSync(path.join(pgDataDir, 'share-manifest.txt'), manifestContent, 'utf8');
}

console.log(`[share-manifest] Generated share-manifest.txt: timestamp=${timestamp}, commit=${gitCommit}`);
