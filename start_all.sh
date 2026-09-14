#!/usr/bin/env bash

# Resolve project root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOGS_DIR="$ROOT_DIR/logs"
PORTS_FILE="$ROOT_DIR/.ports.env"

echo "Cleaning up previous processes for this deployment..."
bash "$ROOT_DIR/stop_all.sh" >/dev/null 2>&1 || true

mkdir -p "$PID_DIR" "$LOGS_DIR"

echo ""
echo "===================================================="
echo "  Detecting Available Ports for ExamOS..."
echo "===================================================="

# Helper function to find next available port starting from a preferred port
find_free_port() {
    local preferred="$1"
    node -e '
        const net = require("net");
        const isFree = (port) => new Promise((resolve) => {
            const s = net.createServer();
            s.unref();
            s.once("error", () => resolve(false));
            s.once("listening", () => {
                s.close(() => resolve(true));
            });
            s.listen(port, "0.0.0.0");
        });
        const findPort = async (port) => {
            while (!(await isFree(port))) {
                port++;
            }
            return port;
        };
        const req = parseInt(process.argv[1], 10);
        findPort(req).then((p) => console.log(p));
    ' "$preferred"
}

# 1. Resolve Tracker Port
PREFERRED_TRACKER=${TRACKER_PORT:-3050}
TRACKER_PORT=$(find_free_port "$PREFERRED_TRACKER")

# 2. Resolve API Server Port
PREFERRED_API=${API_PORT:-${PORT:-4043}}
API_PORT=$(find_free_port "$PREFERRED_API")

# 3. Resolve Web Frontend Port
PREFERRED_WEB=${WEB_PORT:-3000}
WEB_PORT=$(find_free_port "$PREFERRED_WEB")

# Save detected ports for stop_all.sh and environment
cat <<EOF > "$PORTS_FILE"
TRACKER_PORT=$TRACKER_PORT
API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
EOF

echo "  Tracker Port: $TRACKER_PORT (requested: $PREFERRED_TRACKER)"
echo "  API Port:     $API_PORT (requested: $PREFERRED_API)"
echo "  Web Port:     $WEB_PORT (requested: $PREFERRED_WEB)"
echo ""

# Update Exam/.env with actual API port
cat <<EOF > "$ROOT_DIR/Exam/.env"
DATABASE_URL="postgresql://examos:examos_password@localhost:5432/examos_db?schema=public"
JWT_SECRET="examos_super_secret_jwt_key_2026_production"
JWT_REFRESH_SECRET="examos_super_secret_refresh_jwt_key_2026_production"
PORT=$API_PORT
EOF

# Update Exam/apps/web/.env with actual ports
cat <<EOF > "$ROOT_DIR/Exam/apps/web/.env"
VITE_API_BASE_URL=http://localhost:$API_PORT/api/v1
VITE_API_PORT=$API_PORT
VITE_PORT=$WEB_PORT
PORT=$WEB_PORT
EOF

echo "Starting ExamOS Native Stack..."

# 1. Start Build Tracker UI
if [ -d "$ROOT_DIR/tools/build-tracker" ]; then
    echo "1. Starting Build Tracker UI on Port $TRACKER_PORT..."
    (cd "$ROOT_DIR/tools/build-tracker" && PORT=$TRACKER_PORT setsid node server.js > "$LOGS_DIR/tracker.log" 2>&1 &)
    sleep 1
    lsof -ti :$TRACKER_PORT > "$PID_DIR/tracker.pid" 2>/dev/null || true
fi

# 2. Start Express API Server
echo "2. Starting Express API Server on Port $API_PORT..."
(cd "$ROOT_DIR/Exam" && PORT=$API_PORT setsid npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only apps/api/src/server.ts > "$LOGS_DIR/api.log" 2>&1 &)

# Wait up to 10 seconds for API server to become ready
echo "   Waiting for API server to become ready..."
API_READY=false
for i in {1..10}; do
    if curl -s "http://localhost:$API_PORT/health" >/dev/null 2>&1; then
        API_READY=true
        break
    fi
    sleep 1
done

if [ "$API_READY" = true ]; then
    echo "   API server is ready and responding at http://localhost:$API_PORT/health"
    lsof -ti :$API_PORT > "$PID_DIR/api.pid" 2>/dev/null || true
else
    echo "   [WARNING] API server taking longer to start. Check logs at: $LOGS_DIR/api.log"
fi

# 3. Start Vite Web Application
echo "3. Starting Vite Web Application on Port $WEB_PORT..."
(cd "$ROOT_DIR/Exam/apps/web" && API_PORT=$API_PORT VITE_API_PORT=$API_PORT setsid npx vite --port $WEB_PORT --strictPort --host > "$LOGS_DIR/web.log" 2>&1 &)

sleep 2
lsof -ti :$WEB_PORT > "$PID_DIR/web.pid" 2>/dev/null || true

# Detect host LAN IP if available
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$HOST_IP" ] && HOST_IP="127.0.0.1"

echo ""
echo "===================================================="
echo "  ExamOS Full Stack is Live!"
echo "===================================================="
echo "  Local URLs:"
echo "    - Web Application: http://localhost:$WEB_PORT/"
echo "    - API Endpoint:    http://localhost:$API_PORT/"
echo "    - Build Tracker:   http://localhost:$TRACKER_PORT/"
echo ""
echo "  Network / LAN URLs:"
echo "    - Web Application: http://$HOST_IP:$WEB_PORT/"
echo "    - API Endpoint:    http://$HOST_IP:$API_PORT/"
echo "    - Build Tracker:   http://$HOST_IP:$TRACKER_PORT/"
echo ""
echo "  Seeded Credentials:"
echo "    - Main Admin:   admin@examos.com    / Admin@123"
echo "    - Sub-Admin:    subadmin@examos.com / SubAdmin@123"
echo "    - Teacher:      teacher@examos.com  / Teacher@123"
echo "    - Student 1:    student@examos.com  / Student@123"
echo ""
echo "  Logs:"
echo "    - API:     $LOGS_DIR/api.log"
echo "    - Web:     $LOGS_DIR/web.log"
echo "    - Tracker: $LOGS_DIR/tracker.log"
echo ""
echo "  To stop all services: bash stop_all.sh"
echo "===================================================="
