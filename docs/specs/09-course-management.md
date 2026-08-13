<Course Management — Functional Specification>
## 1. Overview
Course Management is the core organizational module of the Adaptive Examination & AI Learning Platform. It allows administrators and authorized teachers to create, configure, and manage courses (e.g., Class 10 Mathematics, Class 12 Physics). This module defines the high-level educational offerings, controls their lifecycle (Draft, Published, Archived), and establishes the foundational structure onto which subjects, syllabi, and student enrollments are attached.

## 2. User Stories
- As a Main Admin, I want to create new courses and define their subjects so that the platform can offer structured educational content.
- As a Sub-Admin, I want to manage course metadata and update course statuses to ensure the course catalog is accurate and up-to-date.
- As a Teacher, I want to view the details and structure of the courses I am assigned to so that I can align my teaching and assessments accordingly.
- As a Student, I want to see the courses I am enrolled in so that I can access relevant study materials and exams.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| View Course List | ✅ | ✅ | ✅ | ✅ (Own) | ✅ (Own) |
| View Course Details | ✅ | ✅ | ✅ | ✅ (Own) | ✅ (Own) |
| Create Course | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Course Info | ✅ | ✅ | ⚙️ (If assigned) | ❌ | ❌ |
| Change Course Status | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Course | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign Subjects | ✅ | ✅ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Course CRUD Operations
**What it does**: Allows creation, reading, updating, and deletion of course records.
**How it works**:
1. Admin navigates to the Course Management section and clicks "Create Course".
2. Admin provides the course name, code, description, level/class, duration, and uploads a thumbnail.
3. The system saves the course in DRAFT status.
4. Admin can later edit the details or delete the course if it's no longer needed.
**Business Rules**:
- Course code must be unique across the platform.
- Cannot delete a course if it has active or completed student enrollments.
**Edge Cases**: Attempting to create a course with an existing code returns a validation error.

### 4.2 Course Lifecycle Management
**What it does**: Manages the publication status of a course.
**How it works**:
- Courses start as DRAFT. In this state, they are invisible to students and teachers (unless specifically assigned for development).
- Once finalized, an admin changes the status to PUBLISHED. It is now active for enrollment and content delivery.
- When the course is obsolete, it is changed to ARCHIVED.
**Business Rules**:
- Only DRAFT courses can be deleted.
- ARCHIVED courses preserve all historical data (enrollments, exam results) but do not appear in active lists and prevent new enrollments.
- A PUBLISHED course cannot be reverted to DRAFT if students are actively enrolled.
**Edge Cases**: An admin accidentally archives an active course; the system must prompt for confirmation highlighting active enrollments.

### 4.3 Multi-Level Course Structuring
**What it does**: Supports distinct course variants based on academic levels.
**How it works**:
- Courses can be tagged or structured by level (e.g., "Class 10", "Undergraduate").
- This allows creating "Class 12 Mathematics" distinct from "Class 10 Mathematics".
**Business Rules**: Level categorization is mandatory during course creation.
**Edge Cases**: Standardizing naming conventions across different sub-admins.

### 4.4 Course-Subject Relationships
**What it does**: Links a course to multiple subjects (e.g., Class 12 Mathematics → Algebra, Geometry, Calculus).
**How it works**:
- Within the course editor, admins can add subjects to the course.
- This creates a one-to-many relationship (Course → Subjects).
**Business Rules**: A subject must belong to at least one course.
**Edge Cases**: A subject might be shared across multiple courses (e.g., "Basic English"). The system supports many-to-many or duplicates based on platform configuration.

## 5. Data Model
```
Table: courses
├── id (PK, CUID)
├── name (String) — E.g., "Class 12 Mathematics"
├── code (String) — Unique identifier, e.g., "MTH-12"
├── description (Text) — Detailed description of the course
├── level (String) — Academic level/class
├── thumbnail_url (String) — URL to the course image
├── duration_months (Int) — Expected duration of the course
├── status (Enum: DRAFT, PUBLISHED, ARCHIVED)
├── created_by (CUID, FK to users)
├── created_at (Timestamp)
└── updated_at (Timestamp)

Table: subjects
├── id (PK, CUID)
├── course_id (CUID, FK to courses)
├── name (String) — E.g., "Algebra"
├── code (String) — Unique identifier
├── description (Text)
├── created_at (Timestamp)
└── updated_at (Timestamp)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/v1/courses` | List all courses | | `[CourseObject]` | Bearer | Any |
| GET | `/api/v1/courses/:id` | Get course details | | `CourseObject` | Bearer | Any |
| POST | `/api/v1/courses` | Create new course | `CoursePayload` | `CourseObject` | Bearer | Admin |
| PUT | `/api/v1/courses/:id` | Update course | `CoursePayload` | `CourseObject` | Bearer | Admin |
| PATCH | `/api/v1/courses/:id/status` | Change course status | `{ status: "PUBLISHED" }` | `CourseObject` | Bearer | Admin |
| DELETE | `/api/v1/courses/:id` | Delete course | | `SuccessMessage` | Bearer | Main Admin |
| POST | `/api/v1/courses/:id/subjects` | Add subject to course | `SubjectPayload` | `SubjectObject` | Bearer | Admin |

## 7. UI Screens & Components
### Screen: Course List
**URL**: `/admin/courses`
**Layout**: Data grid showing course name, code, level, subjects count, active enrollments, and status.
**Interactive Elements**: "Create Course" button, search bar, filters by status and level, row actions (Edit, View, Archive).
**States**: Loading spinner, empty state with "No courses found", paginated list.

### Screen: Course Detail / Editor
**URL**: `/admin/courses/:id`
**Layout**: Tabbed interface: "Basic Info", "Subjects", "Enrollments", "Settings".
**Interactive Elements**: Form fields for metadata, image upload widget, status toggle button, "Add Subject" modal trigger.
**States**: Validation error messages on form fields, success toast on save.

## 8. Business Rules
1. Course code must be unique and alphanumeric.
2. Only Main Admins can hard-delete courses.
3. Cannot delete courses with associated active enrollments.
4. Archiving a course hides it from new student discovery but retains access for currently enrolled students for historical purposes.

## 9. Validation Rules
- **Course Name**: Required, string, min 3 chars, max 100 chars.
- **Course Code**: Required, string, alphanumeric with hyphens, min 3 chars, max 20 chars.
- **Duration**: Optional, positive integer.
- **Status Transition**: Cannot go from ARCHIVED to DRAFT.

## 10. Error Handling
- `400 Bad Request`: If validation fails (e.g., missing name).
- `409 Conflict`: If creating a course with a duplicate code.
- `403 Forbidden`: If a Teacher attempts to create a course.
- `409 Conflict`: If attempting to delete a course with enrollments.

## 11. Integration Points
- **Syllabus Management**: Courses act as the root node for syllabus trees.
- **Student Enrollment**: Students are enrolled at the course level.
- **Exam Engine**: Exams are linked to specific courses/subjects.

## 12. Configuration Options
- Allow/disallow Teachers to edit course descriptions (System Settings).
- Customizable academic levels (e.g., standard K-12 vs University semesters).

## 13. Future Enhancements
- Course templates to duplicate structures quickly.
- Public course catalog for self-registration.
- Course prerequisites (e.g., must complete Class 11 Math before Class 12 Math).
</Course Management — Functional Specification>
