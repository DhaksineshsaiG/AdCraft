import UserPreferenceEngine, {
  PreferenceField,
  UserEditPreference,
} from '../preferences/UserPreferenceEngine';

export interface LearnedPreferenceSummary {
  userId: string;
  totalEdits: number;
  preferredVerbs: string[];
  preferredAdjectives: string[];
  preferredCtas: string[];
  preferredTone: string[];
  preferredTemplateTypes: string[];
  preferredPhrases: string[];
  fieldScores: Record<PreferenceField, number>;
  preferenceStrength: number;
}

const EMPTY_FIELD_SCORES: Record<PreferenceField, number> = {
  headline: 0,
  subheadline: 0,
  description: 0,
  cta: 0,
};

const KNOWN_VERBS = [
  'shop',
  'discover',
  'explore',
  'upgrade',
  'unlock',
  'elevate',
  'power',
  'experience',
  'choose',
  'find',
  'start',
  'own',
  'boost',
  'refresh',
  'transform',
  'indulge',
  'create',
  'command',
  'train',
  'connect',
  'celebrate',
  'gift',
];

const KNOWN_ADJECTIVES = [
  'premium',
  'luxury',
  'bold',
  'sleek',
  'modern',
  'refined',
  'minimal',
  'powerful',
  'exclusive',
  'signature',
  'professional',
  'smart',
  'fast',
  'elegant',
  'clean',
  'advanced',
  'limited',
  'new',
  'high-performance',
  'crafted',
];

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'your',
  'you',
  'this',
  'that',
  'our',
  'are',
  'from',
  'into',
  'more',
  'every',
  'today',
  'now',
  'shop',
]);

const learnedPreferences = new Map<string, LearnedPreferenceSummary>();

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function editedTokens(preference: UserEditPreference): string[] {
  const original = new Set(tokenize(preference.originalValue));
  return tokenize(preference.editedValue).filter(
    (token) => !original.has(token) && !STOPWORDS.has(token)
  );
}

function topValues(values: string[], limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function classifyTemplateType(value: string): string[] {
  const text = value.toLowerCase();
  const types: string[] = [];
  if (value.includes('?')) types.push('Question');
  if (/\b(luxury|premium|signature|refined|exclusive|indulge)\b/.test(text)) {
    types.push('Luxury');
  }
  if (/\b(clean|minimal|simple|essential|calm)\b/.test(text)) types.push('Minimal');
  if (/\b(power|performance|speed|advanced|pro|engineered)\b/.test(text)) {
    types.push('Performance');
  }
  if (/\b(today|now|limited|new|drop)\b/.test(text)) types.push('Urgency');
  if (/\b(comfort|confidence|benefit|better|lasting)\b/.test(text)) types.push('Benefit');
  if (types.length === 0) types.push('Action');
  return types;
}

function classifyTone(value: string): string[] {
  const text = value.toLowerCase();
  const tones: string[] = [];
  if (/\b(luxury|premium|exclusive|signature|refined)\b/.test(text)) tones.push('Luxury');
  if (/\b(clean|minimal|simple|calm)\b/.test(text)) tones.push('Minimal');
  if (/\b(power|bold|strong|performance)\b/.test(text)) tones.push('Powerful');
  if (/\b(sleek|smart|modern|advanced)\b/.test(text)) tones.push('Modern');
  if (/\b(elegant|crafted|polished)\b/.test(text)) tones.push('Elegant');
  if (tones.length === 0) tones.push('Professional');
  return tones;
}

function emptySummary(userId: string): LearnedPreferenceSummary {
  return {
    userId,
    totalEdits: 0,
    preferredVerbs: [],
    preferredAdjectives: [],
    preferredCtas: [],
    preferredTone: [],
    preferredTemplateTypes: [],
    preferredPhrases: [],
    fieldScores: { ...EMPTY_FIELD_SCORES },
    preferenceStrength: 0,
  };
}

export class LearningEngine {
  constructor(private readonly preferenceEngine: UserPreferenceEngine = new UserPreferenceEngine()) {}

  learn(userId: string): LearnedPreferenceSummary {
    const history = this.preferenceEngine.getUserPreferences(userId);
    if (history.length === 0) {
      const summary = emptySummary(userId);
      learnedPreferences.set(userId, summary);
      return summary;
    }

    const tokens = history.flatMap(editedTokens);
    const editedValues = history.map((preference) => preference.editedValue);
    const fieldScores = { ...EMPTY_FIELD_SCORES };
    history.forEach((preference) => {
      fieldScores[preference.field] += 1;
    });

    const summary: LearnedPreferenceSummary = {
      userId,
      totalEdits: history.length,
      preferredVerbs: topValues(tokens.filter((token) => KNOWN_VERBS.includes(token))),
      preferredAdjectives: topValues(tokens.filter((token) => KNOWN_ADJECTIVES.includes(token))),
      preferredCtas: topValues(
        history
          .filter((preference) => preference.field === 'cta')
          .map((preference) => preference.editedValue),
        6
      ),
      preferredTone: topValues(editedValues.flatMap(classifyTone), 5),
      preferredTemplateTypes: topValues(editedValues.flatMap(classifyTemplateType), 6),
      preferredPhrases: topValues(tokens.filter((token) => token.length > 4), 10),
      fieldScores,
      preferenceStrength: Math.min(100, history.length * 18),
    };

    learnedPreferences.set(userId, summary);
    return summary;
  }

  getPreferences(userId: string): LearnedPreferenceSummary {
    return learnedPreferences.get(userId) ?? this.learn(userId);
  }
}

export default LearningEngine;
