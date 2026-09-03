import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import type { Region } from './Canvas';
import { escapeSvg, formatNumber, rectAttrs, SVGBuilder } from './SVGBuilder';
import type { RendererTemplateProfile } from './templates/TemplateTypes';

export interface ProductRenderInput {
  imageUrl?: string;
  altText?: string;
}

export class ProductRenderer {
  render(
    decision: PosterDesignDecision,
    region: Region,
    product: ProductRenderInput,
    builder: SVGBuilder,
    template?: RendererTemplateProfile
  ): string {
    const clipId = builder.nextId('renderer2-product-clip');
    const shadowId = builder.nextId('renderer2-product-shadow');
    const glowId = builder.nextId('renderer2-product-glow');
    const reflectionId = builder.nextId('renderer2-product-reflection');
    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;
    const focusInset = Math.min(region.width, region.height) * (0.035 + (template?.imageEmphasis.cropSafety ?? 0) * 0.25);
    const productRegion = scaleRegion(region, dynamicScale(decision, template));
    const perspective = perspectiveOffset(decision.position.depth);
    const preserveAspectRatio = decision.position.cropMode === 'cover' || decision.position.cropMode === 'close-up' || decision.position.cropMode === 'full-bleed'
      ? 'xMidYMid slice'
      : 'xMidYMid meet';

    builder.addDef(
      `<clipPath id="${clipId}"><rect ${rectAttrs(productRegion)} rx="${formatNumber(Math.min(productRegion.width, productRegion.height) * 0.055)}" /></clipPath>`
    );
    builder.addDef(
      `<filter id="${shadowId}" x="-55%" y="-55%" width="210%" height="220%">` +
        shadowFilter(decision, productRegion, template) +
      `</filter>`
    );
    builder.addDef(
      `<filter id="${glowId}" x="-70%" y="-70%" width="240%" height="240%">` +
        `<feGaussianBlur stdDeviation="${formatNumber(Math.max(8, productRegion.width * 0.045 * (template?.imageEmphasis.glow ?? 1)))}" result="blur" />` +
        `<feColorMatrix in="blur" type="matrix" values="0 0 0 0 ${hexChannel(decision.colors.accent, 0)} 0 0 0 0 ${hexChannel(decision.colors.accent, 1)} 0 0 0 0 ${hexChannel(decision.colors.accent, 2)} 0 0 0 ${formatNumber(0.45 + (template?.imageEmphasis.glow ?? 0.18) * 0.25)} 0" />` +
      `</filter>`
    );
    builder.addDef(
      `<linearGradient id="${reflectionId}" x1="0%" y1="0%" x2="0%" y2="100%">` +
        `<stop offset="0%" stop-color="${escapeSvg(decision.colors.ctaText)}" stop-opacity="0.24" />` +
        `<stop offset="100%" stop-color="${escapeSvg(decision.colors.ctaText)}" stop-opacity="0" />` +
      `</linearGradient>`
    );

    const content = product.imageUrl
      ? `<image href="${escapeSvg(product.imageUrl)}" ${rectAttrs(productRegion)} preserveAspectRatio="${preserveAspectRatio}" clip-path="url(#${clipId})"${product.altText ? ` aria-label="${escapeSvg(product.altText)}"` : ''} />`
      : [
          `<rect ${rectAttrs(productRegion)} rx="${formatNumber(Math.min(productRegion.width, productRegion.height) * 0.08)}" fill="${escapeSvg(decision.colors.surface)}" opacity="0.68" />`,
          `<path d="M ${formatNumber(productRegion.x + productRegion.width * 0.18)} ${formatNumber(productRegion.y + productRegion.height * 0.62)} C ${formatNumber(productRegion.x + productRegion.width * 0.34)} ${formatNumber(productRegion.y + productRegion.height * 0.28)}, ${formatNumber(productRegion.x + productRegion.width * 0.68)} ${formatNumber(productRegion.y + productRegion.height * 0.28)}, ${formatNumber(productRegion.x + productRegion.width * 0.82)} ${formatNumber(productRegion.y + productRegion.height * 0.62)}" stroke="${escapeSvg(decision.colors.accent)}" stroke-width="${formatNumber(Math.max(4, productRegion.width * 0.015))}" fill="none" opacity="0.72" />`,
          `<text x="${formatNumber(productRegion.x + productRegion.width / 2)}" y="${formatNumber(productRegion.y + productRegion.height / 2)}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeSvg(decision.typography.descriptionFont)}" font-size="${formatNumber(Math.max(18, productRegion.width * 0.045))}" fill="${escapeSvg(decision.colors.description)}">Product Image</text>`,
        ].join('');
    const contactShadow = renderContactShadow(decision, productRegion, template);
    const reflection = renderReflection(decision, productRegion, reflectionId, template);
    const focus = renderFocus(decision, productRegion, focusInset);
    const glow = decision.position.shadowStyle === 'luxury' || decision.position.shadowStyle === 'dramatic' || decision.position.depth === 'immersive'
      ? `<ellipse cx="${formatNumber(centerX + perspective.x)}" cy="${formatNumber(centerY + perspective.y)}" rx="${formatNumber(productRegion.width * 0.46)}" ry="${formatNumber(productRegion.height * 0.36)}" fill="${escapeSvg(decision.colors.accent)}" opacity="${formatNumber(0.12 + (template?.imageEmphasis.glow ?? 0.18) * 0.12)}" filter="url(#${glowId})" />`
      : '';

    return [
      `<g data-product-position="${escapeSvg(decision.position.positionId)}">`,
      contactShadow,
      glow,
      `<g transform="translate(${formatNumber(perspective.x)} ${formatNumber(perspective.y)}) rotate(${formatNumber(decision.position.rotation)} ${formatNumber(centerX)} ${formatNumber(centerY)}) skewX(${formatNumber(perspective.skew)})" filter="url(#${shadowId})">`,
      focus,
      content,
      '</g>',
      reflection,
      '</g>',
    ].join('');
  }
}

function dynamicScale(decision: PosterDesignDecision, template?: RendererTemplateProfile): number {
  const focusScale = decision.position.imagePriority === 'primary'
    ? 1.08
    : decision.position.imagePriority === 'balanced'
      ? 1.02
      : 0.92;
  const cropScale = decision.position.cropMode === 'close-up'
    ? 1.08
    : decision.position.cropMode === 'contain'
      ? 0.98
      : 1;

  return Math.min(1.18, Math.max(0.76, focusScale * cropScale * (template?.imageEmphasis.scaleMultiplier ?? 1)));
}

function scaleRegion(region: Region, scale: number): Region {
  const width = region.width * scale;
  const height = region.height * scale;

  return {
    ...region,
    x: region.x + (region.width - width) / 2,
    y: region.y + (region.height - height) / 2,
    width,
    height,
  };
}

function shadowFilter(decision: PosterDesignDecision, region: Region, template?: RendererTemplateProfile): string {
  const style = template?.shadowPreset.style ?? decision.position.shadowStyle;
  const opacityMultiplier = template?.shadowPreset.opacity ? template.shadowPreset.opacity / 0.24 : 1;
  const blurMultiplier = template?.shadowPreset.blur ? template.shadowPreset.blur / 26 : 1;

  switch (style) {
    case 'none':
      return '';
    case 'contact':
      return `<feDropShadow dx="${formatNumber(template?.shadowPreset.offsetX ?? 0)}" dy="${formatNumber(template?.shadowPreset.offsetY ?? region.height * 0.018)}" stdDeviation="${formatNumber(region.width * 0.018 * blurMultiplier)}" flood-color="${escapeSvg(decision.colors.shadow)}" flood-opacity="${formatNumber(0.24 * opacityMultiplier)}" />`;
    case 'dramatic':
      return `<feDropShadow dx="${formatNumber(template?.shadowPreset.offsetX ?? region.width * 0.035)}" dy="${formatNumber(template?.shadowPreset.offsetY ?? region.height * 0.075)}" stdDeviation="${formatNumber(region.width * 0.055 * blurMultiplier)}" flood-color="${escapeSvg(decision.colors.shadow)}" flood-opacity="${formatNumber(0.52 * opacityMultiplier)}" />`;
    case 'luxury':
      return `<feDropShadow dx="${formatNumber(template?.shadowPreset.offsetX ?? 0)}" dy="${formatNumber(template?.shadowPreset.offsetY ?? region.height * 0.045)}" stdDeviation="${formatNumber(region.width * 0.038 * blurMultiplier)}" flood-color="${escapeSvg(decision.colors.accent)}" flood-opacity="${formatNumber(0.32 * opacityMultiplier)}" />`;
    case 'floating':
      return `<feDropShadow dx="${formatNumber(template?.shadowPreset.offsetX ?? 0)}" dy="${formatNumber(template?.shadowPreset.offsetY ?? region.height * 0.075)}" stdDeviation="${formatNumber(region.width * 0.045 * blurMultiplier)}" flood-color="${escapeSvg(decision.colors.shadow)}" flood-opacity="${formatNumber(0.34 * opacityMultiplier)}" />`;
    case 'soft':
    default:
      return `<feDropShadow dx="${formatNumber(template?.shadowPreset.offsetX ?? 0)}" dy="${formatNumber(template?.shadowPreset.offsetY ?? region.height * 0.04)}" stdDeviation="${formatNumber(region.width * 0.032 * blurMultiplier)}" flood-color="${escapeSvg(decision.colors.shadow)}" flood-opacity="${formatNumber(0.26 * opacityMultiplier)}" />`;
  }
}

function perspectiveOffset(depth: string): { x: number; y: number; skew: number } {
  if (depth === 'immersive') return { x: 12, y: -8, skew: -3 };
  if (depth === 'layered') return { x: 8, y: -4, skew: -2 };
  if (depth === 'foreground') return { x: 4, y: -2, skew: -1 };
  if (depth === 'flat') return { x: 0, y: 0, skew: 0 };
  return { x: 2, y: -1, skew: -0.5 };
}

function renderContactShadow(decision: PosterDesignDecision, region: Region, template?: RendererTemplateProfile): string {
  if (decision.position.shadowStyle === 'none') return '';
  const opacity = (decision.position.shadowStyle === 'dramatic' ? 0.24 : 0.14) * ((template?.shadowPreset.opacity ?? 0.24) / 0.24);

  return `<ellipse cx="${formatNumber(region.x + region.width / 2)}" cy="${formatNumber(region.y + region.height * 0.94)}" rx="${formatNumber(region.width * 0.38)}" ry="${formatNumber(region.height * 0.07)}" fill="${escapeSvg(decision.colors.shadow)}" opacity="${formatNumber(opacity)}" />`;
}

function renderReflection(decision: PosterDesignDecision, region: Region, reflectionId: string, template?: RendererTemplateProfile): string {
  const reflection = template?.imageEmphasis.reflection ?? 0;
  if (reflection <= 0.2 && decision.position.positionId !== 'luxury' && decision.position.positionId !== 'hero' && decision.position.shadowStyle !== 'luxury') {
    return '';
  }

  return `<rect x="${formatNumber(region.x + region.width * 0.14)}" y="${formatNumber(region.y + region.height * 0.92)}" width="${formatNumber(region.width * 0.72)}" height="${formatNumber(region.height * 0.12)}" rx="${formatNumber(region.height * 0.04)}" fill="url(#${reflectionId})" opacity="${formatNumber(Math.max(0.18, reflection || 0.52))}" />`;
}

function renderFocus(decision: PosterDesignDecision, region: Region, inset: number): string {
  if (decision.position.imagePriority === 'supporting' || decision.position.imagePriority === 'atmospheric') return '';

  return `<rect x="${formatNumber(region.x + inset)}" y="${formatNumber(region.y + inset)}" width="${formatNumber(region.width - inset * 2)}" height="${formatNumber(region.height - inset * 2)}" rx="${formatNumber(Math.min(region.width, region.height) * 0.065)}" fill="none" stroke="${escapeSvg(decision.colors.border)}" stroke-width="${formatNumber(Math.max(1, inset * 0.12))}" opacity="0.24" />`;
}

function hexChannel(hex: string, channel: number): number {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return channel === 0 ? 1 : 0.85;
  const value = parseInt(normalized.slice(channel * 2, channel * 2 + 2), 16);
  return Number.isNaN(value) ? 1 : Number((value / 255).toFixed(3));
}

export default ProductRenderer;
