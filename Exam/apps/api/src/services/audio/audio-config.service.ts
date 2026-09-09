import { pgDb } from '@repo/database';
import { AudioVoiceProfileDTO } from '@repo/types';
import crypto from 'crypto';

export class AudioConfigService {
  /**
   * List all available voice profiles for listening and interview prompts.
   */
  static async getVoiceProfiles(): Promise<AudioVoiceProfileDTO[]> {
    const res = await pgDb.query(
      `SELECT * FROM "audio_voice_profiles" WHERE "isActive" = true ORDER BY "isDefault" DESC, "name" ASC`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      voiceId: r.voiceId,
      accent: r.accent,
      gender: r.gender,
      sampleAudioUrl: r.sampleAudioUrl || undefined,
      isDefault: Boolean(r.isDefault),
      isActive: Boolean(r.isActive),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Create or update a voice profile (Admin / Faculty).
   */
  static async createVoiceProfile(data: {
    name: string;
    provider?: string;
    voiceId: string;
    accent: string;
    gender: string;
    isDefault?: boolean;
  }): Promise<AudioVoiceProfileDTO> {
    const id = `voice_${data.accent.toLowerCase().substring(0, 2)}_${crypto.randomBytes(4).toString('hex')}`;
    const res = await pgDb.query(
      `INSERT INTO "audio_voice_profiles" ("id", "name", "provider", "voiceId", "accent", "gender", "isDefault", "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [
        id,
        data.name.trim(),
        data.provider || 'MOCK',
        data.voiceId.trim(),
        data.accent.trim(),
        data.gender || 'FEMALE',
        Boolean(data.isDefault),
      ]
    );

    const r: any = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      provider: r.provider,
      voiceId: r.voiceId,
      accent: r.accent,
      gender: r.gender,
      isDefault: Boolean(r.isDefault),
      isActive: Boolean(r.isActive),
      createdAt: new Date(r.createdAt).toISOString(),
    };
  }

  /**
   * Synthesize audio preview from script (for authoring inspection or generation).
   */
  static async synthesizePreview(
    script: string,
    voiceId: string = 'voice_en_gb_f_01',
    speed: number = 1.0
  ): Promise<{
    audioUrl: string;
    script: string;
    voiceId: string;
    durationEstimateSeconds: number;
    format: string;
    isFallback?: boolean;
    warning?: string;
  }> {
    const cleanScript = String(script || '')
      .replace(/<[^>]*>/g, '') // Sanitize any SSML tags
      .trim();

    if (!cleanScript) {
      throw new Error('Script cannot be empty');
    }

    const { TTSService } = await import('./tts.service');
    const synthRes = await TTSService.synthesize(cleanScript, {
      voiceId,
      speed,
    });

    return {
      audioUrl: synthRes.audioUrl,
      script: cleanScript,
      voiceId,
      durationEstimateSeconds: synthRes.durationSeconds,
      format: synthRes.format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      isFallback: synthRes.isFallback,
      warning: synthRes.warning,
    };
  }
}
