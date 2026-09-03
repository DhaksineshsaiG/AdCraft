import PositionRegistry from './PositionRegistry';
import {
  PositionDecision,
  PositionDefinition,
  PositionSelectionInput,
} from './PositionTypes';
import type { PosterDimensions, PosterSizeInput, PosterSizeName, SafeMargins } from '../layout/LayoutTypes';

interface ScoredPosition {
  definition: PositionDefinition;
  score: number;
  registryIndex: number;
}

const CATEGORY_ALIASES: Record<string, string> = {
  apparel: 'fashion',
  blazer: 'fashion',
  bottle: 'sports',
  chair: 'furniture',
  cologne: 'perfume',
  dress: 'fashion',
  earbuds: 'electronics',
  espresso: 'coffee',
  fitness: 'sports',
  footwear: 'shoes',
  home: 'furniture',
  laptop: 'electronics',
  mug: 'coffee',
  necklace: 'jewelry',
  phone: 'phone',
  ring: 'jewelry',
  sneaker: 'shoes',
  sneakers: 'shoes',
  sofa: 'furniture',
  sport: 'sports',
  smartphone: 'phone',
  technology: 'technology',
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

function normalizeCategory(input: PositionSelectionInput): string {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function scaleMargins(margins: SafeMargins, factor: number): SafeMargins {
  return {
    top: Math.round(margins.top * factor),
    right: Math.round(margins.right * factor),
    bottom: Math.round(margins.bottom * factor),
    left: Math.round(margins.left * factor),
  };
}

function adaptDecisionForSize(
  decision: PositionDecision,
  sizeName: PosterSizeName
): PositionDecision {
  const adjustments: Record<PosterSizeName, {
    marginFactor: number;
    scaleDelta: number;
    offsetXDelta: number;
    offsetYDelta: number;
  }> = {
    square: {
      marginFactor: 1,
      scaleDelta: 0,
      offsetXDelta: 0,
      offsetYDelta: 0,
    },
    portrait: {
      marginFactor: 1.08,
      scaleDelta: -0.02,
      offsetXDelta: 0,
      offsetYDelta: -1,
    },
    landscape: {
      marginFactor: 0.92,
      scaleDelta: 0.03,
      offsetXDelta: 2,
      offsetYDelta: 0,
    },
    story: {
      marginFactor: 1.16,
      scaleDelta: -0.05,
      offsetXDelta: 0,
      offsetYDelta: -2,
    },
    wide: {
      marginFactor: 0.88,
      scaleDelta: 0.04,
      offsetXDelta: 3,
      offsetYDelta: 0,
    },
  };
  const adjustment = adjustments[sizeName];

  return {
    ...decision,
    scale: Number(clamp(decision.scale + adjustment.scaleDelta, 0.38, 0.92).toFixed(2)),
    offsetX: clamp(decision.offsetX + adjustment.offsetXDelta, -18, 18),
    offsetY: clamp(decision.offsetY + adjustment.offsetYDelta, -18, 18),
    safeMargins: scaleMargins(decision.safeMargins, adjustment.marginFactor),
  };
}

export class PositionEngine {
  private readonly registry: PositionRegistry;

  constructor(registry = new PositionRegistry()) {
    this.registry = registry;
  }

  selectPosition(input: PositionSelectionInput): PositionDecision {
    const category = normalizeCategory(input);
    const layoutId = normalize(input.layoutId);
    const typographyId = normalize(input.typographyId);
    const paletteId = normalize(input.paletteId);
    const campaign = normalize(input.campaign);
    const industryPack = normalize(input.industryPack);
    const sizeName = resolvePosterSizeName(input.posterSize);
    const positions = this.registry.getAll();

    const scoredPositions = positions.map<ScoredPosition>((definition, registryIndex) => ({
      definition,
      registryIndex,
      score:
        definition.baseScore +
        affinityScore(definition.categoryAffinity, category) +
        affinityScore(definition.layoutAffinity, layoutId) +
        affinityScore(definition.typographyAffinity, typographyId) +
        affinityScore(definition.paletteAffinity, paletteId) +
        affinityScore(definition.campaignAffinity, campaign) +
        affinityScore(definition.industryPackAffinity, industryPack) +
        (definition.sizeAffinity[sizeName] ?? 0),
    }));

    const best = scoredPositions.reduce((currentBest, candidate) => {
      if (candidate.score > currentBest.score) return candidate;
      if (candidate.score === currentBest.score && candidate.registryIndex < currentBest.registryIndex) {
        return candidate;
      }
      return currentBest;
    });

    return adaptDecisionForSize(best.definition.decision, sizeName);
  }
}

export default PositionEngine;
