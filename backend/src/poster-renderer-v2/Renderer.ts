import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import Canvas, { CanvasSize, Region } from './Canvas';
import BackgroundRenderer from './BackgroundRenderer';
import CTARenderer from './CTARenderer';
import DecorationRenderer from './DecorationRenderer';
import LayoutManager from './LayoutManager';
import ProductRenderer from './ProductRenderer';
import RenderValidator from './RenderValidator';
import SVGBuilder, { escapeSvg, formatNumber, rectAttrs } from './SVGBuilder';
import TypographyRenderer from './TypographyRenderer';
import type { RendererTemplateProfile } from './templates/TemplateTypes';

export interface RendererV2MarketingContent {
  headline: string;
  description?: string;
  price?: string;
  cta: string;
  productImageUrl?: string;
  productImageAlt?: string;
}

export interface RendererV2Input {
  design: PosterDesignDecision;
  content: RendererV2MarketingContent;
  canvas: CanvasSize;
  template?: RendererTemplateProfile;
}

export class RendererV2 {
  private readonly backgroundRenderer = new BackgroundRenderer();

  private readonly productRenderer = new ProductRenderer();

  private readonly typographyRenderer = new TypographyRenderer();

  private readonly decorationRenderer = new DecorationRenderer();

  private readonly ctaRenderer = new CTARenderer();

  private readonly validator = new RenderValidator();

  renderSvg(input: RendererV2Input): string {
    const canvas = new Canvas(input.canvas, input.design.layout.safeMargins);
    const layoutManager = new LayoutManager(canvas, input.design, input.template);
    const regions = layoutManager.calculateRegions();
    const builder = new SVGBuilder(input.canvas);
    this.validator.assertValid('region planning', this.validator.validateRegions(input.canvas, regions));

    builder.addFragment(wrapEditorLayer(
      this.backgroundRenderer.render(input.design, {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      }, builder, input.template, regions.imageRegion),
      {
        id: 'background',
        type: 'background',
        label: 'Background',
        region: { x: 0, y: 0, width: canvas.width, height: canvas.height },
      }
    ));
    const protectedRegions = [
      regions.imageRegion,
      regions.headlineRegion,
      regions.descriptionRegion,
      regions.priceRegion,
      regions.ctaRegion,
    ];
    const decorations = this.decorationRenderer.render(input.design, regions.decorationRegions, builder, protectedRegions, input.template);
    const decorationRegion = boundingBox(regions.decorationRegions, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });
    const wrappedDecorations = wrapEditorLayer(decorations, {
      id: 'decorations',
      type: 'decoration',
      label: 'Decorations',
      region: decorationRegion,
    });
    if (input.design.decorations.depth !== 'foreground') {
      builder.addFragment(wrappedDecorations);
    }
    builder.addFragment(wrapEditorLayer(
      this.productRenderer.render(input.design, regions.imageRegion, {
        imageUrl: input.content.productImageUrl,
        altText: input.content.productImageAlt,
      }, builder, input.template),
      {
        id: 'product_image',
        type: 'product_image',
        label: 'Product Image',
        region: regions.imageRegion,
      }
    ));
    builder.addFragment(this.renderTextCard(input.design, regions.safeZones.text, input.template));
    builder.addFragment(wrapEditorLayer(
      this.typographyRenderer.renderHeadline(
        input.design,
        regions.headlineRegion,
        input.content.headline,
        input.template
      ),
      {
        id: 'headline',
        type: 'headline',
        label: 'Headline',
        region: regions.headlineRegion,
      }
    ));
    builder.addFragment(wrapEditorLayer(
      this.typographyRenderer.renderDescription(
        input.design,
        regions.descriptionRegion,
        input.content.description ?? '',
        input.template
      ),
      {
        id: 'description',
        type: 'description',
        label: 'Description',
        region: regions.descriptionRegion,
      }
    ));
    builder.addFragment(wrapEditorLayer(
      this.typographyRenderer.renderPrice(
        input.design,
        regions.priceRegion,
        input.content.price,
        input.template
      ),
      {
        id: 'price',
        type: 'price',
        label: 'Price',
        region: regions.priceRegion,
      }
    ));
    builder.addFragment(wrapEditorLayer(
      this.ctaRenderer.render(input.design, regions.ctaRegion, input.content.cta, input.template),
      {
        id: 'cta',
        type: 'cta',
        label: 'CTA',
        region: regions.ctaRegion,
      }
    ));
    if (input.design.decorations.depth === 'foreground') {
      builder.addFragment(wrappedDecorations);
    }

    const svg = builder.build();
    this.validator.assertValid('svg assembly', this.validator.validateSvg(svg));

    return svg;
  }

  private renderTextCard(
    design: PosterDesignDecision,
    region: Region,
    template: RendererV2Input['template']
  ): string {
    if (!template || template.cardStyle.mode === 'none') return '';

    const padding = Math.max(8, Math.min(region.width, region.height) * 0.06);
    const cardRegion = {
      x: region.x - padding,
      y: region.y - padding,
      width: region.width + padding * 2,
      height: region.height + padding * 2,
    };
    const radius = template.cornerRadius.surface * template.borderStyle.radiusMultiplier;
    const fill = template.cardStyle.mode === 'glass'
      ? design.colors.surface
      : template.cardStyle.mode === 'outline'
        ? 'transparent'
        : design.colors.surface;
    const strokeOpacity = template.cardStyle.strokeOpacity * template.borderStyle.opacity;
    const elevatedShadow = template.cardStyle.mode === 'elevated'
      ? `<rect x="${formatNumber(cardRegion.x)}" y="${formatNumber(cardRegion.y + template.shadowPreset.offsetY * 0.24)}" width="${formatNumber(cardRegion.width)}" height="${formatNumber(cardRegion.height)}" rx="${formatNumber(radius)}" fill="${escapeSvg(design.colors.shadow)}" opacity="${formatNumber(template.shadowPreset.opacity * 0.45)}" />`
      : '';

    return [
      `<g data-template-card="${escapeSvg(template.templateId)}">`,
      elevatedShadow,
      `<rect ${rectAttrs(cardRegion)} rx="${formatNumber(radius)}" fill="${escapeSvg(fill)}" opacity="${formatNumber(template.cardStyle.opacity)}" stroke="${escapeSvg(design.colors.border)}" stroke-width="${formatNumber(template.borderStyle.width)}" stroke-opacity="${formatNumber(strokeOpacity)}" />`,
      '</g>',
    ].join('');
  }
}

function wrapEditorLayer(
  markup: string,
  layer: {
    id: string;
    type: string;
    label: string;
    region: { x: number; y: number; width: number; height: number };
  }
): string {
  if (!markup || !markup.trim()) {
    return '';
  }

  return [
    `<g data-editor-layer="true"`,
    `data-layer-id="${escapeSvg(layer.id)}"`,
    `data-layer-type="${escapeSvg(layer.type)}"`,
    `data-layer-label="${escapeSvg(layer.label)}"`,
    `data-layer-x="${formatNumber(layer.region.x)}"`,
    `data-layer-y="${formatNumber(layer.region.y)}"`,
    `data-layer-width="${formatNumber(layer.region.width)}"`,
    `data-layer-height="${formatNumber(layer.region.height)}"`,
    '>',
    markup,
    '</g>',
  ].join(' ');
}

function boundingBox(regions: Region[], fallback: Region): Region {
  if (!regions || regions.length === 0) return fallback;
  const minX = Math.min(...regions.map((r) => r.x));
  const minY = Math.min(...regions.map((r) => r.y));
  const maxX = Math.max(...regions.map((r) => r.x + r.width));
  const maxY = Math.max(...regions.map((r) => r.y + r.height));
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

export default RendererV2;
