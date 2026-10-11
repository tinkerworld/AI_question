#!/usr/bin/env bash
set -euo pipefail
exec /usr/bin/python3 /usr/local/lib/examos/github-deploy.py --health
