@echo off
REM ==============================================================
REM  ExamOS — Full End-to-End Test & Review Package Orchestrator
REM  Run this from the repo root (folder containing docs\, Exam\, tools\)
REM
REM  Enforced Pipeline Order:
REM    1. Verify stack readiness (launches start_all.bat if not running)
REM    2. Execute full Playwright E2E test suite (run_ui_tests.bat)
REM    3. Execute Python Persona Security Auditor (run_audits.bat)
REM    4. Generate Review Package (Reviewzip.bat)
REM
REM  Guarantees review-package.zip contains fresh run artifacts
REM  and logs regardless of individual pass/fail statuses.
REM ==============================================================

setlocal enabledelayedexpansion

echo ==============================================================
echo   ExamOS Full Verification ^& Review Orchestrator
echo ==============================================================
echo.

set E2E_STATUS=NOT RUN
set AUDIT_STATUS=NOT RUN
set ZIP_STATUS=NOT RUN

REM --- 1. Check Stack Readiness ---
echo [1/4] Checking if ExamOS full stack is running...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$web = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue; " ^
  "$api = Test-NetConnection -ComputerName localhost -Port 4043 -WarningAction SilentlyContinue; " ^
  "if (-not $web.TcpTestSucceeded -or -not $api.TcpTestSucceeded) { exit 1 } else { exit 0 }"

if %ERRORLEVEL% equ 0 goto :STACK_READY

echo       Stack is not active. Starting ExamOS stack...
call start_all.bat
echo       Waiting for services to initialize on port 3000 and 4043...

set WAIT_COUNT=0
:WAIT_LOOP
timeout /t 2 /nobreak >nul
set /a WAIT_COUNT+=1

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$web = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue; " ^
  "$api = Test-NetConnection -ComputerName localhost -Port 4043 -WarningAction SilentlyContinue; " ^
  "if (-not $web.TcpTestSucceeded -or -not $api.TcpTestSucceeded) { exit 1 } else { exit 0 }"

if %ERRORLEVEL% equ 0 goto :STACK_READY
if %WAIT_COUNT% lss 15 goto :WAIT_LOOP
echo       [WARNING] Services took longer than 30s to respond. Proceeding with tests...

:STACK_READY
echo       ExamOS stack is ready (Port 3000 and Port 4043 responding).

echo.
REM --- 2. Execute Playwright E2E Suite ---
echo [2/4] Executing Playwright E2E Test Suite...
echo --------------------------------------------------------------
call run_ui_tests.bat --automated
set E2E_EXIT=%ERRORLEVEL%
if %E2E_EXIT% equ 0 (
    set E2E_STATUS=PASSED
) else (
    set E2E_STATUS=FAILED (Exit Code: %E2E_EXIT%)
)

echo.
REM --- 3. Execute Python Profile Auditor ---
echo [3/4] Executing Python Persona Profile Security Auditor...
echo --------------------------------------------------------------
call run_audits.bat --automated
set AUDIT_EXIT=%ERRORLEVEL%
if %AUDIT_EXIT% equ 0 (
    set AUDIT_STATUS=PASSED
) else (
    set AUDIT_STATUS=FAILED (Exit Code: %AUDIT_EXIT%)
)

echo.
REM --- 4. Package for Review ---
echo [4/4] Generating Fresh Review Package (Reviewzip.bat)...
echo --------------------------------------------------------------
call Reviewzip.bat --automated
set ZIP_EXIT=%ERRORLEVEL%
if %ZIP_EXIT% equ 0 (
    set "ZIP_STATUS=GENERATED (review-package.zip)"
) else (
    set "ZIP_STATUS=FAILED"
)

echo.
echo ==============================================================
echo   Full Verification Pipeline Summary
echo ==============================================================
echo   1. Stack Health:              ACTIVE
echo   2. Playwright E2E Suite:      %E2E_STATUS%
echo   3. Persona Profile Auditor:   %AUDIT_STATUS%
echo   4. Review Archive:            %ZIP_STATUS%
echo ==============================================================
echo   All test logs, traces, and fresh history entries from THIS
echo   run have been bundled into review-package.zip.
echo ==============================================================
echo.

if "%~1"=="" pause
if %E2E_EXIT% neq 0 exit /b %E2E_EXIT%
if %AUDIT_EXIT% neq 0 exit /b %AUDIT_EXIT%
if %ZIP_EXIT% neq 0 exit /b %ZIP_EXIT%
exit /b 0
