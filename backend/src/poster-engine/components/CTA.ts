import { TextStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface CTAProps {
  dataKey: 'cta';
  defaultText?: string;
  textStyle?: TextStyle;
}

export class CTAComponent extends BasePosterComponent<CTAProps> {
  public constructor(
    config: Omit<PosterComponentConfig<CTAProps>, 'type'>
  ) {
    super({ ...config, type: 'cta' });
  }
}
