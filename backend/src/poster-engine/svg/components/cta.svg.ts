import { PosterLayoutItem } from '../../layout';
import { PosterAlignment } from '../../types';
import { SvgBuildContext } from '../SvgBuilder.types';
import { renderTextSvg } from './text.svg';
import {
  escapeXml,
  formatNumber,
  rectAttributes,
  styleAttributes,
} from '../helpers/svgUtils';
import { CtaTreatment } from '../../composition';

export function renderCtaButtonSvg(item: PosterLayoutItem, context: SvgBuildContext): string {
  const shadowId = context.createShadowFilter(item);
  const background = item.boxStyle?.backgroundColor ?? '#111827';
  const palette = item.metadata?.['palette'] as { vibrant?: string; glow?: string; accent?: string } | undefined;
  const treatment = item.metadata?.['ctaTreatment'] as CtaTreatment | undefined ?? 'pill';
  const gradientId = context.nextId(`${item.componentId}-cta-gradient`);
  const sheenId = context.nextId(`${item.componentId}-cta-sheen`);
  context.defs.push(
    `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="${escapeXml(palette?.glow ?? background)}" />` +
      `<stop offset="42%" stop-color="${escapeXml(palette?.accent ?? background)}" />` +
      `<stop offset="100%" stop-color="${escapeXml(palette?.vibrant ?? background)}" />` +
    `</linearGradient>`,
    `<linearGradient id="${sheenId}" x1="0%" y1="0%" x2="100%" y2="0%">` +
      `<stop offset="0%" stop-color="#ffffff" stop-opacity="0" />` +
      `<stop offset="50%" stop-color="#ffffff" stop-opacity="0.18" />` +
      `<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />` +
    `</linearGradient>`
  );
  const borderRadius = item.boxStyle?.borderRadius ?? Math.round(item.bounds.height / 2);
  return CTA_RENDERERS[treatment]({
    item,
    context,
    gradientId,
    sheenId,
    shadowId,
    borderRadius,
  });
}

interface CtaRenderContext {
  item: PosterLayoutItem;
  context: SvgBuildContext;
  gradientId: string;
  sheenId: string;
  shadowId?: string;
  borderRadius: number;
}

type CtaRenderer = (input: CtaRenderContext) => string;

const CTA_RENDERERS: Record<CtaTreatment, CtaRenderer> = {
  'minimal-text': ({ item, context }) => {
    const textItem = textOnlyItem(item, 'left');
    return `<g>${renderTextSvg(textItem, context)}${renderArrow(item, false)}</g>`;
  },
  magazine: ({ item, context }) => renderMagazineCta(item, context),
  'integrated-type': ({ item, context }) => renderIntegratedTypeCta(item, context),
  underline: ({ item, context }) => {
    const textItem = textOnlyItem(item, 'left');
    const y = item.bounds.y + item.bounds.height * 0.80;
    return `<g>${renderTextSvg(textItem, context)}<rect x="${formatNumber(item.bounds.x)}" y="${formatNumber(y)}" width="${formatNumber(item.bounds.width * 0.62)}" height="${formatNumber(Math.max(2, item.bounds.height * 0.035))}" rx="2" fill="${escapeXml(item.text?.style?.color ?? '#ffffff')}" opacity="0.55" />${renderArrow(item, false)}</g>`;
  },
  outline: ({ item, context }) => renderEditorialOutlineCta(item, context),
  glass: ({ item, context, shadowId, sheenId, borderRadius }) => {
    const box = renderBoxCta(item, context, 'rgba(255,255,255,0.11)', shadowId, true, borderRadius);
    const sheen = `<rect x="${formatNumber(item.bounds.x + 3)}" y="${formatNumber(item.bounds.y + 3)}" width="${formatNumber(item.bounds.width - 6)}" height="${formatNumber(item.bounds.height * 0.40)}" rx="${formatNumber(borderRadius)}" fill="url(#${sheenId})" opacity="0.72" />`;
    return box.replace('</g>', `${sheen}</g>`);
  },
  'glass-pill': ({ item, context, shadowId, sheenId, borderRadius }) => {
    const textItem = {
      ...textOnlyItem(item, 'center'),
      bounds: {
        ...item.bounds,
        x: item.bounds.x + item.bounds.height * 0.18,
        width: item.bounds.width - item.bounds.height * 0.70,
      },
    };
    return [
      '<g>',
      `<rect ${rectAttributes(item.bounds)} rx="${formatNumber(borderRadius)}" fill="rgba(255,255,255,0.15)" stroke="#ffffff" stroke-opacity="0.30" stroke-width="1.2"${shadowId ? ` filter="url(#${shadowId})"` : ''} />`,
      `<rect x="${formatNumber(item.bounds.x + item.bounds.height * 0.09)}" y="${formatNumber(item.bounds.y + item.bounds.height * 0.13)}" width="${formatNumber(item.bounds.width - item.bounds.height * 0.18)}" height="${formatNumber(item.bounds.height * 0.33)}" rx="${formatNumber(borderRadius * 0.65)}" fill="url(#${sheenId})" opacity="0.78" />`,
      `<circle cx="${formatNumber(item.bounds.x + item.bounds.width - item.bounds.height * 0.39)}" cy="${formatNumber(item.bounds.y + item.bounds.height / 2)}" r="${formatNumber(item.bounds.height * 0.27)}" fill="#ffffff" fill-opacity="0.14" />`,
      renderTextSvg(textItem, context),
      renderArrow(item, true),
      '</g>',
    ].join('');
  },
  ribbon: ({ item, context, gradientId, shadowId }) => {
    const notch = item.bounds.height * 0.22;
    const path = `M ${formatNumber(item.bounds.x)} ${formatNumber(item.bounds.y)} H ${formatNumber(item.bounds.x + item.bounds.width - notch)} L ${formatNumber(item.bounds.x + item.bounds.width)} ${formatNumber(item.bounds.y + item.bounds.height / 2)} L ${formatNumber(item.bounds.x + item.bounds.width - notch)} ${formatNumber(item.bounds.y + item.bounds.height)} H ${formatNumber(item.bounds.x)} Z`;
    const textItem = textOnlyItem(item, 'center');
    return `<g${shadowId ? ` filter="url(#${shadowId})"` : ''}><path d="${path}" fill="url(#${gradientId})" />${renderTextSvg(textItem, context)}</g>`;
  },
  floating: ({ item, context, gradientId, shadowId, sheenId, borderRadius }) =>
    renderPremiumPill(item, context, gradientId, sheenId, shadowId, borderRadius, true),
  pill: ({ item, context, gradientId, shadowId, sheenId, borderRadius }) =>
    renderPremiumPill(item, context, gradientId, sheenId, shadowId, borderRadius, false),
  solid: ({ item, context, gradientId, shadowId }) =>
    renderSolidArtworkCta(item, context, gradientId, shadowId),
};

function renderPremiumPill(
  item: PosterLayoutItem,
  context: SvgBuildContext,
  gradientId: string,
  sheenId: string,
  shadowId: string | undefined,
  borderRadius: number,
  elevated: boolean
): string {
  const textItem = {
    ...textOnlyItem(item, 'center'),
    bounds: { ...item.bounds, width: item.bounds.width - item.bounds.height * 0.48 },
  };
  const attributes = [
    rectAttributes(item.bounds),
    `fill="url(#${gradientId})"`,
    styleAttributes({ ...item.boxStyle, borderRadius }),
    shadowId ? `filter="url(#${shadowId})"` : '',
  ].filter(Boolean).join(' ');
  const sheen = `<rect x="${formatNumber(item.bounds.x + 3)}" y="${formatNumber(item.bounds.y + 3)}" width="${formatNumber(item.bounds.width - 6)}" height="${formatNumber(item.bounds.height * 0.40)}" rx="${formatNumber(borderRadius)}" fill="url(#${sheenId})" opacity="${elevated ? '0.88' : '0.62'}" />`;
  return `<g><rect ${attributes} />${sheen}${renderTextSvg(textItem, context)}${renderArrow(item, true)}</g>`;
}

function renderBoxCta(
  item: PosterLayoutItem,
  context: SvgBuildContext,
  fill: string,
  shadowId: string | undefined,
  includeArrow: boolean,
  radius: number
): string {
  const attributes = [
    rectAttributes(item.bounds),
    `fill="${fill}"`,
    styleAttributes({ ...item.boxStyle, borderRadius: radius }),
    shadowId ? `filter="url(#${shadowId})"` : '',
  ].filter(Boolean).join(' ');
  return `<g><rect ${attributes} />${renderTextSvg(textOnlyItem(item, 'center'), context)}${includeArrow ? renderArrow(item, true) : ''}</g>`;
}

function renderEditorialOutlineCta(
  item: PosterLayoutItem,
  context: SvgBuildContext
): string {
  const x = item.bounds.x;
  const y = item.bounds.y;
  const width = item.bounds.width;
  const height = item.bounds.height;
  const corner = Math.min(height * 0.22, 18);
  const textItem = {
    ...textOnlyItem(item, 'left'),
    bounds: {
      ...item.bounds,
      x: x + corner * 0.9,
      width: width - height * 0.72,
    },
  };
  const color = escapeXml(item.text?.style?.color ?? '#ffffff');

  return [
    '<g>',
    `<path d="M ${formatNumber(x)} ${formatNumber(y + corner)} V ${formatNumber(y)} H ${formatNumber(x + width * 0.38)} M ${formatNumber(x + width * 0.62)} ${formatNumber(y)} H ${formatNumber(x + width)} V ${formatNumber(y + corner)} M ${formatNumber(x)} ${formatNumber(y + height - corner)} V ${formatNumber(y + height)} H ${formatNumber(x + width * 0.28)} M ${formatNumber(x + width * 0.72)} ${formatNumber(y + height)} H ${formatNumber(x + width)} V ${formatNumber(y + height - corner)}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.72" />`,
    renderTextSvg(textItem, context),
    renderArrow(item, false),
    '</g>',
  ].join('');
}

function renderMagazineCta(
  item: PosterLayoutItem,
  context: SvgBuildContext
): string {
  const x = item.bounds.x;
  const y = item.bounds.y;
  const width = item.bounds.width;
  const height = item.bounds.height;
  const color = escapeXml(item.text?.style?.color ?? '#ffffff');
  const textItem = {
    ...textOnlyItem(item, 'left'),
    bounds: {
      ...item.bounds,
      x: x + height * 0.22,
      width: width - height * 0.60,
    },
  };

  return [
    '<g>',
    `<text x="${formatNumber(x)}" y="${formatNumber(y + height * 0.21)}" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(6, height * 0.14))}" font-weight="700" letter-spacing="2.2" fill="${color}" fill-opacity="0.58">EDITOR'S PICK</text>`,
    `<path d="M ${formatNumber(x)} ${formatNumber(y + height * 0.46)} H ${formatNumber(x + width * 0.14)}" stroke="${color}" stroke-width="1.4" stroke-opacity="0.62" />`,
    renderTextSvg(textItem, context),
    renderArrow(item, false),
    '</g>',
  ].join('');
}

function renderIntegratedTypeCta(
  item: PosterLayoutItem,
  context: SvgBuildContext
): string {
  const x = item.bounds.x;
  const y = item.bounds.y;
  const width = item.bounds.width;
  const height = item.bounds.height;
  const color = escapeXml(item.text?.style?.color ?? '#ffffff');
  const textItem = {
    ...textOnlyItem(item, 'left'),
    bounds: {
      ...item.bounds,
      x: x + height * 0.18,
      width: width - height * 0.42,
    },
  };

  return [
    '<g>',
    `<circle cx="${formatNumber(x + height * 0.055)}" cy="${formatNumber(y + height * 0.50)}" r="${formatNumber(Math.max(2, height * 0.045))}" fill="${color}" opacity="0.74" />`,
    `<path d="M ${formatNumber(x + height * 0.18)} ${formatNumber(y + height * 0.83)} H ${formatNumber(x + width * 0.82)}" stroke="${color}" stroke-width="${formatNumber(Math.max(2, height * 0.04))}" stroke-linecap="round" stroke-opacity="0.30" />`,
    renderTextSvg(textItem, context),
    '</g>',
  ].join('');
}

function renderSolidArtworkCta(
  item: PosterLayoutItem,
  context: SvgBuildContext,
  gradientId: string,
  shadowId: string | undefined
): string {
  const x = item.bounds.x;
  const y = item.bounds.y;
  const width = item.bounds.width;
  const height = item.bounds.height;
  const cut = Math.min(height * 0.28, width * 0.12);
  const path = [
    `M ${formatNumber(x + cut)} ${formatNumber(y)}`,
    `H ${formatNumber(x + width)}`,
    `V ${formatNumber(y + height - cut)}`,
    `L ${formatNumber(x + width - cut)} ${formatNumber(y + height)}`,
    `H ${formatNumber(x)}`,
    `V ${formatNumber(y + cut)}`,
    'Z',
  ].join(' ');
  const textItem = {
    ...textOnlyItem(item, 'center'),
    bounds: {
      ...item.bounds,
      width: width - height * 0.34,
    },
  };

  return [
    `<g${shadowId ? ` filter="url(#${shadowId})"` : ''}>`,
    `<path d="${path}" fill="url(#${gradientId})" />`,
    `<path d="M ${formatNumber(x + cut * 0.65)} ${formatNumber(y + height * 0.18)} H ${formatNumber(x + width * 0.72)}" stroke="#ffffff" stroke-opacity="0.30" stroke-width="1.5" />`,
    renderTextSvg(textItem, context),
    renderArrow(item, false),
    '</g>',
  ].join('');
}

function textOnlyItem(
  item: PosterLayoutItem,
  horizontal: PosterAlignment['horizontal']
): PosterLayoutItem {
  return {
    ...item,
    alignment: { horizontal, vertical: 'middle' },
  };
}

function renderArrow(item: PosterLayoutItem, circle: boolean): string {
  const radius = Math.min(item.bounds.height * 0.25, 19);
  const cx = item.bounds.x + item.bounds.width - item.bounds.height * 0.42;
  const cy = item.bounds.y + item.bounds.height / 2;
  return [
    circle
      ? `<circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(radius)}" fill="#ffffff" fill-opacity="0.17" />`
      : '',
    `<path d="M ${formatNumber(cx - radius * 0.35)} ${formatNumber(cy)} H ${formatNumber(cx + radius * 0.28)} M ${formatNumber(cx + radius * 0.04)} ${formatNumber(cy - radius * 0.23)} L ${formatNumber(cx + radius * 0.34)} ${formatNumber(cy)} L ${formatNumber(cx + radius * 0.04)} ${formatNumber(cy + radius * 0.23)}" stroke="#ffffff" stroke-width="${formatNumber(Math.max(2, radius * 0.13))}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`,
  ].join('');
}
