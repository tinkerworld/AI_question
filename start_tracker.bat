@echo off
REM ==============================================================
REM  ExamOS Build Tracker — Start Script
REM ==============================================================

echo.
echo Starting Build Tracker...
echo   Tracker: http://localhost:3050
echo.

cd /d "%~dp0tools\build-tracker"
node server.js

pause