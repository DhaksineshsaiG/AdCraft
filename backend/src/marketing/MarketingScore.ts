import type { MarketingEngineResult } from './engine/MarketingEngine';

export interface MarketingScoreInput extends MarketingEngineResult {
  productTitle: string;
  productDescription: string;
  productTags: string[];
}

export interface MarketingScoreBreakdown {
  headline: number;
  description: number;
  cta: number;
  keywords: number;
  verbs: number;
  creativity: number;
  grammar: number;
  total: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Footwear: ['run', 'stride', 'step', 'shoe', 'comfort', 'movement', 'traction', 'training'],
  Fragrance: ['scent', 'fragrance', 'signature', 'aroma', 'luxury', 'notes', 'allure'],
  Electronics: ['smart', 'power', 'connect', 'performance', 'wireless', 'device', 'upgrade'],
  Jewelry: ['shine', 'sparkle', 'elegance', 'piece', 'detail', 'beauty', 'gift'],
  Coffee: ['brew', 'sip', 'warm', 'coffee', 'flavor', 'routine', 'mug'],
  Fashion: ['style', 'look', 'wear', 'fit', 'wardrobe', 'polished', 'chic'],
  Furniture: ['space', 'home', 'comfort', 'room', 'design', 'living', 'relax'],
  Sports: ['train', 'power', 'performance', 'workout', 'strong', 'gear', 'endurance'],
  General: ['quality', 'reliable', 'practical', 'upgrade', 'everyday', 'trusted'],
};

const MARKETING_VERBS = [
  'accelerate',
  'adorn',
  'brew',
  'captivate',
  'choose',
  'complete',
  'connect',
  'create',
  'discover',
  'elevate',
  'enjoy',
  'experience',
  'explore',
  'power',
  'refresh',
  'run',
  'savor',
  'shop',
  'simplify',
  'style',
  'train',
  'unlock',
  'upgrade',
  'wear',
];

const STRONG_CTA_VERBS = [
  'shop',
  'explore',
  'discover',
  'view',
  'choose',
  'find',
  'get',
  'start',
  'experience',
  'upgrade',
  'refresh',
];

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function countMatches(text: string, candidates: string[]): number {
  const normalizedText = ` ${words(text).join(' ')} `;
  return candidates.filter((candidate) =>
    normalizedText.includes(` ${candidate.toLowerCase()} `)
  ).length;
}

function scoreHeadline(headline: string): number {
  const wordCount = words(headline).length;
  const characterCount = headline.trim().length;
  let score = 15;

  if (wordCount >= 3 && wordCount <= 8) score += 2;
  if (characterCount >= 18 && characterCount <= 64) score += 2;
  if (/^[A-Z0-9]/.test(headline.trim())) score += 1;
  if (wordCount < 2 || characterCount > 80) score -= 5;

  return clamp(score, 20);
}

function scoreDescription(description: string): number {
  const wordCount = words(description).length;
  let score = 12;

  if (wordCount >= 10 && wordCount <= 26) score += 4;
  if (/\b(for|with|through|because|that|while)\b/i.test(description)) score += 2;
  if (/[.!]$/.test(description.trim())) score += 1;
  if (!/\b(undefined|null|placeholder)\b/i.test(description)) score += 1;

  return clamp(score, 20);
}

function scoreCta(cta: string): number {
  const ctaWords = words(cta);
  let score = 9;

  if (ctaWords.length >= 2 && ctaWords.length <= 4) score += 4;
  if (countMatches(cta, STRONG_CTA_VERBS) > 0) score += 5;
  if (/^[A-Z]/.test(cta.trim())) score += 2;

  return clamp(score, 15);
}

function scoreKeywords(content: MarketingScoreInput): number {
  const categoryKeywords = CATEGORY_KEYWORDS[content.category] ?? CATEGORY_KEYWORDS['General'];
  const combinedText = [
    content.headline,
    content.subheadline,
    content.description,
    content.cta,
    content.productTitle,
    content.productDescription,
    content.productTags.join(' '),
  ].join(' ');
  const matches = countMatches(combinedText, categoryKeywords ?? []);

  return clamp(6 + matches * 4, 15);
}

function scoreVerbs(content: MarketingScoreInput): number {
  const combinedText = [
    content.headline,
    content.subheadline,
    content.description,
    content.cta,
  ].join(' ');
  const matches = countMatches(combinedText, MARKETING_VERBS);

  return clamp(5 + matches * 3, 15);
}

function scoreCreativity(content: MarketingScoreInput): number {
  const combinedText = `${content.headline} ${content.subheadline} ${content.description}`;
  const contentWords = words(combinedText);
  const uniqueWords = new Set(contentWords);
  const uniquenessRatio = contentWords.length === 0 ? 0 : uniqueWords.size / contentWords.length;
  const hasSensoryOrBenefitLanguage =
    /\b(confidence|comfort|luxury|performance|sparkle|warm|smart|power|style|elegance|fresh|signature)\b/i.test(
      combinedText
    );

  return clamp(4 + uniquenessRatio * 4 + (hasSensoryOrBenefitLanguage ? 2 : 0), 10);
}

function scoreGrammar(content: MarketingScoreInput): number {
  const combinedText = `${content.headline}. ${content.subheadline} ${content.description} ${content.cta}.`;
  let score = 10;

  if (/\s{2,}/.test(combinedText)) score -= 2;
  if (/[{}]/.test(combinedText)) score -= 4;
  if (/\b(a)\s+[aeiou]/i.test(combinedText)) score -= 1;
  if (/\b(an)\s+[^aeiou\s]/i.test(combinedText)) score -= 1;
  if (!/[.!?]$/.test(content.description.trim())) score -= 1;

  return clamp(score, 10);
}

export class MarketingScore {
  score(content: MarketingScoreInput): MarketingScoreBreakdown {
    const headline = scoreHeadline(content.headline);
    const description = scoreDescription(content.description);
    const cta = scoreCta(content.cta);
    const keywords = scoreKeywords(content);
    const verbs = scoreVerbs(content);
    const creativity = scoreCreativity(content);
    const grammar = scoreGrammar(content);

    const rawTotal = headline + description + cta + keywords + verbs + creativity + grammar;

    return {
      headline,
      description,
      cta,
      keywords,
      verbs,
      creativity,
      grammar,
      total: Math.min(100, rawTotal),
    };
  }
}

export default MarketingScore;
