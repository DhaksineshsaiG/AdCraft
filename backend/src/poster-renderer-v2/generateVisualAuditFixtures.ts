import fs from 'fs';
import path from 'path';
import PosterDesignComposer from '../poster-intelligence/composer/PosterDesignComposer';
import PosterV2RendererAdapter from './PosterV2RendererAdapter';
import { DefaultSharpRenderer } from '../poster-engine/renderers/sharp/DefaultSharpRenderer';
import type { PosterData } from '../poster-engine/types/data';
import type { PosterDimensions } from '../poster-engine/types/geometry';

const OUTPUT_DIR = path.resolve(process.cwd(), 'tmp', 'v2-visual-audit');
const CUTOUTS_DIR = path.resolve(OUTPUT_DIR, 'cutouts');

function createCoffeeCutoutSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
      <linearGradient id="bag-body" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#3E2723" />
        <stop offset="35%" stop-color="#2D1A15" />
        <stop offset="70%" stop-color="#1B0F0B" />
        <stop offset="100%" stop-color="#0E0705" />
      </linearGradient>
      <linearGradient id="bag-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08" />
        <stop offset="30%" stop-color="#ffffff" stop-opacity="0.22" />
        <stop offset="60%" stop-color="#ffffff" stop-opacity="0.02" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.3" />
      </linearGradient>
      <linearGradient id="gold-foil" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#D4AF37" />
        <stop offset="30%" stop-color="#FFF2B2" />
        <stop offset="60%" stop-color="#C59B27" />
        <stop offset="100%" stop-color="#8C6D1F" />
      </linearGradient>
      <filter id="cutout-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#cutout-shadow)">
      <ellipse cx="400" cy="710" rx="260" ry="32" fill="#000000" opacity="0.4" />
      <path d="M 230 680 C 230 715, 570 715, 570 680 L 590 300 L 210 300 Z" fill="url(#bag-body)" />
      <path d="M 230 680 C 230 715, 570 715, 570 680 L 590 300 L 210 300 Z" fill="url(#bag-highlight)" />
      <polygon points="210,300 590,300 575,210 225,210" fill="#24140E" />
      <line x1="225" y1="230" x2="575" y2="230" stroke="#4E342E" stroke-width="3" />
      <line x1="222" y1="245" x2="578" y2="245" stroke="#1A0D08" stroke-width="2" />
      <line x1="220" y1="260" x2="580" y2="260" stroke="#4E342E" stroke-width="2" />
      <rect x="280" y="340" width="240" height="300" rx="12" fill="#FFFDF9" stroke="url(#gold-foil)" stroke-width="4" />
      <rect x="290" y="350" width="220" height="280" rx="8" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-dasharray="4 3" />
      <circle cx="400" cy="400" r="28" fill="url(#gold-foil)" opacity="0.9" />
      <path d="M 390 400 L 397 407 L 412 392" stroke="#2D1A15" stroke-width="3" fill="none" />
      <text x="400" y="455" text-anchor="middle" font-family="Playfair Display, serif" font-size="20" font-weight="700" fill="#2D1A15" letter-spacing="2">ESTATE RESERVE</text>
      <line x1="330" y1="472" x2="470" y2="472" stroke="#D4AF37" stroke-width="1.5" />
      <text x="400" y="498" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#5D4037" letter-spacing="3">SINGLE ORIGIN</text>
      <text x="400" y="535" text-anchor="middle" font-family="Playfair Display, serif" font-size="16" font-style="italic" fill="#8D6E63">Yirgacheffe, Ethiopia</text>
      <rect x="340" y="560" width="120" height="28" rx="14" fill="#2D1A15" />
      <text x="400" y="579" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="700" fill="#FFFDF9" letter-spacing="1.5">WHOLE BEAN</text>
      <g transform="translate(190, 670) rotate(-20)">
        <ellipse cx="20" cy="20" rx="22" ry="14" fill="#3E2723" stroke="#1B0F0B" stroke-width="1.5" />
        <path d="M 8 20 C 14 14, 26 26, 32 20" stroke="#1B0F0B" stroke-width="2.5" fill="none" />
      </g>
      <g transform="translate(560, 680) rotate(25)">
        <ellipse cx="20" cy="20" rx="20" ry="13" fill="#4E342E" stroke="#1B0F0B" stroke-width="1.5" />
        <path d="M 9 20 C 14 15, 25 25, 31 20" stroke="#1B0F0B" stroke-width="2.5" fill="none" />
      </g>
    </g>
  </svg>`;
}

function createSneakersCutoutSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
      <linearGradient id="sneaker-body" x1="0%" y1="0%" x2="100%" y2="80%">
        <stop offset="0%" stop-color="#FF3D00" />
        <stop offset="40%" stop-color="#FF6E40" />
        <stop offset="85%" stop-color="#212121" />
        <stop offset="100%" stop-color="#000000" />
      </linearGradient>
      <linearGradient id="sole-foam" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F5F5F5" />
        <stop offset="60%" stop-color="#EEEEEE" />
        <stop offset="100%" stop-color="#D6D6D6" />
      </linearGradient>
      <linearGradient id="swoosh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#EEFF41" />
        <stop offset="100%" stop-color="#76FF03" />
      </linearGradient>
      <filter id="sneaker-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#000000" flood-opacity="0.5" />
      </filter>
    </defs>
    <g filter="url(#sneaker-shadow)" transform="translate(40, 20) rotate(-6 400 400)">
      <ellipse cx="380" cy="580" rx="310" ry="24" fill="#000000" opacity="0.38" />
      <path d="M 120 480 C 140 450, 210 470, 260 480 C 350 495, 460 495, 540 460 C 600 435, 680 435, 710 470 C 720 485, 715 520, 680 535 C 600 560, 480 565, 360 565 C 230 565, 140 550, 110 520 C 100 500, 105 485, 120 480 Z" fill="url(#sole-foam)" stroke="#BDBDBD" stroke-width="2" />
      <path d="M 110 520 C 160 555, 300 570, 420 570 C 560 570, 660 550, 690 525 L 680 540 C 620 570, 490 578, 380 578 C 240 578, 140 562, 105 530 Z" fill="#212121" />
      <path d="M 125 480 C 145 420, 220 370, 310 375 C 380 380, 420 320, 480 300 C 530 285, 570 310, 560 365 C 550 410, 580 430, 680 440 C 705 445, 715 465, 700 480 C 640 460, 560 470, 480 485 C 360 500, 240 490, 125 480 Z" fill="url(#sneaker-body)" />
      <path d="M 470 305 C 495 275, 545 280, 555 330 C 540 330, 500 325, 470 305 Z" fill="#424242" />
      <path d="M 545 285 L 560 260 L 575 290 Z" fill="#FF3D00" />
      <path d="M 230 455 C 320 450, 440 390, 540 360 C 560 355, 570 365, 540 380 C 420 425, 310 480, 230 475 C 210 475, 210 455, 230 455 Z" fill="url(#swoosh-grad)" />
      <line x1="390" y1="365" x2="430" y2="335" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
      <line x1="410" y1="380" x2="450" y2="350" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
      <line x1="430" y1="395" x2="470" y2="365" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
      <line x1="450" y1="410" x2="490" y2="380" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    </g>
  </svg>`;
}

function createHeadphonesCutoutSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
      <linearGradient id="hp-metal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E0E0E0" />
        <stop offset="50%" stop-color="#9E9E9E" />
        <stop offset="100%" stop-color="#616161" />
      </linearGradient>
      <linearGradient id="hp-cup" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#263238" />
        <stop offset="60%" stop-color="#1A2226" />
        <stop offset="100%" stop-color="#0D1214" />
      </linearGradient>
      <radialGradient id="hp-accent-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#00E5FF" stop-opacity="0" />
      </radialGradient>
      <filter id="hp-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000000" flood-opacity="0.55" />
      </filter>
    </defs>
    <g filter="url(#hp-shadow)" transform="translate(0, 30)">
      <path d="M 230 460 C 210 240, 590 240, 570 460" fill="none" stroke="url(#hp-metal)" stroke-width="26" stroke-linecap="round" />
      <path d="M 270 380 C 270 260, 530 260, 530 380" fill="none" stroke="#212121" stroke-width="36" stroke-linecap="round" />
      <g transform="translate(140, 400)">
        <rect x="50" y="20" width="46" height="180" rx="23" fill="#121212" stroke="#2C3437" stroke-width="2" />
        <rect x="0" y="30" width="56" height="160" rx="28" fill="url(#hp-cup)" stroke="url(#hp-metal)" stroke-width="3" />
        <circle cx="28" cy="110" r="22" fill="none" stroke="#00E5FF" stroke-width="2" opacity="0.8" />
        <circle cx="28" cy="110" r="22" fill="url(#hp-accent-glow)" />
        <circle cx="28" cy="110" r="4" fill="#00E5FF" />
      </g>
      <g transform="translate(560, 400)">
        <rect x="0" y="20" width="46" height="180" rx="23" fill="#121212" stroke="#2C3437" stroke-width="2" />
        <rect x="40" y="30" width="56" height="160" rx="28" fill="url(#hp-cup)" stroke="url(#hp-metal)" stroke-width="3" />
        <circle cx="68" cy="110" r="22" fill="none" stroke="#00E5FF" stroke-width="2" opacity="0.8" />
        <circle cx="68" cy="110" r="22" fill="url(#hp-accent-glow)" />
        <circle cx="68" cy="110" r="4" fill="#00E5FF" />
      </g>
      <rect x="205" y="420" width="28" height="34" rx="4" fill="url(#hp-metal)" />
      <rect x="567" y="420" width="28" height="34" rx="4" fill="url(#hp-metal)" />
    </g>
  </svg>`;
}

function createPerfumeCutoutSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <defs>
      <linearGradient id="perfume-amber" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFB300" />
        <stop offset="40%" stop-color="#FF8F00" />
        <stop offset="80%" stop-color="#E65100" />
        <stop offset="100%" stop-color="#BF360C" />
      </linearGradient>
      <linearGradient id="perfume-glass" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
        <stop offset="25%" stop-color="#ffffff" stop-opacity="0.1" />
        <stop offset="70%" stop-color="#ffffff" stop-opacity="0.05" />
        <stop offset="90%" stop-color="#ffffff" stop-opacity="0.35" />
      </linearGradient>
      <linearGradient id="perfume-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFD54F" />
        <stop offset="45%" stop-color="#FFF9C4" />
        <stop offset="70%" stop-color="#FFB300" />
        <stop offset="100%" stop-color="#FFA000" />
      </linearGradient>
      <filter id="perfume-shadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#000000" flood-opacity="0.45" />
      </filter>
    </defs>
    <g filter="url(#perfume-shadow)">
      <ellipse cx="400" cy="710" rx="190" ry="24" fill="#000000" opacity="0.35" />
      <polygon points="340,160 460,160 480,240 320,240" fill="#1A1A1A" stroke="#424242" stroke-width="2" />
      <polygon points="345,165 455,165 445,235 355,235" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.35" />
      <rect x="360" y="240" width="80" height="40" rx="4" fill="url(#perfume-gold)" stroke="#B78103" stroke-width="1.5" />
      <line x1="365" y1="252" x2="435" y2="252" stroke="#ffffff" stroke-width="1.5" opacity="0.7" />
      <rect x="260" y="280" width="280" height="400" rx="20" fill="url(#perfume-glass)" stroke="#ffffff" stroke-width="4" stroke-opacity="0.7" />
      <rect x="285" y="325" width="230" height="325" rx="12" fill="url(#perfume-amber)" />
      <ellipse cx="400" cy="330" rx="110" ry="12" fill="#FFE082" opacity="0.6" />
      <rect x="260" y="650" width="280" height="30" rx="10" fill="#ffffff" opacity="0.25" />
      <line x1="280" y1="295" x2="280" y2="665" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      <line x1="520" y1="295" x2="520" y2="665" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.4" />
      <rect x="315" y="420" width="170" height="150" rx="6" fill="#111111" stroke="url(#perfume-gold)" stroke-width="2.5" />
      <rect x="323" y="428" width="154" height="134" rx="4" fill="none" stroke="#D4AF37" stroke-width="1" stroke-dasharray="3 2" />
      <text x="400" y="468" text-anchor="middle" font-family="Cinzel, Playfair Display, serif" font-size="16" font-weight="700" fill="#FFF8E1" letter-spacing="3">SOLEIL</text>
      <text x="400" y="492" text-anchor="middle" font-family="Cinzel, Playfair Display, serif" font-size="14" font-weight="400" fill="#D4AF37" letter-spacing="4">AMBRÉ</text>
      <line x1="355" y1="508" x2="445" y2="508" stroke="#D4AF37" stroke-width="1" />
      <text x="400" y="534" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="600" fill="#FFE082" letter-spacing="2.5">EAU DE PARFUM</text>
      <text x="400" y="548" text-anchor="middle" font-family="Inter, sans-serif" font-size="8" fill="#BDBDBD" letter-spacing="1">100 ML • PARIS</text>
    </g>
  </svg>`;
}

async function prepareCutouts(sharpRenderer: DefaultSharpRenderer): Promise<Record<string, string>> {
  fs.mkdirSync(CUTOUTS_DIR, { recursive: true });

  const cutouts: Record<string, string> = {
    'coffee': createCoffeeCutoutSvg(),
    'sneakers': createSneakersCutoutSvg(),
    'headphones': createHeadphonesCutoutSvg(),
    'perfume': createPerfumeCutoutSvg(),
  };

  const dataUris: Record<string, string> = {};

  for (const [key, svg] of Object.entries(cutouts)) {
    const pngPath = path.join(CUTOUTS_DIR, `${key}.png`);
    const pngBuffer = await sharpRenderer.renderPng(svg, { transparentBackground: true });
    fs.writeFileSync(pngPath, pngBuffer);
    dataUris[key] = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    console.log(`[Cutout Ready] ${key}: ${pngPath} (${pngBuffer.length} bytes)`);
  }

  return dataUris;
}

interface FixtureConfig {
  name: string;
  category: string;
  productName: string;
  headline: string;
  description: string;
  price: string;
  cta: string;
  tone: string;
  campaign: string;
  industryPack: string;
  tags: string[];
  cutoutKey: 'coffee' | 'sneakers' | 'headphones' | 'perfume';
}

const FIXTURES: FixtureConfig[] = [
  {
    name: 'coffee-editorial-luxury',
    category: 'Coffee',
    productName: 'Reserve Estate Single Origin Coffee',
    headline: 'Notes of Fig & Dark Cocoa',
    description: 'Direct trade small-batch Ethiopian Yirgacheffe, roasted to perfection.',
    price: '$28',
    cta: 'Taste The Roast',
    tone: 'Luxury',
    campaign: 'Premium',
    industryPack: 'Coffee',
    tags: ['coffee', 'espresso', 'roast', 'luxury'],
    cutoutKey: 'coffee',
  },
  {
    name: 'sneakers-bold-campaign',
    category: 'Shoes',
    productName: 'Apex Velocity Pro Running Shoes',
    headline: 'Unstoppable Momentum',
    description: 'Precision carbon-plated road racing shoe built for maximum energy return.',
    price: '$180',
    cta: 'Claim Your Pair',
    tone: 'Bold',
    campaign: 'New Arrival',
    industryPack: 'Fitness',
    tags: ['sneakers', 'streetwear', 'running', 'sport'],
    cutoutKey: 'sneakers',
  },
  {
    name: 'headphones-modern-minimal',
    category: 'Electronics',
    productName: 'Acoustic One Studio Wireless Headphones',
    headline: 'Purity in Every Frequency',
    description: 'Custom 40mm beryllium dynamic drivers with 42-hour battery life.',
    price: '$299',
    cta: 'Explore Sound',
    tone: 'Minimal',
    campaign: 'Exclusive',
    industryPack: 'Electronics',
    tags: ['headphones', 'audio', 'technology', 'minimal'],
    cutoutKey: 'headphones',
  },
  {
    name: 'perfume-editorial-luxury',
    category: 'Perfume',
    productName: 'Soleil Ambré Eau de Parfum',
    headline: 'Sun-Drenched Amber & Vetiver',
    description: 'A timeless artisanal olfactory harmony bottled in sustainable French glass.',
    price: '$145',
    cta: 'Discover Fragrance',
    tone: 'Luxury',
    campaign: 'Exclusive',
    industryPack: 'Luxury',
    tags: ['perfume', 'fragrance', 'luxury', 'beauty'],
    cutoutKey: 'perfume',
  },
];

const SIZES: Array<{ id: 'square' | 'portrait'; label: string; dimensions: PosterDimensions }> = [
  { id: 'square', label: 'Square', dimensions: { width: 1080, height: 1080, unit: 'px' } },
  { id: 'portrait', label: 'Portrait', dimensions: { width: 1080, height: 1350, unit: 'px' } },
];

async function runVisualAudit(): Promise<void> {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const composer = new PosterDesignComposer();
  const adapter = new PosterV2RendererAdapter();
  const sharpRenderer = new DefaultSharpRenderer();

  console.log(`\n========================================`);
  console.log(`Generating Transparent Product Cutouts`);
  console.log(`========================================\n`);
  const cutoutDataUris = await prepareCutouts(sharpRenderer);

  console.log(`\n========================================`);
  console.log(`Generating Renderer V2 Visual Audit Fixtures`);
  console.log(`Output Directory: ${OUTPUT_DIR}`);
  console.log(`========================================\n`);

  const results: Array<{
    fixture: string;
    size: string;
    compositionMode: string;
    typographyPersonality: string;
    productBacking: string;
    svgPath: string;
    pngPath: string;
    svgBytes: number;
    pngBytes: number;
  }> = [];

  for (const fixture of FIXTURES) {
    const imageUrl = cutoutDataUris[fixture.cutoutKey] || '';

    for (const size of SIZES) {
      const posterData: PosterData = {
        product: {
          name: fixture.productName,
          category: fixture.category,
          description: fixture.description,
          image: {
            url: imageUrl,
            altText: fixture.productName,
          },
        },
        headline: fixture.headline,
        description: fixture.description,
        price: {
          amount: parseFloat(fixture.price.replace(/[^0-9.]/g, '')),
          currency: 'USD',
          formatted: fixture.price,
        },
        cta: fixture.cta,
        metadata: {
          campaign: fixture.campaign,
          tone: fixture.tone,
          industryPack: fixture.industryPack,
        },
      };

      const designDecision = composer.compose({
        productTitle: fixture.productName,
        productCategory: fixture.category,
        posterSize: size.id,
        campaign: fixture.campaign,
        tone: fixture.tone,
        industryPack: fixture.industryPack,
        tags: fixture.tags,
      });

      const v2Input = adapter.toRendererV2Input({
        posterData,
        posterDesignDecision: designDecision,
        canvas: size.dimensions,
      });

      const template = v2Input.template;
      const svg = adapter.render({
        posterData,
        posterDesignDecision: designDecision,
        canvas: size.dimensions,
      });

      const baseName = `${fixture.name}-${size.id}`;
      const svgPath = path.join(OUTPUT_DIR, `${baseName}.svg`);
      const pngPath = path.join(OUTPUT_DIR, `${baseName}.png`);

      fs.writeFileSync(svgPath, svg, 'utf8');

      // Rasterize via Sharp
      const pngBuffer = await sharpRenderer.renderPng(svg);
      fs.writeFileSync(pngPath, pngBuffer);

      const result = {
        fixture: fixture.name,
        size: size.id,
        compositionMode: template?.compositionMode ?? 'default',
        typographyPersonality: template?.typographyPersonality ?? 'default',
        productBacking: template?.productBacking ?? 'none',
        svgPath,
        pngPath,
        svgBytes: Buffer.byteLength(svg, 'utf8'),
        pngBytes: pngBuffer.length,
      };

      results.push(result);

      console.log(`[OK] ${baseName}:`);
      console.log(`     Template: ${template?.templateId} (${template?.collection})`);
      console.log(`     Composition: ${result.compositionMode}, Typography: ${result.typographyPersonality}, Backing: ${result.productBacking}`);
      console.log(`     SVG: ${result.svgBytes} bytes | PNG: ${result.pngBytes} bytes`);
      console.log(`     Saved: ${pngPath}\n`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Successfully generated and rasterized all ${results.length} visual fixtures!`);
  console.log(`========================================\n`);
}

runVisualAudit().catch((err) => {
  console.error('Visual Audit Generation Failed:', err);
  process.exit(1);
});
