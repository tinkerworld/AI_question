#!/usr/bin/env bash
set -euo pipefail
# Run as ubuntu, following review of schema compatibility with the old version.
exec /usr/bin/python3 /usr/local/lib/examos/github-deploy.py --rollback
