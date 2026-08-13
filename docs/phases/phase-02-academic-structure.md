# Phase 2 — Academic Structure

## Overview
This phase establishes the foundational academic hierarchy for the Adaptive Examination & AI Learning Platform. It builds the system required to manage courses, subjects, and a deeply hierarchical syllabus (Units, Topics, Subtopics, Concepts), as well as handles student course enrollments. This modular structure will serve as the backbone for the question bank, examinations, and adaptive learning features in subsequent phases.

## Prerequisites
- Phase 1 (Foundation & Core Services) completed and deployed to development.
- Authentication, Authorization (RBAC), and basic user management are operational.
- Core database schema setup with Prisma and PostgreSQL.
- Base Next.js frontend structure and shared UI components available.

## Features

### Feature 2.1 — Course Management

#### Description
Provides the ability to create, read, update, and delete courses, including handling multi-level courses (e.g., Class 10, Class 12) and their lifecycle statuses.

#### Sub-Features
- Course CRUD operations.
- Fields: name, code, description, status (DRAFT, PUBLISHED, ARCHIVED), thumbnail URL, duration.
- Lifecycle management (DRAFT -> PUBLISHED -> ARCHIVED).
- Enrollment rules and prerequisite configurations.
- Pagination, search, and filtering of courses.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/courses` | Create a new course | Yes (Admin) |
| GET | `/api/courses` | List courses (paginated, filterable) | Yes (All) |
| GET | `/api/courses/:id` | Get course details | Yes (All) |
| PATCH | `/api/courses/:id` | Update course details / status | Yes (Admin) |
| DELETE | `/api/courses/:id` | Delete or archive a course | Yes (Admin) |

#### Database Changes
- `Course` model: `id`, `name`, `code`, `description`, `status`, `thumbnailUrl`, `durationMonths`, `createdAt`, `updatedAt`, `createdById`.

#### Frontend Pages/Components
- **Course List Page**: Table/Grid view with search, filters (status), and pagination.
- **Course Form Component**: Reusable form for creating and editing courses.
- **Course Detail View**: Displays course info, associated subjects, and enrollment rules.

#### Acceptance Criteria
1. Admins can create courses with a unique code.
2. Courses can be transitioned between DRAFT, PUBLISHED, and ARCHIVED.
3. Students can only view PUBLISHED courses.
4. Courses can be searched by name or code and filtered by status.
5. Thumbnail upload logic must validate image formats and sizes.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F01.U001 | Create Course Success | Validates course creation with all fields | Valid course payload | Course object with ID | High |
| P02.F01.U002 | Create Course Duplicate Code | Prevents creation with existing code | Payload with existing code | 400 Bad Request error | High |
| P02.F01.U003 | Update Course Status | Validates state machine rules for status | Transition DRAFT to PUBLISHED | Updated course object | High |
| P02.F01.U004 | Invalid Status Transition | Prevents invalid transitions | Transition ARCHIVED to DRAFT | 400 Bad Request error | Medium |
| P02.F01.U005 | Delete Course (No Dependencies) | Successfully deletes an empty course | Valid course ID | 200 OK | Medium |
| P02.F01.U006 | Archive Course | Sets status to ARCHIVED | Valid course ID | Course status is ARCHIVED | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P02.F01.I001 | Course Creation API | Full API request to create course | Mock Admin Auth | Call POST `/api/courses` with valid data | 201 Created + DB record | High |
| P02.F01.I002 | RBAC Course Access | Ensure students cannot create courses | Mock Student Auth | Call POST `/api/courses` | 403 Forbidden | High |
| P02.F01.I003 | Course Search Integration | Search courses by partial name | DB seeded with courses | Call GET `/api/courses?search=math` | Matching courses returned | Medium |
| P02.F01.I004 | Filter Published Courses | Fetch only published courses | DB seeded with varied statuses | Call GET `/api/courses?status=PUBLISHED` | Only published courses | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F01.E001 | Admin Course Lifecycle | End-to-end course creation to publish | 1. Login Admin 2. Go to Courses 3. Create course 4. Publish course | Course appears in published list | High |
| P02.F01.E002 | Student View | Student browsing courses | 1. Login Student 2. Go to catalog | Only sees published courses | High |

### Feature 2.2 — Subject Management

#### Description
Manages subjects that are linked to specific courses, allowing multiple subjects per course.

#### Sub-Features
- Subject CRUD operations.
- Linking subject to a specific course.
- Fields: name, code, description, credits/weightage, order.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/courses/:courseId/subjects` | Create subject under a course | Yes (Admin) |
| GET | `/api/courses/:courseId/subjects` | List subjects for a course | Yes (All) |
| GET | `/api/subjects/:id` | Get subject details | Yes (All) |
| PATCH | `/api/subjects/:id` | Update subject | Yes (Admin) |
| DELETE | `/api/subjects/:id` | Delete subject | Yes (Admin) |

#### Database Changes
- `Subject` model: `id`, `courseId` (FK), `name`, `code`, `description`, `credits`, `order`, `createdAt`, `updatedAt`.

#### Frontend Pages/Components
- **Subject List Component**: Embedded within the Course Detail page.
- **Subject Form Modal/Drawer**: For adding/editing subjects in context.

#### Acceptance Criteria
1. A subject must be linked to a valid course.
2. Subject codes must be unique within a course.
3. Subjects can be ordered within a course.
4. Deleting a subject deletes or orphans its syllabus tree (depending on strategy).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F02.U001 | Create Subject Valid | Success case | Valid payload + courseId | Subject object | High |
| P02.F02.U002 | Duplicate Subject Code | Same code in same course | Payload with existing code | 400 Bad Request error | High |
| P02.F02.U003 | Same Code Different Course | Same code across different courses | Payload with code from other course | Subject object | Medium |
| P02.F02.U004 | Update Subject Details | Valid update | ID + new name | Updated subject | High |
| P02.F02.U005 | Delete Subject | Valid deletion | Valid ID | 200 OK | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P02.F02.I001 | Subject List by Course | Fetch subjects for a specific course | Course with 3 subjects | GET `/api/courses/:id/subjects` | Array of 3 subjects | High |
| P02.F02.I002 | Create Subject Missing Course | Try to add to non-existent course | No course | POST to `/api/courses/999/subjects` | 404 Not Found | Medium |
| P02.F02.I003 | RBAC Subject Editing | Teacher tries to edit subject | Mock Teacher Auth | PATCH `/api/subjects/:id` | Success or 403 (based on specific rules) | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F02.E001 | Manage Subjects Flow | Admin adds subjects to course | 1. Go to Course X 2. Add Subject A 3. Add Subject B 4. Edit Subject A | Both subjects visible and updated correctly | High |

### Feature 2.3 — Syllabus Tree (Hierarchical)

#### Description
A comprehensive recursive tree structure representing the syllabus: Unit -> Topic -> Subtopic -> Concept.

#### Sub-Features
- CRUD for syllabus nodes.
- Adjacency list pattern (parentId).
- Depth tracking and validation (max depth).
- Ordering within siblings (`orderIndex`).
- Reordering API (drag-and-drop support).
- Fetching full or partial tree efficiently.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/subjects/:subjectId/syllabus` | Create a node (root or child) | Yes (Admin/Teacher) |
| GET | `/api/subjects/:subjectId/syllabus` | Get flat list of nodes | Yes (All) |
| GET | `/api/subjects/:subjectId/syllabus/tree` | Get nested tree structure | Yes (All) |
| PATCH | `/api/syllabus/:id` | Update node | Yes (Admin/Teacher) |
| PATCH | `/api/syllabus/:id/reorder` | Update parentId and/or orderIndex | Yes (Admin/Teacher) |
| DELETE | `/api/syllabus/:id` | Delete node (and children) | Yes (Admin/Teacher) |

#### Database Changes
- `SyllabusNode` model: `id`, `subjectId` (FK), `parentId` (FK, self-referencing), `title`, `type` (UNIT, TOPIC, SUBTOPIC, CONCEPT), `orderIndex`, `depth`.
- Enums: `SyllabusNodeType`.

#### Frontend Pages/Components
- **Syllabus Tree Builder**: Interactive, collapsible tree view component.
- **Node Context Menu**: Add child, edit, delete.
- **Drag-and-Drop Wrapper**: For reordering nodes visually.

#### Acceptance Criteria
1. Nodes can be deeply nested but restricted by a max depth (e.g., 4 levels).
2. Deleting a node recursively deletes its children (or marks them as archived).
3. The reorder API must handle moving a node to a different parent and recalculating depths.
4. Fetching the tree should be performant (e.g., using recursive CTEs or assembled in memory from a flat query).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F03.U001 | Create Root Node | Creates a Unit node | Payload (no parentId) | Node with depth 0 | High |
| P02.F03.U002 | Create Child Node | Creates a Topic under a Unit | Payload + parentId | Node with depth 1 | High |
| P02.F03.U003 | Max Depth Validation | Prevents exceeding depth limit | Child under max depth node | 400 Bad Request error | High |
| P02.F03.U004 | Reorder Sibling Nodes | Changes orderIndex | New orderIndex | Node saved with new index | High |
| P02.F03.U005 | Move to New Parent | Changes parentId | New parentId | Node updated, depth recalculated | High |
| P02.F03.U006 | Detect Cyclic Parent | Prevents setting node as child of itself | parentId = self.id | 400 Bad Request error | High |
| P02.F03.U007 | Delete Node Cascades | Deleting parent removes children | Parent ID | Parent & children deleted/archived | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P02.F03.I001 | Fetch Full Tree | Retrieve entire syllabus tree | Seed 3 levels of nodes | GET `/api/subjects/:id/syllabus/tree` | Properly nested JSON tree | High |
| P02.F03.I002 | Reorder API Integration | Move node between parents | Seed tree | PATCH `/api/syllabus/:id/reorder` with target parent | Node moved, siblings re-indexed | High |
| P02.F03.I003 | Delete Hierarchy API | Delete Unit and check Topics | Seed tree | DELETE `/api/syllabus/:unitId` | Topics no longer fetchable | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F03.E001 | Tree Builder Interaction | Full tree creation and reorder | 1. Add Unit 2. Add Topic 3. Add Subtopic 4. Drag Subtopic to another Unit | UI reflects changes immediately, persists on reload | High |

### Feature 2.4 — Syllabus Node Metadata

#### Description
Augments syllabus nodes with rich metadata, descriptions, learning objectives, estimated hours, and tags.

#### Sub-Features
- Rich text descriptions and objectives.
- Node-level status (DRAFT, PUBLISHED).
- Estimated completion hours (rolls up to parent nodes).
- Tagging system for categorizing content.

#### API Endpoints
- Handled via the main `SyllabusNode` endpoints (PUT/PATCH `/api/syllabus/:id`).
- (Optional) `GET /api/v1/tags` for auto-complete.

#### Database Changes
- `SyllabusNode` updates: add `description`, `learningObjectives` (JSON/text), `estimatedMinutes` (Int), `status`.
- `Tag` model (if normalized) and `SyllabusNodeTag` join table, or simple `tags` scalar list array.

#### Frontend Pages/Components
- **Node Metadata Panel**: A side drawer or expandable form for editing a node's extended properties.
- **Rich Text Editor Component**: For descriptions and objectives.
- **Tag Input**: Multi-select or token input component.

#### Acceptance Criteria
1. Metadata fields are optional but validated for length/format when provided.
2. Draft nodes are not visible to students, even if the subject is published.
3. Estimated hours can be aggregated at the Subject/Course level.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F04.U001 | Update Node Metadata | Add description and objectives | Valid metadata payload | Node updated | High |
| P02.F04.U002 | Validate Est. Minutes | Negative minutes validation | estimatedMinutes: -10 | 400 Validation Error | Medium |
| P02.F04.U003 | Tag Assignment | Add multiple tags | tags: ['math', 'algebra'] | Node saved with tags | Medium |
| P02.F04.U004 | Metadata Filtering | Filter nodes by tags | tag: 'algebra' | Matching nodes returned | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P02.F04.I001 | Rollup Estimation | Aggregate time | Seed tree with times | DB Query for rollup | Correct sum of minutes | Medium |
| P02.F04.I002 | Draft Node Visibility | Student fetches tree | Seed tree (mix statuses) | Student GET tree | Only PUBLISHED nodes returned | High |

### Feature 2.5 — Course-Subject-Syllabus Frontend

#### Description
The complete administrative UI to manage the academic structure, bringing together courses, subjects, and the syllabus builder.

#### Sub-Features
- Central `/admin/courses` listing.
- Deep linkable `/admin/courses/[id]` detail view.
- Expandable/collapsible syllabus tree view.
- Drag-and-drop operations using a library (e.g., `dnd-kit` or `react-beautiful-dnd`).
- Breadcrumb navigation.

#### API Endpoints
- Consumes APIs from 2.1, 2.2, 2.3, 2.4.

#### Frontend Pages/Components
- **Admin Layout**: Shared sidebar/header.
- **Breadcrumb Component**: `Courses > Class 10 > Mathematics > Algebra`.
- **Tree Node Item**: Custom UI for syllabus node indicating type, status, and drag handle.

#### Acceptance Criteria
1. UI is fully responsive.
2. Drag-and-drop provides visual feedback during dragging and updates optimistically.
3. Errors during API calls revert optimistic UI changes.
4. Breadcrumbs accurately reflect the current navigation depth.

#### Test Cases

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F05.E001 | Full Academic Creation | Create Course -> Subject -> Syllabus | 1. Create Course 2. Add Subject 3. Build Tree | Everything saved and visible | High |
| P02.F05.E002 | Breadcrumb Navigation | Navigating deep hierarchy | 1. Click Course 2. Click Subject 3. View Breadcrumbs | Breadcrumbs match path | Medium |
| P02.F05.E003 | Drag-and-Drop Error Recovery | Network error during drag | 1. Intercept network 2. Drag node | Node snaps back, error toast shown | High |

### Feature 2.6 — Student Course Enrollment

#### Description
Manages the relationship between students and courses, allowing enrollment, unenrollment, and viewing enrolled courses.

#### Sub-Features
- Enrollment records tracking.
- Admin/Teacher can batch enroll or single enroll students.
- Student dashboard showing active enrollments.
- Prevention of duplicate enrollments.

#### API Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/enrollments` | Enroll user in a course | Yes (Admin/User) |
| DELETE | `/api/enrollments` | Unenroll user | Yes (Admin/User) |
| GET | `/api/students/:id/courses` | List courses for student | Yes (Self/Admin) |

#### Database Changes
- `Enrollment` model: `id`, `userId` (FK), `courseId` (FK), `status` (ACTIVE, COMPLETED, DROPPED), `enrolledAt`, `completedAt`.

#### Frontend Pages/Components
- **Student Dashboard**: Grid of enrolled courses with progress indicators (mocked for now).
- **Admin Enrollment Modal**: Search students and assign to course.

#### Acceptance Criteria
1. A student cannot be enrolled in the same course twice (unique constraint on userId + courseId).
2. Enrolling a student allows them access to course materials.
3. Admins can view all students enrolled in a specific course.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P02.F06.U001 | Create Enrollment | Valid enrollment | userId, courseId | Enrollment object | High |
| P02.F06.U002 | Duplicate Enrollment | Enroll again | Existing userId/courseId | 400/409 Conflict | High |
| P02.F06.U003 | Drop Course | Update status | enrollment ID | Status changed to DROPPED | Medium |
| P02.F06.U004 | List Enrollments | Get user courses | userId | Array of course data | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P02.F06.I001 | Student Self-Enroll | Student enrolls | Mock Student Auth | POST `/api/enrollments` | 201 Created | High |
| P02.F06.I002 | Enrolled Course Access | Access private syllabus | Mock Student | GET course details | Returns 200 OK | High |
| P02.F06.I003 | Unenrolled Course Access | Access un-enrolled course | Mock Student | GET course details | Returns 403 Forbidden | High |

## Modularity Checklist
- [x] All business logic in service layer (not controllers)
- [x] No cross-module direct database access
- [x] Shared types used from `@repo/types`
- [x] Validation schemas in `@repo/validation`
- [x] Module can be extracted to microservice without code changes in other modules
- [x] All dependencies injected, not imported directly
- [x] Feature flags / config for optional features

## Upgrade Path
Completion of Phase 2 establishes the core taxonomic structure of the application. 
- **Phase 3 (Question Bank):** Will directly link Questions to `SyllabusNode` IDs. The syllabus tree will provide the context for tagging questions.
- **Phase 4 (Examinations):** Blueprints for exams will define rules based on the `SyllabusTree` (e.g., "Select 5 questions from Unit 1, 10 questions from Topic 2").
- **Phase 5 (Adaptive Learning):** Will utilize the hierarchical tree and node metadata (estimated hours, learning objectives) to recommend pathways and remedial topics.

## Definition of Done
- Database migrations for Course, Subject, SyllabusNode, and Enrollment are applied successfully in testing/dev environments.
- All API endpoints documented in Swagger/OpenAPI.
- Unit test coverage > 80% for all services in this module.
- All integration and E2E tests passing.
- Frontend UI components implemented, responsive, and hooked up to the API.
- Code reviewed and approved by at least one other senior developer.


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 09: Course Management](../specs/09-course-management.md)
- [Spec 10: Syllabus Management](../specs/10-syllabus-management.md)
- [Spec 11: Student Enrollment](../specs/11-student-enrollment.md)
- [Spec 29: Entity Versioning & Rollback Engine](../specs/29-entity-versioning-rollback.md)

### Key Team Role Guidelines
- [Backend Engineer](../roles/16-backend-engineer.md) — Features 2.1, 2.2, 2.3, 2.4, 2.6
- [Frontend Engineer](../roles/15-frontend-engineer.md) — Feature 2.5
- [Data Architect](../roles/25-data-architect.md) — Schema hierarchy design
- [UX Designer](../roles/09-ux-designer.md) — Syllabus tree UI design

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [API Reference Catalog](../guides/02-api-reference.md)
- [Coding Standards](../guides/03-coding-standards.md)