#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.pids/tunnel.pid"

echo "Stopping Cloudflare Tunnel for ExamOS..."

if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo "  Stopping tunnel process $pid..."
        kill "$pid" 2>/dev/null || true
        sleep 1
        kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
fi

# Clean up any lingering cloudflared processes pointing to this deployment
pkill -f "cloudflared.*localhost:3002" 2>/dev/null || true

echo "===================================================="
echo " Cloudflare Tunnel has been stopped."
echo "===================================================="
