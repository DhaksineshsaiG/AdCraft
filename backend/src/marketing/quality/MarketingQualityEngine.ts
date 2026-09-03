import type { MarketingEngineResult } from '../engine/MarketingEngine';
import type { QualityReport } from './QualityReport';
import {
  ACTION_VERBS,
  BENEFIT_WORDS,
  EMOTIONAL_WORDS,
  GENERIC_PHRASES,
  URGENCY_WORDS,
  categoryTerms,
  containsAny,
  containsPhrase,
  countWords,
  repeatedWords,
  scoreRange,
  uniqueWordRatio,
  words,
} from './QualityRules';

interface EvaluationContext {
  content: MarketingEngineResult;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) values.push(value);
}

function scoreHeadline(context: EvaluationContext): number {
  const { content, strengths, weaknesses, suggestions } = context;
  const headline = content.headline;
  const wordCount = countWords(headline);
  let score = 100;

  if (wordCount >= 3 && wordCount <= 8) {
    addUnique(strengths, 'Headline length is concise and scannable.');
  } else if (wordCount > 8) {
    score -= 14;
    addUnique(weaknesses, 'Headline is longer than eight words.');
    addUnique(suggestions, 'Shorten the headline so the core benefit lands faster.');
  } else {
    score -= 16;
    addUnique(weaknesses, 'Headline is too short to carry a clear marketing idea.');
    addUnique(suggestions, 'Add a concrete benefit or emotional hook to the headline.');
  }

  if (containsAny(headline, ACTION_VERBS)) {
    score += 6;
    addUnique(strengths, 'Headline includes an action verb.');
  } else {
    score -= 5;
    addUnique(weaknesses, 'Headline has no clear action verb.');
    addUnique(suggestions, 'Use a stronger active verb such as discover, upgrade, power, or explore.');
  }

  if (
    containsAny(headline, EMOTIONAL_WORDS) ||
    containsAny(headline, content.emotions) ||
    containsAny(headline, content.benefits)
  ) {
    score += 5;
    addUnique(strengths, 'Headline has emotional pull.');
  } else {
    score -= 4;
    addUnique(weaknesses, 'Headline is missing an emotional word.');
    addUnique(suggestions, 'Use a stronger emotional headline tied to confidence, comfort, power, or style.');
  }

  if (containsPhrase(headline, GENERIC_PHRASES)) {
    score -= 14;
    addUnique(weaknesses, 'Headline uses generic marketing language.');
    addUnique(suggestions, 'Replace generic phrases with a specific customer benefit.');
  }

  if (
    containsAny(headline, categoryTerms(content.category)) ||
    containsAny(headline, content.keywords) ||
    containsAny(headline, content.features) ||
    containsAny(headline, content.benefits)
  ) {
    score += 5;
    addUnique(strengths, 'Headline connects to the product category.');
  } else {
    score -= 4;
    addUnique(weaknesses, 'Headline could be more category-specific.');
    addUnique(suggestions, 'Mention a category cue, feature, or benefit in the headline.');
  }

  if (uniqueWordRatio(headline) < 0.85) {
    score -= 8;
    addUnique(weaknesses, 'Headline repeats wording too heavily.');
    addUnique(suggestions, 'Remove repeated words from the headline.');
  }

  return scoreRange(score);
}

function scoreDescription(context: EvaluationContext): number {
  const { content, strengths, weaknesses, suggestions } = context;
  const description = content.description;
  const fullCopy = `${content.subheadline} ${content.description}`;
  const wordCount = countWords(description);
  let score = 100;

  if (wordCount >= 9 && wordCount <= 26) {
    addUnique(strengths, 'Description length is useful without feeling bloated.');
  } else {
    score -= 5;
    addUnique(weaknesses, 'Description length is outside the ideal range.');
    addUnique(suggestions, 'Keep the description between 9 and 26 words for stronger flow.');
  }

  if (/[.!?]$/.test(description.trim())) {
    addUnique(strengths, 'Description has clean sentence punctuation.');
  } else {
    score -= 4;
    addUnique(weaknesses, 'Description is missing ending punctuation.');
    addUnique(suggestions, 'End the description with a clear sentence punctuation mark.');
  }

  if (containsAny(fullCopy, [...BENEFIT_WORDS, ...content.benefits])) {
    score += 5;
    addUnique(strengths, 'Description communicates a customer benefit.');
  } else {
    score -= 6;
    addUnique(weaknesses, 'Description is missing a customer benefit.');
    addUnique(suggestions, 'Mention what the customer gains, not only what the product is.');
  }

  if (containsAny(fullCopy, content.features)) {
    score += 4;
    addUnique(strengths, 'Description references a concrete feature.');
  } else {
    score -= 4;
    addUnique(weaknesses, 'Description does not mention a concrete feature.');
    addUnique(suggestions, 'Add a product feature that supports the benefit.');
  }

  if (containsAny(fullCopy, content.audience)) {
    score += 4;
    addUnique(strengths, 'Description is aimed at a clear audience.');
  } else {
    score -= 4;
    addUnique(weaknesses, 'Description lacks audience focus.');
    addUnique(suggestions, 'Name the customer type or lifestyle the product supports.');
  }

  if (/\b(undefined|null|placeholder)\b/i.test(description)) {
    score -= 25;
    addUnique(weaknesses, 'Description contains placeholder-like text.');
    addUnique(suggestions, 'Remove placeholder wording before accepting the generation.');
  }

  const repeated = repeatedWords(description);
  if (repeated.length > 0) {
    score -= Math.min(8, repeated.length * 3);
    addUnique(weaknesses, `Description repeats words: ${repeated.join(', ')}.`);
    addUnique(suggestions, 'Vary repeated wording to make the description feel more natural.');
  }

  if (containsPhrase(description, GENERIC_PHRASES)) {
    score -= 12;
    addUnique(weaknesses, 'Description leans on generic marketing phrasing.');
    addUnique(suggestions, 'Instead of a generic phrase, mention a specific use case or outcome.');
  }

  return scoreRange(score);
}

function scoreCta(context: EvaluationContext): number {
  const { content, strengths, weaknesses, suggestions } = context;
  const cta = content.cta;
  const wordCount = countWords(cta);
  let score = 100;

  if (wordCount >= 2 && wordCount <= 4) {
    addUnique(strengths, 'CTA is short and easy to act on.');
  } else {
    score -= 5;
    addUnique(weaknesses, 'CTA length is not ideal.');
    addUnique(suggestions, 'Keep the CTA between two and four words.');
  }

  if (containsAny(cta, ACTION_VERBS)) {
    addUnique(strengths, 'CTA starts from a clear action.');
  } else {
    score -= 5;
    addUnique(weaknesses, 'CTA is not action-oriented enough.');
    addUnique(suggestions, 'Use a stronger CTA verb such as shop, discover, explore, or upgrade.');
  }

  if (containsAny(cta, URGENCY_WORDS) || containsAny(cta, categoryTerms(content.category))) {
    score += 4;
    addUnique(strengths, 'CTA has urgency or category context.');
  } else {
    score -= 4;
    addUnique(weaknesses, 'CTA could be more specific or urgent.');
    addUnique(suggestions, 'Try a category-specific CTA instead of a generic command.');
  }

  if (containsPhrase(cta, ['buy now', 'click here'])) {
    score -= 18;
    addUnique(weaknesses, 'CTA is too generic.');
    addUnique(suggestions, 'Replace generic CTA wording with a product-specific next step.');
  }

  return scoreRange(score);
}

function scoreReadability(content: MarketingEngineResult): number {
  const combined = `${content.headline} ${content.subheadline} ${content.description} ${content.cta}`;
  const averageWordLength =
    words(combined).reduce((sum, word) => sum + word.length, 0) /
    Math.max(1, words(combined).length);
  const repeated = repeatedWords(combined).length;

  return scoreRange(104 - Math.max(0, averageWordLength - 7) * 7 - repeated * 4);
}

function scoreTone(content: MarketingEngineResult): number {
  const combined = `${content.headline} ${content.subheadline} ${content.description}`;
  const toneTerms = [
    content.tone,
    ...content.emotions,
    ...content.benefits,
    ...content.intent,
  ];
  return scoreRange(containsAny(combined, toneTerms) ? 98 : 84);
}

function scoreRelevance(content: MarketingEngineResult): number {
  const combined = [
    content.headline,
    content.subheadline,
    content.description,
    content.cta,
  ].join(' ');
  const terms = [
    ...categoryTerms(content.category),
    ...content.features,
    ...content.keywords,
    ...content.benefits,
  ];
  const matches = terms.filter((term) => containsAny(combined, [term])).length;
  return scoreRange(78 + Math.min(22, matches * 4));
}

function scoreOriginality(content: MarketingEngineResult): number {
  const combined = `${content.headline} ${content.subheadline} ${content.description}`;
  let score = 100;

  if (containsPhrase(combined, GENERIC_PHRASES)) score -= 18;
  score -= repeatedWords(combined).length * 4;
  if (uniqueWordRatio(combined) > 0.85) score += 4;

  return scoreRange(score);
}

export class MarketingQualityEngine {
  evaluate(content: MarketingEngineResult): QualityReport {
    const context: EvaluationContext = {
      content,
      strengths: [],
      weaknesses: [],
      suggestions: [],
    };
    const headline = scoreHeadline(context);
    const description = scoreDescription(context);
    const cta = scoreCta(context);
    const originality = scoreOriginality(content);
    const readability = scoreReadability(content);
    const tone = scoreTone(content);
    const relevance = scoreRelevance(content);
    const score = scoreRange(
      headline * 0.23 +
        description * 0.28 +
        cta * 0.18 +
        originality * 0.09 +
        readability * 0.08 +
        tone * 0.07 +
        relevance * 0.07
    );

    if (score >= 95) addUnique(context.strengths, 'Copy is polished enough for review.');
    if (score < 85) {
      addUnique(context.weaknesses, 'Overall quality is below the acceptance threshold.');
      addUnique(context.suggestions, 'Regenerate and prefer a stronger benefit, feature, and CTA combination.');
    }

    return {
      score,
      passed: score >= 85,
      strengths: context.strengths.slice(0, 8),
      weaknesses: context.weaknesses.slice(0, 8),
      suggestions: context.suggestions.slice(0, 8),
      detailedScores: {
        headline,
        description,
        cta,
        originality,
        readability,
        tone,
        relevance,
      },
    };
  }
}

export default MarketingQualityEngine;
