#!/usr/bin/env bash
# ==============================================================
#  ExamOS — Share & Export Database Package (share_db.sh)
#  Packages the pre-configured PostgreSQL (PGlite) database
#  along with the automated setupdb.sh installer into a
#  clean zip archive on Linux/macOS.
# ==============================================================

set -e

if [ "$1" = "install" ] || [ "$1" = "--install" ]; then
    bash setupdb.sh "${@:2}"
    exit $?
fi

echo "=============================================================="
echo "  ExamOS Database Share & Package Generator (Unix)"
echo "=============================================================="
echo ""

if [ ! -f "postgres-data/PG_VERSION" ]; then
    echo "[ERROR] 'postgres-data' directory not found in $(pwd)"
    exit 1
fi

if [ ! -f "setupdb.sh" ]; then
    echo "[ERROR] 'setupdb.sh' installer script is missing."
    exit 1
fi

# Stop running services if any
if [ -f "stop_all.sh" ]; then
    echo "[1/4] Stopping active services to ensure database consistency..."
    bash stop_all.sh >/dev/null 2>&1 || true
fi

rm -f "postgres-data/postmaster.pid"

OUTFILE="examos-database.zip"
OUTFILE_ALIAS="database.zip"

rm -f "$OUTFILE" "$OUTFILE_ALIAS"

echo "[2/4] Packaging database and installer into zip..."
if command -v 7z >/dev/null 2>&1; then
    7z a -tzip "$OUTFILE" postgres-data setupdb.bat setupdb.sh README_DATABASE.txt -xr!postmaster.pid >/dev/null
elif command -v zip >/dev/null 2>&1; then
    zip -q -r "$OUTFILE" postgres-data setupdb.bat setupdb.sh README_DATABASE.txt -x "*/postmaster.pid"
else
    echo "[ERROR] Neither 7z nor zip utility found."
    exit 1
fi

cp "$OUTFILE" "$OUTFILE_ALIAS"

echo "[3/4] Verifying archive..."
if [ ! -f "$OUTFILE" ]; then
    echo "[ERROR] Failed to generate $OUTFILE"
    exit 1
fi

ZIP_SIZE=$(du -h "$OUTFILE" | cut -f1)

echo "[4/4] Package ready: $OUTFILE ($ZIP_SIZE)"
echo ""
echo "=============================================================="
echo "  Database Sharing Package Created Successfully!"
echo "=============================================================="
echo ""
echo "Distribution file: $OUTFILE"
echo "Recipient installs via: bash setupdb.sh"
echo ""
exit 0
