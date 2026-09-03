export interface QualityDetailedScores {
  headline: number;
  description: number;
  cta: number;
  originality: number;
  readability: number;
  tone: number;
  relevance: number;
}

export interface QualityReport {
  score: number;
  passed: boolean;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  detailedScores: QualityDetailedScores;
}

export default QualityReport;
