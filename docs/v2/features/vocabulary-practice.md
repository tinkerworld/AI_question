# Feature: Vocabulary Practice & Spaced Repetition

## 1. Purpose
The Vocabulary Practice system provides structured vocabulary acquisition, retention drills, and spaced repetition tracking. It supports word definitions, pronunciation audio, parts of speech, example sentences, synonyms, antonyms, difficulty ratings, and 6 active practice modes integrated into the student mastery engine.

## 2. Current State
Verified against the codebase:
- `@repo/mastery-engine` exists for tracking topic-level syllabus mastery scores based on exam attempts.
- No vocabulary data model (`vocabulary_words`, `word_lists`, `student_vocabulary_progress`) exists anywhere in the monorepo.
- No flashcard, word matching, or spaced-repetition practice UI exists.

## 3. Problem / Requirement
Language examination candidates (IELTS, TOEFL, GRE, SAT, Duolingo, ESL) require intensive vocabulary acquisition with active recall drills rather than passive word lists:
- Need rich word entities: headword, phonetics/IPA, audio pronunciation, part of speech, definitions, example sentences, synonyms, antonyms, and CEFR level (A1 to C2).
- Need multiple active practice modes: Flashcard flip, Definition matching, Multiple choice, Fill-in-the-blank, Synonym/Antonym identification, and Spelling drill.
- Need mastery retention tracking (LEARNING -> WEAK -> FAMILIAR -> MASTERED) using a spaced repetition algorithm (e.g. Leitner box or modified SuperMemo SM-2).

## 4. Proposed Solution
1. Introduce vocabulary data structures in `@repo/types` and database schema concepts.
2. Build a Vocabulary Engine service in `apps/api/src/services/vocabulary.service.ts` managing word lists, custom student decks, and spaced repetition scheduling.
3. Integrate with `@repo/mastery-engine` to roll vocabulary mastery scores into course proficiency maps.
4. Implement `VocabularyPracticePage.tsx` with high-interactivity drills, audio playback, keyboard shortcuts, and daily streak gamification.

## 5. User Experience
- **Word Explorer**: Student browses words by Course, Topic, or CEFR level (e.g., "Academic Word List - IELTS Band 8+"), listens to native pronunciation, views example sentences, and bookmarks difficult words.
- **Daily Drill**: Student launches a 10-minute practice session. Words due for review are presented in randomized interactive modes (flashcard, spelling, cloze). Correct answers increase mastery level and push the next review date forward.

## 6. Admin Experience
- **Vocabulary Manager**: Teachers and Admins can create word lists, import word packages via JSON, curate word definitions, tag words to syllabus nodes, and generate sample sentences using AI.
- **Student Progress Insights**: Teachers can view cohort vocabulary mastery (e.g. average active vocabulary size in Class 10A).

## 7. Technical Architecture
- **Service**: `apps/api/src/services/vocabulary.service.ts`.
- **Spaced Repetition Algorithm**: Simplified SM-2 algorithm:
  - Repetition count $n$, Easiness factor $EF \ge 1.3$, Interval $I(n)$ in days.
  - Review schedule dynamically recalculates on each drill answer.
- **Audio Integration**: Reuses the shared Audio Configuration service (`audio-config.service.ts`) for word pronunciation.

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `vocabulary_words`: `id`, `word`, `phonetic`, `partOfSpeech`, `definition`, `exampleSentence`, `synonyms` (string[]), `antonyms` (string[]), `difficulty` (CEFR level), `audioUrl`, `syllabusNodeId`, `createdAt`.
- `student_vocabulary_progress`: `id`, `userId`, `wordId`, `masteryLevel` (`LEARNING` | `WEAK` | `FAMILIAR` | `MASTERED`), `repetitionCount`, `easinessFactor`, `intervalDays`, `nextReviewDue`, `lastPracticedAt`.

## 9. API
- `GET /api/v1/vocabulary/words` (Auth: Student/Staff) — Paginated word search by syllabus node / level.
- `GET /api/v1/vocabulary/practice-deck` (Auth: Student) — Returns words currently due for spaced review.
- `POST /api/v1/vocabulary/submit-drill` (Auth: Student) — Records answer result, updates SM-2 schedule.
- `POST /api/v1/vocabulary/words` (Auth: Staff) — Create vocabulary word entity.
- `POST /api/v1/vocabulary/generate-ai-examples` (Auth: Staff) — AI sentence generation.

## 10. Frontend
- **Pages / Components**:
  - `VocabularyPracticePage.tsx`: Interactive drill arena with animated flashcards, spelling input, and keyboard shortcuts.
  - `VocabularyDeckManager.tsx`: Word list manager for teachers.
  - `WordCard.tsx`: Reusable word dictionary card with audio pronunciation trigger.

## 11. AI / External Services
- **AI Gateway Integration**: `featureKey: 'vocabulary_example_gen'` generates context-rich example sentences and collocations for new words.
- **Audio TTS**: Pre-renders pronunciation audio via shared audio service.

## 12. Permissions / Entitlements
- **Management**: `courses.update` / `questions.create`.
- **Practice**: `exams.attempt` / `analytics.read_own`.
- **Entitlements**: `FREE` tier limited to 20 daily vocabulary cards; `PREMIUM` tier receives unlimited daily reviews and custom decks (`custom_topic` rule in `@repo/entitlement-engine`).

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If `featureKey: 'vocabulary_practice'` is in maintenance, drill sessions display maintenance notice without losing student retention streaks.

## 14. Import / Export
- Supports JSON word list import/export in `json-import-export.md` (e.g. importing CEFR B2 vocabulary packs).

## 15. Edge Cases
- Student skips practice for 30 days: Algorithm caps backlogged review decks so students aren't overwhelmed with 500 cards in a single session.
- Duplicate word entries: System handles multiple meanings/parts-of-speech for the same lemma cleanly.

## 16. Test Cases
- **Unit (VOCAB-U001)**: SM-2 algorithm advances interval from 1 day to 6 days on first correct recall.
- **Unit (VOCAB-U002)**: Incorrect answer resets interval to 1 day and marks state as `WEAK`.
- **API (VOCAB-A001)**: `GET /api/v1/vocabulary/practice-deck` returns only words where `nextReviewDue <= NOW()`.
- **API (VOCAB-A002)**: Section 7 IDOR check prevents User A from submitting drill results on User B's progress.
- **UI (VOCAB-UI001)**: Spacebar flips flashcard, 1-4 keys trigger answer confidence rating.
- **Entitlement (VOCAB-E001)**: Free student hitting 20 card daily limit sees `<PremiumGuardrail>` upgrade modal.

## 17. Acceptance Criteria
- [ ] Vocabulary word data structures supporting phonetics, audio, parts of speech, and examples.
- [ ] 6 interactive practice modes with keyboard navigation.
- [ ] Spaced repetition scheduling engine (SM-2).
- [ ] Mastery state tracking integrated with student analytics.
- [ ] Entitlement limits and maintenance hooks verified.

## 18. Dependencies
- `@repo/mastery-engine`
- Shared Audio Configuration (`audio-config.service.ts`)
- Premium Entitlements Engine (`features/premium-entitlements.md`)

## 19. Future Improvements
- Etymology and root word tree explorer (Latin/Greek roots).
- Voice recognition pronunciation practice (speech matching score).
