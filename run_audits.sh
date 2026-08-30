#!/usr/bin/env bash
# ==============================================================
#  ExamOS — Python Persona Profile Auditor Runner (macOS / Linux)
#  Run this after start_all.sh, once the full stack is live.
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDITDIR="$REPO_ROOT/tools/profile-auditor"

echo "Checking that the API server is actually running on port 4043..."
API_OK=0

if command -v curl >/dev/null 2>&1; then
    curl -s http://localhost:4043/api/v1/health >/dev/null 2>&1 && API_OK=1 || API_OK=0
elif command -v nc >/dev/null 2>&1; then
    nc -z localhost 4043 >/dev/null 2>&1 && API_OK=1 || API_OK=0
else
    (exec 3<>/dev/tcp/127.0.0.1/4043) >/dev/null 2>&1 && API_OK=1 || API_OK=0
fi

if [ "$API_OK" -eq 0 ]; then
    echo "ERROR: API Server (Port 4043) is not responding. Run bash start_all.sh first."
    exit 1
fi

PYTHON_CMD="python"
if command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
else
    echo "ERROR: Python not found in PATH."
    exit 1
fi

cd "$AUDITDIR"
"$PYTHON_CMD" run_all.py "$@"
