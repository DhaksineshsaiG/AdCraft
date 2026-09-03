import TypographyRegistry from './TypographyRegistry';
import {
  TypographyDecision,
  TypographyDefinition,
  TypographySelectionInput,
} from './TypographyTypes';

interface ScoredTypography {
  definition: TypographyDefinition;
  score: number;
  registryIndex: number;
}

const CATEGORY_ALIASES: Record<string, string> = {
  apparel: 'fashion',
  blazer: 'fashion',
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
  sofa: 'furniture',
  sport: 'sports',
  technology: 'technology',
  watch: 'electronics',
};

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeLayout(value: string | undefined): string {
  return normalize(value);
}

function normalizeCategory(input: TypographySelectionInput): string {
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

function adaptDecisionForLayout(
  decision: TypographyDecision,
  layoutId: string
): TypographyDecision {
  if (layoutId === 'grid') {
    return {
      ...decision,
      headlineSize: Math.max(decision.headlineSize - 4, 40),
      subheadlineSize: Math.max(decision.subheadlineSize - 2, 17),
      descriptionSize: Math.max(decision.descriptionSize - 1, 15),
      maxCharactersPerLine: Math.max(decision.maxCharactersPerLine - 2, 20),
      safeTextWidth: Math.min(decision.safeTextWidth, 50),
    };
  }

  if (layoutId === 'story') {
    return {
      ...decision,
      alignment: decision.alignment === 'right' ? 'right' : 'center',
      headlineSize: Math.max(decision.headlineSize - 2, 42),
      lineHeight: Number(Math.min(decision.lineHeight + 0.03, 1.24).toFixed(2)),
      safeTextWidth: Math.min(decision.safeTextWidth + 4, 66),
    };
  }

  if (layoutId === 'split' || layoutId === 'hero-left' || layoutId === 'hero-right') {
    return {
      ...decision,
      alignment: decision.alignment === 'center' ? 'left' : decision.alignment,
      maxCharactersPerLine: Math.min(decision.maxCharactersPerLine, 32),
      safeTextWidth: Math.min(decision.safeTextWidth, 56),
    };
  }

  return decision;
}

export class TypographyEngine {
  private readonly registry: TypographyRegistry;

  constructor(registry = new TypographyRegistry()) {
    this.registry = registry;
  }

  selectTypography(input: TypographySelectionInput): TypographyDecision {
    const category = normalizeCategory(input);
    const tone = normalize(input.tone);
    const campaign = normalize(input.campaign);
    const layoutId = normalizeLayout(input.layoutId);
    const industryPack = normalize(input.industryPack);
    const profiles = this.registry.getAll();

    const scoredProfiles = profiles.map<ScoredTypography>((definition, registryIndex) => ({
      definition,
      registryIndex,
      score:
        definition.baseScore +
        affinityScore(definition.categoryAffinity, category) +
        affinityScore(definition.toneAffinity, tone) +
        affinityScore(definition.campaignAffinity, campaign) +
        affinityScore(definition.layoutAffinity, layoutId) +
        affinityScore(definition.industryPackAffinity, industryPack),
    }));

    const best = scoredProfiles.reduce((currentBest, candidate) => {
      if (candidate.score > currentBest.score) return candidate;
      if (candidate.score === currentBest.score && candidate.registryIndex < currentBest.registryIndex) {
        return candidate;
      }
      return currentBest;
    });

    return adaptDecisionForLayout(best.definition.decision, layoutId);
  }
}

export default TypographyEngine;
