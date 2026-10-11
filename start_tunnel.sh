#!/usr/bin/env bash

# Resolve project root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOGS_DIR="$ROOT_DIR/logs"
PORTS_FILE="$ROOT_DIR/.ports.env"

mkdir -p "$PID_DIR" "$LOGS_DIR"

# 1. Determine Web Port
WEB_PORT=3002
if [ -f "$PORTS_FILE" ]; then
    source "$PORTS_FILE" 2>/dev/null || true
fi

# 2. Check if local web service is active
if ! curl -s "http://localhost:$WEB_PORT/" >/dev/null 2>&1; then
    echo "[INFO] ExamOS web service is not running on port $WEB_PORT."
    echo "       Starting ExamOS stack first..."
    bash "$ROOT_DIR/start_all.sh"
fi

# Stop previous tunnel if running
if [ -f "$PID_DIR/tunnel.pid" ]; then
    old_pid=$(cat "$PID_DIR/tunnel.pid" 2>/dev/null || true)
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
        kill "$old_pid" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$PID_DIR/tunnel.pid"
fi

echo ""
echo "===================================================="
echo "  Starting Cloudflare Tunnel for ExamOS..."
echo "  Target: http://localhost:$WEB_PORT"
echo "===================================================="

# Check if custom hostname or named tunnel config is passed as $1
TUNNEL_LOG="$LOGS_DIR/tunnel.log"
rm -f "$TUNNEL_LOG"

if [ -n "$1" ] && [ -f "$1" ]; then
    echo "Starting tunnel using configuration file: $1..."
    (setsid cloudflared tunnel --config "$1" run > "$TUNNEL_LOG" 2>&1 & echo $! > "$PID_DIR/tunnel.pid")
else
    echo "Starting instant Cloudflare Quick Tunnel (trycloudflare.com)..."
    (setsid cloudflared --config /dev/null tunnel --url "http://localhost:$WEB_PORT" > "$TUNNEL_LOG" 2>&1 & echo $! > "$PID_DIR/tunnel.pid")
fi

echo "Waiting for Cloudflare Tunnel URL to be generated..."
PUBLIC_URL=""
for i in {1..20}; do
    if [ -f "$TUNNEL_LOG" ]; then
        PUBLIC_URL=$(grep -o 'https://[-a-zA-Z0-9.]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -n 1)
        if [ -n "$PUBLIC_URL" ]; then
            break
        fi
    fi
    sleep 1
done

echo ""
echo "===================================================="
if [ -n "$PUBLIC_URL" ]; then
    echo "  🎉 Cloudflare Tunnel is LIVE!"
    echo ""
    echo "  Public URL: $PUBLIC_URL"
    echo ""
    echo "  Local Web:  http://localhost:$WEB_PORT/"
    echo "  Logs:       $TUNNEL_LOG"
    echo ""
    echo "  To stop the tunnel: bash stop_tunnel.sh"
else
    echo "  [NOTICE] Tunnel started in background."
    echo "  Check log for details: $TUNNEL_LOG"
fi
echo "===================================================="
