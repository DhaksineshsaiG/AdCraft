import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import type { Region } from './Canvas';
import { escapeSvg, formatNumber } from './SVGBuilder';
import type { RendererTemplateProfile } from './templates/TemplateTypes';

export class CTARenderer {
  render(decision: PosterDesignDecision, region: Region, text: string, template?: RendererTemplateProfile): string {
    const btnHeight = Math.min(region.height, Math.max(38, Math.min(48, Math.round(region.height * 0.94))));
    const fontSize = Math.max(13, Math.min(16, Math.round(btnHeight * 0.36), Math.round(decision.typography.descriptionSize * (template?.typographyRatios.ctaScale ?? 1))));
    const horizontalPadding = Math.max(20, Math.round(btnHeight * 0.52));
    const estimatedWidth = Math.round(text.length * fontSize * 0.58 + horizontalPadding * 2);
    const minBtnWidth = Math.min(region.width, Math.max(120, Math.round(region.width * 0.65)));
    const btnWidth = Math.max(minBtnWidth, Math.min(region.width, estimatedWidth));

    let btnX = region.x;
    if (region.alignment === 'center') {
      btnX = region.x + Math.round((region.width - btnWidth) / 2);
    } else if (region.alignment === 'right') {
      btnX = region.x + region.width - btnWidth;
    }
    const btnY = region.y + Math.round((region.height - btnHeight) / 2);

    const templateRadius = template?.cornerRadius.cta;
    const radius = templateRadius === 999
      ? btnHeight / 2
      : Math.min(btnHeight / 2, templateRadius ?? Math.round(btnHeight / 2));

    const fill = template?.ctaStyle.fill ?? 'solid';
    const isUnderline = fill === 'underline';
    const isOutline = fill === 'outline' || isUnderline;
    const isGlass = fill === 'glass';
    const background = isOutline ? 'transparent' : isGlass ? decision.colors.surface : decision.colors.ctaBackground;
    const stroke = isOutline ? decision.colors.accent : (fill === 'gradient' ? decision.colors.accent : decision.colors.border);
    const strokeWidth = isOutline ? Math.max(1.5, template?.borderStyle.width ?? 1.5) : 1;
    const underline = isUnderline
      ? `<line x1="${formatNumber(btnX)}" y1="${formatNumber(btnY + btnHeight)}" x2="${formatNumber(btnX + btnWidth)}" y2="${formatNumber(btnY + btnHeight)}" stroke="${escapeSvg(decision.colors.accent)}" stroke-width="${formatNumber(Math.max(2, strokeWidth * 1.4))}" />`
      : '';
    const shadowOpacity = Math.min(0.22, (template?.shadowPreset.opacity ?? 0.16) * 0.85);
    const shineOpacity = template?.ctaStyle.emphasis === 'strong' ? 0.15 : template?.ctaStyle.emphasis === 'subtle' ? 0.05 : 0.09;
    const shineHeight = Math.max(2, btnHeight * 0.38);
    const textColor = isOutline ? decision.colors.accent : decision.colors.ctaText;

    return [
      `<g data-cta="${escapeSvg(text)}">`,
      `<rect x="${formatNumber(btnX)}" y="${formatNumber(btnY + 2.5)}" width="${formatNumber(btnWidth)}" height="${formatNumber(btnHeight)}" rx="${formatNumber(radius)}" fill="${escapeSvg(decision.colors.shadow)}" opacity="${formatNumber(shadowOpacity)}" />`,
      `<rect x="${formatNumber(btnX)}" y="${formatNumber(btnY)}" width="${formatNumber(btnWidth)}" height="${formatNumber(btnHeight)}" rx="${formatNumber(radius)}" fill="${escapeSvg(background)}" stroke="${escapeSvg(stroke)}" stroke-width="${formatNumber(strokeWidth)}" opacity="${formatNumber(isGlass ? 0.75 : 1)}" />`,
      isOutline ? '' : `<rect x="${formatNumber(btnX + 2)}" y="${formatNumber(btnY + 1)}" width="${formatNumber(Math.max(1, btnWidth - 4))}" height="${formatNumber(shineHeight)}" rx="${formatNumber(Math.max(1, radius - 2))}" fill="${escapeSvg(decision.colors.ctaText)}" opacity="${formatNumber(shineOpacity)}" />`,
      `<text x="${formatNumber(btnX + btnWidth / 2)}" y="${formatNumber(btnY + btnHeight / 2)}" text-anchor="middle" dominant-baseline="central" font-family="${escapeSvg(decision.typography.ctaFont)}" font-size="${formatNumber(fontSize)}" font-weight="${formatNumber(Math.max(600, decision.typography.ctaWeight))}" fill="${escapeSvg(textColor)}" letter-spacing="0.5">${escapeSvg(text)}</text>`,
      underline,
      '</g>',
    ].join('');
  }
}

export default CTARenderer;
