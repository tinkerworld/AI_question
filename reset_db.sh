#!/usr/bin/env bash
# ==============================================================
#  ExamOS — Standalone Database Reset & Seeding (macOS / Linux)
#  Run this from the repo root (folder containing docs/, Exam/, tools/)
#
#  Wipes the PostgreSQL 16 database, applies fresh schema DDL
#  migrations, and seeds baseline data (Courses, Question Bank,
#  Exams, AI Models, Personas).
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "===================================================="
echo "  ExamOS Database Reset & Baseline Seeding"
echo "===================================================="
echo ""

WAS_RUNNING=0
if command -v curl >/dev/null 2>&1; then
    curl -s http://localhost:4043/api/v1/health >/dev/null 2>&1 && WAS_RUNNING=1 || WAS_RUNNING=0
fi

if [ "$WAS_RUNNING" -eq 1 ]; then
    echo "Stopping running services for clean database reset..."
    bash stop_all.sh >/dev/null 2>&1 || true
fi

# --- 1. Migrate Database Schema ---
echo "[1/2] Initializing embedded PostgreSQL 16 database and running migrations..."
(
    cd Exam
    node packages/database/prisma/migrate-postgres.js
)

# --- 2. Seed Baseline Data ---
echo ""
echo "[2/2] Seeding baseline data (Courses, Question Bank, Exams, AI Models, Personas)..."
(
    cd Exam
    npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json packages/database/prisma/seed.ts
)

if [ "$WAS_RUNNING" -eq 1 ]; then
    echo ""
    echo "Restarting ExamOS stack with fresh database..."
    bash start_all.sh
fi

echo ""
echo "===================================================="
echo "  Database Reset & Seeding Completed Successfully!"
echo "===================================================="
echo ""
echo "  Seeded Login Credentials:"
echo "    - Main Admin:   admin@examos.com    / Admin@123"
echo "    - Sub-Admin:    subadmin@examos.com / SubAdmin@123"
echo "    - Teacher:      teacher@examos.com  / Teacher@123"
echo "    - Student 1:    student@examos.com  / Student@123"
echo "    - Student 2:    student2@examos.com / Student2@123"
echo ""
echo "===================================================="
echo ""

exit 0
