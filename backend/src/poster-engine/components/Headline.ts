import { TextStyle } from '../types/style';
import { BasePosterComponent } from './BasePosterComponent';
import { PosterComponentConfig } from './component.types';

export interface HeadlineProps {
  dataKey: 'headline';
  maxLines?: number;
  textStyle?: TextStyle;
}

export class HeadlineComponent extends BasePosterComponent<HeadlineProps> {
  public constructor(
    config: Omit<PosterComponentConfig<HeadlineProps>, 'type'>
  ) {
    super({ ...config, type: 'headline' });
  }
}
