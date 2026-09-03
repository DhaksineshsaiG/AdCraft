import { PosterAlignment, PosterBounds } from '../types/geometry';
import { BoxStyle } from '../types/style';

export type PosterComponentType =
  | 'background'
  | 'product_image'
  | 'headline'
  | 'description'
  | 'price'
  | 'cta'
  | 'discount_badge'
  | 'logo'
  | 'footer';

export interface PosterComponentConfig<TProps extends object = Record<string, unknown>> {
  id: string;
  type: PosterComponentType;
  bounds: PosterBounds;
  zIndex: number;
  visible?: boolean;
  required?: boolean;
  alignment?: PosterAlignment;
  style?: BoxStyle;
  props: TProps;
}

export interface PosterComponent<TProps extends object = Record<string, unknown>> {
  readonly id: string;
  readonly type: PosterComponentType;
  readonly config: PosterComponentConfig<TProps>;
  isVisible(): boolean;
  validate(): string[];
  toJSON(): PosterComponentConfig<TProps>;
}
