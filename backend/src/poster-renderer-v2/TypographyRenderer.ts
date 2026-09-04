import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import type { Region } from './Canvas';
import { escapeSvg, formatNumber } from './SVGBuilder';
import type { RendererTemplateProfile, TemplateTypographyPersonality } from './templates/TemplateTypes';

export interface TypographyContent {
  headline: string;
  description?: string;
  price?: string;
}

export class TypographyRenderer {
  renderHeadline(decision: PosterDesignDecision, region: Region, text: string, template?: RendererTemplateProfile): string {
    const personality = template?.typographyPersonality ?? resolvePersonality(decision, template);
    let fontFamily = decision.typography.headlineFont;
    let lineHeight = decision.typography.lineHeight * (template?.typographyRatios.lineHeightMultiplier ?? 1);
    let transform = decision.typography.headlineTransform;
    let letterSpacing = decision.typography.headlineLetterSpacing * (template?.typographyRatios.trackingMultiplier ?? 1);
    let weight: number = decision.typography.headlineWeight;
    let baseSize = decision.typography.headlineSize * (template?.typographyRatios.headlineScale ?? 1);

    if (personality === 'editorial-serif') {
      fontFamily = isSerif(fontFamily) ? fontFamily : 'Playfair Display, "Cinzel", "Didot", serif';
      lineHeight = Math.max(1.14, lineHeight * 1.12);
      letterSpacing = Math.max(0.5, letterSpacing * 1.3);
      weight = Math.min(700, Math.max(500, weight));
      transform = 'none';
      baseSize = Math.max(38, Math.min(64, baseSize * 1.05));
    } else if (personality === 'bold-display') {
      fontFamily = isDisplay(fontFamily) ? fontFamily : 'Oswald, "Bebas Neue", "Impact", sans-serif';
      lineHeight = Math.min(1.02, Math.max(0.92, lineHeight * 0.94));
      letterSpacing = Math.max(0.3, letterSpacing * 0.9);
      weight = Math.max(700, weight);
      transform = 'uppercase';
      baseSize = Math.max(44, Math.min(76, baseSize * 1.15));
    } else {
      fontFamily = isModernSans(fontFamily) ? fontFamily : 'Inter, "Plus Jakarta Sans", sans-serif';
      lineHeight = Math.max(1.10, Math.min(1.16, lineHeight));
      weight = Math.min(700, Math.max(600, weight));
      baseSize = Math.max(36, Math.min(62, baseSize));
    }

    return this.renderTextBlock({
      text,
      region,
      fontFamily,
      fontSize: baseSize,
      fill: decision.colors.headline,
      weight,
      lineHeight,
      alignment: region.alignment ?? decision.typography.alignment,
      maxCharactersPerLine: Math.round(decision.typography.maxCharactersPerLine * (template?.typographyRatios.maxLineLengthMultiplier ?? 1)),
      transform,
      letterSpacing,
      hierarchy: 'headline',
    });
  }

  renderDescription(decision: PosterDesignDecision, region: Region, text: string, template?: RendererTemplateProfile): string {
    const personality = template?.typographyPersonality ?? resolvePersonality(decision, template);
    let fontFamily = decision.typography.descriptionFont;
    if (personality === 'editorial-serif' && !isSerif(fontFamily)) {
      fontFamily = 'Cormorant Garamond, "EB Garamond", serif';
    }

    return this.renderTextBlock({
      text,
      region,
      fontFamily,
      fontSize: Math.max(14, Math.min(18, Math.round(decision.typography.descriptionSize * (template?.typographyRatios.descriptionScale ?? 1)))),
      fill: decision.colors.description,
      weight: personality === 'editorial-serif' ? 500 : 400,
      lineHeight: Math.max(1.18, decision.typography.lineHeight * (template?.typographyRatios.lineHeightMultiplier ?? 1)),
      alignment: region.alignment ?? decision.typography.alignment,
      maxCharactersPerLine: Math.max(28, Math.round((decision.typography.maxCharactersPerLine + 12) * (template?.typographyRatios.maxLineLengthMultiplier ?? 1))),
      transform: 'none',
      letterSpacing: personality === 'editorial-serif' ? 0.3 : 0,
      hierarchy: 'description',
    });
  }

  renderPrice(decision: PosterDesignDecision, region: Region, text: string | undefined, template?: RendererTemplateProfile): string {
    if (!text) return '';
    const personality = template?.typographyPersonality ?? resolvePersonality(decision, template);
    const fontFamily = personality === 'bold-display' ? (decision.typography.headlineFont || 'Oswald, sans-serif') : decision.typography.ctaFont;

    return this.renderTextBlock({
      text,
      region,
      fontFamily,
      fontSize: Math.max(20, Math.min(32, Math.round(decision.typography.descriptionSize * 1.35 * (template?.typographyRatios.priceScale ?? 1)))),
      fill: decision.colors.accent,
      weight: Math.max(600, decision.typography.ctaWeight),
      lineHeight: 1.1 * (template?.typographyRatios.lineHeightMultiplier ?? 1),
      alignment: region.alignment ?? decision.typography.alignment,
      maxCharactersPerLine: 18,
      transform: 'none',
      letterSpacing: Math.max(0, decision.typography.headlineLetterSpacing * 0.35 * (template?.typographyRatios.trackingMultiplier ?? 1)),
      hierarchy: 'price',
    });
  }

  private renderTextBlock(input: {
    text: string;
    region: Region;
    fontFamily: string;
    fontSize: number;
    fill: string;
    weight: number;
    lineHeight: number;
    alignment: string;
    maxCharactersPerLine: number;
    transform: string;
    letterSpacing: number;
    hierarchy: 'headline' | 'description' | 'price';
  }): string {
    if (!input.text.trim() || input.region.width < 1 || input.region.height < 12) {
      return '';
    }

    const text = input.transform === 'uppercase'
      ? input.text.toUpperCase()
      : input.transform === 'capitalize'
        ? capitalize(input.text)
        : input.text;
    const fontSize = fitFontSize(text, input);
    const maxLineWidth = Math.max(8, Math.floor(input.region.width / estimatedCharacterWidth(fontSize, input.letterSpacing)));
    const maxCharactersPerLine = Math.max(8, Math.min(input.maxCharactersPerLine, maxLineWidth));
    const lineHeightPx = fontSize * input.lineHeight;
    const maxLines = Math.max(1, Math.floor(input.region.height / lineHeightPx));
    const wrappedLines = wrapText(text, maxCharactersPerLine);
    const lines = ellipsizeLines(wrappedLines, maxLines, maxCharactersPerLine);
    const anchor = input.alignment === 'center' || input.alignment === 'balanced'
      ? 'middle'
      : input.alignment === 'right'
        ? 'end'
        : 'start';
    const x = anchor === 'middle'
      ? input.region.x + input.region.width / 2
      : anchor === 'end'
        ? input.region.x + input.region.width
        : input.region.x;
    const totalTextHeight = Math.max(fontSize, (lines.length - 1) * lineHeightPx + fontSize);
    const y = verticalStart(input.region, totalTextHeight, fontSize, input.hierarchy);
    const tracking = input.letterSpacing !== 0 ? ` letter-spacing="${formatNumber(input.letterSpacing)}"` : '';
    const hierarchyAttrs = input.hierarchy === 'headline'
      ? ` paint-order="stroke" stroke="${escapeSvg(input.fill)}" stroke-width="0"`
      : '';

    return [
      `<text x="${formatNumber(x)}" y="${formatNumber(y)}" text-anchor="${anchor}" font-family="${escapeSvg(input.fontFamily)}" font-size="${formatNumber(fontSize)}" font-weight="${formatNumber(input.weight)}" fill="${escapeSvg(input.fill)}"${tracking}${hierarchyAttrs}>`,
      ...lines.map((line, index) =>
        `<tspan x="${formatNumber(x)}" dy="${index === 0 ? 0 : formatNumber(lineHeightPx)}">${escapeSvg(line)}</tspan>`
      ),
      '</text>',
    ].join('');
  }
}

function wrapText(text: string, maxCharactersPerLine: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharactersPerLine || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

function capitalize(text: string): string {
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function responsiveFontSize(baseFontSize: number, region: Region, hierarchy: 'headline' | 'description' | 'price'): number {
  const widthLimit = region.width / (hierarchy === 'headline' ? 5.8 : hierarchy === 'price' ? 4.0 : 12);
  const heightLimit = region.height / (hierarchy === 'headline' ? 1.3 : hierarchy === 'price' ? 1.15 : 2.0);
  const maxSize = Math.min(widthLimit, heightLimit);
  const minSize = hierarchy === 'headline' ? 26 : hierarchy === 'price' ? 18 : 13;

  return Math.max(minSize, Math.min(baseFontSize, maxSize));
}

function fitFontSize(
  text: string,
  input: {
    region: Region;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    maxCharactersPerLine: number;
    hierarchy: 'headline' | 'description' | 'price';
  }
): number {
  let fontSize = responsiveFontSize(input.fontSize, input.region, input.hierarchy);
  const minSize = input.hierarchy === 'headline' ? 20 : input.hierarchy === 'price' ? 16 : 12;

  while (fontSize > minSize) {
    const maxLineWidth = Math.max(8, Math.floor(input.region.width / estimatedCharacterWidth(fontSize, input.letterSpacing)));
    const maxCharactersPerLine = Math.max(8, Math.min(input.maxCharactersPerLine, maxLineWidth));
    const lineHeightPx = fontSize * input.lineHeight;
    const maxLines = Math.max(1, Math.floor(input.region.height / lineHeightPx));
    const lines = wrapText(text, maxCharactersPerLine);

    if (lines.length <= maxLines) break;
    fontSize -= 1;
  }

  return fontSize;
}

function estimatedCharacterWidth(fontSize: number, letterSpacing: number): number {
  return Math.max(4, fontSize * 0.53 + letterSpacing);
}

function verticalStart(region: Region, textHeight: number, fontSize: number, hierarchy: 'headline' | 'description' | 'price'): number {
  if (hierarchy === 'price' || region.verticalAlignment === 'middle') {
    const baselineOffset = Math.round((region.height - textHeight) / 2 + fontSize * 0.82);
    return region.y + Math.max(fontSize, baselineOffset);
  }

  if (region.verticalAlignment === 'bottom') {
    return region.y + Math.max(fontSize, region.height - textHeight + fontSize * 0.85);
  }

  return region.y + Math.round(fontSize * 0.95);
}

function ellipsizeLines(lines: string[], maxLines: number, maxCharactersPerLine: number): string[] {
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  const last = visible[visible.length - 1] ?? '';
  visible[visible.length - 1] = ellipsize(last, Math.max(4, maxCharactersPerLine));

  return visible;
}

function ellipsize(text: string, maxCharacters: number): string {
  if (text.length <= maxCharacters) return text;
  return `${text.slice(0, Math.max(1, maxCharacters - 3)).trimEnd()}...`;
}

function resolvePersonality(decision: PosterDesignDecision, template?: RendererTemplateProfile): TemplateTypographyPersonality {
  if (template?.typographyPersonality) {
    return template.typographyPersonality;
  }
  const headlineFont = (decision.typography.headlineFont || '').toLowerCase();
  const typoId = decision.typography?.typographyId;
  const tone = (decision.metadata?.selectedTone || '').toLowerCase();
  if (isSerif(headlineFont) || typoId === 'editorial' || typoId === 'luxury' || typoId === 'fashion' || tone.includes('editorial') || tone.includes('luxury')) {
    return 'editorial-serif';
  }
  if (isDisplay(headlineFont) || typoId === 'bold' || typoId === 'sport' || tone.includes('bold') || tone.includes('punchy')) {
    return 'bold-display';
  }
  return 'modern-sans';
}

function isSerif(font: string): boolean {
  const f = font.toLowerCase();
  return f.includes('serif') || f.includes('playfair') || f.includes('cormorant') || f.includes('didot') || f.includes('cinzel') || f.includes('garamond') || f.includes('merriweather');
}

function isDisplay(font: string): boolean {
  const f = font.toLowerCase();
  return f.includes('oswald') || f.includes('bebas') || f.includes('impact') || f.includes('anton') || f.includes('montserrat') || f.includes('display');
}

function isModernSans(font: string): boolean {
  const f = font.toLowerCase();
  return f.includes('inter') || f.includes('plus jakarta') || f.includes('helvetica') || f.includes('sans-serif') || f.includes('roboto') || f.includes('poppins');
}

export default TypographyRenderer;
