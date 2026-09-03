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

    return [
      `<g opacity="${formatNumber(decision.decorations.opacity)}" data-decoration="${escapeSvg(decision.decorations.decorationId)}" data-layering="${escapeSvg(decision.decorations.layering)}"${mask}>`,
      groups,
      '</g>',
    ].join('');
  }

  private createSafeZoneMask(builder: SVGBuilder, regions: Region[], protectedRegions: Region[], template?: RendererTemplateProfile): string | undefined {
    const protectedWithArea = protectedRegions.filter((region) => region.width > 0 && region.height > 0);
    if (protectedWithArea.length === 0) return undefined;

    const maskBounds = unionRegions([...regions, ...protectedWithArea]);
    const maskId = builder.nextId('renderer2-decoration-mask');
    const blockers = protectedWithArea.map((region) => {
      const padding = Math.max(8, Math.min(region.width, region.height) * (template?.decorationPreset.protectedPadding ?? 0.04));
      return `<rect x="${formatNumber(region.x - padding)}" y="${formatNumber(region.y - padding)}" width="${formatNumber(region.width + padding * 2)}" height="${formatNumber(region.height + padding * 2)}" rx="${formatNumber(padding)}" fill="#000000" />`;
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
    const strokeWidth = Math.max(1, Math.min(region.width, region.height) * 0.006 * (template?.decorationPreset.scale ?? 1));
    const layerOffset = layerOffsetFor(decision.decorations.layering);
    const backgroundLayer = this.renderLayer(decision, region, count, strokeWidth, regionIndex, -1, layerOffset * 0.45);
    const midLayer = this.renderLayer(decision, region, count, strokeWidth, regionIndex, 0, 0);
    const frontLayer = decision.decorations.layering === 'stacked' ||
      decision.decorations.layering === 'interwoven' ||
      decision.decorations.layering === 'cinematic'
      ? this.renderLayer(decision, region, Math.max(2, Math.ceil(count / 2)), strokeWidth * 0.75, regionIndex, 1, -layerOffset * 0.7)
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
    const opacity = layer < 0 ? 0.32 : layer > 0 ? 0.42 : 0.68;

    if (decision.decorations.placement === 'frame') {
      const inset = Math.max(0, (layer + 1) * strokeWidth * 4);
      return `<rect x="${formatNumber(region.x + inset)}" y="${formatNumber(region.y + inset)}" width="${formatNumber(region.width - inset * 2)}" height="${formatNumber(region.height - inset * 2)}" fill="none" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth)}" rx="${formatNumber(strokeWidth * 8)}" opacity="${formatNumber(opacity)}" />`;
    }

    if (decision.decorations.placement === 'diagonal') {
      return Array.from({ length: count }, (_, index) => {
        const progress = (index + 1) / (count + 1);
        return `<path d="M ${formatNumber(region.x - offset)} ${formatNumber(region.y + region.height * progress + offset)} L ${formatNumber(region.x + region.width + offset)} ${formatNumber(region.y + region.height * Math.max(0, progress - 0.24) - offset)}" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth * (2.4 + layer * 0.5))}" stroke-linecap="round" fill="none" opacity="${formatNumber(opacity)}" />`;
      }).join('');
    }

    if (decision.decorations.placement === 'text-adjacent') {
      return Array.from({ length: Math.max(2, Math.ceil(count / 2)) }, (_, index) => {
        const y = region.y + region.height - strokeWidth * (index + 2) + offset;
        const width = region.width * (0.2 + (index + 1) / (count + 2) * 0.62);
        return `<line x1="${formatNumber(region.x)}" y1="${formatNumber(y)}" x2="${formatNumber(region.x + width)}" y2="${formatNumber(y)}" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth)}" opacity="${formatNumber(opacity)}" />`;
      }).join('');
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
    count: number,
    color: string,
    strokeWidth: number,
    opacity: number,
    offset: number
  ): string {
    const centerX = region.x + region.width / 2;
    const centerY = region.y + region.height / 2;
    const orbit = `<ellipse cx="${formatNumber(centerX)}" cy="${formatNumber(centerY + offset)}" rx="${formatNumber(region.width * 0.49)}" ry="${formatNumber(region.height * 0.38)}" fill="none" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth)}" opacity="${formatNumber(opacity * 0.55)}" />`;
    const particles = Array.from({ length: count }, (_, index) => {
      const angle = (Math.PI * 2 * index) / count + (offset * 0.01);
      const x = centerX + Math.cos(angle) * region.width * 0.47;
      const y = centerY + Math.sin(angle) * region.height * 0.36;
      return `<circle cx="${formatNumber(x)}" cy="${formatNumber(y)}" r="${formatNumber(strokeWidth * (2.4 + index % 2))}" fill="${escapeSvg(index % 2 === 0 ? color : decision.colors.decorative)}" opacity="${formatNumber(opacity)}" />`;
    }).join('');

    return orbit + particles;
  }

  private renderEdgeSystem(
    decision: PosterDesignDecision,
    region: Region,
    count: number,
    color: string,
    strokeWidth: number,
    opacity: number,
    offset: number
  ): string {
    const rails = [
      `<path d="M ${formatNumber(region.x + offset)} ${formatNumber(region.y + region.height * 0.18)} C ${formatNumber(region.x + region.width * 0.28)} ${formatNumber(region.y + region.height * 0.08)}, ${formatNumber(region.x + region.width * 0.72)} ${formatNumber(region.y + region.height * 0.08)}, ${formatNumber(region.x + region.width - offset)} ${formatNumber(region.y + region.height * 0.18)}" stroke="${escapeSvg(color)}" stroke-width="${formatNumber(strokeWidth)}" fill="none" opacity="${formatNumber(opacity)}" />`,
      `<path d="M ${formatNumber(region.x + offset)} ${formatNumber(region.y + region.height * 0.82)} C ${formatNumber(region.x + region.width * 0.28)} ${formatNumber(region.y + region.height * 0.92)}, ${formatNumber(region.x + region.width * 0.72)} ${formatNumber(region.y + region.height * 0.92)}, ${formatNumber(region.x + region.width - offset)} ${formatNumber(region.y + region.height * 0.82)}" stroke="${escapeSvg(decision.colors.decorative)}" stroke-width="${formatNumber(strokeWidth)}" fill="none" opacity="${formatNumber(opacity * 0.65)}" />`,
    ];
    const nodes = Array.from({ length: count }, (_, index) => {
      const x = region.x + region.width * ((index + 1) / (count + 1));
      const y = index % 2 === 0 ? region.y + region.height * 0.18 : region.y + region.height * 0.82;
      return `<rect x="${formatNumber(x - strokeWidth * 2)}" y="${formatNumber(y - strokeWidth * 2)}" width="${formatNumber(strokeWidth * 4)}" height="${formatNumber(strokeWidth * 4)}" rx="${formatNumber(strokeWidth)}" fill="${escapeSvg(color)}" opacity="${formatNumber(opacity)}" />`;
    });

    return [...rails, ...nodes].join('');
  }

  private renderParticleField(
    region: Region,
    count: number,
    color: string,
    strokeWidth: number,
    opacity: number,
    regionIndex: number,
    offset: number
  ): string {
    return Array.from({ length: count }, (_, index) => {
      const progress = (index + 1) / (count + 1);
      const x = region.x + region.width * progress + offset;
      const y = region.y + region.height * (((regionIndex + index + 1) % 5) / 5) - offset;
      const radius = strokeWidth * (2.4 + index % 3);

      return `<circle cx="${formatNumber(x)}" cy="${formatNumber(y)}" r="${formatNumber(radius)}" fill="${escapeSvg(color)}" opacity="${formatNumber(opacity)}" />`;
    }).join('');
  }
}

function densityCount(density: string): number {
  if (density === 'high') return 9;
  if (density === 'medium') return 6;
  if (density === 'low') return 3;
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
