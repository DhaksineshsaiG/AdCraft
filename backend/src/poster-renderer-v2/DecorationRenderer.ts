import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import type { Region } from './Canvas';
import { escapeSvg, formatNumber, rectAttrs, SVGBuilder } from './SVGBuilder';
import type { RendererTemplateProfile } from './templates/TemplateTypes';

export class DecorationRenderer {
  render(
    decision: PosterDesignDecision,
    regions: Region[],
    builder: SVGBuilder,
    protectedRegions: Region[] = [],
    template?: RendererTemplateProfile
  ): string {
    if (regions.length === 0 || decision.decorations.density === 'none') return '';

    const groups = regions.map((region, regionIndex) =>
      this.renderComposition(decision, region, regionIndex, template)
    ).join('');
    const maskId = this.createSafeZoneMask(builder, regions, protectedRegions, template);
    const mask = maskId ? ` mask="url(#${maskId})"` : '';
    const groupOpacity = Math.min(0.24, Math.max(0.06, decision.decorations.opacity * 0.45 * (template?.decorationPreset.intensity ?? 1)));

    return [
      `<g opacity="${formatNumber(groupOpacity)}" data-decoration="${escapeSvg(decision.decorations.decorationId)}" data-layering="${escapeSvg(decision.decorations.layering)}"${mask}>`,
      groups,
      '</g>',
    ].join('');
  }

  private createSafeZoneMask(builder: SVGBuilder, regions: Region[], protectedRegions: Region[], template?: RendererTemplateProfile): string | undefined {
    const protectedWithArea = protectedRegions.filter((region) => region.width > 0 && region.height > 0);
    if (protectedWithArea.length === 0) return undefined;

    const maskBounds = unionRegions([...regions, ...protectedWithArea]);
    const maskId = builder.nextId('renderer2-decoration-mask');
    const templatePaddingMultiplier = template?.decorationPreset.protectedPadding ? (template.decorationPreset.protectedPadding / 0.04) : 1;
    const blockers = protectedWithArea.map((region) => {
      const isImage = region.role === 'image';
      const basePadding = Math.round((isImage ? 36 : 24) * templatePaddingMultiplier);
      const padding = Math.max(basePadding, Math.round(Math.min(region.width, region.height) * (isImage ? 0.08 : 0.05)));
      return `<rect x="${formatNumber(region.x - padding)}" y="${formatNumber(region.y - padding)}" width="${formatNumber(region.width + padding * 2)}" height="${formatNumber(region.height + padding * 2)}" rx="${formatNumber(Math.min(32, padding))}" fill="#000000" />`;
    }).join('');

    builder.addDef(
      `<mask id="${maskId}" maskUnits="userSpaceOnUse">` +
        `<rect ${rectAttrs(maskBounds)} fill="#ffffff" />` +
        blockers +
      `</mask>`
    );

    return maskId;
  }

  private renderComposition(
    decision: PosterDesignDecision,
    region: Region,
    regionIndex: number,
    template?: RendererTemplateProfile
  ): string {
    const count = Math.max(1, Math.round(densityCount(decision.decorations.density) * (template?.decorationPreset.intensity ?? 1)));
    const strokeWidth = Math.max(1, Math.min(2.5, Math.min(region.width, region.height) * 0.004 * (template?.decorationPreset.scale ?? 1)));
    const layerOffset = layerOffsetFor(decision.decorations.layering);
    const backgroundLayer = this.renderLayer(decision, region, count, strokeWidth, regionIndex, -1, layerOffset * 0.3);
    const midLayer = this.renderLayer(decision, region, count, strokeWidth, regionIndex, 0, 0);
    const frontLayer = decision.decorations.layering === 'cinematic'
      ? this.renderLayer(decision, region, 1, strokeWidth * 0.8, regionIndex, 1, -layerOffset * 0.5)
      : '';

    return [
      `<g data-decoration-region="${regionIndex}" data-placement="${escapeSvg(decision.decorations.placement)}">`,
      backgroundLayer,
      midLayer,
      frontLayer,
      '</g>',
    ].join('');
  }

  private renderLayer(
    decision: PosterDesignDecision,
    region: Region,
    count: number,
    strokeWidth: number,
    regionIndex: number,
    layer: number,
    offset: number
  ): string {
    const color = layer < 0 ? decision.colors.decorative : layer > 0 ? decision.colors.headline : decision.colors.accent;
    const opacity = layer < 0 ? 0.16 : layer > 0 ? 0.22 : 0.28;

    if (decision.decorations.placement === 'frame') {
      const inset = Math.max(0, (layer + 1) * strokeWidth * 2);
      return `<rect x="${formatNumber(region.x + inset)}" y="${formatNumber(region.y + inset)}" width="${formatNumber(region.width - inset * 2)}" height="${formatNumber(region.height - inset * 2)}" fill="none" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth)}" rx="${formatNumber(strokeWidth * 3)}" opacity="${formatNumber(opacity * 0.5)}" />`;
    }

    if (decision.decorations.placement === 'diagonal') {
      const lineLength = Math.min(48, Math.min(region.width, region.height) * 0.22);
      return Array.from({ length: Math.min(2, count) }, (_, index) => {
        const xOffset = index * strokeWidth * 5;
        const x1 = region.x + region.width * 0.1 + xOffset;
        const y1 = region.y + region.height * 0.85;
        const x2 = x1 + lineLength;
        const y2 = y1 - lineLength * 0.5;
        return `<line x1="${formatNumber(x1)}" y1="${formatNumber(y1)}" x2="${formatNumber(x2)}" y2="${formatNumber(y2)}" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth)}" stroke-linecap="round" opacity="${formatNumber(opacity * 0.5)}" />`;
      }).join('');
    }

    if (decision.decorations.placement === 'text-adjacent') {
      const ruleWidth = Math.min(50, region.width * 0.35);
      return `<line x1="${formatNumber(region.x)}" y1="${formatNumber(region.y + region.height * 0.5)}" x2="${formatNumber(region.x + ruleWidth)}" y2="${formatNumber(region.y + region.height * 0.5)}" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(Math.min(2, strokeWidth * 1.2))}" stroke-linecap="round" opacity="${formatNumber(opacity * 0.7)}" />`;
    }

    if (decision.decorations.placement === 'around-product') {
      return this.renderOrbit(decision, region, count, color, strokeWidth, opacity, offset);
    }

    if (decision.decorations.placement === 'edges' || decision.decorations.placement === 'full-composition') {
      return this.renderEdgeSystem(decision, region, count, color, strokeWidth, opacity, offset);
    }

    return this.renderParticleField(region, count, color, strokeWidth, opacity, regionIndex, offset);
  }

  private renderOrbit(
    decision: PosterDesignDecision,
    region: Region,
    _count: number,
    color: string,
    strokeWidth: number,
    opacity: number,
    offset: number
  ): string {
    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;
    const rx = region.width * 0.46;
    const ry = region.height * 0.38;

    const outerRing = `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(centerY + offset)}" rx="${formatNumber(rx)}" ry="${formatNumber(ry)}" fill="none" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth * 0.8)}" opacity="${formatNumber(opacity * 0.35)}" />`;
    const innerRing = `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(centerY + offset)}" rx="${formatNumber(rx * 0.94)}" ry="${formatNumber(ry * 0.94)}" fill="none" stroke="${escapeSvg(decision.colors.decorative)}" stroke-width="${formatNumber(strokeWidth * 0.5)}" stroke-dasharray="4 8" opacity="${formatNumber(opacity * 0.25)}" />`;

    return outerRing + innerRing;
  }

  private renderEdgeSystem(
    _decision: PosterDesignDecision,
    region: Region,
    _count: number,
    color: string,
    strokeWidth: number,
    opacity: number,
    _offset: number
  ): string {
    const crossSize = Math.max(8, Math.min(16, strokeWidth * 6));
    const renderCross = (cx: number, cy: number) =>
      `<path d="M ${formatNumber(cx - crossSize / 2)} ${formatNumber(cy)} L ${formatNumber(cx + crossSize / 2)} ${formatNumber(cy)} M ${formatNumber(cx)} ${formatNumber(cy - crossSize / 2)} L ${formatNumber(cx)} ${formatNumber(cy + crossSize / 2)}" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth * 0.8)}" opacity="${formatNumber(opacity * 0.5)}" />`;

    return [
      renderCross(region.x + crossSize, region.y + crossSize),
      renderCross(region.x + region.width - crossSize, region.y + crossSize),
      renderCross(region.x + crossSize, region.y + region.height - crossSize),
      renderCross(region.x + region.width - crossSize, region.y + region.height - crossSize),
    ].join('');
  }

  private renderParticleField(
    region: Region,
    count: number,
    color: string,
    strokeWidth: number,
    opacity: number,
    _regionIndex: number,
    offset: number
  ): string {
    const dotCount = Math.min(3, Math.max(1, count));
    return Array.from({ length: dotCount }, (_, index) => {
      const cx = region.x + (region.width / (dotCount + 1)) * (index + 1);
      const cy = region.y + region.height * 0.5 + offset;
      return `<circle cx="${formatNumber(cx)}" cy="${formatNumber(cy)}" r="${formatNumber(strokeWidth * 1.2)}" fill="${escapeSvg(color)}" opacity="${formatNumber(opacity * 0.4)}" />`;
    }).join('');
  }
}

function densityCount(density: string): number {
  if (density === 'high') return 4;
  if (density === 'medium') return 3;
  if (density === 'low') return 2;
  return 0;
}

function layerOffsetFor(layering: string): number {
  if (layering === 'cinematic') return 22;
  if (layering === 'interwoven') return 16;
  if (layering === 'stacked') return 10;
  return 6;
}

function unionRegions(regions: Region[]): Region {
  const minX = Math.min(...regions.map((region) => region.x));
  const minY = Math.min(...regions.map((region) => region.y));
  const maxX = Math.max(...regions.map((region) => region.x + region.width));
  const maxY = Math.max(...regions.map((region) => region.y + region.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export default DecorationRenderer;
