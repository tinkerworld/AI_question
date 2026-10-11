#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
PORTS_FILE="$ROOT_DIR/.ports.env"

echo "Stopping ExamOS services for $ROOT_DIR..."

# 1. Stop by recorded PIDs
if [ -d "$PID_DIR" ]; then
    for pidfile in "$PID_DIR"/*.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile" 2>/dev/null || true)
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo "  Stopping process $pid ($(basename "$pidfile" .pid))..."
                kill "$pid" 2>/dev/null || true
            fi
            rm -f "$pidfile"
        fi
    done
    sleep 1
fi

# 2. Stop by recorded ports or arguments
PORTS=()
if [ $# -gt 0 ]; then
    PORTS=("$@")
elif [ -f "$PORTS_FILE" ]; then
    # Load ports recorded during start
    source "$PORTS_FILE" 2>/dev/null || true
    [ -n "$API_PORT" ] && PORTS+=("$API_PORT")
    [ -n "$WEB_PORT" ] && PORTS+=("$WEB_PORT")
    [ -n "$TRACKER_PORT" ] && PORTS+=("$TRACKER_PORT")
fi

# If no ports recorded or provided, default to current deployment ports
if [ ${#PORTS[@]} -eq 0 ]; then
    PORTS=(3002 4044 3051)
fi

echo "  Ensuring ports are clear: ${PORTS[*]}..."
for port in "${PORTS[@]}"; do
    if command -v lsof >/dev/null 2>&1; then
        pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "  Killing lingering process on port $port (PID: $pids)..."
            kill $pids 2>/dev/null || true
            sleep 1
            kill -9 $pids 2>/dev/null || true
        fi
    fi
    if command -v fuser >/dev/null 2>&1; then
        fuser -k "${port}/tcp" 2>/dev/null || true
    fi
done

# Clean up PID files and socket locks
rm -rf "$PID_DIR"
rm -f "$ROOT_DIR/postgres-data/postmaster.pid" "$ROOT_DIR/Exam/postgres-data/postmaster.pid" 2>/dev/null || true

echo "===================================================="
echo " All ExamOS services have been stopped cleanly!"
echo " Ports cleared: ${PORTS[*]}"
echo " You can now run bash start_all.sh"
echo "===================================================="
