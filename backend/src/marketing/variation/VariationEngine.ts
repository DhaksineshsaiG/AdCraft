import MemoryEngine, { MemoryKind } from '../memory/MemoryEngine';

export interface VariationCandidate {
  id: string;
  value: string;
  group?: string;
  tags?: string[];
}

export interface VariationSelection {
  id: string;
  value: string;
  group: string;
  score: number;
}

export interface VariationSelectionOptions {
  seed: string;
  kind: MemoryKind;
  preferredGroups?: string[];
  preferredTerms?: string[];
  attempt?: number;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizedTerms(values: string[]): string[] {
  return values.map((value) => value.toLowerCase()).filter(Boolean);
}

function candidateMatches(candidate: VariationCandidate, terms: string[]): boolean {
  const haystack = [candidate.value, candidate.group, ...(candidate.tags ?? [])]
    .join(' ')
    .toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

export class VariationEngine {
  private sequence = 0;

  constructor(private readonly memory: MemoryEngine) {}

  select(
    candidates: VariationCandidate[],
    options: VariationSelectionOptions
  ): VariationSelection {
    if (candidates.length === 0) {
      return { id: 'empty', value: '', group: 'General', score: 0 };
    }

    const preferredGroups = normalizedTerms(options.preferredGroups ?? []);
    const preferredTerms = normalizedTerms(options.preferredTerms ?? []);
    const scored = candidates.map((candidate) => {
      const group = candidate.group ?? 'General';
      const groupMatch = preferredGroups.includes(group.toLowerCase());
      const termMatch = candidateMatches(candidate, preferredTerms);
      const recentPenalty = this.memory.isRecent(options.kind, candidate.id, 12)
        || this.memory.isRecent(options.kind, candidate.value, 12)
        ? 30
        : 0;
      const usagePenalty =
        this.memory.usageCount(options.kind, candidate.id) * 6 +
        this.memory.usageCount(options.kind, candidate.value) * 4;
      const unusedBonus =
        this.memory.usageCount(options.kind, candidate.id) === 0 &&
        this.memory.usageCount(options.kind, candidate.value) === 0
          ? 28
          : 0;
      const matchBonus = (groupMatch ? 28 : 0) + (termMatch ? 18 : 0);
      const score = Math.max(12, 64 + unusedBonus + matchBonus - recentPenalty - usagePenalty);

      return { candidate, score };
    });

    const totalWeight = scored.reduce((sum, entry) => sum + entry.score, 0);
    const randomSeed = [
      options.seed,
      options.kind,
      String(options.attempt ?? 0),
      String(this.sequence),
    ].join(':');
    this.sequence += 1;
    let cursor = (hashString(randomSeed) / 0xffffffff) * totalWeight;

    for (const entry of scored) {
      cursor -= entry.score;
      if (cursor <= 0) {
        return {
          id: entry.candidate.id,
          value: entry.candidate.value,
          group: entry.candidate.group ?? 'General',
          score: Math.round(entry.score),
        };
      }
    }

    const fallback = scored[scored.length - 1];
    return {
      id: fallback.candidate.id,
      value: fallback.candidate.value,
      group: fallback.candidate.group ?? 'General',
      score: Math.round(fallback.score),
    };
  }
}

export default VariationEngine;
