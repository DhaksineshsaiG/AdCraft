import { TextStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface FooterProps {
  dataKey: 'footer';
  textStyle?: TextStyle;
}

export class FooterComponent extends BasePosterComponent<FooterProps> {
  public constructor(
    config: Omit<PosterComponentConfig<FooterProps>, 'type'>
  ) {
    super({ ...config, type: 'footer' });
  }
}
