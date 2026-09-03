import { PosterLayoutItem } from '../../layout';
import { SvgBuildContext } from '../SvgBuilder.types';
import { renderTextSvg } from './text.svg';

export function renderFooterSvg(item: PosterLayoutItem, context: SvgBuildContext): string {
  return renderTextSvg(item, context);
}
