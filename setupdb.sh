#!/usr/bin/env bash
# ==============================================================
#  ExamOS — Automated Database Installer & Restorer (setupdb.sh)
#  Installs or restores the pre-configured PostgreSQL (PGlite)
#  database into your ExamOS installation on Linux/macOS.
# ==============================================================

set -e

echo "===================================================="
echo "  ExamOS Database Setup & Installer (Unix)"
echo "===================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Locate Source postgres-data
SRC_DATA=""
if [ -f "$SCRIPT_DIR/postgres-data/PG_VERSION" ]; then
    SRC_DATA="$SCRIPT_DIR/postgres-data"
elif [ -f "$(pwd)/postgres-data/PG_VERSION" ]; then
    SRC_DATA="$(pwd)/postgres-data"
elif [ -f "$SCRIPT_DIR/examos-database.zip" ]; then
    echo "[INFO] Found examos-database.zip. Extracting database..."
    unzip -q -o "$SCRIPT_DIR/examos-database.zip" -d "$SCRIPT_DIR"
    if [ -f "$SCRIPT_DIR/postgres-data/PG_VERSION" ]; then
        SRC_DATA="$SCRIPT_DIR/postgres-data"
    fi
elif [ -f "$SCRIPT_DIR/database.zip" ]; then
    echo "[INFO] Found database.zip. Extracting database..."
    unzip -q -o "$SCRIPT_DIR/database.zip" -d "$SCRIPT_DIR"
    if [ -f "$SCRIPT_DIR/postgres-data/PG_VERSION" ]; then
        SRC_DATA="$SCRIPT_DIR/postgres-data"
    fi
fi

if [ -z "$SRC_DATA" ]; then
    echo "[ERROR] Could not find source 'postgres-data' directory or database zip package."
    echo "Please ensure postgres-data or examos-database.zip is in $SCRIPT_DIR"
    exit 1
fi

# 2. Locate Target ExamOS Directory
TARGET_DIR=""
if [ -n "$1" ] && [ -f "$1/start_all.sh" ]; then
    TARGET_DIR="$(cd "$1" && pwd)"
elif [ -f "$(pwd)/start_all.sh" ]; then
    TARGET_DIR="$(pwd)"
elif [ -f "$SCRIPT_DIR/start_all.sh" ]; then
    TARGET_DIR="$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/../start_all.sh" ]; then
    TARGET_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    read -rp "Please enter the path to your ExamOS project root: " TARGET_DIR
    if [ ! -f "$TARGET_DIR/start_all.sh" ] && [ ! -f "$TARGET_DIR/ExamOS-Build-Directive.md" ]; then
        echo "[ERROR] Invalid ExamOS directory: $TARGET_DIR"
        exit 1
    fi
fi

echo "[1/4] Target ExamOS Directory: $TARGET_DIR"
echo "      Source Database:        $SRC_DATA"
echo ""

# 3. Stop running services if active
echo "[2/4] Checking for active ExamOS processes..."
if [ -f "$TARGET_DIR/stop_all.sh" ]; then
    bash "$TARGET_DIR/stop_all.sh" >/dev/null 2>&1 || true
fi

# 4. Backup Existing Database (if present and different from source)
echo "[3/4] Preparing database directory in target..."
DEST_DATA="$TARGET_DIR/postgres-data"

if [ "$(cd "$SRC_DATA" && pwd)" = "$(cd "$DEST_DATA" 2>/dev/null && pwd)" ]; then
    echo "      Source and target database path are identical ($DEST_DATA)."
else
    if [ -d "$DEST_DATA" ]; then
        TS="$(date +%Y%m%d_%H%M%S)"
        BACKUP_DIR="$TARGET_DIR/postgres-data_backup_$TS"
        echo "      Backing up existing database to: $BACKUP_DIR"
        mv "$DEST_DATA" "$BACKUP_DIR"
    fi

    echo "      Installing fresh database files into $DEST_DATA..."
    mkdir -p "$DEST_DATA"
    cp -R "$SRC_DATA/"* "$DEST_DATA/"
fi

# Clean up any stale postmaster.pid
rm -f "$DEST_DATA/postmaster.pid"

# 5. Verify Database Integrity
echo "[4/4] Verifying database integrity..."
if [ ! -f "$DEST_DATA/PG_VERSION" ]; then
    echo "[ERROR] Verification failed: $DEST_DATA/PG_VERSION is missing!"
    exit 1
fi
if [ ! -d "$DEST_DATA/global" ]; then
    echo "[ERROR] Verification failed: $DEST_DATA/global directory is missing!"
    exit 1
fi
if [ ! -d "$DEST_DATA/base" ]; then
    echo "[ERROR] Verification failed: $DEST_DATA/base directory is missing!"
    exit 1
fi

echo "      Database structure verified successfully!"
echo ""
echo "===================================================="
echo "  Database Installation Completed Successfully!"
echo "===================================================="
echo ""
echo "  Seeded Login Credentials:"
echo "    - Main Admin:   admin@examos.com    / Admin@123"
echo "    - Sub-Admin:    subadmin@examos.com / SubAdmin@123"
echo "    - Teacher:      teacher@examos.com  / Teacher@123"
echo "    - Student 1:    student@examos.com  / Student@123"
echo "    - Student 2:    student2@examos.com / Student2@123"
echo ""
echo "  Included Data:"
echo "    - Courses: JEE, NEET, IELTS"
echo "    - Full Question Bank & Exam Patterns"
echo "    - Subscriptions, Entitlements & AI Stack"
echo ""
echo "===================================================="
echo ""
echo "You can start ExamOS at any time by running:"
echo "  bash $TARGET_DIR/start_all.sh"
echo ""
exit 0
