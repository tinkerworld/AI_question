#!/usr/bin/env bash
# ==============================================================
#  ExamOS Build Tracker — Start Script (macOS / Linux)
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT/tools/build-tracker"

echo ""
echo "Starting Build Tracker..."
echo "  Tracker: http://localhost:3050"
echo ""

node server.js
