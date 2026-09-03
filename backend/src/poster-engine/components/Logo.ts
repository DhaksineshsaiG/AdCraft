import { ImageStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface LogoProps {
  dataKey: 'brand.logo';
  fallbackTextKey?: 'brand.name';
  style?: ImageStyle;
}

export class LogoComponent extends BasePosterComponent<LogoProps> {
  public constructor(
    config: Omit<PosterComponentConfig<LogoProps>, 'type'>
  ) {
    super({ ...config, type: 'logo' });
  }
}
