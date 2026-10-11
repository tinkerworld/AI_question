#!/usr/bin/env bash
set -euo pipefail
[[ $# == 2 ]] || { echo 'Usage: deploy.sh /var/lib/examos-deploy/incoming/release.tar.gz FULL_SHA' >&2; exit 2; }
exec sudo -n -u ubuntu /usr/bin/python3 /usr/local/lib/examos/github-deploy.py "$1" "$2"
