# Feature: Writing Question Type

## 1. Purpose
The Writing Question Type provides long-form essay and writing assessments (such as IELTS Academic/General Writing Task 1 & 2, TOEFL Independent/Integrated Writing, UPSC Mains essay/answers, and analytical essays). It features an auto-saving text editor with real-time word counting, configurable timing constraints, and multi-category AI rubric evaluation with evidence-backed diagnostic feedback.

## 2. Current State
Verified against the codebase:
- `@repo/question-types` contains `SUBJECTIVE` handler, which only provides a basic unstructured text input field and placeholder manual scoring.
- No dedicated `WRITING` question type exists with word-count limits, structured writing rubric criteria, or automated multi-category AI diagnostics (grammar, vocabulary, task response, coherence, lexical resource).
- No specialized writing editor with live statistics (word count, sentence count, paragraph count) or formatting constraints exists in the student exam player.

## 3. Problem / Requirement
Language and competitive exams require structured essay responses evaluated against formal criteria (e.g. IELTS Writing 4-criterion band descriptors: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
Key requirements:
- Configurable minimum and maximum word count thresholds with visual compliance indicators.
- Distraction-free, auto-saving text editor preventing accidental data loss during timed tests.
- Automated AI Rubric Evaluation providing category breakdown scores, identified grammar/spelling errors, vocabulary suggestions, and constructive feedback.
- Human Educator Override: AI scores serve as initial evaluation; teachers can adjust scores with audit remarks before finalizing.

## 4. Proposed Solution
1. Register `WRITING` in `@repo/question-types` with `WritingHandler` and schema validation.
2. Build an AI Writing Evaluation pipeline routed through `AIGatewayService` under `scope: 'writing_evaluation'`.
3. Provide structured multi-criteria rubric evaluation returning normalized numerical scores and qualitative diagnostic items.
4. Implement `ExamWritingEditor.tsx` with auto-save throttling (5-second debounce), word count progress bar, and copy-paste restriction options.

## 5. User Experience
- **Student Exam Player**: The student sees the writing prompt, reference material (e.g. chart/table image or reading passage), live timer, word count indicator (e.g. `245 / 250 words minimum`), and writing area.
- **Auto-Save**: Status indicator confirms "Saved 2s ago" with offline localStorage fallback.
- **Results / Scorecard**: Detailed rubric breakdown showing score per criterion (e.g. Task Response 7.5/9, Coherence 8.0/9), highlighted sentence suggestions, and vocabulary recommendations.

## 6. Admin Experience
- **Question Authoring**: Teacher creates a Writing question, sets prompt stem, attaches prompt images/charts, specifies min/max words (e.g., Min: 150, Max: 300), selects Rubric Preset (IELTS Task 1, IELTS Task 2, TOEFL, Academic Essay), or custom criteria.
- **Grading Workbench**: Teacher views AI-suggested scores and feedback, reviews candidate submission, adjusts criterion scores if needed, and approves the final scorecard.

## 7. Technical Architecture
- **Package**: `@repo/question-types` exports `WritingHandler` and `WritingQuestionData`.
- **AI Gateway Integration**: Add `featureKey: 'writing_evaluation'` routed through `AIGatewayService` with `scope: 'writing_evaluation'` and dedicated prompt template.
- **Evaluation Flow**:
  1. Student submits writing text in attempt payload.
  2. `attempt.service.ts` queues `evaluateWritingSubmission()` via AI Gateway.
  3. AI parses response, calculates band scores per criterion, extracts specific grammar/vocabulary issues, and returns structured JSON.
  4. Scores are stored in `attempt_evaluations` and merged into student attempt result.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data structures in `questions.data`:
```json
{
  "promptText": "Summarize the information by selecting and reporting the main features...",
  "promptImageUrl": "/assets/charts/ielts_task1_pop.png",
  "minWordCount": 150,
  "maxWordCount": 250,
  "timeLimitMinutes": 20,
  "rubric": [
    { "id": "task_achievement", "name": "Task Achievement", "maxScore": 9, "weight": 0.25 },
    { "id": "coherence_cohesion", "name": "Coherence & Cohesion", "maxScore": 9, "weight": 0.25 },
    { "id": "lexical_resource", "name": "Lexical Resource", "maxScore": 9, "weight": 0.25 },
    { "id": "grammatical_range", "name": "Grammatical Range & Accuracy", "maxScore": 9, "weight": 0.25 }
  ]
}
```

## 9. API
- `POST /api/v1/writing/evaluate-preview` (Auth: Staff) — Dry-run evaluation of sample essay.
- `POST /api/v1/attempts/:id/evaluate-writing` (Auth: System / Teacher) — Executes or overrides AI rubric evaluation.
- `GET /api/v1/writing/rubrics` (Auth: Staff) — Returns built-in rubric presets.

## 10. Frontend
- **Components**:
  - `ExamWritingEditor.tsx`: Text area with word count counter, formatting toolbar, and auto-save.
  - `WritingScorecard.tsx`: Criterion score bars, feedback cards, and highlighted text issues.
  - `WritingAuthoringPanel.tsx`: Question Bank creator for writing prompts and rubric definitions.

## 11. AI / External Services
- **AI Gateway Scope**: `writing_evaluation`.
- **Prompt Structure**: Instructs LLM to evaluate strictly against rubric criteria, penalize word count violations mathematically, and output exact quotation spans for detected grammar/spelling errors.
- **Safety**: Prompt injection sanitization prevents student essays from overriding AI evaluator instructions.

## 12. Permissions / Entitlements
- **Authoring**: `questions.create`, `questions.update`.
- **Attempting**: `exams.attempt`.
- **Teacher Review**: `results.flag` / `exams.review`.
- **Entitlements**: Full AI writing diagnostic reports gated behind `full_assessment` in `@repo/entitlement-engine`.

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If `writing_ai_grading` is in maintenance, essays are queued for background evaluation when service restores.

## 14. Import / Export
- Fully supported in `json-import-export.md` with prompt text, rubric criteria, word count rules, and sample high-scoring model answers.

## 15. Edge Cases
- Candidate writes 0 words: Returns 0 score with feedback "Submission was blank".
- Candidate writes below min word count: Rubric engine applies automatic penalty per grading guidelines.
- Network disconnection during writing: Autosave saves every 5 seconds locally in `localStorage` and restores draft seamlessly on reload.

## 16. Test Cases
- **Unit (WRIT-U001)**: `WritingHandler.validate()` validates min/max word counts and rubric structure.
- **Unit (WRIT-U002)**: Word count counter utility accurately ignores extra whitespace and formatting tags.
- **API (WRIT-A001)**: `POST /api/v1/writing/evaluate-preview` returns valid JSON with 4 IELTS criteria scores.
- **Integration (WRIT-I001)**: Submitted essay triggers AI Gateway evaluation and stores score in `attempt_evaluations`.
- **UI (WRIT-UI001)**: Word count indicator changes from red (under limit) to green (compliant).
- **Entitlement (WRIT-E001)**: `FREE` tier student sees total score but detailed grammar breakdown is blurred per `<PremiumGuardrail>`.

## 17. Acceptance Criteria
- [ ] `WRITING` question type registered in `@repo/question-types`.
- [ ] Auto-saving editor with live word count tracking.
- [ ] Multi-category rubric AI evaluation pipeline.
- [ ] Teacher manual grade override and feedback editing.
- [ ] Entitlement gating for diagnostic reports.

## 18. Dependencies
- `@repo/question-types`
- `apps/api/src/services/ai-gateway.service.ts`
- Premium Entitlements Engine (`features/premium-entitlements.md`)

## 19. Future Improvements
- Automated CEFR level classifier (A1 to C2) based on lexical diversity and syntactic complexity.
- Plagiarism and AI-generation probability indicator for academic integrity.
