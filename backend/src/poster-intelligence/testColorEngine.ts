import ColorEngine, { checkContrast } from './colors/ColorEngine';
import type { ColorSelectionInput } from './colors/ColorTypes';

const SAMPLE_PRODUCTS: ColorSelectionInput[] = [
  {
    productTitle: 'Nike Air Max Running Shoes',
    productCategory: 'Shoes',
    tone: 'Energetic',
    campaign: 'New Arrival',
    layoutId: 'hero-center',
    typographyId: 'sport',
    industryPack: 'Fitness',
    tags: ['sneakers', 'running shoes', 'streetwear'],
  },
  {
    productTitle: 'Gold Diamond Necklace',
    productCategory: 'Jewelry',
    tone: 'Elegant',
    campaign: 'Luxury',
    layoutId: 'luxury',
    typographyId: 'luxury',
    industryPack: 'Jewelry',
    tags: ['necklace', 'gold', 'premium'],
  },
  {
    productTitle: 'Wireless Earbuds',
    productCategory: 'Electronics',
    tone: 'Technology',
    campaign: 'New Arrival',
    layoutId: 'minimal',
    typographyId: 'technology',
    industryPack: 'Electronics',
    tags: ['audio', 'bluetooth', 'technology'],
  },
  {
    productTitle: 'Single Origin Coffee',
    productCategory: 'Coffee',
    tone: 'Warm',
    campaign: 'Winter',
    layoutId: 'editorial',
    typographyId: 'editorial',
    industryPack: 'Coffee',
    tags: ['coffee', 'espresso', 'morning'],
  },
  {
    productTitle: 'Tailored Linen Blazer',
    productCategory: 'Fashion',
    tone: 'Fashion',
    campaign: 'Festival',
    layoutId: 'editorial',
    typographyId: 'fashion',
    industryPack: 'Fashion',
    tags: ['apparel', 'blazer', 'style'],
  },
  {
    productTitle: 'Training Water Bottle',
    productCategory: 'Sports',
    tone: 'Active',
    campaign: 'Summer',
    layoutId: 'diagonal',
    typographyId: 'sport',
    industryPack: 'Fitness',
    tags: ['sports', 'hydration', 'training'],
  },
  {
    productTitle: 'Modular Oak Sofa',
    productCategory: 'Furniture',
    tone: 'Practical',
    campaign: 'Minimal',
    layoutId: 'split',
    typographyId: 'modern',
    industryPack: 'Furniture',
    tags: ['sofa', 'home', 'living room'],
  },
  {
    productTitle: 'AI Workstation Laptop',
    productCategory: 'Technology',
    tone: 'Precise',
    campaign: 'Premium',
    layoutId: 'grid',
    typographyId: 'technology',
    industryPack: 'Technology',
    tags: ['laptop', 'ai', 'performance'],
  },
];

function printPaletteDecision(product: ColorSelectionInput, colorEngine: ColorEngine): void {
  const palette = colorEngine.selectPalette(product);
  const headlineContrast = checkContrast(palette.headline, palette.background);

  console.log('='.repeat(50));
  console.log('');
  console.log(`Product: ${product.productTitle ?? product.productCategory}`);
  console.log(`Category: ${product.productCategory}`);
  console.log(`Tone: ${product.tone ?? 'Default'}`);
  console.log(`Campaign: ${product.campaign ?? 'Default'}`);
  console.log(`Layout: ${product.layoutId ?? 'Default'}`);
  console.log(`Typography: ${product.typographyId ?? 'Default'}`);
  console.log(`Industry Pack: ${product.industryPack ?? 'Default'}`);
  console.log(`Headline Contrast: ${headlineContrast.ratio}:1 (${headlineContrast.passes ? 'Pass' : 'Fail'})`);
  console.log('');
  console.log(JSON.stringify(palette, null, 2));
  console.log('');
}

function runColorPlayground(): void {
  const colorEngine = new ColorEngine();

  console.log('Poster Intelligence Color Playground');
  console.log('');
  SAMPLE_PRODUCTS.forEach((product) => printPaletteDecision(product, colorEngine));
  console.log('='.repeat(50));
}

runColorPlayground();
