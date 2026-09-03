import coffeeDictionary from '../dictionary/coffee.json';
import electronicsDictionary from '../dictionary/electronics.json';
import fashionDictionary from '../dictionary/fashion.json';
import footwearDictionary from '../dictionary/footwear.json';
import fragranceDictionary from '../dictionary/fragrance.json';
import furnitureDictionary from '../dictionary/furniture.json';
import jewelryDictionary from '../dictionary/jewelry.json';
import sportsDictionary from '../dictionary/sports.json';
import ctaTemplates from '../templates/cta.json';
import descriptionTemplates from '../templates/description.json';
import headlineTemplates from '../templates/headline.json';
import type { AnalyzedProduct } from '../analyzer/ProductAnalyzer';
import type { MarketingCategory } from '../category/CategoryDetector';
import CampaignEngine, {
  CampaignDefinition,
  CampaignName,
} from '../campaigns/CampaignEngine';
import MemoryEngine from '../memory/MemoryEngine';
import type { MemoryKind } from '../memory/MemoryEngine';
import ProductContext, { ProductMarketingContext } from '../context/ProductContext';
import FeatureExtractor, {
  ExtractedMarketingAttributes,
} from '../features/FeatureExtractor';
import IndustryPackEngine, { IndustryPack } from '../packs/IndustryPackEngine';
import LearningEngine, { LearnedPreferenceSummary } from '../learning/LearningEngine';
import type { MarketingTone } from '../tone/ToneEngine';
import VariationEngine, {
  VariationCandidate,
  VariationSelection,
} from '../variation/VariationEngine';

interface MarketingDictionary {
  tone: MarketingTone;
  verbs: string[];
  adjectives: string[];
  benefits: string[];
  cta: string[];
  emotions: string[];
  audience: string[];
  features: string[];
}

export interface GeneratedMarketingContent {
  headline: string;
  subheadline: string;
  description: string;
  cta: string;
  features: string[];
  benefits: string[];
  audience: string[];
  emotions: string[];
  keywords: string[];
  lifestyle: string[];
  intent: string[];
  templateCategory: string;
  templateIds: string[];
  variationScore: number;
  dictionary: string;
  campaignUsed: string;
  industryPackUsed: string;
  personalizationApplied: boolean;
  learnedPreferences: LearnedPreferenceSummary | null;
}

export interface ComposeOptions {
  userId?: string;
  campaign?: CampaignName;
  industryPack?: string;
  applyPersonalization?: boolean;
}

const GENERAL_DICTIONARY: MarketingDictionary = {
  tone: 'Professional',
  verbs: ['improve', 'support', 'simplify', 'enhance', 'deliver', 'create', 'refresh', 'upgrade', 'streamline', 'complete', 'choose', 'discover', 'explore', 'organize', 'elevate', 'adapt', 'balance', 'shape', 'use', 'trust', 'build', 'solve', 'prepare', 'finish', 'focus', 'save', 'guide', 'bring', 'match', 'serve', 'extend', 'refine', 'polish', 'strengthen', 'clarify', 'unlock', 'modernize', 'renew', 'carry', 'offer', 'connect', 'restore'],
  adjectives: ['reliable', 'practical', 'polished', 'versatile', 'trusted', 'useful', 'quality', 'thoughtful', 'effective', 'refined', 'modern', 'durable', 'simple', 'balanced', 'smart', 'clean', 'everyday', 'premium', 'comfortable', 'adaptable', 'well-made', 'functional', 'focused', 'classic', 'fresh', 'capable', 'organized', 'smooth', 'helpful', 'lasting', 'confident', 'essential', 'clear', 'ready', 'compact', 'efficient', 'considered', 'flexible', 'dependable', 'approachable', 'complete', 'valuable'],
  benefits: ['everyday value', 'better routines', 'reliable use', 'simple decisions', 'lasting quality', 'practical comfort', 'confident choice', 'useful function', 'easy ownership', 'trusted performance', 'clearer routines', 'daily readiness', 'less friction', 'better organization', 'smart value', 'modern convenience', 'time saved', 'steady support', 'premium feel', 'easy gifting', 'practical upgrade', 'cleaner setup', 'long-term usefulness', 'smooth experience', 'dependable results', 'everyday confidence', 'focused decisions', 'improved comfort', 'useful flexibility', 'simple maintenance', 'balanced quality', 'better fit', 'lasting appeal', 'quick adoption', 'thoughtful detail', 'fresh perspective', 'easy confidence', 'versatile styling', 'organized essentials', 'more control', 'refined utility', 'stronger value'],
  cta: ['Shop Now', 'Discover More', 'View Collection', 'Explore Today', 'Choose Yours', 'Get Started', 'See Details', 'Make It Yours', 'Shop Favorites', 'Explore Essentials', 'Find Your Match', 'Upgrade Today', 'Choose Better', 'View Products', 'Explore The Range', 'Start Here', 'Browse The Edit', 'Shop The Collection', 'Refresh The Routine', 'Find The Right Fit', 'Try It Today', 'Bring It Home', 'Shop New Picks', 'Explore More', 'Get Yours Today', 'See What Is New', 'Choose With Confidence', 'Shop Everyday Essentials', 'View The Details', 'Start The Upgrade', 'Find Your Favorite', 'Discover The Difference', 'Explore The Lineup', 'Shop Smart Choices', 'Make The Switch', 'Choose The Upgrade', 'Shop With Confidence', 'See The Collection', 'Browse Favorites', 'Unlock More', 'Complete Your Setup', 'Start Better'],
  emotions: ['confident', 'assured', 'satisfied', 'ready', 'clear', 'calm', 'focused', 'prepared', 'comfortable', 'relieved', 'capable', 'organized', 'steady', 'inspired', 'secure', 'practical', 'optimistic', 'refreshed', 'balanced', 'empowered', 'settled', 'smart', 'supported', 'motivated', 'pleased', 'certain', 'fresh', 'connected', 'grounded', 'efficient', 'polished', 'aware', 'simple', 'trusted', 'complete', 'easy', 'modern', 'valued', 'adaptable', 'useful', 'strong', 'guided'],
  audience: ['modern shoppers', 'gift buyers', 'everyday users', 'professionals', 'families', 'students', 'homeowners', 'travelers', 'busy parents', 'remote workers', 'minimalists', 'value seekers', 'quality buyers', 'practical shoppers', 'first-time buyers', 'upgraders', 'organizers', 'small teams', 'style seekers', 'comfort shoppers', 'tech users', 'wellness fans', 'creatives', 'planners', 'hosts', 'commuters', 'new movers', 'business owners', 'teachers', 'makers', 'collectors', 'routine builders', 'problem solvers', 'weekend users', 'daily operators', 'gift givers', 'premium buyers', 'comparison shoppers', 'trend watchers', 'workspace builders', 'home users', 'essential buyers'],
  features: ['quality materials', 'practical design', 'everyday function', 'reliable finish', 'compact form', 'clean profile', 'durable build', 'easy setup', 'gift-ready packaging', 'smooth surface', 'simple controls', 'comfortable shape', 'versatile use', 'premium detail', 'useful storage', 'portable size', 'modern finish', 'balanced weight', 'secure closure', 'thoughtful layout', 'long-lasting construction', 'easy-care surface', 'refined texture', 'daily-ready format', 'space-saving shape', 'clear instructions', 'strong stitching', 'stable base', 'polished edge', 'protective detail', 'adjustable fit', 'flexible format', 'classic style', 'fresh color', 'efficient layout', 'trusted component', 'smart feature', 'lightweight body', 'organized section', 'supportive design', 'value-focused detail', 'dependable finish'],
};

const DICTIONARIES: Record<MarketingCategory, MarketingDictionary> = {
  Footwear: footwearDictionary as MarketingDictionary,
  Fragrance: fragranceDictionary as MarketingDictionary,
  Electronics: electronicsDictionary as MarketingDictionary,
  Jewelry: jewelryDictionary as MarketingDictionary,
  Coffee: coffeeDictionary as MarketingDictionary,
  Fashion: fashionDictionary as MarketingDictionary,
  Furniture: furnitureDictionary as MarketingDictionary,
  Sports: sportsDictionary as MarketingDictionary,
  General: GENERAL_DICTIONARY,
};

type TemplateLibrary = Record<string, string[]>;

interface ComposerAttempt {
  content: GeneratedMarketingContent;
  selections: VariationSelection[];
}

function addUnique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toCandidates(values: string[], prefix: string): VariationCandidate[] {
  return addUnique(values).map((value, index) => ({
    id: `${prefix}:${index}:${value.toLowerCase()}`,
    value,
    group: prefix,
    tags: value.split(/\s+/),
  }));
}

function flattenTemplates(library: TemplateLibrary, prefix: string): VariationCandidate[] {
  return Object.entries(library).flatMap(([group, templates]) =>
    templates.map((template, index) => ({
      id: `${prefix}:${group}:${index}`,
      value: template,
      group,
      tags: [group],
    }))
  );
}

function fillTemplate(
  template: string,
  product: AnalyzedProduct,
  values: Record<string, string>
): string {
  const rendered = template.replace(/\{([a-z]+)\}/g, (_, key: string) => {
    if (key === 'product') return product.title;
    if (key === 'vendor') return product.vendor || 'the brand';
    if (key === 'category') return product.normalizedCategory;
    return values[key] ?? '';
  });

  return cleanCopy(rendered);
}

function cleanCopy(value: string): string {
  return value
    .replace(/\bA ([aeiou])/g, 'An $1')
    .replace(/\ba ([aeiou])/g, 'an $1')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.?!])/g, '$1')
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function preferredHeadlineGroups(tone: MarketingTone): string[] {
  if (tone === 'Luxury' || tone === 'Elegant') return ['Luxury', 'Emotion', 'Benefit'];
  if (tone === 'Minimal') return ['Minimal', 'Benefit', 'Question'];
  if (tone === 'Modern') return ['Performance', 'Benefit', 'Action'];
  if (tone === 'Warm' || tone === 'Stylish') return ['Emotion', 'Benefit', 'Action'];
  if (tone === 'Energetic' || tone === 'Powerful') return ['Performance', 'Action', 'Benefit'];
  return ['Benefit', 'Action', 'Question'];
}

function preferredDescriptionGroups(tone: MarketingTone): string[] {
  if (tone === 'Luxury' || tone === 'Elegant') return ['Premium', 'Storytelling', 'Benefit-first'];
  if (tone === 'Minimal') return ['Feature-first', 'Lifestyle', 'Benefit-first'];
  if (tone === 'Modern' || tone === 'Powerful') return ['Technical', 'Feature-first', 'Benefit-first'];
  if (tone === 'Warm' || tone === 'Stylish') return ['Lifestyle', 'Storytelling', 'Benefit-first'];
  return ['Benefit-first', 'Feature-first', 'Lifestyle'];
}

function preferredCtaGroups(tone: MarketingTone): string[] {
  if (tone === 'Luxury' || tone === 'Elegant') return ['Luxury', 'Collection', 'Action'];
  if (tone === 'Minimal' || tone === 'Warm') return ['Minimal', 'Collection', 'Action'];
  if (tone === 'Energetic' || tone === 'Powerful') return ['Urgency', 'Action', 'Collection'];
  return ['Action', 'Collection', 'Urgency'];
}

function firstMatchingPreference(values: string[], candidates: string[]): string | undefined {
  const normalizedCandidates = candidates.map((candidate) => candidate.toLowerCase());
  return values.find((value) => normalizedCandidates.includes(value.toLowerCase()));
}

export class ContentComposer {
  private readonly memory: MemoryEngine;
  private readonly variationEngine: VariationEngine;

  constructor(
    private readonly featureExtractor: FeatureExtractor = new FeatureExtractor(),
    private readonly productContext: ProductContext = new ProductContext(),
    private readonly campaignEngine: CampaignEngine = new CampaignEngine(),
    private readonly industryPackEngine: IndustryPackEngine = new IndustryPackEngine(),
    private readonly learningEngine: LearningEngine = new LearningEngine(),
    memoryEngine: MemoryEngine = new MemoryEngine()
  ) {
    this.memory = memoryEngine;
    this.variationEngine = new VariationEngine(this.memory);
  }

  compose(product: AnalyzedProduct, options: ComposeOptions = {}): GeneratedMarketingContent {
    const dictionary = DICTIONARIES[product.normalizedCategory] ?? GENERAL_DICTIONARY;
    const extracted = this.featureExtractor.extract(product);
    const context = this.productContext.infer(product, extracted);
    const campaign = this.campaignEngine.getCampaign(options.campaign ?? 'Default');
    const industryPack = this.industryPackEngine.detect(product, extracted, options.industryPack);
    const learnedPreferences =
      options.userId && options.applyPersonalization !== false
        ? this.learningEngine.getPreferences(options.userId)
        : null;
    const personalizationApplied = Boolean(
      learnedPreferences && learnedPreferences.preferenceStrength > 0
    );
    const seed = [
      product.title,
      product.category,
      product.vendor,
      product.normalizedCategory,
      product.tone,
      campaign.name,
      industryPack.name,
      options.userId ?? 'anonymous',
      personalizationApplied ? learnedPreferences?.preferenceStrength : 0,
    ].join(':');
    let bestAttempt: ComposerAttempt | null = null;

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const candidate = this.composeAttempt(
        product,
        dictionary,
        extracted,
        context,
        campaign,
        industryPack,
        learnedPreferences,
        personalizationApplied,
        seed,
        attempt
      );
      bestAttempt = candidate;

      if (
        !this.memory.isRecent('headline', candidate.content.headline, 80) &&
        !this.memory.isRecent('description', candidate.content.description, 80)
      ) {
        break;
      }
    }

    const finalAttempt = bestAttempt as ComposerAttempt;
    this.rememberSelections(finalAttempt.selections);
    this.memory.rememberGeneratedContent({
      headline: finalAttempt.content.headline,
      description: finalAttempt.content.description,
      cta: finalAttempt.content.cta,
      templateIds: finalAttempt.content.templateIds,
      dictionary: finalAttempt.content.dictionary,
    });

    return finalAttempt.content;
  }

  getMemorySnapshot(): ReturnType<MemoryEngine['snapshot']> {
    return this.memory.snapshot();
  }

  private composeAttempt(
    product: AnalyzedProduct,
    dictionary: MarketingDictionary,
    extracted: ExtractedMarketingAttributes,
    context: ProductMarketingContext,
    campaign: CampaignDefinition,
    industryPack: IndustryPack,
    learnedPreferences: LearnedPreferenceSummary | null,
    personalizationApplied: boolean,
    seed: string,
    attempt: number
  ): ComposerAttempt {
    const preferredTemplateTypes = [
      ...campaign.templateGroups,
      ...(learnedPreferences?.preferredTemplateTypes ?? []),
    ];
    const preferredTerms = [
      product.normalizedCategory,
      product.tone,
      campaign.name,
      industryPack.name,
      ...campaign.keywords,
      ...extracted.keywords,
      ...context.audience,
      ...industryPack.matchTerms,
      ...(learnedPreferences?.preferredPhrases ?? []),
      ...(learnedPreferences?.preferredTone ?? []),
    ];
    const select = (
      values: string[],
      kind: 'verb' | 'adjective' | 'benefit' | 'emotion' | 'feature' | 'audience',
      extraValues: string[] = []
    ): VariationSelection =>
      this.variationEngine.select(toCandidates([...extraValues, ...values], kind), {
        seed: `${seed}:${kind}`,
        kind,
        preferredTerms,
        attempt,
      });
    const verb = select(dictionary.verbs, 'verb', [
      ...(learnedPreferences?.preferredVerbs ?? []),
      ...campaign.verbs,
      ...industryPack.verbs,
    ]);
    const adjective = select(dictionary.adjectives, 'adjective', [
      ...(learnedPreferences?.preferredAdjectives ?? []),
      ...campaign.adjectives,
      ...industryPack.adjectives,
    ]);
    const benefit = select(dictionary.benefits, 'benefit', [
      ...campaign.benefits,
      ...industryPack.benefits,
      ...extracted.benefits,
    ]);
    const emotion = select(dictionary.emotions, 'emotion', [
      ...campaign.emotions,
      ...industryPack.emotions,
      ...extracted.emotions,
    ]);
    const feature = select(dictionary.features, 'feature', [
      ...industryPack.features,
      ...extracted.features,
    ]);
    const audience = select(dictionary.audience, 'audience', [
      ...industryPack.audience,
      ...context.audience,
    ]);
    const keyword = this.variationEngine.select(toCandidates(extracted.keywords, 'keyword'), {
      seed: `${seed}:keyword`,
      kind: 'feature',
      preferredTerms,
      attempt,
    });
    const lifestyle = this.variationEngine.select(toCandidates(context.lifestyle, 'lifestyle'), {
      seed: `${seed}:lifestyle`,
      kind: 'feature',
      preferredTerms,
      attempt,
    });
    const intent = this.variationEngine.select(toCandidates(context.intent, 'intent'), {
      seed: `${seed}:intent`,
      kind: 'benefit',
      preferredTerms,
      attempt,
    });
    const headlineTemplate = this.variationEngine.select(
      [
        ...flattenTemplates(headlineTemplates as TemplateLibrary, 'headline-template'),
        ...toCandidates(industryPack.headlineTemplates, 'headline-pack-template'),
        ...toCandidates(
          (learnedPreferences?.preferredTemplateTypes ?? []).map(
            (templateType) => `{adjective} ${templateType} For {benefit}`
          ),
          'headline-learned-template'
        ),
      ],
      {
        seed: `${seed}:headline-template`,
        kind: 'template',
        preferredGroups: [...preferredHeadlineGroups(product.tone), ...preferredTemplateTypes],
        preferredTerms,
        attempt,
      }
    );
    const descriptionTemplate = this.variationEngine.select(
      [
        ...flattenTemplates(descriptionTemplates as TemplateLibrary, 'description-template'),
        ...toCandidates(industryPack.descriptionTemplates, 'description-pack-template'),
      ],
      {
        seed: `${seed}:description-template`,
        kind: 'template',
        preferredGroups: [...preferredDescriptionGroups(product.tone), ...preferredTemplateTypes],
        preferredTerms,
        attempt,
      }
    );
    const ctaSelection = this.variationEngine.select(
      [
        ...flattenTemplates(ctaTemplates as TemplateLibrary, 'cta-template'),
        ...toCandidates(learnedPreferences?.preferredCtas ?? [], 'cta-learned'),
        ...toCandidates(campaign.cta, 'cta-campaign'),
        ...toCandidates(industryPack.cta, 'cta-pack'),
        ...toCandidates(dictionary.cta, 'cta'),
      ],
      {
        seed: `${seed}:cta`,
        kind: 'cta',
        preferredGroups: [...preferredCtaGroups(product.tone), ...preferredTemplateTypes],
        preferredTerms,
        attempt,
      }
    );
    const values = {
      verb:
        personalizationApplied && learnedPreferences?.preferredVerbs[0]
          ? learnedPreferences.preferredVerbs[0]
          : verb.value,
      adjective:
        personalizationApplied && learnedPreferences?.preferredAdjectives[0]
          ? learnedPreferences.preferredAdjectives[0]
          : adjective.value,
      benefit: benefit.value,
      emotion: emotion.value,
      feature: feature.value,
      audience:
        personalizationApplied && learnedPreferences
          ? firstMatchingPreference(learnedPreferences.preferredPhrases, [
              'gamers',
              'creators',
              'players',
              'professionals',
              'buyers',
            ]) ?? audience.value
          : audience.value,
      keyword: keyword.value,
      lifestyle: lifestyle.value,
      intent: intent.value,
    };
    const headline = fillTemplate(headlineTemplate.value, product, values);
    const subheadline = fillTemplate(
      '{adjective} {feature} for {audience} seeking {benefit}.',
      product,
      values
    );
    const description = fillTemplate(descriptionTemplate.value, product, values);
    const cta = cleanCopy(
      personalizationApplied && learnedPreferences?.preferredCtas[0]
        ? learnedPreferences.preferredCtas[0]
        : ctaSelection.value
    );
    const selections = [
      verb,
      adjective,
      benefit,
      emotion,
      feature,
      audience,
      headlineTemplate,
      descriptionTemplate,
      ctaSelection,
    ];
    const variationScore = Math.round(
      selections.reduce((sum, selection) => sum + selection.score, 0) / selections.length
    );

    return {
      selections,
      content: {
        headline,
        subheadline,
        description,
        cta,
        features: extracted.features,
        benefits: extracted.benefits,
        audience: context.audience,
        emotions: extracted.emotions,
        keywords: extracted.keywords,
        lifestyle: context.lifestyle,
        intent: context.intent,
        templateCategory: [
          `Headline:${headlineTemplate.group}`,
          `Description:${descriptionTemplate.group}`,
          `CTA:${ctaSelection.group}`,
        ].join(' | '),
        templateIds: [headlineTemplate.id, descriptionTemplate.id, ctaSelection.id],
        variationScore,
        dictionary: product.normalizedCategory,
        campaignUsed: campaign.name,
        industryPackUsed: industryPack.name,
        personalizationApplied,
        learnedPreferences,
      },
    };
  }

  private rememberSelections(selections: VariationSelection[]): void {
    const memoryKinds: MemoryKind[] = [
      'verb',
      'adjective',
      'benefit',
      'emotion',
      'feature',
      'audience',
    ];

    for (const selection of selections) {
      const kind = memoryKinds.find((candidate) => selection.id.startsWith(`${candidate}:`));
      if (kind) this.memory.remember(kind, selection.value);
    }
  }
}

export default ContentComposer;
