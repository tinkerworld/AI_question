# Module Independence & API-First Specification

## Why This Matters

This platform is designed to be:

1. **Platform-agnostic** — Same API serves web, mobile, desktop, third-party, CLI
2. **Module-independent** — Any module can be extracted, replaced, or disabled
3. **AI-agnostic** — Any AI provider works through the gateway
4. **Upgradable** — New features never break existing features

---

## Module Independence Rules

### Rule 1: Every Module is a Mini-Application

```
Each module contains:
├── routes.ts          # HTTP route definitions
├── controller.ts      # Request handling (thin — delegates to service)
├── service.ts         # ALL business logic (testable without HTTP)
├── repository.ts      # ALL database access (Prisma queries)
├── validator.ts       # Request validation (Zod schemas)
├── types.ts           # Module-specific types
├── events.ts          # Events emitted and consumed
├── constants.ts       # Module constants
├── index.ts           # PUBLIC API (only this file can be imported by others)
└── __tests__/         # Module's own tests
```

### Rule 2: Public API Boundary

Each module exports ONLY through `index.ts`:

```typescript
// modules/questions/index.ts — This is the ONLY thing other modules can import

// Export the service interface (not the implementation)
export type { IQuestionService } from './questions.types';

// Export the service factory
export { createQuestionService } from './questions.service';

// Export types that other modules need
export type { Question, QuestionVersion, QuestionFilter } from './questions.types';

// Export the router for registration
export { questionRouter } from './questions.routes';
```

### Rule 3: Service Interface Contract

Modules interact through interfaces, not implementations:

```typescript
// Module defines its interface
interface IQuestionService {
  findById(id: string): Promise<Question>;
  findMany(filter: QuestionFilter): Promise<PaginatedResult<Question>>;
  create(data: CreateQuestionInput): Promise<Question>;
  getByIds(ids: string[]): Promise<Question[]>;
}

// Other modules depend on the interface
class ExamGeneratorService {
  constructor(
    private questionService: IQuestionService,  // Interface, not class
    private patternService: IPatternService,
  ) {}
}
```

### Rule 4: Event-Based Side Effects

When Module A's action needs to trigger something in Module B:

```typescript
// Module A (Exams) — emits event
async publishExam(examId: string) {
  const exam = await this.repo.publish(examId);
  
  // Emit event — Module A doesn't know or care who listens
  this.eventBus.emit('exam.published', {
    examId: exam.id,
    questionIds: exam.questionIds,
    courseId: exam.courseId,
    publishedBy: exam.publishedBy,
    publishedAt: new Date(),
  });
  
  return exam;
}

// Module B (Questions) — listens and reacts
this.eventBus.on('exam.published', async (data) => {
  await this.questionRepo.addExamHistory(data.questionIds, data.examId);
});

// Module C (Notifications) — also listens
this.eventBus.on('exam.published', async (data) => {
  await this.notifyEnrolledStudents(data.courseId, data.examId);
});

// Module D (Mastery) — also listens
this.eventBus.on('exam.published', async (data) => {
  // Update mastery tracking for new exam
});
```

### Rule 5: No Cross-Module Database Queries

```typescript
// ❌ WRONG: Exam module querying user table directly
const user = await prisma.user.findUnique({ where: { id: userId } });

// ✅ CORRECT: Exam module asks User module through interface
const user = await this.userService.findById(userId);

// ❌ WRONG: Cross-module JOIN
const result = await prisma.exam.findMany({
  include: { questions: { include: { tags: true } } }  // Crosses into questions module
});

// ✅ CORRECT: Compose from separate module calls
const exam = await this.examRepo.findById(examId);
const questions = await this.questionService.getByIds(exam.questionIds);
```

---

## API-First Design Rules

### Rule 1: API Is the Product

```
Frontend ──┐
Mobile ────┼──▶ REST API ──▶ Business Logic ──▶ Database
Desktop ───┤
CLI ───────┤
3rd Party ─┘
```

- ALL business logic lives in the API
- Frontend is a thin client that calls APIs
- Any platform can consume the same API
- API works perfectly without any frontend

### Rule 2: Consistent API Response Format

Every endpoint returns the same envelope:

```typescript
// Success
{
  "success": true,
  "data": { /* response payload */ },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",       // Machine-readable code
    "message": "Invalid input",        // Human-readable message
    "details": [                       // Field-level errors
      { "field": "email", "message": "Required" }
    ],
    "requestId": "req_abc123"          // For debugging
  }
}

// Single item (no pagination)
{
  "success": true,
  "data": { "id": "123", "name": "Physics" }
}
```

### Rule 3: API Versioning

```
/api/v1/users          # Current version
/api/v2/users          # Future version (when breaking changes needed)
```

- Breaking changes ONLY in new API version
- Old version remains supported during transition
- Version in URL path (not headers)

### Rule 4: Authentication is Stateless

```
Authorization: Bearer <JWT_ACCESS_TOKEN>

JWT Payload:
{
  "sub": "user_id_123",
  "email": "user@example.com",
  "roles": ["TEACHER"],
  "permissions": ["question.create", "exam.create"],
  "mode": "DIRECT",                    // or "PREVIEW" or "IMPERSONATE"
  "actorId": "user_id_456",           // Original user if impersonating
  "iat": 1723456789,
  "exp": 1723457689
}
```

- No server-side sessions required
- Any client platform can authenticate the same way
- Token contains everything needed for authorization

### Rule 5: API Completeness Checklist

For EVERY feature, ALL operations must be available via API:

```
✅ Create   →  POST   /api/v1/{resource}
✅ List     →  GET    /api/v1/{resource}?page=1&filter=value
✅ Get One  →  GET    /api/v1/{resource}/:id
✅ Update   →  PATCH  /api/v1/{resource}/:id
✅ Delete   →  DELETE /api/v1/{resource}/:id
✅ Search   →  GET    /api/v1/{resource}?search=query
✅ Filter   →  GET    /api/v1/{resource}?status=ACTIVE&role=TEACHER
✅ Sort     →  GET    /api/v1/{resource}?sort=createdAt&order=desc
✅ Paginate →  GET    /api/v1/{resource}?page=2&pageSize=20
✅ Bulk     →  POST   /api/v1/{resource}/bulk (where needed)
✅ Export   →  GET    /api/v1/{resource}/export?format=csv (where needed)
```

---

## Upgrade Safety Rules

### Rule 1: Database Migrations Are Additive

```sql
-- ✅ SAFE: Add new column with default
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL;

-- ✅ SAFE: Add new table
CREATE TABLE new_feature (...);

-- ❌ UNSAFE: Drop column that existing code uses
ALTER TABLE users DROP COLUMN old_field;

-- ❌ UNSAFE: Rename column (breaks existing queries)
ALTER TABLE users RENAME COLUMN name TO full_name;

-- ✅ SAFE approach for rename:
-- Step 1: Add new column
-- Step 2: Migrate data
-- Step 3: Update code to use new column
-- Step 4: Remove old column in next release
```

### Rule 2: API Changes Are Non-Breaking

```typescript
// ✅ SAFE: Add new optional field to response
// Before: { id, name, email }
// After:  { id, name, email, phone }  ← phone is new, existing clients ignore it

// ✅ SAFE: Add new optional parameter
// Before: GET /api/v1/users?page=1
// After:  GET /api/v1/users?page=1&status=ACTIVE  ← status is optional

// ❌ UNSAFE: Remove field from response
// ❌ UNSAFE: Change field type
// ❌ UNSAFE: Make optional parameter required
// ❌ UNSAFE: Change endpoint path
```

### Rule 3: Feature Flags for New Features

```typescript
// New features behind flags during rollout
const featureFlags = {
  AI_QUESTION_MODIFICATION: true,
  AI_INTERVIEW_V2: false,          // Not ready yet
  NEW_MASTERY_ALGORITHM: false,    // Testing
};

// Check in service layer
if (await featureFlags.isEnabled('AI_INTERVIEW_V2', userId)) {
  return this.interviewV2Service.start(request);
} else {
  return this.interviewV1Service.start(request);
}
```

---

## Module Extraction Checklist

When scale demands extracting a module to its own microservice:

```
1. Module already has its own:
   [x] Routes (Express Router)
   [x] Controller
   [x] Service
   [x] Repository
   [x] Tests

2. Change communication:
   [ ] Replace service function calls with HTTP API calls
   [ ] Replace event bus with message queue (Redis/RabbitMQ)

3. Add infrastructure:
   [ ] Separate database (or schema)
   [ ] Separate deployment
   [ ] Service discovery / API gateway

4. Nothing else changes:
   [x] Business logic unchanged
   [x] API contract unchanged
   [x] Tests still pass
   [x] Other modules unaffected
```

---

## Test Categories for Modularity Verification

| Test | What It Verifies |
|---|---|
| **Module Isolation Test** | Module's unit tests pass with ALL other modules mocked |
| **Import Boundary Test** | No internal imports across module boundaries |
| **API Contract Test** | API response format matches documented schema |
| **Event Contract Test** | Events emitted match documented schema |
| **Database Boundary Test** | No cross-module table access in queries |
| **Disable Module Test** | Removing module's routes doesn't break other modules |
| **Upgrade Test** | All previous tests pass after adding new features |
| **Platform Test** | API works correctly when called from non-browser client |
