export interface TTSOptions {
  voiceId?: string;
  accent?: string; // 'en-GB' | 'en-US' | 'en-AU'
  gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speed?: number; // 0.75 - 1.25
}

export interface TTSResult {
  buffer: Buffer;
  format: 'mp3' | 'wav';
  durationSeconds: number;
  isFallback?: boolean;
  warning?: string;
}

export interface TTSProvider {
  readonly id: string;
  readonly name: string;
  readonly type: 'GOOGLE' | 'OFFLINE_WAV' | 'OPENAI';
  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;
}
