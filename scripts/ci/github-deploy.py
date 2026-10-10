#!/usr/bin/env python3
"""Host-installed deployment controller; called only by the approved GitHub job."""
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request
import uuid

HOME = Path('/home/ubuntu/CICD')
CONFIG = Path('/etc/examos/production.json')
INCOMING = Path('/var/lib/examos-deploy/incoming')
UNITS = ['examos-api.service', 'examos-web.service', 'examos-tracker.service']


def command(args, **kwargs):
    subprocess.run(args, check=True, timeout=600, **kwargs)


def unpack(archive, destination, sha):
    with tarfile.open(archive, 'r:gz') as bundle:
        # Reject links and special files in the transport archive. Runtime links
        # are created locally only after extraction and dependency installation.
        members = bundle.getmembers()
        if len(members) > 100000 or sum(m.size for m in members) > 1024**3:
            raise RuntimeError('Release archive exceeds allowed size')
        if any(not (m.isfile() or m.isdir()) for m in members):
            raise RuntimeError('Release archive contains links or special files')
        bundle.extractall(destination, filter='data')
    metadata = json.loads((destination / '.cicd-release.json').read_text())
    if metadata['commit'] != sha or metadata['node'] != '24.16.0':
        raise RuntimeError('Artifact identity/runtime mismatch')


def retain(config, current, previous):
    store = Path(config['releases']).resolve()
    protected = {current.resolve(), previous.resolve()}
    candidates = []
    for path in store.iterdir():
        if path.is_symlink() or not path.is_dir():
            continue
        # Any release holding shared data must remain, regardless of age.
        for rel in config['shared_paths']:
            if not (path / rel).is_symlink():
                continue
            target = (path / rel).resolve()
            for parent in [target, *target.parents]:
                if parent.parent == store:
                    protected.add(parent)
        if re.fullmatch(r'[a-f0-9]{12}-\d{8}T\d{6}-[a-f0-9]{8}', path.name) and (path / '.cicd-healthy').is_file():
            candidates.append(path)
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    protected.update(candidates[:max(2, int(config.get('keep_releases', 5)))])
    for path in candidates:
        if path not in protected:
            shutil.rmtree(path)  # Does not follow shared-data symlinks.


def point(link, target):
    temporary = link.with_name(link.name + '.next-' + uuid.uuid4().hex[:8])
    temporary.symlink_to(target, target_is_directory=True)
    os.replace(temporary, link)


def wrappers(root, preserve=False):
    for filename, action in [('start_all.sh', 'start'), ('stop_all.sh', 'stop')]:
        script = root / filename
        if preserve:
            backup = root / '.cicd-legacy-scripts' / filename
            backup.parent.mkdir(exist_ok=True)
            if script.exists() and not backup.exists():
                shutil.copy2(script, backup)
        script.write_text('#!/usr/bin/env bash\nset -euo pipefail\nexec flock -n /home/ubuntu/CICD/deployment.lock sudo -n /usr/bin/systemctl ' + action + ' ' + ' '.join(UNITS) + '\n')
        script.chmod(0o755)


def service(action):
    command(['sudo', '-n', '/usr/bin/systemctl', action, *UNITS])


def save_record(record):
    temporary = HOME / ('deployment-' + uuid.uuid4().hex + '.tmp')
    temporary.write_text(json.dumps(record, indent=2) + '\n')
    os.replace(temporary, HOME / 'last-deployment.json')


def health(config, sha=None):
    last = None
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            for unit in UNITS:
                command(['/usr/bin/systemctl', 'is-active', '--quiet', unit])
            for port, path in [(config['api_port'], '/health'), (config['web_port'], '/')]:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=2) as response:
                    if response.status != 200:
                        raise RuntimeError('Non-200 health response')
            if sha:
                for base in [f"http://127.0.0.1:{config['web_port']}", config['public_url']]:
                    with urllib.request.urlopen(base.rstrip('/') + '/__release.json', timeout=5) as response:
                        if json.load(response)['commit'] != sha:
                            raise RuntimeError('Traffic is reaching another release')
                    with urllib.request.urlopen(base.rstrip('/') + '/api/__cicd/ready', timeout=5) as response:
                        body = json.load(response)
                        if body.get('status') != 'ready' or body.get('commit') != sha:
                            raise RuntimeError('API/database readiness or identity check failed')
            else:
                # The legacy app has no readiness route or version metadata.
                with urllib.request.urlopen(config['public_url'], timeout=5) as response:
                    if response.status != 200:
                        raise RuntimeError('Legacy public route is unavailable')
            return
        except Exception as error:
            last = error
            time.sleep(2)
    raise RuntimeError(f'Release health checks failed: {last}')


def deploy(archive, sha):
    if not re.fullmatch(r'[a-f0-9]{40}', sha):
        raise RuntimeError('Expected a full commit SHA')
    config = json.loads(CONFIG.read_text())
    if config.get('enabled') is not True:
        raise RuntimeError('Production is not enabled in /etc/examos/production.json')
    if not config.get('startup_schema_reviewed'):
        raise RuntimeError('Review automatic application startup schema changes before enabling deployment')
    if not config.get('public_url', '').startswith('https://'):
        raise RuntimeError('Configure the public HTTPS route for end-to-end health checks')
    live = Path(config['release'])
    releases = Path(config['releases'])
    if not live.is_dir() or live.parent != releases.parent or live == releases:
        raise RuntimeError('Invalid release layout')
    for key in ['api_port', 'web_port', 'tracker_port']:
        if type(config[key]) is not int or not 1024 <= config[key] <= 65535:
            raise RuntimeError('Invalid configured port')
    if len({config[k] for k in ['api_port', 'web_port', 'tracker_port']}) != 3:
        raise RuntimeError('Ports must be distinct')
    previous = live.resolve()
    backend_env = previous / 'Exam/.env'
    values = {}
    for line in backend_env.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('\"\'')
    if any(not values.get(key) for key in ['JWT_SECRET', 'JWT_REFRESH_SECRET']):
        raise RuntimeError('Required backend JWT variables are missing')
    for relative in ['Exam/.env', 'Exam/apps/api/.env']:
        secret_file = previous / relative
        if secret_file.exists() and secret_file.stat().st_mode & 0o077:
            raise RuntimeError('Backend env files must be owner-only readable before deployment')
    env = os.environ.copy()
    env['PATH'] = '/home/ubuntu/.nvm/versions/node/v24.16.0/bin:' + env['PATH']
    node = subprocess.check_output(['node', '--version'], env=env, text=True).strip()
    if node != 'v24.16.0':
        raise RuntimeError('Host Node must match CI: 24.16.0')
    for tool in ['lsof', 'setsid', 'corepack']:
        if not shutil.which(tool, path=env['PATH']):
            raise RuntimeError('Missing host dependency: ' + tool)
    releases.mkdir(parents=True, exist_ok=True)
    tag = time.strftime('%Y%m%dT%H%M%S') + '-' + uuid.uuid4().hex[:8]
    candidate = releases / (sha[:12] + '-' + tag)
    candidate.mkdir()
    unpack(archive, candidate, sha)
    required = sum(p.stat().st_size for p in candidate.rglob('*') if p.is_file())
    database_bytes = sum(p.stat().st_size for rel in ['postgres-data', 'Exam/postgres-data']
                         for p in (previous / rel).rglob('*') if p.is_file())
    if shutil.disk_usage(releases).free < required * 3 + database_bytes + 2 * 1024**3:
        raise RuntimeError('Insufficient disk space for dependencies, database backup and rollback')
    # Install before stopping the old application. No production env/data is
    # attached during dependency installation. Build outputs came from CI.
    env.update({'CI': 'true', 'NODE_ENV': 'test', 'PG_DATA_DIR': 'memory://'})
    command(['corepack', 'pnpm', 'install', '--frozen-lockfile'], cwd=candidate / 'Exam', env=env)
    for name in ['Exam/apps/api/dist/server.js', 'Exam/apps/web/dist/index.html']:
        if not (candidate / name).is_file():
            raise RuntimeError('Missing compiled artifact: ' + name)
    first = not live.is_symlink()
    old = releases / ('legacy-' + tag) if first else previous
    # Resolve existing symlinks so later releases retain the same data owner.
    for relative in config['shared_paths']:
        rel = Path(relative)
        if rel.is_absolute() or '..' in rel.parts or rel == Path('.'):
            raise RuntimeError('Invalid shared path')
        source = previous / rel
        if not source.exists():
            continue
        target = old / rel if first else source.resolve()
        dest = candidate / rel
        if dest.is_dir():
            shutil.rmtree(dest)
        elif dest.exists() or dest.is_symlink():
            dest.unlink()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.symlink_to(target, target_is_directory=source.is_dir())
    wrappers(candidate)
    (candidate / '.cicd-ports').write_text(f"API_PORT={config['api_port']}\nWEB_PORT={config['web_port']}\nTRACKER_PORT={config['tracker_port']}\n")
    # Legacy stop scripts kill by port. Verify every listener belongs to this
    # release before calling them, to avoid touching development or other apps.
    for key in ['api_port', 'web_port', 'tracker_port']:
        result = subprocess.run(['lsof', '-t', f'-iTCP:{config[key]}', '-sTCP:LISTEN'], capture_output=True, text=True)
        if result.returncode not in [0, 1]:
            raise RuntimeError('Cannot inspect listener ownership')
        for pid in result.stdout.split():
            cwd = Path(f'/proc/{pid}/cwd').resolve()
            if not cwd.is_relative_to(previous):
                raise RuntimeError(f'Port {config[key]} is owned by another application')
    if first:
        recorded = dict(line.split('=', 1) for line in (previous / '.ports.env').read_text().splitlines() if '=' in line)
        expected = {'API_PORT': str(config['api_port']), 'WEB_PORT': str(config['web_port']), 'TRACKER_PORT': str(config['tracker_port'])}
        if recorded != expected:
            raise RuntimeError('Legacy runtime ports changed; review production.json')
    stopped = False
    moved = False
    activated = False
    try:
        stopped = True
        if first:
            command(['bash', str(previous / 'stop_all.sh')], env=env)
            # A rollback must keep the dashboard on the same manager too.
            # Save original launch scripts before adapting only these wrappers.
            wrappers(previous, preserve=True)
        else:
            service('stop')
        # Retain a stopped database snapshot for manual recovery. Code rollback
        # deliberately does not revert data that may receive new user writes.
        backup = releases / ('database-backup-' + tag)
        for relative in ['postgres-data', 'Exam/postgres-data']:
            data = previous / relative
            if data.is_dir():
                shutil.copytree(data, backup / relative)
        if first:
            live.rename(old)
            moved = True
        point(live, candidate)
        activated = True
        service('start')
        health(config, sha)
        (candidate / '.cicd-healthy').touch()
        save_record({'commit': sha, 'timestamp': tag, 'release': str(candidate), 'previous': str(old), 'database_backup': str(backup)})
        print('Healthy release deployed:', sha)
    except BaseException:
        if activated:
            try:
                service('stop')
            finally:
                point(live, old)
        elif moved:
            point(live, old)
        if stopped:
            service('start')
            health(config)
        raise
    # Cleanup errors must never trigger rollback of an already healthy release.
    try:
        retain(config, candidate, old)
    except Exception as error:
        print('Release retention needs attention:', type(error).__name__)


def rollback():
    config = json.loads(CONFIG.read_text())
    record = json.loads((HOME / 'last-deployment.json').read_text())
    live = Path(config['release'])
    previous = Path(record['previous']).resolve()
    if not previous.is_dir() or not previous.is_relative_to(Path(config['releases']).resolve()):
        raise RuntimeError('Previous release is unavailable or outside the release store')
    current = live.resolve()
    if current != Path(record['release']).resolve():
        raise RuntimeError('Current release differs from deployment record')
    service('stop')
    point(live, previous)
    try:
        metadata = previous / '.cicd-release.json'
        sha = json.loads(metadata.read_text())['commit'] if metadata.exists() else None
        service('start')
        health(config, sha)
    except BaseException:
        service('stop')
        point(live, current)
        service('start')
        health(config)
        raise
    record.update({'release': str(previous), 'previous': str(current), 'commit': sha,
                   'timestamp': time.strftime('%Y%m%dT%H%M%S'), 'action': 'rollback'})
    save_record(record)
    print('Previous code release restored; database was not reverted')


if __name__ == '__main__':
    def interrupted(_signal, _frame):
        raise RuntimeError('Deployment interrupted; attempting recovery if activation began')
    signal.signal(signal.SIGTERM, interrupted)
    with (HOME / 'deployment.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if sys.argv[1:] == ['--rollback']:
            rollback()
        elif sys.argv[1:] == ['--health']:
            config = json.loads(CONFIG.read_text())
            metadata = Path(config['release']) / '.cicd-release.json'
            sha = json.loads(metadata.read_text())['commit'] if metadata.exists() else None
            health(config, sha)
        elif len(sys.argv) == 3:
            artifact = Path(sys.argv[1])
            if artifact.is_symlink() or not artifact.is_file() or artifact.resolve().parent != INCOMING.resolve():
                raise RuntimeError('Artifact must be a regular file in the fixed incoming directory')
            deploy(artifact.resolve(), sys.argv[2])
        else:
            raise SystemExit('Expected ARCHIVE SHA, --rollback, or --health')
