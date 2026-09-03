export type MemoryKind =
  | 'headline'
  | 'description'
  | 'cta'
  | 'template'
  | 'verb'
  | 'adjective'
  | 'benefit'
  | 'emotion'
  | 'feature'
  | 'audience'
  | 'dictionary';

export interface MemorySnapshot {
  duplicateHeadlines: number;
  duplicateDescriptions: number;
  templateUsage: Record<string, number>;
  dictionaryUsage: Record<string, number>;
}

export interface GeneratedContentMemoryInput {
  headline: string;
  description: string;
  cta: string;
  templateIds: string[];
  dictionary: string;
}

const RECENT_LIMIT = 80;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export class MemoryEngine {
  private readonly recent = new Map<MemoryKind, string[]>();
  private readonly usage = new Map<MemoryKind, Map<string, number>>();
  private duplicateHeadlines = 0;
  private duplicateDescriptions = 0;

  remember(kind: MemoryKind, value: string): void {
    const normalized = normalize(value);
    if (!normalized) return;

    const recentValues = this.recent.get(kind) ?? [];
    recentValues.unshift(normalized);
    this.recent.set(kind, recentValues.slice(0, RECENT_LIMIT));

    const usageValues = this.usage.get(kind) ?? new Map<string, number>();
    usageValues.set(normalized, (usageValues.get(normalized) ?? 0) + 1);
    this.usage.set(kind, usageValues);
  }

  rememberGeneratedContent(content: GeneratedContentMemoryInput): void {
    if (this.usageCount('headline', content.headline) > 0) this.duplicateHeadlines += 1;
    if (this.usageCount('description', content.description) > 0) {
      this.duplicateDescriptions += 1;
    }

    this.remember('headline', content.headline);
    this.remember('description', content.description);
    this.remember('cta', content.cta);
    this.remember('dictionary', content.dictionary);
    content.templateIds.forEach((templateId) => this.remember('template', templateId));
  }

  isRecent(kind: MemoryKind, value: string, within = 20): boolean {
    const normalized = normalize(value);
    return (this.recent.get(kind) ?? []).slice(0, within).includes(normalized);
  }

  usageCount(kind: MemoryKind, value: string): number {
    return this.usage.get(kind)?.get(normalize(value)) ?? 0;
  }

  snapshot(): MemorySnapshot {
    return {
      duplicateHeadlines: this.duplicateHeadlines,
      duplicateDescriptions: this.duplicateDescriptions,
      templateUsage: this.toUsageRecord('template'),
      dictionaryUsage: this.toUsageRecord('dictionary'),
    };
  }

  private toUsageRecord(kind: MemoryKind): Record<string, number> {
    const values = this.usage.get(kind) ?? new Map<string, number>();
    return [...values.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .reduce<Record<string, number>>((record, [key, count]) => {
        record[key] = count;
        return record;
      }, {});
  }
}

export default MemoryEngine;
