@echo off
REM ==============================================================
REM  ExamOS ? Canonical Backend Test Runner
REM  Runs all 20 tests/phase-*.test.js test suites.
REM ==============================================================

setlocal enabledelayedexpansion

echo Checking that ExamOS API server is responding on port 4043...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$api = Test-NetConnection -ComputerName localhost -Port 4043 -WarningAction SilentlyContinue; " ^
  "if (-not $api.TcpTestSucceeded) { " ^
  "  Write-Host 'ERROR: ExamOS API server (port 4043) is not responding.' -ForegroundColor Red; " ^
  "  Write-Host 'Please start the server first by running start_all.bat (or start_examos.bat).' -ForegroundColor Yellow; " ^
  "  exit 1 " ^
  "}"

if errorlevel 1 (
    if "%~1"=="" pause
    exit /b 1
)

node "%~dp0tools\backend-tester\run_backend_tests.js" %*
set TESTEXIT=%ERRORLEVEL%

if %TESTEXIT% neq 0 (
    echo.
    echo [FAILURE] One or more backend test suites failed.
    exit /b %TESTEXIT%
)

echo.
echo [SUCCESS] All backend test suites passed.
exit /b 0
