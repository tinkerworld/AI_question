#!/usr/bin/env bash

# Resolve project root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Cleaning up old processes..."
bash "$ROOT_DIR/stop_all.sh" >/dev/null 2>&1 || true

echo ""
echo "Starting ExamOS Native Stack..."

# 1. Start Build Tracker UI on Port 3050
if [ -d "$ROOT_DIR/tools/build-tracker" ]; then
    echo "1. Starting Build Tracker UI on Port 3050..."
    (cd "$ROOT_DIR/tools/build-tracker" && setsid node server.js > /tmp/examos-tracker.log 2>&1 &)
fi

sleep 1

# 2. Start Express API Server on Port 4043
echo "2. Starting Express API Server (with PostgreSQL Engine) on Port 4043..."
(cd "$ROOT_DIR/Exam" && PORT=4043 setsid npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only apps/api/src/server.ts > /tmp/examos-api.log 2>&1 &)

sleep 2

# 3. Start Vite Web Application on Port 3000
echo "3. Starting Vite Web Application on Port 3000..."
(cd "$ROOT_DIR/Exam/apps/web" && setsid npx vite --port 3000 --strictPort --host > /tmp/examos-web.log 2>&1 &)

sleep 1

echo ""
echo "===================================================="
echo "  ExamOS Full Stack is Live!"
echo "  Web Application: http://localhost:3000/"
echo "  API Endpoint:    http://localhost:4043/"
echo "  Build Tracker:   http://localhost:3050/"
echo "===================================================="
echo "  To stop all services: bash stop_all.sh"
