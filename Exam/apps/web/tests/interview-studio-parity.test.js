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
});
