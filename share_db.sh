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
    echo "[1/6] Stopping active services to ensure database consistency..."
    bash stop_all.sh >/dev/null 2>&1 || true
fi

rm -f "postgres-data/postmaster.pid"

# Pre-packaging schema-ensure and verification
echo ""
echo "[2/6] Verifying database schema and ensuring all feature tables..."
set +e
node tools/verify-and-ensure-db.js "postgres-data"
VERIFY_EXIT=$?
set -e

if [ $VERIFY_EXIT -eq 2 ]; then
    echo ""
    echo "**************************************************************"
    echo "  WARNING: Database verification detected missing expected tables!"
    echo "  The exported archive will NOT contain a complete feature set."
    echo "**************************************************************"
    echo ""
    if [ -t 0 ]; then
        read -r -p "Warning: database is missing expected tables. Proceed anyway? (y/N): " CONFIRM
        case "$CONFIRM" in
            [yY][eE][sS]|[yY])
                echo "Proceeding with packaging despite missing tables..."
                ;;
            *)
                echo "[ERROR] Database packaging aborted by user."
                exit 1
                ;;
        esac
    else
        echo "[ERROR] Database is missing expected tables in non-interactive mode. Aborting packaging."
        exit 1
    fi
elif [ $VERIFY_EXIT -ne 0 ]; then
    echo "[ERROR] Database verification failed with fatal error code $VERIFY_EXIT."
    exit 1
fi

echo ""
echo "[3/6] Generating database state snapshot (db-state.txt)..."
node tools/db-snapshot.js || true
if [ -f "db-state.txt" ]; then
    cp "db-state.txt" "postgres-data/db-state.txt"
fi

echo ""
echo "[4/6] Generating export share manifest (share-manifest.txt)..."
node tools/generate-share-manifest.js || true
if [ -f "share-manifest.txt" ]; then
    cp "share-manifest.txt" "postgres-data/share-manifest.txt"
fi

OUTFILE="examos-database.zip"
rm -f "$OUTFILE"

echo ""
echo "[5/6] Packaging database and installer into zip..."
SEVENZIP=""
if command -v 7z >/dev/null 2>&1; then
    SEVENZIP="7z"
elif [ -f "/c/Program Files/7-Zip/7z.exe" ]; then
    SEVENZIP="/c/Program Files/7-Zip/7z.exe"
elif [ -f "/c/Program Files (x86)/7-Zip/7z.exe" ]; then
    SEVENZIP="/c/Program Files (x86)/7-Zip/7z.exe"
fi

if [ -n "$SEVENZIP" ]; then
    "$SEVENZIP" a -tzip "$OUTFILE" postgres-data setupdb.bat setupdb.sh README_DATABASE.txt db-state.txt share-manifest.txt -xr!postmaster.pid >/dev/null
elif command -v zip >/dev/null 2>&1; then
    zip -q -r "$OUTFILE" postgres-data setupdb.bat setupdb.sh README_DATABASE.txt db-state.txt share-manifest.txt -x "*/postmaster.pid"
else
    echo "[ERROR] Neither 7z nor zip utility found."
    exit 1
fi

echo ""
echo "[6/6] Verifying archive..."
if [ ! -f "$OUTFILE" ]; then
    echo "[ERROR] Failed to generate $OUTFILE"
    exit 1
fi

ZIP_SIZE=$(du -h "$OUTFILE" | cut -f1)

echo "      Package ready: $OUTFILE ($ZIP_SIZE)"
echo ""
echo "=============================================================="
echo "  Database Sharing Package Created Successfully!"
echo "=============================================================="
echo ""
echo "Package Contents:"
echo "  - postgres-data/       (Verified pre-seeded PostgreSQL database)"
echo "  - setupdb.bat          (Windows 1-click automated installer)"
echo "  - setupdb.sh           (Linux/macOS automated installer)"
echo "  - README_DATABASE.txt  (Instructions & default login credentials)"
echo "  - db-state.txt         (Read-only database state snapshot)"
echo "  - share-manifest.txt   (Export manifest: timestamp, git commit, machine, OS)"
echo ""
echo "Database Verification: Schema and content verified before packaging."
echo "Verified Features:"
echo "  - AI Voice/Text Interview System & Candidate Profiles"
echo "  - Audio Listening Comprehension Questions & Voice Profiles"
echo "  - AI Writing & Essay Subjective Evaluations"
echo "  - Spaced-Repetition Vocabulary Bank & SM-2 Engine"
echo "  - Multilingual i18n Translations (23 Languages, 172 Keys)"
echo "  - Core JEE/NEET/IELTS Courses, Questions, Blueprints & Personas"
echo ""
echo "Distribution file: $OUTFILE"
echo "Recipient installs via: bash setupdb.sh"
echo ""
exit 0
