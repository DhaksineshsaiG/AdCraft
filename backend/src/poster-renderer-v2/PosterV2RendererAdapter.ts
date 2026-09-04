import RendererV2, { RendererV2Input, RendererV2MarketingContent } from './Renderer';
import { CanvasSize } from './Canvas';
import TemplateSelector from './templates/TemplateSelector';
import type { RendererTemplateProfile } from './templates/TemplateTypes';
import type { PosterData, PosterPriceData } from '../poster-engine/types/data';
import type { PosterDimensions } from '../poster-engine/types/geometry';
import type { PosterTemplate } from '../poster-engine/templates/PosterTemplate';
import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';

export interface PosterV2RendererAdapterInput {
  posterData: PosterData;
  posterDesignDecision: PosterDesignDecision;
  canvas: PosterDimensions;
  template?: PosterTemplate;
}

export class PosterV2RendererAdapter {
  public constructor(
    private readonly rendererV2 = new RendererV2(),
    private readonly templateSelector = new TemplateSelector()
  ) {}

  public render(input: PosterV2RendererAdapterInput): string {
    const v2Input = this.toRendererV2Input(input);
    return this.rendererV2.renderSvg(v2Input);
  }

  public toRendererV2Input(input: PosterV2RendererAdapterInput): RendererV2Input {
    const content = this.resolveMarketingContent(input.posterData);
    const canvas: CanvasSize = {
      width: input.canvas.width,
      height: input.canvas.height,
    };
    const template = this.resolveTemplateProfile(input);

    return {
      design: input.posterDesignDecision,
      content,
      canvas,
      template,
    };
  }

  private resolveMarketingContent(data: PosterData): RendererV2MarketingContent {
    const headline = resolvePosterHeadline(data);
    const description = data.description?.trim() || data.product.description?.trim() || undefined;
    const price = data.price ? formatPrice(data.price) : undefined;
    const cta = data.cta?.trim() || 'Shop Now';
    const productImageUrl = data.product.image?.url;
    const productImageAlt = data.product.image?.altText || data.product.name;

    return {
      headline,
      description,
      price,
      cta,
      productImageUrl,
      productImageAlt,
    };
  }

  private resolveTemplateProfile(
    input: PosterV2RendererAdapterInput
  ): RendererTemplateProfile | undefined {
    try {
      const category = input.posterData.product.category || 'General';
      const metadata = input.posterData.metadata ?? {};
      const campaign = (metadata['campaign'] as string) || undefined;
      const tone =
        (metadata['tone'] as string) ||
        (input.template?.metadata?.['style'] as string) ||
        undefined;
      const industryPack = (metadata['industryPack'] as string) || undefined;

      return this.templateSelector.selectTemplate({
        productCategory: category,
        campaign,
        tone,
        industryPack,
        posterSize: {
          width: input.canvas.width,
          height: input.canvas.height,
        },
        templateId: input.template?.id,
      });
    } catch (error) {
      console.warn('[PosterV2RendererAdapter] Failed to resolve template profile:', error);
      return undefined;
    }
  }
}

function resolvePosterHeadline(data: PosterData): string {
  const headline = data.headline?.trim() || '';
  const productName = data.product?.name?.trim() || '';

  if (headline.length > 48 && productName.length > 0 && productName.length <= 44) {
    return productName;
  }

  return headline || productName || 'Featured Product';
}

function formatPrice(price: PosterPriceData): string {
  if (price.formatted) {
    return price.formatted;
  }

  const currency = price.currency || 'USD';
  const amount = typeof price.amount === 'number' ? price.amount.toFixed(2) : '0.00';
  return `${currency} ${amount}`;
}

export default PosterV2RendererAdapter;
