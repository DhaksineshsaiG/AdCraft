import { randomInt } from 'crypto';
import { PosterData } from '../types/data';
import { PosterDimensions } from '../types/geometry';
import {
  CanvasOrientation,
  CompositionBlueprint,
  CompositionCategory,
  CompositionSelection,
  CompositionStrategy,
  PosterCompositionEngine,
} from './CompositionBlueprint';
import { BLUEPRINTS_BY_CATEGORY } from './blueprints';

export type CompositionRandomSource = (maximumExclusive: number) => number;

export class CategoryCompositionStrategy implements CompositionStrategy {
  public constructor(
    public readonly category: CompositionCategory,
    public readonly blueprints: readonly CompositionBlueprint[]
  ) {
    if (blueprints.length === 0) {
      throw new Error(`Composition category "${category}" requires at least one blueprint.`);
    }
  }
}

export class DefaultCompositionEngine implements PosterCompositionEngine {
  private readonly strategies: ReadonlyMap<CompositionCategory, CompositionStrategy>;
  private readonly recentBlueprintsByProduct = new Map<string, string[]>();

  public constructor(
    strategies: readonly CompositionStrategy[] = createDefaultStrategies(),
    private readonly random: CompositionRandomSource = (maximum) => randomInt(maximum)
  ) {
    this.strategies = new Map(strategies.map((strategy) => [strategy.category, strategy]));
  }

  public select(data: PosterData, canvas: PosterDimensions): CompositionSelection {
    const category = resolveCompositionCategory(data);
    const strategy = this.strategies.get(category) ?? this.strategies.get('general');

    if (!strategy) {
      throw new Error('No general poster composition strategy is registered.');
    }

    const productKey = data.product.id || data.product.name;
    const recentBlueprintIds = this.recentBlueprintsByProduct.get(productKey) ?? [];
    const candidates = strategy.blueprints.filter(
      (blueprint) => !recentBlueprintIds.includes(blueprint.id)
    );
    const pool = candidates.length > 0 ? candidates : strategy.blueprints;
    const blueprint = pool[this.random(pool.length)] ?? pool[0];

    if (!blueprint) {
      throw new Error(`No poster composition blueprint is available for "${category}".`);
    }

    this.recentBlueprintsByProduct.set(
      productKey,
      [blueprint.id, ...recentBlueprintIds.filter((id) => id !== blueprint.id)].slice(0, 3)
    );

    return {
      blueprint,
      category,
      orientation: resolveCanvasOrientation(canvas),
    };
  }
}

export function createDefaultStrategies(): CompositionStrategy[] {
  return Object.entries(BLUEPRINTS_BY_CATEGORY).map(
    ([category, blueprints]) =>
      new CategoryCompositionStrategy(category as CompositionCategory, blueprints)
  );
}

export function resolveCompositionCategory(data: PosterData): CompositionCategory {
  const theme = String(data.metadata?.['theme'] ?? '').toLowerCase();
  const byTheme: Partial<Record<string, CompositionCategory>> = {
    tech: 'technology',
    sports: 'sports',
    coffee: 'coffee',
    fragrance: 'fragrance',
    luxury: 'fragrance',
    fashion: 'fashion',
    interior: 'interior',
  };

  if (byTheme[theme]) {
    return byTheme[theme]!;
  }

  const context = [
    data.product.category,
    data.product.vendor,
    data.product.name,
    data.product.description,
  ].filter(Boolean).join(' ').toLowerCase();
  const classifiers: readonly [RegExp, CompositionCategory][] = [
    [/phone|smartphone|electronic|laptop|tablet|device|tech|camera|audio/, 'technology'],
    [/shoe|sneaker|sport|fitness|running|training|athletic/, 'sports'],
    [/coffee|espresso|cafe|mug|tea|drinkware|roast|ceramic/, 'coffee'],
    [/perfume|fragrance|cologne|eau de|scent|parfum/, 'fragrance'],
    [/fashion|apparel|clothing|jewelry|accessor|handbag|beauty/, 'fashion'],
    [/furniture|chair|sofa|table|lamp|interior|decor|home furnishing/, 'interior'],
  ];

  return classifiers.find(([pattern]) => pattern.test(context))?.[1] ?? 'general';
}

export function resolveCanvasOrientation(canvas: PosterDimensions): CanvasOrientation {
  if (canvas.height / canvas.width > 1.15) return 'portrait';
  if (canvas.width / canvas.height > 1.35) return 'landscape';
  return 'square';
}
