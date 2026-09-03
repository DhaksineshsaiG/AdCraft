import LayoutRegistry from './LayoutRegistry';
import {
  LayoutDecision,
  LayoutDefinition,
  LayoutSelectionInput,
  PosterDimensions,
  PosterSizeInput,
  PosterSizeName,
  SafeMargins,
} from './LayoutTypes';

interface ScoredLayout {
  definition: LayoutDefinition;
  score: number;
  registryIndex: number;
}

const CATEGORY_ALIASES: Record<string, string> = {
  apparel: 'fashion',
  chair: 'furniture',
  cologne: 'fragrance',
  espresso: 'coffee',
  fitness: 'sports',
  footwear: 'footwear',
  home: 'furniture',
  laptop: 'electronics',
  necklace: 'jewelry',
  perfume: 'fragrance',
  phone: 'electronics',
  ring: 'jewelry',
  sneaker: 'footwear',
  sneakers: 'footwear',
  sport: 'sports',
  technology: 'electronics',
  watch: 'electronics',
};

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function sizeNameFromDimensions(size: PosterDimensions): PosterSizeName {
  if (size.name) return size.name;

  const ratio = size.width / size.height;
  if (ratio > 1.75) return 'wide';
  if (ratio > 1.18) return 'landscape';
  if (ratio < 0.62) return 'story';
  if (ratio < 0.88) return 'portrait';
  return 'square';
}

function resolvePosterSizeName(size: PosterSizeInput): PosterSizeName {
  if (typeof size === 'string') return size;
  return sizeNameFromDimensions(size);
}

function normalizeCategory(input: LayoutSelectionInput): string {
  const directCategory = normalize(input.productCategory);
  const searchableText = [
    directCategory,
    normalize(input.productTitle),
    ...(input.tags ?? []).map((tag) => normalize(tag)),
  ].join(' ');

  const directAlias = CATEGORY_ALIASES[directCategory];
  if (directAlias) return directAlias;

  const matchedAlias = Object.entries(CATEGORY_ALIASES).find(([term]) =>
    searchableText.includes(term)
  );

  return matchedAlias?.[1] ?? directCategory;
}

function affinityScore(affinities: Record<string, number | undefined>, value: string): number {
  if (!value) return 0;
  return affinities[value] ?? 0;
}

function scaleMargins(margins: SafeMargins, factor: number): SafeMargins {
  return {
    top: Math.round(margins.top * factor),
    right: Math.round(margins.right * factor),
    bottom: Math.round(margins.bottom * factor),
    left: Math.round(margins.left * factor),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function adaptDecisionForSize(
  decision: LayoutDecision,
  sizeName: PosterSizeName
): LayoutDecision {
  const sizeAdjustment: Record<PosterSizeName, {
    marginFactor: number;
    paddingDelta: number;
    spacingDelta: number;
    productScaleDelta: number;
    textWidthDelta: number;
  }> = {
    square: {
      marginFactor: 1,
      paddingDelta: 0,
      spacingDelta: 0,
      productScaleDelta: 0,
      textWidthDelta: 0,
    },
    portrait: {
      marginFactor: 1.08,
      paddingDelta: 1,
      spacingDelta: 0,
      productScaleDelta: -0.02,
      textWidthDelta: 4,
    },
    landscape: {
      marginFactor: 0.92,
      paddingDelta: -1,
      spacingDelta: 1,
      productScaleDelta: 0.03,
      textWidthDelta: -4,
    },
    story: {
      marginFactor: 1.18,
      paddingDelta: 1,
      spacingDelta: 1,
      productScaleDelta: -0.05,
      textWidthDelta: 8,
    },
    wide: {
      marginFactor: 0.88,
      paddingDelta: -1,
      spacingDelta: 1,
      productScaleDelta: 0.04,
      textWidthDelta: -6,
    },
  };

  const adjustment = sizeAdjustment[sizeName];

  return {
    ...decision,
    padding: clamp(decision.padding + adjustment.paddingDelta, 5, 12),
    spacing: clamp(decision.spacing + adjustment.spacingDelta, 3, 8),
    productScale: Number(clamp(decision.productScale + adjustment.productScaleDelta, 0.42, 0.8).toFixed(2)),
    textWidth: clamp(decision.textWidth + adjustment.textWidthDelta, 34, 76),
    safeMargins: scaleMargins(decision.safeMargins, adjustment.marginFactor),
  };
}

export class LayoutEngine {
  private readonly registry: LayoutRegistry;

  constructor(registry = new LayoutRegistry()) {
    this.registry = registry;
  }

  selectLayout(input: LayoutSelectionInput): LayoutDecision {
    const sizeName = resolvePosterSizeName(input.posterSize);
    const category = normalizeCategory(input);
    const campaign = normalize(input.campaign);
    const tone = normalize(input.tone);
    const industryPack = normalize(input.industryPack);
    const layouts = this.registry.getAll();

    const scoredLayouts = layouts.map<ScoredLayout>((definition, registryIndex) => ({
      definition,
      registryIndex,
      score:
        definition.baseScore +
        affinityScore(definition.categoryAffinity, category) +
        affinityScore(definition.campaignAffinity, campaign) +
        affinityScore(definition.toneAffinity, tone) +
        affinityScore(definition.industryPackAffinity, industryPack) +
        (definition.sizeAffinity[sizeName] ?? 0),
    }));

    const best = scoredLayouts.reduce((currentBest, candidate) => {
      if (candidate.score > currentBest.score) return candidate;
      if (candidate.score === currentBest.score && candidate.registryIndex < currentBest.registryIndex) {
        return candidate;
      }
      return currentBest;
    });

    return adaptDecisionForSize(best.definition.decision, sizeName);
  }
}

export default LayoutEngine;
