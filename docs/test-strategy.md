# Test Strategy — Adaptive Examination & AI Learning Platform

## 1. Testing Philosophy

> **Every feature must have tests that confirm it works correctly, integrates properly, handles edge cases, respects permissions, and can be upgraded without breaking existing functionality.**

### Core Principles

| Principle | Description |
|---|---|
| **Test Pyramid** | Many unit tests, moderate integration tests, fewer E2E tests |
| **Permission-First** | Every API endpoint tested with correct AND incorrect permissions |
| **Modularity Verification** | Tests confirm modules don't leak dependencies |
| **Upgrade Safety** | Tests act as regression guards for future phases |
| **Data Integrity** | Published/historical data immutability is continuously verified |
| **AI Replaceability** | AI tests use mock interfaces to prove model-agnostic design |

---

## 2. Testing Framework & Tools

| Layer | Tool | Purpose |
|---|---|---|
| **Unit Tests** | Vitest | Fast, TypeScript-native, watch mode |
| **API Integration** | Vitest + Supertest | HTTP endpoint testing |
| **Database Tests** | Vitest + Prisma (test DB) | Schema, migrations, queries |
| **E2E Tests** | Playwright | Browser automation, full user flows |
| **AI Server Tests** | pytest | Python FastAPI testing |
| **Load Tests** | k6 or Artillery | Performance benchmarks |
| **Coverage** | Vitest coverage (v8) | Code coverage reporting |

---

## 3. Test Environment

```
┌─────────────────────────────────────────────┐
│                TEST ENVIRONMENT              │
├─────────────────────────────────────────────┤
│  PostgreSQL (test DB)     - separate DB      │
│  Redis (test instance)    - separate instance │
│  AI Server Mock           - mock responses    │
│  File Storage (temp dir)  - ephemeral         │
└─────────────────────────────────────────────┘
```

### Setup
```bash
# Test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/exam_platform_test"

# Each test suite gets isolated transactions (rolled back after each test)
# OR: Reset database between test suites using Prisma reset
```

---

## 4. Test ID Convention

All test IDs follow the pattern:

```
P{phase}.F{feature}.{type}{number}

Where:
- P = Phase number (01-14)
- F = Feature number within phase
- type = U (Unit), I (Integration), E (E2E), P (Performance), S (Security)
- number = Sequential number

Examples:
- P01.F06.U001  = Phase 1, Feature 6 (Auth), Unit Test 1
- P03.F02.I003  = Phase 3, Feature 2 (Question CRUD), Integration Test 3
- P06.F08.E002  = Phase 6, Feature 8 (Exam Frontend), E2E Test 2
```

---

## 5. Test Categories

### 5.1 Unit Tests
- Pure function testing
- Service layer business logic
- Validation schema testing
- Permission checking logic
- Engine calculations (mastery, exam generation, entitlements)
- Question type evaluators
- No database or network calls (mocked)

**Location**: `packages/*/src/__tests__/`, `apps/api/src/modules/*/__tests__/`

**Naming**: `{module}.service.test.ts`, `{module}.validator.test.ts`

### 5.2 Integration Tests
- API endpoint testing with real database
- Multi-module workflows
- Database query verification
- Middleware chain testing
- Authentication/authorization flows

**Location**: `apps/api/src/modules/*/__tests__/*.integration.test.ts`

**Naming**: `{module}.api.integration.test.ts`

### 5.3 End-to-End Tests
- Full user flows through browser
- Multi-page workflows
- Role-based UI testing
- Form submissions and validation feedback
- Real-time features (timers, auto-save)

**Location**: `tests/e2e/`

**Naming**: `{feature-name}.e2e.test.ts`

### 5.4 Security Tests
- Permission boundary testing
- RBAC enforcement across all endpoints
- Input sanitization
- Token manipulation
- Rate limiting
- CSRF/XSS prevention

**Location**: `tests/security/`

### 5.5 Performance Tests
- API response time benchmarks
- Database query performance
- Concurrent user simulation
- AI queue throughput
- Large dataset handling

**Location**: `tests/performance/`

---

## 6. Test Coverage Requirements

| Category | Minimum Coverage | Target Coverage |
|---|---|---|
| **Shared Packages** (types, validation, permissions, engines) | 90% | 95% |
| **API Service Layer** | 85% | 90% |
| **API Controllers** | 80% | 85% |
| **API Middleware** | 90% | 95% |
| **Frontend Components** | 70% | 80% |
| **Frontend Pages** | 60% | 75% |
| **AI Server** | 75% | 85% |

---

## 7. Modularity Test Checklist (Applied Per Phase)

Every phase must pass these modularity checks:

```
[ ] Module has no direct imports from other module's internal files
[ ] Module communicates with other modules only through service interfaces
[ ] Module's database queries don't join tables owned by other modules
[ ] Module's types are defined in @repo/types (shared) or locally (private)
[ ] Module's validation uses @repo/validation schemas
[ ] Module's permissions use @repo/permissions constants
[ ] Module can be disabled/removed without compilation errors in other modules
[ ] Module's routes can be mounted at any base path
[ ] Module has its own test suite that runs independently
[ ] Module does not have circular dependencies with other modules
```

---

## 8. Upgrade Safety Tests

These tests ensure future phases don't break existing functionality:

### Regression Test Suite
- Run ALL previous phase tests when adding a new phase
- Database migrations must be forward-compatible
- API must maintain backward compatibility (no breaking changes to published endpoints)
- Published exam snapshot integrity verified after every schema change

### Schema Migration Tests
```
[ ] Migration runs successfully on empty database
[ ] Migration runs successfully on populated database
[ ] Migration is reversible (down migration works)
[ ] Existing data preserved after migration
[ ] New columns have defaults or are nullable
[ ] No data loss in migration
```

---

## 9. Test Data Strategy

### Seed Data
```typescript
// Standard test fixtures per phase
const TEST_USERS = {
  mainAdmin:   { email: 'admin@test.com',   role: 'MAIN_ADMIN' },
  subAdmin:    { email: 'sub@test.com',      role: 'SUB_ADMIN' },
  teacher:     { email: 'teacher@test.com',  role: 'TEACHER' },
  student:     { email: 'student@test.com',  role: 'STUDENT' },
  student2:    { email: 'student2@test.com', role: 'STUDENT' },
};

const TEST_COURSE = {
  name: 'Class 12 Physics',
  code: 'PHY12',
  subjects: ['Mechanics', 'Thermodynamics', 'Optics'],
};
```

### Factory Pattern
```typescript
// Each module provides a test factory
const factory = createTestFactory(prisma);
const user = await factory.user.create({ role: 'TEACHER' });
const course = await factory.course.create({ teacherId: user.id });
const question = await factory.question.create({ courseId: course.id, type: 'MCQ' });
```

---

## 10. CI/CD Test Pipeline

```yaml
Pipeline:
  1. Lint & Type Check (parallel)
     - pnpm turbo lint
     - pnpm turbo type-check
  
  2. Unit Tests (parallel per package)
     - packages/types
     - packages/validation
     - packages/permissions
     - packages/question-types
     - packages/exam-engine
     - packages/mastery-engine
     - packages/entitlement-engine
     
  3. Integration Tests (sequential, needs DB)
     - Start test database
     - Run migrations
     - Run API integration tests
     
  4. E2E Tests (sequential, needs full stack)
     - Start API server
     - Start frontend
     - Run Playwright tests
     
  5. Coverage Report
     - Merge coverage from all test runs
     - Fail if below minimum thresholds
```

---

## 11. Phase-Specific Test Focus

| Phase | Primary Test Focus |
|---|---|
| **1. Foundation** | Auth flows, RBAC enforcement, user lifecycle, audit integrity |
| **2. Academic Structure** | Tree CRUD, hierarchy integrity, ordering, enrollment |
| **3. Question Bank** | Type pluggability, versioning isolation, lifecycle transitions |
| **4. Exam Pattern** | Section math, distribution validation, pattern-bank compatibility |
| **5. Exam Generator** | Balancing algorithms, duplicate prevention, constraint satisfaction |
| **6. Exam System** | Timer accuracy, auto-save reliability, evaluation correctness |
| **7. Exam Archive** | Snapshot immutability, historical integrity, file storage |
| **8. Student Analytics** | Mastery calculation accuracy, threshold mapping, aggregate correctness |
| **9. Personalized Practice** | Weakness targeting, mastery confirmation with diverse questions |
| **10. Preview System** | Impersonation context, entitlement simulation, audit trail |
| **11. AI Questions** | Gateway routing, model replaceability, output validation, queue priority |
| **12. AI Interview** | Conversation flow, state machine, STT/TTS integration, rubric evaluation |
| **13. Subscriptions** | Entitlement enforcement, credit tracking, plan transitions |
| **14. Production** | Security penetration, performance benchmarks, recovery procedures |

---

## 12. Test Commands

```bash
# Run all tests
pnpm turbo test

# Run specific package tests
pnpm --filter @repo/permissions test
pnpm --filter @repo/exam-engine test

# Run API tests
pnpm --filter api test

# Run specific module tests
pnpm --filter api test -- --grep "auth"

# Run integration tests only
pnpm --filter api test:integration

# Run E2E tests
pnpm --filter web test:e2e

# Run with coverage
pnpm turbo test -- --coverage

# Run in watch mode (development)
pnpm --filter api test -- --watch

# Run AI server tests
cd apps/ai-server && uv run pytest
```
