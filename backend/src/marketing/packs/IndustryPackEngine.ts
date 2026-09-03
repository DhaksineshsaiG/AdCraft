import gamingPack from './gaming.json';
import fashionPack from './fashion.json';
import jewelryPack from './jewelry.json';
import luxuryPack from './luxury.json';
import electronicsPack from './electronics.json';
import fitnessPack from './fitness.json';
import coffeePack from './coffee.json';
import furniturePack from './furniture.json';
import technologyPack from './technology.json';
import businessPack from './business.json';
import type { AnalyzedProduct } from '../analyzer/ProductAnalyzer';
import type { ExtractedMarketingAttributes } from '../features/FeatureExtractor';

export interface IndustryPack {
  name: string;
  matchTerms: string[];
  verbs: string[];
  adjectives: string[];
  benefits: string[];
  cta: string[];
  emotions: string[];
  audience: string[];
  features: string[];
  headlineTemplates: string[];
  descriptionTemplates: string[];
}

const PACKS = [
  gamingPack,
  fashionPack,
  jewelryPack,
  luxuryPack,
  electronicsPack,
  fitnessPack,
  coffeePack,
  furniturePack,
  technologyPack,
  businessPack,
] as IndustryPack[];

function includesTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

export class IndustryPackEngine {
  detect(
    product: AnalyzedProduct,
    attributes: ExtractedMarketingAttributes,
    requestedPack?: string
  ): IndustryPack {
    if (requestedPack) {
      const explicitPack = PACKS.find(
        (pack) => pack.name.toLowerCase() === requestedPack.toLowerCase()
      );
      if (explicitPack) return explicitPack;
    }

    const searchableText = [
      product.title,
      product.category,
      product.description,
      product.vendor,
      product.normalizedCategory,
      ...product.tags,
      ...attributes.features,
      ...attributes.keywords,
    ]
      .join(' ')
      .toLowerCase();

    return (
      PACKS.find((pack) =>
        pack.matchTerms.some((term) => includesTerm(searchableText, term))
      ) ?? technologyPack
    );
  }

  listPacks(): string[] {
    return PACKS.map((pack) => pack.name);
  }
}

export default IndustryPackEngine;
