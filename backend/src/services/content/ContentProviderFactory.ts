import { env } from '../../config/env';
import MarketingContentProvider from './MarketingContentProvider';
import OllamaContentProvider from './OllamaContentProvider';
import type { ContentProvider, ContentProviderName } from './ContentProvider';

function parseProviderName(value: string | undefined): ContentProviderName {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'marketing' || normalized === 'ollama') return normalized;

  if (normalized) {
    console.warn(
      `[ContentProviderFactory] CONTENT_PROVIDER="${value}" is not recognized. Defaulting to "ollama".`
    );
  }

  return 'ollama';
}

export class ContentProviderFactory {
  private static readonly ollamaProvider = new OllamaContentProvider();
  private static readonly marketingProvider = new MarketingContentProvider();

  static getProvider(): ContentProvider {
    const providerName = parseProviderName(process.env.CONTENT_PROVIDER ?? env.CONTENT_PROVIDER);
    return providerName === 'marketing'
      ? ContentProviderFactory.marketingProvider
      : ContentProviderFactory.ollamaProvider;
  }
}

export default ContentProviderFactory;

