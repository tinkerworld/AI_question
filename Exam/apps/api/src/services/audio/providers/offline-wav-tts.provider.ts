import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { TTSProvider, TTSOptions, TTSResult } from '../tts-provider.interface';

export class OfflineWavTTSProvider implements TTSProvider {
  readonly id = 'tts_offline_wav';
  readonly name = 'Deterministic Offline PCM WAV Speech Synthesizer';
  readonly type = 'OFFLINE_WAV' as const;

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    const cleanText = String(text || '').replace(/<[^>]*>/g, '').trim();
    const words = cleanText.split(/\s+/).filter(Boolean).length;
    const speed = options.speed || 1.0;
    const durationSeconds = Math.max(3, Math.min(60, Math.round((words / (140 * speed)) * 60)));

    // Attempt native Windows SAPI Speech Synthesis if available for real voice fallback
    if (process.platform === 'win32') {
      try {
        const voiceName = options.gender === 'FEMALE' ? 'Microsoft Zira Desktop' : 'Microsoft David Desktop';
        const tempWav = path.join(os.tmpdir(), `sapi_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
        const escapedText = cleanText.replace(/"/g, '`"').replace(/'/g, "''");
        const script = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; try { $s.SelectVoice('${voiceName}') } catch {}; $s.SetOutputToWaveFile('${tempWav.replace(/\\/g, '\\\\')}'); $s.Speak("${escapedText}"); $s.Dispose()`;
        
        execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${script}"`, { timeout: 8000 });
        
        if (fs.existsSync(tempWav)) {
          const buf = fs.readFileSync(tempWav);
          try { fs.unlinkSync(tempWav); } catch {}
          return {
            buffer: buf,
            format: 'wav',
            durationSeconds,
            isFallback: true,
            warning: `Offline local speech synthesizer active (${voiceName}). Primary studio neural voice was unavailable.`,
          };
        }
      } catch (sapiErr) {
        console.warn('Windows SAPI fallback error:', (sapiErr as any).message);
      }
    }

    // Emergency harmonic formant synthesis (pure offline fallback)
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const dataSize = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF Header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    let baseFreq = 180;
    if (options.gender === 'FEMALE') baseFreq = 220;
    if (options.gender === 'MALE') baseFreq = 140;

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const syllableEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.5 * t);
      const fundamental = Math.sin(2 * Math.PI * baseFreq * t);
      const formant1 = 0.5 * Math.sin(2 * Math.PI * (baseFreq * 2.5) * t);
      const formant2 = 0.25 * Math.sin(2 * Math.PI * (baseFreq * 4.2) * t);
      const sampleValue = (fundamental + formant1 + formant2) * syllableEnv * 0.4;
      const int16 = Math.max(-32767, Math.min(32767, Math.floor(sampleValue * 32767)));
      buffer.writeInt16LE(int16, offset);
      offset += 2;
    }

    return {
      buffer,
      format: 'wav',
      durationSeconds,
      isFallback: true,
      warning: 'Offline emergency synthesizer active. Primary studio neural voice was unavailable.',
    };
  }
}
