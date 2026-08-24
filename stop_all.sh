#!/usr/bin/env bash

echo "Stopping ExamOS services..."

if command -v lsof >/dev/null 2>&1; then
    for port in 3000 4000 3050 5432; do
        pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null || true
        fi
    done
elif command -v fuser >/dev/null 2>&1; then
    fuser -k 3000/tcp 4000/tcp 3050/tcp 5432/tcp 2>/dev/null || true
fi

echo "===================================================="
echo " All ExamOS services have been stopped cleanly!"
echo " You can now run bash start_all.sh"
echo "===================================================="
