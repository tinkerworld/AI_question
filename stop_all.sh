#!/usr/bin/env bash

echo "Stopping ExamOS services..."

if command -v lsof >/dev/null 2>&1; then
    for port in 3000 4043 3050; do
        pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            kill -9 $pids 2>/dev/null || true
        fi
    done
    fuser -k 3000/tcp 4043/tcp 3050/tcp 2>/dev/null || true
fi

rm -f ./postgres-data/postmaster.pid ./test-db/postmaster.pid 2>/dev/null || true

echo "===================================================="
echo " All ExamOS services have been stopped cleanly!"
echo " You can now run bash start_all.sh"
echo "===================================================="
