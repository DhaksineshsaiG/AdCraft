import { TextStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface PriceProps {
  dataKey: 'price';
  showCompareAtPrice?: boolean;
  textStyle?: TextStyle;
  compareAtTextStyle?: TextStyle;
}

export class PriceComponent extends BasePosterComponent<PriceProps> {
  public constructor(
    config: Omit<PosterComponentConfig<PriceProps>, 'type'>
  ) {
    super({ ...config, type: 'price' });
  }
}
