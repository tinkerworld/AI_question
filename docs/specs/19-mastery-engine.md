<Mastery Engine & Student Analytics — Functional Specification>
## 1. Overview
The Mastery Engine is the core analytics component that tracks student proficiency across subjects, topics, subtopics, and concepts. By continuously analyzing attempt history and weighting recent performance, it identifies precise strengths and weaknesses, enabling targeted interventions and personalized learning pathways.

## 2. User Stories
- As a **Student**, I want to see my proficiency map so that I know exactly which concepts I have mastered and which need more practice.
- As a **Student**, I want the system to highlight my strengths and weaknesses so that I can focus my study time effectively.
- As a **Teacher**, I want to view class-level mastery analytics so that I can identify commonly weak topics and adjust my lesson plans.
- As an **Admin**, I want to configure the proficiency thresholds so that the grading aligns with our institution's standards.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Own Mastery Dashboard | ❌ | ❌ | ❌ | ✅ | ❌ |
| View Class/Student Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configure Thresholds | ✅ | ⚙️ | ❌ | ❌ | ❌ |
| Recalculate Mastery Scores | ✅ | ❌ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Proficiency Tracking Levels
**What it does**: Tracks performance hierarchically.
**How it works**: Scores are calculated at the Concept level (base). Subtopic scores are aggregated from Concepts; Topic scores from Subtopics; Subject scores from Topics.
**Business Rules**: A concept must have a minimum number of attempts (e.g., 3) before a valid proficiency score is confidently established.

### 4.2 Numerical Score Calculation
**What it does**: Computes a proficiency score (0-100) based on attempt history.
**How it works**: Uses a weighted scoring model where recent attempts carry more weight than older ones (e.g., Exponential Moving Average or a discrete recency weighting formula).
**Business Rules**: 
- Correct answer = 100% for that attempt.
- Incorrect answer = 0% for that attempt.
- Partial marks (if applicable) = proportional percentage.
**Edge Cases**: Unattempted questions do not negatively impact the score; they are ignored until attempted.

### 4.3 Color/Status Mapping
**What it does**: Translates numerical scores into intuitive visual indicators.
**How it works**: Maps the score to a status:
- GREEN = Mastered (>85%)
- BLUE = Strong (70-85%)
- YELLOW = Developing (50-70%)
- ORANGE = Needs Practice (30-50%)
- RED = Weak (<30%)
- GREY = Not Attempted
**Business Rules**: These threshold percentages are configurable by Admins. Students only see colors/labels, while internal systems and teachers can view the exact numerical scores.

### 4.4 Strengths and Weaknesses Identification
**What it does**: Automatically categorizes topics based on performance trends.
**How it works**: 
- **Strengths**: Concepts/Topics consistently scoring >85%.
- **Weaknesses**: Concepts/Topics scoring <50%, ranked by severity (lowest score first) and frequency of testing.
**Business Rules**: Declining performance (e.g., dropping from Blue to Yellow) triggers an early warning for weakness identification.

### 4.5 Syllabus Proficiency Map
**What it does**: Provides a visual overview of the entire syllabus.
**How it works**: A tree-view or heat-map UI overlaying the course syllabus with the corresponding status colors for every node (Subject -> Topic -> Concept).

## 5. Data Model
```text
Table: student_mastery
├── id (PK, CUID)
├── student_id (FK, CUID)
├── entity_type (Enum: SUBJECT, TOPIC, SUBTOPIC, CONCEPT)
├── entity_id (FK, CUID)
├── proficiency_score (Decimal) — 0 to 100
├── status_label (String) — e.g., MASTERED, WEAK
├── total_attempts (Integer)
├── last_attempt_at (DateTime)
└── timestamps

Table: student_attempt_history
├── id (PK, CUID)
├── student_id (FK, CUID)
├── concept_id (FK, CUID)
├── question_id (FK, CUID)
├── is_correct (Boolean)
├── marks_obtained (Decimal)
├── attempted_at (DateTime)
└── timestamps

Table: mastery_thresholds
├── id (PK, CUID)
├── institution_id (FK, CUID)
├── label (String)
├── min_score (Decimal)
├── max_score (Decimal)
├── color_code (String)
└── timestamps
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/analytics/mastery/map` | Get syllabus proficiency map | None | `200 OK, Tree JSON` | Bearer | Student/Teacher |
| GET | `/api/analytics/mastery/strengths` | Get top strengths | None | `200 OK, List[Concepts]` | Bearer | Student/Teacher |
| GET | `/api/analytics/mastery/weaknesses` | Get top weaknesses | None | `200 OK, List[Concepts]` | Bearer | Student/Teacher |
| GET | `/api/analytics/class/{id}/mastery` | Get aggregate class mastery | None | `200 OK, Aggregated Data`| Bearer | Teacher/Admin |
| PUT | `/api/admin/mastery/thresholds` | Update score thresholds | `Threshold Array`| `200 OK` | Bearer | Admin |

## 7. UI Screens & Components
### Screen: Student Analytics Dashboard
**URL**: `/student/analytics`
**Layout**: High-level summary widgets (Overall Mastery %, Total Attempts). Two main panels: "Top Strengths" and "Areas for Improvement (Weaknesses)". A historical trend chart showing score progression over time.
**Interactive Elements**: Time-range filter (Last 7 days, 30 days, All time), Drill-down clicks on weaknesses to practice.
**States**: Loading, empty (no data yet), populated.

### Screen: Syllabus Proficiency Map
**URL**: `/student/analytics/syllabus`
**Layout**: Expandable tree-view of the syllabus. Each node (Subject, Topic, Concept) has a colored badge indicating mastery status.
**Interactive Elements**: Expand/collapse nodes, hover tooltips for exact status labels.

### Screen: Class Mastery Report
**URL**: `/teacher/classes/{id}/analytics`
**Layout**: Heatmap showing students (rows) and Topics (columns). Cells colored by mastery status.
**Interactive Elements**: Sorting by weakest topics, exporting report to CSV/PDF.

## 8. Business Rules
1. Mastery scores are asynchronously recalculated whenever a student submits an exam or practice session.
2. Recent attempts carry a higher weight (e.g., 60% weight to the last 3 attempts, 40% to all previous) to reflect current understanding.
3. Threshold labels must be consistent across the entire platform.
4. Students only see qualitative labels and colors, not raw numerical scores.

## 9. Validation Rules
- **Threshold Configuration**: Must cover 0-100 without gaps or overlaps. Min score must be less than Max score.

## 10. Error Handling
- **404 Not Found**: Attempting to view analytics for a non-existent student or class.
- **403 Forbidden**: Student trying to view another student's data.

## 11. Integration Points
- **Exam Evaluation Engine**: Pushes attempt data to `student_attempt_history` upon submission.
- **Personalized Practice Engine**: Reads from `student_mastery` to generate targeted practice sets.

## 12. Configuration Options
- **Weighting Formula**: Admin can choose between Simple Average, Weighted Recency, or Exponential Decay for score calculation.
- **Threshold Bands**: Customize the ranges for Mastered, Strong, Developing, Needs Practice, Weak.

## 13. Future Enhancements
- Predictive analytics to forecast exam scores based on current mastery levels.
- Peer comparison percentiles (anonymous).
</Mastery Engine & Student Analytics — Functional Specification>
