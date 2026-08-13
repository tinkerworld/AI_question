@echo off
echo Starting ExamOS Native Stack...
echo 1. Starting PostgreSQL 16 Engine on Port 5432...
start "PostgreSQL 16 Engine" node tools/postgres-server.js

echo 2. Starting Express API Server on Port 4000...
start "ExamOS API Server" cmd /k "cd Exam && npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only apps/api/src/server.ts"

echo 3. Starting Vite Web Application on Port 3000...
start "ExamOS Web Application" cmd /k "cd Exam/apps/web && npx vite --port 3000 --strictPort --host"

echo ====================================================
echo  ExamOS is live!
echo  Web Application: http://localhost:3000/
echo  API Endpoint:    http://localhost:4000/
echo ====================================================