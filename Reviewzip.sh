#!/bin/bash
# ==============================================================
#  ExamOS — Package for Review (Linux / Mac / POSIX)
#  Run this from the repo root (folder containing docs/, Exam/, tools/)
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

OUTFILE="review-package.zip"
rm -f "$OUTFILE"

echo "Generating lock file integrity check..."
if [ -f "Exam/pnpm-lock.yaml" ]; then
    echo "pnpm-lock.yaml: present (correct)" > lockfile-check.txt
else
    echo "WARNING: pnpm-lock.yaml MISSING - project declares pnpm but has no lock file!" > lockfile-check.txt
fi

if [ -f "Exam/package-lock.json" ]; then
    echo "WARNING: package-lock.json present at root - this should NOT exist, project uses pnpm workspaces and npm install will fail on workspace:* references" >> lockfile-check.txt
else
    echo "package-lock.json at root: absent (correct)" >> lockfile-check.txt
fi

if [ -f "Exam/apps/web/package-lock.json" ]; then
    echo "WARNING: package-lock.json present in apps/web - should NOT exist" >> lockfile-check.txt
else
    echo "package-lock.json in apps/web: absent (correct)" >> lockfile-check.txt
fi

echo "Generating file tree snapshot..."
if command -v tree >/dev/null 2>&1; then
    tree -a -I "node_modules|postgres-data|.git|.turbo|.cache|dist|.next|build|coverage" > tree.txt
else
    find . -not -path '*/.*' -not -path './node_modules*' -not -path './postgres-data*' > tree.txt
fi

echo "Generating git log snapshot..."
if [ -d ".git" ]; then
    git log --stat --date=iso -n 50 > git-log.txt 2>/dev/null || true
    git log --oneline --all -n 100 > git-log-oneline.txt 2>/dev/null || true
elif [ -d "Exam/.git" ]; then
    (cd Exam && git log --stat --date=iso -n 50 > ../git-log.txt 2>/dev/null || true)
    (cd Exam && git log --oneline --all -n 100 > ../git-log-oneline.txt 2>/dev/null || true)
else
    echo "No .git found in root or Exam/ — skipping git log." > git-log.txt
fi

echo "Checking for UI test tool run history..."
E2ECOUNT=$(find tools/e2e-tester/logs -name "*.txt" 2>/dev/null | wc -l || echo 0)

echo "Zipping project for review..."
echo "  Including: everything in this folder, plus tree.txt and git-log.txt"
echo "  Excluding: node_modules, build output, database data/binaries, secrets"
echo ""

zip -r "$OUTFILE" . \
  -x "node_modules/*" "*/node_modules/*" \
  -x "postgres-data/*" "*/postgres-data/*" \
  -x ".cache/*" "*/.cache/*" \
  -x ".prisma/*" "*/.prisma/*" \
  -x "dist/*" "*/dist/*" \
  -x ".next/*" "*/.next/*" \
  -x "build/*" "*/build/*" \
  -x "coverage/*" "*/coverage/*" \
  -x ".turbo/*" "*/.turbo/*" \
  -x ".git/*" "*/.git/*" \
  -x "*.db" "*.db-journal" \
  -x ".env" ".env.*" "*/.env" "*/.env.*" \
  -x "agyssessionid.txt" \
  -x "*.log" \
  -x "*.tsbuildinfo" \
  -x ".vscode/*" "*/.vscode/*" \
  -x ".idea/*" "*/.idea/*" \
  -x "Thumbs.db" ".DS_Store" \
  -x "$OUTFILE" \
  -x "nul"

echo ""
if [ -f "$OUTFILE" ]; then
    SIZE=$(du -h "$OUTFILE" | cut -f1)
    echo "===================================================="
    echo "  Done! Created $OUTFILE ($SIZE)"
    echo "===================================================="
    echo ""
    echo "Included in package:"
    echo "  - lockfile-check.txt"
    echo "  - tree.txt"
    echo "  - git-log.txt & git-log-oneline.txt"
    echo "  - tools/e2e-tester/logs/ ($E2ECOUNT runs)"
    echo "  - tools/human-simulator/ & entire codebase"
else
    echo "Something went wrong — $OUTFILE was not created."
    exit 1
fi
