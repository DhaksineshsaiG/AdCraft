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
    const productRegion = scaleRegion(region, dynamicScale(decision, template));
    const isCover = decision.position.cropMode === 'cover' || decision.position.cropMode === 'full-bleed';
    const preserveAspectRatio = isCover ? 'xMidYMid slice' : 'xMidYMid meet';
    const clipAttr = isCover ? ` clip-path="url(#${clipId})"` : '';

    builder.addDef(
      `<clipPath id="${clipId}"><rect ${rectAttrs(productRegion)} rx="${formatNumber(Math.min(productRegion.width, productRegion.height) * 0.04)}" /></clipPath>`
    );

    builder.addDef(
      `<filter id="${shadowId}" x="-30%" y="-30%" width="160%" height="160%">` +
        shadowFilter(decision, productRegion, template) +
      `</filter>`
    );

    builder.addDef(
      `<filter id="${glowId}" x="-40%" y="-40%" width="180%" height="180%">` +
        `<feGaussianBlur stdDeviation="${formatNumber(Math.max(6, productRegion.width * 0.03))}" result="blur" />` +
        `<feColorMatrix in="blur" type="matrix" values="0 0 0 0 ${hexChannel(decision.colors.accent, 0)} 0 0 0 0 ${hexChannel(decision.colors.accent, 1)} 0 0 0 0 ${hexChannel(decision.colors.accent, 2)} 0 0 0 0.28 0" />` +
      `</filter>`
    );

    builder.addDef(
      `<linearGradient id="${reflectionId}" x1="0%" y1="0%" x2="0%" y2="100%">` +
        `<stop offset="0%" stop-color="${escapeSvg(decision.colors.accent)}" stop-opacity="0.18" />` +
        `<stop offset="100%" stop-color="${escapeSvg(decision.colors.background)}" stop-opacity="0" />` +
      `</linearGradient>`
    );

    const content = product.imageUrl
      ? `<image href="${escapeSvg(product.imageUrl)}" ${rectAttrs(productRegion)} preserveAspectRatio="${preserveAspectRatio}"${clipAttr}${product.altText ? ` aria-label="${escapeSvg(product.altText)}"` : ''} />`
      : [
          `<rect ${rectAttrs(productRegion)} rx="${formatNumber(Math.min(productRegion.width, productRegion.height) * 0.06)}" fill="${escapeSvg(decision.colors.surface)}" opacity="0.88" />`,
          `<circle cx="${formatNumber(productRegion.x + productRegion.width / 2)}" cy="${formatNumber(productRegion.y + productRegion.height * 0.44)}" r="${formatNumber(Math.min(productRegion.width, productRegion.height) * 0.2)}" fill="${escapeSvg(decision.colors.accent)}" opacity="0.16" />`,
          `<path d="M ${formatNumber(productRegion.x + productRegion.width * 0.32)} ${formatNumber(productRegion.y + productRegion.height * 0.62)} C ${formatNumber(productRegion.x + productRegion.width * 0.42)} ${formatNumber(productRegion.y + productRegion.height * 0.38)}, ${formatNumber(productRegion.x + productRegion.width * 0.58)} ${formatNumber(productRegion.y + productRegion.height * 0.38)}, ${formatNumber(productRegion.x + productRegion.width * 0.68)} ${formatNumber(productRegion.y + productRegion.height * 0.62)}" stroke="${escapeSvg(decision.colors.accent)}" stroke-width="${formatNumber(Math.max(3, productRegion.width * 0.012))}" stroke-linecap="round" fill="none" opacity="0.85" />`,
          `<text x="${formatNumber(productRegion.x + productRegion.width / 2)}" y="${formatNumber(productRegion.y + productRegion.height * 0.74)}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeSvg(decision.typography.headlineFont)}" font-size="${formatNumber(Math.max(18, productRegion.width * 0.042))}" font-weight="600" fill="${escapeSvg(decision.colors.headline)}">${escapeSvg(product.altText || 'Featured Product')}</text>`,
        ].join('');

    const contactShadow = renderContactShadow(decision, productRegion, template);
    const glow =
      decision.position.shadowStyle === 'luxury' || decision.position.shadowStyle === 'dramatic' || template?.shadowPreset.style === 'glow'
        ? `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(centerY)}" rx="${formatNumber(productRegion.width * 0.44)}" ry="${formatNumber(productRegion.height * 0.36)}" fill="${escapeSvg(decision.colors.accent)}" opacity="0.10" filter="url(#${glowId})" />`
        : '';

    const backing = renderProductBacking(decision, productRegion, template?.productBacking, centerX, centerY);

    const rotation = Math.max(-2.5, Math.min(2.5, (decision.position.rotation || 0) * 0.12));
    const transform = rotation !== 0
      ? ` transform="rotate(${formatNumber(rotation)} ${formatNumber(centerX)} ${formatNumber(centerY)})"`
      : '';

    return [
      `<g data-product-position="${escapeSvg(decision.position.positionId)}">`,
      backing,
      contactShadow,
      glow,
      `<g${transform} filter="url(#${shadowId})">`,
      content,
      '</g>',
      '</g>',
    ].join('');
  }
}

function renderProductBacking(
  decision: PosterDesignDecision,
  region: Region,
  backing: RendererTemplateProfile['productBacking'],
  centerX: number,
  centerY: number
): string {
  if (!backing || backing === 'none') return '';

  if (backing === 'halo') {
    const haloRadius = Math.round(Math.min(region.width, region.height) * 0.46);
    return [
      `<circle cx="${formatNumber(centerX)}" cy="${formatNumber(centerY)}" r="${formatNumber(haloRadius)}" fill="${escapeSvg(decision.colors.accent)}" opacity="0.12" />`,
      `<circle cx="${formatNumber(centerX)}" cy="${formatNumber(centerY)}" r="${formatNumber(haloRadius * 0.72)}" fill="${escapeSvg(decision.colors.surface)}" opacity="0.22" />`,
    ].join('');
  }

  if (backing === 'arch') {
    const archW = Math.round(region.width * 0.88);
    const archH = Math.round(region.height * 0.94);
    const archX = region.x + Math.round((region.width - archW) / 2);
    const archY = region.y + Math.round((region.height - archH) / 2);
    const archR = Math.round(archW / 2);

    return `<path d="M ${formatNumber(archX)} ${formatNumber(archY + archH)} L ${formatNumber(archX)} ${formatNumber(archY + archR)} A ${formatNumber(archR)} ${formatNumber(archR)} 0 0 1 ${formatNumber(archX + archW)} ${formatNumber(archY + archR)} L ${formatNumber(archX + archW)} ${formatNumber(archY + archH)} Z" fill="${escapeSvg(decision.colors.surface)}" opacity="0.32" stroke="${escapeSvg(decision.colors.accent)}" stroke-width="1.2" stroke-opacity="0.28" />`;
  }

  if (backing === 'pedestal') {
    const pedW = Math.round(region.width * 0.74);
    const pedH = Math.round(Math.max(16, region.height * 0.08));
    const pedX = centerX;
    const pedY = region.y + region.height * 0.92;

    return [
      `<ellipse cx="${formatNumber(pedX)}" cy="${formatNumber(pedY + pedH * 0.5)}" rx="${formatNumber(pedW * 0.5)}" ry="${formatNumber(pedH * 0.5)}" fill="${escapeSvg(decision.colors.shadow)}" opacity="0.25" />`,
      `<ellipse cx="${formatNumber(pedX)}" cy="${formatNumber(pedY)}" rx="${formatNumber(pedW * 0.5)}" ry="${formatNumber(pedH * 0.42)}" fill="${escapeSvg(decision.colors.surface)}" stroke="${escapeSvg(decision.colors.border)}" stroke-width="1" opacity="0.85" />`,
    ].join('');
  }

  if (backing === 'card') {
    const cardW = Math.round(region.width * 0.92);
    const cardH = Math.round(region.height * 0.94);
    const cardX = region.x + Math.round((region.width - cardW) / 2);
    const cardY = region.y + Math.round((region.height - cardH) / 2);

    return `<rect x="${formatNumber(cardX)}" y="${formatNumber(cardY)}" width="${formatNumber(cardW)}" height="${formatNumber(cardH)}" rx="20" fill="${escapeSvg(decision.colors.surface)}" opacity="0.28" stroke="${escapeSvg(decision.colors.border)}" stroke-width="1" stroke-opacity="0.25" />`;
  }

  return '';
}

function dynamicScale(decision: PosterDesignDecision, template?: RendererTemplateProfile): number {
  const emphasis = template?.imageEmphasis.scaleMultiplier ?? 1;
  const decisionScale = (decision.layout.productScale || 0.5) > 0.6 ? 0.98 : 0.94;
  return Math.min(1.0, Math.max(0.92, decisionScale * emphasis));
}

function scaleRegion(region: Region, scale: number): Region {
  const width = Math.round(region.width * scale);
  const height = Math.round(region.height * scale);

  return {
    ...region,
    x: Math.round(region.x + (region.width - width) / 2),
    y: Math.round(region.y + (region.height - height) / 2),
    width,
    height,
  };
}

function shadowFilter(decision: PosterDesignDecision, region: Region, template?: RendererTemplateProfile): string {
  const style = template?.shadowPreset.style ?? decision.position.shadowStyle;

  switch (style) {
    case 'none':
      return '';
    case 'contact':
      return `<feDropShadow dx="0" dy="${formatNumber(Math.max(4, region.height * 0.02))}" stdDeviation="${formatNumber(Math.max(6, region.width * 0.02))}" flood-color="${escapeSvg(decision.colors.shadow)}" flood-opacity="0.22" />`;
    case 'dramatic':
      return `<feDropShadow dx="0" dy="${formatNumber(Math.max(8, region.height * 0.04))}" stdDeviation="${formatNumber(Math.max(12, region.width * 0.035))}" flood-color="${escapeSvg(decision.colors.shadow)}" flood-opacity="0.38" />`;
    case 'luxury':
      return `<feDropShadow dx="0" dy="${formatNumber(Math.max(6, region.height * 0.03))}" stdDeviation="${formatNumber(Math.max(10, region.width * 0.028))}" flood-color="${escapeSvg(decision.colors.shadow)}" flood-opacity="0.28" />`;
    case 'floating':
    case 'soft':
    default:
      return `<feDropShadow dx="0" dy="${formatNumber(Math.max(6, region.height * 0.025))}" stdDeviation="${formatNumber(Math.max(8, region.width * 0.025))}" flood-color="${escapeSvg(decision.colors.shadow)}" flood-opacity="0.25" />`;
  }
}

function renderContactShadow(decision: PosterDesignDecision, region: Region, template?: RendererTemplateProfile): string {
  if (decision.position.shadowStyle === 'none') return '';
  const baseOpacity = template?.shadowPreset.opacity ?? 0.2;
  const opacity = decision.position.shadowStyle === 'dramatic' ? baseOpacity * 1.3 : baseOpacity * 0.85;

  return `<ellipse cx="${formatNumber(region.x + region.width / 2)}" cy="${formatNumber(region.y + region.height * 0.97)}" rx="${formatNumber(region.width * 0.36)}" ry="${formatNumber(Math.max(8, region.height * 0.04))}" fill="${escapeSvg(decision.colors.shadow)}" opacity="${formatNumber(opacity)}" />`;
}

function hexChannel(hex: string, channel: number): number {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return channel === 0 ? 1 : 0.85;
  const value = parseInt(normalized.slice(channel * 2, channel * 2 + 2), 16);
  return Number.isNaN(value) ? 1 : Number((value / 255).toFixed(3));
}

export default ProductRenderer;
