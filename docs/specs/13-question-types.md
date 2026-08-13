<Question Types — Functional Specification>
## 1. Overview
The Question Types module defines a pluggable architecture for handling various forms of assessment items. By establishing a standard interface for how questions are rendered, validated, and evaluated, the platform can support diverse assessment methods ranging from simple multiple-choice to complex subjective and AI-evaluated speaking formats.

## 2. User Stories
- As a Teacher, I want to use different question types so that I can accurately assess different cognitive skills.
- As a Developer, I want a standard interface for new question types so that I can easily add custom formats in the future.
- As a Student, I want intuitive UI controls for different question types so that I can answer them without confusion.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
|---|---|---|---|---|---|
| View Question Formats | ✅ | ✅ | ✅ | ✅ | ✅ |
| Configure Q-Type Rules | ✅ | ❌ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 MCQ (Multiple Choice)
- **Answer Format**: Single ID of selected option.
- **Correct Answer Format**: Single ID of the correct option.
- **Auto-evaluation logic**: Exact match. Yes, auto-graded.
- **Partial marking rules**: None (usually 0 or full marks).
- **Display/rendering**: Radio buttons. Options can be randomized per student.
- **Example**: Q: "What is 2+2?" Options: A) 3, B) 4, C) 5. Ans: B.

### 4.2 Multiple-Select
- **Answer Format**: Array of option IDs.
- **Correct Answer Format**: Array of correct option IDs.
- **Auto-evaluation logic**: Array comparison. Yes, auto-graded.
- **Partial marking rules**: E.g., +1 for each correct option, -0.5 for each incorrect option selected.
- **Display/rendering**: Checkboxes. Options randomized.
- **Example**: Q: "Select prime numbers." Options: A) 2, B) 4, C) 5, D) 9. Ans: [A, C].

### 4.3 True/False
- **Answer Format**: Boolean.
- **Correct Answer Format**: Boolean.
- **Auto-evaluation logic**: Exact match. Yes, auto-graded.
- **Partial marking rules**: None.
- **Display/rendering**: Two radio buttons (True/False).
- **Example**: Q: "The earth is flat." Ans: False.

### 4.4 Fill in the Blank
- **Answer Format**: String (or array of strings for multiple blanks).
- **Correct Answer Format**: Array of acceptable strings per blank. Configurable case sensitivity.
- **Auto-evaluation logic**: String matching (trimming whitespace). Yes, auto-graded.
- **Partial marking rules**: Partial marks if some blanks are correct.
- **Display/rendering**: Inline text input fields within the question text.
- **Example**: Q: "The capital of France is [blank]." Ans: ["Paris", "paris"].

### 4.5 Short Answer
- **Answer Format**: Text string.
- **Correct Answer Format**: Array of keywords/phrases.
- **Auto-evaluation logic**: Keyword presence or exact string match. Can be auto-graded or manual.
- **Partial marking rules**: Proportional to keywords found.
- **Display/rendering**: Small text area.
- **Example**: Q: "Define photosynthesis." Ans keys: ["light", "energy", "plants"].

### 4.6 Numerical
- **Answer Format**: Numeric value + optional unit string.
- **Correct Answer Format**: Target value, tolerance range (e.g., +/- 0.5), accepted units.
- **Auto-evaluation logic**: Checks if answer is within [target - tolerance, target + tolerance]. Yes, auto-graded.
- **Partial marking rules**: None (usually).
- **Display/rendering**: Number input field.
- **Example**: Q: "What is Pi to 2 decimal places?" Ans: 3.14 (Tolerance 0.01).

### 4.7 Long Answer / Subjective
- **Answer Format**: Rich text string (Markdown/HTML) or file upload.
- **Correct Answer Format**: Model answer and grading rubric.
- **Auto-evaluation logic**: Manually graded by teacher or AI-graded via LLM rubric evaluation.
- **Partial marking rules**: Graded according to rubric dimensions.
- **Display/rendering**: Large rich-text editor or file upload zone.
- **Example**: Q: "Write an essay on global warming." Ans: Rubric based evaluation.

### 4.8 Matching
- **Answer Format**: Map of ItemA_ID to ItemB_ID.
- **Correct Answer Format**: Correct mapping pairs.
- **Auto-evaluation logic**: Exact match of pairs. Yes, auto-graded.
- **Partial marking rules**: Fractional marks per correct pair.
- **Display/rendering**: Drag-and-drop lists or dropdowns next to items.
- **Example**: Match capitals to countries.

### 4.9 Listening
- **Answer Format**: Dependent on sub-type (often MCQ after listening).
- **Correct Answer Format**: Depends on sub-type.
- **Auto-evaluation logic**: Depends on sub-type.
- **Partial marking rules**: N/A.
- **Display/rendering**: Audio file reference, transcript player UI above the question. Playback controls can be limited.
- **Example**: Listen to the audio and answer the MCQs.

### 4.10 Speaking / Interview
- **Answer Format**: Audio/Video file URL.
- **Correct Answer Format**: Expected topics, AI evaluation rubric.
- **Auto-evaluation logic**: Linked to AI interview system for speech-to-text, then semantic evaluation.
- **Partial marking rules**: Based on AI analysis (pronunciation, fluency, accuracy).
- **Display/rendering**: Microphone recording interface with timer.
- **Example**: "Describe your favorite hobby for 2 minutes."

### 4.11 Custom / Future Types (Pluggable Architecture)
**What it does**: Manages how types are loaded and executed.
**How it works**:
Every question type implements an `IQuestionType` interface containing:
- `validateSchema(content)`
- `evaluate(studentAnswer, correctAnswer)`
- `serialize()` / `renderUI()`
The system maintains a Registry of these implementations. New types can be registered without altering core logic.

## 5. Data Model
```
Table: question_type_configs
├── id (PK)
├── type_code (String, e.g., 'MCQ', 'NUMERICAL')
├── partial_marking_enabled (Boolean)
├── default_marks (Decimal)
└── settings_schema (JSON)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
|---|---|---|---|---|---|---|
| GET | `/api/question-types` | List all supported types | - | `200 {types[]}` | Bearer | Read |
| POST | `/api/questions/evaluate` | Dry-run auto-eval | `{type, studentAns, correctAns}`| `200 {score}` | Bearer | Read |

## 7. UI Screens & Components
### Screen: Question Type Selector
**URL**: Shared component within Question Editor.
**Layout**: Dropdown or icon grid. Changing type dynamically changes the form fields below (e.g., switching from MCQ to Numerical swaps option inputs for a tolerance config).
**States**: Type switching warns if data will be lost.

## 8. Business Rules
1. Changing the type of an existing question clears its existing answers.
2. Auto-evaluating types must definitively return a score.

## 9. Validation Rules
- MCQs must have at least 2 options and exactly 1 correct option.
- Numerical tolerance must be >= 0.

## 10. Error Handling
- Unknown Type: If a question type code is deprecated, render a fallback "Unsupported Question Type" block.

## 11. Integration Points
- AI Services: For evaluating Subjective and Speaking questions.
- Storage Service: For audio/file responses.

## 12. Configuration Options
- Toggle specific question types on/off globally.

## 13. Future Enhancements
- Interactive diagram labeling types.
- Coding challenge types (executing code in a sandbox).
</Question Types — Functional Specification>
