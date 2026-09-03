import fs from 'fs';
import path from 'path';
import PosterDesignComposer from '../poster-intelligence/composer/PosterDesignComposer';
import RendererV2 from './Renderer';
import type { PosterDesignInput } from '../poster-intelligence/composer/PosterDesignTypes';

interface ProductionSample {
  category: string;
  productTitle: string;
  campaign: string;
  tone: string;
  industryPack: string;
  tags: string[];
  price: string;
}

interface ProductionSize {
  id: string;
  label: string;
  width: number;
  height: number;
  posterSize: PosterDesignInput['posterSize'];
}

const OUTPUT_DIR = path.resolve(process.cwd(), 'tmp', 'renderer-v2-production');

const SIZES: ProductionSize[] = [
  { id: 'square', label: 'Square', width: 1080, height: 1080, posterSize: 'square' },
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350, posterSize: 'portrait' },
  { id: 'landscape', label: 'Landscape', width: 1350, height: 1080, posterSize: 'landscape' },
  { id: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920, posterSize: 'story' },
  { id: 'facebook-post', label: 'Facebook Post', width: 1200, height: 630, posterSize: { width: 1200, height: 630 } },
  { id: 'a4-print', label: 'A4 Print', width: 1240, height: 1754, posterSize: { width: 1240, height: 1754 } },
];

const SAMPLES: ProductionSample[] = [
  {
    category: 'Shoes',
    productTitle: 'Nike Air Max Running Shoes',
    campaign: 'New Arrival',
    tone: 'Energetic',
    industryPack: 'Fitness',
    tags: ['sneakers', 'running shoes', 'streetwear'],
    price: '$129',
  },
  {
    category: 'Coffee',
    productTitle: 'Single Origin Coffee',
    campaign: 'Winter',
    tone: 'Warm',
    industryPack: 'Coffee',
    tags: ['coffee', 'espresso', 'morning'],
    price: '$24',
  },
  {
    category: 'Perfume',
    productTitle: 'Noir Amber Perfume',
    campaign: 'Premium',
    tone: 'Elegant',
    industryPack: 'Beauty',
    tags: ['fragrance', 'luxury', 'amber'],
    price: '$98',
  },
  {
    category: 'Jewelry',
    productTitle: 'Gold Diamond Necklace',
    campaign: 'Luxury',
    tone: 'Elegant',
    industryPack: 'Jewelry',
    tags: ['necklace', 'gold', 'gift'],
    price: '$420',
  },
  {
    category: 'Furniture',
    productTitle: 'Modular Oak Sofa',
    campaign: 'Minimal',
    tone: 'Practical',
    industryPack: 'Furniture',
    tags: ['sofa', 'home', 'living room'],
    price: '$899',
  },
  {
    category: 'Electronics',
    productTitle: 'Wireless Earbuds',
    campaign: 'New Arrival',
    tone: 'Technology',
    industryPack: 'Electronics',
    tags: ['audio', 'bluetooth', 'technology'],
    price: '$159',
  },
  {
    category: 'Fashion',
    productTitle: 'Tailored Linen Blazer',
    campaign: 'Festival',
    tone: 'Editorial',
    industryPack: 'Fashion',
    tags: ['apparel', 'blazer', 'style'],
    price: '$210',
  },
  {
    category: 'Sports',
    productTitle: 'Training Water Bottle',
    campaign: 'Summer',
    tone: 'Active',
    industryPack: 'Fitness',
    tags: ['sports', 'hydration', 'training'],
    price: '$32',
  },
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function runProductionRendererPlayground(): void {
  const composer = new PosterDesignComposer();
  const renderer = new RendererV2();
  let generated = 0;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  SAMPLES.forEach((sample) => {
    SIZES.forEach((size) => {
      const designInput: PosterDesignInput = {
        productTitle: sample.productTitle,
        productCategory: sample.category,
        posterSize: size.posterSize,
        campaign: sample.campaign,
        tone: sample.tone,
        industryPack: sample.industryPack,
        tags: sample.tags,
      };
      const design = composer.compose(designInput);
      const svg = renderer.renderSvg({
        design,
        canvas: { width: size.width, height: size.height },
        content: {
          headline: sample.productTitle,
          description: `${size.label} production-quality Renderer V2 sample using ${design.layout.layoutId}, ${design.typography.typographyId}, ${design.colors.paletteId}, and ${design.background.themeId}.`,
          price: sample.price,
          cta: 'Shop Now',
          productImageAlt: sample.productTitle,
        },
      });
      const filename = `${slug(sample.category)}-${size.id}.svg`;
      const outputPath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(outputPath, svg, 'utf8');
      generated += 1;
      console.log(`${sample.category} / ${size.label}: ${outputPath}`);
      console.log(`  layout=${design.layout.layoutId}, type=${design.typography.typographyId}, palette=${design.colors.paletteId}, position=${design.position.positionId}, background=${design.background.themeId}, decorations=${design.decorations.decorationId}`);
    });
  });

  console.log(`Generated ${generated} Renderer V2 production samples in ${OUTPUT_DIR}`);
}

runProductionRendererPlayground();
