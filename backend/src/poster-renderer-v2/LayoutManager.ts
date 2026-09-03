import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import Canvas, { Region } from './Canvas';
import type { RendererTemplateProfile } from './templates/TemplateTypes';

export interface RendererSafeZones {
  canvas: Region;
  content: Region;
  text: Region;
  image: Region;
  decorations: Region;
}

export interface RendererRegions {
  imageRegion: Region;
  headlineRegion: Region;
  descriptionRegion: Region;
  priceRegion: Region;
  ctaRegion: Region;
  decorationRegions: Region[];
  negativeSpaceRegion: Region;
  safeZones: RendererSafeZones;
}

const MIN_REGION_SIZE = 1;

export class LayoutManager {
  constructor(
    private readonly canvas: Canvas,
    private readonly decision: PosterDesignDecision,
    private readonly template?: RendererTemplateProfile
  ) {}

  calculateRegions(): RendererRegions {
    const canvasRegion = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height, role: 'canvas' };
    const content = this.resolveContentBounds();
    const textBounds = this.resolveTextBounds(content);
    const imageBounds = this.resolveImageBounds(content, textBounds);
    const rhythm = this.spacing();
    const ctaRegion = this.resolveCtaRegion(textBounds);
    const priceRegion = this.resolvePriceRegion(ctaRegion);
    const headlineRegion = this.textRegion(textBounds, 0, this.headlineHeight(textBounds), 'headline');
    const descriptionY = headlineRegion.height + rhythm * 0.65;
    const descriptionAvailableHeight = Math.max(0, priceRegion.y - (headlineRegion.y + descriptionY) - rhythm * 0.45);
    const descriptionRegion = this.textRegion(
      textBounds,
      descriptionY,
      Math.min(Math.max(textBounds.height * 0.18, rhythm * 2.6), descriptionAvailableHeight),
      'description'
    );
    const imageRegion = this.avoidCriticalRegions(
      this.resolveProductRegion(imageBounds),
      [headlineRegion, descriptionRegion, priceRegion, ctaRegion],
      content
    );
    const decorationBounds = this.canvas.insetPx(canvasRegion, Math.max(this.canvas.minDimension(2), rhythm * 0.35));

    return {
      imageRegion,
      headlineRegion,
      descriptionRegion,
      priceRegion,
      ctaRegion,
      decorationRegions: this.resolveDecorationRegions(decorationBounds, imageRegion, headlineRegion),
      negativeSpaceRegion: this.resolveNegativeSpace(content, textBounds, imageRegion),
      safeZones: {
        canvas: canvasRegion,
        content,
        text: textBounds,
        image: imageBounds,
        decorations: decorationBounds,
      },
    };
  }

  private resolveContentBounds(): Region {
    const base = this.canvas.contentBounds;
    const dynamicPadding = this.dynamicPadding();
    const aspectAdjustment = this.canvas.aspectRatio > 1.2
      ? this.canvas.percentX(1.4)
      : this.canvas.aspectRatio < 0.78
        ? this.canvas.percentY(1.1)
        : this.canvas.minDimension(1);

    return {
      ...this.canvas.insetPx(base, Math.round(dynamicPadding + aspectAdjustment)),
      role: 'content',
      padding: dynamicPadding,
    };
  }

  private resolveTextBounds(content: Region): Region {
    const layoutId = this.decision.layout.layoutId;
    const desiredWidth = Math.min(0.86, Math.max(0.28, this.decision.layout.textWidth / 100));
    const alignment = this.horizontalAlignment();
    const vertical = this.anchorVertical(this.decision.layout.textPosition);
    const gap = this.spacing();

    if (layoutId === 'split' || layoutId === 'hero-left' || layoutId === 'hero-right') {
      const width = content.width * Math.min(0.48, Math.max(0.34, desiredWidth));
      const height = content.height * 0.7;
      const side = layoutId === 'hero-left' ? 'right' : layoutId === 'hero-right' ? 'left' : alignment;
      return this.canvas.alignWithin(
        this.canvas.insetPx(content, gap * 0.25),
        width,
        height,
        side === 'center' ? 'left' : side,
        'middle',
        'text'
      );
    }

    if (layoutId === 'story' || this.canvas.aspectRatio < 0.72) {
      return this.canvas.alignWithin(
        content,
        content.width * Math.min(0.9, Math.max(0.5, desiredWidth)),
        content.height * 0.36,
        alignment,
        vertical,
        'text'
      );
    }

    if (layoutId === 'minimal' || layoutId === 'luxury') {
      return this.canvas.alignWithin(
        content,
        content.width * Math.min(0.72, Math.max(0.42, desiredWidth)),
        content.height * 0.34,
        alignment,
        vertical,
        'text'
      );
    }

    return this.canvas.alignWithin(
      content,
      content.width * Math.min(0.82, Math.max(0.44, desiredWidth)),
      content.height * 0.42,
      alignment,
      vertical,
      'text'
    );
  }

  private resolveImageBounds(content: Region, textBounds: Region): Region {
    const layoutId = this.decision.layout.layoutId;
    const gap = this.spacing();

    if (layoutId === 'split' || layoutId === 'hero-left' || layoutId === 'hero-right') {
      const imageOnLeft = layoutId === 'hero-left' || (layoutId === 'split' && textBounds.x > content.x + content.width / 2);
      return {
        x: imageOnLeft ? content.x : textBounds.x + textBounds.width + gap,
        y: content.y,
        width: Math.max(MIN_REGION_SIZE, imageOnLeft ? textBounds.x - content.x - gap : content.x + content.width - (textBounds.x + textBounds.width) - gap),
        height: content.height,
        role: 'image-safe-zone',
      };
    }

    if (layoutId === 'grid') {
      const cells = this.canvas.grid(2, 2, gap, content);
      const candidates = cells.filter((cell) => !regionsOverlap(cell, textBounds));
      return {
        ...(candidates[0] ?? cells[3] ?? content),
        role: 'image-safe-zone',
      };
    }

    if (layoutId === 'diagonal') {
      const imageBounds = this.canvas.alignWithin(
        content,
        content.width * 0.66,
        content.height * 0.66,
        this.decision.layout.imagePosition.includes('left') ? 'left' : 'right',
        this.decision.layout.imagePosition.includes('upper') ? 'top' : 'middle',
        'image-safe-zone'
      );
      return this.canvas.clampRegion(imageBounds, content);
    }

    return this.canvas.alignWithin(
      content,
      content.width * (this.canvas.aspectRatio > 1.2 ? 0.48 : 0.72),
      content.height * (this.canvas.aspectRatio < 0.8 ? 0.45 : 0.62),
      this.anchorHorizontal(this.decision.layout.imagePosition),
      this.anchorVertical(this.decision.layout.imagePosition),
      'image-safe-zone'
    );
  }

  private resolveProductRegion(imageBounds: Region): Region {
    const productScale = Math.min(1.18, Math.max(0.42, this.decision.layout.productScale * (this.template?.imageEmphasis.scaleMultiplier ?? 1)));
    const positionScale = Math.min(1.14, Math.max(0.4, this.decision.position.scale));
    const imagePadding = this.template?.imageEmphasis.padding ?? 0;
    const width = imageBounds.width * Math.min(0.96, productScale * positionScale) * (1 - imagePadding);
    const height = imageBounds.height * Math.min(0.94, Math.max(0.44, positionScale)) * (1 - imagePadding);
    const anchorRegion = this.canvas.alignWithin(
      imageBounds,
      width,
      height,
      this.anchorHorizontal(this.decision.position.anchor),
      this.anchorVertical(this.decision.position.anchor),
      'image'
    );
    const offsetX = Math.round(imageBounds.width * (this.decision.position.offsetX / 100));
    const offsetY = Math.round(imageBounds.height * (this.decision.position.offsetY / 100));

    return this.canvas.clampRegion({
      ...anchorRegion,
      x: anchorRegion.x + offsetX,
      y: anchorRegion.y + offsetY,
      zIndex: this.decision.position.depth === 'foreground' || this.decision.position.depth === 'immersive' ? 30 : 20,
    }, {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      role: 'canvas',
    });
  }

  private avoidCriticalRegions(region: Region, criticalRegions: Region[], content: Region): Region {
    const gap = Math.max(this.spacing() * 0.45, this.canvas.minDimension(1.5));
    const protectedRegions = criticalRegions.filter((critical) => critical.width > 0 && critical.height > 0);
    const canvasBounds = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
    };

    if (!protectedRegions.some((critical) => regionsOverlapWithGap(region, critical, gap))) {
      return this.canvas.clampRegion(region, canvasBounds);
    }

    const protectedZone = unionRegions(protectedRegions);
    const zones: Region[] = [
      {
        x: content.x,
        y: content.y,
        width: content.width,
        height: Math.max(0, protectedZone.y - gap - content.y),
        role: 'free-zone-above',
      },
      {
        x: content.x,
        y: protectedZone.y + protectedZone.height + gap,
        width: content.width,
        height: Math.max(0, content.y + content.height - (protectedZone.y + protectedZone.height + gap)),
        role: 'free-zone-below',
      },
      {
        x: content.x,
        y: content.y,
        width: Math.max(0, protectedZone.x - gap - content.x),
        height: content.height,
        role: 'free-zone-left',
      },
      {
        x: protectedZone.x + protectedZone.width + gap,
        y: content.y,
        width: Math.max(0, content.x + content.width - (protectedZone.x + protectedZone.width + gap)),
        height: content.height,
        role: 'free-zone-right',
      },
    ].filter((zone) => zone.width > MIN_REGION_SIZE && zone.height > MIN_REGION_SIZE);
    const candidates = zones
      .map((zone) => fitRegionInside(region, zone))
      .filter((candidate) => !protectedRegions.some((critical) => regionsOverlapWithGap(candidate, critical, gap * 0.35)))
      .sort((a, b) => (b.width * b.height) - (a.width * a.height));

    return this.canvas.clampRegion(candidates[0] ?? region, canvasBounds);
  }

  private resolveCtaRegion(textBounds: Region): Region {
    const minWidthRatio = this.template?.ctaStyle.minWidthRatio ?? 0.72;
    const heightRatio = this.template?.ctaStyle.heightRatio ?? 0.075;
    const width = Math.min(textBounds.width * Math.max(0.36, minWidthRatio), this.canvas.width * 0.34);
    const height = Math.max(this.canvas.minDimension(heightRatio * 100), this.decision.typography.descriptionSize * 2.35);
    const vertical = this.decision.layout.ctaPosition.includes('top') ? 'top' : 'bottom';

    return this.canvas.alignWithin(
      textBounds,
      width,
      height,
      this.horizontalAlignment(),
      vertical,
      'cta'
    );
  }

  private resolvePriceRegion(ctaRegion: Region): Region {
    const height = Math.max(this.canvas.minDimension(3.8), this.decision.typography.descriptionSize * 1.6);
    const gap = this.spacing() * 0.5;

    return {
      x: ctaRegion.x,
      y: ctaRegion.y - height - gap,
      width: ctaRegion.width,
      height,
      role: 'price',
      alignment: ctaRegion.alignment,
      verticalAlignment: 'bottom',
    };
  }

  private textRegion(textBounds: Region, offsetY: number, height: number, role: string): Region {
    const maxWidth = Math.min(textBounds.width, this.canvas.width * (this.decision.typography.safeTextWidth / 100));
    const resolvedHeight = height < 12 ? 0 : Math.min(height, Math.max(MIN_REGION_SIZE, textBounds.height - offsetY));

    return {
      x: textBounds.alignment === 'right'
        ? textBounds.x + textBounds.width - maxWidth
        : textBounds.alignment === 'center'
          ? textBounds.x + (textBounds.width - maxWidth) / 2
          : textBounds.x,
      y: textBounds.y + offsetY,
      width: maxWidth,
      height: resolvedHeight,
      role,
      alignment: textBounds.alignment,
      verticalAlignment: 'top',
    };
  }

  private resolveDecorationRegions(bounds: Region, imageRegion: Region, headlineRegion: Region): Region[] {
    const gap = this.spacing();
    const cells = this.canvas.grid(4, 4, gap * 0.5, bounds);

    switch (this.decision.decorations.placement) {
      case 'corners':
      case 'frame':
        return [cells[0]!, cells[3]!, cells[12]!, cells[15]!].map((region) => ({ ...region, role: 'decoration' }));
      case 'diagonal':
        return [cells[3]!, cells[6]!, cells[9]!, cells[12]!].map((region) => ({ ...region, role: 'decoration' }));
      case 'around-product':
        return [this.canvas.insetPx(imageRegion, -Math.round(gap * 0.5))];
      case 'text-adjacent':
        return [this.canvas.insetPx(headlineRegion, -Math.round(gap * 0.35))];
      case 'background':
      case 'full-composition':
      case 'edges':
      case 'foreground':
        return [bounds];
      case 'none':
      default:
        return [];
    }
  }

  private resolveNegativeSpace(content: Region, textBounds: Region, imageRegion: Region): Region {
    const leftSpace = Math.max(0, Math.min(textBounds.x, imageRegion.x) - content.x);
    const rightStart = Math.max(textBounds.x + textBounds.width, imageRegion.x + imageRegion.width);
    const rightSpace = Math.max(0, content.x + content.width - rightStart);

    if (rightSpace > leftSpace) {
      return {
        x: rightStart,
        y: content.y,
        width: rightSpace,
        height: content.height,
        role: 'negative-space',
      };
    }

    return {
      x: content.x,
      y: content.y,
      width: leftSpace,
      height: content.height,
      role: 'negative-space',
    };
  }

  private headlineHeight(textBounds: Region): number {
    const lineHeight = this.decision.typography.headlineSize *
      this.decision.typography.lineHeight *
      (this.template?.typographyRatios.lineHeightMultiplier ?? 1) *
      (this.template?.typographyRatios.headlineScale ?? 1);
    const maxLines = this.decision.layout.layoutId === 'story' ? 4 : 3;
    return Math.min(textBounds.height * 0.54, Math.max(lineHeight * 1.35, lineHeight * maxLines));
  }

  private spacing(): number {
    const templateBase = (this.template?.spacingSystem.base ?? 10) / 10;
    const compactness = this.template?.whitespaceProfile.compactness ?? 1;
    return Math.max(this.canvas.minDimension(1.6), this.canvas.minDimension(this.decision.layout.spacing) * templateBase * compactness);
  }

  private dynamicPadding(): number {
    const layoutPadding = this.canvas.minDimension(this.decision.layout.padding);
    const visualWeightPadding = this.decision.background.visualWeight === 'light'
      ? this.canvas.minDimension(1.3)
      : this.decision.background.visualWeight === 'cinematic' || this.decision.background.visualWeight === 'bold'
        ? this.canvas.minDimension(0.5)
        : this.canvas.minDimension(0.9);

    return Math.max(
      this.canvas.minDimension(2),
      (layoutPadding + visualWeightPadding + this.canvas.minDimension(this.template?.spacingSystem.edgePadding ?? 0)) *
        (this.template?.whitespaceProfile.marginMultiplier ?? 1)
    );
  }

  private horizontalAlignment(): 'left' | 'center' | 'right' {
    if (this.decision.layout.alignment === 'right') return 'right';
    if (this.decision.layout.alignment === 'center' || this.decision.layout.alignment === 'balanced') return 'center';
    return 'left';
  }

  private anchorHorizontal(anchor: string): 'left' | 'center' | 'right' {
    if (anchor.includes('left')) return 'left';
    if (anchor.includes('right')) return 'right';
    return 'center';
  }

  private anchorVertical(anchor: string): 'top' | 'middle' | 'bottom' {
    if (anchor.includes('top') || anchor.includes('upper')) return 'top';
    if (anchor.includes('bottom') || anchor.includes('lower')) return 'bottom';
    return 'middle';
  }

}

function regionsOverlap(a: Region, b: Region): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function regionsOverlapWithGap(a: Region, b: Region, gap: number): boolean {
  return a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y;
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

function fitRegionInside(region: Region, zone: Region): Region {
  const aspectRatio = region.width / Math.max(1, region.height);
  let width = Math.min(region.width, zone.width);
  let height = width / aspectRatio;

  if (height > zone.height) {
    height = zone.height;
    width = height * aspectRatio;
  }

  return {
    ...region,
    x: zone.x + (zone.width - width) / 2,
    y: zone.y + (zone.height - height) / 2,
    width,
    height,
  };
}

export default LayoutManager;
