import type { IPromptConfig } from '../../models/GeneratedContent';
import type { IProductDocument } from '../../models/Product';
import type { ChatCompletionResult } from '../openai.service';
import type { PromptBuildOptions } from '../promptBuilder.service';

export type ContentProviderName = 'ollama' | 'marketing';

export interface ContentProviderRequest {
  product: IProductDocument;
  options: PromptBuildOptions;
  promptConfig: IPromptConfig;
}

export interface ContentProvider {
  readonly name: ContentProviderName;
  generateContent(request: ContentProviderRequest): Promise<ChatCompletionResult>;
}

