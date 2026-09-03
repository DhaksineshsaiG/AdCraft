import {
  PosterComponent,
  PosterComponentConfig,
  PosterComponentType,
} from './component.types';

export abstract class BasePosterComponent<TProps extends object>
  implements PosterComponent<TProps> {
  public readonly id: string;
  public readonly type: PosterComponentType;
  public readonly config: PosterComponentConfig<TProps>;

  protected constructor(config: PosterComponentConfig<TProps>) {
    this.id = config.id;
    this.type = config.type;
    this.config = {
      ...config,
      visible: config.visible ?? true,
      required: config.required ?? false,
    };
  }

  public isVisible(): boolean {
    return this.config.visible !== false;
  }

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.id.trim()) {
      errors.push('Component id is required.');
    }

    if (this.config.bounds.width <= 0 || this.config.bounds.height <= 0) {
      errors.push(`Component "${this.id}" must have positive width and height.`);
    }

    if (!Number.isFinite(this.config.zIndex)) {
      errors.push(`Component "${this.id}" must have a finite zIndex.`);
    }

    return errors;
  }

  public toJSON(): PosterComponentConfig<TProps> {
    return this.config;
  }
}
