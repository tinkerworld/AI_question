#!/usr/bin/env bash
# ==============================================================
#  ExamOS — UI / Human Simulation Test Runner (macOS / Linux)
#  Run this after start_all.sh, once the full stack is live.
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLDIR="$REPO_ROOT/tools/e2e-tester"

if [ ! -d "$TOOLDIR/node_modules" ]; then
    echo ""
    echo "ERROR: e2e tester dependencies not installed yet."
    echo "Run this once first:"
    echo "  cd tools/e2e-tester"
    echo "  npm install"
    echo "  npm run install-browser"
    echo ""
    exit 1
fi

echo "Checking that the app is actually running first..."
WEB_OK=0
API_OK=0

if command -v curl >/dev/null 2>&1; then
    curl -s http://localhost:3000 >/dev/null 2>&1 && WEB_OK=1 || WEB_OK=0
    curl -s http://localhost:4043/api/v1/health >/dev/null 2>&1 && API_OK=1 || API_OK=0
elif command -v nc >/dev/null 2>&1; then
    nc -z localhost 3000 >/dev/null 2>&1 && WEB_OK=1 || WEB_OK=0
    nc -z localhost 4043 >/dev/null 2>&1 && API_OK=1 || API_OK=0
else
    # Fallback to bash tcp socket
    (exec 3<>/dev/tcp/127.0.0.1/3000) >/dev/null 2>&1 && WEB_OK=1 || WEB_OK=0
    (exec 3<>/dev/tcp/127.0.0.1/4043) >/dev/null 2>&1 && API_OK=1 || API_OK=0
fi

if [ "$WEB_OK" -eq 0 ] || [ "$API_OK" -eq 0 ]; then
    echo "ERROR: Web (3000) or API (4043) is not responding. Run bash start_all.sh first."
    exit 1
fi

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
mkdir -p "$TOOLDIR/logs" "$TOOLDIR/reports"
LOGFILE="$TOOLDIR/logs/e2e-run-$TIMESTAMP.txt"

echo ""
echo "===================================================="
echo " Running ExamOS UI test suite..."
echo " Log:    logs/e2e-run-$TIMESTAMP.txt"
echo " Report: reports/$TIMESTAMP/"
echo "===================================================="
echo ""

cd "$TOOLDIR"
set +e
npx playwright test "$@" 2>&1 | tee "$LOGFILE"
TESTEXIT=$?
set -e

# Copy report into timestamped folder
if [ -d "playwright-report" ]; then
    cp -r "playwright-report" "reports/$TIMESTAMP"
fi

# Append history entry
RESULTS_FILE="reports/$TIMESTAMP/results.json"
if [ -f "$RESULTS_FILE" ]; then
    node -e "
        const r = JSON.parse(require('fs').readFileSync('$RESULTS_FILE', 'utf8'));
        const dur = (r.stats.duration / 1000).toFixed(1);
        const line = '$TIMESTAMP | passed=' + r.stats.expected + ' failed=' + r.stats.unexpected + ' skipped=' + r.stats.skipped + ' flaky=' + r.stats.flaky + ' duration=' + dur + 's | report=reports/$TIMESTAMP';
        require('fs').appendFileSync('logs/history.txt', line + '\n');
    " 2>/dev/null || true
else
    echo "$TIMESTAMP | NO RESULTS - run likely crashed before any test executed" >> logs/history.txt
fi

# Prune detailed .txt logs to most recent 20
ls -t logs/e2e-run-*.txt 2>/dev/null | tail -n +21 | xargs -r rm -f || true

# Prune reports to most recent 3
ls -dt reports/*/ 2>/dev/null | tail -n +4 | xargs -r rm -rf || true

echo ""
echo "===================================================="
if [ "$TESTEXIT" -eq 0 ]; then
    echo " ALL TESTS PASSED"
else
    echo " SOME TESTS FAILED - see log and report above for details"
fi
echo "===================================================="
echo ""
echo "Log saved to:      tools/e2e-tester/logs/e2e-run-$TIMESTAMP.txt"
echo "Report saved to:   tools/e2e-tester/reports/$TIMESTAMP/index.html"
echo "History updated:   tools/e2e-tester/logs/history.txt"
echo ""

exit $TESTEXIT
