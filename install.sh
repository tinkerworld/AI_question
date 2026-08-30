#!/usr/bin/env bash
set -e

echo "===================================================="
echo "   ExamOS Automated Installer (macOS / Linux)"
echo "===================================================="
echo ""

# --- 1. Check Node.js ---
echo "[1/5] Checking Node.js environment..."
if ! command -v node >/dev/null 2>&1; then
    echo ""
    echo "[ERROR] Node.js is not installed or not in your PATH."
    echo "Please download and install Node.js (v18.0.0 or higher) from:"
    echo "https://nodejs.org/"
    echo ""
    exit 1
fi
NODE_VER=$(node -v)
echo "      Found Node.js ${NODE_VER}"

# --- 2. Check pnpm ---
echo "[2/5] Checking pnpm package manager..."
if ! command -v pnpm >/dev/null 2>&1; then
    echo "      pnpm not found. Attempting global install via npm..."
    npm install -g pnpm || {
        echo ""
        echo "[ERROR] Failed to install pnpm automatically."
        echo "Please install pnpm manually by running:"
        echo "  npm install -g pnpm"
        echo "Or visit: https://pnpm.io/installation"
        echo ""
        exit 1
    }
fi
PNPM_VER=$(pnpm -v)
echo "      Found pnpm v${PNPM_VER}"

DEFAULT_API_PORT=4043

# --- 3. Setup environment configuration ---
echo "[3/5] Setting up local environment configuration..."
if [ ! -f "Exam/.env" ]; then
    if [ -f "Exam/.env.example" ]; then
        cp "Exam/.env.example" "Exam/.env"
        echo "      Created Exam/.env from template."
    else
        cat <<EOF > Exam/.env
DATABASE_URL="postgresql://examos:examos_password@localhost:5432/examos_db?schema=public"
JWT_SECRET="examos_super_secret_jwt_key_2026_production"
JWT_REFRESH_SECRET="examos_super_secret_refresh_jwt_key_2026_production"
PORT=${DEFAULT_API_PORT}
EOF
        echo "      Created default Exam/.env configuration."
    fi
else
    echo "      Exam/.env already exists."
fi

# --- 4. Install Monorepo Dependencies ---
echo "[4/5] Installing project dependencies with pnpm..."
(
    cd Exam
    pnpm install
)
echo "      Dependencies installed successfully!"

# --- 5. Migrate & Seed Database ---
echo "[5/5] Initializing embedded PostgreSQL 16 database and running migrations..."
(
    cd Exam
    node packages/database/prisma/migrate-postgres.js
    echo "      Seeding baseline data (Courses, Question Bank, Exams, AI Models, Personas)..."
    npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json packages/database/prisma/seed.ts
)

echo ""
echo "===================================================="
echo "   ExamOS Installation Completed Successfully!"
echo "===================================================="
echo ""
echo "   To launch ExamOS, simply run:"
echo "     bash start_all.sh"
echo ""
echo "   To stop all services when done:"
echo "     bash stop_all.sh"
echo ""
echo "   Service Endpoints:"
echo "     - Web Application: http://localhost:3000"
echo "     - API Server:      http://localhost:${DEFAULT_API_PORT}"
echo "     - Build Tracker:   http://localhost:3050"
echo ""
echo "   Seeded Login Credentials:"
echo "     - Main Admin:   admin@examos.com    / Admin@123"
echo "     - Sub-Admin:    subadmin@examos.com / SubAdmin@123"
echo "     - Teacher:      teacher@examos.com  / Teacher@123"
echo "     - Student 1:    student@examos.com  / Student@123"
echo "     - Student 2:    student2@examos.com / Student2@123"
echo ""
echo "===================================================="
