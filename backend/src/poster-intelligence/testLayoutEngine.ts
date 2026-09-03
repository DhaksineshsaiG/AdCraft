import LayoutEngine from './layout/LayoutEngine';
import type { LayoutSelectionInput } from './layout/LayoutTypes';

const SAMPLE_PRODUCTS: LayoutSelectionInput[] = [
  {
    productTitle: 'Nike Air Max Running Shoes',
    productCategory: 'Shoes',
    posterSize: 'square',
    campaign: 'New Arrival',
    tone: 'Bold',
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
    tone: 'Minimal',
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
    productTitle: 'Gold Diamond Necklace',
    productCategory: 'Jewelry',
    posterSize: 'portrait',
    campaign: 'Premium',
    tone: 'Elegant',
    industryPack: 'Jewelry',
    tags: ['necklace', 'gold', 'gift'],
  },
  {
    productTitle: 'Training Water Bottle',
    productCategory: 'Sports',
    posterSize: 'story',
    campaign: 'Summer',
    tone: 'Energetic',
    industryPack: 'Fitness',
    tags: ['sports', 'hydration', 'training'],
  },
  {
    productTitle: 'Tailored Linen Blazer',
    productCategory: 'Fashion',
    posterSize: 'portrait',
    campaign: 'Festival',
    tone: 'Editorial',
    industryPack: 'Fashion',
    tags: ['apparel', 'blazer', 'style'],
  },
];

function printLayoutDecision(product: LayoutSelectionInput, layoutEngine: LayoutEngine): void {
  const layout = layoutEngine.selectLayout(product);

  console.log('='.repeat(50));
  console.log('');
  console.log(`Product: ${product.productTitle ?? product.productCategory}`);
  console.log(`Category: ${product.productCategory}`);
  console.log(`Poster Size: ${typeof product.posterSize === 'string' ? product.posterSize : `${product.posterSize.width}x${product.posterSize.height}`}`);
  console.log(`Campaign: ${product.campaign ?? 'Default'}`);
  console.log(`Tone: ${product.tone ?? 'Default'}`);
  console.log(`Industry Pack: ${product.industryPack ?? 'Default'}`);
  console.log('');
  console.log(JSON.stringify(layout, null, 2));
  console.log('');
}

function runLayoutPlayground(): void {
  const layoutEngine = new LayoutEngine();

  console.log('Poster Intelligence Layout Playground');
  console.log('');
  SAMPLE_PRODUCTS.forEach((product) => printLayoutDecision(product, layoutEngine));
  console.log('='.repeat(50));
}

runLayoutPlayground();
