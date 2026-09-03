import { PosterComponent, PosterComponentType } from '../components';
import {
  CompositionSelection,
  CtaTreatment,
  DefaultCompositionEngine,
  PosterCompositionEngine,
} from '../composition';
import { PosterData, PosterImageData, PosterPriceData } from '../types/data';
import { PosterDimensions } from '../types/geometry';
import {
  BoxStyle,
  ImageStyle,
  PosterColorPalette,
  TextStyle,
} from '../types';
import { PosterTemplate } from '../templates/PosterTemplate';
import type { PosterDesignDecision } from '../../poster-intelligence/composer/PosterDesignTypes';
import {
  CalculatedBounds,
  CalculatedImageLayout,
  CalculatedTextLayout,
  PosterLayout,
  PosterLayoutByType,
  PosterLayoutItem,
  PosterLayoutOptions,
} from './PosterLayout';

const DEFAULT_MIN_HEADLINE_FONT_SIZE = 18;
const DEFAULT_MAX_HEADLINE_FONT_SIZE = 96;
const DEFAULT_FONT_SIZE = 24;
const DEFAULT_MAX_HEADLINE_LINES = 3;
const AVERAGE_CHARACTER_WIDTH_EM = 0.55;
const DEFAULT_IMAGE_ASPECT_RATIO = 1;

interface TextProps {
  dataKey?: string;
  defaultText?: string;
  maxLines?: number;
  textStyle?: TextStyle;
}

interface ImageProps {
  dataKey?: string;
  fallbackImageUrl?: string;
  style?: ImageStyle;
}

export interface PosterLayoutEngine {
  calculate(
    data: PosterData,
    template: PosterTemplate,
    options?: PosterLayoutOptions
  ): PosterLayout;
}

export class DefaultPosterLayoutEngine implements PosterLayoutEngine {
  public constructor(
    private readonly compositionEngine: PosterCompositionEngine =
      new DefaultCompositionEngine()
  ) {}

  public calculate(
    data: PosterData,
    template: PosterTemplate,
    options: PosterLayoutOptions = {}
  ): PosterLayout {
    const canvas = options.canvas ?? template.dimensions;
    const composition = this.compositionEngine.select(data, canvas);
    const posterDesignDecision = options.posterDesignDecision ?? getPosterDesignDecision(data);
    const warnings: string[] = [];
    const items = template.components
      .map((component) => this.calculateItem(
        component,
        data,
        template.dimensions,
        canvas,
        composition,
        posterDesignDecision,
        options,
        warnings
      ))
      .sort((a, b) => a.zIndex - b.zIndex);

    return {
      templateId: template.id,
      templateVersion: template.version,
      canvas,
      data,
      items,
      byType: groupItemsByType(items),
      warnings,
      metadata: {
        compositionId: composition.blueprint.id,
        compositionName: composition.blueprint.name,
        compositionCategory: composition.category,
        orientation: composition.orientation,
        posterDesignDecision,
      },
    };
  }

  private calculateItem(
    component: PosterComponent,
    data: PosterData,
    baseCanvas: PosterDimensions,
    canvas: PosterDimensions,
    composition: CompositionSelection,
    posterDesignDecision: PosterDesignDecision | undefined,
    options: PosterLayoutOptions,
    warnings: string[]
  ): PosterLayoutItem {
    const baseBounds = resolveBounds(component.config.bounds, baseCanvas, canvas);
    const palette = getPalette(data);
    const frame = composition.blueprint.frames[composition.orientation];
    const bounds = resolveCompositionBounds(
      component.type,
      baseBounds,
      canvas,
      composition,
      posterDesignDecision
    );
    const item: PosterLayoutItem = {
      componentId: component.id,
      type: component.type,
      bounds,
      zIndex: component.config.zIndex,
      visible: component.isVisible(),
      required: component.config.required ?? false,
      alignment: frame.alignments?.[component.type] ?? component.config.alignment,
      sourceBounds: component.config.bounds,
      boxStyle: resolveCompositionBoxStyle(
        component.type,
        component.config.style,
        palette,
        composition.blueprint.ctaTreatment,
        posterDesignDecision
      ),
      metadata: {
        theme: data.metadata?.['theme'],
        palette,
        compositionId: composition.blueprint.id,
        compositionName: composition.blueprint.name,
        compositionCategory: composition.category,
        backgroundTreatment:
          data.metadata?.['backgroundTreatment'] ?? composition.blueprint.backgroundTreatment,
        productTreatment:
          data.metadata?.['productTreatment'] ?? composition.blueprint.productTreatment,
        ctaTreatment: composition.blueprint.ctaTreatment,
        priceTreatment: composition.blueprint.priceTreatment,
        badgeTreatment: composition.blueprint.badgeTreatment,
        productRotation:
          data.metadata?.['productRotation'] ?? composition.blueprint.productRotation ?? 0,
        productGlow:
          data.metadata?.['productGlow'] ?? composition.blueprint.productGlow ?? 0.5,
        productShadow:
          data.metadata?.['productShadow'] ??
          mapPosterDesignShadow(posterDesignDecision) ??
          composition.blueprint.productShadow ??
          'soft',
        shadow: resolveCompositionShadow(component.type, palette, composition, posterDesignDecision),
        compareAtAmount: data.price?.compareAtAmount,
        priceAmount: data.price?.amount,
        priceCurrency: data.price?.currency,
        discountPercent: data.promotion?.discountPercent,
        posterDesignDecision,
      },
    };

    if (isTextComponent(component.type)) {
      item.text = this.calculateText(
        component,
        data,
        bounds,
        canvas,
        composition,
        posterDesignDecision,
        options,
        warnings
      );
    }

    if (isImageComponent(component.type)) {
      item.image = this.calculateImage(
        component,
        data,
        bounds,
        composition,
        posterDesignDecision
      );
    }

    return item;
  }

  private calculateText(
    component: PosterComponent,
    data: PosterData,
    bounds: CalculatedBounds,
    canvas: PosterDimensions,
    composition: CompositionSelection,
    posterDesignDecision: PosterDesignDecision | undefined,
    options: PosterLayoutOptions,
    warnings: string[]
  ): CalculatedTextLayout {
    const props = component.config.props as TextProps;
    const text = resolveText(component.type, data, props);
    const style = scaleTextStyle(
      resolveCompositionTextStyle(
        component.type,
        props.textStyle,
        getPalette(data),
        composition,
        posterDesignDecision
      ),
      canvas
    );
    const baseFontSize = scaleFontSize(style?.fontSize ?? DEFAULT_FONT_SIZE, canvas);

    if (component.type !== 'headline') {
      const maxLines = props.maxLines ?? defaultMaxLines(component.type);
      const lines = wrapText(text, bounds.width, baseFontSize, maxLines);
      return {
        text,
        lines,
        fontSize: baseFontSize,
        estimatedLines: lines.length,
        maxLines,
        style,
      };
    }

    const preferredMaxLines =
      composition.blueprint.typography.maxHeadlineLines ??
      props.maxLines ??
      DEFAULT_MAX_HEADLINE_LINES;
    const maxLines =
      text.length > 52 &&
      bounds.height >= baseFontSize * 3.3
        ? Math.min(4, Math.max(preferredMaxLines, 4))
        : preferredMaxLines;
    const fontSize = fitHeadlineFontSize(text, bounds, baseFontSize, maxLines, options);
    const lines = wrapText(text, bounds.width, fontSize, maxLines);
    const estimatedLines = lines.length;

    if (estimatedLines > maxLines) {
      warnings.push(`Headline component "${component.id}" may exceed ${maxLines} lines.`);
    }

    return {
      text,
      lines,
      fontSize,
      estimatedLines,
      maxLines,
      style,
    };
  }

  private calculateImage(
    component: PosterComponent,
    data: PosterData,
    bounds: CalculatedBounds,
    composition: CompositionSelection,
    posterDesignDecision: PosterDesignDecision | undefined
  ): CalculatedImageLayout {
    const props = component.config.props as ImageProps;
    const image = resolveImage(component.type, data, props);
    const cropProduct =
      posterDesignDecision?.position.cropMode === 'cover' ||
      posterDesignDecision?.position.cropMode === 'full-bleed' ||
      posterDesignDecision?.position.cropMode === 'close-up' ||
      composition.blueprint.productTreatment === 'macro' ||
      composition.blueprint.productTreatment === 'edge-crop';
    const style = component.type === 'product_image'
      ? {
          ...props.style,
          objectFit: cropProduct ? 'cover' as const : 'contain' as const,
        }
      : props.style;
    const renderedBounds = fitImageBounds(bounds, image, style);

    return {
      image,
      renderedBounds,
      preserveAspectRatio: true,
      style,
    };
  }
}

function resolveBounds(
  bounds: PosterComponent['config']['bounds'],
  baseCanvas: PosterDimensions,
  canvas: PosterDimensions
): CalculatedBounds {
  const scaleX = canvas.width / baseCanvas.width;
  const scaleY = canvas.height / baseCanvas.height;

  if (bounds.unit === 'percent') {
    return {
      x: Math.round(bounds.x * canvas.width),
      y: Math.round(bounds.y * canvas.height),
      width: Math.round(bounds.width * canvas.width),
      height: Math.round(bounds.height * canvas.height),
      unit: 'px',
    };
  }

  return {
    x: Math.round(bounds.x * scaleX),
    y: Math.round(bounds.y * scaleY),
    width: Math.round(bounds.width * scaleX),
    height: Math.round(bounds.height * scaleY),
    unit: 'px',
  };
}

function scaleFontSize(fontSize: number, canvas: PosterDimensions): number {
  return Math.max(1, Math.round(fontSize * fontScale(canvas)));
}

function fontScale(canvas: PosterDimensions): number {
  return Math.max(0.75, Math.min(1.85, canvas.width / 1080));
}

function scaleTextStyle(style: TextStyle | undefined, canvas: PosterDimensions): TextStyle | undefined {
  if (!style) return style;
  const scale = fontScale(canvas);

  return {
    ...style,
    lineHeight: style.lineHeight === undefined
      ? undefined
      : Math.round(style.lineHeight * scale),
    letterSpacing: style.letterSpacing === undefined
      ? undefined
      : Number((style.letterSpacing * scale).toFixed(2)),
  };
}

function resolveCompositionBounds(
  type: PosterComponentType,
  fallback: CalculatedBounds,
  canvas: PosterDimensions,
  composition: CompositionSelection,
  posterDesignDecision: PosterDesignDecision | undefined
): CalculatedBounds {
  if (type === 'background') {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height, unit: 'px' };
  }

  const designBounds = resolvePosterDesignBounds(type, canvas, posterDesignDecision);
  if (designBounds) return designBounds;

  const normalized = composition.blueprint.frames[composition.orientation].bounds[type];
  if (!normalized) return fallback;

  return {
    x: Math.round(normalized[0] * canvas.width),
    y: Math.round(normalized[1] * canvas.height),
    width: Math.round(normalized[2] * canvas.width),
    height: Math.round(normalized[3] * canvas.height),
    unit: 'px',
  };
}

function resolvePosterDesignBounds(
  type: PosterComponentType,
  canvas: PosterDimensions,
  decision: PosterDesignDecision | undefined
): CalculatedBounds | undefined {
  if (!decision) return undefined;

  const safe = decision.layout.safeMargins;
  const marginX = Math.round(canvas.width * (Math.max(safe.left, safe.right, decision.layout.padding) / 100));
  const marginY = Math.round(canvas.height * (Math.max(safe.top, safe.bottom, decision.layout.padding) / 100));

  if (type === 'product_image') {
    const anchor = decision.position.anchor === 'center'
      ? decision.layout.imagePosition
      : decision.position.anchor;
    const productScale = resolveProductScale(decision);
    const width = Math.round(canvas.width * Math.min(0.9, productScale));
    const height = Math.round(canvas.height * Math.min(0.86, productScale));
    const center = anchorCenter(anchor, canvas, marginX, marginY);

    return clampBounds({
      x: Math.round(center.x - width / 2 + canvas.width * (decision.position.offsetX / 100)),
      y: Math.round(center.y - height / 2 + canvas.height * (decision.position.offsetY / 100)),
      width,
      height,
      unit: 'px',
    }, canvas);
  }

  if (type === 'headline' || type === 'description') {
    const textWidth = Math.round(canvas.width * (decision.layout.textWidth / 100));
    const textPosition = decision.layout.textPosition;
    const x = horizontalPosition(textPosition, canvas.width, textWidth, marginX);
    const textBlockTop = verticalPosition(textPosition, canvas.height, marginY);
    const headlineHeight = Math.round(canvas.height * (decision.layout.layoutId === 'minimal' ? 0.16 : 0.20));
    const descriptionHeight = Math.round(canvas.height * 0.105);
    const gap = Math.round(canvas.height * (Math.max(3.5, decision.layout.spacing) / 100));

    return {
      x,
      y: type === 'headline' ? textBlockTop : textBlockTop + headlineHeight + gap,
      width: textWidth,
      height: type === 'headline' ? headlineHeight : descriptionHeight,
      unit: 'px',
    };
  }

  if (type === 'cta') {
    const ctaWidth = Math.round(
      canvas.width * Math.min(0.46, Math.max(0.26, (decision.layout.textWidth / 100) * 0.62))
    );
    const ctaHeight = Math.round(canvas.height * Math.min(0.085, Math.max(0.058, canvas.width / canvas.height * 0.065)));
    const x = horizontalPosition(decision.layout.ctaPosition, canvas.width, ctaWidth, marginX);
    const y = ctaVerticalPosition(decision.layout.ctaPosition, canvas.height, ctaHeight, marginY);

    return { x, y, width: ctaWidth, height: ctaHeight, unit: 'px' };
  }

  return undefined;
}

function resolveProductScale(decision: PosterDesignDecision): number {
  const priorityBoost = decision.position.imagePriority === 'primary'
    ? 0.04
    : decision.position.imagePriority === 'supporting'
      ? -0.04
      : 0;
  const overlapPenalty = decision.position.overlapText ? -0.02 : 0;
  const desiredScale = Math.max(decision.layout.productScale, decision.position.scale) + priorityBoost + overlapPenalty;

  return Math.max(0.46, Math.min(0.9, desiredScale));
}

function mapPosterDesignShadow(
  decision: PosterDesignDecision | undefined
): 'none' | 'soft' | 'grounded' | 'dramatic' | undefined {
  switch (decision?.position.shadowStyle) {
    case 'none':
      return 'none';
    case 'contact':
      return 'grounded';
    case 'dramatic':
    case 'luxury':
    case 'floating':
      return 'dramatic';
    case 'soft':
      return 'soft';
    default:
      return undefined;
  }
}

function anchorCenter(
  anchor: string,
  canvas: PosterDimensions,
  marginX: number,
  marginY: number
): { x: number; y: number } {
  const horizontal = anchor.includes('left')
    ? marginX + canvas.width * 0.26
    : anchor.includes('right')
      ? canvas.width - marginX - canvas.width * 0.26
      : canvas.width / 2;
  const vertical = anchor.includes('upper') || anchor === 'top'
    ? marginY + canvas.height * 0.26
    : anchor.includes('lower') || anchor === 'bottom'
      ? canvas.height - marginY - canvas.height * 0.26
      : canvas.height / 2;

  return { x: horizontal, y: vertical };
}

function horizontalPosition(
  position: string,
  canvasWidth: number,
  width: number,
  marginX: number
): number {
  if (position.includes('left')) return marginX;
  if (position.includes('right')) return canvasWidth - marginX - width;
  return Math.round((canvasWidth - width) / 2);
}

function verticalPosition(
  position: string,
  canvasHeight: number,
  marginY: number
): number {
  if (position.includes('bottom') || position.includes('lower')) {
    return Math.round(canvasHeight * 0.62);
  }
  if (position.includes('center')) return Math.round(canvasHeight * 0.34);
  return marginY;
}

function ctaVerticalPosition(
  position: string,
  canvasHeight: number,
  height: number,
  marginY: number
): number {
  if (position.includes('top') || position.includes('upper')) return marginY;
  if (position.includes('center')) return Math.round((canvasHeight - height) / 2);
  return canvasHeight - marginY - height;
}

function clampBounds(bounds: CalculatedBounds, canvas: PosterDimensions): CalculatedBounds {
  const x = Math.max(-Math.round(bounds.width * 0.18), Math.min(bounds.x, canvas.width - Math.round(bounds.width * 0.82)));
  const y = Math.max(-Math.round(bounds.height * 0.18), Math.min(bounds.y, canvas.height - Math.round(bounds.height * 0.82)));

  return { ...bounds, x, y };
}

function resolveCompositionTextStyle(
  type: PosterComponentType,
  original: TextStyle | undefined,
  palette: PosterColorPalette,
  composition: CompositionSelection,
  posterDesignDecision: PosterDesignDecision | undefined
): TextStyle | undefined {
  if (!isTextComponent(type)) return original;

  const designTextStyle = resolvePosterDesignTextStyle(type, original, posterDesignDecision);
  if (designTextStyle) return designTextStyle;

  const typography = composition.blueprint.typography;
  const baseHeadlineSize = typography.family === 'condensed'
    ? 90
    : typography.family === 'elegant'
      ? 76
      : 82;
  const fontSizes: Partial<Record<PosterComponentType, number>> = {
    headline: baseHeadlineSize * typography.headlineScale,
    description: 21 * typography.descriptionScale,
    price: 38 * typography.priceScale,
    cta: 18,
    discount_badge: 17,
    footer: 16,
  };
  const fontFamilies = {
    modern: 'Inter, Helvetica Neue, Arial, sans-serif',
    elegant: 'Baskerville, Times New Roman, Georgia, serif',
    condensed: 'Arial Narrow, Impact, Haettenschweiler, sans-serif',
    editorial: 'Didot, Bodoni MT, Georgia, serif',
  };
  const ctaUsesArtworkColor =
    composition.blueprint.ctaTreatment === 'minimal-text' ||
    composition.blueprint.ctaTreatment === 'magazine' ||
    composition.blueprint.ctaTreatment === 'integrated-type' ||
    composition.blueprint.ctaTreatment === 'underline' ||
    composition.blueprint.ctaTreatment === 'outline';

  return {
    ...original,
    color: type === 'description' || type === 'footer'
      ? palette.mutedText
      : type === 'cta'
        ? ctaUsesArtworkColor ? palette.text : '#FFFFFF'
        : type === 'discount_badge'
          ? '#FFFFFF'
          : palette.text,
    fontFamily: fontFamilies[typography.family],
    fontSize: fontSizes[type] ?? original?.fontSize,
    fontWeight: type === 'headline'
      ? typography.headlineWeight
      : type === 'price' || type === 'cta'
        ? 'bold'
        : 'normal',
    lineHeight: type === 'headline'
      ? (fontSizes[type] ?? 76) * (typography.headlineLineHeight ?? 1.02)
      : type === 'description'
        ? (fontSizes[type] ?? 24) * (typography.descriptionLineHeight ?? 1.28)
        : (fontSizes[type] ?? 24) * 1.24,
    letterSpacing: type === 'headline'
      ? typography.letterSpacing ?? 0
      : type === 'cta'
        ? typography.ctaLetterSpacing ?? 0
        : type === 'price'
          ? 0.25
          : 0,
    textTransform:
      type === 'headline' && typography.uppercase
        ? 'uppercase'
        : original?.textTransform,
  };
}

function resolvePosterDesignTextStyle(
  type: PosterComponentType,
  original: TextStyle | undefined,
  decision: PosterDesignDecision | undefined
): TextStyle | undefined {
  if (!decision) return undefined;

  const typography = decision.typography;
  const colors = decision.colors;

  if (type === 'headline') {
    return {
      ...original,
      color: colors.headline,
      fontFamily: typography.headlineFont,
      fontSize: typography.headlineSize,
      fontWeight: typography.headlineWeight,
      lineHeight: typography.headlineSize * typography.lineHeight,
      letterSpacing: typography.headlineLetterSpacing,
      textTransform: typography.headlineTransform,
    };
  }

  if (type === 'description' || type === 'footer') {
    return {
      ...original,
      color: type === 'description' ? colors.description : colors.subheadline,
      fontFamily: typography.descriptionFont,
      fontSize: typography.descriptionSize,
      fontWeight: 'normal',
      lineHeight: typography.descriptionSize * Math.max(1.18, typography.lineHeight),
      letterSpacing: 0,
      textTransform: 'none',
    };
  }

  if (type === 'cta') {
    return {
      ...original,
      color: colors.ctaText,
      fontFamily: typography.ctaFont,
      fontSize: typography.descriptionSize,
      fontWeight: typography.ctaWeight,
      lineHeight: typography.descriptionSize * 1.18,
      letterSpacing: 0.2,
      textTransform: 'none',
    };
  }

  if (type === 'price' || type === 'discount_badge') {
    return {
      ...original,
      color: type === 'discount_badge' ? colors.ctaText : colors.accent,
      fontFamily: typography.ctaFont,
      fontSize: original?.fontSize,
      fontWeight: 'bold',
      lineHeight: original?.lineHeight,
      letterSpacing: 0.25,
      textTransform: original?.textTransform,
    };
  }

  return original;
}

function resolveCompositionBoxStyle(
  type: PosterComponentType,
  original: BoxStyle | undefined,
  palette: PosterColorPalette,
  treatment: CtaTreatment,
  posterDesignDecision: PosterDesignDecision | undefined
): BoxStyle | undefined {
  if (posterDesignDecision && type === 'background') {
    return {
      ...original,
      backgroundColor: posterDesignDecision.colors.background,
      borderColor: posterDesignDecision.colors.border,
    };
  }

  if (posterDesignDecision && type === 'cta') {
    return {
      ...original,
      backgroundColor: posterDesignDecision.colors.ctaBackground,
      borderColor: posterDesignDecision.colors.border,
      borderWidth: 1,
      borderRadius: posterDesignDecision.layout.layoutId === 'minimal' ? 3 : 999,
    };
  }

  if (type === 'cta') {
    return CTA_BOX_STYLES[treatment](original, palette);
  }

  if (type === 'price' || type === 'product_image') {
    return {
      ...original,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
    };
  }

  return original;
}

const CTA_BOX_STYLES: Record<
  CtaTreatment,
  (original: BoxStyle | undefined, palette: PosterColorPalette) => BoxStyle
> = {
  'minimal-text': (original) => transparentBox(original),
  magazine: (original) => transparentBox(original),
  'integrated-type': (original) => transparentBox(original),
  underline: (original) => transparentBox(original),
  outline: (original, palette) => ({
    ...original,
    backgroundColor: 'transparent',
    borderColor: palette.text,
    borderWidth: 1,
    borderRadius: 2,
  }),
  glass: (original) => ({
    ...original,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.34)',
    borderWidth: 1,
    borderRadius: 10,
  }),
  'glass-pill': (original) => ({
    ...original,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.32)',
    borderWidth: 1,
    borderRadius: 999,
  }),
  ribbon: (original, palette) => ({
    ...original,
    backgroundColor: palette.accent,
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  }),
  floating: (original, palette) => ({
    ...original,
    backgroundColor: palette.accent,
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 999,
  }),
  pill: (original, palette) => ({
    ...original,
    backgroundColor: palette.accent,
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 999,
  }),
  solid: (original, palette) => ({
    ...original,
    backgroundColor: palette.accent,
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 3,
  }),
};

function transparentBox(original: BoxStyle | undefined): BoxStyle {
  return {
    ...original,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  };
}

function resolveCompositionShadow(
  type: PosterComponentType,
  palette: PosterColorPalette,
  composition: CompositionSelection,
  posterDesignDecision: PosterDesignDecision | undefined
): Record<string, unknown> | undefined {
  if (type === 'product_image') {
    const shadows = {
      none: undefined,
      soft: { dx: 0, dy: 22, blur: 40, color: '#000000', opacity: 0.28 },
      grounded: { dx: 0, dy: 30, blur: 30, color: '#000000', opacity: 0.34 },
      dramatic: { dx: 8, dy: 34, blur: 48, color: '#000000', opacity: 0.48 },
    };
    return shadows[mapPosterDesignShadow(posterDesignDecision) ?? composition.blueprint.productShadow ?? 'soft'];
  }

  if (
    type === 'cta' &&
    (posterDesignDecision ||
      composition.blueprint.ctaTreatment === 'floating' ||
      composition.blueprint.ctaTreatment === 'glass')
  ) {
    return { dx: 0, dy: 12, blur: 24, color: palette.accent, opacity: posterDesignDecision ? 0.22 : 0.30 };
  }

  return undefined;
}

function getPalette(data: PosterData): PosterColorPalette {
  return data.metadata?.['palette'] as PosterColorPalette ?? {
    dominant: '#476CFF',
    vibrant: '#476CFF',
    accent: '#476CFF',
    background: '#101626',
    backgroundAlt: '#25315A',
    surface: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    mutedText: '#D5D9E3',
    glow: '#6E89FF',
  };
}

function getPosterDesignDecision(data: PosterData): PosterDesignDecision | undefined {
  return data.metadata?.['posterDesignDecision'] as PosterDesignDecision | undefined;
}

function defaultMaxLines(type: PosterComponentType): number {
  if (type === 'description') return 2;
  return 1;
}

function wrapText(text: string, width: number, fontSize: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const maxUnits = Math.max(1, width / Math.max(1, fontSize * AVERAGE_CHARACTER_WIDTH_EM));
  const allLines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxUnits || !line) {
      line = candidate;
      continue;
    }
    allLines.push(line);
    line = word;
  }

  if (line) allLines.push(line);
  if (allLines.length <= maxLines) return allLines;

  const visible = allLines.slice(0, maxLines);
  const lastLine = visible[maxLines - 1] ?? '';
  visible[maxLines - 1] =
    `${lastLine.slice(0, Math.max(1, Math.floor(maxUnits) - 1)).trimEnd()}…`;
  return visible;
}

function fitHeadlineFontSize(
  text: string,
  bounds: CalculatedBounds,
  preferredFontSize: number,
  maxLines: number,
  options: PosterLayoutOptions
): number {
  const minFontSize = options.minHeadlineFontSize ?? DEFAULT_MIN_HEADLINE_FONT_SIZE;
  const maxFontSize = options.maxHeadlineFontSize ?? DEFAULT_MAX_HEADLINE_FONT_SIZE;
  const startingFontSize = Math.min(preferredFontSize, maxFontSize);

  for (let fontSize = startingFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const estimatedLines = countWrappedLines(text, bounds.width, fontSize);
    const estimatedHeight = estimatedLines * fontSize * 1.2;

    if (estimatedLines <= maxLines && estimatedHeight <= bounds.height) {
      return fontSize;
    }
  }

  return minFontSize;
}

function countWrappedLines(text: string, width: number, fontSize: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const maxUnits = Math.max(1, width / Math.max(1, fontSize * AVERAGE_CHARACTER_WIDTH_EM));
  let lines = 1;
  let lineLength = 0;

  for (const word of words) {
    const candidateLength = lineLength === 0 ? word.length : lineLength + 1 + word.length;
    if (candidateLength <= maxUnits || lineLength === 0) {
      lineLength = candidateLength;
    } else {
      lines += 1;
      lineLength = word.length;
    }
  }

  return lines;
}

function fitImageBounds(
  bounds: CalculatedBounds,
  image: PosterImageData | undefined,
  style: ImageStyle | undefined
): CalculatedBounds {
  const sourceWidth = image?.width ?? DEFAULT_IMAGE_ASPECT_RATIO;
  const sourceHeight = image?.height ?? DEFAULT_IMAGE_ASPECT_RATIO;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = bounds.width / bounds.height;
  const objectFit = style?.objectFit ?? 'contain';

  if (objectFit === 'cover') {
    const width = sourceRatio > targetRatio ? Math.round(bounds.height * sourceRatio) : bounds.width;
    const height = sourceRatio > targetRatio ? bounds.height : Math.round(bounds.width / sourceRatio);

    return centerBounds(bounds, width, height);
  }

  const width = sourceRatio > targetRatio ? bounds.width : Math.round(bounds.height * sourceRatio);
  const height = sourceRatio > targetRatio ? Math.round(bounds.width / sourceRatio) : bounds.height;

  return centerBounds(bounds, width, height);
}

function centerBounds(container: CalculatedBounds, width: number, height: number): CalculatedBounds {
  return {
    x: container.x + Math.round((container.width - width) / 2),
    y: container.y + Math.round((container.height - height) / 2),
    width,
    height,
    unit: 'px',
  };
}

function resolveText(type: PosterComponentType, data: PosterData, props: TextProps): string {
  switch (type) {
    case 'headline':
      return resolvePosterHeadline(data);
    case 'description':
      return data.description ?? data.product.description ?? '';
    case 'price':
      return data.price ? formatPrice(data.price) : '';
    case 'cta':
      return data.cta ?? props.defaultText ?? '';
    case 'discount_badge':
      return formatDiscount(data);
    case 'footer':
      return data.footer ?? '';
    default:
      return '';
  }
}

function resolvePosterHeadline(data: PosterData): string {
  const headline = data.headline.trim();
  const productName = data.product.name.trim();
  if (
    headline.length > 48 &&
    productName.length > 0 &&
    productName.length <= 44
  ) {
    return productName;
  }

  return headline;
}

function resolveImage(
  type: PosterComponentType,
  data: PosterData,
  props: ImageProps
): PosterImageData | undefined {
  if (type === 'product_image') {
    return data.product.image ?? fallbackImage(props);
  }

  if (type === 'logo') {
    return data.brand?.logo ?? fallbackImage(props);
  }

  return undefined;
}

function fallbackImage(props: ImageProps): PosterImageData | undefined {
  return props.fallbackImageUrl ? { url: props.fallbackImageUrl } : undefined;
}

function formatPrice(price: PosterPriceData): string {
  if (price.formatted) {
    return price.formatted;
  }

  return `${price.currency} ${price.amount.toFixed(2)}`;
}

function formatDiscount(data: PosterData): string {
  if (data.promotion?.discountPercent !== undefined) {
    return `Save ${data.promotion.discountPercent}%`;
  }

  return '';
}

function isTextComponent(type: PosterComponentType): boolean {
  return (
    type === 'headline' ||
    type === 'description' ||
    type === 'price' ||
    type === 'cta' ||
    type === 'discount_badge' ||
    type === 'footer'
  );
}

function isImageComponent(type: PosterComponentType): boolean {
  return type === 'product_image' || type === 'logo';
}

function groupItemsByType(items: PosterLayoutItem[]): PosterLayoutByType {
  return {
    background: items.filter((item) => item.type === 'background'),
    product_image: items.filter((item) => item.type === 'product_image'),
    headline: items.filter((item) => item.type === 'headline'),
    description: items.filter((item) => item.type === 'description'),
    price: items.filter((item) => item.type === 'price'),
    cta: items.filter((item) => item.type === 'cta'),
    discount_badge: items.filter((item) => item.type === 'discount_badge'),
    logo: items.filter((item) => item.type === 'logo'),
    footer: items.filter((item) => item.type === 'footer'),
  };
}
