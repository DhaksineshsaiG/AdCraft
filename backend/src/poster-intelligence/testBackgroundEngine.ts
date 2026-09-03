import BackgroundEngine from './background/BackgroundEngine';
import type { BackgroundSelectionInput } from './background/BackgroundTypes';

const SAMPLE_PRODUCTS: BackgroundSelectionInput[] = [
  {
    productTitle: 'Nike Air Max Running Shoes',
    productCategory: 'Shoes',
    campaign: 'New Arrival',
    tone: 'Energetic',
    layoutId: 'diagonal',
    typographyId: 'sport',
    paletteId: 'sport',
    industryPack: 'Fitness',
    posterSize: 'square',
    tags: ['sneakers', 'running shoes', 'streetwear'],
  },
  {
    productTitle: 'Dior Sauvage Perfume',
    productCategory: 'Perfume',
    campaign: 'Luxury',
    tone: 'Refined',
    layoutId: 'luxury',
    typographyId: 'luxury',
    paletteId: 'luxury',
    industryPack: 'Luxury',
    posterSize: 'portrait',
    tags: ['fragrance', 'premium', 'gift'],
  },
  {
    productTitle: 'Apple iPhone 16 Pro',
    productCategory: 'Phone',
    campaign: 'New Arrival',
    tone: 'Modern',
    layoutId: 'hero-center',
    typographyId: 'technology',
    paletteId: 'technology',
    industryPack: 'Electronics',
    posterSize: 'square',
    tags: ['smartphone', 'camera', 'technology'],
  },
  {
    productTitle: 'Single Origin Coffee',
    productCategory: 'Coffee',
    campaign: 'Winter',
    tone: 'Warm',
    layoutId: 'editorial',
    typographyId: 'editorial',
    paletteId: 'warm',
    industryPack: 'Coffee',
    posterSize: 'story',
    tags: ['coffee', 'espresso', 'morning'],
  },
  {
    productTitle: 'Modular Oak Sofa',
    productCategory: 'Furniture',
    campaign: 'Minimal',
    tone: 'Practical',
    layoutId: 'split',
    typographyId: 'modern',
    paletteId: 'modern',
    industryPack: 'Furniture',
    posterSize: 'landscape',
    tags: ['sofa', 'home', 'living room'],
  },
  {
    productTitle: 'Gold Diamond Necklace',
    productCategory: 'Jewelry',
    campaign: 'Premium',
    tone: 'Elegant',
    layoutId: 'luxury',
    typographyId: 'luxury',
    paletteId: 'luxury',
    industryPack: 'Jewelry',
    posterSize: 'portrait',
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
    industryPack: 'Fitness',
    posterSize: 'story',
    tags: ['sports', 'hydration', 'training'],
  },
  {
    productTitle: 'Tailored Linen Blazer',
    productCategory: 'Fashion',
    campaign: 'Festival',
    tone: 'Editorial',
    layoutId: 'editorial',
    typographyId: 'fashion',
    paletteId: 'fashion',
    industryPack: 'Fashion',
    posterSize: 'portrait',
    tags: ['apparel', 'blazer', 'style'],
  },
  {
    productTitle: 'AI Workstation Laptop',
    productCategory: 'Technology',
    campaign: 'Premium',
    tone: 'Precise',
    layoutId: 'grid',
    typographyId: 'technology',
    paletteId: 'technology',
    industryPack: 'Technology',
    posterSize: 'wide',
    tags: ['laptop', 'ai', 'performance'],
  },
];

function posterSizeLabel(product: BackgroundSelectionInput): string {
  if (typeof product.posterSize === 'string') return product.posterSize;
  return `${product.posterSize.width}x${product.posterSize.height}`;
}

function printBackgroundDecision(
  product: BackgroundSelectionInput,
  backgroundEngine: BackgroundEngine
): void {
  const background = backgroundEngine.selectBackground(product);

  console.log('='.repeat(50));
  console.log('');
  console.log(`Product: ${product.productTitle ?? product.productCategory}`);
  console.log(`Category: ${product.productCategory}`);
  console.log(`Poster Size: ${posterSizeLabel(product)}`);
  console.log(`Campaign: ${product.campaign ?? 'Default'}`);
  console.log(`Tone: ${product.tone ?? 'Default'}`);
  console.log(`Layout: ${product.layoutId ?? 'Default'}`);
  console.log(`Typography: ${product.typographyId ?? 'Default'}`);
  console.log(`Palette: ${product.paletteId ?? 'Default'}`);
  console.log(`Industry Pack: ${product.industryPack ?? 'Default'}`);
  console.log('');
  console.log(`Selected theme: ${background.themeId}`);
  console.log(`Texture: ${background.texture}`);
  console.log(`Lighting: ${background.lighting}`);
  console.log(`Gradient: ${background.gradient}`);
  console.log(`Overlay: ${background.overlay}`);
  console.log(`Depth: ${background.depth}`);
  console.log(`Atmosphere: ${background.atmosphere}`);
  console.log('');
  console.log(JSON.stringify(background, null, 2));
  console.log('');
}

function runBackgroundPlayground(): void {
  const backgroundEngine = new BackgroundEngine();

  console.log('Poster Intelligence Background Playground');
  console.log('');
  SAMPLE_PRODUCTS.forEach((product) => printBackgroundDecision(product, backgroundEngine));
  console.log('='.repeat(50));
}

runBackgroundPlayground();
