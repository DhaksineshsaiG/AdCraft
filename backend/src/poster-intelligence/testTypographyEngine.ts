import TypographyEngine from './typography/TypographyEngine';
import type { TypographySelectionInput } from './typography/TypographyTypes';

const SAMPLE_PRODUCTS: TypographySelectionInput[] = [
  {
    productTitle: 'Nike Air Max Running Shoes',
    productCategory: 'Shoes',
    tone: 'Energetic',
    campaign: 'New Arrival',
    layoutId: 'hero-center',
    industryPack: 'Fitness',
    tags: ['sneakers', 'running shoes', 'streetwear'],
  },
  {
    productTitle: 'Gold Diamond Necklace',
    productCategory: 'Jewelry',
    tone: 'Elegant',
    campaign: 'Luxury',
    layoutId: 'luxury',
    industryPack: 'Jewelry',
    tags: ['necklace', 'gold', 'premium'],
  },
  {
    productTitle: 'Wireless Earbuds',
    productCategory: 'Electronics',
    tone: 'Technology',
    campaign: 'New Arrival',
    layoutId: 'minimal',
    industryPack: 'Electronics',
    tags: ['audio', 'bluetooth', 'technology'],
  },
  {
    productTitle: 'Single Origin Coffee',
    productCategory: 'Coffee',
    tone: 'Warm',
    campaign: 'Winter',
    layoutId: 'editorial',
    industryPack: 'Coffee',
    tags: ['coffee', 'espresso', 'morning'],
  },
  {
    productTitle: 'Tailored Linen Blazer',
    productCategory: 'Fashion',
    tone: 'Fashion',
    campaign: 'Festival',
    layoutId: 'editorial',
    industryPack: 'Fashion',
    tags: ['apparel', 'blazer', 'style'],
  },
  {
    productTitle: 'Training Water Bottle',
    productCategory: 'Sports',
    tone: 'Active',
    campaign: 'Summer',
    layoutId: 'diagonal',
    industryPack: 'Fitness',
    tags: ['sports', 'hydration', 'training'],
  },
  {
    productTitle: 'Modular Oak Sofa',
    productCategory: 'Furniture',
    tone: 'Practical',
    campaign: 'Minimal',
    layoutId: 'split',
    industryPack: 'Furniture',
    tags: ['sofa', 'home', 'living room'],
  },
  {
    productTitle: 'AI Workstation Laptop',
    productCategory: 'Technology',
    tone: 'Precise',
    campaign: 'Premium',
    layoutId: 'grid',
    industryPack: 'Technology',
    tags: ['laptop', 'ai', 'performance'],
  },
];

function printTypographyDecision(
  product: TypographySelectionInput,
  typographyEngine: TypographyEngine
): void {
  const typography = typographyEngine.selectTypography(product);

  console.log('='.repeat(50));
  console.log('');
  console.log(`Product: ${product.productTitle ?? product.productCategory}`);
  console.log(`Category: ${product.productCategory}`);
  console.log(`Tone: ${product.tone ?? 'Default'}`);
  console.log(`Campaign: ${product.campaign ?? 'Default'}`);
  console.log(`Layout: ${product.layoutId ?? 'Default'}`);
  console.log(`Industry Pack: ${product.industryPack ?? 'Default'}`);
  console.log('');
  console.log(JSON.stringify(typography, null, 2));
  console.log('');
}

function runTypographyPlayground(): void {
  const typographyEngine = new TypographyEngine();

  console.log('Poster Intelligence Typography Playground');
  console.log('');
  SAMPLE_PRODUCTS.forEach((product) => printTypographyDecision(product, typographyEngine));
  console.log('='.repeat(50));
}

runTypographyPlayground();
