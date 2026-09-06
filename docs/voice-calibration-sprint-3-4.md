# Voice Calibration System — Sprint 3 & Sprint 4 Development Report

**Module:** AI Viva Voce Oral Assessment System  
**Scope:** Sprint 3 (Persistence & Lifecycle) & Sprint 4 (Runtime Application & Parameterization)  
**Date:** September 6, 2026  
**Status:** Completed & Fully Verified  

---

## Executive Summary

Following the successful audit and measurement pipeline built in **Sprint 1 & Sprint 2**, this round delivers **Sprint 3 (Persistence)** and **Sprint 4 (Runtime Application)**:
1. **Sprint 3 (Persistence)**: Once acoustic calibration succeeds, the candidate's `VoiceProfile` is persisted to PostgreSQL against their user profile. When entering subsequent interviews, the system verifies the existing profile, marks calibration as satisfied immediately (`calibrationStatus = 'CALIBRATED'`), unlocks the "Begin Interview" gate, and presents a prominent "🔄 Recalibrate" action to prevent silent reuse of stale profiles if the microphone or room acoustics change.
2. **Sprint 4 (Runtime Application)**: During live interview turns, the candidate's personalized acoustic parameters replace hardcoded constants:
   - **Personalized Pause Tolerance ($T_{\text{pause}}$)** derived from `speechRateWpm` and `p75PauseMs` replaces fixed timeouts.
   - **Personalized Silence Threshold ($\text{Th}_{\text{silence}}$)** derived from `noiseFloor` and `medianVolume` replaces fixed thresholds.
   - Both parameters are guarded by the feature flag `USE_PERSONALIZED_VOICE_CALIBRATION` (defaults to true), with clean runtime rollback to pre-Sprint-4 fixed behavior (`4000ms` pause / `-35.0 dBFS` silence threshold).

---

## 1. Architectural Overview & Data Flow

```mermaid
flowchart TD
    subgraph PreInterview["Pre-Interview Instructions Screen (Sprint 3)"]
        A[Candidate Opens Instructions Modal] --> B{Saved VoiceProfile exists in DB?}
        B -->|Yes| C["Load Saved Profile: calibrationStatus = 'CALIBRATED'<br/>Unlock Begin Interview Button immediately<br/>Display Prominent '🔄 Recalibrate' Button"]
        B -->|No| D["Show 2-Phase Calibration UI<br/>Gate Begin Interview until passage reading completes"]
        D -->|Passage Read & Validated| E["POST /api/v1/interview/voice-profile<br/>Persist to user_voice_profiles & users table"]
        E --> C
        C -->|Candidate clicks Recalibrate| D
    end

    subgraph Runtime["Live Viva Voce Room (Sprint 4)"]
        C -->|Begin Interview Clicked| F[Active Viva Session Started]
        F --> G["calculateTurnAcousticParameters(profile, isEnabled)"]
        G --> H{"Feature Flag:<br/>USE_PERSONALIZED_VOICE_CALIBRATION"}
        H -->|Enabled (Default)| I["Personalized Parameters:<br/>• Pause Timeout = 1200 + (P75 * 2.5 * 140 / WPM) ms<br/>• Silence Threshold = NoiseFloor + (SNR * 0.35) dBFS"]
        H -->|Disabled (Rollback)| J["Fixed Baseline:<br/>• Pause Timeout = 4000ms<br/>• Silence Threshold = -35.0 dBFS"]
        I & J --> K["recordingTimeoutRef & Web Audio Analyser Loop"]
        K --> L["Candidate vocalizes: dbfs > threshold -> speech maintained<br/>Candidate pauses: timeout expires after T_pause -> turn completed"]
    end
```

---

## 2. Sprint 3 Implementation Details (Persistence & Lifecycle)

### A. Database Storage Architecture
To guarantee ACID durability and backward compatibility, the calibrated `VoiceProfile` is stored in PostgreSQL:
1. **Dedicated Normalized Table (`user_voice_profiles`)**:
   ```sql
   CREATE TABLE IF NOT EXISTS "user_voice_profiles" (
     "id" TEXT PRIMARY KEY,
     "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
     "voiceProfile" JSONB NOT NULL,
     "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. **Direct User Record Sync**:
   `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "voiceProfile" JSONB;`
   Synchronized on upsert for seamless join-free queries.

### B. REST API Endpoints
- **`GET /api/v1/interview/voice-profile`**:
  - Requires: `authenticate`, `requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT)`.
  - Returns: `{ success: true, data: { profile, updatedAt } }` or `{ success: true, data: null }`.
- **`POST /api/v1/interview/voice-profile`**:
  - Requires: `authenticate`, `requirePermission(PERMISSIONS.INTERVIEW_ATTEMPT)`.
  - Body: `{ profile: VoiceProfile }`.
  - Validates: Non-empty object conforming to `VoiceProfile` schema, else returns `400 INVALID_VOICE_PROFILE`.
  - Upserts into PostgreSQL and returns `{ success: true, data: { profile, updatedAt } }`.

### C. Pre-Interview Modal Lifecycle
- When entering instructions, `fetchVoiceProfile()` runs via `useEffect`.
- If a valid profile exists:
  - `voiceCalibrationProfile` is populated immediately.
  - `calibrationStatus` transitions to `'CALIBRATED'`.
  - The instructions agreement checkbox and "Begin Interview" button unlock without repeating the reading test.
- **Environment Change Protection**:
  - When the candidate changes microphone or room, the prominent **`🔄 Recalibrate`** button resets `voiceCalibrationProfile` to `null`, relocks the "Begin Interview" gate, and allows running the 20-second acoustic calibration flow again.

---

## 3. Sprint 4 Implementation Details (Runtime Application)

### A. Acoustic Derivation Formulas

#### 1. Personalized Pause Tolerance ($T_{\text{pause}}$)
Natural speech pauses vary dramatically based on the speaker's articulation rate:
$$\text{rateFactor} = \max\left(0.6, \min\left(1.8, \frac{140}{\text{speechRateWpm}}\right)\right)$$
$$T_{\text{pause}} = \max\left(1800, \min\left(5000, \text{round}\left(1200 + (\text{p75PauseMs} \times 2.5 \times \text{rateFactor})\right)\right)\right)$$

- **Safety Clamps**: Clamped within $[1800\text{ ms}, 5000\text{ ms}]$ to prevent premature cutoffs or runaway recording loops.
- **Rollback / Flag OFF**: Cleanly falls back to fixed $\mathbf{4000\text{ ms}}$.

#### 2. Personalized Silence Detection Threshold ($\text{Th}_{\text{silence}}$)
Dynamic speech threshold calibrated to physical acoustic signal-to-noise ratio:
$$\text{SNR} = \max\left(6, \text{medianVolume} - \text{noiseFloor}\right)$$
$$\text{margin} = \max\left(5.0, \min\left(15.0, \text{SNR} \times 0.35\right)\right)$$
$$\text{Th}_{\text{silence}} = \max\left(-55.0, \min\left(-18.0, \frac{\text{round}\left((\text{noiseFloor} + \text{margin}) \times 10\right)}{10}\right)\right)$$

- **Safety Clamps**: Clamped within $[-55.0\text{ dBFS}, -18.0\text{ dBFS}]$.
- **Rollback / Flag OFF**: Cleanly falls back to fixed $\mathbf{-35.0\text{ dBFS}}$.

### B. Minimal Parameterization of `recordingTimeoutRef` & Silence Detection
Per strict prompt instructions, no heavy state machine was introduced:
1. **`activeAcousticsRef`**: Holds `{ pauseTimeoutMs, silenceThresholdDbfs, isPersonalized }`.
2. **`bindRecognitionHandlers`**: On vocal delivery (`recog.onresult`), clears and resets `recordingTimeoutRef` with `activeAcousticsRef.current.pauseTimeoutMs`.
3. **`toggleSpeechRecognition`**: Starts recording with `activeAcousticsRef.current.pauseTimeoutMs` ceiling.
4. **Physical Web Audio Monitor**: An optional lightweight `AnalyserNode` monitors live dBFS while recording. If $\text{dBFS} > \text{Th}_{\text{silence}}$, the speaker is actively vocalizing, keeping the pause timer refreshed. Once the signal drops below threshold for $T_{\text{pause}}$, the turn is cleanly concluded.
5. **Turn Submission**: `stopLiveAudioMonitoring()` immediately tears down the audio graph and clears `recordingTimeoutRef` upon turn submission.

### C. Feature Flag Architecture (`USE_PERSONALIZED_VOICE_CALIBRATION`)
- Exported via `audioMeasurement.ts`: `getUsePersonalizedVoiceCalibration()` and `setUsePersonalizedVoiceCalibration(enabled)`.
- Default: `true`. Persisted in browser `localStorage`.
- **Live Room Indicator & Toggle**: The Room Top Bar displays an active badge:
  - **ON**: `🎯 Personalized (3486ms / -43.8 dBFS)` with button `Rollback to Fixed`.
  - **OFF**: `⏱️ Fixed Baseline (4000ms / -35 dBFS)` with button `Use Calibrated`.

---

## 4. Verification & Experimental Results

### A. Test A (Slow / Quiet Speaker) vs Test B (Fast / Loud Speaker)

| Metric | Candidate A (Quiet / Slow) | Candidate B (Loud / Fast) | Delta / Material Difference |
|---|---|---|---|
| **Speech Rate** | 98 WPM | 190 WPM | Slow is 92 WPM slower |
| **Natural P75 Pause** | 640 ms | 240 ms | Slow has +400 ms longer pauses |
| **Ambient Noise Floor** | -52.0 dBFS | -48.0 dBFS | -4.0 dB quieter room |
| **Median Speech Volume** | -28.5 dBFS | -14.2 dBFS | -14.3 dB quieter voice |
| **Flag ON: Pause Tolerance** | **3,486 ms** | **1,800 ms** (clamped) | **+1,686 ms (+93.7%)** |
| **Flag ON: Silence Threshold** | **-43.8 dBFS** | **-36.2 dBFS** | **-7.6 dBFS sensitivity delta** |
| **Flag OFF: Pause Tolerance** | **4,000 ms** | **4,000 ms** | Exact baseline parity |
| **Flag OFF: Silence Threshold**| **-35.0 dBFS** | **-35.0 dBFS** | Exact baseline parity |

### Key Findings:
- **Quiet/Slow Candidate**: Receives **3,486 ms** of pause tolerance (+93.7% more than fast speaker), ensuring thoughtful deliberation does not cause accidental premature turn termination. The silence threshold is expanded to **-43.8 dBFS**, preventing quiet soft-spoken phonemes from being classified as silence.
- **Fast/Loud Candidate**: Receives **1,800 ms** pause tolerance, resulting in rapid, snappy turn recognition with no awkward delays. The silence threshold is raised to **-36.2 dBFS**, ignoring background whispers or room echo.
- **Rollback Verification (Flag OFF)**: Toggling the flag to `false` instantly reverts both speakers to **4000 ms** pause timeout and **-35.0 dBFS** silence threshold with zero side effects.

---

## 5. Automated Test Suite Results

```bash
node --test apps/web/tests/*.test.js
```

```
▶ Dynamic Network API Base Resolution
  ✔ 5/5 tests passed
▶ Voice Calibration & Measurement Engine (Sprint 2 Specification Tests)
  ✔ 8/8 tests passed
▶ Microphone Calibration & Hard Gate Logic
  ✔ 6/6 tests passed
▶ Voice Calibration — Sprint 3 (Persistence) & Sprint 4 (Runtime Application)
  ▶ Sprint 4: Parameterized Pause Timeout & Silence Threshold (Flag ON)
    ✔ Quiet/Slow Speaker receives materially higher pause tolerance and sensitive threshold (0.86ms)
    ✔ Loud/Fast Speaker receives lower pause tolerance and robust silence threshold (0.18ms)
    ✔ Slow speaker gets materially more pause tolerance than fast speaker (+1686 ms / +93.7%) (0.21ms)
    ✔ Normal Speaker receives well-balanced middle parameters (0.18ms)
    ✔ Enforces absolute safety bounds: clamp [1800ms, 5000ms] and [-55.0 dBFS, -18.0 dBFS] (0.19ms)
  ✔ Sprint 4: Parameterized Pause Timeout & Silence Threshold (Flag ON)
  ▶ Sprint 4: Feature Flag Rollback Verification (Flag OFF)
    ✔ Rollback cleanly reverts Slow Speaker to fixed baseline (4000ms / -35.0 dBFS) (0.26ms)
    ✔ Rollback cleanly reverts Fast Speaker to fixed baseline (4000ms / -35.0 dBFS) (0.18ms)
    ✔ Null profile cleanly reverts to fixed baseline regardless of feature flag (0.15ms)
    ✔ Feature flag getter/setter controls runtime behavior dynamically (0.20ms)
  ✔ Sprint 4: Feature Flag Rollback Verification (Flag OFF)
  ▶ Sprint 3: Persistence API & Student User Profile Storage
    ✔ Student logs in to authenticate for voice profile endpoints (400ms)
    ✔ POST /api/v1/interview/voice-profile persists calibrated VoiceProfile to user record (24ms)
    ✔ GET /api/v1/interview/voice-profile retrieves persisted profile on pre-interview entry (3ms)
    ✔ POST /api/v1/interview/voice-profile rejects invalid profile with 400 AppError (9ms)
    ✔ GET /api/v1/interview/voice-profile rejects unauthenticated request with 401 (2ms)
  ✔ Sprint 3: Persistence API & Student User Profile Storage

Total: 33 tests passed, 0 failed, 100% passing rate.
TypeScript compilation (tsc --noEmit): Clean (0 errors).
Vite production build: Clean (1.16s).
```
