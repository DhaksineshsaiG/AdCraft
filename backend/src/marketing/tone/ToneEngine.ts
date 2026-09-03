import type { MarketingCategory } from '../category/CategoryDetector';

export type MarketingTone =
  | 'Energetic'
  | 'Luxury'
  | 'Elegant'
  | 'Modern'
  | 'Warm'
  | 'Stylish'
  | 'Minimal'
  | 'Powerful'
  | 'Professional';

const CATEGORY_TONES: Record<MarketingCategory, MarketingTone> = {
  Footwear: 'Energetic',
  Fragrance: 'Luxury',
  Jewelry: 'Elegant',
  Electronics: 'Modern',
  Coffee: 'Warm',
  Fashion: 'Stylish',
  Furniture: 'Minimal',
  Sports: 'Powerful',
  General: 'Professional',
};

export class ToneEngine {
  getTone(category: MarketingCategory): MarketingTone {
    return CATEGORY_TONES[category] ?? 'Professional';
  }
}

export default ToneEngine;
