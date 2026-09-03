import ollamaService from '../ollama.service';
import type { ContentProvider, ContentProviderRequest } from './ContentProvider';

export class OllamaContentProvider implements ContentProvider {
  readonly name = 'ollama' as const;

  async generateContent(request: ContentProviderRequest) {
    const startTime = Date.now();
    const result = await ollamaService.complete({
      model: request.promptConfig.model,
      systemPrompt: request.promptConfig.systemPrompt,
      userPrompt: request.promptConfig.userPrompt,
      temperature: request.promptConfig.temperature,
      maxTokens: request.promptConfig.maxTokens,
      frequencyPenalty: request.promptConfig.frequencyPenalty,
      presencePenalty: request.promptConfig.presencePenalty,
      variants: 1,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.info('[ContentProvider] Provider Used: ollama', {
        attempts: 1,
        generationTimeMs: Date.now() - startTime,
      });
    }

    return result;
  }
}

export default OllamaContentProvider;

