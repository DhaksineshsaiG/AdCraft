import fs from 'fs';
import path from 'path';
import PosterDesignComposer from '../poster-intelligence/composer/PosterDesignComposer';
import RendererV2 from './Renderer';
import type { PosterDesignInput } from '../poster-intelligence/composer/PosterDesignTypes';

interface SamplePoster {
  filename: string;
  designInput: PosterDesignInput;
}

const OUTPUT_DIR = path.resolve(process.cwd(), 'tmp', 'renderer-v2-v2');

const SAMPLES: SamplePoster[] = [
  {
    filename: 'shoes.svg',
    designInput: {
      productTitle: 'Nike Air Max Running Shoes',
      productCategory: 'Shoes',
      posterSize: 'square',
      campaign: 'New Arrival',
      tone: 'Energetic',
      industryPack: 'Fitness',
      tags: ['sneakers', 'running shoes', 'streetwear'],
    },
  },
  {
    filename: 'jewelry.svg',
    designInput: {
      productTitle: 'Gold Diamond Necklace',
      productCategory: 'Jewelry',
      posterSize: 'portrait',
      campaign: 'Luxury',
      tone: 'Elegant',
      industryPack: 'Jewelry',
      tags: ['necklace', 'gold', 'gift'],
    },
  },
  {
    filename: 'coffee.svg',
    designInput: {
      productTitle: 'Single Origin Coffee',
      productCategory: 'Coffee',
      posterSize: 'story',
      campaign: 'Winter',
      tone: 'Warm',
      industryPack: 'Coffee',
      tags: ['coffee', 'espresso', 'morning'],
    },
  },
  {
    filename: 'perfume.svg',
    designInput: {
      productTitle: 'Noir Amber Perfume',
      productCategory: 'Perfume',
      posterSize: 'portrait',
      campaign: 'Premium',
      tone: 'Elegant',
      industryPack: 'Beauty',
      tags: ['fragrance', 'luxury', 'amber'],
    },
  },
  {
    filename: 'electronics.svg',
    designInput: {
      productTitle: 'Wireless Earbuds',
      productCategory: 'Electronics',
      posterSize: 'square',
      campaign: 'New Arrival',
      tone: 'Technology',
      industryPack: 'Electronics',
      tags: ['audio', 'bluetooth', 'technology'],
    },
  },
  {
    filename: 'furniture.svg',
    designInput: {
      productTitle: 'Modular Oak Sofa',
      productCategory: 'Furniture',
      posterSize: 'landscape',
      campaign: 'Minimal',
      tone: 'Practical',
      industryPack: 'Furniture',
      tags: ['sofa', 'home', 'living room'],
    },
  },
  {
    filename: 'fashion.svg',
    designInput: {
      productTitle: 'Tailored Linen Blazer',
      productCategory: 'Fashion',
      posterSize: 'portrait',
      campaign: 'Festival',
      tone: 'Editorial',
      industryPack: 'Fashion',
      tags: ['apparel', 'blazer', 'style'],
    },
  },
  {
    filename: 'sports.svg',
    designInput: {
      productTitle: 'Training Water Bottle',
      productCategory: 'Sports',
      posterSize: 'story',
      campaign: 'Summer',
      tone: 'Active',
      industryPack: 'Fitness',
      tags: ['sports', 'hydration', 'training'],
    },
  },
];

function canvasSize(input: PosterDesignInput): { width: number; height: number } {
  if (typeof input.posterSize !== 'string') {
    return { width: input.posterSize.width, height: input.posterSize.height };
  }

  if (input.posterSize === 'story') return { width: 1080, height: 1920 };
  if (input.posterSize === 'portrait') return { width: 1080, height: 1350 };
  if (input.posterSize === 'landscape') return { width: 1350, height: 1080 };
  if (input.posterSize === 'wide') return { width: 1600, height: 900 };
  return { width: 1080, height: 1080 };
}

function runRendererPlayground(): void {
  const composer = new PosterDesignComposer();
  const renderer = new RendererV2();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  SAMPLES.forEach((sample) => {
    const design = composer.compose(sample.designInput);
    const svg = renderer.renderSvg({
      design,
      canvas: canvasSize(sample.designInput),
      content: {
        headline: sample.designInput.productTitle ?? sample.designInput.productCategory,
        description: `A renderer v2 sample using ${design.layout.layoutId}, ${design.typography.typographyId}, and ${design.colors.paletteId}.`,
        price: '$129',
        cta: 'Shop Now',
        productImageAlt: sample.designInput.productTitle,
      },
    });
    const outputPath = path.join(OUTPUT_DIR, sample.filename);
    fs.writeFileSync(outputPath, svg, 'utf8');
    console.log(`${sample.designInput.productCategory}: ${outputPath}`);
    console.log(`  layout=${design.layout.layoutId}, typography=${design.typography.typographyId}, palette=${design.colors.paletteId}, position=${design.position.positionId}, background=${design.background.themeId}, decorations=${design.decorations.decorationId}`);
  });
}

runRendererPlayground();
