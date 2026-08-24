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
  scope: 'question_authoring' | 'interview' | string;
  prompt?: string;
  variables?: Record<string, any>;
  userId?: string;
  preferredProviderId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface RouteAIConversationRequest {
  featureKey: 'interview_conversation' | 'interview_evaluation' | string;
  scope: 'interview' | string;
  systemPrompt?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  contextData?: {
    scenario?: string;
    questionContent?: string;
    rubric?: any[];
    turnNumber?: number;
    maxTurns?: number;
    preset?: string;
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

export class AIGatewayService {
  private static circuitBreakerResetMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Route an AI request to the best available provider with fallback, circuit breaking, and schema validation.
   */
  static async routeRequest(req: RouteAIRequest): Promise<RouteAIResponse> {
    if (!req.scope || typeof req.scope !== 'string' || req.scope.trim() === '') {
      throw new Error('SCOPE_REQUIRED: Every AI Gateway request must explicitly specify a scope (e.g. question_authoring, interview)');
    }

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
        `SELECT * FROM "ai_providers" WHERE "id" = $1 AND "isActive" = true AND "scope" = $2`,
        [req.preferredProviderId, req.scope]
      );
      if (prefRes.rows.length > 0) {
        providers = prefRes.rows as any[];
      }
    }

    if (providers.length === 0) {
      const providersRes = await db.query(
        `SELECT * FROM "ai_providers" WHERE "isActive" = true AND "scope" = $1 ORDER BY "priority" ASC`,
        [req.scope]
      );
      providers = (providersRes.rows as any[]) || [];
    }

    if (providers.length === 0) {
      throw new Error(`NO_AI_PROVIDERS_AVAILABLE: No active providers found for scope '${req.scope}'`);
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
          if (req.scope === 'interview') {
            if (typeof parsedJson.score !== 'number' || !parsedJson.feedback) {
              throw new Error('SCHEMA_VALIDATION_FAILED: Missing required interview evaluation fields');
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
      if (provider.scope === 'interview') {
        const interviewMockOutput = {
          score: 8.5,
          feedback: 'Candidate displayed articulate conceptual comprehension, rigorous scientific rationale, and sound edge case handling.',
          followUpQuestion: 'How does the observed outcome scale when velocity approaches relativistic limits?',
        };
        return {
          content: JSON.stringify(interviewMockOutput),
          promptTokens: 110 + Math.floor(userPrompt.length / 4),
          completionTokens: 90,
        };
      }

      const isModification = userPrompt.includes('variation') || userPrompt.includes('alternative') || userPrompt.includes('Reference Question');
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
      // Ollama / Local API format
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout for local model
        const res = await fetch(`${provider.baseUrl || 'http://localhost:11434'}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: provider.modelId,
            prompt: `${systemPrompt}\n\n${userPrompt}`,
            stream: false,
            format: 'json',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Local provider responded with status ${res.status}`);
        const data = await res.json();
        return {
          content: data.response,
          promptTokens: data.prompt_eval_count || 100,
          completionTokens: data.eval_count || 80,
        };
      } catch (err: any) {
        throw new Error(`LOCAL_PROVIDER_FAILED: ${err.message}`);
      }
    }

    if (provider.type === 'CLOUD') {
      // Cloud OpenAI / Anthropic format
      const decryptedApiKey = decryptSecret(provider.apiKey || '');
      if (!decryptedApiKey || decryptedApiKey.trim() === '') {
        throw new Error('CLOUD_API_KEY_NOT_CONFIGURED');
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(`${provider.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${decryptedApiKey}`,
          },
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
    const scope = req.scope || 'interview';
    const featureKey = req.featureKey || 'interview_conversation';

    // 1. Fetch available providers for this scope ordered by priority ASC
    const provRes = await db.query(
      `SELECT * FROM "ai_providers" WHERE "scope" = $1 AND "isActive" = true ORDER BY "priority" ASC`,
      [scope]
    );

    let providers = provRes.rows as AIProviderDTO[];

    if (req.preferredProviderId) {
      const preferred = providers.find((p) => p.id === req.preferredProviderId);
      if (preferred) {
        providers = [preferred, ...providers.filter((p) => p.id !== req.preferredProviderId)];
      }
    }

    if (providers.length === 0) {
      throw new Error(`NO_ACTIVE_PROVIDERS: No active providers configured for AI scope '${scope}'`);
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
      // Generate intelligent contextual follow-up probing questions
      const followUpTemplates = [
        `You emphasized that point clearly. However, what specific operational measures would you take if budget constraints reduce your available resources by 40%?`,
        `That is a constructive perspective. How would you address the immediate concerns of affected stakeholders who feel their voices have been overlooked?`,
        `Interesting argument. What metrics or key performance indicators would you use to evaluate whether this strategy is succeeding after the first quarter?`,
        `Thank you for detailing that approach. Could you summarize your final synthesis and core takeaway for this board?`,
      ];

      const chosenFollowUp = turnNumber >= maxTurns
        ? `Thank you for your comprehensive answers today. That concludes our interview session. You may now submit your session for final evaluation.`
        : followUpTemplates[(turnNumber - 1) % followUpTemplates.length];

      return {
        content: chosenFollowUp,
        promptTokens: 120 + messages.length * 30,
        completionTokens: 65,
      };
    }

    if (provider.type === 'LOCAL') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${provider.baseUrl || 'http://localhost:11434'}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: provider.modelId,
            messages,
            stream: false,
            format: featureKey === 'interview_evaluation' ? 'json' : undefined,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Local chat provider error (${res.status})`);
        const data = await res.json();
        return {
          content: data.message?.content || data.response || '',
          promptTokens: data.prompt_eval_count || 120,
          completionTokens: data.eval_count || 80,
        };
      } catch (err: any) {
        throw new Error(`LOCAL_PROVIDER_FAILED: ${err.message}`);
      }
    }

    if (provider.type === 'CLOUD') {
      const decryptedApiKey = decryptSecret(provider.apiKey || '');
      if (!decryptedApiKey || decryptedApiKey.trim() === '') {
        throw new Error('CLOUD_API_KEY_NOT_CONFIGURED');
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const bodyPayload: any = {
          model: provider.modelId,
          messages,
          temperature: req.temperature || 0.7,
        };
        if (featureKey === 'interview_evaluation') {
          bodyPayload.response_format = { type: 'json_object' };
        }

        const res = await fetch(`${provider.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${decryptedApiKey}`,
          },
          body: JSON.stringify(bodyPayload),
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
          promptTokens: data.usage?.prompt_tokens || 180,
          completionTokens: data.usage?.completion_tokens || 120,
        };
      } catch (err: any) {
        throw new Error(`CLOUD_PROVIDER_FAILED: ${err.message}`);
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
