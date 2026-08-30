@echo off
REM ==============================================================
REM  ExamOS — Export Clean Distribution Package for Friend
REM  Run this from repo root.
REM  Creates a minimal, fresh, zero-secret distribution zip.
REM ==============================================================

setlocal DisableDelayedExpansion

REM --- Locate 7-Zip (prefer 64-bit path) ---
set SEVENZIP=
if exist "C:\Program Files\7-Zip\7z.exe" (
    set "SEVENZIP=C:\Program Files\7-Zip\7z.exe"
) else if exist "C:\Program Files (x86)\7-Zip\7z.exe" (
    set "SEVENZIP=C:\Program Files (x86)\7-Zip\7z.exe"
) else (
    where 7z >nul 2>nul && set SEVENZIP=7z
)

if "%SEVENZIP%"=="" (
    echo.
    echo ERROR: 7-Zip not found. Install from https://www.7-zip.org/ and try again.
    pause
    exit /b 1
)

set OUTFILE=examos.zip
if exist %OUTFILE% del %OUTFILE%

echo ==============================================================
echo   Exporting Clean ExamOS Distribution Package: %OUTFILE%
echo ==============================================================
echo.
echo   Including:
echo     - Full monorepo source (Exam/apps, Exam/packages, docs/)
echo     - Monorepo package manifests and pnpm-lock.yaml
echo     - Database migration and seed pipelines
echo     - Cross-platform installers (install.bat, install.sh)
echo     - Quick Start documentation (SETUP.md, README.md)
echo     - Runtime control scripts (start_all/stop_all for Win/Mac/Linux)
echo.
echo   Strictly Excluding (Privacy, Clean Slate ^& Zero Bloat):
echo     - postgres-data (Fresh database seed on friend's machine)
echo     - .env / .env.* / agyssessionid.txt (Zero leaked secrets)
echo     - node_modules, .turbo, dist, build, .cache, coverage
echo     - .git directory
echo     - Review artifacts, E2E logs, test traces, reports, screenshots
echo     - Existing *.zip archives
echo.

"%SEVENZIP%" a -tzip %OUTFILE% * ^
  -xr!node_modules* ^
  -xr!postgres-data ^
  -xr!.cache ^
  -xr!.prisma ^
  -xr!dist ^
  -xr!.next ^
  -xr!build ^
  -xr!coverage ^
  -xr!.turbo ^
  -xr!.git ^
  -xr!*.db ^
  -xr!*.db-journal ^
  -xr!.env ^
  -xr!.env.local ^
  -xr!.env.*.local ^
  -xr!.env.production ^
  -xr!.env.development ^
  -xr!.env.test ^
  -xr!.env.staging ^
  -xr!agyssessionid.txt ^
  -xr!__pycache__ ^
  -xr!*.pyc ^
  -xr!*.log ^
  -xr!*.tsbuildinfo ^
  -xr!.vscode ^
  -xr!.idea ^
  -xr!Thumbs.db ^
  -xr!.DS_Store ^
  -xr!logs ^
  -xr!reports ^
  -xr!screenshots ^
  -xr!scratch ^
  -xr!review-package.zip ^
  -xr!examos-for-friend.zip ^
  -xr!examos.zip ^
  -xr!*.zip ^
  -xr!git-log.txt ^
  -xr!git-log-oneline.txt ^
  -xr!tree.txt ^
  -xr!lockfile-check.txt ^
  -xr!test-output.txt ^
  -xr!export_proj.bat ^
  -xr!export_proj.sh ^
  -xr!export_for_friend.bat ^
  -xr!Reviewzip.bat ^
  -xr!Reviewzip.sh

echo.
if not exist %OUTFILE% (
    echo ERROR: Failed to create %OUTFILE%.
    pause
    exit /b 1
)

echo ==============================================================
echo   Integrity ^& Security Audit on %OUTFILE%
echo ==============================================================

REM Check postgres-data
"%SEVENZIP%" l %OUTFILE% | findstr /i "postgres-data" >nul
if %ERRORLEVEL% equ 0 (
    echo   [SECURITY ALERT] postgres-data found in zip! Removing...
    "%SEVENZIP%" d %OUTFILE% postgres-data >nul
) else (
    echo   [OK] postgres-data is ABSENT [Zero database leakage]
)

REM Check real .env files
powershell -NoProfile -Command "& { $out = & '%SEVENZIP%' l %OUTFILE%; $bad = $out | Where-Object { $_ -match '\s+\.env$' -or $_ -match '\s+Exam[\\\/]\.env$' }; if ($bad) { exit 1 } else { exit 0 } }"
if %ERRORLEVEL% neq 0 (
    echo   [SECURITY ALERT] .env found in zip! Removing...
    "%SEVENZIP%" d %OUTFILE% *.env >nul
) else (
    echo   [OK] .env files are ABSENT [Zero credentials/keys leaked]
)

echo.
echo ==============================================================
echo   Clean distribution package created successfully:
echo   File: %OUTFILE%
echo ==============================================================
echo.
echo   Ready to send to your friend! They simply:
echo     1. Unzip %OUTFILE%
echo     2. Run install.bat [Windows] or bash install.sh [macOS/Linux]
echo     3. Run start_all.bat [Windows] or bash start_all.sh [macOS/Linux]
echo.
if "%~1"=="" pause
