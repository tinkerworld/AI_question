# IELTS Writing Evaluation — Complete Implementation Plan

## Objective

Apply the requirements in `IELTS_Writing_Complete_Examiner_Criteria.md` across practice, full-exam grading, teacher review, and student feedback.

Treat the document as a versioned evaluation specification: every requirement must map to an analysis field, supporting evidence, and an acceptance test.

Detailed checks support the four criterion scores. They must not become independently scored mini-bands that are simply averaged.

## 1. Unify All Writing Evaluation Paths

Route practice submissions, full-exam answers, and previews through the same evaluation engine.

- Remove heuristic grading from production scoring.
- Restrict mock evaluation to isolated tests.
- Return `REVIEW_REQUIRED` or `FAILED` when reliable grading is unavailable.
- Preserve submissions during provider failures and support safe retries.
- Store evaluator, model, rubric, and prompt versions.

### Acceptance Criteria

- The same question and answer use the same evaluation workflow in practice and exams.
- Production submissions cannot silently receive mock or heuristic fallback grades.
- Failed evaluations retain the submitted answer and expose an honest status.

## 2. Define the Complete Task Specification

Store explicit task metadata instead of relying on prompt keywords.

| Task | Required context |
|---|---|
| Academic Task 1 | Visual type, verified facts, units, dates, key features, overview expectations, process stages or map changes |
| General Training Task 1 | Recipient, purpose, required bullet points, expected tone |
| Task 2 | Question type, individual instructions, whether a position is required |

- Require genuinely teacher-verified visual facts before finalizing Academic Task 1 factual assessment.
- Route missing or insufficient context to review rather than assuming facts.
- Validate task metadata on question creation and before evaluation.
- Support opinion, discussion, advantages/disadvantages, problems/solutions, causes/effects, two-part, and mixed Task 2 questions.

### Acceptance Criteria

- Charts, tables, processes, maps, letters, and every supported Task 2 question type have dedicated fixtures.
- A stored chart-facts object is not treated as teacher-verified merely because it exists.
- Task-specific requirements are available to the evaluator in structured form.

## 3. Implement Detailed Analysis Before Scoring

Create structured analysis covering the source document.

| Analysis module | Required checks |
|---|---|
| Task Achievement / Response | Instruction coverage, relevance, position, development, examples, conclusion; task-specific visual or letter checks |
| Coherence and Cohesion | Paragraph focus, topic sentences, progression, transitions, references, repetition, connector misuse |
| Lexical Resource | Range, meaning, precision, collocations, word formation, paraphrasing, register, spelling, naturalness |
| Grammatical Range and Accuracy | Controlled structure variety, grammatical accuracy, fragments, run-ons, punctuation, capitalization |

Each check should return:

- A result: `met`, `partially_met`, `not_met`, `not_applicable`, or `uncertain`.
- Supporting answer spans where evidence is present.
- An explanation and relevant task evidence.
- Detected issues where applicable.

For omissions, identify the unmet task requirement rather than inventing an answer quotation.

Use deterministic code for counts and offsets. Use model analysis for meaning and context. Do not equate keyword presence with competence.

### Acceptance Criteria

- Every source-document requirement has an explicit implementation and test mapping.
- Unsupported conclusions are rejected or flagged for review.
- Academic Task 1 claims are assessed against verified facts.
- Task 2 instruction coverage and position consistency are explicitly assessed.
- Letter purpose, bullet coverage, tone, greeting, and sign-off are explicitly assessed.

## 4. Add Structured Errors and Severity

Use a shared annotation structure, for example:

```json
{
  "criterion": "grammatical_range",
  "category": "Grammar",
  "subcategory": "Subject–verb agreement",
  "severity": "moderate",
  "original": "People is using technology.",
  "correction": "People are using technology.",
  "explanation": "The plural subject requires 'are'.",
  "startOffset": 0,
  "endOffset": 27,
  "isGenuineError": true
}
```

Offsets use an exclusive end position against the stored submitted text. Define a consistent offset convention across backend and frontend.

Implement:

- Minor, moderate, major, and critical severity.
- Meaning-impact explanations.
- Separation of genuine errors from optional stylistic suggestions.
- Repeated-error grouping and deduplication.
- Error-free sentence metrics, with uncertainty where detection is incomplete.

### Acceptance Criteria

- Annotations reference actual submitted text.
- Corrections preserve the intended meaning where that meaning can be established.
- Stylistic preferences are not counted as grammatical errors.
- Severity reflects communication impact, not merely the error category.

## 5. Assign Evidence-Backed Criterion Bands

After analysis, score the four criteria using versioned band descriptors and reviewed examples.

- Link each band justification to collected evidence.
- Explain why the answer does not meet the next band.
- Validate all four criterion IDs and score values strictly.
- Reject missing or malformed assessments instead of supplying default scores.
- Calculate individual-task and combined-writing results server-side.
- Apply Task 2's double weighting in the actual exam-result workflow.
- Keep generic exam marks separate from estimated IELTS bands.
- Validate scoring and rounding policy against the authoritative assessment specification before release.

### Acceptance Criteria

- Aggregation and boundary-value calculation tests pass.
- High scores cannot be justified solely by length, connectors, or difficult vocabulary.
- Combined results use the correct task pair and valid evaluation states.
- Teacher-reviewed scores are handled consistently in final results.
- Outputs remain clearly labeled as estimated assessments.

## 6. Complete the Feedback Interface

Update the scorecard to show:

- Task type, word count, and evaluation or review status.
- Four bands, each with strengths, problems, evidence, and improvement advice.
- Highlighted errors with explanations and corrections.
- Severity filters.
- Main improvement priority.
- Specific next-band targets.
- Original AI assessment and teacher-reviewed result clearly distinguished.

### Acceptance Criteria

- Every span-based feedback item opens the correct answer location.
- Provisional or failed evaluations cannot appear finalized.
- Missing feedback is not replaced by unsupported positive claims.
- Feedback remains usable on mobile and with keyboard navigation.

## 7. Strengthen References and Teacher Review

- Retrieve reviewed examples by task type and relevant assessment characteristics.
- Include examples across bands, not only the highest-scoring records.
- Record reference provenance and versions.
- Let teachers correct scores, annotations, severity, and explanations.
- Preserve the original evaluation and review history.
- Export approved corrections for future evaluation or training, with appropriate de-identification and access controls.

Storing corrections or adding reference examples is not itself model training. A future training pipeline requires separate dataset preparation, validation, and release controls.

### Acceptance Criteria

- Retrieved references are relevant, approved, and traceable.
- Teacher changes are auditable and visible in final feedback.
- Evaluation datasets remain separate from training/reference data to prevent leakage.

## 8. Validate Grading Quality Before Release

Build an independently teacher-marked evaluation set covering every section of the source document.

Include deliberate counterexamples:

- Fluent but off-topic essays.
- Wrong chart figures and reversed trends.
- Missing process stages or incorrect map locations.
- Missing letter bullets or incorrect tone.
- Contradictory positions and unanswered instructions.
- Excessive or incorrect connectors.
- Forced advanced vocabulary and unnatural collocations.
- Repeated grammar errors, fragments, and run-ons.
- Short, copied, unintelligible, and prompt-injection responses.

Measure:

- Overall and per-criterion band agreement with teacher assessments.
- Error-detection precision and recall.
- Severity agreement.
- Quotation and offset accuracy.
- Repeat-evaluation consistency.
- Review-routing accuracy.
- Performance across task types and proficiency levels.
- Latency, provider failure rate, and evaluation cost.

### Acceptance Criteria

- Quality thresholds are agreed before evaluating the held-out test set.
- Thresholds pass on unseen answers, not merely API tests or mock-provider benchmarks.
- Independent teacher-review provenance is documented.
- Failures are analyzed by criterion and task type rather than hidden by an overall average.

## 9. Requirement Traceability

Maintain a coverage matrix with one row per detailed source-document requirement.

| Field | Purpose |
|---|---|
| Requirement ID | Stable identifier tied to the document section |
| Task applicability | Academic Task 1, General Training Task 1, Task 2, or shared |
| Analysis field | Structured check that represents the requirement |
| Evidence source | Answer span, question instruction, verified visual fact, or derived metric |
| Implementation | Relevant backend, schema, prompt, and UI locations |
| Test cases | Positive, negative, ambiguous, and not-applicable examples |
| Status | Missing, in progress, implemented, or independently validated |

Do not mark a requirement complete only because it appears in a prompt. Completion requires validated output, appropriate feedback, and tests.

## 10. Recommended Delivery Order

| Phase | Deliverables | Exit gate |
|---|---|---|
| 1 — Foundation | Unified engine, task schema, strict validation, production mock removal | All submission paths use the same safe workflow |
| 2 — Analysis | Task-specific checks, linguistic checks, structured errors and severity | Detailed document requirements have evidence-backed outputs and tests |
| 3 — Scoring and UI | Evidence-backed bands, weighting, complete feedback, teacher review | End-to-end results and review behavior are consistent |
| 4 — Validation and rollout | Independent benchmarks, shadow evaluation, monitored release | Agreed quality thresholds pass and rollback is available |

During shadow evaluation, compare new assessments with reviewed answers without silently replacing existing finalized grades. Roll out gradually after quality approval.

## 11. Primary Code Areas

Paths are relative to the repository root.

- `Exam/apps/api/src/services/writing-evaluation-engine.service.ts`: shared evaluation orchestration, analysis, validation, scoring, persistence, and review.
- `Exam/apps/api/src/services/writing-evaluation.service.ts`: practice submission and legacy evaluation integration.
- `Exam/apps/api/src/services/attempt.service.ts`: full-exam integration and result calculation.
- `Exam/apps/api/src/services/ielts-descriptor-analyzer.ts`: remove production band assignment based on superficial heuristics; retain only justified diagnostic utilities where appropriate.
- `Exam/apps/api/src/routes/writing.routes.ts`: request validation, permissions, combined results, and review endpoints.
- `Exam/packages/types/src/index.ts`: task specification, analysis results, annotations, and feedback types.
- `Exam/apps/api/src/db/init-writing-evaluation.ts`: persistence changes and compatible schema migration planning.
- `Exam/apps/web/src/components/writing/WritingAuthoringPanel.tsx`: task metadata and verified context authoring.
- `Exam/apps/web/src/components/writing/WritingScorecard.tsx`: detailed feedback and annotation display.
- `Exam/tests/writing-evaluation-engine.test.js`: API/workflow and validation tests.
- `Exam/tests/writing-evaluation-harness.test.js`: grading-quality evaluation, expanded with independently reviewed held-out fixtures.

## Definition of Done

- [ ] Every requirement in the source document is mapped, implemented, and tested.
- [ ] Practice and full-exam grading use the unified engine.
- [ ] Production grading cannot silently fall back to mock or heuristic scores.
- [ ] All supported task types receive the correct context and analysis.
- [ ] Detailed checks produce verifiable evidence or an explicit uncertainty state.
- [ ] Errors include categories, severity, explanations, and valid answer spans.
- [ ] Four criterion bands are justified by evidence, with correct result aggregation.
- [ ] Students receive complete, actionable feedback and honest evaluation status.
- [ ] Teacher review is auditable and consistently reflected in results.
- [ ] Independent held-out quality thresholds pass before release.
- [ ] Monitoring and rollback procedures are in place.

“Fully applied” means every requirement is implemented, traceable, and tested. Human-examiner-level accuracy is a separate claim that must be demonstrated through independent validation.
