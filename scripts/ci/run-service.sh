#!/usr/bin/env bash
set -euo pipefail
export PATH="/home/ubuntu/.nvm/versions/node/v24.16.0/bin:/usr/local/bin:/usr/bin:/bin"
ROOT=$(readlink -f /home/ubuntu/Deploy/AI_question)
export NODE_ENV=production
# Root-owned configuration contains numeric ports, never application secrets.
source /etc/examos/ports.env
case "${1:-}" in
  api)
    cd "$ROOT/Exam"
    export PORT="$API_PORT" PG_DATA_DIR="$ROOT/postgres-data"
    if [[ -f "$ROOT/.cicd-release.json" ]]; then
      EXAMOS_COMMIT=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["commit"])' "$ROOT/.cicd-release.json")
      export EXAMOS_COMMIT
    fi
    exec node node_modules/ts-node/dist/bin.js -r tsconfig-paths/register --project apps/api/tsconfig.json --transpile-only apps/api/src/server.ts
    ;;
  web)
    cd "$ROOT/Exam/apps/web"
    export API_PORT WEB_PORT
    # Keep the baseline's Vite mode during rollback; new releases serve only
    # compiled assets through the existing Express dependency.
    if [[ -f "$ROOT/.cicd-release.json" ]]; then
      export EXAMOS_ROOT="$ROOT"
      exec node /usr/local/lib/examos/serve-web.cjs
    fi
    exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port "$WEB_PORT" --strictPort
    ;;
  tracker)
    cd "$ROOT/tools/build-tracker"
    export PORT="$TRACKER_PORT"
    exec node server.js
    ;;
  *) echo 'Expected api, web, or tracker' >&2; exit 2 ;;
esac
