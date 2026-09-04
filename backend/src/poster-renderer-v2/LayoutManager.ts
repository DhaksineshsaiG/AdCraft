import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import Canvas, { Region } from './Canvas';
import type { RendererTemplateProfile, TemplateCompositionMode } from './templates/TemplateTypes';

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

export class LayoutManager {
  constructor(
    private readonly canvas: Canvas,
    private readonly decision: PosterDesignDecision,
    private readonly template?: RendererTemplateProfile
  ) {}

  calculateRegions(): RendererRegions {
    const canvasRegion: Region = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      role: 'canvas',
    };

    const content = this.resolveContentBounds();
    const mode = this.resolveCompositionMode();
    const regions = this.dispatchCompositionMode(mode, content);

    const decorationBounds = this.canvas.insetPx(
      canvasRegion,
      Math.max(this.canvas.minDimension(1.5), 16)
    );

    const decorationRegions = this.resolveDecorationRegions(
      decorationBounds,
      regions.imageRegion,
      regions.headlineRegion
    );

    const safeZones: RendererSafeZones = {
      canvas: canvasRegion,
      content,
      text: regions.textBounds,
      image: regions.imageRegion,
      decorations: decorationBounds,
    };

    const negativeSpaceRegion = this.resolveNegativeSpace(
      content,
      regions.textBounds,
      regions.imageRegion
    );

    return {
      imageRegion: regions.imageRegion,
      headlineRegion: regions.headlineRegion,
      descriptionRegion: regions.descriptionRegion,
      priceRegion: regions.priceRegion,
      ctaRegion: regions.ctaRegion,
      decorationRegions,
      negativeSpaceRegion,
      safeZones,
    };
  }

  private resolveContentBounds(): Region {
    const base = this.canvas.contentBounds;
    const padding = this.dynamicPadding();

    return {
      ...this.canvas.insetPx(base, padding),
      role: 'content',
      padding,
    };
  }

  private resolveCompositionMode(): TemplateCompositionMode {
    let mode: TemplateCompositionMode = this.template?.compositionMode ?? 'product-center';

    // Adapt to extreme aspect ratios for visual elegance
    if (this.canvas.aspectRatio > 1.28) {
      if (mode === 'product-center' || mode === 'product-bottom') {
        mode = this.decision.layout.imagePosition.includes('left') ? 'product-left' : 'product-right';
      }
    } else if (this.canvas.aspectRatio < 0.65) {
      if (mode === 'product-right' || mode === 'product-left') {
        mode = 'product-center';
      }
    }

    return mode;
  }

  private dispatchCompositionMode(mode: TemplateCompositionMode, content: Region): {
    imageRegion: Region;
    headlineRegion: Region;
    descriptionRegion: Region;
    priceRegion: Region;
    ctaRegion: Region;
    textBounds: Region;
  } {
    switch (mode) {
      case 'product-right':
        return this.calculateSplitLayout(content, false);
      case 'product-left':
        return this.calculateSplitLayout(content, true);
      case 'product-bottom':
        return this.calculateProductBottomLayout(content);
      case 'product-dominant':
        return this.calculateProductDominantLayout(content);
      case 'framed-product':
        return this.calculateFramedProductLayout(content);
      case 'product-center':
      default:
        return this.calculateVerticalLayout(content);
    }
  }

  /**
   * Modes 1 & 2: Side-by-Side Split (product-left & product-right)
   */
  private calculateSplitLayout(content: Region, productOnLeft: boolean): {
    imageRegion: Region;
    headlineRegion: Region;
    descriptionRegion: Region;
    priceRegion: Region;
    ctaRegion: Region;
    textBounds: Region;
  } {
    const gap = Math.max(24, Math.round(content.width * 0.035));
    const usableWidth = content.width - gap;
    const productWidthRatio = 0.54;
    const productColWidth = Math.round(usableWidth * productWidthRatio);
    const textColWidth = usableWidth - productColWidth;

    const productCol: Region = {
      x: productOnLeft ? content.x : content.x + textColWidth + gap,
      y: content.y,
      width: productColWidth,
      height: content.height,
      role: 'product-column',
    };

    const textCol: Region = {
      x: productOnLeft ? content.x + productColWidth + gap : content.x,
      y: content.y,
      width: textColWidth,
      height: content.height,
      role: 'text-column',
    };

    const productW = Math.round(productCol.width * 0.94);
    const productH = Math.min(Math.round(content.height * 0.82), Math.round(productW * 1.15));
    const imageRegion: Region = {
      x: productCol.x + Math.round((productCol.width - productW) / 2),
      y: productCol.y + Math.round((productCol.height - productH) / 2),
      width: productW,
      height: productH,
      role: 'image',
    };

    const alignment = productOnLeft ? 'left' : this.horizontalAlignment();
    const headlineHeight = Math.min(
      Math.round(textCol.height * 0.26),
      Math.max(80, Math.round(this.decision.typography.headlineSize * 2.2))
    );
    const headlineY = textCol.y + Math.round(textCol.height * 0.08);

    const headlineRegion: Region = {
      x: textCol.x,
      y: headlineY,
      width: textCol.width,
      height: headlineHeight,
      role: 'headline',
      alignment,
      verticalAlignment: 'top',
    };

    const descY = headlineRegion.y + headlineRegion.height + 16;
    const descHeight = Math.min(64, Math.max(36, Math.round(textCol.height * 0.12)));

    const descriptionRegion: Region = {
      x: textCol.x,
      y: descY,
      width: textCol.width,
      height: descHeight,
      role: 'description',
      alignment,
      verticalAlignment: 'top',
    };

    const commercialY = descriptionRegion.y + descriptionRegion.height + 24;
    const priceWidth = Math.min(140, Math.round(textCol.width * 0.38));
    const ctaWidth = Math.min(180, Math.round(textCol.width * 0.54));
    const btnHeight = 44;

    const priceRegion: Region = {
      x: textCol.x,
      y: commercialY,
      width: priceWidth,
      height: btnHeight,
      role: 'price',
      alignment: 'left',
      verticalAlignment: 'middle',
    };

    const ctaRegion: Region = {
      x: textCol.x + priceWidth + 16,
      y: commercialY,
      width: ctaWidth,
      height: btnHeight,
      role: 'cta',
      alignment: 'left',
      verticalAlignment: 'middle',
    };

    const textBounds: Region = {
      x: textCol.x,
      y: headlineRegion.y,
      width: textCol.width,
      height: ctaRegion.y + ctaRegion.height - headlineRegion.y,
      role: 'text',
      alignment,
    };

    return {
      imageRegion,
      headlineRegion,
      descriptionRegion,
      priceRegion,
      ctaRegion,
      textBounds,
    };
  }

  /**
   * Mode 4: Top Marketing Copy, Giant Bottom-Anchored Hero Product (product-bottom)
   */
  private calculateProductBottomLayout(content: Region): {
    imageRegion: Region;
    headlineRegion: Region;
    descriptionRegion: Region;
    priceRegion: Region;
    ctaRegion: Region;
    textBounds: Region;
  } {
    const alignment = this.horizontalAlignment();
    const textWidth = Math.round(content.width * 0.88);
    const textX =
      alignment === 'left'
        ? content.x
        : alignment === 'right'
          ? content.x + content.width - textWidth
          : content.x + Math.round((content.width - textWidth) / 2);

    const headlineY = content.y + 12;
    const headlineHeight = Math.min(
      Math.round(content.height * 0.17),
      Math.max(68, Math.round(this.decision.typography.headlineSize * 1.9))
    );

    const headlineRegion: Region = {
      x: textX,
      y: headlineY,
      width: textWidth,
      height: headlineHeight,
      role: 'headline',
      alignment,
      verticalAlignment: 'top',
    };

    const descY = headlineRegion.y + headlineRegion.height + 8;
    const descHeight = Math.min(42, Math.max(26, Math.round(content.height * 0.055)));

    const descriptionRegion: Region = {
      x: textX,
      y: descY,
      width: textWidth,
      height: descHeight,
      role: 'description',
      alignment,
      verticalAlignment: 'top',
    };

    const btnHeight = 44;
    const lockupY = descriptionRegion.y + descriptionRegion.height + 14;
    const priceWidth = Math.min(150, Math.max(90, Math.round(textWidth * 0.24)));
    const ctaWidth = Math.min(190, Math.max(120, Math.round(textWidth * 0.32)));
    const lockupGap = 16;
    const totalLockupWidth = priceWidth + lockupGap + ctaWidth;

    let lockupX = textX;
    if (alignment === 'center') {
      lockupX = textX + Math.round((textWidth - totalLockupWidth) / 2);
    } else if (alignment === 'right') {
      lockupX = textX + textWidth - totalLockupWidth;
    }

    const priceRegion: Region = {
      x: lockupX,
      y: lockupY,
      width: priceWidth,
      height: btnHeight,
      role: 'price',
      alignment: alignment === 'left' ? 'left' : 'right',
      verticalAlignment: 'middle',
    };

    const ctaRegion: Region = {
      x: lockupX + priceWidth + lockupGap,
      y: lockupY,
      width: ctaWidth,
      height: btnHeight,
      role: 'cta',
      alignment: 'left',
      verticalAlignment: 'middle',
    };

    const heroTop = lockupY + btnHeight + 18;
    const availableHeroHeight = content.y + content.height - heroTop;
    const productW = Math.round(content.width * 0.92);
    const productH = Math.min(availableHeroHeight, Math.round(productW * 1.05));

    const imageRegion: Region = {
      x: content.x + Math.round((content.width - productW) / 2),
      y: content.y + content.height - productH,
      width: productW,
      height: productH,
      role: 'image',
    };

    const textBounds: Region = {
      x: textX,
      y: headlineRegion.y,
      width: textWidth,
      height: lockupY + btnHeight - headlineRegion.y,
      role: 'text',
      alignment,
    };

    return {
      imageRegion,
      headlineRegion,
      descriptionRegion,
      priceRegion,
      ctaRegion,
      textBounds,
    };
  }

  /**
   * Mode 5: Ultra-Hero Statement Product (product-dominant)
   */
  private calculateProductDominantLayout(content: Region): {
    imageRegion: Region;
    headlineRegion: Region;
    descriptionRegion: Region;
    priceRegion: Region;
    ctaRegion: Region;
    textBounds: Region;
  } {
    const alignment = this.horizontalAlignment();
    const textWidth = Math.round(content.width * 0.90);
    const textX =
      alignment === 'left'
        ? content.x
        : alignment === 'right'
          ? content.x + content.width - textWidth
          : content.x + Math.round((content.width - textWidth) / 2);

    const headlineY = content.y + 10;
    const headlineHeight = Math.min(
      Math.round(content.height * 0.14),
      Math.max(62, Math.round(this.decision.typography.headlineSize * 1.7))
    );

    const headlineRegion: Region = {
      x: textX,
      y: headlineY,
      width: textWidth,
      height: headlineHeight,
      role: 'headline',
      alignment,
      verticalAlignment: 'top',
    };

    const descY = headlineRegion.y + headlineRegion.height + 6;
    const descHeight = Math.min(32, Math.round(content.height * 0.04));

    const descriptionRegion: Region = {
      x: textX,
      y: descY,
      width: textWidth,
      height: descHeight,
      role: 'description',
      alignment,
      verticalAlignment: 'top',
    };

    const topZoneBottom = descY + descHeight;

    const btnHeight = 44;
    const bottomZoneY = content.y + content.height - btnHeight - 12;
    const priceWidth = Math.min(160, Math.max(100, Math.round(content.width * 0.22)));
    const ctaWidth = Math.min(210, Math.max(130, Math.round(content.width * 0.28)));
    const lockupGap = 16;
    const totalLockupWidth = priceWidth + lockupGap + ctaWidth;

    let lockupX = content.x + Math.round((content.width - totalLockupWidth) / 2);
    if (alignment === 'left') {
      lockupX = content.x;
    } else if (alignment === 'right') {
      lockupX = content.x + content.width - totalLockupWidth;
    }

    const priceRegion: Region = {
      x: lockupX,
      y: bottomZoneY,
      width: priceWidth,
      height: btnHeight,
      role: 'price',
      alignment: alignment === 'left' ? 'left' : 'right',
      verticalAlignment: 'middle',
    };

    const ctaRegion: Region = {
      x: lockupX + priceWidth + lockupGap,
      y: bottomZoneY,
      width: ctaWidth,
      height: btnHeight,
      role: 'cta',
      alignment: 'left',
      verticalAlignment: 'middle',
    };

    const heroTop = topZoneBottom + 12;
    const heroBottom = bottomZoneY - 14;
    const availableHeroHeight = heroBottom - heroTop;
    const productW = Math.round(content.width * 0.88);
    const productH = Math.round(Math.min(availableHeroHeight * 0.98, productW * 1.05));

    const imageRegion: Region = {
      x: content.x + Math.round((content.width - productW) / 2),
      y: heroTop + Math.round((availableHeroHeight - productH) / 2),
      width: productW,
      height: productH,
      role: 'image',
    };

    const textBounds: Region = {
      x: textX,
      y: headlineRegion.y,
      width: textWidth,
      height: topZoneBottom - headlineRegion.y,
      role: 'text',
      alignment,
    };

    return {
      imageRegion,
      headlineRegion,
      descriptionRegion,
      priceRegion,
      ctaRegion,
      textBounds,
    };
  }

  /**
   * Mode 6: Architectural / Gallery Framed Showcase (framed-product)
   */
  private calculateFramedProductLayout(content: Region): {
    imageRegion: Region;
    headlineRegion: Region;
    descriptionRegion: Region;
    priceRegion: Region;
    ctaRegion: Region;
    textBounds: Region;
  } {
    const alignment = this.horizontalAlignment();
    const textWidth = Math.round(content.width * 0.82);
    const textX =
      alignment === 'left'
        ? content.x
        : alignment === 'right'
          ? content.x + content.width - textWidth
          : content.x + Math.round((content.width - textWidth) / 2);

    const headlineY = content.y + 14;
    const headlineHeight = Math.min(
      Math.round(content.height * 0.17),
      Math.max(72, Math.round(this.decision.typography.headlineSize * 2.0))
    );

    const headlineRegion: Region = {
      x: textX,
      y: headlineY,
      width: textWidth,
      height: headlineHeight,
      role: 'headline',
      alignment,
      verticalAlignment: 'top',
    };

    const descY = headlineRegion.y + headlineRegion.height + 8;
    const descHeight = Math.min(38, Math.max(26, Math.round(content.height * 0.05)));

    const descriptionRegion: Region = {
      x: textX,
      y: descY,
      width: textWidth,
      height: descHeight,
      role: 'description',
      alignment,
      verticalAlignment: 'top',
    };

    const topZoneBottom = descY + descHeight;

    const btnHeight = 44;
    const bottomZoneY = content.y + content.height - btnHeight - 16;
    const priceWidth = Math.min(150, Math.max(90, Math.round(content.width * 0.20)));
    const ctaWidth = Math.min(190, Math.max(130, Math.round(content.width * 0.26)));
    const lockupGap = 16;
    const totalLockupWidth = priceWidth + lockupGap + ctaWidth;

    let lockupX = content.x + Math.round((content.width - totalLockupWidth) / 2);
    if (alignment === 'left') {
      lockupX = content.x;
    } else if (alignment === 'right') {
      lockupX = content.x + content.width - totalLockupWidth;
    }

    const priceRegion: Region = {
      x: lockupX,
      y: bottomZoneY,
      width: priceWidth,
      height: btnHeight,
      role: 'price',
      alignment: alignment === 'left' ? 'left' : 'right',
      verticalAlignment: 'middle',
    };

    const ctaRegion: Region = {
      x: lockupX + priceWidth + lockupGap,
      y: bottomZoneY,
      width: ctaWidth,
      height: btnHeight,
      role: 'cta',
      alignment: 'center',
      verticalAlignment: 'middle',
    };

    const frameTop = topZoneBottom + 14;
    const frameBottom = bottomZoneY - 16;
    const availableHeroHeight = frameBottom - frameTop;
    const productW = Math.round(content.width * 0.78);
    const productH = Math.round(Math.min(availableHeroHeight * 0.94, productW * 0.98));

    const imageRegion: Region = {
      x: content.x + Math.round((content.width - productW) / 2),
      y: frameTop + Math.round((availableHeroHeight - productH) / 2),
      width: productW,
      height: productH,
      role: 'image',
    };

    const textBounds: Region = {
      x: textX,
      y: headlineRegion.y,
      width: textWidth,
      height: topZoneBottom - headlineRegion.y,
      role: 'text',
      alignment,
    };

    return {
      imageRegion,
      headlineRegion,
      descriptionRegion,
      priceRegion,
      ctaRegion,
      textBounds,
    };
  }

  /**
   * Archetype 2: Vertical Stack (Product Hero Center)
   * Top: Headline & Description (20-25%)
   * Center: Product Hero (45-60% of canvas)
   * Bottom: Commercial Lockup with Price & CTA Button (12-16%)
   */
  private calculateVerticalLayout(content: Region): {
    imageRegion: Region;
    headlineRegion: Region;
    descriptionRegion: Region;
    priceRegion: Region;
    ctaRegion: Region;
    textBounds: Region;
  } {
    const alignment = this.horizontalAlignment();
    const textWidth = Math.round(
      content.width * Math.min(0.92, Math.max(0.70, (this.decision.layout.textWidth || 75) / 100))
    );
    const textX =
      alignment === 'left'
        ? content.x
        : alignment === 'right'
          ? content.x + content.width - textWidth
          : content.x + Math.round((content.width - textWidth) / 2);

    // 1. Top Zone (Headline & Description)
    const headlineHeight = Math.min(
      Math.round(content.height * 0.19),
      Math.max(76, Math.round(this.decision.typography.headlineSize * 2.1))
    );
    const headlineY = content.y + Math.round(content.height * 0.015);

    const headlineRegion: Region = {
      x: textX,
      y: headlineY,
      width: textWidth,
      height: headlineHeight,
      role: 'headline',
      alignment,
      verticalAlignment: 'top',
    };

    const descY = headlineRegion.y + headlineRegion.height + 12;
    const descHeight = Math.min(50, Math.max(28, Math.round(content.height * 0.065)));

    const descriptionRegion: Region = {
      x: textX,
      y: descY,
      width: textWidth,
      height: descHeight,
      role: 'description',
      alignment,
      verticalAlignment: 'top',
    };

    const topZoneBottom = descriptionRegion.y + descriptionRegion.height;

    // 2. Bottom Zone (Commercial Lockup: Price & CTA)
    const btnHeight = 48;
    const bottomZoneY = content.y + content.height - btnHeight - Math.round(content.height * 0.02);

    const priceWidth = Math.min(180, Math.max(110, Math.round(content.width * 0.22)));
    const ctaWidth = Math.min(220, Math.max(140, Math.round(content.width * 0.28)));
    const lockupGap = 16;
    const totalLockupWidth = priceWidth + lockupGap + ctaWidth;

    let lockupX = content.x + Math.round((content.width - totalLockupWidth) / 2);
    if (alignment === 'left') {
      lockupX = content.x;
    } else if (alignment === 'right') {
      lockupX = content.x + content.width - totalLockupWidth;
    }

    const priceRegion: Region = {
      x: lockupX,
      y: bottomZoneY,
      width: priceWidth,
      height: btnHeight,
      role: 'price',
      alignment: alignment === 'left' ? 'left' : 'right',
      verticalAlignment: 'middle',
    };

    const ctaRegion: Region = {
      x: lockupX + priceWidth + lockupGap,
      y: bottomZoneY,
      width: ctaWidth,
      height: btnHeight,
      role: 'cta',
      alignment: alignment === 'left' ? 'left' : 'center',
      verticalAlignment: 'middle',
    };

    // 3. Middle Hero Zone (Product)
    // Product Hero takes the dominant central space between top zone and bottom zone!
    const heroTop = topZoneBottom + 16;
    const heroBottom = bottomZoneY - 18;
    const availableHeroHeight = Math.max(120, heroBottom - heroTop);
    const availableHeroWidth = content.width;

    // Product should occupy 50-65% of canvas area, clearly dominant
    const scaleMultiplier = this.template?.imageEmphasis.scaleMultiplier ?? 1;
    const baseWidthRatio = Math.min(0.85, Math.max(0.62, (this.decision.layout.productScale + 0.12) * scaleMultiplier));
    const productW = Math.round(availableHeroWidth * baseWidthRatio);
    const productH = Math.round(Math.min(availableHeroHeight * 0.94, productW * 0.96));

    const imageRegion: Region = {
      x: content.x + Math.round((content.width - productW) / 2),
      y: heroTop + Math.round((availableHeroHeight - productH) / 2),
      width: productW,
      height: productH,
      role: 'image',
    };

    const textBounds: Region = {
      x: textX,
      y: headlineRegion.y,
      width: textWidth,
      height: topZoneBottom - headlineRegion.y,
      role: 'text',
      alignment,
    };

    return {
      imageRegion,
      headlineRegion,
      descriptionRegion,
      priceRegion,
      ctaRegion,
      textBounds,
    };
  }

  private resolveDecorationRegions(
    bounds: Region,
    imageRegion: Region,
    headlineRegion: Region
  ): Region[] {
    const placement = this.decision.decorations.placement;
    if (placement === 'none' || this.decision.decorations.density === 'none') {
      return [];
    }

    const gap = this.spacing();
    // Use 4 corners of bounds for subtle accents
    const cornerSize = Math.max(60, Math.round(Math.min(bounds.width, bounds.height) * 0.18));

    const topLeft: Region = {
      x: bounds.x,
      y: bounds.y,
      width: cornerSize,
      height: cornerSize,
      role: 'decoration',
    };

    const topRight: Region = {
      x: bounds.x + bounds.width - cornerSize,
      y: bounds.y,
      width: cornerSize,
      height: cornerSize,
      role: 'decoration',
    };

    const bottomLeft: Region = {
      x: bounds.x,
      y: bounds.y + bounds.height - cornerSize,
      width: cornerSize,
      height: cornerSize,
      role: 'decoration',
    };

    const bottomRight: Region = {
      x: bounds.x + bounds.width - cornerSize,
      y: bounds.y + bounds.height - cornerSize,
      width: cornerSize,
      height: cornerSize,
      role: 'decoration',
    };

    switch (placement) {
      case 'corners':
      case 'frame':
        return [topLeft, topRight, bottomLeft, bottomRight];
      case 'diagonal':
        // Top-right and bottom-left only to avoid crossing content
        return [topRight, bottomLeft];
      case 'around-product':
        return [this.canvas.insetPx(imageRegion, -Math.round(gap * 0.4))];
      case 'text-adjacent':
        return [this.canvas.insetPx(headlineRegion, -Math.round(gap * 0.25))];
      default:
        return [topRight, bottomLeft];
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

  private spacing(): number {
    const templateBase = (this.template?.spacingSystem.base ?? 10) / 10;
    return Math.max(14, this.canvas.minDimension(2) * templateBase);
  }

  private dynamicPadding(): number {
    const basePadding = this.canvas.minDimension(this.decision.layout.padding || 8);
    const edgePadding = this.canvas.minDimension(this.template?.spacingSystem.edgePadding ?? 0);
    const marginMultiplier = this.template?.whitespaceProfile.marginMultiplier ?? 1;

    return Math.max(
      16,
      Math.min(
        this.canvas.minDimension(8),
        Math.round((basePadding * 0.6 + edgePadding) * marginMultiplier)
      )
    );
  }

  private horizontalAlignment(): 'left' | 'center' | 'right' {
    if (this.decision.layout.alignment === 'right') return 'right';
    if (this.decision.layout.alignment === 'center' || this.decision.layout.alignment === 'balanced') return 'center';
    return 'left';
  }
}

export default LayoutManager;
