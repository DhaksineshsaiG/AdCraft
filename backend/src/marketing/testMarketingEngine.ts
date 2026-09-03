import MarketingScore, { MarketingScoreBreakdown } from './MarketingScore';
import MarketingEngine, { MarketingEngineResult } from './engine/MarketingEngine';
import type { ProductAnalyzerInput } from './analyzer/ProductAnalyzer';
import type { CampaignName } from './campaigns/CampaignEngine';
import LearningEngine, { LearnedPreferenceSummary } from './learning/LearningEngine';
import UserPreferenceEngine from './preferences/UserPreferenceEngine';
import MarketingQualityEngine from './quality/MarketingQualityEngine';
import type { QualityReport } from './quality/QualityReport';

interface SampleProduct extends ProductAnalyzerInput {
  title: string;
  vendor: string;
  description: string;
  category: string;
  price: number;
  tags: string[];
}

interface GenerationResult {
  product: SampleProduct;
  content: MarketingEngineResult;
  score: MarketingScoreBreakdown;
  qualityReport: QualityReport;
  attempts: QualityAttempt[];
  selectedAttempt: number;
  generationTimeMs: number;
  duplicateHeadline: boolean;
  duplicateDescription: boolean;
}

interface QualityAttempt {
  attempt: number;
  content: MarketingEngineResult;
  score: MarketingScoreBreakdown;
  qualityReport: QualityReport;
  generationTimeMs: number;
}

interface LearningDemoResult {
  original: MarketingEngineResult;
  edited: Pick<MarketingEngineResult, 'headline' | 'subheadline' | 'description' | 'cta'>;
  learned: LearnedPreferenceSummary;
  personalized: MarketingEngineResult;
  personalizedScore: MarketingScoreBreakdown;
  preferenceLearningAccuracy: number;
}

const VARIATIONS_PER_PRODUCT = 5;
const PLAYGROUND_QUALITY_TARGET = 95;
const SECTION_LINE = '='.repeat(50);

const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    title: 'Nike Air Max',
    vendor: 'Nike',
    description: 'Iconic cushioned running shoes designed for streetwear style and all-day comfort.',
    category: 'Sneakers',
    price: 129.99,
    tags: ['sneakers', 'running shoes', 'air cushioning', 'streetwear'],
  },
  {
    title: 'Apple iPhone 16 Pro',
    vendor: 'Apple',
    description: 'Premium smartphone with advanced camera controls, fast performance, and a refined titanium design.',
    category: 'Phone',
    price: 999,
    tags: ['phone', 'smartphone', 'camera', 'apple'],
  },
  {
    title: 'Luxury Leather Wallet',
    vendor: 'Heritage Goods',
    description: 'Full-grain leather wallet with slim storage, refined stitching, and everyday durability.',
    category: 'Wallet',
    price: 89,
    tags: ['leather', 'wallet', 'accessory', 'gift'],
  },
  {
    title: 'Dior Sauvage Perfume',
    vendor: 'Dior',
    description: 'A bold fragrance with fresh spice, warm woods, and a powerful signature trail.',
    category: 'Perfume',
    price: 145,
    tags: ['perfume', 'fragrance', 'luxury', 'scent'],
  },
  {
    title: 'Coffee Mug',
    vendor: 'Morning Studio',
    description: 'Ceramic mug with a comfortable handle and generous shape for coffee, tea, and cozy breaks.',
    category: 'Mug',
    price: 18,
    tags: ['coffee', 'mug', 'ceramic', 'tea'],
  },
  {
    title: 'Gaming Laptop',
    vendor: 'ApexByte',
    description: 'High-performance laptop with immersive graphics, fast refresh display, and advanced cooling.',
    category: 'Laptop',
    price: 1499,
    tags: ['gaming', 'laptop', 'performance', 'graphics'],
  },
  {
    title: 'Wireless Earbuds',
    vendor: 'SoundWave',
    description: 'Compact wireless earbuds with clear sound, noise control, and reliable battery life.',
    category: 'Electronics',
    price: 119,
    tags: ['wireless', 'earbuds', 'audio', 'bluetooth'],
  },
  {
    title: 'Gold Necklace',
    vendor: 'Aurelia',
    description: 'Polished gold necklace with delicate shine and a versatile silhouette for everyday elegance.',
    category: 'Necklace',
    price: 249,
    tags: ['gold', 'necklace', 'jewelry', 'gift'],
  },
  {
    title: 'Office Chair',
    vendor: 'WorkNest',
    description: 'Ergonomic office chair with supportive cushioning, clean lines, and smooth height adjustment.',
    category: 'Chair',
    price: 299,
    tags: ['chair', 'office', 'ergonomic', 'furniture'],
  },
  {
    title: 'Running Backpack',
    vendor: 'TrailForge',
    description: 'Lightweight backpack with stable storage, breathable straps, and quick-access pockets for active days.',
    category: 'Sports',
    price: 79,
    tags: ['running', 'backpack', 'training', 'outdoor'],
  },
  {
    title: 'Sports Water Bottle',
    vendor: 'HydraPeak',
    description: 'Durable sports bottle with leak-resistant carry, easy sipping, and hydration-ready capacity.',
    category: 'Sports',
    price: 24,
    tags: ['sports', 'water bottle', 'training', 'hydration'],
  },
  {
    title: 'Mechanical Keyboard',
    vendor: 'KeyForge',
    description: 'Responsive mechanical keyboard with tactile switches, customizable lighting, and sturdy build quality.',
    category: 'Electronics',
    price: 139,
    tags: ['keyboard', 'mechanical', 'gaming', 'tech'],
  },
  {
    title: 'Smart Watch',
    vendor: 'PulseOS',
    description: 'Modern smart watch with health tracking, notifications, fitness insights, and everyday connectivity.',
    category: 'Electronics',
    price: 229,
    tags: ['smart watch', 'wearable', 'fitness', 'tech'],
  },
  {
    title: 'Lipstick',
    vendor: 'Velvet Bloom',
    description: 'Creamy lipstick with rich color payoff, soft wear, and a smooth satin finish.',
    category: 'Beauty',
    price: 26,
    tags: ['lipstick', 'beauty', 'makeup', 'color'],
  },
  {
    title: 'Bluetooth Speaker',
    vendor: 'SoundWave',
    description: 'Portable Bluetooth speaker with bold sound, easy pairing, and durable everyday design.',
    category: 'Electronics',
    price: 89,
    tags: ['bluetooth speaker', 'wireless', 'audio', 'portable'],
  },
];

function campaignForProduct(product: SampleProduct): CampaignName {
  const text = `${product.title} ${product.category} ${product.tags.join(' ')}`.toLowerCase();
  if (text.includes('perfume') || text.includes('gold') || text.includes('leather')) return 'Luxury';
  if (text.includes('sports') || text.includes('running')) return 'Summer';
  if (text.includes('laptop') || text.includes('keyboard')) return 'Black Friday';
  if (text.includes('mug') || text.includes('chair')) return 'Minimal';
  if (text.includes('iphone') || text.includes('watch') || text.includes('earbuds')) {
    return 'New Arrival';
  }
  return 'Default';
}

function formatScoreLine(label: string, score: number, max: number): string {
  return `${label.padEnd(21, '.')} ${String(score).padStart(2, ' ')}/${max}`;
}

function printScore(score: MarketingScoreBreakdown): void {
  console.log('SCORE');
  console.log('');
  console.log(formatScoreLine('Headline ', score.headline, 20));
  console.log(formatScoreLine('Description ', score.description, 20));
  console.log(formatScoreLine('CTA ', score.cta, 15));
  console.log(formatScoreLine('Keywords ', score.keywords, 15));
  console.log(formatScoreLine('Marketing Verbs ', score.verbs, 15));
  console.log(formatScoreLine('Creativity ', score.creativity, 10));
  console.log(formatScoreLine('Grammar ', score.grammar, 10));
  console.log('');
  console.log('TOTAL');
  console.log('');
  console.log(`${score.total}/100`);
}

function printList(label: string, values: string[]): void {
  console.log(label);
  console.log('');
  console.log(values.slice(0, 8).join(', '));
  console.log('');
}

function printQualityReport(report: QualityReport): void {
  console.log('QUALITY REPORT');
  console.log('');
  console.log(`Score: ${report.score}/100`);
  console.log(`Passed: ${report.passed ? 'Yes' : 'No'}`);
  console.log('');
  console.log('Detailed Scores');
  console.log('');
  console.log(`Headline: ${report.detailedScores.headline}/100`);
  console.log(`Description: ${report.detailedScores.description}/100`);
  console.log(`CTA: ${report.detailedScores.cta}/100`);
  console.log(`Originality: ${report.detailedScores.originality}/100`);
  console.log(`Readability: ${report.detailedScores.readability}/100`);
  console.log(`Tone: ${report.detailedScores.tone}/100`);
  console.log(`Relevance: ${report.detailedScores.relevance}/100`);
  console.log('');
  printList('Strengths', report.strengths);
  printList('Weaknesses', report.weaknesses);
  printList('Suggestions', report.suggestions);
}

function printGeneration(result: GenerationResult, version: number): void {
  console.log(SECTION_LINE);
  console.log('');
  console.log('PRODUCT');
  console.log('');
  console.log(result.product.title);
  console.log('');
  console.log(`Version ${version}`);
  console.log('');
  console.log('QUALITY RETRIES');
  console.log('');
  result.attempts.forEach((attempt) => {
    console.log(`Attempt ${attempt.attempt}: ${attempt.qualityReport.score}/100`);
    if (!attempt.qualityReport.passed && attempt.attempt < 3) console.log('Retry');
  });
  console.log(`Selected: Attempt ${result.selectedAttempt}`);
  console.log('');
  console.log('FINAL SELECTED VERSION');
  console.log('');
  console.log('CATEGORY');
  console.log('');
  console.log(result.content.category);
  console.log('');
  console.log('TONE');
  console.log('');
  console.log(result.content.tone);
  console.log('');
  printList('DETECTED FEATURES', result.content.features);
  printList('DETECTED AUDIENCE', result.content.audience);
  printList('DETECTED EMOTIONS', result.content.emotions);
  console.log('CHOSEN TEMPLATE CATEGORY');
  console.log('');
  console.log(result.content.templateCategory);
  console.log('');
  console.log('HEADLINE');
  console.log('');
  console.log(result.content.headline);
  if (result.duplicateHeadline) {
    console.log('');
    console.log('WARNING: Duplicate Headline Detected');
  }
  console.log('');
  console.log('SUBHEADLINE');
  console.log('');
  console.log(result.content.subheadline);
  console.log('');
  console.log('DESCRIPTION');
  console.log('');
  console.log(result.content.description);
  if (result.duplicateDescription) {
    console.log('');
    console.log('WARNING: Duplicate Description Detected');
  }
  console.log('');
  console.log('CTA');
  console.log('');
  console.log(result.content.cta);
  console.log('');
  printScore(result.score);
  console.log('');
  console.log(`Variation Score: ${result.content.variationScore}/100`);
  console.log('');
  printQualityReport(result.qualityReport);
  console.log('');
  console.log(`Generation Time: ${result.generationTimeMs.toFixed(2)}ms`);
  console.log('');
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function incrementCount(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function printUsage(title: string, usage: Record<string, number>, limit = 12): void {
  console.log(title);
  console.log('');
  Object.entries(usage)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .forEach(([key, count]) => console.log(`${key}: ${count}`));
  console.log('');
}

function generationRank(attempt: QualityAttempt): number {
  return (
    attempt.qualityReport.score * 1000 +
    attempt.content.variationScore * 5 +
    attempt.score.creativity * 10
  );
}

function runQualityLoop(
  engine: MarketingEngine,
  scorer: MarketingScore,
  qualityEngine: MarketingQualityEngine,
  product: SampleProduct,
  campaign: CampaignName
): QualityAttempt[] {
  const attempts: QualityAttempt[] = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const startTime = process.hrtime.bigint();
    const content = engine.generate(product, { campaign });
    const endTime = process.hrtime.bigint();
    const score = scorer.score({
      ...content,
      productTitle: product.title,
      productDescription: product.description,
      productTags: product.tags,
    });
    const qualityReport = qualityEngine.evaluate(content);

    attempts.push({
      attempt,
      content,
      score,
      qualityReport,
      generationTimeMs: Number(endTime - startTime) / 1_000_000,
    });

    if (qualityReport.score >= PLAYGROUND_QUALITY_TARGET) break;
  }

  return attempts;
}

function selectBestAttempt(attempts: QualityAttempt[]): QualityAttempt {
  return attempts.reduce((best, attempt) =>
    generationRank(attempt) > generationRank(best) ? attempt : best
  );
}

function printContentBlock(title: string, content: Pick<MarketingEngineResult, 'headline' | 'subheadline' | 'description' | 'cta'>): void {
  console.log(title);
  console.log('');
  console.log(`Headline: ${content.headline}`);
  console.log(`Subheadline: ${content.subheadline}`);
  console.log(`Description: ${content.description}`);
  console.log(`CTA: ${content.cta}`);
  console.log('');
}

function preferenceLearningAccuracy(
  learned: LearnedPreferenceSummary,
  content: MarketingEngineResult
): number {
  const learnedTerms = [
    ...learned.preferredVerbs,
    ...learned.preferredAdjectives,
    ...learned.preferredCtas,
    ...learned.preferredPhrases,
  ].map((value) => value.toLowerCase());
  if (learnedTerms.length === 0) return 0;

  const output = [
    content.headline,
    content.subheadline,
    content.description,
    content.cta,
  ].join(' ').toLowerCase();
  const matches = learnedTerms.filter((term) => output.includes(term.toLowerCase())).length;
  return Math.round((matches / learnedTerms.length) * 100);
}

function runLearningDemo(
  engine: MarketingEngine,
  scorer: MarketingScore,
  product: SampleProduct
): LearningDemoResult {
  const userId = 'playground-user-001';
  const preferenceEngine = new UserPreferenceEngine();
  const learningEngine = new LearningEngine(preferenceEngine);

  preferenceEngine.clearUser(userId);

  const original = engine.generate(product, {
    campaign: 'Default',
    industryPack: 'Gaming',
    applyPersonalization: false,
  });
  const edited: LearningDemoResult['edited'] = {
    headline: 'Premium Power For Serious Gamers',
    subheadline: 'Exclusive low-latency control for creators chasing competitive speed.',
    description:
      'A premium gaming setup built for players who want powerful performance, faster reactions, and competitive control.',
    cta: 'Level Up Now',
  };

  preferenceEngine.recordEdits([
    {
      userId,
      category: original.category,
      field: 'headline',
      originalValue: original.headline,
      editedValue: edited.headline,
    },
    {
      userId,
      category: original.category,
      field: 'subheadline',
      originalValue: original.subheadline,
      editedValue: edited.subheadline,
    },
    {
      userId,
      category: original.category,
      field: 'description',
      originalValue: original.description,
      editedValue: edited.description,
    },
    {
      userId,
      category: original.category,
      field: 'cta',
      originalValue: original.cta,
      editedValue: edited.cta,
    },
  ]);

  const learned = learningEngine.learn(userId);
  const personalized = engine.generate(product, {
    userId,
    campaign: 'Black Friday',
    industryPack: 'Gaming',
  });
  const personalizedScore = scorer.score({
    ...personalized,
    productTitle: product.title,
    productDescription: product.description,
    productTags: product.tags,
  });

  return {
    original,
    edited,
    learned,
    personalized,
    personalizedScore,
    preferenceLearningAccuracy: preferenceLearningAccuracy(learned, personalized),
  };
}

function printLearningDemo(result: LearningDemoResult): void {
  console.log(SECTION_LINE);
  console.log('');
  console.log('Adaptive Learning Demo');
  console.log('');
  printContentBlock('Original Content', result.original);
  printContentBlock('Edited Content', result.edited);
  console.log('Learned Preferences');
  console.log('');
  console.log(`Preferred Verbs: ${result.learned.preferredVerbs.join(', ') || 'None'}`);
  console.log(`Preferred Adjectives: ${result.learned.preferredAdjectives.join(', ') || 'None'}`);
  console.log(`Preferred CTA: ${result.learned.preferredCtas.join(', ') || 'None'}`);
  console.log(`Preferred Tone: ${result.learned.preferredTone.join(', ') || 'None'}`);
  console.log(`Preferred Template Types: ${result.learned.preferredTemplateTypes.join(', ') || 'None'}`);
  console.log(`Preference Strength: ${result.learned.preferenceStrength}/100`);
  console.log('');
  printContentBlock('Personalized Content', result.personalized);
  console.log(`Campaign Used: ${result.personalized.campaignUsed}`);
  console.log(`Industry Pack Used: ${result.personalized.industryPackUsed}`);
  console.log(`Personalization Applied: ${result.personalized.personalizationApplied ? 'Yes' : 'No'}`);
  console.log(`Preference Learning Accuracy: ${result.preferenceLearningAccuracy}%`);
  console.log(`Variation Score: ${result.personalized.variationScore}/100`);
  console.log(`Creativity Score: ${result.personalizedScore.creativity}/10`);
  console.log(`Marketing Score: ${result.personalizedScore.total}/100`);
  console.log('');
}

function runMarketingTest(): void {
  const engine = new MarketingEngine();
  const scorer = new MarketingScore();
  const qualityEngine = new MarketingQualityEngine();
  const results: GenerationResult[] = [];
  const templateUsage: Record<string, number> = {};
  const dictionaryUsage: Record<string, number> = {};
  const campaignUsage: Record<string, number> = {};
  const industryPackUsage: Record<string, number> = {};
  let suggestionsGenerated = 0;
  let rejectedGenerations = 0;

  for (const product of SAMPLE_PRODUCTS) {
    const productHeadlines = new Set<string>();
    const productDescriptions = new Set<string>();

    for (let index = 0; index < VARIATIONS_PER_PRODUCT; index += 1) {
      const campaign = campaignForProduct(product);
      const attempts = runQualityLoop(engine, scorer, qualityEngine, product, campaign);
      const selected = selectBestAttempt(attempts);
      const content = selected.content;
      const score = selected.score;
      const qualityReport = selected.qualityReport;
      const generationTimeMs = attempts.reduce(
        (total, attempt) => total + attempt.generationTimeMs,
        0
      );
      const duplicateHeadline = productHeadlines.has(content.headline);
      const duplicateDescription = productDescriptions.has(content.description);

      productHeadlines.add(content.headline);
      productDescriptions.add(content.description);
      content.templateIds.forEach((templateId) => incrementCount(templateUsage, templateId));
      incrementCount(dictionaryUsage, content.dictionary);
      incrementCount(campaignUsage, content.campaignUsed);
      incrementCount(industryPackUsage, content.industryPackUsed);
      suggestionsGenerated += qualityReport.suggestions.length;
      rejectedGenerations += attempts.length - 1;

      const result: GenerationResult = {
        product,
        content,
        score,
        qualityReport,
        attempts,
        selectedAttempt: selected.attempt,
        generationTimeMs,
        duplicateHeadline,
        duplicateDescription,
      };

      results.push(result);
      printGeneration(result, index + 1);
    }
  }

  const scores = results.map((result) => result.score.total);
  const qualityScores = results.map((result) => result.qualityReport.score);
  const creativityScores = results.map((result) => result.qualityReport.detailedScores.originality / 10);
  const variationScores = results.map((result) => result.content.variationScore);
  const attemptCounts = results.map((result) => result.attempts.length);
  const generationTimes = results.map((result) => result.generationTimeMs);
  const duplicateHeadlineCount = results.filter((result) => result.duplicateHeadline).length;
  const duplicateDescriptionCount = results.filter((result) => result.duplicateDescription).length;
  const demoProduct = SAMPLE_PRODUCTS.find((product) => product.title === 'Gaming Laptop') ?? SAMPLE_PRODUCTS[0];
  const learningDemo = runLearningDemo(engine, scorer, demoProduct);
  printLearningDemo(learningDemo);

  console.log(SECTION_LINE);
  console.log('');
  console.log('Marketing Engine Report');
  console.log('');
  console.log(`Products Tested: ${SAMPLE_PRODUCTS.length}`);
  console.log(`Total Variations: ${results.length}`);
  console.log(`Duplicate Headlines: ${duplicateHeadlineCount}`);
  console.log(`Duplicate Descriptions: ${duplicateDescriptionCount}`);
  console.log(`Average Quality: ${average(qualityScores).toFixed(2)}/100`);
  console.log(`Average Creativity: ${average(creativityScores).toFixed(2)}/10`);
  console.log(`Average Variation: ${average(variationScores).toFixed(2)}/100`);
  console.log(`Average Attempts: ${average(attemptCounts).toFixed(2)}`);
  console.log(`Highest Quality: ${Math.max(...qualityScores)}/100`);
  console.log(`Lowest Quality: ${Math.min(...qualityScores)}/100`);
  console.log(`Suggestions Generated: ${suggestionsGenerated}`);
  console.log(`Rejected Generations: ${rejectedGenerations}`);
  console.log(`Accepted Generations: ${results.length}`);
  console.log(`Average Score: ${average(scores).toFixed(2)}/100`);
  console.log(`Highest Score: ${Math.max(...scores)}/100`);
  console.log(`Lowest Score: ${Math.min(...scores)}/100`);
  console.log(`Average Generation Time: ${average(generationTimes).toFixed(2)}ms`);
  console.log(`Preference Learning Accuracy: ${learningDemo.preferenceLearningAccuracy}%`);
  console.log(`Campaign Used: ${learningDemo.personalized.campaignUsed}`);
  console.log(`Industry Pack Used: ${learningDemo.personalized.industryPackUsed}`);
  console.log(`Personalization Applied: ${learningDemo.personalized.personalizationApplied ? 'Yes' : 'No'}`);
  console.log(`Variation Score: ${learningDemo.personalized.variationScore}/100`);
  console.log(`Creativity Score: ${learningDemo.personalizedScore.creativity}/10`);
  console.log('');
  printUsage('Template Usage', templateUsage);
  printUsage('Dictionary Usage', dictionaryUsage);
  printUsage('Campaign Usage', campaignUsage);
  printUsage('Industry Pack Usage', industryPackUsage);
  console.log(SECTION_LINE);
}

runMarketingTest();
