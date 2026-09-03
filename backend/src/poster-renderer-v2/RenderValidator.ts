import type { CanvasSize, Region } from './Canvas';
import type { RendererRegions } from './LayoutManager';

export type RenderValidationSeverity = 'warning' | 'error';

export interface RenderValidationIssue {
  code: string;
  message: string;
  severity: RenderValidationSeverity;
}

export interface RenderValidationResult {
  valid: boolean;
  issues: RenderValidationIssue[];
}

export class RenderValidator {
  validateRegions(size: CanvasSize, regions: RendererRegions): RenderValidationResult {
    const issues: RenderValidationIssue[] = [];
    const canvasRegion = { x: 0, y: 0, width: size.width, height: size.height };
    const criticalRegions = [
      regions.headlineRegion,
      regions.descriptionRegion,
      regions.priceRegion,
      regions.ctaRegion,
    ].filter(hasArea);

    criticalRegions.forEach((region) => {
      if (!contains(canvasRegion, region)) {
        issues.push({
          code: 'TEXT_OUTSIDE_CANVAS',
          message: `${region.role ?? 'text'} region is outside the canvas`,
          severity: 'error',
        });
      }
    });

    if (!contains(canvasRegion, regions.imageRegion)) {
      issues.push({
        code: 'PRODUCT_CLIPPING',
        message: 'Product region extends outside the canvas',
        severity: 'error',
      });
    }

    const noOverlapPairs: Array<[Region, Region]> = [
      [regions.imageRegion, regions.headlineRegion],
      [regions.imageRegion, regions.descriptionRegion],
      [regions.imageRegion, regions.priceRegion],
      [regions.imageRegion, regions.ctaRegion],
      [regions.headlineRegion, regions.descriptionRegion],
      [regions.descriptionRegion, regions.priceRegion],
      [regions.priceRegion, regions.ctaRegion],
      [regions.descriptionRegion, regions.ctaRegion],
    ];

    noOverlapPairs.forEach(([a, b]) => {
      if (hasArea(a) && hasArea(b) && overlaps(a, b, 4)) {
        issues.push({
          code: 'REGION_OVERLAP',
          message: `${a.role ?? 'region'} overlaps ${b.role ?? 'region'}`,
          severity: 'error',
        });
      }
    });

    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
    };
  }

  validateSvg(svg: string): RenderValidationResult {
    const issues: RenderValidationIssue[] = [];

    if (!svg.startsWith('<svg ') || !svg.endsWith('</svg>')) {
      issues.push({
        code: 'INVALID_SVG_ROOT',
        message: 'SVG output must start with an svg root and end with a closing svg tag',
        severity: 'error',
      });
    }

    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      issues.push({
        code: 'DUPLICATE_SVG_ID',
        message: `Duplicate SVG IDs detected: ${Array.from(new Set(duplicates)).join(', ')}`,
        severity: 'error',
      });
    }

    const idSet = new Set(ids);
    const references = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
    const missingReferences = references.filter((id) => !idSet.has(id));
    if (missingReferences.length > 0) {
      issues.push({
        code: 'MISSING_SVG_DEF',
        message: `SVG references missing defs: ${Array.from(new Set(missingReferences)).join(', ')}`,
        severity: 'error',
      });
    }

    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
    };
  }

  assertValid(stage: string, result: RenderValidationResult): void {
    if (result.valid) return;

    const message = result.issues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join('; ');
    throw new Error(`Renderer V2 validation failed during ${stage}: ${message}`);
  }
}

function hasArea(region: Region): boolean {
  return region.width > 0 && region.height > 0;
}

function contains(container: Region, region: Region): boolean {
  return region.x >= container.x &&
    region.y >= container.y &&
    region.x + region.width <= container.x + container.width &&
    region.y + region.height <= container.y + container.height;
}

function overlaps(a: Region, b: Region, gap = 0): boolean {
  return a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y;
}

export default RenderValidator;
