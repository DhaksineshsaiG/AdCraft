import DecorationRegistry from './DecorationRegistry';
import {
  DecorationDecision,
  DecorationDefinition,
  DecorationSelectionInput,
} from './DecorationTypes';

interface ScoredDecoration {
  definition: DecorationDefinition;
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

function normalizeCategory(input: DecorationSelectionInput): string {
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

export class DecorationEngine {
  private readonly registry: DecorationRegistry;

  constructor(registry = new DecorationRegistry()) {
    this.registry = registry;
  }

  selectDecoration(input: DecorationSelectionInput): DecorationDecision {
    const category = normalizeCategory(input);
    const campaign = normalize(input.campaign);
    const tone = normalize(input.tone);
    const layoutId = normalize(input.layoutId);
    const typographyId = normalize(input.typographyId);
    const paletteId = normalize(input.paletteId);
    const backgroundThemeId = normalize(input.backgroundThemeId);
    const industryPack = normalize(input.industryPack);
    const decorations = this.registry.getAll();

    const scoredDecorations = decorations.map<ScoredDecoration>((definition, registryIndex) => ({
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
        affinityScore(definition.backgroundAffinity, backgroundThemeId) +
        affinityScore(definition.industryPackAffinity, industryPack),
    }));

    const best = scoredDecorations.reduce((currentBest, candidate) => {
      if (candidate.score > currentBest.score) return candidate;
      if (candidate.score === currentBest.score && candidate.registryIndex < currentBest.registryIndex) {
        return candidate;
      }
      return currentBest;
    });

    return best.definition.decision;
  }
}

export default DecorationEngine;
