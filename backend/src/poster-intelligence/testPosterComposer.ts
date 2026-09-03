import PosterDesignComposer from './composer/PosterDesignComposer';
import type { PosterDesignDecision, PosterDesignInput } from './composer/PosterDesignTypes';

const SAMPLE_POSTERS: PosterDesignInput[] = [
  {
    productTitle: 'Nike Air Max Running Shoes',
    productCategory: 'Shoes',
    posterSize: 'square',
    campaign: 'New Arrival',
    tone: 'Energetic',
    industryPack: 'Fitness',
    tags: ['sneakers', 'running shoes', 'streetwear'],
  },
  {
    productTitle: 'Dior Sauvage Perfume',
    productCategory: 'Perfume',
    posterSize: 'portrait',
    campaign: 'Luxury',
    tone: 'Refined',
    industryPack: 'Luxury',
    tags: ['fragrance', 'premium', 'gift'],
  },
  {
    productTitle: 'Apple iPhone 16 Pro',
    productCategory: 'Phone',
    posterSize: 'square',
    campaign: 'New Arrival',
    tone: 'Modern',
    industryPack: 'Electronics',
    tags: ['smartphone', 'camera', 'technology'],
  },
  {
    productTitle: 'Single Origin Coffee',
    productCategory: 'Coffee',
    posterSize: 'story',
    campaign: 'Winter',
    tone: 'Warm',
    industryPack: 'Coffee',
    tags: ['coffee', 'espresso', 'morning'],
  },
  {
    productTitle: 'Modular Oak Sofa',
    productCategory: 'Furniture',
    posterSize: 'landscape',
    campaign: 'Minimal',
    tone: 'Practical',
    industryPack: 'Furniture',
    tags: ['sofa', 'home', 'living room'],
  },
  {
    productTitle: 'AI Workstation Laptop',
    productCategory: 'Technology',
    posterSize: 'wide',
    campaign: 'Premium',
    tone: 'Precise',
    industryPack: 'Technology',
    tags: ['laptop', 'ai', 'performance'],
  },
];

function printSection(title: string, value: unknown): void {
  console.log(title);
  console.log('');
  console.log(JSON.stringify(value, null, 2));
  console.log('');
}

function printDesignDecision(input: PosterDesignInput, decision: PosterDesignDecision): void {
  console.log('=================================');
  console.log('');
  console.log('POSTER DESIGN DECISION');
  console.log('');
  console.log('=================================');
  console.log('');
  console.log(`Product: ${input.productTitle ?? input.productCategory}`);
  console.log('');
  printSection('Layout', decision.layout);
  printSection('Typography', decision.typography);
  printSection('Palette', decision.colors);
  printSection('Position', decision.position);
  printSection('Background', decision.background);
  printSection('Decorations', decision.decorations);
  printSection('Metadata', decision.metadata);
}

function runPosterComposerPlayground(): void {
  const composer = new PosterDesignComposer();

  SAMPLE_POSTERS.forEach((poster) => {
    const decision = composer.compose(poster);
    printDesignDecision(poster, decision);
  });
}

runPosterComposerPlayground();
