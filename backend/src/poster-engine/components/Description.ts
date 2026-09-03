import { TextStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface DescriptionProps {
  dataKey: 'description';
  maxLines?: number;
  textStyle?: TextStyle;
}

export class DescriptionComponent extends BasePosterComponent<DescriptionProps> {
  public constructor(
    config: Omit<PosterComponentConfig<DescriptionProps>, 'type'>
  ) {
    super({ ...config, type: 'description' });
  }
}
