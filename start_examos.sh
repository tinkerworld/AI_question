#!/usr/bin/env bash
# ==============================================================
#  ExamOS — Full System Start Script (macOS / Linux)
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

bash start_all.sh
