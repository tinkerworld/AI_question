# Coding Standards & Conventions

This document outlines the coding standards, conventions, and best practices for the Adaptive Examination & AI Learning Platform.

## 1. Naming Conventions
- **File Naming**: Use kebab-case for files (e.g., `user-management.service.ts`), PascalCase for React components (e.g., `UserTable.tsx`).
- **Variable Naming**: Use camelCase for variables and function names.
- **Types/Interfaces**: Use PascalCase (e.g., `UserProfile`, `CreateUserDto`).
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`).
- **Database Columns**: Use snake_case in the database, mapped to camelCase in Prisma/TypeScript.

## 2. TypeScript Rules
- **Strict Mode**: Enable strict mode in `tsconfig.json`.
- **No Any**: Avoid using `any`. Use `unknown` if the type is truly unknown, and narrow it down.
- **Explicit Return Types**: All exported functions must have explicit return types.
- **Readonly**: Use `readonly` properties and `ReadonlyArray` where possible to ensure immutability.

## 3. Module Structure
Follow a clear dependency hierarchy within modules:
`routes.ts` → `controller.ts` → `service.ts` → `repository.ts` → `types.ts` → `index.ts`

## 4. Import Order
Group imports in the following order, separated by a blank line:
1. `node_modules` (e.g., React, Express)
2. Workspace packages (`@repo/*`)
3. Relative imports (`../`, then `./`)

## 5. Function Guidelines
- **Length**: Maximum 40 lines per function.
- **Single Responsibility**: Each function should do exactly one thing.
- **Naming**: Use descriptive names indicating the action (e.g., `createUserWithRole`, NOT `doStuff`).

## 6. Error Handling
- **AppError**: Always use the custom `AppError` class for operational errors.
- **No Raw Strings**: Never throw raw strings or generic Error objects for API responses.
- **Error Codes**: Mandatory error codes for client-side handling.

## 7. Comments
- **JSDoc**: Use JSDoc format for all exported functions, classes, and interfaces.
- **Obvious Comments**: Do not write comments that state the obvious (e.g., `// Adds 1 to i`).
- **TODOs**: Format as `// TODO(name): description of what needs to be done`.

## 8. Logging
- **Logger**: Use the configured Pino logger.
- **Format**: Structured JSON logging.
- **Security**: NEVER log PII, passwords, tokens, or sensitive user data.

## 9. Frontend Conventions
- **App Router**: Follow Next.js 15 App Router conventions (`page.tsx`, `layout.tsx`).
- **Use Client**: Use `'use client'` only when absolutely necessary (e.g., state, hooks).
- **Server Components**: Default to React Server Components (RSC).
- **Styling**: Use CSS custom properties or Tailwind; avoid inline styles.

## 10. API Conventions
- **Response Envelope**: Always wrap responses in a standard envelope (e.g., `{ success, data, error }`).
- **Validation**: Zod validation is required on all inputs (params, query, body).
- **Middleware**: Permission middleware is mandatory on all protected routes.

## 11. Database
- **Prisma Only**: No raw SQL unless explicitly approved for performance-critical paths.
- **Repository Pattern**: Data access must go through repository classes.
- **Cross-Module Queries**: No cross-module queries; use services to fetch data from other modules.

## 12. Testing
- **Colocation**: Test files must be next to the source file (`filename.test.ts`).
- **Naming**: Use descriptive `describe`/`it` blocks.
- **AAA Pattern**: Follow Arrange, Act, Assert pattern in all tests.

## 13. Git Commits
- **Conventional Commits**: Use `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- **Scope**: Include the module name as scope (e.g., `feat(auth): add login`).

## 14. PR Template
Every PR must include:
- Description of changes
- Type of change
- Testing performed
- Screenshots (if UI changes are included)
- Checklist of standards met

## 15. Code Review Checklist
1. [ ] Does the code follow the naming conventions?
2. [ ] Are TypeScript types strict and explicit?
3. [ ] Is the module structure adhered to?
4. [ ] Are imports ordered correctly?
5. [ ] Do functions respect the 40-line limit and single responsibility?
6. [ ] Is error handling using `AppError` with codes?
7. [ ] Are JSDoc comments present for exports?
8. [ ] Is there any PII in logs?
9. [ ] Are Server Components maximized on the frontend?
10. [ ] Are API responses enveloped properly?
11. [ ] Is Zod validation applied to all inputs?
12. [ ] Are DB queries localized to repositories?
13. [ ] Are tests following the AAA pattern?
14. [ ] Do commits follow Conventional Commits?
15. [ ] Is the PR template fully completed?
