@echo off
REM ==============================================================
REM  ExamOS — Standalone Database Reset & Seeding
REM  Run this from the repo root (folder containing docs\, Exam\, tools\)
REM
REM  Wipes the PostgreSQL 16 database, applies fresh schema DDL
REM  migrations, and seeds baseline data (Courses, Question Bank,
REM  Exams, AI Models, Personas).
REM ==============================================================

setlocal enabledelayedexpansion

echo ====================================================
echo   ExamOS Database Reset ^& Baseline Seeding
echo ====================================================
echo.

set WAS_RUNNING=0
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$api = Test-NetConnection -ComputerName localhost -Port 4043 -WarningAction SilentlyContinue; " ^
  "if ($api.TcpTestSucceeded) { exit 1 } else { exit 0 }"

if %ERRORLEVEL% equ 1 (
    set WAS_RUNNING=1
    echo Stopping running services for clean database reset...
    call stop_all.bat >nul 2>&1
)

REM --- 1. Migrate Database Schema ---
echo [1/2] Initializing embedded PostgreSQL 16 database and running migrations...
pushd Exam
call node packages/database/prisma/migrate-postgres.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database schema migration failed.
    popd
    if "%~1"=="" pause
    exit /b 1
)

REM --- 2. Seed Baseline Data ---
echo.
echo [2/2] Seeding baseline data (Courses, Question Bank, Exams, AI Models, Personas)...
call npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json packages/database/prisma/seed.ts
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Database seeding failed.
    popd
    if "%~1"=="" pause
    exit /b 1
)
popd

if %WAS_RUNNING% equ 1 (
    echo.
    echo Restarting ExamOS stack with fresh database...
    call start_all.bat
)

echo.
echo ====================================================
echo   Database Reset ^& Seeding Completed Successfully!
echo ====================================================
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

if "%~1"=="" pause
exit /b 0
