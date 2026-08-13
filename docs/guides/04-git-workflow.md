# Git Workflow & Branching Strategy

This document describes the Git workflow and branching strategy for the Adaptive Examination & AI Learning Platform monorepo.

## 1. Branching Model
We use **Trunk-based development** with short-lived feature branches to ensure continuous integration and rapid delivery.

## 2. Branch Naming Conventions
- **Feature Branches**: `feature/phase-{N}/{module}-{description}` (e.g., `feature/phase-1/auth-jwt-login`)
- **Fix Branches**: `fix/phase-{N}/{description}`
- **Hotfix Branches**: `hotfix/{description}`

## 3. Main Branches
- **`main`**: Represents the production environment. Always stable and deployable.
- **`develop`**: The primary integration branch for active development.
- **`release/*`**: Release candidate branches (e.g., `release/v1.0.0`).

## 4. Feature Branch Lifecycle
1. Create a branch from `develop`.
2. Commit work frequently.
3. Open a Pull Request (PR) against `develop`.
4. Address review feedback.
5. Merge into `develop`.
6. Delete the feature branch post-merge.

## 5. Pull Request (PR) Process
- **Approvals**: Require at least 2 approvals from code owners/peers.
- **CI Checks**: All CI checks (lint, test, build) must pass.
- **Conflicts**: Must have no merge conflicts with the target branch.
- **Linkage**: Must be linked to a Jira/Linear task or GitHub Issue.

## 6. Merge Strategy
- **To `develop`**: Use **Squash and Merge**. This keeps the develop history clean, with one commit per feature.
- **To `main`**: Use **Merge Commit**. This preserves the history of when features were batched and released.

## 7. Release Process
1. Cut a `release/vX.Y.Z` branch from `develop`.
2. Deploy to the QA environment.
3. Apply bug fixes directly to the release branch.
4. Once verified, merge the release branch to `main`.
5. Tag the merge commit on `main` (e.g., `v1.0.0`).
6. Merge the release branch back to `develop` to sync fixes.

## 8. Hotfix Process
1. Branch `hotfix/{issue}` from `main`.
2. Implement the critical fix.
3. PR and merge the hotfix into `main`.
4. Deploy `main`.
5. Merge the hotfix back to `develop` to ensure it isn't regressed in future releases.

## 9. Commit Hooks
- **pre-commit**: Runs linter (ESLint) and formatter (Prettier) on staged files.
- **commit-msg**: Verifies that commit messages follow the Conventional Commits specification.

## 10. Monorepo Considerations
- **Turborepo**: We leverage Turborepo's change detection. CI pipelines will only run tasks (lint, test, build) for **affected packages**.

## 11. Protected Branches
- **`main` and `develop`** are protected.
- **No direct pushes** are allowed. All changes must go through PRs.

## 12. Tag Strategy
- **Semantic Versioning**: Tags follow SemVer (e.g., `v1.0.0`).
- **Phase Tags**: We also use tags for phase completion milestones (e.g., `phase-1-complete`).

## 13. Conflict Resolution
- **Rebase Preferred**: When bringing your feature branch up to date with `develop`, prefer `git pull --rebase origin develop`.
- **Merge if Complex**: Use a merge commit only if resolving conflicts via rebase is overly complex or error-prone.
