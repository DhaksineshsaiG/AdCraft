import { PosterLayoutItem } from '../../layout';
import { SvgBuildContext } from '../SvgBuilder.types';
import {
  dominantBaselineFor,
  escapeXml,
  formatNumber,
  textAnchorFor,
  textStyleAttributes,
  textXFor,
  textYFor,
  transformText,
} from '../helpers/svgUtils';

export function renderTextSvg(item: PosterLayoutItem, context: SvgBuildContext): string {
  if (!item.text?.text) {
    return '';
  }

  const clipId = context.createClipPath(item);
  const shadowId = context.createShadowFilter(item);
  const style = item.text.style;
  const fontSize = item.text.fontSize;
  const lineHeight = item.type === 'headline'
    ? style?.lineHeight ?? fontSize * 1.05
    : style?.lineHeight ?? fontSize * 1.2;
  const rawLines = item.text.lines.length > 0
    ? item.text.lines
    : transformText(item.text.text, style).split(/\r?\n/);
  const maxLines = item.text.maxLines ?? rawLines.length;
  const lines = rawLines.slice(0, maxLines);
  const x = textXFor(item);
  const y = textYFor(item, lineHeight, lines.length);
  const attributes = [
    `x="${formatNumber(x)}"`,
    `y="${formatNumber(y)}"`,
    `text-anchor="${textAnchorFor(item)}"`,
    `dominant-baseline="${dominantBaselineFor(item)}"`,
    textStyleAttributes(style, fontSize),
    `clip-path="url(#${clipId})"`,
    shadowId ? `filter="url(#${shadowId})"` : '',
  ].filter(Boolean).join(' ');

  const tspans = lines.map((line, index) => {
    const dy = index === 0 ? 0 : lineHeight;
    return `<tspan x="${formatNumber(x)}" dy="${formatNumber(dy)}">${escapeXml(line)}</tspan>`;
  }).join('');

  return `<text ${attributes}>${tspans}</text>`;
}
