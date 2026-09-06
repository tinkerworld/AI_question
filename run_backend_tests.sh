#!/usr/bin/env bash
# ==============================================================
#  ExamOS — Canonical Backend Test Runner (macOS / Linux)
#  Runs all 20 tests/phase-*.test.js test suites.
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Checking that ExamOS API server is responding on port 4043..."
API_OK=0

if command -v curl >/dev/null 2>&1; then
    curl -s http://localhost:4043/health >/dev/null 2>&1 && API_OK=1 || API_OK=0
elif command -v nc >/dev/null 2>&1; then
    nc -z localhost 4043 >/dev/null 2>&1 && API_OK=1 || API_OK=0
else
    (exec 3<>/dev/tcp/127.0.0.1/4043) >/dev/null 2>&1 && API_OK=1 || API_OK=0
fi

if [ "$API_OK" -eq 0 ]; then
    echo "ERROR: ExamOS API server (port 4043) is not responding."
    echo "Please start the server first by running ./start_all.sh (or bash start_all.sh)."
    exit 1
fi

set +e
node "$REPO_ROOT/tools/backend-tester/run_backend_tests.js" "$@"
TESTEXIT=$?
set -e

if [ $TESTEXIT -ne 0 ]; then
    echo ""
    echo "[FAILURE] One or more backend test suites failed."
    exit $TESTEXIT
fi

echo ""
echo "[SUCCESS] All backend test suites passed."
exit 0