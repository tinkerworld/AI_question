# Data Scientist — Developer Guidelines & Responsibilities

## 1. Role Overview
The Data Scientist owns the statistical analysis, ML model development, and recommendation algorithms for the Adaptive Examination & AI Learning Platform. This role focuses on extracting insights from student performance data to power the student weakness identification algorithm, mastery scoring model, adaptive difficulty algorithm, and question effectiveness analysis. The Data Scientist works closely with the ML Engineer to operationalize models and the AI Engineer for AI gateway integrations.

## 2. Core Responsibilities
1. Design and develop the student weakness identification algorithm based on historical assessment data.
2. Build and refine the mastery scoring model to quantify student proficiency across subjects and chapters.
3. Develop the adaptive difficulty algorithm for dynamic question selection during exams and practice sessions.
4. Perform question effectiveness analysis (e.g., Item Response Theory) to calibrate question difficulty.
5. Analyze A/B test results for different prompt engineering strategies.
6. Collaborate with Backend and ML Engineers to expose models via Python FastAPI.
7. Define data collection requirements for the PostgreSQL + Prisma schema to support analytics.
8. Validate and benchmark AI model outputs against expected academic standards.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| Student Weakness Identification Algorithm | OWNS |
| Mastery Scoring Model | OWNS |
| Adaptive Difficulty Algorithm | OWNS |
| Question Effectiveness Analysis | OWNS |
| PostgreSQL Schema Design | CONSULTS |
| Model Deployment (FastAPI) | COLLABORATES |
| AI Gateway Development | OUT OF SCOPE |
| Subscription & Financial Analytics | CONSULTS |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Deliverables: Consult on Database Package (1.2) to ensure analytical data needs are met.

### Phase 2 — Academic Structure
- Deliverables: Model the hierarchical relationships for Syllabus Tree (Hierarchical) (2.3) and Syllabus Node Metadata (2.4).

### Phase 3 — Question Bank
- Deliverables: Establish Item Response Theory (IRT) baseline parameters for Question Bank Analytics (3.8). Evaluate Question Tags (3.4) utility.

### Phase 4 — Exam Pattern
- Deliverables: Design statistical models for Difficulty Distribution (4.5) and Topic Distribution (4.4).

### Phase 5 — Exam Generator
- Deliverables: Design the algorithm for Exam Generation Engine (5.1) to auto-select optimal questions.

### Phase 6 — Exam System
- Deliverables: Define telemetry events for Exam Attempt Session (6.2). Provide logic for Auto-Evaluation Engine (6.5) and Result Generation (6.6).

### Phase 7 — Exam Archive
- No primary deliverables. Support other teams as needed.

### Phase 8 — Student Analytics
- Deliverables: Build the core logic for the Mastery Engine (8.1), Strengths Identification (8.2), and Weakness Identification (8.3).

### Phase 9 — Personalized Practice
- Deliverables: Develop algorithms for Weakness Pool Generation (9.1) and Personalized Practice Paper Generation (9.2).

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Deliverables: Evaluate the quality of AI Question Modification Worker (11.3) and AI Question Generation Worker (11.4).

### Phase 12 — AI Interview
- Deliverables: Design logic for Interview Assessment Engine (12.6) and Interview Feedback Generation (12.7).

### Phase 13 — Subscriptions
- No primary deliverables. Support other teams as needed.

### Phase 14 — Production Hardening
- Deliverables: Finalize and benchmark model outputs for Performance Optimization (14.5) and Abuse Protection (14.7).

## 5. Key Guidelines
### 5.1 Technical Standards
- All scripts and models must be written in Python.
- Use `pytest` for testing algorithms and data processing logic.
- Ensure algorithms can be served via the Python FastAPI AI server.

### 5.2 Collaboration Model
- Work with the ML Engineer to hand off models for deployment.
- Consult with the BI Developer to ensure dashboard metrics align with statistical models.

### 5.3 Tools & Processes
- pnpm + Turborepo for monorepo management (running Python scripts within the structure).
- PostgreSQL for data extraction; no direct writes to production DB from exploratory scripts.

## 6. Do's ✅
1. Do validate algorithms against diverse student datasets to avoid bias.
2. Do document all mathematical formulas used in mastery scoring.
3. Do ensure adaptive algorithms fall back gracefully if data is sparse.
4. Do use vectorization (e.g., pandas/NumPy) for efficient data processing.
5. Do write unit tests (`pytest`) for all core algorithmic logic.
6. Do collaborate closely with the AI Engineer on prompt evaluation.
7. Do track experiment parameters and metrics rigorously.
8. Do design algorithms with the API-first principle in mind.
9. Do ensure independence of the recommendation module from the core monolith.
10. Do consider the computational complexity of the adaptive difficulty algorithm.
11. Do use Item Response Theory for question calibration.
12. Do regularly retrain models as new exam data flows in.
13. Do communicate data requirements early in the database design phases.
14. Do version all datasets used for training and evaluation.
15. Do establish baselines using simple heuristics before deploying complex ML.

## 7. Don'ts ❌
1. Don't push unoptimized, raw Jupyter notebooks into production branches.
2. Don't hardcode data paths or credentials in scripts.
3. Don't query the production database directly for heavy analytical workloads.
4. Don't ignore edge cases like students with zero history.
5. Don't build monolithic models; keep mastery and weakness models independent.
6. Don't neglect data privacy and PII masking when extracting student data.
7. Don't use overly complex deep learning models when simple logistic regression suffices.
8. Don't deploy algorithms without defined latency SLAs for the FastAPI server.
9. Don't skip cross-validation during model evaluation.
10. Don't override the AI Gateway pattern for data fetching.
11. Don't ignore statistical significance when evaluating A/B test results.
12. Don't mutate original datasets during processing.
13. Don't leave unused or dead code in the repository.
14. Don't rely on manual data cleaning steps for production pipelines.
15. Don't operate in a silo; always validate algorithmic assumptions with academic staff.

## 8. Quality Gates
- All core algorithms must have >90% test coverage using `pytest`.
- Algorithm performance (accuracy/F1-score) must meet predefined baselines.
- Peer review required by the ML Engineer for production readiness.

## 9. Escalation Path
- Data quality issues: Escalate to Backend Lead.
- Deployment blockers: Escalate to MLOps Engineer / DevOps.

## 10. KPIs & Success Metrics
- Accuracy of the student weakness identification model.
- Latency of the adaptive difficulty algorithm during exams (<200ms).
- Increase in student engagement/practice completion rates due to personalization.
