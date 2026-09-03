import type { PosterDesignDecision } from '../poster-intelligence/composer/PosterDesignTypes';
import type { Region } from './Canvas';
import { escapeSvg, formatNumber, rectAttrs, SVGBuilder } from './SVGBuilder';
import type { RendererTemplateProfile } from './templates/TemplateTypes';

export class BackgroundRenderer {
  render(decision: PosterDesignDecision, region: Region, builder: SVGBuilder, template?: RendererTemplateProfile): string {
    const baseGradientId = builder.nextId('renderer2-bg');
    const depthGradientId = builder.nextId('renderer2-depth');
    const radialLightId = builder.nextId('renderer2-light');
    const vignetteId = builder.nextId('renderer2-vignette');
    const textureId = builder.nextId('renderer2-texture');
    const particleOpacity = densityOpacity(decision.background.visualWeight) * (template?.gradientPreset.particleDensity ?? 1);
    const vignetteOpacity = Math.min(0.48, (decision.background.vignette / 55) * (template?.gradientPreset.vignetteStrength ?? 1));
    const noiseOpacity = Math.min(0.22, (decision.background.noise / 42) * (template?.gradientPreset.textureIntensity ?? 1));
    const lightOpacity = lightStrength(decision.background.lighting) * (template?.gradientPreset.lighting ?? 0.52) / 0.52;

    builder.addDef(
      `<linearGradient id="${baseGradientId}" ${gradientVector(template?.gradientPreset.direction ?? 'diagonal')}>` +
        gradientStops(decision, template) +
      `</linearGradient>`
    );
    builder.addDef(
      `<linearGradient id="${depthGradientId}" x1="0%" y1="100%" x2="100%" y2="0%">` +
        `<stop offset="0%" stop-color="${escapeSvg(decision.colors.shadow)}" stop-opacity="0.22" />` +
        `<stop offset="52%" stop-color="${escapeSvg(decision.colors.decorative)}" stop-opacity="0.08" />` +
        `<stop offset="100%" stop-color="${escapeSvg(decision.colors.accent)}" stop-opacity="0.16" />` +
      `</linearGradient>`
    );
    builder.addDef(
      `<radialGradient id="${radialLightId}" cx="${lightCenter(decision.background.lighting)}" cy="28%" r="68%">` +
        `<stop offset="0%" stop-color="${escapeSvg(decision.colors.decorative)}" stop-opacity="${formatNumber(lightOpacity)}" />` +
        `<stop offset="56%" stop-color="${escapeSvg(decision.colors.surface)}" stop-opacity="0.12" />` +
        `<stop offset="100%" stop-color="${escapeSvg(decision.colors.background)}" stop-opacity="0" />` +
      `</radialGradient>`
    );
    builder.addDef(
      `<radialGradient id="${vignetteId}" cx="50%" cy="50%" r="74%">` +
        `<stop offset="45%" stop-color="#000000" stop-opacity="0" />` +
        `<stop offset="100%" stop-color="${escapeSvg(decision.colors.shadow)}" stop-opacity="${formatNumber(vignetteOpacity)}" />` +
      `</radialGradient>`
    );
    builder.addDef(
      `<pattern id="${textureId}" width="48" height="48" patternUnits="userSpaceOnUse">` +
        `<path d="M0 47 L48 1 M-12 12 L12 -12 M36 60 L60 36" stroke="${escapeSvg(decision.colors.border)}" stroke-width="1" opacity="${formatNumber(noiseOpacity)}" />` +
        `<circle cx="11" cy="17" r="1.2" fill="${escapeSvg(decision.colors.decorative)}" opacity="${formatNumber(noiseOpacity * 0.85)}" />` +
        `<circle cx="35" cy="31" r="0.9" fill="${escapeSvg(decision.colors.accent)}" opacity="${formatNumber(noiseOpacity * 0.7)}" />` +
      `</pattern>`
    );

    return [
      `<g data-background="${escapeSvg(decision.background.themeId)}">`,
      `<rect ${rectAttrs(region)} fill="url(#${baseGradientId})" />`,
      `<rect ${rectAttrs(region)} fill="url(#${depthGradientId})" opacity="${formatNumber(depthOpacity(decision.background.depth) * (template?.gradientPreset.lighting ?? 0.52) / 0.52)}" />`,
      this.renderDepthLayers(decision, region, template),
      `<rect ${rectAttrs(region)} fill="url(#${radialLightId})" opacity="${formatNumber(0.58 + decision.background.blur / 55)}" />`,
      `<rect ${rectAttrs(region)} fill="url(#${textureId})" opacity="${formatNumber(textureOpacity(decision.background.texture, decision.background.noise))}" />`,
      this.renderParticles(decision, region, particleOpacity, template),
      `<rect ${rectAttrs(region)} fill="${escapeSvg(decision.colors.surface)}" opacity="${formatNumber(overlayOpacity(decision.background.overlay))}" />`,
      `<rect ${rectAttrs(region)} fill="url(#${vignetteId})" />`,
      `<rect ${rectAttrs(region)} fill="none" stroke="${escapeSvg(decision.colors.border)}" stroke-width="2" opacity="0.24" />`,
      `<metadata>${escapeSvg(JSON.stringify({
        theme: decision.background.themeId,
        texture: decision.background.texture,
        gradient: decision.background.gradient,
        lighting: decision.background.lighting,
        overlay: decision.background.overlay,
        atmosphere: decision.background.atmosphere,
      }))}</metadata>`,
      '</g>',
    ].join('');
  }

  private renderDepthLayers(decision: PosterDesignDecision, region: Region, template?: RendererTemplateProfile): string {
    const layerCount = decision.background.depth === 'immersive' || decision.background.depth === 'deep'
      ? 4
      : decision.background.depth === 'medium'
        ? 3
        : 2;

    return Array.from({ length: layerCount }, (_, index) => {
      const progress = (index + 1) / (layerCount + 1);
      const y = region.y + region.height * (0.18 + progress * 0.55);
      const width = region.width * (0.58 + progress * 0.34);
      const height = region.height * (0.14 + progress * 0.05);
      const x = region.x + region.width * (index % 2 === 0 ? -0.08 : 0.52 - progress * 0.15);

      return `<ellipse cx="${formatNumber(x + width / 2)}" cy="${formatNumber(y)}" rx="${formatNumber(width / 2)}" ry="${formatNumber(height / 2)}" fill="${escapeSvg(index % 2 === 0 ? decision.colors.decorative : decision.colors.accent)}" opacity="${formatNumber((0.035 + progress * 0.028) * (template?.decorationPreset.intensity ?? 1))}" />`;
    }).join('');
  }

  private renderParticles(decision: PosterDesignDecision, region: Region, opacity: number, template?: RendererTemplateProfile): string {
    const baseCount = decision.background.visualWeight === 'light' ? 8 : decision.background.visualWeight === 'cinematic' ? 22 : 14;
    const count = Math.max(4, Math.round(baseCount * (template?.gradientPreset.particleDensity ?? 1)));
    const particles = Array.from({ length: count }, (_, index) => {
      const x = region.x + region.width * (((index * 37) % 100) / 100);
      const y = region.y + region.height * (((index * 61 + 17) % 100) / 100);
      const radius = 1.3 + (index % 5) * 0.75;
      const color = index % 3 === 0 ? decision.colors.accent : decision.colors.decorative;

      return `<circle cx="${formatNumber(x)}" cy="${formatNumber(y)}" r="${formatNumber(radius)}" fill="${escapeSvg(color)}" opacity="${formatNumber(opacity * (0.45 + (index % 4) * 0.12))}" />`;
    }).join('');

    return `<g data-background-particles="${escapeSvg(decision.background.atmosphere)}">${particles}</g>`;
  }
}

function lightCenter(lighting: string): string {
  if (lighting === 'rim' || lighting === 'neon') return '72%';
  if (lighting === 'window' || lighting === 'golden') return '28%';
  return '58%';
}

function lightStrength(lighting: string): number {
  if (lighting === 'dramatic' || lighting === 'neon') return 0.52;
  if (lighting === 'rim' || lighting === 'golden') return 0.46;
  if (lighting === 'flat') return 0.18;
  return 0.34;
}

function depthOpacity(depth: string): number {
  if (depth === 'immersive' || depth === 'deep') return 0.7;
  if (depth === 'medium') return 0.52;
  if (depth === 'shallow') return 0.36;
  return 0.22;
}

function densityOpacity(visualWeight: string): number {
  if (visualWeight === 'cinematic' || visualWeight === 'bold') return 0.22;
  if (visualWeight === 'rich') return 0.16;
  if (visualWeight === 'light') return 0.07;
  return 0.12;
}

function textureOpacity(texture: string, noise: number): number {
  const base = texture === 'none' || texture === 'clean' ? 0.04 : 0.16;
  return Math.min(0.3, base + noise / 120);
}

function overlayOpacity(overlay: string): number {
  if (overlay === 'none') return 0;
  if (overlay.includes('strong')) return 0.12;
  if (overlay.includes('soft')) return 0.06;
  return 0.08;
}

function gradientVector(direction: string): string {
  if (direction === 'horizontal') return 'x1="0%" y1="50%" x2="100%" y2="50%"';
  if (direction === 'vertical') return 'x1="50%" y1="0%" x2="50%" y2="100%"';
  if (direction === 'spotlight' || direction === 'radial') return 'x1="20%" y1="0%" x2="100%" y2="100%"';
  return 'x1="0%" y1="0%" x2="100%" y2="100%"';
}

function gradientStops(decision: PosterDesignDecision, template?: RendererTemplateProfile): string {
  if (!template) {
    return [
      `<stop offset="0%" stop-color="${escapeSvg(decision.colors.background)}" />`,
      `<stop offset="48%" stop-color="${escapeSvg(decision.colors.surface)}" />`,
      `<stop offset="100%" stop-color="${escapeSvg(decision.colors.background)}" />`,
    ].join('');
  }

  return template.gradientPreset.stops.map((stop) =>
    `<stop offset="${formatNumber(stop.offset)}%" stop-color="${escapeSvg(colorToken(decision, stop.token))}" stop-opacity="${formatNumber(stop.opacity)}" />`
  ).join('');
}

function colorToken(decision: PosterDesignDecision, token: string): string {
  if (token === 'surface') return decision.colors.surface;
  if (token === 'accent') return decision.colors.accent;
  if (token === 'decorative') return decision.colors.decorative;
  if (token === 'shadow') return decision.colors.shadow;
  return decision.colors.background;
}

export default BackgroundRenderer;
