import { ImageStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface ProductImageProps {
  dataKey: 'product.image';
  style?: ImageStyle;
  fallbackImageUrl?: string;
}

export class ProductImageComponent extends BasePosterComponent<ProductImageProps> {
  public constructor(
    config: Omit<PosterComponentConfig<ProductImageProps>, 'type'>
  ) {
    super({ ...config, type: 'product_image' });
  }
}
