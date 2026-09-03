import { PosterLayoutItem } from '../../layout';
import { SvgBuildContext } from '../SvgBuilder.types';
import { renderImageSvg } from './image.svg';

export function renderLogoSvg(item: PosterLayoutItem, context: SvgBuildContext): string {
  return renderImageSvg(item, context);
}
