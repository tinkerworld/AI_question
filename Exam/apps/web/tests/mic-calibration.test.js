const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Microphone Calibration & Hard Gate Logic', () => {
  // Model of the calibration state controller used in InterviewPage
  class MicCalibrationController {
    constructor() {
      this.status = 'IDLE';
      this.audioLevel = 0;
      this.errorMessage = '';
      this.agreedTerms = false;
      this.silenceTimer = null;
    }

    reset() {
      this.status = 'IDLE';
      this.audioLevel = 0;
      this.errorMessage = '';
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    async startCalibration(mockNavigator, opts = { silenceTimeoutMs: 50, speechThreshold: 12 }) {
      this.reset();
      this.status = 'REQUESTING';

      // 1. Check mediaDevices support
      if (!mockNavigator || !mockNavigator.mediaDevices || !mockNavigator.mediaDevices.getUserMedia) {
        this.status = 'FAILED_NO_DEVICE';
        this.errorMessage = 'Your browser does not support audio recording or media devices. Please use a modern browser and reload.';
        return;
      }

      // 2. Enumerate check
      if (mockNavigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await mockNavigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter((d) => d.kind === 'audioinput');
          if (devices.length > 0 && audioInputs.length === 0) {
            this.status = 'FAILED_NO_DEVICE';
            this.errorMessage = 'No microphone device detected on your system. Please connect a microphone, headset, or enable your device audio input in your operating system settings, then click Retry.';
            return;
          }
        } catch {}
      }

      // 3. getUserMedia
      let stream;
      try {
        stream = await mockNavigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        const errorName = err?.name || '';
        if (
          errorName === 'NotFoundError' ||
          errorName === 'DevicesNotFoundError' ||
          errorName === 'OverconstrainedError'
        ) {
          this.status = 'FAILED_NO_DEVICE';
          this.errorMessage = 'No microphone device found. Please connect a working microphone or headset to your machine, ensure it is enabled in your OS sound settings, and click Retry.';
          return;
        }

        if (
          errorName === 'NotAllowedError' ||
          errorName === 'PermissionDeniedError' ||
          errorName === 'SecurityError'
        ) {
          this.status = 'FAILED_PERMISSION';
          this.errorMessage = 'Microphone access was blocked by your browser. To participate in this oral interview, open your browser site settings, set Microphone permissions to "Allow", and click Retry.';
          return;
        }

        this.status = 'FAILED_PERMISSION';
        this.errorMessage = `Unable to access microphone: ${err?.message || 'Permission denied'}.`;
        return;
      }

      // 4. Listening & Energy Monitoring
      this.status = 'LISTENING';

      return new Promise((resolve) => {
        let voiceDetected = false;

        this.silenceTimer = setTimeout(() => {
          if (!voiceDetected) {
            this.status = 'FAILED_SILENCE';
            this.errorMessage = 'Microphone connected, but no audio was detected after 6 seconds of silence. Please check that your microphone is not hardware-muted or software-muted, and ensure the correct input device is selected as your default microphone in your OS settings.';
            resolve();
          }
        }, opts.silenceTimeoutMs);

        // Simulation helper exposed on stream mock
        if (stream.simulateAudioLevel) {
          stream.simulateAudioLevel((level) => {
            this.audioLevel = level;
            if (level >= opts.speechThreshold) {
              voiceDetected = true;
              clearTimeout(this.silenceTimer);
              this.status = 'CALIBRATED';
              resolve();
            }
          });
        }
      });
    }

    isBeginButtonEnabled() {
      return this.agreedTerms === true && this.status === 'CALIBRATED';
    }

    isAgreementCheckboxEnabled() {
      return this.status === 'CALIBRATED';
    }
  }

  test('Failure State 1: Blocks entry when no microphone device is found (NotFoundError)', async () => {
    const controller = new MicCalibrationController();
    const mockNavigator = {
      mediaDevices: {
        enumerateDevices: async () => [],
        getUserMedia: async () => {
          const err = new Error('No audio input devices found');
          err.name = 'NotFoundError';
          throw err;
        },
      },
    };

    await controller.startCalibration(mockNavigator);

    assert.strictEqual(controller.status, 'FAILED_NO_DEVICE');
    assert.match(controller.errorMessage, /No microphone device found/);
    assert.strictEqual(controller.isAgreementCheckboxEnabled(), false);
    assert.strictEqual(controller.isBeginButtonEnabled(), false);
  });

  test('Failure State 1 (Zero Audio Inputs): Blocks entry when enumerateDevices has devices but 0 audio inputs', async () => {
    const controller = new MicCalibrationController();
    const mockNavigator = {
      mediaDevices: {
        enumerateDevices: async () => [
          { kind: 'videoinput', deviceId: 'vid1' },
          { kind: 'audiooutput', deviceId: 'spk1' },
        ],
        getUserMedia: async () => ({}),
      },
    };

    await controller.startCalibration(mockNavigator);

    assert.strictEqual(controller.status, 'FAILED_NO_DEVICE');
    assert.match(controller.errorMessage, /No microphone device detected/);
    assert.strictEqual(controller.isBeginButtonEnabled(), false);
  });

  test('Failure State 2: Blocks entry when browser permission is denied (NotAllowedError)', async () => {
    const controller = new MicCalibrationController();
    const mockNavigator = {
      mediaDevices: {
        enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'mic1' }],
        getUserMedia: async () => {
          const err = new Error('Permission denied by user');
          err.name = 'NotAllowedError';
          throw err;
        },
      },
    };

    await controller.startCalibration(mockNavigator);

    assert.strictEqual(controller.status, 'FAILED_PERMISSION');
    assert.match(controller.errorMessage, /Microphone access was blocked by your browser/);
    assert.match(controller.errorMessage, /site settings/);
    assert.strictEqual(controller.isAgreementCheckboxEnabled(), false);
    assert.strictEqual(controller.isBeginButtonEnabled(), false);
  });

  test('Failure State 3: Blocks entry when device present & permitted, but silence detected after timeout', async () => {
    const controller = new MicCalibrationController();
    const mockNavigator = {
      mediaDevices: {
        enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'mic1' }],
        getUserMedia: async () => ({
          simulateAudioLevel: (cb) => {
            // Level 0 (silent/muted mic)
            cb(0);
          },
        }),
      },
    };

    await controller.startCalibration(mockNavigator, { silenceTimeoutMs: 30, speechThreshold: 12 });

    assert.strictEqual(controller.status, 'FAILED_SILENCE');
    assert.match(controller.errorMessage, /no audio was detected after 6 seconds of silence/);
    assert.match(controller.errorMessage, /hardware-muted or software-muted/);
    assert.strictEqual(controller.isAgreementCheckboxEnabled(), false);
    assert.strictEqual(controller.isBeginButtonEnabled(), false);
  });

  test('Success Path: Calibrates when speech energy reaches threshold, gating Begin button on agreement', async () => {
    const controller = new MicCalibrationController();
    const mockNavigator = {
      mediaDevices: {
        enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'mic1' }],
        getUserMedia: async () => ({
          simulateAudioLevel: (cb) => {
            // Normal human voice energy
            cb(35);
          },
        }),
      },
    };

    await controller.startCalibration(mockNavigator, { silenceTimeoutMs: 50, speechThreshold: 12 });

    assert.strictEqual(controller.status, 'CALIBRATED');
    assert.strictEqual(controller.audioLevel, 35);
    assert.strictEqual(controller.isAgreementCheckboxEnabled(), true);

    // Hard gate: Button is NOT enabled until agreement checkbox is checked
    assert.strictEqual(controller.isBeginButtonEnabled(), false);

    // User checks agreement
    controller.agreedTerms = true;
    assert.strictEqual(controller.isBeginButtonEnabled(), true);
  });

  test('Retry Action: Restores REQUESTING state and allows subsequent calibration recovery', async () => {
    const controller = new MicCalibrationController();
    
    // First attempt fails (e.g. muted)
    const silentNavigator = {
      mediaDevices: {
        enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'mic1' }],
        getUserMedia: async () => ({
          simulateAudioLevel: (cb) => cb(0),
        }),
      },
    };
    await controller.startCalibration(silentNavigator, { silenceTimeoutMs: 20, speechThreshold: 12 });
    assert.strictEqual(controller.status, 'FAILED_SILENCE');
    assert.strictEqual(controller.isBeginButtonEnabled(), false);

    // User un-mutes and clicks Retry
    const workingNavigator = {
      mediaDevices: {
        enumerateDevices: async () => [{ kind: 'audioinput', deviceId: 'mic1' }],
        getUserMedia: async () => ({
          simulateAudioLevel: (cb) => cb(28),
        }),
      },
    };
    await controller.startCalibration(workingNavigator, { silenceTimeoutMs: 50, speechThreshold: 12 });
    assert.strictEqual(controller.status, 'CALIBRATED');
    controller.agreedTerms = true;
    assert.strictEqual(controller.isBeginButtonEnabled(), true);
  });
});
