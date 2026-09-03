import { BackgroundStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface BackgroundProps {
  style: BackgroundStyle;
}

export class BackgroundComponent extends BasePosterComponent<BackgroundProps> {
  public constructor(
    config: Omit<PosterComponentConfig<BackgroundProps>, 'type'>
  ) {
    super({ ...config, type: 'background' });
  }

  public override validate(): string[] {
    const errors = super.validate();
    const { backgroundColor, gradient, imageUrl } = this.config.props.style;

    if (!backgroundColor && !gradient && !imageUrl) {
      errors.push(`Background component "${this.id}" needs a color, gradient, or image.`);
    }

    return errors;
  }
}
