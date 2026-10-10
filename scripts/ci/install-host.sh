#!/usr/bin/env bash
# Preparation only. Does not start/stop apps, enable units, or register a runner.
set -euo pipefail
[[ ${1:-} == --prepare && $EUID == 0 ]] || {
  echo 'After approval: sudo bash scripts/ci/install-host.sh --prepare' >&2; exit 2;
}
HERE=$(cd "$(dirname "$0")" && pwd -P)
id ubuntu >/dev/null
for tool in python3 systemctl visudo lsof setsid; do command -v "$tool" >/dev/null; done
if ! id examos-deploy >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/examos-deploy --shell /bin/bash examos-deploy
fi
usermod -aG examos-deploy ubuntu
install -d -m 0750 -o examos-deploy -g examos-deploy /var/lib/examos-deploy/incoming /var/lib/examos-deploy/runner
install -d -m 0755 -o root -g root /usr/local/lib/examos /etc/examos
for name in github-deploy.py run-service.sh serve-web.cjs; do
  install -m 0755 -o root -g root "$HERE/$name" "/usr/local/lib/examos/$name"
done
if [[ ! -e /etc/examos/production.json ]]; then
  install -m 0644 -o root -g root "$HERE/production.example.json" /etc/examos/production.json
fi
if [[ ! -e /etc/examos/ports.env ]]; then
  printf 'API_PORT=4201\nWEB_PORT=3002\nTRACKER_PORT=3050\n' > /etc/examos/ports.env
  chmod 0644 /etc/examos/ports.env
fi
RULES=$(mktemp)
trap 'rm -f "$RULES"' EXIT
cat > "$RULES" <<'RULES'
examos-deploy ALL=(ubuntu) NOPASSWD: /usr/bin/python3 /usr/local/lib/examos/github-deploy.py *
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl start examos-api.service examos-web.service examos-tracker.service, /usr/bin/systemctl stop examos-api.service examos-web.service examos-tracker.service
RULES
visudo -cf "$RULES"
install -m 0440 -o root -g root "$RULES" /etc/sudoers.d/examos-deploy
install -m 0644 -o root -g root "$HERE"/systemd/*.service /etc/systemd/system/
systemctl daemon-reload
for envfile in /home/ubuntu/Deploy/AI_question/Exam/.env /home/ubuntu/Deploy/AI_question/Exam/apps/api/.env; do
  [[ ! -f "$envfile" ]] || chmod 0600 "$envfile"
done
echo 'Prepared disabled deployment configuration. No application has been restarted.'
echo 'Review production.json, register the dedicated runner, and follow docs/CI_CD_SETUP.md.'
