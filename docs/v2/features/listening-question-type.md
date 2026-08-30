# Feature: Listening Question Type

## 1. Purpose
The Listening Question Type enables standardized language and comprehension audio assessments. It provides student-facing audio playback with configurable playback controls, multiple sub-question formats (MCQ, sentence/form completion, matching, diagram/map labeling), unified voice/accent configuration, and immutable audio asset storage adhering to ADR-007.

## 2. Current State
Verified against the codebase:
- `@repo/question-types` contains handlers for `MCQ`, `MULTIPLE_SELECT`, `TRUE_FALSE`, `FILL_IN_BLANK`, `SHORT_ANSWER`, `NUMERICAL`, `MATCHING`, `SUBJECTIVE`, and `INTERVIEW`.
- No `LISTENING` question type or audio comprehension handler exists in `@repo/question-types`.
- Audio generation and playback currently exist only in `InterviewPage.tsx` using browser Web Speech API synthesis without persistent audio file storage or cross-feature configuration.
- No unified Voice/Accent configuration entity or audio asset caching mechanism exists.

## 3. Problem / Requirement
Language examination standards (e.g., IELTS, TOEFL, CEFR, Cambridge English) require candidates to listen to spoken dialogues, lectures, or announcements and answer multi-part questions concurrently.
Key requirements:
- Support multiple sub-question formats tied to a single audio stimulus.
- Configurable playback constraints: max replay count (e.g., 1x or 2x only), auto-play delay, disabled scrub bar, and forced completion before navigating away.
- Unified Voice and Accent configuration shared across all audio features (Listening, Interview, etc.).
- Published Exam Audio Immutability: Once an exam is published, generated TTS audio or uploaded MP3s must be permanently frozen in asset storage so downstream TTS provider changes never alter historical exams (ADR-007).

## 4. Proposed Solution
1. Register `LISTENING` in `@repo/question-types` with a `ListeningHandler` supporting nested sub-items (MCQ, Fill-in-Blank, Matching).
2. Create a shared `AudioConfigService` to manage voice roster, accents (British, American, Australian, Indian, etc.), speaking rates, and TTS synthesis providers.
3. Add an audio player component with strict exam mode constraints (play limit counter, auto-start countdown, locked scrubbing).
4. Persist pre-rendered audio files in object storage (`/uploads/audio/listening/...`) and reference their immutable URLs in `exam_snapshot_questions`.

## 5. User Experience
- **Exam Player**: The student sees an audio player header with a waveform or progress bar, playback counter ("Plays remaining: 1 of 2"), and clear instructions ("Audio will begin in 5 seconds").
- **Sub-Questions**: Below or alongside the audio player, the sub-questions (e.g., questions 1–5 for Part 1) are displayed. The student can fill in answers while the audio plays.
- **Audio Completion**: Once the allowed playback count is exhausted, the play button disables permanently.

## 6. Admin Experience
- **Question Authoring**: In the Question Bank, the author selects "Listening" type, inputs the audio source (either upload MP3/WAV file or write a script for AI Text-to-Speech synthesis), selects Voice/Accent/Speed, tests playback, and attaches sub-questions.
- **Preview & Re-render**: Authors can preview synthesized speech, adjust pronunciation phonetics, and regenerate audio before publishing.

## 7. Technical Architecture
- **Package**: `@repo/question-types` extends `BuiltInQuestionType` with `'LISTENING'`.
- **Shared Audio Architecture**: Create `apps/api/src/services/audio/audio-config.service.ts` managing TTS providers (Cloud TTS, OpenAI TTS, ElevenLabs, Mock TTS) and voice presets.
- **Storage Boundary**: Synthesized audio is rendered at question save/publish time and stored on disk/S3; exams snapshot the exact URL to guarantee immutability (ADR-007).
- **Evaluation Engine**: Sub-answers are evaluated by delegating to corresponding sub-handlers (e.g. `MCQHandler`, `FillInBlankHandler`).

## 8. Database
*No Prisma schema modifications applied during planning.*
Proposed data models:
- `audio_voice_profiles`: `id`, `name`, `provider`, `voiceId`, `accent`, `gender`, `sampleAudioUrl`, `isDefault`, `isActive`.
- Extended JSON structure in `questions.data`:
  ```json
  {
    "audioSource": "SYNTHESIZED" | "UPLOADED",
    "audioUrl": "/assets/audio/listening_q101.mp3",
    "audioScript": "Welcome to the international conference...",
    "voiceProfileId": "voice_en_gb_01",
    "playbackLimit": 1,
    "allowPause": false,
    "subQuestions": [
      { "id": "sq_1", "type": "FILL_IN_BLANK", "prompt": "Room number:", "blankKey": "304", "marks": 1 }
    ]
  }
  ```

## 9. API
- `POST /api/v1/audio/synthesize-preview` (Auth: Staff) — Generates transient preview audio from script.
- `POST /api/v1/audio/voices` (Auth: Admin) — Create/update voice profiles.
- `GET /api/v1/audio/voices` (Auth: Staff) — List available system voices and accents.
- `POST /api/v1/questions` (Auth: `questions.create`) — Accepts `type: 'LISTENING'` payload.

## 10. Frontend
- **Components**:
  - `ExamAudioPlayer.tsx`: Exam-safe audio player with play counter and disabled seek bar.
  - `ListeningAuthoringPanel.tsx`: Question Bank tab for script entry, voice picker, and sub-question builder.
  - `VoiceSelector.tsx`: Reusable accent and voice dropdown.

## 11. AI / External Services
- **TTS Gateway**: Integrates with Cloud TTS providers (Google Cloud TTS, OpenAI TTS, AWS Polly, MockTTS fallback).
- **Safety**: Script sanitization against SSML injection.
- **Fallbacks**: If live cloud TTS fails during authoring, fall back to Mock audio generator or report clear error.

## 12. Permissions / Entitlements
- **Authoring**: Requires `questions.create` / `questions.update`.
- **Attempting**: Requires `exams.attempt`.
- **Entitlements**: Listening tests consume standard mock test allowances defined in `@repo/entitlement-engine`.

## 13. Maintenance Behaviour
- Pluggable into Feature Maintenance (`feature-maintenance.md`): If `featureKey: 'listening_audio'` is toggled to maintenance, audio generation is disabled with notice, but existing pre-rendered audio playback in published exams continues functioning offline.

## 14. Import / Export
- Supports JSON export/import via `json-import-export.md` containing script, voice config, and bundled base64/URL audio assets.

## 15. Edge Cases
- Candidate refreshes browser mid-audio: Replay count must be synchronized with server/attempt state to prevent cheating by refreshing.
- Slow network latency: Audio preloads into browser memory buffer before countdown completes to avoid mid-stream buffering.
- Missing audio file: Player falls back to displaying clear error without crashing exam runtime.

## 16. Test Cases
- **Unit (LIST-U001)**: `ListeningHandler.validate()` returns true for valid sub-questions and audio metadata.
- **Unit (LIST-U002)**: `ListeningHandler.evaluate()` correctly scores 5/5 sub-answers with partial marks.
- **API (LIST-A001)**: `POST /api/v1/audio/synthesize-preview` returns valid MP3 URL for authenticated teacher.
- **API (LIST-A002)**: `POST /api/v1/audio/synthesize-preview` returns 403 for student account.
- **UI (LIST-UI001)**: Audio player disables play button after `playbackLimit` reached.
- **E2E (LIST-E001)**: Student starts listening exam, hears audio, answers sub-questions, submits, and receives accurate score.
- **Failure (LIST-F001)**: Network disconnect during audio fetch triggers retry prompt without consuming attempt play count.

## 17. Acceptance Criteria
- [ ] `LISTENING` question type registered in `@repo/question-types`.
- [ ] Sub-questions support MCQ, Fill-in-Blank, Matching, and Diagram Labeling.
- [ ] Shared voice and accent configuration usable across platform.
- [ ] Published exam audio immutable in `exam_snapshots`.
- [ ] Strict play-count limits enforced in student player.

## 18. Dependencies
- `@repo/question-types` Pluggable Registry
- `apps/api/src/services/audio/audio-config.service.ts`
- Feature Maintenance Engine (`features/feature-maintenance.md`)

## 19. Future Improvements
- Interactive audio waveform bookmarks for section replay in practice mode.
- Candidate speech speed adjustment (0.8x / 1.0x / 1.2x) for accessibility and practice modes.
