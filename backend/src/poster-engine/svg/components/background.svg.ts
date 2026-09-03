import { PosterLayoutItem } from '../../layout';
import { SvgBuildContext } from '../SvgBuilder.types';
import {
  escapeXml,
  formatNumber,
  rectAttributes,
} from '../helpers/svgUtils';
import { PosterColorPalette, PremiumPosterTheme } from '../../types';
import { BackgroundTreatment } from '../../composition';

export function renderBackgroundSvg(item: PosterLayoutItem, context: SvgBuildContext): string {
  const palette = getPalette(item);
  const theme = getTheme(item);
  const treatment = item.metadata?.['backgroundTreatment'] as BackgroundTreatment | undefined;
  const meshId = context.nextId('premium-mesh');
  const lightId = context.nextId('premium-light');
  const blobAccentId = context.nextId('premium-blob-accent');
  const blobVibrantId = context.nextId('premium-blob-vibrant');
  const noisePatternId = context.nextId('premium-noise-pattern');

  context.defs.push(
    `<linearGradient id="${meshId}" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="${escapeXml(palette.background)}" />` +
      `<stop offset="52%" stop-color="${escapeXml(palette.backgroundAlt)}" />` +
      `<stop offset="100%" stop-color="${escapeXml(palette.background)}" />` +
    `</linearGradient>`,
    `<radialGradient id="${lightId}" cx="72%" cy="36%" r="62%">` +
      `<stop offset="0%" stop-color="${escapeXml(palette.glow)}" stop-opacity="0.88" />` +
      `<stop offset="48%" stop-color="${escapeXml(palette.vibrant)}" stop-opacity="0.22" />` +
      `<stop offset="100%" stop-color="${escapeXml(palette.background)}" stop-opacity="0" />` +
    `</radialGradient>`,
    `<radialGradient id="${blobAccentId}">` +
      `<stop offset="0%" stop-color="${escapeXml(palette.accent)}" stop-opacity="0.38" />` +
      `<stop offset="58%" stop-color="${escapeXml(palette.accent)}" stop-opacity="0.14" />` +
      `<stop offset="100%" stop-color="${escapeXml(palette.accent)}" stop-opacity="0" />` +
    `</radialGradient>`,
    `<radialGradient id="${blobVibrantId}">` +
      `<stop offset="0%" stop-color="${escapeXml(palette.vibrant)}" stop-opacity="0.32" />` +
      `<stop offset="62%" stop-color="${escapeXml(palette.glow)}" stop-opacity="0.11" />` +
      `<stop offset="100%" stop-color="${escapeXml(palette.vibrant)}" stop-opacity="0" />` +
    `</radialGradient>`,
    `<pattern id="${noisePatternId}" width="19" height="19" patternUnits="userSpaceOnUse">` +
      `<circle cx="2" cy="3" r="0.7" fill="#ffffff" opacity="0.10" />` +
      `<circle cx="13" cy="8" r="0.5" fill="#000000" opacity="0.08" />` +
      `<circle cx="7" cy="16" r="0.45" fill="#ffffff" opacity="0.07" />` +
      `<circle cx="18" cy="18" r="0.35" fill="#000000" opacity="0.06" />` +
    `</pattern>`
  );

  return [
    `<rect ${rectAttributes(item.bounds)} fill="url(#${meshId})" />`,
    `<rect ${rectAttributes(item.bounds)} fill="url(#${lightId})" />`,
    renderBlurredBlobs(item, blobAccentId, blobVibrantId, theme, treatment),
    renderTreatmentDecoration(item, palette, theme),
    renderParticles(item, palette, theme, treatment),
    `<rect ${rectAttributes(item.bounds)} fill="url(#${noisePatternId})" opacity="0.72" />`,
  ].join('');
}

type BackgroundRenderer = (
  item: PosterLayoutItem,
  palette: PosterColorPalette
) => string;

const BACKGROUND_RENDERERS: Record<BackgroundTreatment, BackgroundRenderer> = {
  'studio-halo': (item, palette) => renderHaloStage(item, palette, 0.54, 0.36),
  'soft-spotlight': (item, palette) => renderHaloStage(item, palette, 0.42, 0.24),
  'metallic-sweep': renderMetallicSweep,
  'split-light': renderSplitLight,
  'light-tunnel': renderLightTunnel,
  'dark-reflection': renderDarkReflection,
  'motion-slash': (item, palette) => renderMotionField(item, palette, 5, 0.13),
  'speed-lines': (item, palette) => renderMotionField(item, palette, 8, 0.08),
  'track-lights': renderTrackLights,
  'street-flash': renderStreetFlash,
  'energy-ring': renderEnergyRing,
  'morning-window': renderMorningWindow,
  'wood-table': renderWoodTable,
  'steam-glow': renderSteamGlow,
  'cafe-light': renderCafeLight,
  'flat-lay': renderFlatLay,
  'ceramic-shadow': renderCeramicShadow,
  marble: renderMarble,
  'glass-reflection': renderGlassReflection,
  'golden-hour': renderGoldenHour,
  'editorial-arch': renderEditorialArch,
  'dark-luxury': renderDarkLuxury,
};

function renderTreatmentDecoration(
  item: PosterLayoutItem,
  palette: PosterColorPalette,
  theme: PremiumPosterTheme
): string {
  const treatment = item.metadata?.['backgroundTreatment'] as BackgroundTreatment | undefined;
  return treatment
    ? BACKGROUND_RENDERERS[treatment](item, palette)
    : renderThemeDecoration(item, palette, theme);
}

function renderHaloStage(
  item: PosterLayoutItem,
  palette: PosterColorPalette,
  radius: number,
  opacity: number
): string {
  const { width, height } = item.bounds;
  return [
    `<circle cx="${formatNumber(width * 0.68)}" cy="${formatNumber(height * 0.42)}" r="${formatNumber(width * radius)}" fill="${escapeXml(palette.glow)}" opacity="${formatNumber(opacity * 0.22)}" />`,
    `<circle cx="${formatNumber(width * 0.68)}" cy="${formatNumber(height * 0.42)}" r="${formatNumber(width * radius * 0.72)}" fill="none" stroke="#ffffff" stroke-opacity="${formatNumber(opacity * 0.22)}" stroke-width="1.5" />`,
    `<ellipse cx="${formatNumber(width * 0.68)}" cy="${formatNumber(height * 0.79)}" rx="${formatNumber(width * 0.28)}" ry="${formatNumber(height * 0.055)}" fill="#000000" opacity="0.18" />`,
  ].join('');
}

function renderMetallicSweep(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<path d="M ${formatNumber(width * 0.32)} 0 L ${formatNumber(width * 0.78)} 0 L ${formatNumber(width * 0.54)} ${formatNumber(height)} L ${formatNumber(width * 0.08)} ${formatNumber(height)} Z" fill="#ffffff" opacity="0.055" />`,
    `<path d="M ${formatNumber(width * 0.55)} 0 L ${formatNumber(width * 0.68)} 0 L ${formatNumber(width * 0.43)} ${formatNumber(height)} L ${formatNumber(width * 0.30)} ${formatNumber(height)} Z" fill="${escapeXml(palette.accent)}" opacity="0.11" />`,
    `<path d="M ${formatNumber(width * 0.73)} 0 L ${formatNumber(width * 0.78)} 0 L ${formatNumber(width * 0.55)} ${formatNumber(height)} L ${formatNumber(width * 0.50)} ${formatNumber(height)} Z" fill="#ffffff" opacity="0.10" />`,
  ].join('');
}

function renderSplitLight(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<rect x="${formatNumber(width * 0.52)}" y="0" width="${formatNumber(width * 0.48)}" height="${formatNumber(height)}" fill="${escapeXml(palette.accent)}" opacity="0.075" />`,
    `<path d="M ${formatNumber(width * 0.52)} 0 C ${formatNumber(width * 0.42)} ${formatNumber(height * 0.30)}, ${formatNumber(width * 0.62)} ${formatNumber(height * 0.66)}, ${formatNumber(width * 0.48)} ${formatNumber(height)}" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" fill="none" />`,
  ].join('');
}

function renderLightTunnel(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [0.18, 0.28, 0.39].map((scale, index) =>
    `<ellipse cx="${formatNumber(width * 0.68)}" cy="${formatNumber(height * 0.43)}" rx="${formatNumber(width * scale)}" ry="${formatNumber(height * scale * 0.84)}" fill="none" stroke="${escapeXml(index === 1 ? palette.accent : '#ffffff')}" stroke-opacity="${formatNumber(0.18 - index * 0.035)}" stroke-width="${formatNumber(4 - index)}" />`
  ).join('');
}

function renderDarkReflection(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<ellipse cx="${formatNumber(width * 0.68)}" cy="${formatNumber(height * 0.44)}" rx="${formatNumber(width * 0.30)}" ry="${formatNumber(height * 0.36)}" fill="${escapeXml(palette.accent)}" opacity="0.08" />`,
    `<ellipse cx="${formatNumber(width * 0.68)}" cy="${formatNumber(height * 0.82)}" rx="${formatNumber(width * 0.30)}" ry="${formatNumber(height * 0.07)}" fill="#ffffff" opacity="0.065" />`,
    `<ellipse cx="${formatNumber(width * 0.68)}" cy="${formatNumber(height * 0.84)}" rx="${formatNumber(width * 0.22)}" ry="${formatNumber(height * 0.035)}" fill="#000000" opacity="0.28" />`,
  ].join('');
}

function renderMotionField(
  item: PosterLayoutItem,
  palette: PosterColorPalette,
  count: number,
  opacity: number
): string {
  const { width, height } = item.bounds;
  return Array.from({ length: count }, (_, index) => {
    const y = height * (0.18 + index * (0.58 / Math.max(1, count - 1)));
    return `<path d="M ${formatNumber(-width * 0.05)} ${formatNumber(y + height * 0.16)} L ${formatNumber(width * 0.92)} ${formatNumber(y - height * 0.17)}" stroke="${escapeXml(index % 2 === 0 ? palette.accent : '#ffffff')}" stroke-width="${formatNumber(Math.max(2, width * (0.022 - index * 0.002)))}" stroke-linecap="round" opacity="${formatNumber(opacity)}" />`;
  }).join('');
}

function renderTrackLights(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<path d="M ${formatNumber(width * 0.08)} ${formatNumber(height * 0.88)} Q ${formatNumber(width * 0.56)} ${formatNumber(height * 0.42)} ${formatNumber(width * 0.96)} ${formatNumber(height * 0.52)}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="${formatNumber(width * 0.045)}" opacity="0.14" />`,
    `<path d="M ${formatNumber(width * 0.04)} ${formatNumber(height * 0.94)} Q ${formatNumber(width * 0.56)} ${formatNumber(height * 0.50)} ${formatNumber(width)} ${formatNumber(height * 0.60)}" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.16" />`,
  ].join('');
}

function renderStreetFlash(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<rect x="${formatNumber(width * 0.60)}" y="${formatNumber(height * 0.06)}" width="${formatNumber(width * 0.34)}" height="${formatNumber(height * 0.68)}" rx="${formatNumber(width * 0.025)}" fill="#ffffff" opacity="0.055" transform="rotate(5 ${formatNumber(width * 0.77)} ${formatNumber(height * 0.40)})" />`,
    `<circle cx="${formatNumber(width * 0.80)}" cy="${formatNumber(height * 0.23)}" r="${formatNumber(width * 0.16)}" fill="${escapeXml(palette.glow)}" opacity="0.13" />`,
  ].join('');
}

function renderEnergyRing(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<ellipse cx="${formatNumber(width * 0.58)}" cy="${formatNumber(height * 0.36)}" rx="${formatNumber(width * 0.31)}" ry="${formatNumber(height * 0.25)}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="${formatNumber(width * 0.028)}" opacity="0.20" transform="rotate(-12 ${formatNumber(width * 0.58)} ${formatNumber(height * 0.36)})" />`,
    `<ellipse cx="${formatNumber(width * 0.58)}" cy="${formatNumber(height * 0.36)}" rx="${formatNumber(width * 0.39)}" ry="${formatNumber(height * 0.31)}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.12" transform="rotate(-12 ${formatNumber(width * 0.58)} ${formatNumber(height * 0.36)})" />`,
  ].join('');
}

function renderMorningWindow(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<path d="M ${formatNumber(width * 0.60)} 0 L ${formatNumber(width * 0.92)} 0 L ${formatNumber(width * 0.70)} ${formatNumber(height)} L ${formatNumber(width * 0.38)} ${formatNumber(height)} Z" fill="#fff7df" opacity="0.12" />`,
    `<path d="M ${formatNumber(width * 0.73)} 0 L ${formatNumber(width * 0.76)} 0 L ${formatNumber(width * 0.54)} ${formatNumber(height)} L ${formatNumber(width * 0.51)} ${formatNumber(height)} Z" fill="${escapeXml(palette.glow)}" opacity="0.13" />`,
  ].join('');
}

function renderWoodTable(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<rect x="0" y="${formatNumber(height * 0.66)}" width="${formatNumber(width)}" height="${formatNumber(height * 0.34)}" fill="#2B140C" opacity="0.22" />`,
    ...[0.70, 0.77, 0.84, 0.91].map((y) =>
      `<path d="M 0 ${formatNumber(height * y)} C ${formatNumber(width * 0.28)} ${formatNumber(height * (y - 0.025))}, ${formatNumber(width * 0.64)} ${formatNumber(height * (y + 0.018))}, ${formatNumber(width)} ${formatNumber(height * (y - 0.012))}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-opacity="0.10" stroke-width="2" />`
    ),
  ].join('');
}

function renderSteamGlow(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<ellipse cx="${formatNumber(width * 0.62)}" cy="${formatNumber(height * 0.36)}" rx="${formatNumber(width * 0.27)}" ry="${formatNumber(height * 0.31)}" fill="${escapeXml(palette.glow)}" opacity="0.10" />`,
    ...[0.52, 0.60, 0.68].map((x, index) =>
      `<path d="M ${formatNumber(width * x)} ${formatNumber(height * 0.48)} C ${formatNumber(width * (x - 0.05))} ${formatNumber(height * 0.34)}, ${formatNumber(width * (x + 0.06))} ${formatNumber(height * 0.24)}, ${formatNumber(width * (x + (index - 1) * 0.02))} ${formatNumber(height * 0.09)}" fill="none" stroke="#ffffff" stroke-width="${formatNumber(5 - index)}" stroke-linecap="round" opacity="${formatNumber(0.16 - index * 0.025)}" />`
    ),
  ].join('');
}

function renderCafeLight(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<circle cx="${formatNumber(width * 0.82)}" cy="${formatNumber(height * 0.18)}" r="${formatNumber(width * 0.16)}" fill="#FFD99A" opacity="0.11" />`,
    `<circle cx="${formatNumber(width * 0.13)}" cy="${formatNumber(height * 0.78)}" r="${formatNumber(width * 0.10)}" fill="${escapeXml(palette.accent)}" opacity="0.10" />`,
    `<rect x="${formatNumber(width * 0.52)}" y="${formatNumber(height * 0.08)}" width="${formatNumber(width * 0.38)}" height="${formatNumber(height * 0.62)}" rx="${formatNumber(width * 0.04)}" fill="#ffffff" opacity="0.035" />`,
  ].join('');
}

function renderFlatLay(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<circle cx="${formatNumber(width * 0.75)}" cy="${formatNumber(height * 0.28)}" r="${formatNumber(width * 0.20)}" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="${formatNumber(width * 0.035)}" />`,
    `<circle cx="${formatNumber(width * 0.16)}" cy="${formatNumber(height * 0.75)}" r="${formatNumber(width * 0.075)}" fill="${escapeXml(palette.accent)}" opacity="0.11" />`,
    `<circle cx="${formatNumber(width * 0.27)}" cy="${formatNumber(height * 0.84)}" r="${formatNumber(width * 0.035)}" fill="#ffffff" opacity="0.08" />`,
  ].join('');
}

function renderCeramicShadow(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<ellipse cx="${formatNumber(width * 0.50)}" cy="${formatNumber(height * 0.60)}" rx="${formatNumber(width * 0.35)}" ry="${formatNumber(height * 0.20)}" fill="${escapeXml(palette.accent)}" opacity="0.055" />`,
    `<ellipse cx="${formatNumber(width * 0.58)}" cy="${formatNumber(height * 0.76)}" rx="${formatNumber(width * 0.27)}" ry="${formatNumber(height * 0.06)}" fill="#000000" opacity="0.12" />`,
  ].join('');
}

function renderMarble(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [0.18, 0.38, 0.62, 0.82].map((position, index) =>
    `<path d="M ${formatNumber(-width * 0.05)} ${formatNumber(height * position)} C ${formatNumber(width * 0.24)} ${formatNumber(height * (position - 0.16))}, ${formatNumber(width * 0.58)} ${formatNumber(height * (position + 0.12))}, ${formatNumber(width * 1.05)} ${formatNumber(height * (position - 0.05))}" fill="none" stroke="${escapeXml(index % 2 ? palette.accent : '#ffffff')}" stroke-width="${formatNumber(index % 2 ? 2 : 4)}" stroke-opacity="${formatNumber(index % 2 ? 0.16 : 0.08)}" />`
  ).join('');
}

function renderGlassReflection(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<ellipse cx="${formatNumber(width * 0.50)}" cy="${formatNumber(height * 0.42)}" rx="${formatNumber(width * 0.31)}" ry="${formatNumber(height * 0.34)}" fill="${escapeXml(palette.glow)}" opacity="0.09" />`,
    `<path d="M ${formatNumber(width * 0.22)} ${formatNumber(height * 0.15)} Q ${formatNumber(width * 0.50)} ${formatNumber(height * 0.02)} ${formatNumber(width * 0.78)} ${formatNumber(height * 0.15)}" fill="none" stroke="#ffffff" stroke-opacity="0.20" stroke-width="2" />`,
    `<ellipse cx="${formatNumber(width * 0.50)}" cy="${formatNumber(height * 0.79)}" rx="${formatNumber(width * 0.29)}" ry="${formatNumber(height * 0.055)}" fill="#ffffff" opacity="0.07" />`,
  ].join('');
}

function renderGoldenHour(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<circle cx="${formatNumber(width * 0.77)}" cy="${formatNumber(height * 0.25)}" r="${formatNumber(width * 0.25)}" fill="#FFD58A" opacity="0.12" />`,
    `<path d="M ${formatNumber(width * 0.44)} 0 L ${formatNumber(width)} 0 L ${formatNumber(width * 0.72)} ${formatNumber(height)} L ${formatNumber(width * 0.16)} ${formatNumber(height)} Z" fill="${escapeXml(palette.accent)}" opacity="0.07" />`,
  ].join('');
}

function renderEditorialArch(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<path d="M ${formatNumber(width * 0.25)} ${formatNumber(height * 0.61)} V ${formatNumber(height * 0.30)} A ${formatNumber(width * 0.25)} ${formatNumber(height * 0.25)} 0 0 1 ${formatNumber(width * 0.75)} ${formatNumber(height * 0.30)} V ${formatNumber(height * 0.61)} Z" fill="${escapeXml(palette.accent)}" opacity="0.075" />`,
    `<path d="M ${formatNumber(width * 0.31)} ${formatNumber(height * 0.59)} V ${formatNumber(height * 0.32)} A ${formatNumber(width * 0.19)} ${formatNumber(height * 0.19)} 0 0 1 ${formatNumber(width * 0.69)} ${formatNumber(height * 0.32)} V ${formatNumber(height * 0.59)}" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="1.5" />`,
  ].join('');
}

function renderDarkLuxury(item: PosterLayoutItem, palette: PosterColorPalette): string {
  const { width, height } = item.bounds;
  return [
    `<rect x="${formatNumber(width * 0.08)}" y="${formatNumber(height * 0.08)}" width="${formatNumber(width * 0.84)}" height="${formatNumber(height * 0.84)}" rx="${formatNumber(width * 0.03)}" fill="#000000" opacity="0.12" />`,
    `<rect x="${formatNumber(width * 0.11)}" y="${formatNumber(height * 0.11)}" width="${formatNumber(width * 0.78)}" height="${formatNumber(height * 0.78)}" rx="${formatNumber(width * 0.025)}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-opacity="0.17" stroke-width="1" />`,
    `<circle cx="${formatNumber(width * 0.78)}" cy="${formatNumber(height * 0.22)}" r="${formatNumber(width * 0.17)}" fill="${escapeXml(palette.glow)}" opacity="0.08" />`,
  ].join('');
}

function renderBlurredBlobs(
  item: PosterLayoutItem,
  accentGradientId: string,
  vibrantGradientId: string,
  theme: PremiumPosterTheme,
  treatment?: BackgroundTreatment
): string {
  const { width, height } = item.bounds;
  const variant = treatment ?? theme;
  const blobSets: Record<string, Array<[number, number, number, number, string, number?]>> = {
    'motion-slash': [
      [-0.06, 0.22, 0.40, 0.22, vibrantGradientId, 0.82],
      [0.78, 0.36, 0.48, 0.20, accentGradientId, 0.70],
      [0.42, 1.08, 0.55, 0.20, vibrantGradientId, 0.46],
    ],
    'speed-lines': [
      [0.06, 0.78, 0.36, 0.20, vibrantGradientId, 0.70],
      [0.98, 0.16, 0.42, 0.22, accentGradientId, 0.64],
      [0.55, 0.50, 0.34, 0.30, vibrantGradientId, 0.36],
    ],
    'wood-table': [
      [0.18, 0.88, 0.42, 0.18, accentGradientId, 0.48],
      [0.86, 0.20, 0.30, 0.24, vibrantGradientId, 0.46],
      [0.50, 0.64, 0.58, 0.18, accentGradientId, 0.34],
    ],
    'morning-window': [
      [0.82, 0.18, 0.36, 0.28, vibrantGradientId, 0.70],
      [0.12, 0.70, 0.34, 0.22, accentGradientId, 0.48],
      [0.58, 1.04, 0.48, 0.20, accentGradientId, 0.42],
    ],
    marble: [
      [0.20, 0.30, 0.28, 0.42, accentGradientId, 0.44],
      [0.86, 0.60, 0.36, 0.34, vibrantGradientId, 0.36],
      [0.52, 0.02, 0.46, 0.18, accentGradientId, 0.30],
    ],
    'dark-luxury': [
      [0.72, 0.28, 0.28, 0.28, vibrantGradientId, 0.42],
      [0.22, 0.78, 0.36, 0.24, accentGradientId, 0.34],
      [0.50, 1.04, 0.50, 0.18, vibrantGradientId, 0.26],
    ],
    tech: [
      [0.86, 0.32, 0.34, 0.30, vibrantGradientId, 0.60],
      [0.18, 0.16, 0.28, 0.26, accentGradientId, 0.46],
      [0.62, 1.00, 0.42, 0.22, accentGradientId, 0.40],
    ],
    sports: [
      [0.08, 0.72, 0.40, 0.22, vibrantGradientId, 0.66],
      [0.90, 0.34, 0.42, 0.24, accentGradientId, 0.58],
      [0.48, 1.06, 0.52, 0.18, vibrantGradientId, 0.38],
    ],
    coffee: [
      [0.20, 0.78, 0.40, 0.24, accentGradientId, 0.50],
      [0.78, 0.18, 0.34, 0.26, vibrantGradientId, 0.52],
      [0.54, 0.96, 0.52, 0.20, accentGradientId, 0.36],
    ],
    fragrance: [
      [0.50, 0.20, 0.30, 0.36, vibrantGradientId, 0.44],
      [0.18, 0.78, 0.32, 0.22, accentGradientId, 0.32],
      [0.86, 0.72, 0.30, 0.26, vibrantGradientId, 0.30],
    ],
  };
  const blobs = blobSets[variant] ?? [
    [0.18, 0.18, 0.32, 0.28, accentGradientId, 1],
    [0.88, 0.74, 0.34, 0.30, vibrantGradientId, 1],
    [0.56, 1.02, 0.42, 0.24, accentGradientId, 0.55],
  ];

  return blobs.map(([cx, cy, rx, ry, gradientId, opacity]) =>
    `<ellipse cx="${formatNumber(width * cx)}" cy="${formatNumber(height * cy)}" rx="${formatNumber(width * rx)}" ry="${formatNumber(height * ry)}" fill="url(#${gradientId})"${opacity === undefined ? '' : ` opacity="${formatNumber(opacity)}"`} />`
  ).join('');
}

function renderThemeDecoration(
  item: PosterLayoutItem,
  palette: PosterColorPalette,
  theme: PremiumPosterTheme
): string {
  const { width, height } = item.bounds;
  const common = `fill="none" stroke="${escapeXml(palette.accent)}"`;

  switch (theme) {
    case 'tech':
      return [
        `<path d="M ${formatNumber(width * 0.08)} ${formatNumber(height * 0.80)} C ${formatNumber(width * 0.30)} ${formatNumber(height * 0.56)}, ${formatNumber(width * 0.52)} ${formatNumber(height * 0.70)}, ${formatNumber(width * 0.78)} ${formatNumber(height * 0.36)}" ${common} stroke-width="2" opacity="0.18" />`,
        `<rect x="${formatNumber(width * 0.06)}" y="${formatNumber(height * 0.11)}" width="${formatNumber(width * 0.18)}" height="${formatNumber(height * 0.52)}" rx="${formatNumber(width * 0.03)}" ${common} stroke-width="1.2" opacity="0.08" />`,
      ].join('');
    case 'sports':
      return [
        `<path d="M ${formatNumber(width * 0.46)} 0 L ${formatNumber(width * 0.88)} 0 L ${formatNumber(width * 0.55)} ${formatNumber(height)} L ${formatNumber(width * 0.16)} ${formatNumber(height)} Z" fill="${escapeXml(palette.accent)}" opacity="0.10" />`,
        `<path d="M ${formatNumber(width * 0.52)} 0 L ${formatNumber(width * 0.61)} 0 L ${formatNumber(width * 0.28)} ${formatNumber(height)} L ${formatNumber(width * 0.19)} ${formatNumber(height)} Z" fill="#ffffff" opacity="0.06" />`,
      ].join('');
    case 'luxury':
      return [
        `<circle cx="${formatNumber(width * 0.88)}" cy="${formatNumber(height * 0.16)}" r="${formatNumber(width * 0.18)}" ${common} stroke-width="2" opacity="0.30" />`,
        `<circle cx="${formatNumber(width * 0.88)}" cy="${formatNumber(height * 0.16)}" r="${formatNumber(width * 0.13)}" ${common} stroke-width="1" opacity="0.20" />`,
        `<rect x="${formatNumber(width * 0.06)}" y="${formatNumber(height * 0.07)}" width="${formatNumber(width * 0.16)}" height="${formatNumber(height * 0.008)}" rx="${formatNumber(height * 0.004)}" fill="${escapeXml(palette.accent)}" opacity="0.48" />`,
      ].join('');
    case 'fragrance':
      return [
        `<ellipse cx="${formatNumber(width * 0.50)}" cy="${formatNumber(height * 0.94)}" rx="${formatNumber(width * 0.42)}" ry="${formatNumber(height * 0.12)}" fill="${escapeXml(palette.accent)}" opacity="0.11" />`,
        `<path d="M ${formatNumber(width * 0.18)} ${formatNumber(height * 0.12)} Q ${formatNumber(width * 0.50)} ${formatNumber(height * 0.02)} ${formatNumber(width * 0.82)} ${formatNumber(height * 0.12)}" ${common} stroke-width="1.5" opacity="0.25" />`,
        `<path d="M ${formatNumber(width * 0.12)} ${formatNumber(height * 0.88)} Q ${formatNumber(width * 0.50)} ${formatNumber(height * 0.76)} ${formatNumber(width * 0.88)} ${formatNumber(height * 0.88)}" ${common} stroke-width="1" opacity="0.16" />`,
        `<circle cx="${formatNumber(width * 0.50)}" cy="${formatNumber(height * 0.32)}" r="${formatNumber(width * 0.22)}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.10" />`,
      ].join('');
    case 'coffee':
      return [
        `<ellipse cx="${formatNumber(width * 0.76)}" cy="${formatNumber(height * 0.62)}" rx="${formatNumber(width * 0.34)}" ry="${formatNumber(height * 0.28)}" fill="${escapeXml(palette.glow)}" opacity="0.16" />`,
        `<path d="M ${formatNumber(width * 0.12)} ${formatNumber(height)} C ${formatNumber(width * 0.24)} ${formatNumber(height * 0.78)}, ${formatNumber(width * 0.38)} ${formatNumber(height * 0.94)}, ${formatNumber(width * 0.52)} ${formatNumber(height * 0.70)}" ${common} stroke-width="2" opacity="0.16" />`,
        `<circle cx="${formatNumber(width * 0.13)}" cy="${formatNumber(height * 0.14)}" r="${formatNumber(width * 0.055)}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.13" />`,
      ].join('');
    case 'interior':
      return [
        `<path d="M 0 ${formatNumber(height * 0.72)} H ${formatNumber(width)}" stroke="${escapeXml(palette.accent)}" stroke-width="2" opacity="0.13" />`,
        `<path d="M ${formatNumber(width * 0.76)} 0 V ${formatNumber(height * 0.72)}" stroke="#ffffff" stroke-width="1" opacity="0.12" />`,
        `<path d="M ${formatNumber(width * 0.88)} 0 V ${formatNumber(height * 0.72)}" stroke="#ffffff" stroke-width="1" opacity="0.09" />`,
        `<ellipse cx="${formatNumber(width * 0.70)}" cy="${formatNumber(height * 0.78)}" rx="${formatNumber(width * 0.27)}" ry="${formatNumber(height * 0.07)}" fill="${escapeXml(palette.accent)}" opacity="0.09" />`,
      ].join('');
    case 'fashion':
      return [
        `<path d="M ${formatNumber(width * 0.68)} ${formatNumber(height * 0.02)} C ${formatNumber(width * 0.94)} ${formatNumber(height * 0.18)}, ${formatNumber(width * 0.58)} ${formatNumber(height * 0.34)}, ${formatNumber(width * 0.90)} ${formatNumber(height * 0.52)}" ${common} stroke-width="${formatNumber(width * 0.035)}" stroke-linecap="round" opacity="0.16" />`,
        `<circle cx="${formatNumber(width * 0.14)}" cy="${formatNumber(height * 0.82)}" r="${formatNumber(width * 0.08)}" fill="${escapeXml(palette.vibrant)}" opacity="0.16" />`,
      ].join('');
    case 'minimal':
      return `<circle cx="${formatNumber(width * 0.88)}" cy="${formatNumber(height * 0.12)}" r="${formatNumber(width * 0.12)}" ${common} stroke-width="1.5" opacity="0.18" />`;
    case 'modern':
    default:
      return [
        `<rect x="${formatNumber(width * 0.76)}" y="${formatNumber(height * 0.05)}" width="${formatNumber(width * 0.17)}" height="${formatNumber(width * 0.17)}" rx="${formatNumber(width * 0.04)}" ${common} stroke-width="2" opacity="0.18" transform="rotate(12 ${formatNumber(width * 0.845)} ${formatNumber(height * 0.135)})" />`,
        `<path d="M ${formatNumber(width * 0.04)} ${formatNumber(height * 0.92)} Q ${formatNumber(width * 0.24)} ${formatNumber(height * 0.72)} ${formatNumber(width * 0.42)} ${formatNumber(height * 0.90)}" ${common} stroke-width="3" opacity="0.22" />`,
      ].join('');
  }
}

function renderParticles(
  item: PosterLayoutItem,
  palette: PosterColorPalette,
  theme: PremiumPosterTheme,
  treatment?: BackgroundTreatment
): string {
  const { width, height } = item.bounds;
  const energetic =
    theme === 'sports' ||
    treatment === 'motion-slash' ||
    treatment === 'speed-lines' ||
    treatment === 'track-lights';
  const editorial =
    theme === 'fragrance' ||
    treatment === 'marble' ||
    treatment === 'editorial-arch' ||
    treatment === 'dark-luxury';
  const points = energetic
    ? [
        [0.07, 0.28, 2], [0.18, 0.58, 1.6], [0.31, 0.22, 3], [0.45, 0.77, 2],
        [0.58, 0.18, 1.7], [0.70, 0.68, 3], [0.84, 0.46, 1.8], [0.96, 0.30, 2.5],
      ]
    : editorial
      ? [
          [0.12, 0.18, 1.5], [0.24, 0.84, 1.2], [0.42, 0.10, 1.7], [0.67, 0.78, 1.3],
          [0.82, 0.22, 1.8], [0.90, 0.88, 1.1],
        ]
      : [
          [0.08, 0.16, 3], [0.16, 0.30, 2], [0.28, 0.08, 4], [0.36, 0.72, 3],
          [0.52, 0.12, 2], [0.62, 0.82, 4], [0.76, 0.62, 2], [0.91, 0.40, 3],
          [0.84, 0.90, 2], [0.22, 0.88, 2],
        ];

  return `<g opacity="${editorial ? '0.28' : energetic ? '0.52' : '0.42'}">${points.map(([x, y, radius], index) =>
    `<circle cx="${formatNumber(width * x!)}" cy="${formatNumber(height * y!)}" r="${radius}" fill="${escapeXml(index % 2 === 0 ? palette.accent : '#FFFFFF')}" />`
  ).join('')}</g>`;
}

function getPalette(item: PosterLayoutItem): PosterColorPalette {
  return item.metadata?.['palette'] as PosterColorPalette;
}

function getTheme(item: PosterLayoutItem): PremiumPosterTheme {
  return item.metadata?.['theme'] as PremiumPosterTheme ?? 'modern';
}
