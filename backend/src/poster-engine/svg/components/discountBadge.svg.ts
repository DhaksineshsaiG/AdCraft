import { BadgeTreatment } from '../../composition';
import { PosterLayoutItem } from '../../layout';
import { PosterAlignment, PosterColorPalette } from '../../types';
import { SvgBuildContext } from '../SvgBuilder.types';
import { renderTextSvg } from './text.svg';
import {
  escapeXml,
  formatNumber,
  rectAttributes,
} from '../helpers/svgUtils';

const DEFAULT_BADGE_ALIGNMENT: PosterAlignment = {
  horizontal: 'center',
  vertical: 'middle',
};

export function renderDiscountBadgeSvg(
  item: PosterLayoutItem,
  context: SvgBuildContext
): string {
  const discountPercent = Number(item.metadata?.['discountPercent']);
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return '';

  const treatment =
    item.metadata?.['badgeTreatment'] as BadgeTreatment | undefined ??
    'modern-chip';
  const palette = item.metadata?.['palette'] as PosterColorPalette;
  const shadowId = context.createShadowFilter(item);

  return BADGE_RENDERERS[treatment](item, context, palette, shadowId, discountPercent);
}

type BadgeRenderer = (
  item: PosterLayoutItem,
  context: SvgBuildContext,
  palette: PosterColorPalette,
  shadowId: string | undefined,
  discountPercent: number
) => string;

const BADGE_RENDERERS: Record<BadgeTreatment, BadgeRenderer> = {
  'modern-chip': (item, context, palette, shadowId, discount) => {
    const textItem = badgeTextItem(item, `${discount}% OFF`, 0.88);
    return [
      `<g${filterAttribute(shadowId)}>`,
      `<rect ${rectAttributes(item.bounds)} rx="${formatNumber(item.bounds.height / 2)}" fill="${escapeXml(palette.backgroundAlt)}" fill-opacity="0.92" stroke="#ffffff" stroke-opacity="0.36" stroke-width="1.5" />`,
      `<circle cx="${formatNumber(item.bounds.x + item.bounds.height * 0.32)}" cy="${formatNumber(item.bounds.y + item.bounds.height / 2)}" r="${formatNumber(item.bounds.height * 0.08)}" fill="${escapeXml(palette.accent)}" />`,
      renderTextSvg(textItem, context),
      '</g>',
    ].join('');
  },
  'premium-label': (item, _context, palette, shadowId, discount) => {
    const x = item.bounds.x;
    const y = item.bounds.y;
    const width = item.bounds.width;
    const height = item.bounds.height;
    return [
      `<g${filterAttribute(shadowId)}>`,
      `<rect ${rectAttributes(item.bounds)} rx="${formatNumber(height * 0.18)}" fill="${escapeXml(palette.accent)}" />`,
      `<path d="M ${formatNumber(x + width * 0.10)} ${formatNumber(y + height * 0.30)} H ${formatNumber(x + width * 0.90)}" stroke="#ffffff" stroke-opacity="0.44" stroke-width="1" />`,
      `<text x="${formatNumber(x + width / 2)}" y="${formatNumber(y + height * 0.24)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(8, height * 0.15))}" font-weight="600" letter-spacing="1.2" fill="#ffffff" fill-opacity="0.88">SPECIAL PRICE</text>`,
      `<text x="${formatNumber(x + width / 2)}" y="${formatNumber(y + height * 0.66)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(15, height * 0.34))}" font-weight="800" fill="#ffffff">${discount}% OFF</text>`,
      '</g>',
    ].join('');
  },
  'luxury-tag': (item, _context, palette, shadowId, discount) => {
    const x = item.bounds.x;
    const y = item.bounds.y;
    const width = item.bounds.width;
    const height = item.bounds.height;
    const notch = height * 0.20;
    const path = `M ${formatNumber(x + notch)} ${formatNumber(y)} H ${formatNumber(x + width)} V ${formatNumber(y + height)} H ${formatNumber(x + notch)} L ${formatNumber(x)} ${formatNumber(y + height / 2)} Z`;
    return [
      `<g${filterAttribute(shadowId)}>`,
      `<path d="${path}" fill="${escapeXml(palette.backgroundAlt)}" fill-opacity="0.94" stroke="${escapeXml(palette.accent)}" stroke-width="1.5" />`,
      `<circle cx="${formatNumber(x + notch * 0.72)}" cy="${formatNumber(y + height / 2)}" r="${formatNumber(Math.max(2, height * 0.045))}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="1.5" />`,
      `<text x="${formatNumber(x + width * 0.59)}" y="${formatNumber(y + height * 0.42)}" text-anchor="middle" dominant-baseline="middle" font-family="Baskerville, Georgia, serif" font-size="${formatNumber(Math.max(13, height * 0.25))}" font-weight="600" fill="#ffffff">${discount}% OFF</text>`,
      `<text x="${formatNumber(x + width * 0.59)}" y="${formatNumber(y + height * 0.70)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(7, height * 0.12))}" letter-spacing="1.4" fill="${escapeXml(palette.accent)}">PRIVATE OFFER</text>`,
      '</g>',
    ].join('');
  },
  'editorial-sticker': (item, _context, palette, shadowId, discount) => {
    const cx = item.bounds.x + item.bounds.width / 2;
    const cy = item.bounds.y + item.bounds.height / 2;
    const radius = Math.min(item.bounds.width, item.bounds.height) * 0.49;
    return [
      `<g${filterAttribute(shadowId)} transform="rotate(-7 ${formatNumber(cx)} ${formatNumber(cy)})">`,
      `<circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(radius)}" fill="${escapeXml(palette.accent)}" />`,
      `<circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(radius * 0.82)}" fill="none" stroke="#ffffff" stroke-opacity="0.52" stroke-width="1.5" stroke-dasharray="3 4" />`,
      `<text x="${formatNumber(cx)}" y="${formatNumber(cy - radius * 0.14)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(13, radius * 0.42))}" font-weight="800" fill="#ffffff">${discount}%</text>`,
      `<text x="${formatNumber(cx)}" y="${formatNumber(cy + radius * 0.28)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(8, radius * 0.21))}" font-weight="700" letter-spacing="1" fill="#ffffff">OFF</text>`,
      '</g>',
    ].join('');
  },
  'corner-ribbon': (item, _context, palette, shadowId, discount) => {
    const x = item.bounds.x;
    const y = item.bounds.y;
    const width = item.bounds.width;
    const height = item.bounds.height;
    const slant = width * 0.13;
    const path = `M ${formatNumber(x + slant)} ${formatNumber(y)} H ${formatNumber(x + width)} L ${formatNumber(x + width - slant)} ${formatNumber(y + height)} H ${formatNumber(x)} Z`;
    return [
      `<g${filterAttribute(shadowId)}>`,
      `<path d="${path}" fill="${escapeXml(palette.accent)}" />`,
      `<path d="M ${formatNumber(x + width * 0.14)} ${formatNumber(y + height * 0.76)} L ${formatNumber(x + width * 0.84)} ${formatNumber(y + height * 0.24)}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="${formatNumber(Math.max(2, height * 0.08))}" />`,
      `<text x="${formatNumber(x + width / 2)}" y="${formatNumber(y + height / 2)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(13, height * 0.27))}" font-weight="800" fill="#ffffff">${discount}% OFF</text>`,
      '</g>',
    ].join('');
  },
};

function badgeTextItem(
  item: PosterLayoutItem,
  text: string,
  fontScale: number
): PosterLayoutItem {
  if (!item.text) return item;
  return {
    ...item,
    alignment: item.alignment ?? DEFAULT_BADGE_ALIGNMENT,
    bounds: {
      ...item.bounds,
      x: item.bounds.x + item.bounds.height * 0.15,
      width: item.bounds.width - item.bounds.height * 0.18,
    },
    text: {
      ...item.text,
      text,
      lines: [text],
      fontSize: item.text.fontSize * fontScale,
      style: {
        ...item.text.style,
        fontWeight: 'bold',
        color: '#ffffff',
      },
    },
  };
}

function filterAttribute(shadowId: string | undefined): string {
  return shadowId ? ` filter="url(#${shadowId})"` : '';
}
