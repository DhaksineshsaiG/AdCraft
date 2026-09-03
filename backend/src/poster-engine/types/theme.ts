export type PremiumPosterTheme =
  | 'luxury'
  | 'modern'
  | 'minimal'
  | 'tech'
  | 'sports'
  | 'fashion'
  | 'coffee'
  | 'fragrance'
  | 'interior';

export interface PosterColorPalette {
  dominant: string;
  vibrant: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  text: string;
  mutedText: string;
  glow: string;
}
