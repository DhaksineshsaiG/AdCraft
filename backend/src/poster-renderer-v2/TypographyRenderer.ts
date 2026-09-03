import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import type { Region } from './Canvas';
import { escapeSvg, formatNumber } from './SVGBuilder';
import type { RendererTemplateProfile } from './templates/TemplateTypes';

export interface TypographyContent {
  headline: string;
  description?: string;
  price?: string;
}

export class TypographyRenderer {
  renderHeadline(decision: PosterDesignDecision, region: Region, text: string, template?: RendererTemplateProfile): string {
    return this.renderTextBlock({
      text,
      region,
      fontFamily: decision.typography.headlineFont,
      fontSize: decision.typography.headlineSize * (template?.typographyRatios.headlineScale ?? 1),
      fill: decision.colors.headline,
      weight: decision.typography.headlineWeight,
      lineHeight: decision.typography.lineHeight * (template?.typographyRatios.lineHeightMultiplier ?? 1),
      alignment: region.alignment ?? decision.typography.alignment,
      maxCharactersPerLine: Math.round(decision.typography.maxCharactersPerLine * (template?.typographyRatios.maxLineLengthMultiplier ?? 1)),
      transform: decision.typography.headlineTransform,
      letterSpacing: decision.typography.headlineLetterSpacing * (template?.typographyRatios.trackingMultiplier ?? 1),
      hierarchy: 'headline',
    });
  }

  renderDescription(decision: PosterDesignDecision, region: Region, text: string, template?: RendererTemplateProfile): string {
    return this.renderTextBlock({
      text,
      region,
      fontFamily: decision.typography.descriptionFont,
      fontSize: decision.typography.descriptionSize * (template?.typographyRatios.descriptionScale ?? 1),
      fill: decision.colors.description,
      weight: 400,
      lineHeight: Math.max(1.18, decision.typography.lineHeight * (template?.typographyRatios.lineHeightMultiplier ?? 1)),
      alignment: region.alignment ?? decision.typography.alignment,
      maxCharactersPerLine: Math.max(28, Math.round((decision.typography.maxCharactersPerLine + 12) * (template?.typographyRatios.maxLineLengthMultiplier ?? 1))),
      transform: 'none',
      letterSpacing: 0,
      hierarchy: 'description',
    });
  }

  renderPrice(decision: PosterDesignDecision, region: Region, text: string | undefined, template?: RendererTemplateProfile): string {
    if (!text) return '';

    return this.renderTextBlock({
      text,
      region,
      fontFamily: decision.typography.ctaFont,
      fontSize: Math.max(18, decision.typography.descriptionSize * 1.15 * (template?.typographyRatios.priceScale ?? 1)),
      fill: decision.colors.accent,
      weight: decision.typography.ctaWeight,
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
  const widthLimit = region.width / (hierarchy === 'headline' ? 6.2 : hierarchy === 'price' ? 5 : 12);
  const heightLimit = region.height / (hierarchy === 'headline' ? 1.35 : hierarchy === 'price' ? 1.2 : 2.2);
  const maxSize = Math.min(widthLimit, heightLimit);
  const minSize = hierarchy === 'headline' ? 28 : hierarchy === 'price' ? 16 : 13;

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
  const minSize = input.hierarchy === 'headline' ? 20 : input.hierarchy === 'price' ? 15 : 12;

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
  if (region.verticalAlignment === 'bottom' || hierarchy === 'price') {
    return region.y + Math.max(fontSize, region.height - textHeight + fontSize * 0.9);
  }

  if (region.verticalAlignment === 'middle') {
    return region.y + Math.max(fontSize, (region.height - textHeight) / 2 + fontSize);
  }

  return region.y + fontSize;
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

export default TypographyRenderer;
