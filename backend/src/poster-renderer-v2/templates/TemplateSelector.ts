import TemplateRegistry from './TemplateRegistry';
import {
  RendererTemplateProfile,
  TemplateCollection,
  TemplateSelectionInput,
} from './TemplateTypes';

const CATEGORY_COLLECTION_HINTS: Record<string, TemplateCollection> = {
  luxury: 'Luxury',
  fragrance: 'Luxury',
  perfume: 'Luxury',
  sports: 'Sports',
  fitness: 'Sports',
  shoes: 'Sports',
  footwear: 'Sports',
  fashion: 'Fashion',
  apparel: 'Fashion',
  coffee: 'Coffee',
  espresso: 'Coffee',
  furniture: 'Furniture',
  home: 'Furniture',
  electronics: 'Electronics',
  phone: 'Electronics',
  audio: 'Electronics',
  technology: 'Technology',
  software: 'Technology',
  gaming: 'Technology',
  jewelry: 'Jewelry',
  necklace: 'Jewelry',
  ring: 'Jewelry',
  minimal: 'Minimal',
  editorial: 'Editorial',
};

export class TemplateSelector {
  constructor(private readonly registry = new TemplateRegistry()) {}

  selectTemplate(input: TemplateSelectionInput): RendererTemplateProfile {
    if (input.templateId) {
      const template = this.registry.getById(input.templateId);
      if (template) return template;
    }

    const candidates = input.preferredCollection
      ? this.registry.getByCollection(input.preferredCollection)
      : this.registry.getAll();
    const normalized = normalizeInput(input);
    const selected = candidates
      .map((template) => ({
        template,
        score: this.scoreTemplate(template, normalized),
      }))
      .sort((a, b) => b.score - a.score)[0]?.template;

    return selected ?? this.registry.getByCollection('Minimal')[0]!;
  }

  private scoreTemplate(
    template: RendererTemplateProfile,
    input: NormalizedTemplateInput
  ): number {
    const hintedCollection = CATEGORY_COLLECTION_HINTS[input.category] ?? CATEGORY_COLLECTION_HINTS[input.industryPack];
    let score = 10;

    if (hintedCollection === template.collection) score += 28;
    if (input.preferredCollection === template.collection) score += 34;
    score += affinityScore(template.affinity.categories, input.category, 18);
    score += affinityScore(template.affinity.campaigns, input.campaign, 12);
    score += affinityScore(template.affinity.tones, input.tone, 12);
    score += affinityScore(template.affinity.industryPacks, input.industryPack, 10);
    score += affinityScore(template.affinity.posterSizes, input.posterSize, 8);

    if (template.collection.toLowerCase() === input.industryPack) score += 12;
    if (template.collection.toLowerCase() === input.tone) score += 8;
    if (template.collection.toLowerCase() === input.campaign) score += 8;

    return score;
  }
}

interface NormalizedTemplateInput {
  category: string;
  campaign: string;
  tone: string;
  industryPack: string;
  posterSize: string;
  preferredCollection?: TemplateCollection;
}

function normalizeInput(input: TemplateSelectionInput): NormalizedTemplateInput {
  return {
    category: normalize(input.productCategory),
    campaign: normalize(input.campaign),
    tone: normalize(input.tone),
    industryPack: normalize(input.industryPack),
    posterSize: normalizePosterSize(input.posterSize),
    preferredCollection: input.preferredCollection,
  };
}

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function normalizePosterSize(size: TemplateSelectionInput['posterSize']): string {
  if (typeof size === 'string') return normalize(size);

  const aspect = size.width / size.height;
  if (Math.abs(aspect - 1) < 0.05) return 'square';
  if (Math.abs(aspect - 1200 / 630) < 0.08) return 'facebook-post';
  if (Math.abs(aspect - 1240 / 1754) < 0.08) return 'a4-print';
  return aspect > 1 ? 'landscape' : 'portrait';
}

function affinityScore(values: string[], candidate: string, weight: number): number {
  if (!candidate) return 0;
  return values.some((value) => normalize(value) === candidate || candidate.includes(normalize(value)))
    ? weight
    : 0;
}

export default TemplateSelector;
