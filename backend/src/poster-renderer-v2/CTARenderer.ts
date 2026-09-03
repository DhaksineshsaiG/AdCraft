import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import type { Region } from './Canvas';
import { escapeSvg, formatNumber, rectAttrs } from './SVGBuilder';
import type { RendererTemplateProfile } from './templates/TemplateTypes';

export class CTARenderer {
  render(decision: PosterDesignDecision, region: Region, text: string, template?: RendererTemplateProfile): string {
    const templateRadius = template?.cornerRadius.cta;
    const radius = templateRadius === 999
      ? region.height / 2
      : Math.min(region.height / 2, templateRadius ?? 28);
    const fontSize = Math.max(14, Math.min(region.height * 0.42, decision.typography.descriptionSize * (template?.typographyRatios.ctaScale ?? 1)));
    const shineHeight = Math.max(2, region.height * 0.42);
    const fill = template?.ctaStyle.fill ?? 'solid';
    const isUnderline = fill === 'underline';
    const isOutline = fill === 'outline' || isUnderline;
    const isGlass = fill === 'glass';
    const background = isOutline ? 'transparent' : isGlass ? decision.colors.surface : decision.colors.ctaBackground;
    const stroke = fill === 'gradient' ? decision.colors.accent : decision.colors.border;
    const strokeWidth = isOutline ? Math.max(1, template?.borderStyle.width ?? 1) : 1;
    const underline = isUnderline
      ? `<line x1="${formatNumber(region.x)}" y1="${formatNumber(region.y + region.height)}" x2="${formatNumber(region.x + region.width)}" y2="${formatNumber(region.y + region.height)}" stroke="${escapeSvg(decision.colors.accent)}" stroke-width="${formatNumber(Math.max(2, strokeWidth * 1.4))}" />`
      : '';
    const shadowOpacity = template?.shadowPreset.opacity ?? 0.16;
    const shineOpacity = template?.ctaStyle.emphasis === 'strong' ? 0.16 : template?.ctaStyle.emphasis === 'subtle' ? 0.05 : 0.1;

    return [
      `<g data-cta="${escapeSvg(text)}">`,
      `<rect x="${formatNumber(region.x)}" y="${formatNumber(region.y + region.height * 0.16)}" width="${formatNumber(region.width)}" height="${formatNumber(region.height)}" rx="${formatNumber(radius)}" fill="${escapeSvg(decision.colors.shadow)}" opacity="${formatNumber(shadowOpacity)}" />`,
      `<rect ${rectAttrs(region)} rx="${formatNumber(radius)}" fill="${escapeSvg(background)}" stroke="${escapeSvg(stroke)}" stroke-width="${formatNumber(strokeWidth)}" opacity="${formatNumber(isGlass ? 0.72 : 1)}" />`,
      isOutline ? '' : `<rect x="${formatNumber(region.x + 2)}" y="${formatNumber(region.y + 2)}" width="${formatNumber(Math.max(1, region.width - 4))}" height="${formatNumber(shineHeight)}" rx="${formatNumber(Math.max(1, radius - 2))}" fill="${escapeSvg(decision.colors.ctaText)}" opacity="${formatNumber(shineOpacity)}" />`,
      `<text x="${formatNumber(region.x + region.width / 2)}" y="${formatNumber(region.y + region.height / 2)}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeSvg(decision.typography.ctaFont)}" font-size="${formatNumber(fontSize)}" font-weight="${formatNumber(decision.typography.ctaWeight)}" fill="${escapeSvg(decision.colors.ctaText)}">${escapeSvg(text)}</text>`,
      underline,
      '</g>',
    ].join('');
  }
}

export default CTARenderer;
