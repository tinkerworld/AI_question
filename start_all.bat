@echo off
echo Cleaning up old processes...
call stop_all.bat

echo.
echo Starting ExamOS Native Stack...
echo 1. Starting Build Tracker UI on Port 3050...
start "ExamOS Build Tracker" cmd /k "cd tools/build-tracker && node server.js"

ping -n 3 127.0.0.1 >nul

echo 2. Starting Express API Server (with PostgreSQL 16 Engine) on Port 4043...
start "ExamOS API Server" cmd /k "cd Exam && set PORT=4043 && npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only apps/api/src/server.ts"

ping -n 3 127.0.0.1 >nul

echo 3. Starting Vite Web Application on Port 3000...
start "ExamOS Web Application" cmd /k "cd Exam/apps/web && npx vite --port 3000 --strictPort --host --force"

echo.
echo ====================================================
echo  ExamOS Full Stack is Live!
echo  Web Application: http://localhost:3000/
echo  API Endpoint:    http://localhost:4043/
echo  Build Tracker:   http://localhost:3050/
echo ====================================================