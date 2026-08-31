import { pgDb } from '@repo/database';
import {
  AIProviderDTO,
  AIPromptTemplateDTO,
  AIGatewayLogDTO,
  AIGatewayStatus,
} from '@repo/types';
import crypto from 'crypto';
import { AIMockGenerator } from './ai-mock-generator';
import { encryptSecret, decryptSecret, maskApiKey } from '../utils/crypto';

export interface RouteAIRequest {
  featureKey: string;
  scope:
    | 'question_generation'
    | 'question_paraphrase'
    | 'interview_conversation'
    | 'interview_grading'
    | 'writing_analysis'
    | 'question_authoring'
    | 'interview'
    | string;
  prompt?: string;
  variables?: Record<string, any>;
  userId?: string;
  preferredProviderId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface RouteAIConversationRequest {
  featureKey: 'interview_conversation' | 'interview_evaluation' | string;
  scope:
    | 'interview_conversation'
    | 'interview_grading'
    | 'writing_analysis'
    | 'interview'
    | string;
  systemPrompt?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  contextData?: {
    scenario?: string;
    questionContent?: string;
    rubric?: any[];
    turnNumber?: number;
    maxTurns?: number;
    mainQuestionIndex?: number;
    followUpIndex?: number;
    isMainQuestion?: boolean;
    preset?: string;
    [key: string]: any;
  };
  userId?: string;
  preferredProviderId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface RouteAIResponse {
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

/**
 * Normalizes scope strings to the 5 canonical scopes, preserving backward compatibility with legacy aliases.
 */
export function normalizeScope(scope?: string, featureKey?: string): string {
  if (!scope || typeof scope !== 'string' || scope.trim() === '') {
    if (featureKey === 'question_generation') return 'question_generation';
    if (featureKey === 'question_modification') return 'question_paraphrase';
    if (featureKey === 'interview_conversation') return 'interview_conversation';
    if (featureKey === 'interview_evaluation') return 'interview_grading';
    if (featureKey === 'writing_evaluation') return 'writing_analysis';
    throw new Error(
      'SCOPE_REQUIRED: Every AI Gateway request must explicitly specify a scope (question_generation, question_paraphrase, interview_conversation, interview_grading, writing_analysis)'
    );
  }
  const s = scope.trim();
  if (s === 'question_authoring') {
    return featureKey === 'question_modification' ? 'question_paraphrase' : 'question_generation';
  }
  if (s === 'interview') {
    return featureKey === 'interview_evaluation' ? 'interview_grading' : 'interview_conversation';
  }
  return s;
}

export class AIGatewayService {
  private static circuitBreakerResetMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Route an AI request to the best available provider with fallback, circuit breaking, and schema validation.
   */
  static async routeRequest(req: RouteAIRequest): Promise<RouteAIResponse> {
    if (!req.scope || typeof req.scope !== 'string' || req.scope.trim() === '') {
      throw new Error('SCOPE_REQUIRED: Every AI Gateway request must explicitly specify a scope (e.g. question_generation, question_paraphrase, interview_conversation, interview_grading, writing_analysis)');
    }

    const targetScope = normalizeScope(req.scope, req.featureKey);
    const db = pgDb;
    const startTime = Date.now();

    // 1. Fetch Prompt Template
    const templateRes = await db.query(
      `SELECT * FROM "ai_prompt_templates" WHERE "featureKey" = $1 AND "isActive" = true ORDER BY "version" DESC LIMIT 1`,
      [req.featureKey]
    );

    const template: AIPromptTemplateDTO | undefined = templateRes.rows[0] as any;
    let systemPrompt = template?.systemPrompt || 'You are an AI assistant specialized in academic assessment item authoring.';
    let userPrompt = req.prompt || '';

    if (template && req.variables) {
      let interpolated = template.userPromptTemplate;
      for (const [k, v] of Object.entries(req.variables)) {
        interpolated = interpolated.replace(new RegExp(`{${k}}`, 'g'), String(v ?? ''));
      }
      userPrompt = interpolated + (req.prompt ? ` Additional instructions: ${req.prompt}` : '');
    }

    // 2. Fetch Active Providers for the specified scope ordered by priority ASC
    let providers: AIProviderDTO[] = [];
    if (req.preferredProviderId) {
      const prefRes = await db.query(
        `SELECT * FROM "ai_providers" WHERE "id" = $1 AND "isActive" = true AND ("scope" = $2 OR "scope" = $3)`,
        [req.preferredProviderId, targetScope, req.scope]
      );
      if (prefRes.rows.length > 0) {
        providers = prefRes.rows as any[];
      }
    }

    if (providers.length === 0) {
      let providersRes = await db.query(
        `SELECT * FROM "ai_providers" WHERE "isActive" = true AND "scope" = $1 ORDER BY "priority" ASC`,
        [targetScope]
      );
      if (providersRes.rows.length === 0 && req.scope !== targetScope) {
        providersRes = await db.query(
          `SELECT * FROM "ai_providers" WHERE "isActive" = true AND "scope" = $1 ORDER BY "priority" ASC`,
          [req.scope]
        );
      }
      providers = (providersRes.rows as any[]) || [];
    }

    if (providers.length === 0) {
      throw new Error(`NO_AI_PROVIDERS_AVAILABLE: No active providers found for scope '${targetScope}'`);
    }

    let lastError: Error | null = null;
    let selectedProvider: AIProviderDTO | null = null;
    let rawResult: string = '';
    let parsedJson: any = null;
    let promptTokens = 0;
    let completionTokens = 0;

    for (const provider of providers) {
      // For CLOUD provider without configured API key, skip to next provider
      if (provider.type === 'CLOUD') {
        const decrypted = decryptSecret(provider.apiKey || '');
        if (!decrypted || decrypted.trim() === '') {
          continue; // Skip unconfigured cloud provider
        }
      }

      // Check Circuit Breaker status
      if (provider.circuitBroken) {
        if (provider.lastFailureAt && Date.now() - new Date(provider.lastFailureAt).getTime() > this.circuitBreakerResetMs) {
          // Half-open circuit breaker reset
          await db.query(
            `UPDATE "ai_providers" SET "circuitBroken" = false, "failureCount" = 0 WHERE "id" = $1`,
            [provider.id]
          );
        } else {
          continue; // Skip circuit broken provider
        }
      }

      try {
        selectedProvider = provider;
        const callResult = await this.executeProviderCall(provider, systemPrompt, userPrompt);
        rawResult = callResult.content;
        promptTokens = callResult.promptTokens;
        completionTokens = callResult.completionTokens;

        // Output validation against expected schema
        try {
          parsedJson = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
          if (targetScope === 'interview_grading' || targetScope === 'interview' || req.featureKey === 'interview_evaluation') {
            if (typeof parsedJson.score !== 'number' && typeof parsedJson.finalScore !== 'number') {
              throw new Error('SCHEMA_VALIDATION_FAILED: Missing required interview evaluation fields');
            }
          } else if (targetScope === 'writing_analysis' || req.featureKey === 'writing_evaluation') {
            if (typeof parsedJson.score !== 'number' && typeof parsedJson.finalScore !== 'number' && !parsedJson.feedback) {
              throw new Error('SCHEMA_VALIDATION_FAILED: Missing required writing analysis fields');
            }
          } else {
            if (!parsedJson.content || !parsedJson.type || !parsedJson.data) {
              throw new Error('SCHEMA_VALIDATION_FAILED: Missing required question fields');
            }
          }
        } catch (e: any) {
          // Retry once with strict JSON repair instruction if format failed
          const retryCall = await this.executeProviderCall(
            provider,
            systemPrompt + ' Output MUST be valid JSON only matching expected schema.',
            userPrompt
          );
          parsedJson = typeof retryCall.content === 'string' ? JSON.parse(retryCall.content) : retryCall.content;
          rawResult = retryCall.content;
          promptTokens += retryCall.promptTokens;
          completionTokens += retryCall.completionTokens;
        }

        // Reset failure count on success
        await db.query(
          `UPDATE "ai_providers" SET "failureCount" = 0, "circuitBroken" = false WHERE "id" = $1`,
          [provider.id]
        );
        break; // Successfully got valid result from active provider
      } catch (err: any) {
        lastError = err;
        const newFailures = (provider.failureCount || 0) + 1;
        const tripCircuit = newFailures >= 3;
        await db.query(
          `UPDATE "ai_providers" SET "failureCount" = $1, "circuitBroken" = $2, "lastFailureAt" = CURRENT_TIMESTAMP WHERE "id" = $3`,
          [newFailures, tripCircuit, provider.id]
        );
        // Fallback to next provider in priority chain
      }
    }

    const latencyMs = Date.now() - startTime;
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = (promptTokens * 0.000005) + (completionTokens * 0.000015);

    if (!parsedJson && !rawResult) {
      // Log failure in Gateway audit table
      await db.query(
        `INSERT INTO "ai_gateway_logs" ("id", "userId", "featureKey", "providerId", "modelUsed", "promptTokens", "completionTokens", "totalTokens", "estimatedCost", "latencyMs", "status", "errorMessage")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          `gwlog_${crypto.randomBytes(8).toString('hex')}`,
          req.userId || null,
          req.featureKey,
          selectedProvider?.id || null,
          selectedProvider?.modelId || 'unknown',
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost,
          latencyMs,
          'FAILED',
          lastError?.message || 'All providers failed',
        ]
      );
      throw new Error(lastError?.message || 'AI_GATEWAY_ALL_PROVIDERS_FAILED');
    }

    // Log successful gateway execution
    await db.query(
      `INSERT INTO "ai_gateway_logs" ("id", "userId", "featureKey", "providerId", "modelUsed", "promptTokens", "completionTokens", "totalTokens", "estimatedCost", "latencyMs", "status")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        `gwlog_${crypto.randomBytes(8).toString('hex')}`,
        req.userId || null,
        req.featureKey,
        selectedProvider!.id,
        selectedProvider!.modelId,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        'SUCCESS',
      ]
    );

    return {
      content: rawResult,
      parsedJson,
      providerId: selectedProvider!.id,
      modelUsed: selectedProvider!.modelId,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      latencyMs,
      status: 'SUCCESS',
    };
  }

  /**
   * Execute provider-specific inference.
   */
  private static async executeProviderCall(
    provider: AIProviderDTO,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
    if (provider.type === 'MOCK') {
      if (
        provider.scope === 'interview_grading' ||
        provider.scope === 'interview' ||
        systemPrompt.toLowerCase().includes('interview') ||
        systemPrompt.toLowerCase().includes('ielts speaking') ||
        systemPrompt.toLowerCase().includes('rubric')
      ) {
        const interviewMockOutput = {
          score: 8.5,
          finalScore: 8.5,
          maxScore: 9.0,
          percentage: 94.4,
          gradeBand: 'Band 8.5 (Very Good User - Proficient Master)',
          feedback:
            'Candidate displayed articulate conceptual comprehension, rigorous scientific rationale, and sound edge case handling.',
          followUpQuestion:
            'How does the observed outcome scale when velocity approaches relativistic limits?',
          rubricScores: [
            { id: 'fluency', name: 'Fluency & Coherence', score: 8.5, maxScore: 9.0, feedback: 'Smooth discourse flow.' },
            { id: 'lexical', name: 'Lexical Resource', score: 8.5, maxScore: 9.0, feedback: 'Rich and accurate vocabulary.' },
            { id: 'grammar', name: 'Grammatical Range & Accuracy', score: 8.0, maxScore: 9.0, feedback: 'Varied structures.' },
            { id: 'pronunciation', name: 'Pronunciation & Intonation', score: 8.5, maxScore: 9.0, feedback: 'Clear pronunciation.' },
          ],
          strengths: ['Clear structure and rationale.', 'Effective domain knowledge.'],
          weaknesses: ['Minor moments of hesitation on complex edge cases.'],
          recommendations: ['Incorporate specific case examples earlier.'],
        };
        return {
          content: JSON.stringify(interviewMockOutput),
          promptTokens: 110 + Math.floor(userPrompt.length / 4),
          completionTokens: 90,
        };
      }

      if (
        provider.scope === 'writing_analysis' ||
        systemPrompt.toLowerCase().includes('writing') ||
        systemPrompt.toLowerCase().includes('essay')
      ) {
        const writingMockOutput = {
          score: 8.0,
          finalScore: 8.0,
          maxScore: 9.0,
          percentage: 88.9,
          gradeBand: 'Band 8.0 (Very Good User)',
          feedback:
            'Candidate presents a well-developed response with a clear central position and logically sequenced ideas.',
          criteria: [
            { name: 'Task Achievement', score: 8.0, maxScore: 9.0, feedback: 'Addresses all parts of the task effectively.' },
            { name: 'Coherence & Cohesion', score: 8.0, maxScore: 9.0, feedback: 'Sequences information with clear paragraphing.' },
            { name: 'Lexical Resource', score: 8.5, maxScore: 9.0, feedback: 'Uses a wide range of vocabulary with natural collocations.' },
            { name: 'Grammatical Accuracy', score: 7.5, maxScore: 9.0, feedback: 'Uses a variety of complex structures with rare errors.' },
          ],
          strengths: ['Strong thesis statement and coherent progression.', 'Sophisticated lexical variety.'],
          weaknesses: ['Occasional minor punctuation slip in conditional clause.'],
          recommendations: ['Maintain strict proofreading for punctuation in complex sentences.'],
        };
        return {
          content: JSON.stringify(writingMockOutput),
          promptTokens: 120 + Math.floor(userPrompt.length / 4),
          completionTokens: 95,
        };
      }

      const isModification =
        userPrompt.includes('variation') ||
        userPrompt.includes('alternative') ||
        userPrompt.includes('Reference Question') ||
        provider.scope === 'question_paraphrase';
      const subjectMatch = userPrompt.match(/Subject\s*:\s*([^,\n]+)/i) || userPrompt.match(/Subject\s+"([^"]+)"/i);
      const topicMatch = userPrompt.match(/Topic\s*:\s*([^,\n]+)/i) || userPrompt.match(/Topic\s+"([^"]+)"/i);
      const diffMatch = userPrompt.match(/Difficulty\s*:\s*(EASY|MEDIUM|HARD)/i);
      const typeMatch = userPrompt.match(/Type\s*:\s*([A-Z_]+)/i);

      const generatedItem = AIMockGenerator.generateQuestion({
        subject: subjectMatch ? subjectMatch[1].trim() : undefined,
        topic: topicMatch ? topicMatch[1].trim() : undefined,
        difficulty: (diffMatch ? diffMatch[1] : 'MEDIUM') as any,
        type: typeMatch ? typeMatch[1] : 'SINGLE_CHOICE',
        customPrompt: userPrompt,
        isModification,
        parentQuestion: isModification
          ? {
              content: userPrompt,
              type: 'SINGLE_CHOICE',
              difficulty: 'MEDIUM',
              marks: 4,
            }
          : undefined,
        varianceLevel: userPrompt.toLowerCase().includes('high')
          ? 'HIGH'
          : userPrompt.toLowerCase().includes('low')
          ? 'LOW'
          : 'MEDIUM',
        instructions: userPrompt,
      });

      return {
        content: JSON.stringify(generatedItem),
        promptTokens: 120 + Math.floor(userPrompt.length / 4),
        completionTokens: 85 + Math.floor(generatedItem.content.length / 4),
      };
    }

    if (provider.type === 'LOCAL') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        let baseUrl = provider.baseUrl?.trim() || 'http://localhost:11434';
        baseUrl = baseUrl.replace(/\/+$/, '');

        const isOllamaNative = !baseUrl.endsWith('/v1') && !baseUrl.includes('/chat/completions');
        let endpoint = isOllamaNative ? `${baseUrl}/api/chat` : (baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`);

        let reqBody: any;
        if (isOllamaNative) {
          reqBody = {
            model: provider.modelId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            stream: false,
            options: {
              num_predict: 512,
              temperature: 0.7,
            },
            format: 'json',
          };
        } else {
          reqBody = {
            model: provider.modelId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`Local provider error (${res.status}): ${errBody.error || res.statusText}`);
        }
        const data = await res.json();
        const content = data.message?.content || data.choices?.[0]?.message?.content || data.response || '';
        return {
          content,
          promptTokens: data.prompt_eval_count || data.usage?.prompt_tokens || 120,
          completionTokens: data.eval_count || data.usage?.completion_tokens || 80,
        };
      } catch (err: any) {
        throw new Error(`LOCAL_PROVIDER_FAILED: ${err.message}`);
      }
    }

    if (provider.type === 'CLOUD') {
      const decryptedApiKey = decryptSecret(provider.apiKey || '') || provider.apiKey || '';
      let baseUrl = provider.baseUrl?.trim() || 'https://api.openai.com/v1';
      baseUrl = baseUrl.replace(/\/+$/, '');
      const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (decryptedApiKey && decryptedApiKey.trim() !== '') {
          headers['Authorization'] = `Bearer ${decryptedApiKey.trim()}`;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: provider.modelId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`Cloud provider error (${res.status}): ${errBody.error?.message || res.statusText}`);
        }
        const data = await res.json();
        return {
          content: data.choices[0].message.content,
          promptTokens: data.usage?.prompt_tokens || 150,
          completionTokens: data.usage?.completion_tokens || 100,
        };
      } catch (err: any) {
        throw new Error(`CLOUD_PROVIDER_FAILED: ${err.message}`);
      }
    }

    throw new Error(`UNSUPPORTED_PROVIDER_TYPE: ${provider.type}`);
  }

  /**
   * Route a multi-turn conversational AI interview request (dialogue turn or full-transcript evaluation).
   */
  static async routeConversation(req: RouteAIConversationRequest): Promise<RouteAIResponse> {
    const db = pgDb;
    const targetScope = normalizeScope(req.scope, req.featureKey);
    const featureKey = req.featureKey || 'interview_conversation';

    // 1. Fetch available providers for this scope ordered by priority ASC
    let provRes = await db.query(
      `SELECT * FROM "ai_providers" WHERE "scope" = $1 AND "isActive" = true ORDER BY "priority" ASC`,
      [targetScope]
    );

    if (provRes.rows.length === 0 && req.scope && req.scope !== targetScope) {
      provRes = await db.query(
        `SELECT * FROM "ai_providers" WHERE "scope" = $1 AND "isActive" = true ORDER BY "priority" ASC`,
        [req.scope]
      );
    }

    let providers = provRes.rows as AIProviderDTO[];

    if (req.preferredProviderId) {
      const preferred = providers.find((p) => p.id === req.preferredProviderId);
      if (preferred) {
        providers = [preferred, ...providers.filter((p) => p.id !== req.preferredProviderId)];
      }
    }

    if (providers.length === 0) {
      throw new Error(`NO_ACTIVE_PROVIDERS: No active providers configured for AI scope '${targetScope}'`);
    }

    let selectedProvider: AIProviderDTO | null = null;
    let rawResult: string = '';
    let parsedJson: any = null;
    let promptTokens = 0;
    let completionTokens = 0;
    let latencyMs = 0;
    let lastError: Error | null = null;

    for (const provider of providers) {
      if (provider.circuitBroken) {
        const brokenSince = new Date(provider.lastFailureAt || 0).getTime();
        if (Date.now() - brokenSince < this.circuitBreakerResetMs) {
          continue; // Skip tripped provider
        }
        await db.query(
          `UPDATE "ai_providers" SET "circuitBroken" = false, "failureCount" = 0, "lastFailureAt" = NULL WHERE "id" = $1`,
          [provider.id]
        );
        provider.circuitBroken = false;
        provider.failureCount = 0;
      }

      try {
        const callStart = Date.now();
        const result = await this.executeProviderConversationCall(provider, req);
        latencyMs = Date.now() - callStart;

        rawResult = result.content;
        promptTokens = result.promptTokens;
        completionTokens = result.completionTokens;

        if (featureKey === 'interview_evaluation') {
          try {
            parsedJson = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
          } catch {
            parsedJson = null;
          }
        }

        selectedProvider = provider;

        if (provider.failureCount > 0) {
          await db.query(
            `UPDATE "ai_providers" SET "failureCount" = 0, "circuitBroken" = false WHERE "id" = $1`,
            [provider.id]
          );
        }

        break; // Success!
      } catch (err: any) {
        lastError = err;
        const newFailures = (provider.failureCount || 0) + 1;
        const shouldBreak = newFailures >= 3;

        await db.query(
          `UPDATE "ai_providers" SET "failureCount" = $1, "circuitBroken" = $2, "lastFailureAt" = $3 WHERE "id" = $4`,
          [
            newFailures,
            shouldBreak,
            shouldBreak ? new Date() : provider.lastFailureAt,
            provider.id,
          ]
        );
      }
    }

    if (!selectedProvider) {
      throw new Error(`ALL_PROVIDERS_FAILED: All providers failed for conversational scope '${scope}'. Last error: ${lastError?.message}`);
    }

    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = (promptTokens * 0.00000015) + (completionTokens * 0.0000006);

    const logId = `log_${crypto.randomBytes(8).toString('hex')}`;
    await db.query(
      `INSERT INTO "ai_gateway_logs" (
        "id", "userId", "featureKey", "providerId", "modelUsed",
        "promptTokens", "completionTokens", "totalTokens", "estimatedCost", "latencyMs", "status"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        logId,
        req.userId || null,
        featureKey,
        selectedProvider.id,
        selectedProvider.modelId,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        'SUCCESS',
      ]
    );

    return {
      content: rawResult,
      parsedJson,
      providerId: selectedProvider.id,
      modelUsed: selectedProvider.modelId,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      latencyMs,
      status: 'SUCCESS',
    };
  }

  /**
   * Execute multi-turn conversation inference.
   */
  private static async executeProviderConversationCall(
    provider: AIProviderDTO,
    req: RouteAIConversationRequest
  ): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
    const featureKey = req.featureKey;
    const messages = req.messages || [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const turnNumber = req.contextData?.turnNumber || 1;
    const maxTurns = req.contextData?.maxTurns || 4;
    const scenario = req.contextData?.scenario || '';
    const rubric = req.contextData?.rubric || [];

    if (provider.type === 'MOCK') {
      if (featureKey === 'interview_evaluation') {
        // Build realistic dynamic rubric scores
        let totalAssigned = 0;
        let totalMax = 0;
        const rubricScores = rubric.map((crit: any) => {
          const max = Number(crit.maxScore || 25);
          totalMax += max;
          // Assign 80-92% per criterion
          const earned = Math.round((max * 0.85 + (Math.random() * (max * 0.1))) * 10) / 10;
          totalAssigned += earned;
          return {
            id: crit.id,
            name: crit.name,
            score: earned,
            maxScore: max,
            weight: crit.weight || 1,
            feedback: `Candidate demonstrated solid competence in ${crit.name.toLowerCase()} with clear articulation and relevant real-world examples.`,
          };
        });

        if (rubricScores.length === 0) {
          totalMax = 100;
          totalAssigned = 86;
        }

        const percentage = Math.round((totalAssigned / (totalMax || 100)) * 1000) / 10;
        const gradeBand = percentage >= 90 ? 'Outstanding (Band 9)' : percentage >= 80 ? 'Proficient (Band 8)' : 'Competent (Band 7)';

        const evaluationPayload = {
          finalScore: totalAssigned,
          maxScore: totalMax,
          percentage,
          gradeBand,
          rubricScores,
          feedback: `Overall, the candidate provided structured, reasoned, and composed responses across all ${turnNumber} turns. Handled challenging follow-up probes with calm analytical poise and practical policy awareness.`,
          strengths: [
            'Clear and structured articulation of complex administrative and technical concepts.',
            'Effective stakeholder empathy and consideration of constitutional/ethical due process.',
            'Composure and confidence when responding under probing counter-arguments.',
          ],
          weaknesses: [
            'Could provide more concrete statutory/legal clauses when justifying policy measures.',
            'Initial turn was slightly theoretical before grounding into operational specifics.',
          ],
          recommendations: [
            'Incorporate specific statutory precedents and case-law references early in the opening turn.',
            'Use quantitative metrics (budgets, timelines, stakeholder headcounts) to add concrete weight to proposals.',
            'Practice summarizing multi-step action plans into 3 distinct operational pillars.',
          ],
        };

        return {
          content: JSON.stringify(evaluationPayload),
          promptTokens: 250 + messages.length * 40,
          completionTokens: 280,
        };
      }

      // featureKey === 'interview_conversation'
      // Dynamically extract core concepts and terms from the candidate's actual input
      const userWords = lastUserMessage.replace(/[^\w\s]/g, '').split(/\s+/).filter((w) => w.length > 4);
      const salientKeyword = userWords.length > 0 ? `regarding "${userWords[Math.floor(Math.random() * userWords.length)]}"` : 'on that specific point';

      const dynamicProbes = [
        `You raised a critical point ${salientKeyword}. To examine this more closely: (1) What specific operational mechanisms would you use to prevent cascading failures under heavy load? and (2) How would you address the immediate trade-offs if resource constraints reduce your available budget by 40%?`,
        `That is a constructive perspective ${salientKeyword}. Let us explore two key dimensions: (1) What quantitative metrics would you track in the first 90 days to verify that this solution is working? and (2) How would you resolve pushback from key stakeholders who favor an alternative approach?`,
        `Your emphasis ${salientKeyword} touches on an essential trade-off. To probe deeper: (1) What edge cases or security vulnerabilities could emerge under peak concurrency? and (2) What rollback procedure would you enforce if unexpected anomalies are detected?`,
        `Thank you for detailing that approach ${salientKeyword}. Building directly on your explanation: (1) How does this strategy maintain strict compliance with ethical and regulatory standards? and (2) What architectural compromises were made to achieve this throughput?`,
      ];

      const chosenFollowUp = turnNumber >= maxTurns
        ? `Thank you for your comprehensive answers today. That concludes our oral interview session. You may now submit your session for final evaluation.`
        : dynamicProbes[(turnNumber - 1) % dynamicProbes.length];

      return {
        content: chosenFollowUp,
        promptTokens: 120 + messages.length * 30,
        completionTokens: 65,
      };
    }

    if (provider.type === 'LOCAL') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout for local model conversation inference
        let baseUrl = provider.baseUrl?.trim() || 'http://localhost:11434';
        baseUrl = baseUrl.replace(/\/+$/, '');

        // Support Ollama native (/api/chat) or OpenAI-compatible local server (/v1/chat/completions)
        const isOllamaNative = !baseUrl.endsWith('/v1') && !baseUrl.includes('/chat/completions');
        let endpoint = isOllamaNative ? `${baseUrl}/api/chat` : (baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`);

        let reqBody: any;
        if (isOllamaNative) {
          reqBody = {
            model: provider.modelId,
            messages,
            stream: false,
            options: {
              num_predict: req.maxTokens || (featureKey === 'interview_evaluation' ? 512 : 120),
              temperature: req.temperature || 0.7,
            },
            format: featureKey === 'interview_evaluation' ? 'json' : undefined,
          };
        } else {
          reqBody = {
            model: provider.modelId,
            messages,
            temperature: req.temperature || 0.7,
            response_format: featureKey === 'interview_evaluation' ? { type: 'json_object' } : undefined,
          };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`Local chat provider error (${res.status}): ${errBody.error || res.statusText}`);
        }
        const data = await res.json();
        const content = data.message?.content || data.choices?.[0]?.message?.content || data.response || '';
        return {
          content,
          promptTokens: data.prompt_eval_count || data.usage?.prompt_tokens || 120,
          completionTokens: data.eval_count || data.usage?.completion_tokens || 80,
        };
      } catch (err: any) {
        throw new Error(`LOCAL_PROVIDER_FAILED: ${err.message}`);
      }
    }

    if (provider.type === 'CLOUD') {
      const decryptedApiKey = decryptSecret(provider.apiKey || '') || provider.apiKey || '';

      // Normalize base URL
      let baseUrl = provider.baseUrl?.trim() || 'https://api.openai.com/v1';
      baseUrl = baseUrl.replace(/\/+$/, '');
      const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const bodyPayload: any = {
          model: provider.modelId,
          messages,
          temperature: req.temperature || 0.7,
        };
        if (featureKey === 'interview_evaluation') {
          bodyPayload.response_format = { type: 'json_object' };
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (decryptedApiKey && decryptedApiKey.trim() !== '') {
          headers['Authorization'] = `Bearer ${decryptedApiKey.trim()}`;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`Cloud provider error (${res.status}): ${errBody.error?.message || errBody.message || res.statusText}`);
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
        return {
          content,
          promptTokens: data.usage?.prompt_tokens || 180,
          completionTokens: data.usage?.completion_tokens || 120,
        };
      } catch (err: any) {
        throw new Error(`CLOUD_PROVIDER_FAILED (${provider.name} - ${provider.modelId}): ${err.message}`);
      }
    }

    throw new Error(`UNSUPPORTED_PROVIDER_TYPE: ${provider.type}`);
  }

  /**
   * List all configured AI Providers with masked API keys, optionally filtered by scope.
   */
  static async listProviders(scope?: string): Promise<AIProviderDTO[]> {
    const db = pgDb;
    let query = `SELECT * FROM "ai_providers"`;
    const params: any[] = [];
    if (scope && scope.trim() !== '') {
      query += ` WHERE "scope" = $1 ORDER BY "priority" ASC`;
      params.push(scope.trim());
    } else {
      query += ` ORDER BY "scope" ASC, "priority" ASC`;
    }
    const res = await db.query(query, params);
    return res.rows.map((r: any) => ({
      ...r,
      apiKey: maskApiKey(r.apiKey),
    }));
  }

  /**
   * Update provider settings (priority, active status, keys).
   * Automatically encrypts new API keys with AES-256-GCM.
   */
  static async updateProvider(id: string, updates: Partial<AIProviderDTO>): Promise<AIProviderDTO> {
    const db = pgDb;

    // Fetch existing provider record
    const existingRes = await db.query(`SELECT * FROM "ai_providers" WHERE "id" = $1`, [id]);
    if (existingRes.rows.length === 0) {
      throw new Error(`PROVIDER_NOT_FOUND: ${id}`);
    }
    const existing = existingRes.rows[0] as any;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        if (k === 'apiKey') {
          // If value is masked placeholder or empty string, preserve existing encrypted key
          if (typeof v === 'string' && (v.includes('••••') || v.includes('...'))) {
            continue;
          }
          const encryptedKey = typeof v === 'string' && v.trim() !== '' ? encryptSecret(v.trim()) : null;
          fields.push(`"${k}" = $${idx}`);
          values.push(encryptedKey);
          idx++;
        } else {
          fields.push(`"${k}" = $${idx}`);
          values.push(v);
          idx++;
        }
      }
    }

    if (fields.length === 0) {
      return {
        ...existing,
        apiKey: maskApiKey(existing.apiKey),
      };
    }

    fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);

    const res = await db.query(
      `UPDATE "ai_providers" SET ${fields.join(', ')} WHERE "id" = $${idx} RETURNING *`,
      values
    );

    const updated = res.rows[0] as any;
    return {
      ...updated,
      apiKey: maskApiKey(updated.apiKey),
    };
  }

  /**
   * Test live connectivity and response latency for a specific provider.
   */
  static async testProviderConnection(
    id: string,
    testConfig?: { apiKey?: string; baseUrl?: string; modelId?: string }
  ): Promise<{
    success: boolean;
    latencyMs: number;
    modelUsed: string;
    message: string;
    sampleOutput?: any;
  }> {
    const db = pgDb;
    const res = await db.query(`SELECT * FROM "ai_providers" WHERE "id" = $1`, [id]);
    if (res.rows.length === 0) {
      throw new Error(`PROVIDER_NOT_FOUND: ${id}`);
    }

    const provider: AIProviderDTO = {
      ...(res.rows[0] as any),
      ...(testConfig || {}),
    };

    // If testConfig has a plaintext apiKey, use that; else keep provider.apiKey
    if (testConfig?.apiKey && !testConfig.apiKey.includes('••••')) {
      provider.apiKey = encryptSecret(testConfig.apiKey);
    }

    const startTime = Date.now();
    try {
      const pingResult = await this.executeProviderCall(
        provider,
        'You are an assessment authoring assistant.',
        'Generate a sample SINGLE_CHOICE item for subject: Physics, topic: "Kinematics". Return valid JSON.'
      );
      const latencyMs = Date.now() - startTime;
      let parsed = null;
      try {
        parsed = JSON.parse(pingResult.content);
      } catch {
        parsed = pingResult.content;
      }

      return {
        success: true,
        latencyMs,
        modelUsed: provider.modelId,
        message: `Successfully connected to ${provider.name} (${provider.modelId}) in ${latencyMs}ms`,
        sampleOutput: parsed,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        modelUsed: provider.modelId,
        message: `Connection test failed: ${err.message}`,
      };
    }
  }
}
