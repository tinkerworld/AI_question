#!/usr/bin/env bash
# ==============================================================
#  ExamOS Build Tracker — Start Script (macOS / Linux)
# ==============================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT/tools/build-tracker"

DEFAULT_PORT=${PORT:-3050}
TRACKER_PORT=$(node -e '
    const net = require("net");
    const isFree = (port) => new Promise((res) => {
        const s = net.createServer();
        s.unref();
        s.once("error", () => res(false));
        s.once("listening", () => s.close(() => res(true)));
        s.listen(port, "0.0.0.0");
    });
    const find = async (p) => { while (!(await isFree(p))) p++; return p; };
    find(parseInt(process.argv[1], 10)).then(console.log);
' "$DEFAULT_PORT")

export PORT="$TRACKER_PORT"

echo ""
echo "Starting Build Tracker on port $PORT..."
echo "  Tracker: http://localhost:$PORT"
echo ""

node server.js
