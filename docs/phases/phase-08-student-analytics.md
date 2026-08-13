# Phase 8 — Student Analytics
## Overview
This phase introduces the Student Analytics system, featuring a robust Mastery Engine. It tracks student proficiency across subjects, topics, and concepts based on historical attempt data. The system identifies strengths and weaknesses, visualizes syllabus coverage, and provides comprehensive dashboards for both students and teachers.

## Prerequisites
- Phase 7 (Published Exam Archive) complete.
- Student attempt and grading data available.
- Syllabus module (Course, Subject, Topic hierarchies) active.

## Features

### Feature 8.1 — Mastery Engine (@repo/mastery-engine)

#### Description
An engine that calculates numerical proficiency scores at multiple syllabus levels (Subject, Topic, Subtopic, Concept) using weighted historical attempt data. Maps scores to color-coded mastery statuses.

#### Sub-Features
- Weighted score calculation (recent attempts carry higher weight).
- Configurable mastery thresholds.
- Color/status mapping: GREEN=Mastered, BLUE=Strong, YELLOW=Developing, ORANGE=Needs Practice, RED=Weak, GREY=Not Attempted.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/students/:id/mastery` | Get mastery scores/status | Student (self), Teacher, Admin |

#### Database Changes (if applicable)
- `student_mastery_scores`: table storing calculated scores (student_id, node_id, node_type, score, status, updated_at).

#### Frontend Pages/Components (if applicable)
- Mastery Score Badges (reusable component).

#### Acceptance Criteria
1. Engine correctly aggregates scores up the syllabus tree (Concept -> Topic -> Subject).
2. Recent attempts are weighted more heavily than older ones.
3. Scores accurately map to the correct color/status thresholds.
4. Mastery data is accessible via API.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F01.U001 | Score Calculation | Test raw score math | Array of attempt scores | Correct weighted average | High |
| P08.F01.U002 | Time Weighting | Test recent bias | Old attempt vs New attempt | New attempt impacts score more | High |
| P08.F01.U003 | Threshold Mapping | Test score to color map | Score: 95 | Status: GREEN | High |
| P08.F01.U004 | Threshold Mapping 2 | Test score to color map | Score: 40 | Status: RED | High |
| P08.F01.U005 | Tree Aggregation | Test roll-up logic | Concept scores | Correct Topic score | High |
| P08.F01.U006 | No Attempts | Test default state | Empty attempt list | Status: GREY | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P08.F01.I001 | Engine Execution | Test full calculation pipeline | Seed DB with attempts | Run mastery engine job | DB updated with correct scores/statuses | High |
| P08.F01.I002 | API Retrieval | Test GET endpoint | DB with mastery data | Call GET API | Correct nested JSON returned | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F01.E001 | Take Exam to Mastery | E2E flow impacting mastery | Note initial mastery -> Complete exam -> Re-check mastery | Mastery score updates based on performance | High |

### Feature 8.2 — Strengths Identification

#### Description
Analyzes mastery data to identify and rank topics where the student consistently performs well (GREEN/BLUE statuses).

#### Sub-Features
- Filtering by minimum attempt threshold to ensure confidence.
- Ranking algorithm based on score and consistency.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/students/:id/strengths` | List top strength topics | Student (self), Teacher |

#### Database Changes (if applicable)
- None directly (derived from mastery scores).

#### Acceptance Criteria
1. Only returns topics meeting the minimum attempt threshold.
2. Topics are accurately ranked by strength/confidence.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F02.U001 | Min Attempt Filter | Test threshold logic | High score, 1 attempt | Excluded from strengths | High |
| P08.F02.U002 | Ranking Algorithm | Test sorting | Multiple high score topics | Sorted by score/confidence desc | High |
| P08.F02.U003 | Empty Strengths | Test behavior when no strengths | All low scores | Empty list returned | Medium |
| P08.F02.U004 | Status Filtering | Ensure only GREEN/BLUE | Mixed status data | Only GREEN/BLUE returned | High |
| P08.F02.U005 | Tie Breaker | Test ranking tie breaker | Equal scores | Sorted by attempt count desc | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P08.F02.I001 | API Strengths Fetch | Test endpoint integration | Populate DB | Call strengths API | Correct ranked array returned | High |

### Feature 8.3 — Weakness Identification

#### Description
Identifies topics where the student struggles (RED/ORANGE statuses), ranking them by severity and tracking persistence (how long they have been weak).

#### Sub-Features
- Severity ranking.
- Persistence tracking (time in weak state).

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/students/:id/weaknesses` | List top weakness topics | Student (self), Teacher |

#### Database Changes (if applicable)
- `student_mastery_scores`: May require tracking `status_changed_at` to measure persistence.

#### Acceptance Criteria
1. Accurately identifies RED/ORANGE topics.
2. Ranks by severity (lower scores first).
3. Provides data on how long the topic has been a weakness.
4. Updates dynamically as students practice and improve.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F03.U001 | Severity Ranking | Test sorting | Multiple weak topics | Sorted by score asc | High |
| P08.F03.U002 | Persistence Calc | Test time calculation | status_changed_at date | Correct duration in days | Medium |
| P08.F03.U003 | Status Filtering | Ensure only RED/ORANGE | Mixed status data | Only RED/ORANGE returned | High |
| P08.F03.U004 | Improvement Update | Test moving out of weakness | New good score added | Topic removed from weaknesses | High |
| P08.F03.U005 | Empty Weaknesses | Test all perfect scores | All GREEN data | Empty list returned | Medium |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P08.F03.I001 | API Weaknesses Fetch | Test endpoint integration | Populate DB | Call weaknesses API | Correct ranked array with persistence | High |

### Feature 8.4 — Syllabus Proficiency Map

#### Description
Provides a visual representation of proficiency across the entire syllabus tree, showing completion percentages and color statuses for every unit/section.

#### Sub-Features
- Hierarchical syllabus tree generation.
- Aggregation of completion metrics.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/students/:id/syllabus-proficiency/:courseId`| Get full map | Student, Teacher |

#### Database Changes (if applicable)
- None directly.

#### Frontend Pages/Components (if applicable)
- Interactive Syllabus Tree Visualizer.

#### Acceptance Criteria
1. API returns the complete syllabus hierarchy for a course.
2. Every node includes its mastery color status and completion percentage.
3. Accurate handling of partially completed sections.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F04.U001 | Tree Construction | Test hierarchical builder | Flat nodes + mastery | Nested tree with mastery data | High |
| P08.F04.U002 | Completion Math | Test percentage calc | 2/5 subtopics complete | 40% completion | High |
| P08.F04.U003 | Status Inheritance | Test parent node status | Mixed child statuses | Parent status aggregated correctly | High |
| P08.F04.U004 | Empty Course | Test course with no data | Valid course ID | Tree built with 0% completion, GREY | Medium |
| P08.F04.U005 | Nested Depth Limits | Test max depth handling | Deeply nested syllabus | Tree capped at defined level | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P08.F04.I001 | Map Retrieval API | Test endpoint payload | Seed full course + mastery | Call API | Valid deep JSON structure | High |

##### E2E Tests (if applicable)
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F04.E001 | Render Map | View UI component | Open Syllabus Map | Tree renders properly with colors | High |

### Feature 8.5 — Progress Tracking

#### Description
Tracks historical progress over time, generating trend data for improvements, attempt counts, and recency of practice.

#### Sub-Features
- Timeseries data generation for progress charts.
- Trend calculation (improving, degrading, plateau).

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/students/:id/progress` | Get historical trends | Student, Teacher |

#### Database Changes (if applicable)
- `mastery_score_history`: New timeseries table logging score changes over time.

#### Acceptance Criteria
1. Accurately tracks historical score changes.
2. Calculates valid trend indicators.
3. Supports date range filtering (last 7 days, 1 month, etc.).

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F05.U001 | Trend Calculation | Test upward trend | [40, 50, 70] | Trend: Improving | High |
| P08.F05.U002 | Trend Calculation | Test downward trend | [80, 70, 60] | Trend: Degrading | High |
| P08.F05.U003 | Timeseries Grouping | Test grouping by day/week | Raw history data | Grouped datapoints | Medium |
| P08.F05.U004 | Date Range Filter | Test filtering logic | History + Range | Filtered dataset | High |
| P08.F05.U005 | Attempt Counters | Test aggregation logic | Attempt history | Accurate counts | Low |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P08.F05.I001 | Progress API | Fetch trend data | Seed history | Call API with range | Valid timeseries payload | High |

### Feature 8.6 — Student Analytics Dashboard

#### Description
The main UI dashboard for students, presenting a consolidated view of mastery, strengths, weaknesses, syllabus map, and progress charts.

#### Sub-Features
- Course-level summary cards.
- Chart.js / Recharts integration.
- Responsive layout.

#### Acceptance Criteria
1. Dashboard loads all sub-components successfully.
2. Data matches API payloads accurately.
3. Visuals are clear, utilizing the defined color mapping.

#### Test Cases

##### Unit Tests (Frontend)
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F06.U001 | Strength Panel Render | Check rendering of strengths | Strengths array | List items rendered | Medium |
| P08.F06.U002 | Chart Component | Test chart data ingestion | Timeseries data | Chart renders without error | Medium |
| P08.F06.U003 | Color Mapping UI | Check CSS classes | Status: GREEN | Green CSS class applied | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F06.E001 | Dashboard View | Full dashboard check | Login as student -> Navigate to Analytics | All panels load correct data | High |
| P08.F06.E002 | Mobile Responsiveness | Check small screen view | View dashboard on mobile viewport | Layout stacks correctly | Medium |

### Feature 8.7 — Teacher/Admin Analytics View

#### Description
Aggregated analytics views for teachers and admins to assess class performance, drill down into individual students, and identify commonly weak topics across the cohort.

#### Sub-Features
- Class-level aggregation metrics.
- Cohort weakness identification.
- Individual student drill-down.

#### API Endpoints (if applicable)
| Method | Path | Description | Auth Requirements |
|--------|------|-------------|-------------------|
| GET | `/api/analytics/class/:courseId` | Aggregated class data | Teacher, Admin |
| GET | `/api/analytics/topics/:courseId` | Topic performance across class | Teacher, Admin |

#### Acceptance Criteria
1. Accurately aggregates data across all students in a class.
2. Correctly identifies topics where the majority of the class struggles.
3. Teachers can view individual student dashboards.

#### Test Cases

##### Unit Tests
| Test ID | Test Name | Description | Input | Expected Output | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F07.U001 | Class Aggregation | Test average calc | Array of student scores | Correct class average | High |
| P08.F07.U002 | Cohort Weakness | Find common weakness | Matrix of student/topic scores | Most failed topic identified | High |
| P08.F07.U003 | Outlier Detection | Identify struggling students | Class scores | Bottom 10% students flagged | Medium |
| P08.F07.U004 | Empty Class | Aggregate logic | 0 students | Safe defaults returned | Low |
| P08.F07.U005 | Permission Check | API layer check | Student requesting class data | Unauthorized | High |

##### Integration Tests
| Test ID | Test Name | Description | Setup | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-------|-----------------|----------|
| P08.F07.I001 | Class Analytics API | Fetch aggregated data | 30 students in DB | Call API | Correct averages and top weaknesses | High |

##### E2E Tests
| Test ID | Test Name | Description | Steps | Expected Result | Priority |
|---------|-----------|-------------|-------|-----------------|----------|
| P08.F07.E001 | Teacher Dashboard | View class stats | Login Teacher -> View Class Analytics | Class data shown, can click into student | High |

## Modularity Checklist
- [ ] All business logic in service layer (not controllers)
- [ ] No cross-module direct database access
- [ ] Shared types used from @repo/types
- [ ] Validation schemas in @repo/validation
- [ ] Module can be extracted to microservice without code changes in other modules
- [ ] All dependencies injected, not imported directly
- [ ] Feature flags / config for optional features

## Upgrade Path
The Analytics engine sets the stage for Adaptive Testing (future phase). The mastery scores calculated here will directly feed into the adaptive algorithms to select questions of appropriate difficulty based on real-time student proficiency.

## Definition of Done
- Mastery engine algorithms verified for mathematical accuracy.
- APIs return correct aggregations and timeseries data.
- Frontend dashboards fully implemented and styled.
- Tests (Unit, Integration, E2E) completed and passing.
- Data structures optimized for fast read performance.
</Phase 8 — Student Analytics>


## Key References & Team Responsibilities

### Relevant Functional Specifications
- [Spec 19: Mastery Engine & Analytics](../specs/19-mastery-engine.md)

### Key Team Role Guidelines
- [Data Scientist](../roles/27-data-scientist.md) — Features 8.1, 8.2, 8.3
- [Analytics Engineer](../roles/32-analytics-engineer.md) — Features 8.4, 8.5
- [Frontend Engineer](../roles/15-frontend-engineer.md) — Features 8.6, 8.7

### Operational Standards & Guides
- [Database Schema & ERD](../guides/01-database-schema-erd.md)
- [Data Flow Diagrams](../guides/07-data-flow-diagrams.md)