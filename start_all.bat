@echo off
echo Cleaning up old processes...
call stop_all.bat

echo.
echo Starting ExamOS Native Stack...
echo 1. Starting PostgreSQL 16 Engine on Port 5432...
start "PostgreSQL 16 Engine" node tools/postgres-server.js

timeout /t 2 /nobreak >nul

echo 2. Starting Build Tracker UI on Port 3050...
start "ExamOS Build Tracker" cmd /k "cd tools/build-tracker && node server.js"

timeout /t 2 /nobreak >nul

echo 3. Starting Express API Server on Port 4000...
start "ExamOS API Server" cmd /k "cd Exam && npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only apps/api/src/server.ts"

timeout /t 2 /nobreak >nul

echo 4. Starting Vite Web Application on Port 3000...
start "ExamOS Web Application" cmd /k "cd Exam/apps/web && npx vite --port 3000 --strictPort --host --force"

echo.
echo ====================================================
echo  ExamOS Full Stack is Live!
echo  Web Application: http://localhost:3000/
echo  API Endpoint:    http://localhost:4000/
echo  Build Tracker:   http://localhost:3050/
echo ====================================================