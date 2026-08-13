<Student Enrollment — Functional Specification>
## 1. Overview
The Student Enrollment module manages the relationship between students and courses. It dictates which educational content, syllabi, and exams a student has access to. The module supports individual and bulk enrollments, tracks enrollment lifecycle statuses (Active, Completed, Dropped, Suspended), and maintains a historical record of a student's academic journey on the platform.

## 2. User Stories
- As a Main Admin, I want to enroll students into courses individually or in bulk via CSV upload so that they can start learning.
- As a Teacher, I want to view the list of students enrolled in my courses to monitor their progress.
- As a Student, I want to see my enrolled courses on my dashboard so that I know what to study.
- As an Admin, I want to suspend or drop a student's enrollment if they leave the program.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| View Enrollments | ✅ | ✅ | ✅ (Own courses) | ✅ (Own) | ✅ (Own) |
| Enroll Student | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Bulk Enroll (CSV) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change Status | ✅ | ✅ | ❌ | ❌ | ❌ |
| Unenroll Student | ✅ | ✅ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Student Enrollment Process
**What it does**: Associates a user (student) with a course.
**How it works**:
- Admin selects a course and searches for students to add, or navigates to a student profile and assigns courses.
- The system creates an enrollment record with a start date (defaults to today) and an ACTIVE status.
- Once enrolled, the student sees the course on their dashboard and can access assigned exams.
**Business Rules**: A student cannot be actively enrolled in the same course twice simultaneously.
**Edge Cases**: Enrolling a student in an ARCHIVED course is blocked.

### 4.2 Bulk Enrollment
**What it does**: Enrolls multiple students at once using a file upload.
**How it works**:
- Admin uploads a CSV containing Student Emails/IDs and Course Codes.
- The system parses the file, validates users and courses, and processes enrollments asynchronously.
- A report is generated showing successes and failures.
**Business Rules**: CSV must follow a strict template. Missing users or courses trigger row-level errors.
**Edge Cases**: Uploading a file with 10,000 rows is handled via background job with progress polling.

### 4.3 Enrollment Lifecycle & Status
**What it does**: Tracks the state of the enrollment over time.
**How it works**:
- **ACTIVE**: Student has full access.
- **COMPLETED**: Student finished the course (can view history but not take new exams).
- **DROPPED**: Student left the course (access revoked, history kept).
- **SUSPENDED**: Temporary hold on access (e.g., pending payment).
**Business Rules**: Changing status to DROPPED or SUSPENDED immediately revokes access to active exams.
**Edge Cases**: Scheduled status changes (e.g., auto-complete based on end date).

### 4.4 Unenrollment & History
**What it does**: Removes a student from a course or views their past enrollments.
**How it works**:
- Instead of hard-deleting records, "unenrollment" usually means changing the status to DROPPED.
- Hard-deletion is only allowed if no exams were attempted.
- Enrollment history maintains a log of when statuses changed and by whom.
**Business Rules**: Retain all attempt history and analytics even if a student is unenrolled (soft delete).
**Edge Cases**: Re-enrolling a previously dropped student restores their past progress.

## 5. Data Model
```
Table: enrollments
├── id (PK, CUID)
├── student_id (CUID, FK to users)
├── course_id (CUID, FK to courses)
├── status (Enum: ACTIVE, COMPLETED, DROPPED, SUSPENDED)
├── start_date (Date)
├── end_date (Date, Nullable)
├── enrolled_by (CUID, FK to users) — Who performed the enrollment
├── created_at (Timestamp)
└── updated_at (Timestamp)

Table: enrollment_history
├── id (PK, CUID)
├── enrollment_id (CUID, FK to enrollments)
├── previous_status (Enum)
├── new_status (Enum)
├── changed_by (CUID, FK to users)
├── reason (String)
└── changed_at (Timestamp)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/v1/enrollments` | List enrollments (filterable by course/student) | | `[EnrollmentObject]` | Bearer | Admin/Teacher |
| POST | `/api/v1/enrollments` | Enroll student | `{ studentId, courseId }` | `EnrollmentObject` | Bearer | Admin |
| POST | `/api/v1/enrollments/bulk` | Bulk enroll via CSV | `FormData (file)` | `JobStatusObject` | Bearer | Admin |
| PATCH | `/api/v1/enrollments/:id/status` | Update enrollment status | `{ status, reason }` | `EnrollmentObject` | Bearer | Admin |
| DELETE | `/api/v1/enrollments/:id` | Hard delete enrollment | | `SuccessMessage` | Bearer | Main Admin |
| GET | `/api/v1/students/:id/courses` | Get student's courses | | `[CourseObject]` | Bearer | Self/Admin |

## 7. UI Screens & Components
### Screen: Course Enrollment Roster
**URL**: `/admin/courses/:id/enrollments`
**Layout**: Data table listing all enrolled students, their status, enrollment date, and progress bar.
**Interactive Elements**: "Enroll Students" button (opens modal), CSV upload button, bulk action checkboxes (suspend, drop), status change dropdown on each row.
**States**: Empty state "No students enrolled yet", pagination controls.

### Screen: Student Dashboard (My Courses)
**URL**: `/student/dashboard`
**Layout**: Grid of course cards the student is actively enrolled in.
**Interactive Elements**: Clicking a card opens the course content/exam view. Filter for "Active" vs "Completed" courses.
**States**: Empty state with "You are not enrolled in any courses."

## 8. Business Rules
1. Students can only see exams and study materials for courses where their enrollment status is ACTIVE.
2. Dropping a student preserves all their exam results and analytics for historical reporting.
3. Bulk enrollment must gracefully handle partial failures (e.g., skip invalid rows, process valid ones, and report errors).
4. An enrollment's start date cannot be in the future without the status being PENDING (if PENDING status is adopted).

## 9. Validation Rules
- **Student ID**: Must reference a user with the 'Student' role.
- **Course ID**: Must reference a course with 'PUBLISHED' status.
- **Status transitions**: A hard deleted enrollment cannot be recovered.

## 10. Error Handling
- `409 Conflict`: If attempting to enroll a student in a course they are already active in.
- `404 Not Found`: If student or course ID does not exist during bulk upload.
- `403 Forbidden`: If a student attempts to access a course they are suspended from.

## 11. Integration Points
- **Course Management**: Validates course existence and status.
- **User Management**: Validates student identity and roles.
- **Exam Engine**: Enrollment filters the exams available to the student.

## 12. Configuration Options
- Enable/disable student self-enrollment (requires public catalog).
- Auto-complete enrollment based on end date or course completion criteria.

## 13. Future Enhancements
- Integration with payment gateways for paid course enrollments.
- Waitlist functionality for courses with capacity limits.
- Automated email notifications on enrollment status changes.
</Student Enrollment — Functional Specification>
