import { TextStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface DiscountBadgeProps {
  dataKey: 'promotion.discountText' | 'promotion.discountPercent';
  prefix?: string;
  suffix?: string;
  textStyle?: TextStyle;
}

export class DiscountBadgeComponent extends BasePosterComponent<DiscountBadgeProps> {
  public constructor(
    config: Omit<PosterComponentConfig<DiscountBadgeProps>, 'type'>
  ) {
    super({ ...config, type: 'discount_badge' });
  }
}
