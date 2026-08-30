#!/usr/bin/env bash
# ==============================================================
#  ExamOS — Export Clean Distribution Package for Friend
#  Run this from repo root.
#  Creates a minimal, fresh, zero-secret distribution zip.
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

OUTFILE="examos.zip"
rm -f "$OUTFILE"

echo "=============================================================="
echo "  Exporting Clean ExamOS Distribution Package: $OUTFILE"
echo "=============================================================="
echo ""
echo "  Including:"
echo "    - Full monorepo source (Exam/apps, Exam/packages, docs/)"
echo "    - Monorepo package manifests and pnpm-lock.yaml"
echo "    - Database migration and seed pipelines"
echo "    - Cross-platform installers (install.bat, install.sh)"
echo "    - Quick Start documentation (SETUP.md, README.md)"
echo "    - Runtime control scripts (start_all/stop_all for Win/Mac/Linux)"
echo ""
echo "  Strictly Excluding (Privacy, Clean Slate & Zero Bloat):"
echo "    - postgres-data (Fresh database seed on friend's machine)"
echo "    - .env / .env.* / agyssessionid.txt (Zero leaked secrets)"
echo "    - node_modules, .turbo, dist, build, .cache, coverage"
echo "    - .git directory"
echo "    - Review artifacts, E2E logs, test traces, reports, screenshots"
echo "    - Packaging scripts and existing *.zip archives"
echo ""

# --- Select and Execute Compression Tool ---
if command -v zip >/dev/null 2>&1; then
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
      -x ".env" "*/.env" \
      -x ".env.local" "*/.env.local" \
      -x ".env.*.local" "*/.env.*.local" \
      -x ".env.production" "*/.env.production" \
      -x ".env.production.local" "*/.env.production.local" \
      -x ".env.development" "*/.env.development" \
      -x ".env.development.local" "*/.env.development.local" \
      -x ".env.test" "*/.env.test" \
      -x ".env.test.local" "*/.env.test.local" \
      -x ".env.staging" "*/.env.staging" \
      -x ".env.staging.local" "*/.env.staging.local" \
      -x "agyssessionid.txt" \
      -x "__pycache__/*" "*/__pycache__/*" "*.pyc" "*/*.pyc" \
      -x "*.log" "*/logs/*" "logs/*" \
      -x "*.tsbuildinfo" \
      -x ".vscode/*" "*/.vscode/*" \
      -x ".idea/*" "*/.idea/*" \
      -x "Thumbs.db" ".DS_Store" \
      -x "reports/*" "*/reports/*" \
      -x "screenshots/*" "*/screenshots/*" \
      -x "scratch/*" "*/scratch/*" \
      -x "*.zip" "$OUTFILE" \
      -x "git-log.txt" "git-log-oneline.txt" "tree.txt" "lockfile-check.txt" "test-output.txt" \
      -x "export_proj.bat" "export_proj.sh" "export_for_friend.bat" "Reviewzip.bat" "Reviewzip.sh"
elif command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& {
        \$sz = if (Test-Path 'C:\Program Files\7-Zip\7z.exe') { 'C:\Program Files\7-Zip\7z.exe' } elseif (Test-Path 'C:\Program Files (x86)\7-Zip\7z.exe') { 'C:\Program Files (x86)\7-Zip\7z.exe' } else { '7z' }
        & \$sz a -tzip examos.zip * '-xr!node_modules*' '-xr!postgres-data' '-xr!.cache' '-xr!.prisma' '-xr!dist' '-xr!.next' '-xr!build' '-xr!coverage' '-xr!.turbo' '-xr!.git' '-xr!*.db' '-xr!*.db-journal' '-xr!.env' '-xr!.env.local' '-xr!.env.*.local' '-xr!.env.production' '-xr!.env.development' '-xr!.env.test' '-xr!.env.staging' '-xr!agyssessionid.txt' '-xr!__pycache__' '-xr!*.pyc' '-xr!*.log' '-xr!*.tsbuildinfo' '-xr!.vscode' '-xr!.idea' '-xr!Thumbs.db' '-xr!.DS_Store' '-xr!logs' '-xr!reports' '-xr!screenshots' '-xr!scratch' '-xr!review-package.zip' '-xr!examos-for-friend.zip' '-xr!examos.zip' '-xr!*.zip' '-xr!git-log.txt' '-xr!git-log-oneline.txt' '-xr!tree.txt' '-xr!lockfile-check.txt' '-xr!test-output.txt' '-xr!export_proj.bat' '-xr!export_proj.sh' '-xr!export_for_friend.bat' '-xr!Reviewzip.bat' '-xr!Reviewzip.sh'
    }"
elif command -v 7z >/dev/null 2>&1; then
    7z a -tzip "$OUTFILE" . \
      "-xr!node_modules*" \
      "-xr!postgres-data" \
      "-xr!.cache" \
      "-xr!.prisma" \
      "-xr!dist" \
      "-xr!.next" \
      "-xr!build" \
      "-xr!coverage" \
      "-xr!.turbo" \
      "-xr!.git" \
      "-xr!*.db" \
      "-xr!*.db-journal" \
      "-xr!.env" \
      "-xr!.env.local" \
      "-xr!.env.*.local" \
      "-xr!.env.production" \
      "-xr!.env.development" \
      "-xr!.env.test" \
      "-xr!.env.staging" \
      "-xr!agyssessionid.txt" \
      "-xr!__pycache__" \
      "-xr!*.pyc" \
      "-xr!*.log" \
      "-xr!*.tsbuildinfo" \
      "-xr!.vscode" \
      "-xr!.idea" \
      "-xr!Thumbs.db" \
      "-xr!.DS_Store" \
      "-xr!logs" \
      "-xr!reports" \
      "-xr!screenshots" \
      "-xr!scratch" \
      "-xr!review-package.zip" \
      "-xr!examos-for-friend.zip" \
      "-xr!examos.zip" \
      "-xr!*.zip" \
      "-xr!git-log.txt" \
      "-xr!git-log-oneline.txt" \
      "-xr!tree.txt" \
      "-xr!lockfile-check.txt" \
      "-xr!test-output.txt" \
      "-xr!export_proj.bat" \
      "-xr!export_proj.sh" \
      "-xr!export_for_friend.bat" \
      "-xr!Reviewzip.bat" \
      "-xr!Reviewzip.sh"
else
    echo "ERROR: Neither 'zip', '7z', nor 'powershell.exe' found."
    echo "Please install zip (apt install zip / brew install zip) or 7-Zip."
    exit 1
fi

echo ""
if [ ! -f "$OUTFILE" ]; then
    echo "ERROR: Failed to create $OUTFILE."
    exit 1
fi

echo "=============================================================="
echo "  Integrity & Security Audit on $OUTFILE"
echo "=============================================================="

# Check postgres-data absence
if command -v unzip >/dev/null 2>&1; then
    if unzip -l "$OUTFILE" | grep -iq "postgres-data"; then
        echo "  [SECURITY ALERT] postgres-data found in zip! Removing..."
        zip -d "$OUTFILE" "postgres-data/*" >/dev/null
    else
        echo "  [OK] postgres-data is ABSENT (Zero database leakage)"
    fi

    if unzip -l "$OUTFILE" | grep -iqE "\.env$"; then
        echo "  [SECURITY ALERT] .env found in zip! Removing..."
        zip -d "$OUTFILE" "*.env" >/dev/null
    else
        echo "  [OK] .env files are ABSENT (Zero credentials/keys leaked)"
    fi
elif command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& {
        \$sz = if (Test-Path 'C:\Program Files\7-Zip\7z.exe') { 'C:\Program Files\7-Zip\7z.exe' } elseif (Test-Path 'C:\Program Files (x86)\7-Zip\7z.exe') { 'C:\Program Files (x86)\7-Zip\7z.exe' } else { '7z' }
        \$out = & \$sz l examos.zip
        if (\$out -match 'postgres-data') {
            Write-Host '  [SECURITY ALERT] postgres-data found in zip! Removing...'
            & \$sz d examos.zip postgres-data >\$null
        } else {
            Write-Host '  [OK] postgres-data is ABSENT [Zero database leakage]'
        }
        \$bad = \$out | Where-Object { \$_ -match '\s+\.env\$' -or \$_ -match '\s+Exam[\\\/]\.env\$' }
        if (\$bad) {
            Write-Host '  [SECURITY ALERT] .env found in zip! Removing...'
            & \$sz d examos.zip *.env >\$null
        } else {
            Write-Host '  [OK] .env files are ABSENT [Zero credentials/keys leaked]'
        }
    }"
elif command -v 7z >/dev/null 2>&1; then
    if 7z l "$OUTFILE" | grep -iq "postgres-data"; then
        echo "  [SECURITY ALERT] postgres-data found in zip! Removing..."
        7z d "$OUTFILE" postgres-data >/dev/null
    else
        echo "  [OK] postgres-data is ABSENT (Zero database leakage)"
    fi

    if 7z l "$OUTFILE" | grep -iqE "\.env$"; then
        echo "  [SECURITY ALERT] .env found in zip! Removing..."
        7z d "$OUTFILE" *.env >/dev/null
    else
        echo "  [OK] .env files are ABSENT (Zero credentials/keys leaked)"
    fi
else
    echo "  [OK] Archive created cleanly."
fi

SIZE=$(ls -lh "$OUTFILE" 2>/dev/null | awk '{print $5}' || du -h "$OUTFILE" 2>/dev/null | cut -f1)
echo ""
echo "=============================================================="
echo "  Clean distribution package created successfully:"
echo "  File: $OUTFILE ($SIZE)"
echo "=============================================================="
echo ""
echo "  Ready to send to your friend! They simply:"
echo "    1. Unzip $OUTFILE"
echo "    2. Run install.bat [Windows] or bash install.sh [macOS/Linux]"
echo "    3. Run start_all.bat [Windows] or bash start_all.sh [macOS/Linux]"
echo ""