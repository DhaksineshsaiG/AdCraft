import PositionEngine from './position/PositionEngine';
import type { PositionSelectionInput } from './position/PositionTypes';

const SAMPLE_PRODUCTS: PositionSelectionInput[] = [
  {
    productTitle: 'Nike Air Max Running Shoes',
    productCategory: 'Shoes',
    layoutId: 'diagonal',
    typographyId: 'sport',
    paletteId: 'sport',
    campaign: 'New Arrival',
    industryPack: 'Fitness',
    posterSize: 'square',
    tags: ['sneakers', 'running shoes', 'streetwear'],
  },
  {
    productTitle: 'Dior Sauvage Perfume',
    productCategory: 'Perfume',
    layoutId: 'luxury',
    typographyId: 'luxury',
    paletteId: 'luxury',
    campaign: 'Luxury',
    industryPack: 'Luxury',
    posterSize: 'portrait',
    tags: ['fragrance', 'premium', 'gift'],
  },
  {
    productTitle: 'Apple iPhone 16 Pro',
    productCategory: 'Phone',
    layoutId: 'hero-center',
    typographyId: 'technology',
    paletteId: 'technology',
    campaign: 'New Arrival',
    industryPack: 'Electronics',
    posterSize: 'square',
    tags: ['smartphone', 'camera', 'technology'],
  },
  {
    productTitle: 'Single Origin Coffee',
    productCategory: 'Coffee',
    layoutId: 'editorial',
    typographyId: 'editorial',
    paletteId: 'warm',
    campaign: 'Winter',
    industryPack: 'Coffee',
    posterSize: 'story',
    tags: ['coffee', 'espresso', 'morning'],
  },
  {
    productTitle: 'Modular Oak Sofa',
    productCategory: 'Furniture',
    layoutId: 'split',
    typographyId: 'modern',
    paletteId: 'modern',
    campaign: 'Minimal',
    industryPack: 'Furniture',
    posterSize: 'landscape',
    tags: ['sofa', 'home', 'living room'],
  },
  {
    productTitle: 'Gold Diamond Necklace',
    productCategory: 'Jewelry',
    layoutId: 'luxury',
    typographyId: 'luxury',
    paletteId: 'luxury',
    campaign: 'Premium',
    industryPack: 'Jewelry',
    posterSize: 'portrait',
    tags: ['necklace', 'gold', 'gift'],
  },
  {
    productTitle: 'Training Water Bottle',
    productCategory: 'Sports',
    layoutId: 'diagonal',
    typographyId: 'sport',
    paletteId: 'sport',
    campaign: 'Summer',
    industryPack: 'Fitness',
    posterSize: 'story',
    tags: ['sports', 'hydration', 'training'],
  },
  {
    productTitle: 'Tailored Linen Blazer',
    productCategory: 'Fashion',
    layoutId: 'editorial',
    typographyId: 'fashion',
    paletteId: 'fashion',
    campaign: 'Festival',
    industryPack: 'Fashion',
    posterSize: 'portrait',
    tags: ['apparel', 'blazer', 'style'],
  },
  {
    productTitle: 'AI Workstation Laptop',
    productCategory: 'Technology',
    layoutId: 'minimal',
    typographyId: 'technology',
    paletteId: 'technology',
    campaign: 'Premium',
    industryPack: 'Technology',
    posterSize: 'wide',
    tags: ['laptop', 'ai', 'performance'],
  },
];

function posterSizeLabel(product: PositionSelectionInput): string {
  if (typeof product.posterSize === 'string') return product.posterSize;
  return `${product.posterSize.width}x${product.posterSize.height}`;
}

function printPositionDecision(
  product: PositionSelectionInput,
  positionEngine: PositionEngine
): void {
  const position = positionEngine.selectPosition(product);

  console.log('='.repeat(50));
  console.log('');
  console.log(`Product: ${product.productTitle ?? product.productCategory}`);
  console.log(`Category: ${product.productCategory}`);
  console.log(`Poster Size: ${posterSizeLabel(product)}`);
  console.log(`Layout: ${product.layoutId ?? 'Default'}`);
  console.log(`Typography: ${product.typographyId ?? 'Default'}`);
  console.log(`Palette: ${product.paletteId ?? 'Default'}`);
  console.log(`Campaign: ${product.campaign ?? 'Default'}`);
  console.log(`Industry Pack: ${product.industryPack ?? 'Default'}`);
  console.log('');
  console.log(`Selected positioning profile: ${position.positionId}`);
  console.log(`Scale: ${position.scale}`);
  console.log(`Rotation: ${position.rotation}`);
  console.log(`Anchor: ${position.anchor}`);
  console.log(`Offset: X ${position.offsetX}, Y ${position.offsetY}`);
  console.log(`Depth: ${position.depth}`);
  console.log('');
  console.log(JSON.stringify(position, null, 2));
  console.log('');
}

function runPositionPlayground(): void {
  const positionEngine = new PositionEngine();

  console.log('Poster Intelligence Position Playground');
  console.log('');
  SAMPLE_PRODUCTS.forEach((product) => printPositionDecision(product, positionEngine));
  console.log('='.repeat(50));
}

runPositionPlayground();
