import OpenAI from 'openai';
import { env } from '../config/env';
import { ExternalServiceError } from '../middleware/errorMiddleware';
import { AIModel, IGenerationMetrics } from '../models/GeneratedContent';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatCompletionRequest {
  model: AIModel;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  // Number of independent completions to generate (maps to OpenAI `n`)
  variants?: number;
}

export interface ChatCompletionResult {
  texts: string[];                  // One entry per variant (n=1 → texts[0])
  metrics: Omit<IGenerationMetrics, 'retryCount'>;
}

// ─── Token Pricing (USD per 1 000 tokens, as of mid-2024) ────────────────────
// Used to compute estimatedCostUsd stored on GeneratedContent.metrics.
// Update these constants when OpenAI revises pricing.

const TOKEN_PRICE_USD_PER_1K: Record<string, { input: number; output: number }> = {
  [AIModel.GPT_4O]:       { input: 0.005,   output: 0.015   },
  [AIModel.GPT_4O_MINI]:  { input: 0.00015, output: 0.0006  },
  [AIModel.GPT_4_TURBO]:  { input: 0.01,    output: 0.03    },
};

function estimateCost(model: AIModel, promptTokens: number, completionTokens: number): number {
  const pricing = TOKEN_PRICE_USD_PER_1K[model] ?? { input: 0.005, output: 0.015 };
  const cost =
    (promptTokens / 1000) * pricing.input +
    (completionTokens / 1000) * pricing.output;
  return Math.round(cost * 1_000_000) / 1_000_000; // Round to 6 decimal places
}

// ─── Retry Config ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return RETRYABLE_STATUS_CODES.has(error.status ?? 0);
  }
  // Network errors (ECONNRESET, ETIMEDOUT, fetch failures)
  if (error instanceof Error) {
    return (
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('fetch failed') ||
      error.message.includes('network')
    );
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── OpenAI Service ───────────────────────────────────────────────────────────

class OpenAIService {
  private readonly client: OpenAI;

  constructor() {
    // The SDK reads OPENAI_API_KEY from process.env automatically,
    // but we pass it explicitly for clarity and testability.
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 0,  // We handle retries manually for full observability
      timeout: 60_000,
    });
  }

  // ─── Chat Completion ──────────────────────────────────────────────────────

  /**
   * Call the OpenAI Chat Completions endpoint.
   * Implements exponential back-off retry for transient errors.
   * Returns all variant texts and usage/cost metrics.
   */
  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const {
      model,
      systemPrompt,
      userPrompt,
      temperature = 0.7,
      maxTokens = 1000,
      topP,
      frequencyPenalty,
      presencePenalty,
      variants = 1,
    } = request;

    let lastError: unknown;
    let retryCount = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 200;
        await sleep(backoff + jitter);
        retryCount = attempt;
      }

      const startTime = Date.now();

      try {
        const response = await this.client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          n: Math.min(variants, 5), // Cap at 5 — matches IContentVariant max
          ...(topP !== undefined && { top_p: topP }),
          ...(frequencyPenalty !== undefined && { frequency_penalty: frequencyPenalty }),
          ...(presencePenalty !== undefined && { presence_penalty: presencePenalty }),
        });

        const durationMs = Date.now() - startTime;

        // Extract text from each choice; filter out empty/null completions
        const texts = response.choices
          .map((c) => c.message?.content?.trim() ?? '')
          .filter((t) => t.length > 0);

        if (texts.length === 0) {
          throw new ExternalServiceError(
            'OpenAI',
            'API returned empty completions. The prompt may have been filtered.'
          );
        }

        const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        const metrics: Omit<IGenerationMetrics, 'retryCount'> = {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          generationDurationMs: durationMs,
          estimatedCostUsd: estimateCost(model, usage.prompt_tokens, usage.completion_tokens),
        };

        return { texts, metrics };

      } catch (error) {
        lastError = error;

        // Already a domain error — do not retry, re-throw immediately
        if (error instanceof ExternalServiceError) throw error;

        if (!isRetryable(error) || attempt === MAX_RETRIES) {
          break;
        }

        console.warn(
          `[OpenAIService] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed. Retrying...`,
          { model, error: error instanceof Error ? error.message : String(error) }
        );
      }
    }

    // Map OpenAI SDK errors to domain ExternalServiceError
    this.throwDomainError(lastError, retryCount);
  }

  // ─── Error Mapper ─────────────────────────────────────────────────────────

  private throwDomainError(error: unknown, retryCount: number): never {
    if (error instanceof OpenAI.APIError) {
      const suffix = retryCount > 0 ? ` (failed after ${retryCount} retries)` : '';

      switch (error.status) {
        case 401:
          throw new ExternalServiceError(
            'OpenAI',
            'Invalid API key. Please check your OPENAI_API_KEY environment variable.'
          );
        case 403:
          throw new ExternalServiceError(
            'OpenAI',
            'Access denied. Your account may not have access to this model.'
          );
        case 429:
          throw new ExternalServiceError(
            'OpenAI',
            `OpenAI rate limit exceeded${suffix}. Please wait before generating more content.`
          );
        case 500:
        case 503:
          throw new ExternalServiceError(
            'OpenAI',
            `OpenAI service is temporarily unavailable${suffix}. Please try again later.`
          );
        default:
          throw new ExternalServiceError(
            'OpenAI',
            `API error (${error.status})${suffix}: ${error.message}`
          );
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError(
      'OpenAI',
      `Unexpected error communicating with OpenAI: ${message}`
    );
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────
// One client instance is shared across the app — the OpenAI SDK is stateless
// and safe for concurrent use.

const openAIService = new OpenAIService();
export default openAIService;
