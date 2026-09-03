import { PosterLayoutItem } from '../../layout';
import { PosterColorPalette } from '../../types';
import { SvgBuildContext } from '../SvgBuilder.types';
import {
  escapeXml,
  formatNumber,
  textStyleAttributes,
} from '../helpers/svgUtils';
import { PriceTreatment } from '../../composition';

export function renderPriceCardSvg(item: PosterLayoutItem, _context: SvgBuildContext): string {
  if (!item.text?.text) return '';

  const palette = item.metadata?.['palette'] as PosterColorPalette;
  const treatment = item.metadata?.['priceTreatment'] as PriceTreatment | undefined ?? 'minimal';
  return PRICE_RENDERERS[treatment](item, palette);
}

type PriceRenderer = (item: PosterLayoutItem, palette: PosterColorPalette) => string;

const PRICE_RENDERERS: Record<PriceTreatment, PriceRenderer> = {
  minimal: (item, palette) => renderPriceGroup(item, palette, {
    label: hasCompareAt(item) ? 'Now' : '',
    labelY: 0.22,
    priceY: 0.66,
  }),
  editorial: (item, palette) => renderPriceGroup(item, palette, {
    label: hasCompareAt(item) ? 'Now' : '',
    labelY: 0.18,
    priceY: 0.67,
    priceScale: 1.12,
    accent: `<circle cx="${formatNumber(item.bounds.x + item.bounds.width * 0.04)}" cy="${formatNumber(item.bounds.y + item.bounds.height * 0.17)}" r="${formatNumber(Math.max(3, item.bounds.height * 0.035))}" fill="${escapeXml(palette.accent)}" />`,
  }),
  stacked: (item, palette) => {
    return [
      `<g>`,
      `<path d="M ${formatNumber(item.bounds.x)} ${formatNumber(item.bounds.y + item.bounds.height * 0.13)} H ${formatNumber(item.bounds.x + item.bounds.width * 0.28)} M ${formatNumber(item.bounds.x + item.bounds.width * 0.72)} ${formatNumber(item.bounds.y + item.bounds.height * 0.13)} H ${formatNumber(item.bounds.x + item.bounds.width)}" stroke="${escapeXml(palette.accent)}" stroke-width="2" stroke-opacity="0.78" />`,
      renderPriceGroup(item, palette, {
        label: hasCompareAt(item) ? 'Now' : '',
        labelY: 0.25,
        priceY: 0.67,
        inset: item.bounds.width * 0.04,
      }),
      `</g>`,
    ].join('');
  },
  inline: (item, palette) => renderPriceGroup(item, palette, {
    label: '',
    labelY: 0,
    priceY: 0.53,
    priceScale: 0.96,
    compareInline: true,
  }),
  'accent-rule': (item, palette) => renderPriceGroup(item, palette, {
    label: hasCompareAt(item) ? 'Now' : '',
    labelY: 0.24,
    priceY: 0.69,
    accent: `<rect x="${formatNumber(item.bounds.x)}" y="${formatNumber(item.bounds.y)}" width="${formatNumber(Math.max(4, item.bounds.width * 0.025))}" height="${formatNumber(item.bounds.height)}" rx="3" fill="${escapeXml(palette.accent)}" />`,
    inset: item.bounds.width * 0.09,
  }),
  'floating-label': (item, palette) => {
    const labelWidth = Math.min(item.bounds.width * 0.48, 130);
    return [
      `<g>`,
      `<rect x="${formatNumber(item.bounds.x)}" y="${formatNumber(item.bounds.y + item.bounds.height * 0.08)}" width="${formatNumber(labelWidth)}" height="${formatNumber(item.bounds.height * 0.28)}" rx="${formatNumber(item.bounds.height * 0.14)}" fill="${escapeXml(palette.accent)}" fill-opacity="0.94" />`,
      renderPriceGroup(item, palette, {
        label: hasCompareAt(item) ? 'Now' : 'From',
        labelY: 0.25,
        priceY: 0.72,
        labelColor: '#ffffff',
      }),
      `</g>`,
    ].join('');
  },
};

interface PriceGroupOptions {
  label: string;
  labelY: number;
  priceY: number;
  priceScale?: number;
  accent?: string;
  inset?: number;
  compareInline?: boolean;
  labelColor?: string;
}

function renderPriceGroup(
  item: PosterLayoutItem,
  palette: PosterColorPalette,
  options: PriceGroupOptions
): string {
  if (!item.text) return '';
  const inset = options.inset ?? 0;
  const x = item.bounds.x + inset;
  const compareAt = renderCompareAt(
    item,
    x,
    options.compareInline ? 0.18 : options.labelY,
    Boolean(options.label)
  );
  const label = options.label
    ? `<text x="${formatNumber(x)}" y="${formatNumber(item.bounds.y + item.bounds.height * options.labelY)}" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(11, item.text.fontSize * 0.30))}" font-weight="600" letter-spacing="0.7" fill="${escapeXml(options.labelColor ?? palette.mutedText)}" fill-opacity="0.82">${escapeXml(options.label)}</text>`
    : '';
  const requestedPriceSize = item.text.fontSize * (options.priceScale ?? 1);
  const availableWidth = Math.max(40, item.bounds.width - inset);
  const fittedPriceSize = Math.max(
    Math.min(28, requestedPriceSize),
    Math.min(
      requestedPriceSize,
      availableWidth / Math.max(1, item.text.text.length * 0.56)
    )
  );
  return [
    '<g>',
    options.accent ?? '',
    label,
    `<text x="${formatNumber(x)}" y="${formatNumber(item.bounds.y + item.bounds.height * options.priceY)}" dominant-baseline="middle" ${textStyleAttributes(item.text.style, fittedPriceSize)}>${escapeXml(item.text.text)}</text>`,
    compareAt,
    '</g>',
  ].join('');
}

function hasCompareAt(item: PosterLayoutItem): boolean {
  const amount = item.metadata?.['compareAtAmount'];
  const priceAmount = item.metadata?.['priceAmount'];
  return typeof amount === 'number' && typeof priceAmount === 'number' && amount > priceAmount;
}

function renderCompareAt(
  item: PosterLayoutItem,
  baseX: number,
  lineY: number,
  followsLabel: boolean
): string {
  const amount = item.metadata?.['compareAtAmount'];
  const priceAmount = item.metadata?.['priceAmount'];
  const currency = item.metadata?.['priceCurrency'];
  if (
    item.bounds.width < 210 ||
    typeof amount !== 'number' ||
    typeof priceAmount !== 'number' ||
    amount <= priceAmount ||
    typeof currency !== 'string'
  ) return '';

  const x = baseX + item.bounds.width * (followsLabel ? 0.34 : 0);
  const y = item.bounds.y + item.bounds.height * lineY;
  const text = `Was ${currency} ${amount.toFixed(2)}`;

  return `<text x="${formatNumber(x)}" y="${formatNumber(y)}" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${formatNumber(Math.max(10, item.bounds.height * 0.12))}" font-weight="500" fill="${escapeXml(String((item.metadata?.['palette'] as PosterColorPalette | undefined)?.mutedText ?? '#ffffff'))}" fill-opacity="0.62">${escapeXml(text)}</text>`;
}
