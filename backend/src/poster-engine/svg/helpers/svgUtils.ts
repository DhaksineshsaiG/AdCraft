import { CalculatedBounds, PosterLayoutItem } from '../../layout';
import { BackgroundStyle, BoxStyle, FontWeight, TextStyle } from '../../types';
import { SvgShadow } from '../SvgBuilder.types';

export interface SvgGradient {
  type: 'linear' | 'radial';
  colors: string[];
  angle?: number;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return Number(value.toFixed(3)).toString();
}

export function rectAttributes(bounds: CalculatedBounds): string {
  return `x="${formatNumber(bounds.x)}" y="${formatNumber(bounds.y)}" width="${formatNumber(bounds.width)}" height="${formatNumber(bounds.height)}"`;
}

export function styleAttributes(style: BoxStyle | undefined): string {
  if (!style) {
    return '';
  }

  const attributes: string[] = [];

  if (style.opacity !== undefined) {
    attributes.push(`opacity="${formatNumber(style.opacity)}"`);
  }

  if (style.borderColor) {
    attributes.push(`stroke="${escapeXml(style.borderColor)}"`);
  }

  if (style.borderWidth !== undefined) {
    attributes.push(`stroke-width="${formatNumber(style.borderWidth)}"`);
  }

  if (style.borderRadius !== undefined) {
    const radius = formatNumber(style.borderRadius);
    attributes.push(`rx="${radius}" ry="${radius}"`);
  }

  return attributes.join(' ');
}

export function textStyleAttributes(style: TextStyle | undefined, fontSize: number): string {
  const attributes = [
    `font-size="${formatNumber(fontSize)}"`,
    `font-family="${escapeXml(style?.fontFamily ?? 'Arial, sans-serif')}"`,
    `font-weight="${formatFontWeight(style?.fontWeight)}"`,
    `fill="${escapeXml(style?.color ?? '#111111')}"`,
  ];

  if (style?.letterSpacing !== undefined) {
    attributes.push(`letter-spacing="${formatNumber(style.letterSpacing)}"`);
  }

  return attributes.join(' ');
}

export function formatFontWeight(weight: FontWeight | undefined): string {
  if (typeof weight === 'number') {
    return weight.toString();
  }

  switch (weight) {
    case 'light':
      return '300';
    case 'medium':
      return '500';
    case 'semibold':
      return '600';
    case 'bold':
      return '700';
    case 'normal':
    case undefined:
      return '400';
    default:
      return weight;
  }
}

export function transformText(text: string, style: TextStyle | undefined): string {
  switch (style?.textTransform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, (match) => match.toUpperCase());
    case 'none':
    case undefined:
      return text;
    default:
      return text;
  }
}

export function textAnchorFor(item: PosterLayoutItem): 'start' | 'middle' | 'end' {
  switch (item.alignment?.horizontal) {
    case 'center':
      return 'middle';
    case 'right':
      return 'end';
    case 'left':
    case undefined:
      return 'start';
    default:
      return 'start';
  }
}

export function textXFor(item: PosterLayoutItem): number {
  switch (item.alignment?.horizontal) {
    case 'center':
      return item.bounds.x + item.bounds.width / 2;
    case 'right':
      return item.bounds.x + item.bounds.width;
    case 'left':
    case undefined:
      return item.bounds.x;
    default:
      return item.bounds.x;
  }
}

export function textYFor(item: PosterLayoutItem, lineHeight: number, lineCount: number): number {
  switch (item.alignment?.vertical) {
    case 'middle':
      return item.bounds.y + item.bounds.height / 2 - ((lineCount - 1) * lineHeight) / 2;
    case 'bottom':
      return item.bounds.y + item.bounds.height - (lineCount - 1) * lineHeight;
    case 'top':
    case undefined:
      return item.bounds.y;
    default:
      return item.bounds.y;
  }
}

export function dominantBaselineFor(item: PosterLayoutItem): string {
  switch (item.alignment?.vertical) {
    case 'middle':
      return 'middle';
    case 'bottom':
      return 'text-after-edge';
    case 'top':
    case undefined:
      return 'text-before-edge';
    default:
      return 'text-before-edge';
  }
}

export function getBackgroundGradient(item: PosterLayoutItem): SvgGradient | undefined {
  const metadataGradient = item.metadata?.['gradient'];
  const styleGradient = (item.boxStyle as Partial<BackgroundStyle> | undefined)?.gradient;
  const gradient = isSvgGradient(metadataGradient) ? metadataGradient : styleGradient;

  return isSvgGradient(gradient) ? gradient : undefined;
}

export function getShadow(item: PosterLayoutItem): SvgShadow | undefined {
  const metadataShadow = item.metadata?.['shadow'];
  const styleShadow = (item.boxStyle as (BoxStyle & { shadow?: unknown }) | undefined)?.shadow;
  const shadow = isShadow(metadataShadow) ? metadataShadow : styleShadow;

  return isShadow(shadow) ? shadow : undefined;
}

export function backgroundFill(item: PosterLayoutItem): string {
  return item.boxStyle?.backgroundColor ?? '#ffffff';
}

function isSvgGradient(value: unknown): value is SvgGradient {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SvgGradient>;
  return (
    (candidate.type === 'linear' || candidate.type === 'radial') &&
    Array.isArray(candidate.colors) &&
    candidate.colors.length > 0 &&
    candidate.colors.every((color) => typeof color === 'string')
  );
}

function isShadow(value: unknown): value is SvgShadow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<SvgShadow>;
  return (
    (candidate.dx === undefined || typeof candidate.dx === 'number') &&
    (candidate.dy === undefined || typeof candidate.dy === 'number') &&
    (candidate.blur === undefined || typeof candidate.blur === 'number') &&
    (candidate.color === undefined || typeof candidate.color === 'string') &&
    (candidate.opacity === undefined || typeof candidate.opacity === 'number')
  );
}
