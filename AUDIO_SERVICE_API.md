# Audio Microservice API Specification (`/v1/audio`)

The Audio Microservice provides general-purpose Speech-to-Text (ASR) via Whisper and Text-to-Speech (TTS) via Piper. It runs as an independent, domain-agnostic audio subsystem with optional shared-secret authentication.

---

## Authentication

When `AUDIO_SERVICE_SECRET` or `AUDIO_AUTH_TOKEN` is configured on the service, clients must provide the shared secret in either of the following headers:

```http
Authorization: Bearer <SECRET_TOKEN>
```
or
```http
X-Audio-Secret: <SECRET_TOKEN>
```

If neither environment variable is configured on the server, requests are accepted unauthenticated.

---

## 1. Service Health & Device State

### `GET /v1/audio/health`

Returns live status of Whisper ASR and Piper TTS engines, active device (CUDA vs CPU), and memory state.

#### Response (`200 OK`):
```json
{
  "status": "healthy",
  "service": "audio_microservice",
  "whisper_model": "small",
  "whisper_device_configured": "cuda",
  "whisper_model_loaded": true,
  "active_device": "cuda",
  "cuda_available": true,
  "tts_provider": "piper",
  "timestamp": 1789254000.123
}
```

---

## 2. Speech-to-Text (ASR)

### `POST /v1/audio/transcribe`

Transcribes speech audio into text and produces acoustic confidence statistics.

#### Headers:
- `Content-Type`: `application/json` (for base64 audio payload) OR `audio/webm`, `audio/wav`, `audio/ogg` (for binary body)
- `X-Language`: (Optional) ISO language code, defaults to `"en"`. Pass `"auto"` or `"multi"` for auto-detection.

#### JSON Request Body:
```json
{
  "audio_base64": "<base64-encoded-audio-bytes>",
  "audio_format": "webm",
  "language": "en",
  "min_words": 1
}
```

#### Binary Audio Request:
Send raw audio bytes directly as the request body with `Content-Type: audio/webm` or `audio/wav`. Query parameters `?lang=en&min_words=1` may be supplied.

#### Success Response (`200 OK`):
```json
{
  "text": "Embedded Linux systems typically use the Yocto Project to create custom distributions.",
  "duration_s": 4.82,
  "asr_s": 0.41,
  "confidence_metadata": {
    "is_low_confidence": false,
    "avg_logprob": -0.284,
    "max_no_speech_prob": 0.012,
    "reason": null
  }
}
```

#### Low Confidence / Unusable Speech Response (`200 OK`):
```json
{
  "text": "",
  "duration_s": 0.0,
  "asr_s": 0.0,
  "confidence_metadata": {
    "is_low_confidence": true,
    "avg_logprob": -999.0,
    "max_no_speech_prob": 1.0,
    "reason": "no usable speech (junk or hallucination: "Thank you.")"
  },
  "error": "no usable speech (junk or hallucination: "Thank you.")"
}
```

---

## 3. Text-to-Speech (TTS)

### `POST /v1/audio/synthesize` (or `GET /v1/audio/synthesize`)

Synthesizes high-fidelity voice audio from input text.

#### JSON Request Body (`POST`):
```json
{
  "text": "Could you explain how BitBake determines layer priority?",
  "voice": "emma",
  "rate": 1.0
}
```

#### Query Parameters (`GET`):
- `text`: Text to speak (required)
- `voice`: Voice persona ID (e.g. `emma`, `pooja`, `sarah`, `liam`, `james`, `arthur`, `david`, `rohan`)
- `rate`: Speed rate multiplier (default: `1.0`)

#### Response (`200 OK`):
- `Content-Type`: `audio/x-wav` or `audio/mpeg`
- `Content-Length`: `<byte_count>`
- `X-TTS-Provider`: `piper`
- `X-TTS-Voice`: `emma`
- `X-Audio-Duration`: `<duration_seconds>`
- Body: Raw synthesized audio bytes

---

## Available Voice Profiles

| ID | Name | Accent | Gender | Style |
|---|---|---|---|---|
| `emma` | Emma | British (UK) | Female | Professional, warm, structured |
| `pooja` | Pooja | Indian (IN) | Female | Articulate, precise, academic |
| `sarah` | Sarah | American (US) | Female | Clear, conversational |
| `chloe` | Chloe | Australian (AU) | Female | Engaging, natural |
| `liam` | Liam | British (UK) | Male | Authoritative, technical |
| `james` | James | American (US) | Male | Confident, direct |
| `arthur` | Arthur | British (UK) | Male | Formal, thoughtful |
| `david` | David | Australian (AU) | Male | Relaxed, encouraging |
| `rohan` | Rohan | Indian (IN) | Male | Dynamic, articulate |
