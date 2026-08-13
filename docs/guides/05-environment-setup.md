# Environment Setup Guide

Follow this guide to set up the local development environment for the Adaptive Examination & AI Learning Platform.

## Prerequisites
Ensure the following tools are installed:
- Node.js 20 LTS
- pnpm 9+
- Docker Desktop
- Git
- VS Code (recommended)
- PostgreSQL client (pgAdmin or DBeaver)

## Step-by-Step Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd Exam

# 2. Install dependencies
pnpm install

# 3. Setup Environment Variables
cp .env.example .env
# Edit .env with your specific local credentials if necessary

# 4. Start Docker Services (PostgreSQL + Redis)
docker-compose up -d

# 5. Run Database Migrations
pnpm run db:migrate

# 6. Seed the Database
pnpm run db:seed

# 7. Start Development Servers
pnpm run dev

# 8. Verify
# API should be running on http://localhost:4000
# Web frontend should be running on http://localhost:3000
```

## Environment Variables
Key variables in `.env` (see `.env.example` for the full list):
- `PORT`: API Port (Default: 4000)
- `DATABASE_URL`: Required. PostgreSQL connection string.
- `REDIS_URL`: Required. Redis connection string.
- `JWT_SECRET`: Required. Secret for signing access tokens.
- `AI_GATEWAY_URL`: URL for the local/remote AI Python Server.

## Docker Compose
The `docker-compose.yml` provisions:
- **postgres**: Runs on port `5432`. Includes health checks.
- **redis**: Runs on port `6379`.
Volumes are configured to persist data locally.

## Development Commands
Run these from the workspace root:
- `pnpm dev`: Start all apps in watch mode.
- `pnpm build`: Build all apps and packages.
- `pnpm test`: Run unit tests across the workspace.
- `pnpm lint`: Run ESLint.
- `pnpm format`: Run Prettier.
- `pnpm db:migrate`: Run Prisma migrations.
- `pnpm db:seed`: Seed the DB.
- `pnpm db:reset`: Drop, migrate, and seed the DB.
- `pnpm db:studio`: Open Prisma Studio.

## Troubleshooting
- **Port Conflicts**: Ensure ports 3000, 4000, 5432, and 6379 are free.
- **Docker Issues**: Ensure Docker Desktop is running. Try `docker-compose down -v` and `up -d` again.
- **Migration Failures**: Check `DATABASE_URL` in `.env`. Ensure the DB is running.
- **Permission Errors**: On Unix, you might need `sudo` for Docker, or add your user to the `docker` group.

## IDE Setup (VS Code)
### Recommended Extensions:
- ESLint, Prettier, Prisma, Tailwind CSS IntelliSense, GitLens.

### settings.json
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### launch.json
Configurations are provided in `.vscode/launch.json` for debugging the Express API and Next.js frontend.

## AI Server Setup
For the Python FastAPI AI Gateway:
1. Ensure **Python 3.11+** is installed.
2. Use **uv** or **poetry** for dependency management.
3. Create a virtual environment: `uv venv`
4. Install dependencies: `uv pip install -r requirements.txt` (or via `pyproject.toml`)
5. **Ollama Setup (Optional)**: Install Ollama locally and pull models (e.g., `ollama run llama3`) for local LLM testing.
