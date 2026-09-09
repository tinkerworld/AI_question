import https from 'https';
import { TTSProvider, TTSOptions, TTSResult } from '../tts-provider.interface';

const VOICE_SPEAKER_MAP: Record<string, string> = {
  // British
  'voice_en_gb_f_01': 'Emma',
  'en-GB-Neural2-A': 'Emma',
  'voice_en_gb_m_01': 'Brian',
  'en-GB-Neural2-B': 'Brian',

  // Australian
  'voice_en_au_f_01': 'Nicole',
  'en-AU-Neural2-C': 'Nicole',
  'voice_en_au_m_01': 'Russell',
  'en-AU-Neural2-B': 'Russell',

  // American
  'voice_en_us_f_01': 'Joanna',
  'en-US-Neural2-F': 'Joanna',
  'voice_en_us_m_01': 'Matthew',
  'en-US-Neural2-D': 'Matthew',

  // Canadian
  'voice_en_ca_f_01': 'Salli',
  'en-CA-Neural2-A': 'Salli',
  'voice_en_ca_m_01': 'Joey',
  'en-CA-Neural2-B': 'Joey',

  // Indian
  'voice_en_in_f_01': 'Aditi',
  'en-IN-Neural2-D': 'Aditi',
  'voice_en_in_m_01': 'Geraint',
  'en-IN-Neural2-B': 'Geraint',
};

export class GoogleTTSProvider implements TTSProvider {
  readonly id = 'tts_google_neural';
  readonly name = 'Google Web & Studio Neural Speech Synthesis Provider';
  readonly type = 'GOOGLE' as const;

  /**
   * Synthesizes audio using Neural Studio Voices with Google Translate accent chunking fallback.
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    const cleanText = String(text || '').replace(/<[^>]*>/g, '').trim();
    if (!cleanText) {
      throw new Error('TTS text cannot be empty');
    }

    const words = cleanText.split(/\s+/).filter(Boolean).length;
    const speed = options.speed || 1.0;
    const durationSeconds = Math.max(2, Math.round((words / (140 * speed)) * 60));

    // 1. Resolve distinct neural speaker if voiceId or gender/accent is provided
    let speaker: string | null = null;
    if (options.voiceId && VOICE_SPEAKER_MAP[options.voiceId]) {
      speaker = VOICE_SPEAKER_MAP[options.voiceId];
    } else if (options.gender === 'MALE') {
      const acc = (options.accent || '').toLowerCase();
      if (acc.includes('au') || acc.includes('australian')) speaker = 'Russell';
      else if (acc.includes('gb') || acc.includes('british') || acc.includes('uk')) speaker = 'Brian';
      else if (acc.includes('in') || acc.includes('indian')) speaker = 'Geraint';
      else if (acc.includes('ca') || acc.includes('canadian')) speaker = 'Joey';
      else speaker = 'Matthew';
    } else {
      const acc = (options.accent || '').toLowerCase();
      if (acc.includes('au') || acc.includes('australian')) speaker = 'Nicole';
      else if (acc.includes('gb') || acc.includes('british') || acc.includes('uk')) speaker = 'Emma';
      else if (acc.includes('in') || acc.includes('indian')) speaker = 'Aditi';
      else if (acc.includes('ca') || acc.includes('canadian')) speaker = 'Salli';
      else speaker = 'Joanna';
    }

    // Try primary high-fidelity Neural Studio synthesis
    if (speaker) {
      try {
        const neuralBuf = await this.fetchNeuralSpeakerAudio(cleanText, speaker);
        if (neuralBuf && neuralBuf.length > 1000) {
          return {
            buffer: neuralBuf,
            format: 'mp3',
            durationSeconds,
          };
        }
      } catch (neuralErr: any) {
        console.warn(`Neural speaker '${speaker}' failed: ${neuralErr.message}. Falling back to regional Google Translate...`);
      }
    }

    // 2. Secondary fallback: Regional Google Translate chunked synthesis
    let lang = 'en-GB';
    const acc = (options.accent || '').toLowerCase();
    if (acc.includes('us') || acc.includes('american')) {
      lang = 'en-US';
    } else if (acc.includes('au') || acc.includes('australian')) {
      lang = 'en-AU';
    } else if (acc.includes('gb') || acc.includes('british') || acc.includes('uk')) {
      lang = 'en-GB';
    } else if (acc.includes('in') || acc.includes('indian')) {
      lang = 'en-IN';
    } else if (acc.includes('ca') || acc.includes('canadian')) {
      lang = 'en-CA';
    } else if (options.accent && options.accent.length === 5 && options.accent.includes('-')) {
      lang = options.accent;
    }

    const chunks = this.splitIntoChunks(cleanText, 160);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const buf = await this.fetchAudioChunk(chunk, lang);
      audioBuffers.push(buf);
    }

    const combinedBuffer = Buffer.concat(audioBuffers);

    return {
      buffer: combinedBuffer,
      format: 'mp3',
      durationSeconds,
    };
  }

  private fetchNeuralSpeakerAudio(text: string, speaker: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const postData = `msg=${encodeURIComponent(text)}&lang=${speaker}&source=ttsmp3`;
      const req = https.request('https://ttsmp3.com/makemp3_new.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 8000
      }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j.success && j.URL) {
              https.get(j.URL, { timeout: 8000 }, audioRes => {
                const chunks: Buffer[] = [];
                audioRes.on('data', c => chunks.push(c));
                audioRes.on('end', () => resolve(Buffer.concat(chunks)));
                audioRes.on('error', reject);
              }).on('error', reject);
            } else {
              reject(new Error(j.Error || 'Neural provider returned error status'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Neural provider timeout'));
      });
      req.write(postData);
      req.end();
    });
  }

  private splitIntoChunks(text: string, maxLen: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;

      if ((current + ' ' + trimmed).trim().length <= maxLen) {
        current = (current + ' ' + trimmed).trim();
      } else {
        if (current) chunks.push(current);
        if (trimmed.length <= maxLen) {
          current = trimmed;
        } else {
          // Break words if sentence exceeds maxLen
          const words = trimmed.split(/\s+/);
          let sub = '';
          for (const w of words) {
            if ((sub + ' ' + w).trim().length <= maxLen) {
              sub = (sub + ' ' + w).trim();
            } else {
              if (sub) chunks.push(sub);
              sub = w;
            }
          }
          current = sub;
        }
      }
    }
    if (current) chunks.push(current);
    return chunks.length > 0 ? chunks : [text.substring(0, maxLen)];
  }

  private fetchAudioChunk(chunk: string, lang: string): Promise<Buffer> {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
    return new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        },
        (res) => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Google TTS failed with status ${res.statusCode}`));
          }
          const dataChunks: Buffer[] = [];
          res.on('data', (c) => dataChunks.push(c));
          res.on('end', () => resolve(Buffer.concat(dataChunks)));
        }
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Google TTS request timed out'));
      });
    });
  }
}
