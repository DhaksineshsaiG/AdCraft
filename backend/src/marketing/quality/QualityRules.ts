export interface RuleResult {
  passed: boolean;
  score: number;
  strength?: string;
  weakness?: string;
  suggestion?: string;
}

export const ACTION_VERBS = [
  'shop',
  'discover',
  'explore',
  'upgrade',
  'unlock',
  'choose',
  'find',
  'start',
  'experience',
  'elevate',
  'power',
  'refresh',
  'create',
  'own',
  'try',
  'boost',
  'transform',
  'train',
  'connect',
  'indulge',
  'gift',
  'wear',
  'brew',
  'run',
  'move',
  'level',
  'claim',
  'organize',
  'bring',
  'make',
  'built',
  'build',
  'designed',
  'made',
  'command',
  'lace',
  'stride',
  'boost',
  'level',
];

export const EMOTIONAL_WORDS = [
  'confident',
  'comfort',
  'comfortable',
  'cozy',
  'luxury',
  'premium',
  'power',
  'powerful',
  'ready',
  'focused',
  'elegant',
  'radiant',
  'bold',
  'fresh',
  'calm',
  'warm',
  'alluring',
  'connected',
  'capable',
  'refined',
  'energized',
  'secure',
  'exclusive',
  'signature',
  'serious',
  'competitive',
];

export const GENERIC_PHRASES = [
  'amazing',
  'best',
  'high quality',
  'premium product',
  'great product',
  'nice product',
  'buy now',
  'click here',
  'good quality',
  'top product',
];

export const URGENCY_WORDS = [
  'now',
  'today',
  'new',
  'limited',
  'first',
  'claim',
  'drop',
  'season',
  'arrival',
  'ready',
  'start',
];

export const BENEFIT_WORDS = [
  'comfort',
  'confidence',
  'performance',
  'style',
  'control',
  'support',
  'speed',
  'value',
  'clarity',
  'ease',
  'fit',
  'freshness',
  'productivity',
  'elegance',
  'presence',
  'sparkle',
  'hydration',
  'focus',
  'routine',
  'sound',
];

export function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function countWords(value: string): number {
  return words(value).length;
}

export function containsAny(value: string, candidates: string[]): boolean {
  const normalized = ` ${words(value).join(' ')} `;
  return candidates.some((candidate) => normalized.includes(` ${candidate.toLowerCase()} `));
}

export function containsPhrase(value: string, phrases: string[]): boolean {
  const normalized = value.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase.toLowerCase()));
}

export function repeatedWords(value: string): string[] {
  const counts = new Map<string, number>();
  for (const word of words(value)) {
    if (word.length <= 3) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([word]) => word);
}

export function uniqueWordRatio(value: string): number {
  const tokens = words(value);
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}

export function scoreRange(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function categoryTerms(category: string): string[] {
  const map: Record<string, string[]> = {
    Footwear: ['shoe', 'run', 'stride', 'cushion', 'comfort', 'training', 'step'],
    Fragrance: ['scent', 'fragrance', 'signature', 'notes', 'aroma', 'luxury'],
    Electronics: ['smart', 'wireless', 'device', 'power', 'audio', 'control', 'tech'],
    Jewelry: ['shine', 'gold', 'jewelry', 'sparkle', 'gift', 'elegance'],
    Coffee: ['coffee', 'mug', 'brew', 'sip', 'warm', 'ceramic'],
    Fashion: ['style', 'wear', 'look', 'fit', 'beauty', 'color'],
    Furniture: ['chair', 'home', 'space', 'comfort', 'support', 'office'],
    Sports: ['sports', 'training', 'workout', 'hydration', 'performance', 'active'],
    General: ['quality', 'everyday', 'reliable', 'practical', 'premium'],
  };
  return map[category] ?? map['General'] ?? [];
}
