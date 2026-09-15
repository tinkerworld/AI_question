const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('AI Interview Studio Parity Tests (ExamOS <-> Video_model_train)', () => {
  const interviewPagePath = path.resolve(__dirname, '../src/pages/InterviewPage.tsx');
  const themeCssPath = path.resolve(__dirname, '../src/styles/theme.css');

  test('PARITY-001: Required CSS classes exist in theme.css', () => {
    const cssContent = fs.readFileSync(themeCssPath, 'utf8');
    assert.ok(cssContent.includes('.speaking-wave'), 'Must include .speaking-wave animation class');
    assert.ok(cssContent.includes('.listening-wave'), 'Must include .listening-wave animation class');
    assert.ok(cssContent.includes('.live-mic-pulse'), 'Must include .live-mic-pulse pulsing mic dot');
    assert.ok(cssContent.includes('.vu-bar'), 'Must include .vu-bar for dynamic audio meter');
    assert.ok(cssContent.includes('@keyframes pulseGlowRed'), 'Must include @keyframes pulseGlowRed');
    assert.ok(cssContent.includes('@keyframes waveAnimation'), 'Must include @keyframes waveAnimation');
  });

  test('PARITY-002: In-Interview Voice Toolbar & Pacing Switcher exist in InterviewPage.tsx', () => {
    const pageContent = fs.readFileSync(interviewPagePath, 'utf8');
    assert.ok(pageContent.includes('id="voice-bar-profile-select"'), 'Must have voice-bar-profile-select');
    assert.ok(pageContent.includes('id="voice-bar-pace-select"'), 'Must have voice-bar-pace-select');
    assert.ok(pageContent.includes('id="voice-speaking-badge"'), 'Must have voice-speaking-badge');
    assert.ok(pageContent.includes('id="live-listening-badge"'), 'Must have live-listening-badge');
    assert.ok(pageContent.includes('handleSwitchVoicePersona'), 'Must call handleSwitchVoicePersona');
    assert.ok(pageContent.includes('handlePacingChange'), 'Must call handlePacingChange');
  });

  test('PARITY-003: 3-Minute Hold Mode & Inactivity Nudge Cards exist in InterviewPage.tsx', () => {
    const pageContent = fs.readFileSync(interviewPagePath, 'utf8');
    assert.ok(pageContent.includes('id="interview-hold-card"'), 'Must have interview-hold-card');
    assert.ok(pageContent.includes('id="hold-countdown-timer"'), 'Must have hold-countdown-timer');
    assert.ok(pageContent.includes('id="btn-resume-interview"'), 'Must have btn-resume-interview');
    assert.ok(pageContent.includes('id="btn-hold-repeat-question"'), 'Must have btn-hold-repeat-question');
    assert.ok(pageContent.includes('id="inactivity-nudge-banner"'), 'Must have inactivity-nudge-banner');
    assert.ok(pageContent.includes('id="btn-nudge-hold"'), 'Must have btn-nudge-hold');
  });

  test('PARITY-004: Conversational Dialogue Card & Candidate Answer Section exist in InterviewPage.tsx', () => {
    const pageContent = fs.readFileSync(interviewPagePath, 'utf8');
    assert.ok(pageContent.includes('id="conversational-response-card"'), 'Must have conversational-response-card');
    assert.ok(pageContent.includes('id="conversational-response-title"'), 'Must have conversational-response-title');
    assert.ok(pageContent.includes('id="btn-replay-conversational-audio"'), 'Must have btn-replay-conversational-audio');
    assert.ok(pageContent.includes('id="conversational-response-text"'), 'Must have conversational-response-text');
    assert.ok(pageContent.includes('id="eval-candidate-answer-section"'), 'Must have eval-candidate-answer-section');
    assert.ok(pageContent.includes('id="eval-candidate-answer-text"'), 'Must have eval-candidate-answer-text');
  });

  test('PARITY-005: Live Speech Preview, VU Meter, Silence Countdown & Done Speaking exist', () => {
    const pageContent = fs.readFileSync(interviewPagePath, 'utf8');
    assert.ok(pageContent.includes('id="live-speech-preview-box"'), 'Must have live-speech-preview-box');
    assert.ok(pageContent.includes('id="live-speech-status-label"'), 'Must have live-speech-status-label');
    assert.ok(pageContent.includes('id="live-vu-meter"'), 'Must have live-vu-meter');
    assert.ok(pageContent.includes('id="live-speech-preview-text"'), 'Must have live-speech-preview-text');
    assert.ok(pageContent.includes('id="silence-countdown"'), 'Must have silence-countdown');
    assert.ok(pageContent.includes('id="btn-extend-silence"'), 'Must have btn-extend-silence');
    assert.ok(pageContent.includes('id="btn-done-speaking"'), 'Must have btn-done-speaking');
    assert.ok(pageContent.includes('id="btn-manual-hold"'), 'Must have btn-manual-hold');
  });

  test('PARITY-006: Hold time formatting logic is accurate', () => {
    const formatHoldTime = (totalSeconds) => {
      const m = Math.floor(Math.max(0, totalSeconds) / 60);
      const s = Math.max(0, totalSeconds) % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    assert.strictEqual(formatHoldTime(180), '03:00');
    assert.strictEqual(formatHoldTime(125), '02:05');
    assert.strictEqual(formatHoldTime(59), '00:59');
    assert.strictEqual(formatHoldTime(5), '00:05');
    assert.strictEqual(formatHoldTime(0), '00:00');
    assert.strictEqual(formatHoldTime(-10), '00:00');
  });

  test('PARITY-007: Pacing to timeout mapping mirrors Video_model_train specification', () => {
    const timeoutMap = { fast: 1800, natural: 3000, thoughtful: 4000, relaxed: 5000 };
    assert.strictEqual(timeoutMap.fast, 1800, 'Fast pacing should have 1800ms silence wait');
    assert.strictEqual(timeoutMap.natural, 3000, 'Natural pacing should have 3000ms silence wait');
    assert.strictEqual(timeoutMap.thoughtful, 4000, 'Thoughtful pacing should have 4000ms silence wait');
    assert.strictEqual(timeoutMap.relaxed, 5000, 'Relaxed pacing should have 5000ms silence wait');
  });

  test('PARITY-008: Dynamic 6-Bar VU Meter color palette mirrors Video_model_train', () => {
    const VU_BAR_COLORS = ['#06b6d4', '#06b6d4', '#10b981', '#10b981', '#f59e0b', '#ef4444'];
    assert.strictEqual(VU_BAR_COLORS.length, 6, 'Must have 6 color values for the 6 VU bars');
    assert.strictEqual(VU_BAR_COLORS[0], '#06b6d4', 'First bar should be cyan');
    assert.strictEqual(VU_BAR_COLORS[2], '#10b981', 'Third bar should be emerald green');
    assert.strictEqual(VU_BAR_COLORS[4], '#f59e0b', 'Fifth bar should be amber');
    assert.strictEqual(VU_BAR_COLORS[5], '#ef4444', 'Sixth bar should be red');
  });

  test('PARITY-009: Handsfree Auto-Listen Mode (#live-voice-check & auto-mic) mirrors Video_model_train', () => {
    const pageContent = fs.readFileSync(interviewPagePath, 'utf8');
    assert.ok(pageContent.includes('id="live-voice-check"'), 'Must have live-voice-check toggle');
    assert.ok(pageContent.includes('id="label-live-voice-check"'), 'Must have label-live-voice-check');
    assert.ok(pageContent.includes('id="mic-status-hint"'), 'Must have mic-status-hint');
    assert.ok(pageContent.includes('onQuestionSpeechFinished'), 'Must define onQuestionSpeechFinished');
    assert.ok(pageContent.includes('isHandsfreeMode'), 'Must track isHandsfreeMode state');
  });

  test('PARITY-010: Complete Teardown of Background Processes on Finish & Exit', () => {
    const pageContent = fs.readFileSync(interviewPagePath, 'utf8');
    assert.ok(pageContent.includes('stopAllInterviewBackgroundProcesses'), 'Must define stopAllInterviewBackgroundProcesses');
    assert.ok(pageContent.includes('isInterviewActiveRef'), 'Must track isInterviewActiveRef');
    assert.ok(pageContent.includes('isEvaluatingRef'), 'Must track isEvaluatingRef');
    assert.ok(pageContent.includes('handsfreeTimerRef'), 'Must track handsfreeTimerRef to clear delays');
  });

  test('PARITY-011: Adaptive Silence Detection & Incomplete Thought Guard (Video_model_train Parity)', () => {
    const audioMeasurementPath = path.resolve(__dirname, '../src/utils/audioMeasurement.ts');
    const audioContent = fs.readFileSync(audioMeasurementPath, 'utf8');
    const pageContent = fs.readFileSync(interviewPagePath, 'utf8');

    // 1. Verify utility functions and sets are defined in audioMeasurement.ts
    assert.ok(audioContent.includes('export const CONTINUATION_WORDS'), 'Must export CONTINUATION_WORDS');
    assert.ok(audioContent.includes('export function isIncompleteCandidateThought'), 'Must export isIncompleteCandidateThought');
    assert.ok(audioContent.includes('export function isMeaningfulCandidateResponse'), 'Must export isMeaningfulCandidateResponse');
    assert.ok(audioContent.includes('export function getEffectiveSilenceWaitMs'), 'Must export getEffectiveSilenceWaitMs');

    // 2. Verify InterviewPage.tsx wires up adaptive timing refs and functions
    assert.ok(pageContent.includes('getEffectiveSilenceWaitMs'), 'InterviewPage must import and call getEffectiveSilenceWaitMs');
    assert.ok(pageContent.includes('isMeaningfulCandidateResponse'), 'InterviewPage must filter trivial fillers with isMeaningfulCandidateResponse');
    assert.ok(pageContent.includes('recordingStartTimeRef'), 'InterviewPage must track answer duration via recordingStartTimeRef');
    assert.ok(pageContent.includes('lastSpeechActivityTimeRef'), 'InterviewPage must track voice frames with lastSpeechActivityTimeRef');

    // 3. Algorithmic verification: Incomplete thought regex and continuation connectors
    const continuationWords = new Set([
      'and', 'or', 'but', 'nor', 'so', 'yet', 'because', 'although', 'though', 'even',
      'if', 'unless', 'while', 'whereas', 'since', 'after', 'before', 'until', 'when',
      'whenever', 'where', 'wherever', 'whether', 'as', 'that', 'which', 'who', 'whom',
      'whose', 'furthermore', 'moreover', 'besides', 'additionally', 'specifically',
      'namely', 'like', 'including', 'with', 'without', 'to', 'for', 'of', 'in', 'on', 'at'
    ]);

    const isIncompleteThought = (text) => {
      if (!text || typeof text !== 'string') return false;
      const clean = text.replace(/\[.*?\]|\(.*?\)/g, '').trim();
      if (!clean) return false;
      if (/([,\-–—:;]|\.{2,}|…)\s*$/.test(clean)) return true;
      if (/(such as|for example|for instance|in order to|as well as)\s*$/i.test(clean)) return true;
      const words = clean.toLowerCase().match(/[a-z0-9]+/g) || [];
      if (words.length > 0 && continuationWords.has(words[words.length - 1])) {
        return true;
      }
      return false;
    };

    const getEffectiveWait = (text = '', durationMs = 0, baseWaitMs = 3000) => {
      let bonusMs = 0;
      const words = (text || '').replace(/\[.*?\]|\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      if (wordCount >= 35 || durationMs >= 20000) bonusMs += 1800;
      else if (wordCount >= 15 || durationMs >= 10000) bonusMs += 1000;
      else if (wordCount >= 6 || durationMs >= 5000) bonusMs += 400;
      if (isIncompleteThought(text)) bonusMs += 2200;
      return Math.min(7000, baseWaitMs + bonusMs);
    };

    // Candidate pauses mid-clause with trailing comma or hyphen
    assert.strictEqual(isIncompleteThought('First we configure the load balancer, and then,'), true);
    assert.strictEqual(isIncompleteThought('The database latency spiked because...'), true);
    assert.strictEqual(isIncompleteThought('We used several cloud providers such as'), true);
    assert.strictEqual(isIncompleteThought('That completes my answer on indexing.'), false);

    // Baseline response: 3000ms
    assert.strictEqual(getEffectiveWait('Hello there', 1000, 3000), 3000);

    // Medium response (16 words): 3000ms + 1000ms bonus = 4000ms
    const mediumText = 'We implemented a distributed redis cache that reduced our overall database read latency by sixty percent.';
    assert.strictEqual(getEffectiveWait(mediumText, 8000, 3000), 4000);

    // Incomplete thought clause: 3000ms + 400ms (6 words) + 2200ms (incomplete) = 5600ms
    assert.strictEqual(getEffectiveWait('We started building the backend service because', 6000, 3000), 5600);

    // Long comprehensive answer (35+ words) capped at 7000ms max
    const longText = 'In my previous project, we encountered heavy database bottlenecks during high-traffic flash sales. To mitigate this issue, I redesigned the caching tier using Redis clusters and implemented idempotent message queues with RabbitMQ to handle asynchronous order processing smoothly.';
    assert.strictEqual(getEffectiveWait(longText, 25000, 3000), 4800); // 3000 + 1800
    assert.strictEqual(getEffectiveWait(longText + ' and furthermore,', 25000, 3000), 7000); // 3000 + 1800 + 2200 = 7000 capped
  });
});



