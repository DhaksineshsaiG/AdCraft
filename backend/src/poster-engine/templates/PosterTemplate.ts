import { PosterComponent } from '../components';
import { PosterDimensions } from '../types/geometry';

export interface PosterTemplateContext {
  locale?: string;
  channel?: 'instagram' | 'facebook' | 'story' | 'print' | 'custom';
  tags?: string[];
}

export interface PosterTemplateValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PosterTemplate {
  id: string;
  name: string;
  version: string;
  description?: string;
  dimensions: PosterDimensions;
  components: PosterComponent[];
  metadata?: Record<string, unknown>;
  supports?(context: PosterTemplateContext): boolean;
  validate?(): PosterTemplateValidationResult;
}

export interface PosterTemplateFactory {
  readonly id: string;
  create(context?: PosterTemplateContext): PosterTemplate;
}

export interface PosterTemplateRegistry {
  register(factory: PosterTemplateFactory): void;
  get(templateId: string): PosterTemplateFactory | undefined;
  list(context?: PosterTemplateContext): PosterTemplateFactory[];
}

export class InMemoryPosterTemplateRegistry implements PosterTemplateRegistry {
  private readonly factories = new Map<string, PosterTemplateFactory>();

  public register(factory: PosterTemplateFactory): void {
    this.factories.set(factory.id, factory);
  }

  public get(templateId: string): PosterTemplateFactory | undefined {
    return this.factories.get(templateId);
  }

  public list(context?: PosterTemplateContext): PosterTemplateFactory[] {
    const factories = Array.from(this.factories.values());

    if (!context) {
      return factories;
    }

    return factories.filter((factory) => {
      const template = factory.create(context);
      return template.supports ? template.supports(context) : true;
    });
  }
}
