/**
 * Voice & AI Interview Microservice Client
 * Connects Exam platform to the high-fidelity AI interview and viva microservice (https://voice.tinkerlab.online).
 */

export interface VoicePersonaDefinition {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  accent: string;
  locale: string;
  tone: string;
  flag: string;
}

export const VOICE_PERSONAS: VoicePersonaDefinition[] = [
  { id: 'emma', name: 'Emma', gender: 'Female', accent: 'British (UK)', locale: 'en-GB', tone: 'Professional, warm, structured', flag: '🇬🇧' },
  { id: 'pooja', name: 'Pooja', gender: 'Female', accent: 'Indian (IN)', locale: 'en-IN', tone: 'Articulate, precise, academic', flag: '🇮🇳' },
  { id: 'sarah', name: 'Sarah', gender: 'Female', accent: 'American (US)', locale: 'en-US', tone: 'Clear, conversational, corporate', flag: '🇺🇸' },
  { id: 'chloe', name: 'Chloe', gender: 'Female', accent: 'Australian (AU)', locale: 'en-AU', tone: 'Engaging, natural, supportive', flag: '🇦🇺' },
  { id: 'liam', name: 'Liam', gender: 'Male', accent: 'British (UK)', locale: 'en-GB', tone: 'Authoritative, technical, steady', flag: '🇬🇧' },
  { id: 'james', name: 'James', gender: 'Male', accent: 'American (US)', locale: 'en-US', tone: 'Confident, direct, conversational', flag: '🇺🇸' },
  { id: 'arthur', name: 'Arthur', gender: 'Male', accent: 'British (UK)', locale: 'en-GB', tone: 'Formal, thoughtful, deep', flag: '🇬🇧' },
  { id: 'david', name: 'David', gender: 'Male', accent: 'Australian (AU)', locale: 'en-AU', tone: 'Relaxed, encouraging, clear', flag: '🇦🇺' },
  { id: 'rohan', name: 'Rohan', gender: 'Male', accent: 'Indian (IN)', locale: 'en-IN', tone: 'Dynamic, articulate, focused', flag: '🇮🇳' },
];

export interface RemoteSessionCreateOptions {
  workspace_id?: string;
  topic?: string;
  candidate_name?: string;
  questions?: number;
  minutes?: number;
  use_graph?: boolean;
  include_intro?: boolean;
  voice_profile?: string;
  speed_rate?: number;
}

export interface RemoteTurnData {
  index: number;
  topic: string;
  difficulty: number;
  question: string;
  spoken_text: string;
  feedback_intro?: string;
  question_type?: string;
  is_followup?: boolean;
  is_intro?: boolean;
  evidence_cites?: string[];
  expected_concepts?: string[];
  conversational_prompt?: string | null;
}

export interface RemoteEvalData {
  mean: number;
  correctness: number;
  technical_depth: number;
  reasoning: number;
  completeness: number;
  human_feedback?: string;
  missing_concepts?: string[];
  justification?: string;
  needs_followup?: boolean;
}

export interface RemoteSessionState {
  session_id: string;
  status: 'waiting_for_question' | 'question_ready' | 'evaluating' | 'completed' | 'error';
  workspace_id?: string;
  candidate_name?: string;
  interviewer_name?: string;
  voice_profile?: string;
  max_questions: number;
  current_turn?: RemoteTurnData | null;
  latest_eval?: RemoteEvalData | null;
  last_candidate_answer?: string;
  report_markdown?: string | null;
  error?: string | null;
  duration_s?: number;
}

export class VoiceMicroserviceClient {
  private static instance: VoiceMicroserviceClient;
  private baseUrl: string;
  private authToken?: string;
  private timeoutMs: number;

  constructor(options?: { baseUrl?: string; host?: string; port?: number; authToken?: string; timeoutMs?: number }) {
    const envHost = process.env.AUDIO_SERVICE_HOST || process.env.VOICE_MICROSERVICE_HOST;
    const envPort = process.env.AUDIO_SERVICE_PORT || process.env.VOICE_MICROSERVICE_PORT;
    const computedBaseUrl = envHost ? `http://${envHost}${envPort ? `:${envPort}` : ''}` : undefined;

    this.baseUrl = (
      options?.baseUrl ||
      computedBaseUrl ||
      process.env.VOICE_MICROSERVICE_URL ||
      'https://voice.tinkerlab.online'
    ).replace(/\/$/, '');

    this.authToken =
      options?.authToken ||
      process.env.AUDIO_SERVICE_SECRET ||
      process.env.AUDIO_SERVICE_AUTH_TOKEN ||
      process.env.VOICE_MICROSERVICE_AUTH_TOKEN;

    this.timeoutMs =
      options?.timeoutMs ||
      Number(process.env.AUDIO_SERVICE_TIMEOUT_MS || process.env.VOICE_MICROSERVICE_TIMEOUT_MS || 10000);
  }

  static getInstance(): VoiceMicroserviceClient {
    if (!VoiceMicroserviceClient.instance) {
      VoiceMicroserviceClient.instance = new VoiceMicroserviceClient();
    }
    return VoiceMicroserviceClient.instance;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getHeaders(contentType: string = 'application/json'): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': contentType };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      headers['X-Audio-Secret'] = this.authToken;
    }
    return headers;
  }

  getVoicePersonas(): VoicePersonaDefinition[] {
    return VOICE_PERSONAS;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${this.baseUrl}/v1/health`, {
        signal: controller.signal,
        headers: this.getHeaders(),
      });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const data = (await res.json()) as any;
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }

  async getAudioHealth(): Promise<{ status: string; service?: string; whisper_model?: string; active_device?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${this.baseUrl}/v1/audio/health`, {
        signal: controller.signal,
        headers: this.getHeaders(),
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
      return (await res.json()) as any;
    } catch (e: any) {
      return { status: 'error', service: e.message };
    }
  }

  async listWorkspaces(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/workspaces`);
      if (!res.ok) return [];
      const data = (await res.json()) as any;
      return data.workspaces || [];
    } catch (err) {
      console.warn('VoiceMicroserviceClient: listWorkspaces error:', err);
      return [];
    }
  }

  async startSession(options: RemoteSessionCreateOptions = {}): Promise<{
    session_id: string;
    status: string;
    candidate_name?: string;
    interviewer_name?: string;
    created_at?: number;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/interview/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: options.workspace_id || 'ws_ielts',
        topic: options.topic || 'all',
        candidate_name: options.candidate_name || 'Candidate',
        questions: options.questions || 5,
        minutes: options.minutes || 30,
        use_graph: options.use_graph !== false,
        include_intro: options.include_intro !== false,
        voice_profile: options.voice_profile || 'emma',
        speed_rate: options.speed_rate || 1.0,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to start microservice interview session (${res.status}): ${text}`);
    }

    return (await res.json()) as any;
  }

  async pollSession(sessionId: string): Promise<RemoteSessionState> {
    const res = await fetch(`${this.baseUrl}/v1/interview/sessions/${sessionId}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to poll microservice session ${sessionId} (${res.status}): ${text}`);
    }
    return (await res.json()) as RemoteSessionState;
  }

  async waitForQuestion(
    sessionId: string,
    maxAttempts = 20,
    intervalMs = 1000,
    previousQuestion?: string
  ): Promise<RemoteSessionState> {
    // Initial delay so microservice background worker starts LLM generation
    await new Promise((resolve) => setTimeout(resolve, 800));

    let state = await this.pollSession(sessionId);
    for (let i = 0; i < maxAttempts; i++) {
      if (state.status === 'completed' || state.status === 'error') {
        return state;
      }
      if (state.status === 'question_ready') {
        const currentQ = state.current_turn?.question;
        const currentSpoken = state.current_turn?.spoken_text;
        const isStale =
          previousQuestion &&
          (currentQ === previousQuestion || currentSpoken === previousQuestion);

        if (!isStale && (currentQ || currentSpoken)) {
          return state;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      state = await this.pollSession(sessionId);
    }
    return state;
  }

  async submitAnswer(
    sessionId: string,
    params: {
      answer?: string;
      audio_base64?: string;
      audio_format?: string;
    }
  ): Promise<{ status: string; session_id: string; transcription?: string; confidence_metadata?: any }> {
    const body: any = {};
    if (params.answer !== undefined) body.answer = params.answer;
    if (params.audio_base64 !== undefined) {
      body.audio_base64 = params.audio_base64;
      body.audio_format = params.audio_format || 'webm';
    }

    const res = await fetch(`${this.baseUrl}/v1/interview/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to submit answer to microservice (${res.status}): ${text}`);
    }

    return (await res.json()) as any;
  }

  async transcribeAudio(params: {
    audio_base64: string;
    audio_format?: string;
    language?: string;
    min_words?: number;
  }): Promise<{
    text: string;
    duration_s: number;
    asr_s: number;
    confidence_metadata?: {
      is_low_confidence: boolean;
      avg_logprob: number;
      max_no_speech_prob: number;
      reason?: string | null;
    };
    error?: string;
  }> {
    const res = await fetch(`${this.baseUrl}/v1/audio/transcribe`, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({
        audio_base64: params.audio_base64,
        audio_format: params.audio_format || 'webm',
        language: params.language || 'en',
        min_words: params.min_words || 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to transcribe audio via microservice (${res.status}): ${text}`);
    }

    return (await res.json()) as any;
  }

  async synthesizeAudio(params: {
    text: string;
    voice?: string;
    rate?: number;
  }): Promise<ArrayBuffer> {
    const res = await fetch(`${this.baseUrl}/v1/audio/synthesize`, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({
        text: params.text,
        voice: params.voice || 'emma',
        rate: params.rate || 1.0,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to synthesize audio via microservice (${res.status}): ${text}`);
    }

    return await res.arrayBuffer();
  }

  async skipQuestion(sessionId: string): Promise<{ status: string; session_id: string }> {
    const res = await fetch(`${this.baseUrl}/v1/interview/sessions/${sessionId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to skip question in microservice (${res.status}): ${text}`);
    }

    return (await res.json()) as any;
  }

  async getReport(sessionId: string): Promise<{
    session_id: string;
    status: string;
    report_markdown?: string | null;
    candidate_name?: string;
    interviewer_name?: string;
    turns_completed?: number;
    evaluations?: any[];
  }> {
    const res = await fetch(`${this.baseUrl}/v1/interview/sessions/${sessionId}/report`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to retrieve report from microservice (${res.status}): ${text}`);
    }
    return (await res.json()) as any;
  }

  getAudioStreamUrl(
    sessionId: string,
    target: 'question' | 'feedback' | 'conversational' = 'question',
    text?: string,
    turnNumber?: number
  ): string {
    const params = new URLSearchParams();
    params.set('target', target);
    if (turnNumber !== undefined) {
      params.set('turn', String(turnNumber));
    }
    if (text) {
      params.set('text', text);
    }
    return `${this.baseUrl}/v1/interview/sessions/${sessionId}/audio?${params.toString()}`;
  }
}
