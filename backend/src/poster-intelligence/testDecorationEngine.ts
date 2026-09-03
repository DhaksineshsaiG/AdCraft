import DecorationEngine from './decorations/DecorationEngine';
import type { DecorationSelectionInput } from './decorations/DecorationTypes';

const SAMPLE_PRODUCTS: DecorationSelectionInput[] = [
  {
    productTitle: 'Gold Diamond Necklace',
    productCategory: 'Jewelry',
    campaign: 'Luxury',
    tone: 'Elegant',
    layoutId: 'luxury',
    typographyId: 'luxury',
    paletteId: 'luxury',
    backgroundThemeId: 'luxury',
    industryPack: 'Jewelry',
    tags: ['necklace', 'gold', 'gift'],
  },
  {
    productTitle: 'Training Water Bottle',
    productCategory: 'Sports',
    campaign: 'Summer',
    tone: 'Active',
    layoutId: 'diagonal',
    typographyId: 'sport',
    paletteId: 'sport',
    backgroundThemeId: 'sports',
    industryPack: 'Fitness',
    tags: ['sports', 'hydration', 'training'],
  },
  {
    productTitle: 'AI Workstation Laptop',
    productCategory: 'Technology',
    campaign: 'Premium',
    tone: 'Precise',
    layoutId: 'grid',
    typographyId: 'technology',
    paletteId: 'technology',
    backgroundThemeId: 'technology',
    industryPack: 'Technology',
    tags: ['laptop', 'ai', 'performance'],
  },
  {
    productTitle: 'Single Origin Coffee',
    productCategory: 'Coffee',
    campaign: 'Winter',
    tone: 'Warm',
    layoutId: 'editorial',
    typographyId: 'editorial',
    paletteId: 'warm',
    backgroundThemeId: 'coffee',
    industryPack: 'Coffee',
    tags: ['coffee', 'espresso', 'morning'],
  },
  {
    productTitle: 'Tailored Linen Blazer',
    productCategory: 'Fashion',
    campaign: 'Festival',
    tone: 'Editorial',
    layoutId: 'editorial',
    typographyId: 'fashion',
    paletteId: 'fashion',
    backgroundThemeId: 'editorial',
    industryPack: 'Fashion',
    tags: ['apparel', 'blazer', 'style'],
  },
  {
    productTitle: 'Wireless Earbuds',
    productCategory: 'Electronics',
    campaign: 'New Arrival',
    tone: 'Minimal',
    layoutId: 'minimal',
    typographyId: 'minimal',
    paletteId: 'minimal',
    backgroundThemeId: 'minimal',
    industryPack: 'Electronics',
    tags: ['audio', 'bluetooth', 'technology'],
  },
  {
    productTitle: 'Gaming Laptop',
    productCategory: 'Electronics',
    campaign: 'Black Friday',
    tone: 'Bold',
    layoutId: 'grid',
    typographyId: 'technology',
    paletteId: 'technology',
    backgroundThemeId: 'technology',
    industryPack: 'Gaming',
    tags: ['gaming', 'laptop', 'performance'],
  },
  {
    productTitle: 'Botanical Ceramic Mug',
    productCategory: 'Coffee',
    campaign: 'Summer',
    tone: 'Natural',
    layoutId: 'story',
    typographyId: 'friendly',
    paletteId: 'friendly',
    backgroundThemeId: 'nature',
    industryPack: 'Coffee',
    tags: ['coffee', 'mug', 'botanical'],
  },
];

function printDecorationDecision(
  product: DecorationSelectionInput,
  decorationEngine: DecorationEngine
): void {
  const decoration = decorationEngine.selectDecoration(product);

  console.log('='.repeat(50));
  console.log('');
  console.log(`Product: ${product.productTitle ?? product.productCategory}`);
  console.log(`Category: ${product.productCategory}`);
  console.log(`Campaign: ${product.campaign ?? 'Default'}`);
  console.log(`Tone: ${product.tone ?? 'Default'}`);
  console.log(`Layout: ${product.layoutId ?? 'Default'}`);
  console.log(`Typography: ${product.typographyId ?? 'Default'}`);
  console.log(`Palette: ${product.paletteId ?? 'Default'}`);
  console.log(`Background: ${product.backgroundThemeId ?? 'Default'}`);
  console.log(`Industry Pack: ${product.industryPack ?? 'Default'}`);
  console.log('');
  console.log(`Selected decoration profile: ${decoration.decorationId}`);
  console.log(`Elements: ${decoration.elements.join(', ')}`);
  console.log(`Density: ${decoration.density}`);
  console.log(`Placement: ${decoration.placement}`);
  console.log(`Layering: ${decoration.layering}`);
  console.log('');
  console.log(JSON.stringify(decoration, null, 2));
  console.log('');
}

function runDecorationPlayground(): void {
  const decorationEngine = new DecorationEngine();

  console.log('Poster Intelligence Decoration Playground');
  console.log('');
  SAMPLE_PRODUCTS.forEach((product) => printDecorationDecision(product, decorationEngine));
  console.log('='.repeat(50));
}

runDecorationPlayground();
