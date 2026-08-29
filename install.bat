@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo   ExamOS Automated Installer (Windows)
echo ====================================================
echo.

REM --- 1. Check Node.js ---
echo [1/5] Checking Node.js environment...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please download and install Node.js ^(v18.0.0 or higher^) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo       Found Node.js %NODE_VER%

REM --- 2. Check pnpm ---
echo [2/5] Checking pnpm package manager...
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo       pnpm not found. Attempting global install via npm...
    call npm install -g pnpm
    if !ERRORLEVEL! neq 0 (
        echo.
        echo [ERROR] Failed to install pnpm automatically.
        echo Please install pnpm manually by running:
        echo   npm install -g pnpm
        echo Or visit: https://pnpm.io/installation
        echo.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('pnpm -v') do set PNPM_VER=%%v
echo       Found pnpm v%PNPM_VER%

REM --- 3. Setup environment configuration ---
echo [3/5] Setting up local environment configuration...
if not exist "Exam\.env" (
    if exist "Exam\.env.example" (
        copy "Exam\.env.example" "Exam\.env" >nul
        echo       Created Exam\.env from template.
    ) else (
        (
            echo DATABASE_URL="postgresql://examos:examos_password@localhost:5432/examos_db?schema=public"
            echo JWT_SECRET="examos_super_secret_jwt_key_2026_production"
            echo JWT_REFRESH_SECRET="examos_super_secret_refresh_jwt_key_2026_production"
            echo PORT=4000
        ) > "Exam\.env"
        echo       Created default Exam\.env configuration.
    )
) else (
    echo       Exam\.env already exists.
)

REM --- 4. Install Monorepo Dependencies ---
echo [4/5] Installing project dependencies with pnpm...
pushd Exam
call pnpm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] pnpm install encountered errors.
    popd
    pause
    exit /b 1
)
popd
echo       Dependencies installed successfully!

REM --- 5. Migrate & Seed Database ---
echo [5/5] Initializing embedded PostgreSQL 16 database and running migrations...
pushd Exam
call node packages/database/prisma/migrate-postgres.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database schema migration failed.
    popd
    pause
    exit /b 1
)

echo       Seeding baseline data (Courses, Question Bank, Exams, AI Models, Personas)...
call npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json packages/database/prisma/seed.ts
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database seeding failed.
    popd
    pause
    exit /b 1
)
popd

echo.
echo ====================================================
echo   ExamOS Installation Completed Successfully!
echo ====================================================
echo.
echo   To launch ExamOS, simply run:
echo     start_all.bat
echo.
echo   To stop all services when done:
echo     stop_all.bat
echo.
echo   Service Endpoints:
echo     - Web Application: http://localhost:3000
echo     - API Server:      http://localhost:4000
echo     - Build Tracker:   http://localhost:3050
echo.
echo   Seeded Login Credentials:
echo     - Main Admin:   admin@examos.com    / Admin@123
echo     - Sub-Admin:    subadmin@examos.com / SubAdmin@123
echo     - Teacher:      teacher@examos.com  / Teacher@123
echo     - Student 1:    student@examos.com  / Student@123
echo     - Student 2:    student2@examos.com / Student2@123
echo.
echo ====================================================
echo.
pause
