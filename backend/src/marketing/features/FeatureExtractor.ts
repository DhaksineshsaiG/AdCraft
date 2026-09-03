import type { AnalyzedProduct } from '../analyzer/ProductAnalyzer';
import type { MarketingCategory } from '../category/CategoryDetector';

export interface ExtractedMarketingAttributes {
  features: string[];
  benefits: string[];
  audience: string[];
  emotions: string[];
  keywords: string[];
}

interface ExtractionRule {
  terms: string[];
  features: string[];
  benefits: string[];
  audience: string[];
  emotions: string[];
  keywords: string[];
}

const CATEGORY_DEFAULTS: Record<MarketingCategory, ExtractedMarketingAttributes> = {
  Footwear: {
    features: ['Cushioning', 'Breathable Mesh', 'Lightweight Build', 'Responsive Sole'],
    benefits: ['All-Day Comfort', 'Confident Movement', 'Training Support'],
    audience: ['Runners', 'Athletes', 'Fitness Enthusiasts'],
    emotions: ['Energized', 'Confident', 'Ready'],
    keywords: ['running', 'stride', 'comfort', 'training'],
  },
  Fragrance: {
    features: ['Signature Notes', 'Long-Lasting Scent', 'Layered Aroma', 'Refined Bottle'],
    benefits: ['Memorable Presence', 'Lasting Impression', 'Elegant Ritual'],
    audience: ['Professionals', 'Luxury Buyers', 'Gift Shoppers'],
    emotions: ['Alluring', 'Confident', 'Sophisticated'],
    keywords: ['fragrance', 'scent', 'luxury', 'signature'],
  },
  Electronics: {
    features: ['Smart Connectivity', 'Fast Performance', 'Portable Design', 'Modern Controls'],
    benefits: ['Seamless Productivity', 'Everyday Convenience', 'Reliable Power'],
    audience: ['Tech Lovers', 'Creators', 'Professionals'],
    emotions: ['Connected', 'Capable', 'In Control'],
    keywords: ['smart', 'wireless', 'performance', 'device'],
  },
  Jewelry: {
    features: ['Polished Finish', 'Delicate Detail', 'Versatile Styling', 'Gift-Ready Design'],
    benefits: ['Everyday Elegance', 'Timeless Sparkle', 'Personal Expression'],
    audience: ['Style Seekers', 'Gift Buyers', 'Collectors'],
    emotions: ['Elegant', 'Radiant', 'Cherished'],
    keywords: ['jewelry', 'shine', 'gift', 'elegance'],
  },
  Coffee: {
    features: ['Comfortable Grip', 'Ceramic Finish', 'Warm Shape', 'Daily Capacity'],
    benefits: ['Better Mornings', 'Cozy Breaks', 'Comfort In Every Sip'],
    audience: ['Coffee Lovers', 'Home Baristas', 'Tea Drinkers'],
    emotions: ['Cozy', 'Relaxed', 'Warm'],
    keywords: ['coffee', 'brew', 'sip', 'mug'],
  },
  Fashion: {
    features: ['Flattering Fit', 'Easy Layering', 'Seasonal Fabric', 'Polished Detail'],
    benefits: ['Confident Style', 'Wardrobe Versatility', 'Effortless Outfits'],
    audience: ['Style Seekers', 'Trendsetters', 'Everyday Dressers'],
    emotions: ['Stylish', 'Expressive', 'Confident'],
    keywords: ['style', 'wear', 'fashion', 'fit'],
  },
  Furniture: {
    features: ['Ergonomic Support', 'Clean Lines', 'Durable Frame', 'Space-Smart Design'],
    benefits: ['Calmer Spaces', 'Lasting Comfort', 'Better Organization'],
    audience: ['Homeowners', 'Remote Workers', 'Design Lovers'],
    emotions: ['Calm', 'Settled', 'Focused'],
    keywords: ['home', 'space', 'comfort', 'design'],
  },
  Sports: {
    features: ['Sweat-Ready Build', 'Secure Carry', 'Training Fit', 'Durable Materials'],
    benefits: ['Focused Performance', 'Stronger Sessions', 'Workout Confidence'],
    audience: ['Athletes', 'Fitness Enthusiasts', 'Outdoor Movers'],
    emotions: ['Powerful', 'Driven', 'Ready'],
    keywords: ['sports', 'training', 'performance', 'workout'],
  },
  General: {
    features: ['Quality Materials', 'Practical Design', 'Everyday Function', 'Reliable Finish'],
    benefits: ['Everyday Value', 'Confident Choice', 'Useful Performance'],
    audience: ['Modern Shoppers', 'Gift Buyers', 'Everyday Users'],
    emotions: ['Confident', 'Assured', 'Satisfied'],
    keywords: ['quality', 'everyday', 'reliable', 'practical'],
  },
};

const EXTRACTION_RULES: ExtractionRule[] = [
  {
    terms: ['running shoe', 'running shoes', 'sneaker', 'sneakers', 'air max'],
    features: ['Running', 'Athletic', 'Breathable', 'Lightweight', 'Cushioned', 'Training'],
    benefits: ['Responsive Comfort', 'Smooth Strides', 'Daily Performance', 'Grounded Support'],
    audience: ['Runners', 'Athletes', 'Fitness Enthusiasts', 'Streetwear Fans'],
    emotions: ['Energized', 'Fast', 'Confident', 'Unstoppable'],
    keywords: ['running', 'athletic', 'comfort', 'performance'],
  },
  {
    terms: ['wireless earbuds', 'earbuds', 'bluetooth speaker', 'speaker', 'headphones'],
    features: ['Wireless', 'Bluetooth', 'Portable', 'Rechargeable', 'Premium Audio', 'Clear Sound'],
    benefits: ['Hands-Free Listening', 'Seamless Pairing', 'Room-Filling Sound', 'Travel-Ready Audio'],
    audience: ['Commuters', 'Music Lovers', 'Remote Workers', 'Travelers'],
    emotions: ['Immersed', 'Connected', 'Free', 'Focused'],
    keywords: ['wireless', 'bluetooth', 'audio', 'portable'],
  },
  {
    terms: ['leather wallet', 'wallet', 'full-grain'],
    features: ['Leather', 'Premium', 'Minimal', 'Classic', 'Durable', 'Everyday Carry'],
    benefits: ['Organized Essentials', 'Pocket-Friendly Storage', 'Timeless Style'],
    audience: ['Professionals', 'Minimalists', 'Gift Shoppers', 'Everyday Carriers'],
    emotions: ['Refined', 'Prepared', 'Polished', 'Assured'],
    keywords: ['leather', 'wallet', 'classic', 'durable'],
  },
  {
    terms: ['perfume', 'cologne', 'fragrance', 'sauvage'],
    features: ['Signature Scent', 'Layered Notes', 'Long Wear', 'Warm Woods', 'Fresh Spice'],
    benefits: ['Lasting Impression', 'Day-To-Night Presence', 'Personal Signature'],
    audience: ['Professionals', 'Luxury Buyers', 'Date-Night Dressers', 'Gift Shoppers'],
    emotions: ['Magnetic', 'Sophisticated', 'Alluring', 'Confident'],
    keywords: ['perfume', 'fragrance', 'scent', 'luxury'],
  },
  {
    terms: ['gaming laptop', 'laptop', 'mechanical keyboard', 'keyboard'],
    features: ['High Performance', 'Fast Response', 'Advanced Cooling', 'Tactile Control', 'Immersive Display'],
    benefits: ['Competitive Focus', 'Creative Speed', 'Multitasking Power', 'Reliable Control'],
    audience: ['Gamers', 'Creators', 'Developers', 'Power Users'],
    emotions: ['Focused', 'Capable', 'Competitive', 'In Control'],
    keywords: ['gaming', 'performance', 'keyboard', 'laptop'],
  },
  {
    terms: ['office chair', 'ergonomic chair', 'desk chair'],
    features: ['Ergonomic', 'Adjustable', 'Supportive', 'Cushioned', 'Smooth Rolling'],
    benefits: ['Better Posture', 'Focused Workdays', 'Long-Hour Comfort'],
    audience: ['Professionals', 'Remote Workers', 'Students', 'Home Office Users'],
    emotions: ['Focused', 'Comfortable', 'Productive', 'Balanced'],
    keywords: ['office', 'chair', 'ergonomic', 'support'],
  },
  {
    terms: ['water bottle', 'backpack', 'hydration', 'sports'],
    features: ['Durable', 'Leak-Resistant', 'Lightweight', 'Training-Ready', 'Easy Carry'],
    benefits: ['Workout Confidence', 'Hydration On The Move', 'Active-Day Support'],
    audience: ['Athletes', 'Fitness Enthusiasts', 'Outdoor Movers', 'Gym Goers'],
    emotions: ['Prepared', 'Strong', 'Driven', 'Ready'],
    keywords: ['sports', 'training', 'hydration', 'active'],
  },
  {
    terms: ['necklace', 'gold', 'jewelry'],
    features: ['Gold Finish', 'Delicate Shine', 'Layerable Design', 'Polished Detail'],
    benefits: ['Everyday Elegance', 'Gift-Ready Meaning', 'Timeless Sparkle'],
    audience: ['Gift Buyers', 'Style Seekers', 'Jewelry Lovers', 'Collectors'],
    emotions: ['Radiant', 'Cherished', 'Elegant', 'Romantic'],
    keywords: ['gold', 'necklace', 'jewelry', 'shine'],
  },
  {
    terms: ['coffee mug', 'mug', 'ceramic', 'tea'],
    features: ['Ceramic', 'Comfort Handle', 'Generous Shape', 'Warm Finish'],
    benefits: ['Cozy Breaks', 'Better Mornings', 'Relaxed Rituals'],
    audience: ['Coffee Lovers', 'Tea Drinkers', 'Home Baristas', 'Office Teams'],
    emotions: ['Warm', 'Cozy', 'Restored', 'Calm'],
    keywords: ['coffee', 'mug', 'ceramic', 'sip'],
  },
  {
    terms: ['smart watch', 'watch', 'wearable', 'fitness tracking'],
    features: ['Wearable', 'Health Tracking', 'Smart Alerts', 'Fitness Insights', 'Connected Display'],
    benefits: ['Daily Awareness', 'Connected Routines', 'Training Motivation'],
    audience: ['Fitness Enthusiasts', 'Professionals', 'Tech Lovers', 'Busy Planners'],
    emotions: ['Motivated', 'Connected', 'Aware', 'In Control'],
    keywords: ['smart watch', 'wearable', 'fitness', 'tracking'],
  },
  {
    terms: ['lipstick', 'makeup', 'beauty'],
    features: ['Rich Color', 'Creamy Texture', 'Satin Finish', 'Soft Wear'],
    benefits: ['Confident Expression', 'Polished Looks', 'Comfortable Color'],
    audience: ['Beauty Lovers', 'Style Seekers', 'Gift Shoppers', 'Makeup Minimalists'],
    emotions: ['Confident', 'Expressive', 'Radiant', 'Bold'],
    keywords: ['lipstick', 'beauty', 'color', 'makeup'],
  },
];

function includesTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

function addUnique(target: string[], values: string[]): void {
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    if (!target.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
      target.push(normalized);
    }
  }
}

function meaningfulTokens(product: AnalyzedProduct): string[] {
  return [product.title, product.category, product.vendor, ...product.tags]
    .join(' ')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 8);
}

export class FeatureExtractor {
  extract(product: AnalyzedProduct): ExtractedMarketingAttributes {
    const defaults = CATEGORY_DEFAULTS[product.normalizedCategory];
    const result: ExtractedMarketingAttributes = {
      features: [...defaults.features],
      benefits: [...defaults.benefits],
      audience: [...defaults.audience],
      emotions: [...defaults.emotions],
      keywords: [...defaults.keywords],
    };
    const searchableText = [
      product.title,
      product.description,
      product.category,
      product.vendor,
      ...product.tags,
    ]
      .join(' ')
      .toLowerCase();

    for (const rule of EXTRACTION_RULES) {
      if (rule.terms.some((term) => includesTerm(searchableText, term))) {
        addUnique(result.features, rule.features);
        addUnique(result.benefits, rule.benefits);
        addUnique(result.audience, rule.audience);
        addUnique(result.emotions, rule.emotions);
        addUnique(result.keywords, rule.keywords);
      }
    }

    addUnique(result.keywords, meaningfulTokens(product));

    return {
      features: result.features.slice(0, 16),
      benefits: result.benefits.slice(0, 16),
      audience: result.audience.slice(0, 12),
      emotions: result.emotions.slice(0, 12),
      keywords: result.keywords.slice(0, 18),
    };
  }
}

export default FeatureExtractor;
