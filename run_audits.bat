@echo off
REM ==============================================================
REM  ExamOS — Python Persona Profile Auditor Runner
REM  Run this after start_all.bat, once the full stack is live.
REM ==============================================================

setlocal enabledelayedexpansion

set AUDITDIR=%~dp0tools\profile-auditor

echo Checking that the API server is actually running on port 4043...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$api = Test-NetConnection -ComputerName localhost -Port 4043 -WarningAction SilentlyContinue; " ^
  "if (-not $api.TcpTestSucceeded) { " ^
  "  Write-Host 'ERROR: API Server (Port 4043) is not responding. Run start_all.bat first.' -ForegroundColor Red; " ^
  "  exit 1 " ^
  "}"

if errorlevel 1 (
    if "%~1"=="" pause
    exit /b 1
)

pushd "%AUDITDIR%"
python run_all.py %*
set AUDITEXIT=%ERRORLEVEL%
popd

echo.
if "%~1"=="" pause
exit /b %AUDITEXIT%
