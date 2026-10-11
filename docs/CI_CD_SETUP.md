# ExamOS GitHub Actions CI/CD

## Status and approval boundary

This configuration is prepared for `tinkerworld/AI_question`. It has not been pushed, installed on the host, registered with GitHub, or deployed. Keep `EXAMOS_DEPLOY_ENABLED` unset/false and `/etc/examos/production.json` disabled until the application checks pass and the owner approves activation. See the validation report in this document for current blockers.

The observed development branch is `writing`; GitHub's default branch is `main`. Development is `/home/ubuntu/exam_shekhar/AI_question`; production is `/home/ubuntu/Deploy/AI_question`. This pipeline deploys only **main**, never a direct push to `writing` or a pull request. Merge reviewed development changes into main when ready.

## Architecture discovered

- TypeScript Express API, React/Vite frontend, pnpm 9.0.0 workspaces and Turbo under `Exam/`. Runtime used during validation: Node 24.16.0.
- Commands: `pnpm install --frozen-lockfile`, `pnpm run lint`, `pnpm -r --if-present typecheck`, `pnpm test`, `pnpm run build`.
- API entry: `Exam/apps/api/src/server.ts`; web source: `Exam/apps/web`; tracker: `tools/build-tracker/server.js`.
- The API currently runs through ts-node. Some workspace packages expose TypeScript source. Keep dev dependencies on the host until that runtime architecture is deliberately changed; `--prod` installation alone is insufficient.
- The active database package imports PGlite. The default persistent data is `postgres-data/` in the project root. There is also `Exam/postgres-data/`; both are preserved. Existing Compose PostgreSQL/Redis definitions are legacy infrastructure and are not started, migrated, or replaced by this pipeline.
- `initV2Tables()` runs during API startup, including schema creation and seeding. The legacy `db:migrate` and `db:seed` commands are NOT executed by deployment. Startup schema changes must remain backward compatible and be reviewed before enabling deployment.
- TinkerForge at `http://localhost:3001` calls the release folder's `start_all.sh`/`stop_all.sh`. These currently use detached Node processes, choose available ports, and rewrite dotenv files.
- Observed release ports: API **4201**, web **3002**, tracker **3050**, from `.ports.env`. The dashboard's API port metadata is stale; do not copy its displayed 4043 into production configuration.
- `/health` is an API liveness endpoint. The added `/ready` endpoint verifies the active database with `SELECT 1` and reports the commit. It is exposed through the web proxy as `/api/__cicd/ready`. The older language-list route can return fallback data when the database fails, so it is not used as readiness evidence.
- Cloudflare Tunnel exposes `https://examos.tinkerlab.online`. The host's LAN address is private (`192.168.29.80`); public SSH reachability is unverified.

## Connection and process management decision

Use a dedicated outbound GitHub runner account, `examos-deploy`, rather than opening an unverified inbound SSH route. Registration uses a short-lived GitHub runner token; no SSH keys or inbound firewall changes are required for this selected design. The runner never builds or tests pull-request code. It downloads a validated main artifact and invokes a root-installed, fixed-path controller as the existing application user `ubuntu`.

The deployment account has no blanket sudo or root shell. It can invoke only the controller as `ubuntu`. The app user can start/stop exactly three named systemd units. The controller and systemd definitions are root-owned. The runner cannot directly read production dotenv files.

Systemd is a justified production-only upgrade from detached processes: it provides crash restart, process-group cleanup, journals, and reboot startup. There is no PM2 or Docker application process manager to preserve. TinkerForge keeps its existing controls; release wrapper scripts route them to systemd. Do not run the old scripts and new units concurrently.

New frontend releases serve the compiled Vite output using the already-installed Express dependency, with a fixed local API proxy. Vite's development server is used only when rolling back to the preserved legacy baseline. No new web-server dependency is installed. API runtime remains ts-node to preserve the current workspace behavior.

## How CI and deployment are connected

1. `ci.yml` runs on pushes, PRs, and manual dispatch, entirely on GitHub-hosted Ubuntu 24.04.
2. Official actions are pinned to verified commit hashes. The package store cache is keyed by OS, architecture, pnpm version and lockfile hash; `node_modules`, build output and credentials are not cached.
3. Locked installation, lint, type checks, production dependency audit (high/critical gate), tracked-dotenv checks, build and tests must all succeed. Tests have an eight-minute shell timeout and a job timeout. Failure is never ignored.
4. Successful main runs package the committed source and compiled output. The artifact has exact commit metadata and a frontend `__release.json`; ignored dotenv files, local databases and dependencies are not copied into it.
5. `deploy.yml` starts after `ExamOS CI` completes, or manually with a CI run ID. A GitHub-hosted verification job checks workflow ID, successful conclusion, origin repository, event, main branch, and equality with the current main SHA. A PR or another workflow cannot qualify.
6. The deployment job uses the `production` environment and the dedicated `examos-production` runner label. It downloads the artifact from that exact CI run and attempt. There is no repository checkout on the host runner.
7. The controller extracts into a unique release directory, checks identity and disk space, installs locked dependencies, validates environment permissions and connects shared data. It does not rebuild application assets on production.
8. It stops the old app, makes a stopped database backup, changes the release pointer, starts services, and checks systemd state, API liveness, database readiness, matching API/frontend commit identities, and the public HTTPS route.
9. Failure stops the candidate, restores the previous pointer, starts the previous code and verifies its health. The workflow remains failed. If recovery also fails, the job fails visibly; inspect the journal and preserved files before further action.
10. Only successful managed code releases are eligible for retention cleanup. Five recent releases and the previous release are retained; legacy data owners, current/shared targets, and database backups are never automatically deleted.

The first deployment preserves the original launch scripts in `.cicd-legacy-scripts/`, adapts only the start/stop wrappers to systemd, and moves the original release directory to `.examos-releases/legacy-...` and replaces `/home/ubuntu/Deploy/AI_question` with a symlink. That retained baseline is the physical owner of shared environment/data/log files; subsequent releases link to it. This avoids moving or overwriting production secrets and data. Do not remove the legacy directory. The release path becomes artifact-managed rather than a working Git checkout; develop only in the development folder.

There is a **brief outage** while the single-writer PGlite app is stopped, backed up and restarted. A symlink does not make this zero downtime. A parallel instance cannot safely share this database directory. Build/dependency preparation occurs before stopping production.

## Repository files

- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- `scripts/deploy.sh`, `scripts/rollback.sh`, `scripts/health-check.sh`
- `Exam/apps/api/src/server.ts`: a bounded database readiness endpoint, without changing existing liveness/routes
- `scripts/ci/`: packaging, environment guard, deployment controller, host preparation, service launch/static serving, production template, systemd units and controller tests
- `.env.example` and this document

Hard power loss or SIGKILL cannot guarantee automatic rollback. On recovery, inspect the current symlink, journals, preserved release directories and deployment record before restarting. SIGTERM is handled with a recovery attempt; metadata is replaced atomically.

Changes to host-installed scripts require a separately reviewed reinstall; the GitHub runner does not overwrite its own privileged controller from an artifact.

## Local checks and current application blockers

```bash
cd /home/ubuntu/exam_shekhar/AI_question
python3 -m unittest discover -s scripts/ci/tests -v
bash -n scripts/deploy.sh scripts/rollback.sh scripts/health-check.sh scripts/ci/*.sh
python3 -m py_compile scripts/ci/*.py
node --check scripts/ci/serve-web.cjs
cd Exam
corepack pnpm install --frozen-lockfile
corepack pnpm run lint
corepack pnpm -r --if-present typecheck
corepack pnpm audit --prod --audit-level high
corepack pnpm run build
# Use an isolated test environment, not production ports/databases.
NODE_ENV=test PG_DATA_DIR=memory:// timeout --kill-after=15s 8m corepack pnpm test
```

Install/build previously passed for the reconciled application (10 build tasks). Existing lint fails because ESLint is not installed/configured. Tests have middleware failures, unresolved TypeScript imports under plain `node --test`, and hanging integration tests. These are real blockers; configure the intended linter/test runner and isolated integration services rather than skipping checks. The deployment tests use temporary files and mocked process controls; they do not prove an actual production cutover succeeds.

## Validation report (2026-10-10)

- GitHub YAML/action expressions: actionlint 1.7.12 passed, using the declared custom runner label.
- Deployment controller: 9 temporary-filesystem tests passed (activation, rollback, failed health, disabled gate, mismatched SHA, unsafe archives, low disk and retention).
- Production frontend: loopback smoke test passed for SPA/static assets, API forwarding and non-exposure of backend files.
- Python compilation and Bash/Node syntax checks passed. Systemd unit verification found no errors in these units; the host's unrelated `tele_bot.service` was unreadable to the validation process.
- Packaging: passed using an isolated committed fixture and built outputs; archive contains both commit markers and excludes local dotenv files, dependencies and Git metadata. This fixture is not a production-approved release.
- Application build: all 10 tasks passed after adding readiness (9 unchanged tasks reused their local cache).
- API readiness smoke test: passed on a temporary loopback port with an in-memory database and a test commit identity.
- Workspace type checks: passed.
- Existing lint: failed because ESLint is not installed/configured.
- Existing application tests in an isolated environment: 55 reported test entries, 12 passed, 43 failed. Import/runner and missing integration-service failures remain. Previous unrestricted invocation also hung; bounded execution is mandatory.
- Dependency audit: 1 critical `proxy-addr` advisory, 2 moderate `qs` advisories. The critical advisory blocks the security gate. Review [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) and update/test the affected dependencies separately; do not suppress the gate.
- Production cutover, actual rollback, GitHub execution, environment/runner restrictions, host installation and reboot recovery are **not performed or verified**. No success claim is made for production.

Logs from local validation are under `/home/ubuntu/CICD/github-setup/` and earlier run logs under `/home/ubuntu/CICD/runs/`. They are intentionally not committed with the configuration.

## One-time host preparation — requires approval

The following commands change Linux accounts, a narrowly scoped sudo policy, systemd definitions and dotenv permissions. They do not change SSH/firewall rules. Keep a local console/second administrator session available. Existing app files, environment values, running processes and database content must remain untouched during preparation.

Required existing packages: Python 3.12+, Node 24.16.0 with Corepack, systemd, sudo, curl, git, lsof, util-linux (`setsid`), and normal Ubuntu runner prerequisites. Install missing packages only after approval:

```bash
sudo apt-get update
sudo apt-get install --no-install-recommends python3 git curl ca-certificates sudo lsof util-linux
```

The Node binary is explicitly `/home/ubuntu/.nvm/versions/node/v24.16.0/bin/node`. The installer does not upgrade it.

```bash
cd /home/ubuntu/exam_shekhar/AI_question
sudo bash scripts/ci/install-host.sh --prepare
```

This creates `examos-deploy` with a locked password, installs controller files into `/usr/local/lib/examos`, creates `/etc/examos/production.json` with `enabled: false`, installs but does not enable/start services, checks sudoers syntax, and restricts backend dotenv files to mode 0600. It adds `ubuntu` to the incoming-artifact group; the deployment account is not added to the ubuntu group. No private key is generated because this connection does not use SSH.

Review `/etc/examos/ports.env` and `production.json` together. Confirm shared paths include all uploads, database directories and mutable application files actually used in your installation. Confirm ports still match the existing `.ports.env`. Reserve enough free space for a full stopped database copy, dependencies and at least five code releases. Backup folders are retained for manual review rather than automatically purged.

### Register the outbound runner

After approval, visit repository **Settings → Actions → Runners → New self-hosted runner → Linux x64**. Use the download/checksum/registration commands GitHub generates, as `examos-deploy`, in `/var/lib/examos-deploy/runner`. Add the label `examos-production`. Do not paste the registration token into chat, commit it, or save it in scripts.

```bash
sudo -iu examos-deploy
cd /var/lib/examos-deploy/runner
# Run GitHub's current download/checksum/config commands here.
# Set the custom label to examos-production during ./config.sh.
exit
cd /var/lib/examos-deploy/runner
sudo ./svc.sh install examos-deploy
sudo ./svc.sh start
```

Run the current runner version offered by GitHub. Configure repository/organization runner restrictions so only the trusted main deployment workflow can use this runner where that feature is available. Do not enable it for arbitrary repositories or PR jobs. A runner label is routing, not an authorization boundary. For public repositories without enforceable runner/workflow restrictions, do not enable this production runner; use an isolated outbound deployment gateway or an existing private SSH/VPN connection instead. Access-control availability must be verified in your GitHub plan before activation.

For a legacy rollback, the old application lacks database readiness/version endpoints; only process, liveness and public HTTP recovery can be verified. Later managed releases verify commit identity and database readiness on rollback too.

## GitHub configuration — requires approval

1. Publish the reviewed files and merge them into the default `main` branch. `workflow_run` needs the workflow on the default branch.
2. Protect main: require PR review and the **Build and test** CI job; restrict workflow changes to trusted maintainers.
3. Create the `production` environment. Restrict deployment branches to main. Add a required reviewer for the first rollout if your plan supports it. Keep it if you want ongoing approvals; omit it after an explicit decision if you want fully automatic deployment after a main push.
4. Keep repository variable `EXAMOS_DEPLOY_ENABLED=false` while fixing checks and preparing the runner.
5. Application secrets stay in server dotenv files. No GitHub SSH secrets are used by the selected outbound workflow. `GITHUB_TOKEN` is read-only and scoped to contents/actions for artifact retrieval.
6. Enable GitHub's normal Actions failure notifications in your own notification settings if desired. No external messaging integration is installed.

Environment protection and self-hosted runner restrictions vary by plan and repository visibility. Those settings have not been inspected or configured in this task.

### If SSH is chosen instead later

This implementation does not claim that an SSH transport is configured. First establish a reachable private VPN address or verified SSH endpoint. Required environment secrets for that alternative would be `SERVER_HOST`, `SERVER_USER`, `SERVER_PORT`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`, and `DEPLOY_PATH`. `DEPLOY_PATH` would be `/home/ubuntu/Deploy/AI_question`; the host/user/port must be discovered, not guessed. A different transport job would be reviewed before use.

Generate a dedicated key locally with `ssh-keygen -t ed25519 -f ~/.ssh/examos-github-deploy -C examos-github-deploy`. Configure a non-root deployment account with a forced, reviewed deploy command and `restrict` in `authorized_keys`. The account's `.ssh` directory must be 0700 and authorized_keys 0600. Never grant it unrestricted sudo.

Obtain the server fingerprint from its trusted local console with `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. Compare the SSH key collected from the connection against that fingerprint before saving `SSH_KNOWN_HOSTS`; `ssh-keyscan` alone does not authenticate the host. The workflow must use `StrictHostKeyChecking=yes` and `BatchMode=yes`, not `accept-new` or `no`.

Do not change root-login policy, password authentication or firewall rules until a second tested key session and local-console recovery are available. SSH key rotation would add/test a new restricted key, update the environment secret, verify a deployment connection, and only then remove the old key. These steps are not needed for the outbound runner; rotate that runner by removing its GitHub registration and registering a replacement, never by reusing a token indefinitely.

## Environment configuration

Never replace a working `.env` with an example. Existing `Exam/.env` and `Exam/apps/api/.env` must contain nonempty `JWT_SECRET` and `JWT_REFRESH_SECRET` where consumed and be owner-only readable. Existing values are preserved, not printed. Older tracked examples/defaults contain predictable values; review/rotate live credentials separately if they were used, accounting for session invalidation.

Frontend `VITE_*` values are public. CI builds with the application's default relative `/api/v1` path; the production static server proxies it to the fixed API port. No backend environment file is supplied to the frontend build. The root `.env.example` contains placeholders only. Production `PG_DATA_DIR` is explicitly bound to the preserved root database directory by the service launcher; verify that this matches the running deployment before activation.

## First activation — approval required and CI must be green

1. Resolve baseline lint/test/type/security failures and obtain a successful main CI run. Do not alter the workflow to ignore them.
2. Verify runner restrictions, environment protection, persistent paths, ports and public URL.
3. Review automatic schema initialization for backward compatibility. Keep a current independent backup. The controller takes another database copy while stopped; it does not run destructive migrations or reverse schemas.
4. Review `production.json`, then set `enabled` and `startup_schema_reviewed` to true with `sudoedit /etc/examos/production.json`.
5. Set repository variable `EXAMOS_DEPLOY_ENABLED=true` only after approval.
6. Run **ExamOS production deployment → Run workflow** from main, supplying the successful main CI run ID. If main has changed, validate the new main first.
7. Review any production environment approval request. Observe health checks and the public commit marker.
8. After the first verified successful cutover, enable reboot startup:

```bash
sudo systemctl enable examos-api.service examos-web.service examos-tracker.service
```

Subsequent validated pushes to main deploy automatically (subject to any retained required reviewer). The deployment lock and GitHub concurrency prevent overlap. Manual deployments use a previously successful CI run, never an arbitrary untested SHA.

## Logs, status and recovery

```bash
systemctl status examos-api.service examos-web.service examos-tracker.service
journalctl -u examos-api.service -u examos-web.service -u examos-tracker.service --since '20 minutes ago'
cat /home/ubuntu/CICD/last-deployment.json
readlink -f /home/ubuntu/Deploy/AI_question
bash /home/ubuntu/exam_shekhar/AI_question/scripts/health-check.sh
curl --fail https://examos.tinkerlab.online/__release.json
```

Action logs show lint/test/build/audit and deployment outcomes. Test logs are retained as GitHub artifacts for 14 days. The local deployment record stores SHA, timestamp, current/previous directory and stopped database backup location. Journald stores application process logs; old file logs are retained through shared links.

For manual code rollback, first verify that the current database remains compatible with the previous code, then run as ubuntu:

```bash
bash /home/ubuntu/exam_shekhar/AI_question/scripts/rollback.sh
```

This stops the managed services, selects the recorded previous release, restarts and verifies it. If rollback health fails, it attempts to restore the current release and fails visibly. Database content is never automatically reverted. Restoring a database requires a separately approved procedure with all writers stopped and an assessment of writes since the backup.

Common failures:

- **CI lint/test failure:** inspect the first failing job; production is not touched.
- **Deployment skipped:** enable gate is false, CI failed, or main changed after the chosen CI run.
- **Runner queued:** check registration, service, exact `examos-production` label and access restrictions.
- **Sudo denied:** validate `/etc/sudoers.d/examos-deploy`; do not add blanket sudo.
- **Ports changed/owned elsewhere:** inspect `.ports.env`, lsof and systemd. Do not kill unrelated services.
- **Missing env or wrong permissions:** repair the existing file in place; never copy example values over it.
- **Dependency install/disk failure:** occurs before stopping production; preserve failed release for diagnosis and free space carefully.
- **Local healthy, public check fails:** inspect Cloudflare routing/TLS/cache. The workflow fails and restores old code; it does not disable HTTPS validation.
- **Schema incompatibility:** stop rollout, preserve all databases/backups and inspect migration changes; code rollback is not a schema rollback.
- **Reboot recovery:** enable units only after migration to this manager. The old detached process setup was not reboot-supervised.

## References

- [GitHub workflow_run events and security](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
- [Adding self-hosted runners](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners)
- [Production environments and reviewers](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
