import { env } from '../config/env';
import { ExternalServiceError } from '../middleware/errorMiddleware';
import { IGenerationMetrics } from '../models/GeneratedContent';
import type { ChatCompletionRequest, ChatCompletionResult } from './openai.service';

interface OllamaChatResponse {
  message?: {
    role: string;
    content: string;
  };
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
  done?: boolean;
  error?: string;
}

class OllamaApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'OllamaApiError';
  }
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function isRetryable(error: unknown): boolean {
  if (error instanceof OllamaApiError) {
    return RETRYABLE_STATUS_CODES.has(error.status ?? 0);
  }

  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
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

class OllamaService {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = env.OLLAMA_BASE_URL.replace(/\/+$/, '');
    this.model = env.OLLAMA_MODEL;
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const {
      systemPrompt,
      userPrompt,
      temperature = 0.7,
      maxTokens = 1000,
      topP,
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
        const responses: OllamaChatResponse[] = [];
        const completionCount = Math.min(variants, 5);

        for (let index = 0; index < completionCount; index++) {
          responses.push(
            await this.createChatCompletion({
              systemPrompt,
              userPrompt,
              temperature,
              maxTokens,
              topP,
            })
          );
        }

        const durationMs = Date.now() - startTime;

        const texts = responses
          .map((response) => response.message?.content?.trim() ?? '')
          .filter((text) => text.length > 0);

        if (texts.length === 0) {
          throw new ExternalServiceError(
            'Ollama',
            'API returned empty completions. The prompt may have been filtered.'
          );
        }

        const promptFallback = estimateTokenCount(`${systemPrompt}\n${userPrompt}`);
        const completionFallback = estimateTokenCount(texts.join('\n'));
        const promptTokens = responses.reduce(
          (total, response) => total + (response.prompt_eval_count ?? promptFallback),
          0
        );
        const completionTokens = responses.reduce(
          (total, response) => total + (response.eval_count ?? completionFallback),
          0
        );

        const metrics: Omit<IGenerationMetrics, 'retryCount'> = {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          generationDurationMs: durationMs,
          estimatedCostUsd: 0,
        };

        return { texts, metrics };
      } catch (error) {
        lastError = error;

        if (error instanceof ExternalServiceError) throw error;

        if (!isRetryable(error) || attempt === MAX_RETRIES) {
          break;
        }

        console.warn(
          `[OllamaService] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed. Retrying...`,
          { model: this.model, error: error instanceof Error ? error.message : String(error) }
        );
      }
    }

    this.throwDomainError(lastError, retryCount);
  }

  private async createChatCompletion(request: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
  }): Promise<OllamaChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          stream: false,
          options: {
            temperature: request.temperature,
            num_predict: request.maxTokens,
            ...(request.topP !== undefined && { top_p: request.topP }),
          },
        }),
        signal: controller.signal,
      });

      const data = await this.parseResponse(response);

      if (!response.ok) {
        throw new OllamaApiError(data.error ?? response.statusText, response.status);
      }

      if (data.error) {
        throw new OllamaApiError(data.error, response.status);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseResponse(response: Response): Promise<OllamaChatResponse> {
    const body = await response.text();

    if (!body.trim()) {
      return {};
    }

    try {
      return JSON.parse(body) as OllamaChatResponse;
    } catch {
      throw new OllamaApiError(body, response.status);
    }
  }

  private throwDomainError(error: unknown, retryCount: number): never {
    if (error instanceof OllamaApiError) {
      const suffix = retryCount > 0 ? ` (failed after ${retryCount} retries)` : '';

      switch (error.status) {
        case 404:
          throw new ExternalServiceError(
            'Ollama',
            `Model "${this.model}" was not found. Pull it with: ollama pull ${this.model}`
          );
        case 429:
          throw new ExternalServiceError(
            'Ollama',
            `Ollama rate limit exceeded${suffix}. Please wait before generating more content.`
          );
        case 500:
        case 503:
          throw new ExternalServiceError(
            'Ollama',
            `Ollama service is temporarily unavailable${suffix}. Please try again later.`
          );
        default:
          throw new ExternalServiceError(
            'Ollama',
            `API error (${error.status ?? 'unknown'})${suffix}: ${error.message}`
          );
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new ExternalServiceError(
      'Ollama',
      `Unexpected error communicating with Ollama: ${message}`
    );
  }
}

const ollamaService = new OllamaService();
export default ollamaService;
