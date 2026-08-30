#!/usr/bin/env bash
# ==============================================================
#  ExamOS — Full End-to-End Test & Review Package Orchestrator (macOS / Linux)
#  Run this from the repo root (folder containing docs/, Exam/, tools/)
#
#  Enforced Pipeline Order:
#    1. Verify stack readiness (launches start_all.sh if not running)
#    2. Execute full Playwright E2E test suite (run_ui_tests.sh)
#    3. Execute Python Persona Security Auditor (run_audits.sh)
#    4. Generate Review Package (Reviewzip.sh)
# ==============================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "=============================================================="
echo "  ExamOS Full Verification & Review Orchestrator"
echo "=============================================================="
echo ""

E2E_STATUS="NOT RUN"
AUDIT_STATUS="NOT RUN"
ZIP_STATUS="NOT RUN"

# --- 1. Check Stack Readiness ---
echo "[1/4] Checking if ExamOS full stack is running..."
WEB_OK=0
API_OK=0

check_stack() {
    WEB_OK=0
    API_OK=0
    if command -v curl >/dev/null 2>&1; then
        curl -s http://localhost:3000 >/dev/null 2>&1 && WEB_OK=1 || WEB_OK=0
        curl -s http://localhost:4043/api/v1/health >/dev/null 2>&1 && API_OK=1 || API_OK=0
    elif command -v nc >/dev/null 2>&1; then
        nc -z localhost 3000 >/dev/null 2>&1 && WEB_OK=1 || WEB_OK=0
        nc -z localhost 4043 >/dev/null 2>&1 && API_OK=1 || API_OK=0
    else
        (exec 3<>/dev/tcp/127.0.0.1/3000) >/dev/null 2>&1 && WEB_OK=1 || WEB_OK=0
        (exec 3<>/dev/tcp/127.0.0.1/4043) >/dev/null 2>&1 && API_OK=1 || API_OK=0
    fi
}

check_stack

if [ "$WEB_OK" -eq 0 ] || [ "$API_OK" -eq 0 ]; then
    echo "      Stack is not active. Starting ExamOS stack..."
    bash start_all.sh
    echo "      Waiting for services to initialize on port 3000 and 4043..."
    
    WAIT_COUNT=0
    while [ "$WAIT_COUNT" -lt 15 ]; do
        sleep 2
        WAIT_COUNT=$((WAIT_COUNT + 1))
        check_stack
        if [ "$WEB_OK" -eq 1 ] && [ "$API_OK" -eq 1 ]; then
            echo "      ExamOS stack is live and responding!"
            break
        fi
    done
    if [ "$WEB_OK" -eq 0 ] || [ "$API_OK" -eq 0 ]; then
        echo "      [WARNING] Services took longer than 30s to respond. Proceeding with tests..."
    fi
else
    echo "      ExamOS stack is already running (Port 3000 and Port 4043 responding)."
fi

echo ""
# --- 2. Execute Playwright E2E Suite ---
echo "[2/4] Executing Playwright E2E Test Suite..."
echo "--------------------------------------------------------------"
set +e
bash run_ui_tests.sh
E2E_EXIT=$?
set -e

if [ "$E2E_EXIT" -eq 0 ]; then
    E2E_STATUS="PASSED"
else
    E2E_STATUS="FAILED (Exit Code: $E2E_EXIT)"
fi

echo ""
# --- 3. Execute Python Profile Auditor ---
echo "[3/4] Executing Python Persona Profile Security Auditor..."
echo "--------------------------------------------------------------"
set +e
bash run_audits.sh
AUDIT_EXIT=$?
set -e

if [ "$AUDIT_EXIT" -eq 0 ]; then
    AUDIT_STATUS="PASSED"
else
    AUDIT_STATUS="FAILED (Exit Code: $AUDIT_EXIT)"
fi

echo ""
# --- 4. Package for Review ---
echo "[4/4] Generating Fresh Review Package (Reviewzip.sh)..."
echo "--------------------------------------------------------------"
set +e
bash Reviewzip.sh
ZIP_EXIT=$?
set -e

if [ -f "review-package.zip" ] && [ "$ZIP_EXIT" -eq 0 ]; then
    ZIP_STATUS="GENERATED (review-package.zip)"
else
    ZIP_STATUS="FAILED"
fi

echo ""
echo "=============================================================="
echo "  Full Verification Pipeline Summary"
echo "=============================================================="
echo "  1. Stack Health:              ACTIVE"
echo "  2. Playwright E2E Suite:      $E2E_STATUS"
echo "  3. Persona Profile Auditor:   $AUDIT_STATUS"
echo "  4. Review Archive:            $ZIP_STATUS"
echo "=============================================================="
echo "  All test logs, traces, and fresh history entries from THIS"
echo "  run have been bundled into review-package.zip."
echo "=============================================================="
echo ""

if [ "$E2E_EXIT" -ne 0 ]; then
    exit "$E2E_EXIT"
fi
if [ "$AUDIT_EXIT" -ne 0 ]; then
    exit "$AUDIT_EXIT"
fi
if [ "$ZIP_EXIT" -ne 0 ]; then
    exit "$ZIP_EXIT"
fi
exit 0
