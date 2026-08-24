const cp = require('child_process');
const path = require('path');

const testFiles = [
  'tests/phase-01-master.test.js',
  'tests/phase-02-master.test.js',
  'tests/phase-03-master.test.js',
  'tests/phase-04-master.test.js',
  'tests/phase-05-master.test.js',
  'tests/phase-06-master.test.js',
  'tests/phase-07-master.test.js',
  'tests/phase-08-master.test.js',
  'tests/phase-09-master.test.js',
  'tests/phase-10-master.test.js',
  'tests/phase-11-master.test.js',
  'tests/phase-11-stacking-and-caps.test.js',
  'tests/phase-12-interview-master.test.js',
  'tests/phase-13-subscriptions-master.test.js',
];

console.log('Running all Phase 1-13 master test suites...');
for (const file of testFiles) {
  console.log(`\n======================================================\nExecuting: ${file}\n======================================================`);
  cp.execSync(`node ${file}`, {
    stdio: 'inherit',
    cwd: __dirname,
  });
}
console.log('\n🎉 ALL PHASE 1-13 MASTER TEST SUITES PASSED CLEANLY!\n');
