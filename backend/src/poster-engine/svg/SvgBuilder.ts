import { PosterLayout, PosterLayoutItem } from '../layout';
import { renderBackgroundSvg } from './components/background.svg';
import { renderCtaButtonSvg } from './components/cta.svg';
import { renderDiscountBadgeSvg } from './components/discountBadge.svg';
import { renderFooterSvg } from './components/footer.svg';
import { renderImageSvg } from './components/image.svg';
import { renderLogoSvg } from './components/logo.svg';
import { renderTextSvg } from './components/text.svg';
import { renderPriceCardSvg } from './components/price.svg';
import { createClipPath, createGradient, createShadowFilter } from './helpers/defs';
import { escapeXml, formatNumber, rectAttributes } from './helpers/svgUtils';
import {
  SvgBuilder,
  SvgBuilderOptions,
  SvgBuildContext,
} from './SvgBuilder.types';

const DEFAULT_OPTIONS = {
  includeXmlDeclaration: false,
  clipToSafeArea: false,
  showSafeArea: false,
};

export class DefaultSvgBuilder implements SvgBuilder {
  public build(layout: PosterLayout, options: SvgBuilderOptions = {}): string {
    const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };
    const defs: string[] = [];
    const usedIds = new Set<string>();
    const context: SvgBuildContext = {
      layout,
      options: resolvedOptions,
      defs,
      usedIds,
      nextId: (prefix) => nextId(usedIds, prefix),
      createClipPath: (item, inset) => createClipPath(context, item, inset),
      createShadowFilter: (item) => createShadowFilter(context, item),
      createGradient: (item) => createGradient(context, item),
    };
    const safeAreaClipId = resolvedOptions.clipToSafeArea && resolvedOptions.safeArea
      ? createSafeAreaClip(context)
      : undefined;

    const content = layout.items
      .filter((item) => item.visible)
      .map((item) => {
        const markup = renderLayoutItem(item, context);

        if (!markup) {
          return markup;
        }

        const wrapped = wrapEditableLayer(item, markup);

        if (!safeAreaClipId || item.type === 'background') {
          return wrapped;
        }

        return `<g clip-path="url(#${safeAreaClipId})">${wrapped}</g>`;
      })
      .filter(Boolean)
      .join('');
    const safeAreaGuide = resolvedOptions.showSafeArea
      ? renderSafeAreaGuide(context)
      : '';
    const title = resolvedOptions.title
      ? `<title>${escapeXml(resolvedOptions.title)}</title>`
      : '';
    const description = resolvedOptions.description
      ? `<desc>${escapeXml(resolvedOptions.description)}</desc>`
      : '';
    const defsMarkup = defs.length > 0 ? `<defs>${defs.join('')}</defs>` : '';
    const openingTag = [
      `<svg xmlns="http://www.w3.org/2000/svg"`,
      `width="${formatNumber(layout.canvas.width)}"`,
      `height="${formatNumber(layout.canvas.height)}"`,
      `viewBox="0 0 ${formatNumber(layout.canvas.width)} ${formatNumber(layout.canvas.height)}"`,
      `role="img"`,
      `data-template-id="${escapeXml(layout.templateId)}"`,
      `data-template-version="${escapeXml(layout.templateVersion)}"`,
      '>',
    ].join(' ');
    const svg = [
      openingTag,
      title,
      description,
      defsMarkup,
      content,
      safeAreaGuide,
      '</svg>',
    ].join('');

    return resolvedOptions.includeXmlDeclaration
      ? `<?xml version="1.0" encoding="UTF-8"?>${svg}`
      : svg;
  }
}

function wrapEditableLayer(item: PosterLayoutItem, markup: string): string {
  const label = layerLabel(item.type);
  return [
    `<g data-editor-layer="true"`,
    `data-layer-id="${escapeXml(item.componentId)}"`,
    `data-layer-type="${escapeXml(item.type)}"`,
    `data-layer-label="${escapeXml(label)}"`,
    `data-layer-x="${formatNumber(item.bounds.x)}"`,
    `data-layer-y="${formatNumber(item.bounds.y)}"`,
    `data-layer-width="${formatNumber(item.bounds.width)}"`,
    `data-layer-height="${formatNumber(item.bounds.height)}"`,
    '>',
    markup,
    '</g>',
  ].join(' ');
}

function layerLabel(type: PosterLayoutItem['type']): string {
  switch (type) {
    case 'headline':
      return 'Headline';
    case 'description':
      return 'Description';
    case 'price':
      return 'Price';
    case 'cta':
      return 'CTA';
    case 'product_image':
      return 'Product Image';
    case 'background':
      return 'Background';
    case 'logo':
      return 'Logo';
    case 'discount_badge':
      return 'Decoration';
    case 'footer':
      return 'Subheadline';
    default:
      return 'Layer';
  }
}

function renderLayoutItem(item: PosterLayoutItem, context: SvgBuildContext): string {
  switch (item.type) {
    case 'background':
      return renderBackgroundSvg(item, context);
    case 'product_image':
      return renderImageSvg(item, context);
    case 'headline':
    case 'description':
      return renderTextSvg(item, context);
    case 'price':
      return renderPriceCardSvg(item, context);
    case 'cta':
      return renderCtaButtonSvg(item, context);
    case 'discount_badge':
      return renderDiscountBadgeSvg(item, context);
    case 'logo':
      return renderLogoSvg(item, context);
    case 'footer':
      return renderFooterSvg(item, context);
    default:
      return '';
  }
}

function createSafeAreaClip(context: SvgBuildContext): string {
  const safeAreaBounds = getSafeAreaBounds(context);
  const clipId = context.nextId('safe-area-clip');
  context.defs.push(`<clipPath id="${clipId}"><rect ${rectAttributes(safeAreaBounds)} /></clipPath>`);
  return clipId;
}

function renderSafeAreaGuide(context: SvgBuildContext): string {
  if (!context.options.safeArea) {
    return '';
  }

  const bounds = getSafeAreaBounds(context);
  return `<rect ${rectAttributes(bounds)} fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="10 8" pointer-events="none" />`;
}

function getSafeAreaBounds(context: SvgBuildContext): PosterLayoutItem['bounds'] {
  const { layout, options } = context;
  const safeArea = options.safeArea;

  return {
    x: safeArea?.left ?? 0,
    y: safeArea?.top ?? 0,
    width: Math.max(0, layout.canvas.width - (safeArea?.left ?? 0) - (safeArea?.right ?? 0)),
    height: Math.max(0, layout.canvas.height - (safeArea?.top ?? 0) - (safeArea?.bottom ?? 0)),
    unit: 'px',
  };
}

function nextId(usedIds: Set<string>, prefix: string): string {
  const normalizedPrefix = prefix
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/^-+/, '')
    || 'svg-id';
  let id = normalizedPrefix;
  let index = 1;

  while (usedIds.has(id)) {
    id = `${normalizedPrefix}-${index}`;
    index += 1;
  }

  usedIds.add(id);
  return id;
}
