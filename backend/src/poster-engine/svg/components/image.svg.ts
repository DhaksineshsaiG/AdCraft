import { PosterLayoutItem } from '../../layout';
import { SvgBuildContext } from '../SvgBuilder.types';
import {
  escapeXml,
  formatNumber,
  rectAttributes,
} from '../helpers/svgUtils';
import { ProductShadowTreatment, ProductTreatment } from '../../composition';

export function renderImageSvg(item: PosterLayoutItem, context: SvgBuildContext): string {
  const imageLayout = item.image;
  const palette = item.metadata?.['palette'] as { glow?: string; accent?: string; surface?: string } | undefined;
  const theme = item.metadata?.['theme'] as string | undefined;
  const treatment = item.metadata?.['productTreatment'] as ProductTreatment | undefined ?? 'centered';
  const glowStrength = Number(item.metadata?.['productGlow'] ?? 0.5);
  const shadowTreatment =
    item.metadata?.['productShadow'] as ProductShadowTreatment | undefined ??
    'soft';

  if (!imageLayout?.image?.url) {
    return renderImagePlaceholder(item, context.createClipPath(item));
  }

  const rendered = imageLayout.renderedBounds;
  const glowId = context.nextId(`${item.componentId}-glow`);
  const featherId = context.nextId(`${item.componentId}-feather`);
  const featherMaskId = context.nextId(`${item.componentId}-feather-mask`);
  const imageShadowId = context.nextId(`${item.componentId}-hero-shadow`);
  const rimLightId = context.nextId(`${item.componentId}-rim-light`);
  const shadow = PRODUCT_SHADOWS[shadowTreatment];
  const rimOpacity =
    theme === 'fragrance' || theme === 'tech'
      ? 0.22
      : theme === 'sports'
        ? 0.16
        : 0.10;
  context.defs.push(
    `<radialGradient id="${glowId}" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${escapeXml(palette?.glow ?? '#ffffff')}" stop-opacity="${formatNumber(Math.min(0.68, 0.08 + glowStrength * 0.52))}" />` +
      `<stop offset="58%" stop-color="${escapeXml(palette?.accent ?? '#8aa4ff')}" stop-opacity="${formatNumber(0.025 + glowStrength * 0.16)}" />` +
      `<stop offset="100%" stop-color="${escapeXml(palette?.accent ?? '#8aa4ff')}" stop-opacity="0" />` +
    `</radialGradient>`,
    `<radialGradient id="${featherId}" cx="50%" cy="${theme === 'sports' ? '48%' : '45%'}" r="${theme === 'sports' ? '72%' : '68%'}">` +
      `<stop offset="0%" stop-color="#ffffff" />` +
      `<stop offset="70%" stop-color="#ffffff" />` +
      `<stop offset="91%" stop-color="#ffffff" stop-opacity="0.78" />` +
      `<stop offset="100%" stop-color="#000000" stop-opacity="0" />` +
    `</radialGradient>`,
    `<mask id="${featherMaskId}" maskUnits="userSpaceOnUse" x="${formatNumber(item.bounds.x - item.bounds.width * 0.08)}" y="${formatNumber(item.bounds.y - item.bounds.height * 0.08)}" width="${formatNumber(item.bounds.width * 1.16)}" height="${formatNumber(item.bounds.height * 1.16)}">` +
      `<rect x="${formatNumber(item.bounds.x - item.bounds.width * 0.08)}" y="${formatNumber(item.bounds.y - item.bounds.height * 0.08)}" width="${formatNumber(item.bounds.width * 1.16)}" height="${formatNumber(item.bounds.height * 1.16)}" fill="url(#${featherId})" />` +
    `</mask>`,
    `<filter id="${imageShadowId}" x="-55%" y="-55%" width="210%" height="230%">` +
      (shadow
        ? `<feDropShadow dx="${shadow.dx}" dy="${shadow.dy}" stdDeviation="${shadow.blur}" flood-color="#000000" flood-opacity="${shadow.opacity}" />`
        : '') +
    `</filter>`,
    `<filter id="${rimLightId}" x="-30%" y="-30%" width="160%" height="160%">` +
      `<feDropShadow dx="-3" dy="-2" stdDeviation="3.2" flood-color="#ffffff" flood-opacity="${formatNumber(rimOpacity)}" />` +
      `<feDropShadow dx="4" dy="1" stdDeviation="4.5" flood-color="${escapeXml(palette?.accent ?? '#8aa4ff')}" flood-opacity="${formatNumber(rimOpacity * 0.72)}" />` +
    `</filter>`
  );
  const preserveAspectRatio = imageLayout.style?.objectFit === 'cover'
    ? 'xMidYMid slice'
    : imageLayout.style?.objectFit === 'fill'
      ? 'none'
      : 'xMidYMid meet';

  const image = [
    `<image href="${escapeXml(imageLayout.image.url)}"`,
    `x="${formatNumber(rendered.x)}"`,
    `y="${formatNumber(rendered.y)}"`,
    `width="${formatNumber(rendered.width)}"`,
    `height="${formatNumber(rendered.height)}"`,
    `preserveAspectRatio="${preserveAspectRatio}"`,
    `mask="url(#${featherMaskId})"`,
    imageLayout.image.altText ? `aria-label="${escapeXml(imageLayout.image.altText)}"` : '',
    '/>',
  ].filter(Boolean).join(' ');

  const centerX = item.bounds.x + item.bounds.width / 2;
  const centerY = item.bounds.y + item.bounds.height / 2;
  const rotation = Number(item.metadata?.['productRotation'] ?? 0);
  const glow = `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(item.bounds.y + item.bounds.height * 0.50)}" rx="${formatNumber(item.bounds.width * 0.62)}" ry="${formatNumber(item.bounds.height * 0.55)}" fill="url(#${glowId})" />`;
  const groundShadow = renderGroundShadow(item, treatment, theme);
  const atmosphere = renderProductAtmosphere(
    item,
    treatment,
    theme,
    palette?.accent ?? '#8aa4ff'
  );
  const surfaceReflection = renderSurfaceReflection(
    item,
    treatment,
    theme,
    palette?.glow ?? '#ffffff',
    palette?.accent ?? '#8aa4ff'
  );
  const transform = rotation === 0
    ? ''
    : ` transform="rotate(${formatNumber(rotation)} ${formatNumber(centerX)} ${formatNumber(centerY)})"`;
  const reflection = treatment === 'reflection'
    ? `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(rendered.y + rendered.height * 1.02)}" rx="${formatNumber(rendered.width * 0.30)}" ry="${formatNumber(Math.max(4, rendered.height * 0.025))}" fill="${escapeXml(palette?.glow ?? '#ffffff')}" opacity="0.09" />`
    : '';

  return `${atmosphere}${glow}${surfaceReflection}${groundShadow}<g filter="url(#${imageShadowId})"${transform}><g filter="url(#${rimLightId})">${image}</g></g>${reflection}`;
}

const PRODUCT_SHADOWS: Readonly<
  Record<
    ProductShadowTreatment,
    { dx: number; dy: number; blur: number; opacity: number } | undefined
  >
> = {
  none: undefined,
  soft: { dx: 0, dy: 18, blur: 18, opacity: 0.30 },
  grounded: { dx: 0, dy: 28, blur: 22, opacity: 0.38 },
  dramatic: { dx: 8, dy: 34, blur: 28, opacity: 0.48 },
};

function renderProductAtmosphere(
  item: PosterLayoutItem,
  treatment: ProductTreatment,
  theme: string | undefined,
  accent: string
): string {
  const x = item.bounds.x;
  const y = item.bounds.y;
  const width = item.bounds.width;
  const height = item.bounds.height;

  const treatmentMarkup = PRODUCT_ATMOSPHERES[treatment]?.(item, accent) ?? '';

  if (theme === 'sports') {
    return [
      treatmentMarkup,
      `<path d="M ${formatNumber(x - width * 0.12)} ${formatNumber(y + height * 0.70)} L ${formatNumber(x + width * 0.76)} ${formatNumber(y + height * 0.24)}" stroke="${escapeXml(accent)}" stroke-width="${formatNumber(Math.max(8, width * 0.025))}" stroke-linecap="round" opacity="0.24" />`,
      `<path d="M ${formatNumber(x - width * 0.05)} ${formatNumber(y + height * 0.82)} L ${formatNumber(x + width * 0.84)} ${formatNumber(y + height * 0.40)}" stroke="#ffffff" stroke-width="${formatNumber(Math.max(2, width * 0.007))}" stroke-linecap="round" opacity="0.18" />`,
      `<path d="M ${formatNumber(x + width * 0.06)} ${formatNumber(y + height * 0.90)} L ${formatNumber(x + width * 0.92)} ${formatNumber(y + height * 0.54)}" stroke="${escapeXml(accent)}" stroke-width="${formatNumber(Math.max(3, width * 0.01))}" stroke-linecap="round" opacity="0.15" />`,
    ].join('');
  }

  if (theme === 'fragrance' || theme === 'luxury') {
    return [
      treatmentMarkup,
      `<ellipse cx="${formatNumber(x + width * 0.50)}" cy="${formatNumber(y + height * 0.91)}" rx="${formatNumber(width * 0.38)}" ry="${formatNumber(height * 0.10)}" fill="${escapeXml(accent)}" opacity="0.13" />`,
      `<path d="M ${formatNumber(x + width * 0.18)} ${formatNumber(y + height * 0.12)} Q ${formatNumber(x + width * 0.50)} ${formatNumber(y - height * 0.04)} ${formatNumber(x + width * 0.82)} ${formatNumber(y + height * 0.12)}" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.20" />`,
    ].join('');
  }

  if (theme === 'coffee') {
    return [
      treatmentMarkup,
      `<path d="M ${formatNumber(x + width * 0.45)} ${formatNumber(y + height * 0.21)} C ${formatNumber(x + width * 0.34)} ${formatNumber(y + height * 0.06)}, ${formatNumber(x + width * 0.62)} ${formatNumber(y + height * 0.02)}, ${formatNumber(x + width * 0.52)} ${formatNumber(y - height * 0.12)}" stroke="#ffffff" stroke-width="${formatNumber(Math.max(3, width * 0.009))}" stroke-linecap="round" fill="none" opacity="0.20" />`,
      `<path d="M ${formatNumber(x + width * 0.58)} ${formatNumber(y + height * 0.22)} C ${formatNumber(x + width * 0.48)} ${formatNumber(y + height * 0.07)}, ${formatNumber(x + width * 0.70)} ${formatNumber(y + height * 0.02)}, ${formatNumber(x + width * 0.62)} ${formatNumber(y - height * 0.10)}" stroke="#ffffff" stroke-width="${formatNumber(Math.max(2, width * 0.006))}" stroke-linecap="round" fill="none" opacity="0.14" />`,
    ].join('');
  }

  return treatmentMarkup;
}

type ProductAtmosphereRenderer = (item: PosterLayoutItem, accent: string) => string;

const PRODUCT_ATMOSPHERES: Partial<Record<ProductTreatment, ProductAtmosphereRenderer>> = {
  floating: (item, accent) => {
    const { x, y, width, height } = item.bounds;
    return `<ellipse cx="${formatNumber(x + width * 0.50)}" cy="${formatNumber(y + height * 0.46)}" rx="${formatNumber(width * 0.47)}" ry="${formatNumber(height * 0.38)}" fill="none" stroke="${escapeXml(accent)}" stroke-width="${formatNumber(Math.max(2, width * 0.008))}" stroke-opacity="0.12" />`;
  },
  diagonal: (item, accent) => {
    const { x, y, width, height } = item.bounds;
    return `<path d="M ${formatNumber(x - width * 0.10)} ${formatNumber(y + height * 0.84)} L ${formatNumber(x + width * 1.05)} ${formatNumber(y + height * 0.18)}" stroke="${escapeXml(accent)}" stroke-width="${formatNumber(Math.max(7, width * 0.026))}" stroke-linecap="round" opacity="0.13" />`;
  },
  macro: (item, accent) => {
    const { x, y, width, height } = item.bounds;
    return `<circle cx="${formatNumber(x + width * 0.58)}" cy="${formatNumber(y + height * 0.42)}" r="${formatNumber(width * 0.43)}" fill="${escapeXml(accent)}" opacity="0.055" />`;
  },
  'edge-crop': (item, accent) => {
    const { x, y, width, height } = item.bounds;
    return `<rect x="${formatNumber(x + width * 0.72)}" y="${formatNumber(y + height * 0.04)}" width="${formatNumber(width * 0.04)}" height="${formatNumber(height * 0.80)}" rx="${formatNumber(width * 0.02)}" fill="${escapeXml(accent)}" opacity="0.15" />`;
  },
  editorial: (item, accent) => {
    const { x, y, width, height } = item.bounds;
    return `<rect x="${formatNumber(x + width * 0.14)}" y="${formatNumber(y + height * 0.08)}" width="${formatNumber(width * 0.72)}" height="${formatNumber(height * 0.75)}" fill="none" stroke="${escapeXml(accent)}" stroke-width="1.5" stroke-opacity="0.14" />`;
  },
  reflection: (item, accent) => {
    const { x, y, width, height } = item.bounds;
    return `<ellipse cx="${formatNumber(x + width * 0.50)}" cy="${formatNumber(y + height * 0.90)}" rx="${formatNumber(width * 0.36)}" ry="${formatNumber(height * 0.07)}" fill="${escapeXml(accent)}" opacity="0.10" />`;
  },
};

function renderGroundShadow(
  item: PosterLayoutItem,
  treatment: ProductTreatment,
  theme: string | undefined
): string {
  if (treatment === 'macro' || treatment === 'edge-crop' || treatment === 'editorial') {
    return '';
  }

  const centerX = item.bounds.x + item.bounds.width / 2;
  const raised = treatment === 'floating' || treatment === 'diagonal';
  return `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(item.bounds.y + item.bounds.height * (raised ? 0.94 : 0.91))}" rx="${formatNumber(item.bounds.width * (raised ? 0.25 : 0.32))}" ry="${formatNumber(item.bounds.height * (raised ? 0.032 : 0.052))}" fill="#000000" opacity="${theme === 'minimal' || theme === 'interior' ? '0.12' : raised ? '0.20' : '0.27'}" />`;
}

function renderSurfaceReflection(
  item: PosterLayoutItem,
  treatment: ProductTreatment,
  theme: string | undefined,
  glow: string,
  accent: string
): string {
  const { x, y, width, height } = item.bounds;
  const centerX = x + width / 2;
  const floorY = y + height * 0.90;
  const isCropped = treatment === 'macro' || treatment === 'edge-crop';
  if (isCropped) return '';

  if (theme === 'tech') {
    return [
      `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(floorY)}" rx="${formatNumber(width * 0.34)}" ry="${formatNumber(height * 0.045)}" fill="${escapeXml(glow)}" opacity="0.12" />`,
      `<path d="M ${formatNumber(x + width * 0.24)} ${formatNumber(floorY - height * 0.015)} H ${formatNumber(x + width * 0.76)}" stroke="#ffffff" stroke-width="${formatNumber(Math.max(2, width * 0.006))}" stroke-linecap="round" opacity="0.24" />`,
      `<path d="M ${formatNumber(x + width * 0.32)} ${formatNumber(y + height * 0.16)} L ${formatNumber(x + width * 0.83)} ${formatNumber(y + height * 0.06)}" stroke="#ffffff" stroke-width="${formatNumber(Math.max(1.2, width * 0.004))}" stroke-linecap="round" opacity="0.22" />`,
    ].join('');
  }

  if (theme === 'coffee') {
    return [
      `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(floorY)}" rx="${formatNumber(width * 0.35)}" ry="${formatNumber(height * 0.055)}" fill="#2A160D" opacity="0.24" />`,
      `<ellipse cx="${formatNumber(centerX - width * 0.03)}" cy="${formatNumber(floorY - height * 0.015)}" rx="${formatNumber(width * 0.28)}" ry="${formatNumber(height * 0.030)}" fill="${escapeXml(glow)}" opacity="0.11" />`,
      `<path d="M ${formatNumber(x + width * 0.22)} ${formatNumber(y + height * 0.28)} C ${formatNumber(x + width * 0.30)} ${formatNumber(y + height * 0.12)}, ${formatNumber(x + width * 0.58)} ${formatNumber(y + height * 0.10)}, ${formatNumber(x + width * 0.70)} ${formatNumber(y + height * 0.24)}" stroke="${escapeXml(glow)}" stroke-width="${formatNumber(Math.max(2, width * 0.006))}" stroke-linecap="round" fill="none" opacity="0.14" />`,
    ].join('');
  }

  if (theme === 'fragrance' || theme === 'luxury') {
    return [
      `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(floorY)}" rx="${formatNumber(width * 0.32)}" ry="${formatNumber(height * 0.045)}" fill="${escapeXml(accent)}" opacity="0.13" />`,
      `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(floorY - height * 0.018)}" rx="${formatNumber(width * 0.24)}" ry="${formatNumber(height * 0.022)}" fill="#ffffff" opacity="0.10" />`,
      `<path d="M ${formatNumber(x + width * 0.20)} ${formatNumber(y + height * 0.15)} C ${formatNumber(x + width * 0.42)} ${formatNumber(y - height * 0.02)}, ${formatNumber(x + width * 0.62)} ${formatNumber(y - height * 0.02)}, ${formatNumber(x + width * 0.84)} ${formatNumber(y + height * 0.15)}" stroke="#ffffff" stroke-width="1.3" fill="none" opacity="0.18" />`,
    ].join('');
  }

  if (theme === 'sports') {
    return [
      `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(floorY)}" rx="${formatNumber(width * 0.30)}" ry="${formatNumber(height * 0.045)}" fill="#000000" opacity="0.22" />`,
      `<path d="M ${formatNumber(x + width * 0.08)} ${formatNumber(floorY)} L ${formatNumber(x + width * 0.76)} ${formatNumber(floorY - height * 0.14)}" stroke="${escapeXml(accent)}" stroke-width="${formatNumber(Math.max(3, width * 0.010))}" stroke-linecap="round" opacity="0.18" />`,
    ].join('');
  }

  return `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(floorY)}" rx="${formatNumber(width * 0.28)}" ry="${formatNumber(height * 0.040)}" fill="#000000" opacity="0.16" />`;
}

function renderImagePlaceholder(item: PosterLayoutItem, clipId: string): string {
  const label = item.type === 'logo' ? 'Logo' : 'Image';
  const centerX = item.bounds.x + item.bounds.width / 2;
  const centerY = item.bounds.y + item.bounds.height / 2;

  return [
    `<g clip-path="url(#${clipId})">`,
    `<rect ${rectAttributes(item.bounds)} fill="#f3f4f6" stroke="#d1d5db" stroke-dasharray="8 8" />`,
    `<line x1="${formatNumber(item.bounds.x)}" y1="${formatNumber(item.bounds.y)}" x2="${formatNumber(item.bounds.x + item.bounds.width)}" y2="${formatNumber(item.bounds.y + item.bounds.height)}" stroke="#d1d5db" />`,
    `<line x1="${formatNumber(item.bounds.x + item.bounds.width)}" y1="${formatNumber(item.bounds.y)}" x2="${formatNumber(item.bounds.x)}" y2="${formatNumber(item.bounds.y + item.bounds.height)}" stroke="#d1d5db" />`,
    `<text x="${formatNumber(centerX)}" y="${formatNumber(centerY)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">${escapeXml(label)}</text>`,
    '</g>',
  ].join('');
}
