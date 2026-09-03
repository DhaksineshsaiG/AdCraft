import type { AnalyzedProduct } from '../analyzer/ProductAnalyzer';
import type { ExtractedMarketingAttributes } from '../features/FeatureExtractor';

export interface ProductMarketingContext {
  audience: string[];
  lifestyle: string[];
  intent: string[];
}

interface ContextRule {
  terms: string[];
  audience: string[];
  lifestyle: string[];
  intent: string[];
}

const CONTEXT_RULES: ContextRule[] = [
  {
    terms: ['running', 'sneaker', 'training', 'athletic', 'fitness'],
    audience: ['Athletes', 'Fitness Enthusiasts'],
    lifestyle: ['Active Days', 'Training Sessions', 'Weekend Movement'],
    intent: ['Improve Performance', 'Stay Comfortable', 'Move With Confidence'],
  },
  {
    terms: ['perfume', 'fragrance', 'luxury', 'scent'],
    audience: ['Professionals', 'Luxury Buyers'],
    lifestyle: ['Evening Plans', 'Special Occasions', 'Personal Rituals'],
    intent: ['Make An Impression', 'Express Identity', 'Gift Beautifully'],
  },
  {
    terms: ['gaming', 'laptop', 'keyboard', 'graphics', 'developer'],
    audience: ['Gamers', 'Creators', 'Developers'],
    lifestyle: ['Focused Setups', 'Creative Workflows', 'Competitive Play'],
    intent: ['Increase Speed', 'Control The Experience', 'Create Without Friction'],
  },
  {
    terms: ['office', 'chair', 'ergonomic', 'desk', 'remote'],
    audience: ['Professionals', 'Remote Workers'],
    lifestyle: ['Home Offices', 'Long Workdays', 'Focused Rooms'],
    intent: ['Work Comfortably', 'Support Better Posture', 'Stay Productive'],
  },
  {
    terms: ['wireless', 'bluetooth', 'earbuds', 'speaker', 'audio'],
    audience: ['Commuters', 'Music Lovers', 'Travelers'],
    lifestyle: ['Daily Commutes', 'Home Listening', 'Portable Moments'],
    intent: ['Listen Anywhere', 'Stay Connected', 'Enjoy Clear Sound'],
  },
  {
    terms: ['wallet', 'leather', 'everyday carry'],
    audience: ['Professionals', 'Minimalists'],
    lifestyle: ['Daily Carry', 'Work Essentials', 'Travel Days'],
    intent: ['Organize Essentials', 'Carry Less', 'Choose Lasting Style'],
  },
  {
    terms: ['coffee', 'mug', 'tea', 'ceramic'],
    audience: ['Coffee Lovers', 'Tea Drinkers'],
    lifestyle: ['Morning Rituals', 'Desk Breaks', 'Slow Weekends'],
    intent: ['Enjoy Better Breaks', 'Start Warmly', 'Savor The Routine'],
  },
  {
    terms: ['necklace', 'jewelry', 'gold'],
    audience: ['Gift Buyers', 'Style Seekers'],
    lifestyle: ['Everyday Dressing', 'Celebrations', 'Date Nights'],
    intent: ['Add Sparkle', 'Complete The Look', 'Mark A Moment'],
  },
];

const DEFAULT_CONTEXT: ProductMarketingContext = {
  audience: ['Modern Shoppers', 'Gift Buyers'],
  lifestyle: ['Everyday Routines', 'Busy Days'],
  intent: ['Choose With Confidence', 'Upgrade The Everyday'],
};

function addUnique(target: string[], values: string[]): void {
  for (const value of values) {
    if (!target.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      target.push(value);
    }
  }
}

function includesTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

export class ProductContext {
  infer(
    product: AnalyzedProduct,
    attributes: ExtractedMarketingAttributes
  ): ProductMarketingContext {
    const context: ProductMarketingContext = {
      audience: [...DEFAULT_CONTEXT.audience],
      lifestyle: [...DEFAULT_CONTEXT.lifestyle],
      intent: [...DEFAULT_CONTEXT.intent],
    };
    const searchableText = [
      product.title,
      product.description,
      product.category,
      product.vendor,
      product.normalizedCategory,
      ...product.tags,
      ...attributes.features,
      ...attributes.keywords,
    ]
      .join(' ')
      .toLowerCase();

    for (const rule of CONTEXT_RULES) {
      if (rule.terms.some((term) => includesTerm(searchableText, term))) {
        addUnique(context.audience, rule.audience);
        addUnique(context.lifestyle, rule.lifestyle);
        addUnique(context.intent, rule.intent);
      }
    }

    addUnique(context.audience, attributes.audience);

    return {
      audience: context.audience.slice(0, 10),
      lifestyle: context.lifestyle.slice(0, 8),
      intent: context.intent.slice(0, 8),
    };
  }
}

export default ProductContext;
