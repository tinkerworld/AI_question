# Patch: Interview Grading & Longitudinal Analysis

## 1. Purpose
This patch enhances the post-session evaluation engine for AI Interviews by introducing **evidence-grounded quotation feedback**, standardized multi-criteria rubric scoring across all interview presets, raw evidence persistence (audio recordings and per-turn transcript snippets), and **longitudinal attempt progress tracking** across multiple sessions (e.g. tracking fluency, pronunciation, grammatical accuracy, and domain mastery over time).

## 2. Current State
Verified against the codebase:
- `interview.service.ts` currently calculates multi-criteria rubric evaluations (including IELTS Speaking 4-band criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation).
- `interview_sessions` stores `rubricScores`, `feedback`, `strengths`, `weaknesses`, and `recommendations` as JSON.
- **The Concrete Gaps**:
  1. Feedback items currently lack consistent verbatim quotation anchors (e.g. quoting exact phrases spoken by the candidate in Turn 3 to justify a grammatical score).
  2. Non-IELTS presets (such as UPSC personality tests or System Design interviews) have less consistent structured category normalization.
  3. No longitudinal progress tracking endpoint exists to compare a student's performance across sequential interview attempts over days/weeks (e.g., "Fluency improved from 6.0 to 7.0 over 5 attempts, response latency reduced by 22%").

## 3. Problem / Requirement
Language and professional exam preparation requires actionable, evidence-based feedback so students understand exactly why they received a specific score and how they are progressing across attempts:
- Feedback must not be generic motivational text; it must cite verbatim transcript quotes from the student's actual spoken turns.
- Students and teachers need a longitudinal progress chart showing skill growth over time across all interview sessions taken in an enrolled course.
- Raw evidence (audio recordings and verbatim transcripts) must be linked to rubric scores for auditability and teacher review.

## 4. Proposed Solution
1. Update the AI evaluation prompt template (`featureKey: 'interview_evaluation'`) to require direct `evidenceQuotes` (verbatim citations from candidate turns) for each rubric criterion score.
2. Standardize rubric score normalization in `interview.service.ts` across all rubric presets (`IELTS_SPEAKING`, `UPSC_PERSONALITY`, `TECH_SYSTEM_DESIGN`, `GENERAL_HR`, `CUSTOM`).
3. Add a longitudinal analytics aggregation method in `analytics.service.ts` (`getStudentInterviewProgress`) that computes historical score trends, average response latency, vocabulary diversity growth, and recurring weakness patterns.
4. Enhance the frontend scorecard viewer in `InterviewPage.tsx` with quote callouts, audio replay per turn, and a "Progress Over Time" trend drawer.

## 5. User Experience
- **Scorecard View**: Candidate sees their overall band/score, followed by expandable criteria cards. Each card displays the numerical score, descriptive level, and direct quotes from the candidate's speech (e.g. *"In Turn 2, you said: 'The database should be sharded by user ID', which demonstrated solid architectural foresight"*).
- **Progress Tab**: Candidate can click "My Growth & History" to view a line chart of scores across their last 10 interviews, with skill-specific improvement metrics (e.g. +1.5 band improvement in Fluency).

## 6. Admin / Teacher Experience
- **Teacher Review Drawer**: Teachers can review any student's interview session, listen to individual turn audio, view AI-suggested evidence quotes, and add teacher notes or adjust scores.
- **Cohort Analytics**: Teachers can view which rubric criteria are weakest across a class cohort (e.g., 65% of students scored below Band 6 in Grammatical Range).

## 7. Technical Architecture
- **Existing Modules Reused**:
  - `interview.service.ts` evaluation orchestration.
  - `AIGatewayService` (`scope: 'interview'`) priority routing.
  - `@repo/mastery-engine` mathematical trend detection utilities (`IMPROVING`, `PLATEAU`, `DEGRADING`).
- **Extensions**:
  - New service function: `InterviewAnalyticsService.getStudentProgress(userId, courseId)`.
  - Schema extension for structured evidence in `interview_sessions.rubricScores`.

## 8. Database
*No Prisma schema modifications applied during planning.*
Enhanced JSON structure stored in `interview_sessions.rubricScores`:
```json
[
  {
    "id": "lexical_resource",
    "name": "Lexical Resource",
    "score": 7.5,
    "maxScore": 9.0,
    "feedback": "Demonstrated a wide range of domain vocabulary with rare inaccuracies.",
    "evidenceQuotes": [
      {
        "turnNumber": 2,
        "quote": "We implemented an eventual consistency model with optimistic concurrency control...",
        "assessment": "Accurate application of high-level systems terminology."
      }
    ],
    "improvementTip": "Incorporate idiomatic collocations when describing failure recovery."
  }
]
```

## 9. API
- `GET /api/v1/interviews/sessions/:id/scorecard` (Auth: Student/Staff) — Returns full evidence-tied scorecard.
- `GET /api/v1/interviews/analytics/student/:userId` (Auth: Student self / Staff `analytics.read`) — Longitudinal progress timeseries.
- `POST /api/v1/interviews/sessions/:id/override-score` (Auth: Teacher / Admin) — Teacher grade adjustment.

## 10. Frontend
- **Components**:
  - `InterviewScorecard.tsx`: Evidence-grounded scorecard with interactive quotation badges.
  - `InterviewProgressChart.tsx`: Timeseries line chart showing rubric category progression across attempts.
  - `TurnAudioReview.tsx`: Turn-by-turn audio player component.

## 11. AI / External Services
- **Evaluation Prompt**: Instructs LLM to quote candidate transcript explicitly: *"For every criterion evaluated, extract at least one verbatim quote from candidate speech that justifies the score."*
- **Determinism**: Temperature set to `0.2` for evaluation consistency.

## 12. Permissions / Entitlements
- **Self-Analytics**: `analytics.read_own` (with Section 7 IDOR ownership check).
- **Teacher Review & Cohort Analytics**: `analytics.read` / `interview.review`.
- **Entitlements**: Detailed longitudinal analytics and turn-by-turn evidence quotes gated behind `full_assessment` in `@repo/entitlement-engine`.

## 13. Maintenance Behaviour
- Plugs into Feature Maintenance (`feature-maintenance.md`). In maintenance, scorecard evaluation requests are queued and historical scorecards remain accessible in read-only mode.

## 14. Import / Export
- Scorecard analytics and historical trend logs exportable as CSV/PDF via standard reporting pipelines.

## 15. Edge Cases
- Candidate only completed 1 turn before quitting: Evaluation handles incomplete session gracefully, providing formative feedback on attempted turns without throwing 500 errors.
- Candidate speech has high background noise: Audio transcript marks unclear audio with `[inaudible]` and AI feedback advises better microphone placement.

## 16. Test Cases
- **Unit (IGRADE-U001)**: `normalizeRubricScores()` preserves `evidenceQuotes` array across all presets.
- **Unit (IGRADE-U002)**: Trend detection accurately marks scores `[5.5, 6.0, 7.0]` as `IMPROVING`.
- **API (IGRADE-A001)**: `GET /api/v1/interviews/analytics/student/:id` enforces Section 7 IDOR check (student A cannot query student B).
- **Integration (IGRADE-I001)**: Evaluation generates valid JSON matching `InterviewEvaluationDTO` schema.
- **UI (IGRADE-UI001)**: Scorecard displays quotation chips with turn reference numbers.
- **Entitlement (IGRADE-E001)**: Free tier student sees overall score; evidence quotes display upgrade paywall per `<PremiumGuardrail>`.

## 17. Acceptance Criteria
- [ ] Evidence-grounded verbatim quotation feedback generated for all rubric criteria.
- [ ] Standardized multi-criteria evaluation across all presets (IELTS, UPSC, Technical, Custom).
- [ ] Longitudinal attempt progress tracking API and frontend timeseries chart.
- [ ] Turn-level audio/transcript evidence persistence.
- [ ] Section 7 IDOR security and entitlement gating enforced.

## 18. Dependencies
- `apps/api/src/services/interview.service.ts`
- `apps/api/src/services/analytics.service.ts`
- `@repo/mastery-engine`
- Premium Entitlements Engine (`features/premium-entitlements.md`)

## 19. Future Improvements
- Automated acoustic pronunciation score (phoneme-level speech recognition alignment).
- Video facial expression & confidence analysis in viva sessions.
