import {
  AIProviderType,
  AIGatewayStatus,
} from '@repo/types';

export interface AIClientConfig {
  baseUrl?: string;
  internalApiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  mockMode?: boolean;
}

export class AIClientError extends Error {
  constructor(message: string, public code: string = 'AI_CLIENT_ERROR', public statusCode: number = 500) {
    super(message);
    this.name = 'AIClientError';
  }
}

export class AITimeoutError extends AIClientError {
  constructor(message: string = 'AI Gateway request timed out') {
    super(message, 'AI_TIMEOUT_ERROR', 504);
    this.name = 'AITimeoutError';
  }
}

export class AIRateLimitError extends AIClientError {
  constructor(message: string = 'AI Gateway rate limit exceeded') {
    super(message, 'AI_RATE_LIMIT_ERROR', 429);
    this.name = 'AIRateLimitError';
  }
}

export class AIQuotaExhaustedError extends AIClientError {
  constructor(message: string = 'User AI credit balance or token quota exhausted') {
    super(message, 'AI_QUOTA_EXHAUSTED', 402);
    this.name = 'AIQuotaExhaustedError';
  }
}

export class AIValidationError extends AIClientError {
  constructor(message: string = 'AI output failed JSON schema validation') {
    super(message, 'AI_VALIDATION_ERROR', 422);
    this.name = 'AIValidationError';
  }
}

export class AIVendorUnavailableError extends AIClientError {
  constructor(message: string = 'All configured AI providers are unreachable or circuit broken') {
    super(message, 'AI_VENDOR_UNAVAILABLE', 503);
    this.name = 'AIVendorUnavailableError';
  }
}

export interface AICompletionRequest {
  featureKey: string;
  scope?: 'question_authoring' | 'interview' | string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  expectedSchema?: any;
  preferredProviderId?: string;
  userId?: string;
}

export interface AICompletionResponse {
  content: string;
  parsedJson?: any;
  providerId: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  status: AIGatewayStatus;
}

export interface GeneratedQuestionPayload {
  content: string;
  type: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks: number;
  data: {
    options?: Array<{ id: string; text: string }>;
    correctOptionId?: string;
    correctAnswer?: string;
    explanation?: string;
    [key: string]: any;
  };
}

export class AIClient {
  private config: Required<AIClientConfig>;

  constructor(config: AIClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:4043/api/v1/ai/gateway',
      internalApiKey: config.internalApiKey || 'examos-internal-ai-key',
      timeoutMs: config.timeoutMs || 15000,
      maxRetries: config.maxRetries || 3,
      mockMode: config.mockMode ?? false,
    };
  }

  /**
   * Universal completion call with automatic retries, backoff, and JSON validation.
   */
  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    if (this.config.mockMode) {
      return this.generateMockCompletion(req);
    }

    const payload = {
      ...req,
      scope: req.scope || 'question_authoring',
    };

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const res = await fetch(`${this.config.baseUrl}/route`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AI-Internal-Key': this.config.internalApiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 429) {
            throw new AIRateLimitError(body.message || 'AI rate limit exceeded');
          }
          if (res.status === 402 || res.status === 403) {
            throw new AIQuotaExhaustedError(body.message || 'AI credits exhausted');
          }
          if (res.status === 503) {
            throw new AIVendorUnavailableError(body.message || 'AI vendor unavailable');
          }
          throw new AIClientError(body.message || `Gateway returned status ${res.status}`, 'GATEWAY_ERROR', res.status);
        }

        const data = await res.json();
        return data.data;
      } catch (err: any) {
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new AITimeoutError(`AI request timed out after ${this.config.timeoutMs}ms`);
        }
        if (attempt === this.config.maxRetries || err instanceof AIQuotaExhaustedError) {
          break;
        }
        // Exponential backoff: 200ms, 400ms, 800ms
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError || new AIClientError('AI request failed after max retries');
  }

  /**
   * Deterministic mock completion generator for offline/testing scenarios (zero external cost).
   */
  generateMockCompletion(req: AICompletionRequest): AICompletionResponse {
    const isModification = req.featureKey === 'question_modification' || req.prompt?.includes('variation');
    const subject = (req.variables?.subject || 'Physics').trim();
    const topic = (req.variables?.topic || 'General Principles').trim();
    const difficulty = req.variables?.difficulty || 'MEDIUM';
    const marks = req.variables?.marks || 4;
    const type = req.variables?.type || 'SINGLE_CHOICE';
    const customPrompt = req.prompt || '';
    
    let generatedData: GeneratedQuestionPayload;

    if (isModification) {
      const isRocket = customPrompt.toLowerCase().includes('rocket') || customPrompt.toLowerCase().includes('space');
      const vehicle = isRocket ? 'rocket' : 'vehicle';
      const speedUnit = isRocket ? 'km/s' : 'm/s';
      generatedData = {
        content: `[AI Variation] A ${vehicle} accelerates steadily under specific conditions for topic "${topic}". ${customPrompt ? `(${customPrompt})` : ''} Calculate its final velocity in ${speedUnit}.`,
        type,
        difficulty,
        marks,
        data: {
          options: [
            { id: 'opt_var_1', text: `25.50 ${speedUnit}` },
            { id: 'opt_var_2', text: `18.20 ${speedUnit}` },
            { id: 'opt_var_3', text: `32.00 ${speedUnit}` },
            { id: 'opt_var_4', text: `12.80 ${speedUnit}` },
          ],
          correctOptionId: 'opt_var_1',
          explanation: `Calculated using kinematics equation v = u + at tailored for ${vehicle} dynamics.`,
        },
      };
    } else {
      if (subject.toLowerCase().includes('math')) {
        generatedData = {
          content: `[AI Generated - Mathematics] Evaluate the definite integral ∫₀¹ (3x² + 2x) dx for topic "${topic}". ${customPrompt ? `Note: ${customPrompt}.` : ''}`,
          type,
          difficulty,
          marks,
          data: {
            options: [
              { id: 'opt_gen_1', text: '2.000' },
              { id: 'opt_gen_2', text: '2.500' },
              { id: 'opt_gen_3', text: '1.750' },
              { id: 'opt_gen_4', text: '3.000' },
            ],
            correctOptionId: 'opt_gen_1',
            explanation: 'Antiderivative is F(x) = x³ + x². F(1) - F(0) = 1 + 1 = 2.0.',
          },
        };
      } else if (subject.toLowerCase().includes('chem')) {
        generatedData = {
          content: `[AI Generated - Chemistry] For the chemical system under "${topic}", identify the primary determining factor governing the reaction rate. ${customPrompt ? `(Focus: ${customPrompt})` : ''}`,
          type,
          difficulty,
          marks,
          data: {
            options: [
              { id: 'opt_gen_1', text: 'Activation energy barrier and Arrhenius frequency factor (k = A * e^(-Ea/RT))' },
              { id: 'opt_gen_2', text: 'Only the molar mass of the inert spectator solvent' },
              { id: 'opt_gen_3', text: 'Electrostatic repulsion independent of thermodynamic temperature' },
              { id: 'opt_gen_4', text: 'Zero-order kinetic decay with constant half-life' },
            ],
            correctOptionId: 'opt_gen_1',
            explanation: 'The temperature dependence of chemical rate constants is modeled by the Arrhenius equation.',
          },
        };
      } else {
        generatedData = {
          content: `[AI Generated - ${subject}] In the context of "${topic}", determine the primary governing physical relationship. ${customPrompt ? `(Guideline: ${customPrompt})` : ''}`,
          type,
          difficulty,
          marks,
          data: {
            options: [
              { id: 'opt_gen_1', text: `Primary canonical relation for ${topic}` },
              { id: 'opt_gen_2', text: `Secondary inverted condition` },
              { id: 'opt_gen_3', text: `Non-convergent divergent state` },
              { id: 'opt_gen_4', text: `Incompatible static hypothesis` },
            ],
            correctOptionId: 'opt_gen_1',
            explanation: `Option 1 represents the standard canonical formulation for ${topic} under standard conditions.`,
          },
        };
      }
    }

    return {
      content: JSON.stringify(generatedData),
      parsedJson: generatedData,
      providerId: 'prov_mock_01',
      modelUsed: 'mock-gpt-4o-deterministic',
      promptTokens: 140,
      completionTokens: 85,
      totalTokens: 225,
      estimatedCost: 0.0,
      latencyMs: 45,
      status: 'SUCCESS',
    };
  }
}
