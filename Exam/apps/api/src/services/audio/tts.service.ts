import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pgDb } from '@repo/database';
import { TTSProvider, TTSOptions, TTSResult } from './tts-provider.interface';
import { GoogleTTSProvider } from './providers/google-tts.provider';
import { OfflineWavTTSProvider } from './providers/offline-wav-tts.provider';

export class TTSService {
  private static providers: Map<string, TTSProvider> = new Map();
  private static storageDir: string = path.resolve(__dirname, '..', '..', '..', 'storage', 'audio');

  static {
    // Register default providers
    const google = new GoogleTTSProvider();
    const offlineWav = new OfflineWavTTSProvider();
    this.providers.set(google.id, google);
    this.providers.set(offlineWav.id, offlineWav);

    // Ensure storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  static getStorageDir(): string {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    return this.storageDir;
  }

  static registerProvider(provider: TTSProvider): void {
    this.providers.set(provider.id, provider);
  }

  static getProviders(): Array<{ id: string; name: string; type: string }> {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
    }));
  }

  /**
   * Synthesizes audio from text, writes file to disk if not cached, and returns URL metadata.
   */
  static async synthesize(
    text: string,
    options: TTSOptions = {}
  ): Promise<{
    audioUrl: string;
    filename: string;
    filePath: string;
    format: string;
    durationSeconds: number;
    providerId: string;
    isFallback?: boolean;
    warning?: string;
  }> {
    const cleanText = String(text || '').trim();
    if (!cleanText) {
      throw new Error('Text to synthesize cannot be empty');
    }

    // Resolve voice profile if voiceId is provided
    let accent = options.accent || 'en-GB';
    let gender = options.gender || 'FEMALE';
    let voiceName = 'Standard';

    if (options.voiceId) {
      try {
        const vpRes = await pgDb.query(
          `SELECT * FROM "audio_voice_profiles" WHERE "id" = $1 OR "voiceId" = $1 LIMIT 1`,
          [options.voiceId]
        );
        if (vpRes.rows.length > 0) {
          const vp = vpRes.rows[0] as any;
          accent = vp.accent || accent;
          gender = vp.gender || gender;
          voiceName = vp.name || voiceName;
        }
      } catch {}
    }

    // Stable cache hash based on content, voiceId, accent, gender and speed
    const vId = options.voiceId || 'default';
    const hash = crypto
      .createHash('sha256')
      .update(`${cleanText}_${vId}_${accent}_${gender}_${options.speed || 1.0}`)
      .digest('hex')
      .substring(0, 24);

    // Check if MP3 file already exists
    const mp3Filename = `tts_${hash}.mp3`;
    const mp3Path = path.join(this.getStorageDir(), mp3Filename);
    const wavFilename = `tts_${hash}.wav`;
    const wavPath = path.join(this.getStorageDir(), wavFilename);

    if (fs.existsSync(mp3Path)) {
      const words = cleanText.split(/\s+/).filter(Boolean).length;
      return {
        audioUrl: `/api/v1/audio/stream/${mp3Filename}`,
        filename: mp3Filename,
        filePath: mp3Path,
        format: 'mp3',
        durationSeconds: Math.max(2, Math.round((words / 140) * 60)),
        providerId: 'tts_cached',
        isFallback: false,
      };
    }

    // Attempt Primary Provider: Studio Neural / Google TTS
    const primaryProvider = this.providers.get('tts_google_neural') || this.providers.get('tts_offline_wav')!;
    try {
      const result = await primaryProvider.synthesize(cleanText, {
        ...options,
        accent,
        gender,
      });

      const outFilename = `tts_${hash}.${result.format}`;
      const outPath = path.join(this.getStorageDir(), outFilename);
      fs.writeFileSync(outPath, result.buffer);

      return {
        audioUrl: `/api/v1/audio/stream/${outFilename}`,
        filename: outFilename,
        filePath: outPath,
        format: result.format,
        durationSeconds: result.durationSeconds,
        providerId: primaryProvider.id,
        isFallback: result.isFallback || false,
        warning: result.warning,
      };
    } catch (err: any) {
      console.warn(`Primary TTS provider '${primaryProvider.id}' failed: ${err.message}. Falling back to OfflineWav...`);
      const fallbackProvider = this.providers.get('tts_offline_wav')!;
      const result = await fallbackProvider.synthesize(cleanText, {
        ...options,
        accent,
        gender,
      });

      const outFilename = `tts_${hash}.${result.format}`;
      const outPath = path.join(this.getStorageDir(), outFilename);
      fs.writeFileSync(outPath, result.buffer);

      return {
        audioUrl: `/api/v1/audio/stream/${outFilename}`,
        filename: outFilename,
        filePath: outPath,
        format: result.format,
        durationSeconds: result.durationSeconds,
        providerId: fallbackProvider.id,
        isFallback: true,
        warning: result.warning || 'Primary neural voice service unavailable. Generated with offline fallback speech.',
      };
    }
  }
}
