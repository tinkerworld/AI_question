#!/usr/bin/env bash

echo "Cleaning up old processes..."
bash stop_all.sh >/dev/null 2>&1 || true

echo ""
echo "Starting ExamOS Native Stack..."

# 1. Start Build Tracker UI on Port 3050
if [ -d "tools/build-tracker" ]; then
    echo "1. Starting Build Tracker UI on Port 3050..."
    (cd tools/build-tracker && nohup node server.js </dev/null > /tmp/examos-tracker.log 2>&1 &)
fi

sleep 1

# 2. Start Express API Server on Port 4043
echo "2. Starting Express API Server (with PostgreSQL Engine) on Port 4043..."
(cd Exam && PORT=4043 nohup npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only apps/api/src/server.ts </dev/null > /tmp/examos-api.log 2>&1 &)

sleep 2

# 3. Start Vite Web Application on Port 3000
echo "3. Starting Vite Web Application on Port 3000..."
(cd Exam/apps/web && nohup npx vite --port 3000 --strictPort --host </dev/null > /tmp/examos-web.log 2>&1 &)

disown -a 2>/dev/null || true

echo ""
echo "===================================================="
echo "  ExamOS Full Stack is Live!"
echo "  Web Application: http://localhost:3000/"
echo "  API Endpoint:    http://localhost:4043/"
echo "  Build Tracker:   http://localhost:3050/"
echo "===================================================="
echo "  To stop all services: bash stop_all.sh"
