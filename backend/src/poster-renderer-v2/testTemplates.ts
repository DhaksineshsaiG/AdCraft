import fs from 'fs';
import path from 'path';
import PosterDesignComposer from '../poster-intelligence/composer/PosterDesignComposer';
import RendererV2 from './Renderer';
import TemplateRegistry from './templates/TemplateRegistry';
import TemplateSelector from './templates/TemplateSelector';
import type { PosterDesignInput } from '../poster-intelligence/composer/PosterDesignTypes';

const OUTPUT_DIR = path.resolve(process.cwd(), 'tmp', 'renderer-v2-templates');

const PRODUCT: PosterDesignInput = {
  productTitle: 'Aurora Runner Premium Sneaker',
  productCategory: 'Shoes',
  posterSize: 'portrait',
  campaign: 'New Arrival',
  tone: 'Premium',
  industryPack: 'Fashion',
  tags: ['sneakers', 'performance', 'limited edition'],
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function runTemplatePlayground(): void {
  const registry = new TemplateRegistry();
  const selector = new TemplateSelector(registry);
  const composer = new PosterDesignComposer();
  const renderer = new RendererV2();
  const design = composer.compose(PRODUCT);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  registry.getCollections().forEach((collection) => {
    const template = selector.selectTemplate({
      productCategory: PRODUCT.productCategory,
      campaign: PRODUCT.campaign,
      tone: PRODUCT.tone,
      industryPack: PRODUCT.industryPack,
      posterSize: PRODUCT.posterSize,
      preferredCollection: collection,
    });
    const svg = renderer.renderSvg({
      design,
      canvas: { width: 1080, height: 1350 },
      template,
      content: {
        headline: PRODUCT.productTitle ?? PRODUCT.productCategory,
        description: `Same product, ${collection} template family. Template: ${template.name}.`,
        price: '$148',
        cta: 'Shop Drop',
        productImageAlt: PRODUCT.productTitle,
      },
    });
    const outputPath = path.join(OUTPUT_DIR, `${slug(collection)}-${slug(template.templateId)}.svg`);
    fs.writeFileSync(outputPath, svg, 'utf8');
    console.log(`${collection}: ${template.name} (${template.templateId})`);
    console.log(`  ${outputPath}`);
  });

  const automatic = selector.selectTemplate({
    productCategory: PRODUCT.productCategory,
    campaign: PRODUCT.campaign,
    tone: PRODUCT.tone,
    industryPack: PRODUCT.industryPack,
    posterSize: PRODUCT.posterSize,
  });
  console.log(`Automatic selection: ${automatic.name} (${automatic.templateId})`);
}

runTemplatePlayground();
