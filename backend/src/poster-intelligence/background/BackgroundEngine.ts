import BackgroundRegistry from './BackgroundRegistry';
import {
  BackgroundDecision,
  BackgroundDefinition,
  BackgroundSelectionInput,
  VisualWeight,
} from './BackgroundTypes';
import type { PosterDimensions, PosterSizeInput, PosterSizeName } from '../layout/LayoutTypes';

interface ScoredBackground {
  definition: BackgroundDefinition;
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

function normalizeCategory(input: BackgroundSelectionInput): string {
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

function heavierVisualWeight(weight: VisualWeight): VisualWeight {
  const order: VisualWeight[] = ['light', 'balanced', 'rich', 'bold', 'cinematic'];
  const index = order.indexOf(weight);
  return order[Math.min(index + 1, order.length - 1)] ?? weight;
}

function lighterVisualWeight(weight: VisualWeight): VisualWeight {
  const order: VisualWeight[] = ['light', 'balanced', 'rich', 'bold', 'cinematic'];
  const index = order.indexOf(weight);
  return order[Math.max(index - 1, 0)] ?? weight;
}

function adaptDecisionForSize(
  decision: BackgroundDecision,
  sizeName: PosterSizeName
): BackgroundDecision {
  if (sizeName === 'story') {
    return {
      ...decision,
      vignette: clamp(decision.vignette + 3, 0, 24),
      blur: clamp(decision.blur + 1, 0, 12),
      depth: decision.depth === 'flat' ? 'shallow' : decision.depth,
      visualWeight: heavierVisualWeight(decision.visualWeight),
    };
  }

  if (sizeName === 'wide' || sizeName === 'landscape') {
    return {
      ...decision,
      vignette: clamp(decision.vignette - 1, 0, 24),
      blur: clamp(decision.blur + 1, 0, 12),
      visualWeight: decision.visualWeight === 'cinematic'
        ? decision.visualWeight
        : heavierVisualWeight(decision.visualWeight),
    };
  }

  if (sizeName === 'square') {
    return {
      ...decision,
      visualWeight: lighterVisualWeight(decision.visualWeight),
    };
  }

  return decision;
}

export class BackgroundEngine {
  private readonly registry: BackgroundRegistry;

  constructor(registry = new BackgroundRegistry()) {
    this.registry = registry;
  }

  selectBackground(input: BackgroundSelectionInput): BackgroundDecision {
    const category = normalizeCategory(input);
    const campaign = normalize(input.campaign);
    const tone = normalize(input.tone);
    const layoutId = normalize(input.layoutId);
    const typographyId = normalize(input.typographyId);
    const paletteId = normalize(input.paletteId);
    const industryPack = normalize(input.industryPack);
    const sizeName = resolvePosterSizeName(input.posterSize);
    const themes = this.registry.getAll();

    const scoredThemes = themes.map<ScoredBackground>((definition, registryIndex) => ({
      definition,
      registryIndex,
      score:
        definition.baseScore +
        affinityScore(definition.categoryAffinity, category) +
        affinityScore(definition.campaignAffinity, campaign) +
        affinityScore(definition.toneAffinity, tone) +
        affinityScore(definition.layoutAffinity, layoutId) +
        affinityScore(definition.typographyAffinity, typographyId) +
        affinityScore(definition.paletteAffinity, paletteId) +
        affinityScore(definition.industryPackAffinity, industryPack) +
        (definition.sizeAffinity[sizeName] ?? 0),
    }));

    const best = scoredThemes.reduce((currentBest, candidate) => {
      if (candidate.score > currentBest.score) return candidate;
      if (candidate.score === currentBest.score && candidate.registryIndex < currentBest.registryIndex) {
        return candidate;
      }
      return currentBest;
    });

    return adaptDecisionForSize(best.definition.decision, sizeName);
  }
}

export default BackgroundEngine;
