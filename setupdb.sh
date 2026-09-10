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
TEMP_EXTRACT=""
if [ -n "$1" ] && [[ "$1" == *.zip ]] && [ -f "$1" ]; then
    echo "[INFO] Found database package $1. Extracting to staging..."
    TEMP_EXTRACT="$SCRIPT_DIR/_db_staging_$$"
    mkdir -p "$TEMP_EXTRACT"
    unzip -q -o "$1" -d "$TEMP_EXTRACT"
    if [ -f "$TEMP_EXTRACT/postgres-data/PG_VERSION" ]; then
        SRC_DATA="$TEMP_EXTRACT/postgres-data"
    elif [ -f "$TEMP_EXTRACT/PG_VERSION" ]; then
        SRC_DATA="$TEMP_EXTRACT"
    fi
elif [ -n "$1" ] && [ ! -f "$1/start_all.sh" ] && [ ! -f "$1/start_all.bat" ] && [ ! -f "$1/ExamOS-Build-Directive.md" ]; then
    if [ -f "$1/postgres-data/PG_VERSION" ]; then
        SRC_DATA="$1/postgres-data"
    elif [ -f "$1/PG_VERSION" ]; then
        SRC_DATA="$1"
    fi
fi

if [ -z "$SRC_DATA" ]; then
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
    elif [ -f "$(pwd)/examos-database.zip" ]; then
        echo "[INFO] Found examos-database.zip in current directory. Extracting database..."
        unzip -q -o "$(pwd)/examos-database.zip" -d "$(pwd)"
        if [ -f "$(pwd)/postgres-data/PG_VERSION" ]; then
            SRC_DATA="$(pwd)/postgres-data"
        fi
    fi
fi

if [ -z "$SRC_DATA" ]; then
    echo "[ERROR] Could not find source 'postgres-data' directory or database zip package."
    echo "Please ensure postgres-data or examos-database.zip is in $SCRIPT_DIR"
    exit 1
fi

# 2. Locate Target ExamOS Directory
TARGET_DIR=""
if [ -n "$1" ] && { [ -f "$1/start_all.sh" ] || [ -f "$1/start_all.bat" ] || [ -f "$1/ExamOS-Build-Directive.md" ]; }; then
    TARGET_DIR="$(cd "$1" && pwd)"
elif [ -n "$2" ] && { [ -f "$2/start_all.sh" ] || [ -f "$2/start_all.bat" ] || [ -f "$2/ExamOS-Build-Directive.md" ]; }; then
    TARGET_DIR="$(cd "$2" && pwd)"
elif [ -f "$(pwd)/start_all.sh" ] || [ -f "$(pwd)/start_all.bat" ] || [ -f "$(pwd)/ExamOS-Build-Directive.md" ]; then
    TARGET_DIR="$(pwd)"
elif [ -f "$SCRIPT_DIR/start_all.sh" ] || [ -f "$SCRIPT_DIR/start_all.bat" ] || [ -f "$SCRIPT_DIR/ExamOS-Build-Directive.md" ]; then
    TARGET_DIR="$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/../start_all.sh" ] || [ -f "$SCRIPT_DIR/../start_all.bat" ] || [ -f "$SCRIPT_DIR/../ExamOS-Build-Directive.md" ]; then
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
    # Check for stale export overwrite (compare OLD vs NEW share-manifest.txt)
    OLD_MANIFEST=""
    if [ -f "$DEST_DATA/share-manifest.txt" ]; then
        OLD_MANIFEST="$DEST_DATA/share-manifest.txt"
    elif [ -f "$TARGET_DIR/share-manifest.txt" ]; then
        OLD_MANIFEST="$TARGET_DIR/share-manifest.txt"
    fi

    NEW_MANIFEST=""
    if [ -f "$SRC_DATA/share-manifest.txt" ]; then
        NEW_MANIFEST="$SRC_DATA/share-manifest.txt"
    elif [ -f "$SCRIPT_DIR/share-manifest.txt" ]; then
        NEW_MANIFEST="$SCRIPT_DIR/share-manifest.txt"
    fi

    if [ -n "$OLD_MANIFEST" ] && [ -n "$NEW_MANIFEST" ]; then
        OLD_TS=$(grep -E "^EXPORT_TIMESTAMP=" "$OLD_MANIFEST" | cut -d'=' -f2- | tr -d '\r')
        NEW_TS=$(grep -E "^EXPORT_TIMESTAMP=" "$NEW_MANIFEST" | cut -d'=' -f2- | tr -d '\r')

        if [ -n "$OLD_TS" ] && [ -n "$NEW_TS" ]; then
            IS_STALE=$(node -e "try { console.log(new Date('$NEW_TS').getTime() < new Date('$OLD_TS').getTime() ? '1' : '0'); } catch(e) { console.log('0'); }")
            if [ "$IS_STALE" = "1" ]; then
                echo ""
                echo "**************************************************************"
                echo "  WARNING: STALE DATABASE OVERWRITE DETECTED!"
                echo "  You are about to overwrite a newer local database [$OLD_TS]"
                echo "  with an older shared export [$NEW_TS]."
                echo "**************************************************************"
                echo ""
                if [ -t 0 ]; then
                    read -r -p "Warning: incoming database export is older than current local database. Proceed anyway? (y/N): " CONFIRM
                    case "$CONFIRM" in
                        [yY][eE][sS]|[yY])
                            echo "Proceeding with installation of older database as confirmed..."
                            ;;
                        *)
                            echo "[ERROR] Database installation aborted by user to protect newer local database."
                            [ -n "$TEMP_EXTRACT" ] && [ -d "$TEMP_EXTRACT" ] && rm -rf "$TEMP_EXTRACT"
                            exit 1
                            ;;
                    esac
                else
                    echo "[ERROR] Incoming database export is older than current local database in non-interactive mode. Aborting."
                    [ -n "$TEMP_EXTRACT" ] && [ -d "$TEMP_EXTRACT" ] && rm -rf "$TEMP_EXTRACT"
                    exit 1
                fi
            fi
        fi
    fi

    if [ -d "$DEST_DATA" ]; then
        TS="$(date +%Y%m%d_%H%M%S)"
        BACKUP_DIR="$TARGET_DIR/postgres-data_backup_$TS"
        echo "      Backing up existing database to: $BACKUP_DIR"
        mv "$DEST_DATA" "$BACKUP_DIR"
    fi

    echo "      Installing fresh database files into $DEST_DATA..."
    mkdir -p "$DEST_DATA"
    cp -R "$SRC_DATA/"* "$DEST_DATA/"

    # Copy manifest and state snapshot files into destination
    if [ -f "$SCRIPT_DIR/share-manifest.txt" ]; then cp "$SCRIPT_DIR/share-manifest.txt" "$DEST_DATA/share-manifest.txt"; fi
    if [ -f "$SCRIPT_DIR/db-state.txt" ]; then cp "$SCRIPT_DIR/db-state.txt" "$DEST_DATA/db-state.txt"; fi
    if [ -f "$SRC_DATA/share-manifest.txt" ]; then cp "$SRC_DATA/share-manifest.txt" "$DEST_DATA/share-manifest.txt"; fi
    if [ -f "$SRC_DATA/db-state.txt" ]; then cp "$SRC_DATA/db-state.txt" "$DEST_DATA/db-state.txt"; fi
    if [ -f "$DEST_DATA/share-manifest.txt" ]; then cp "$DEST_DATA/share-manifest.txt" "$TARGET_DIR/share-manifest.txt"; fi
    if [ -f "$DEST_DATA/db-state.txt" ]; then cp "$DEST_DATA/db-state.txt" "$TARGET_DIR/db-state.txt"; fi

    [ -n "$TEMP_EXTRACT" ] && [ -d "$TEMP_EXTRACT" ] && rm -rf "$TEMP_EXTRACT"
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
echo "===================================================="
echo "  Installed Database Manifest"
echo "===================================================="
if [ -f "$DEST_DATA/share-manifest.txt" ]; then
    cat "$DEST_DATA/share-manifest.txt"
elif [ -f "$TARGET_DIR/share-manifest.txt" ]; then
    cat "$TARGET_DIR/share-manifest.txt"
else
    echo "  [Note: share-manifest.txt not present in package]"
fi
echo ""
echo "----------------------------------------------------"
echo "  Installed Database State Summary (db-state.txt)"
echo "----------------------------------------------------"
DB_STATE_FILE=""
if [ -f "$DEST_DATA/db-state.txt" ]; then
    DB_STATE_FILE="$DEST_DATA/db-state.txt"
elif [ -f "$TARGET_DIR/db-state.txt" ]; then
    DB_STATE_FILE="$TARGET_DIR/db-state.txt"
fi

if [ -n "$DB_STATE_FILE" ]; then
    grep -E "^\[LANGUAGES\]|\[TRANSLATION KEYS\]|^\[TRANSLATIONS BY LANGUAGE\]|^\[PERMISSIONS\]" "$DB_STATE_FILE" | sed 's/^/  /'
else
    echo "  [Note: db-state.txt not present in package]"
fi
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
