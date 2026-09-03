import { PosterLayoutItem } from '../../layout';
import { SvgBuildContext } from '../SvgBuilder.types';
import {
  escapeXml,
  formatNumber,
  getBackgroundGradient,
  getShadow,
  rectAttributes,
} from './svgUtils';

export function createClipPath(
  context: SvgBuildContext,
  item: PosterLayoutItem,
  inset: number = 0
): string {
  const id = context.nextId(`${item.componentId}-clip`);
  const bounds = {
    ...item.bounds,
    x: item.bounds.x + inset,
    y: item.bounds.y + inset,
    width: Math.max(0, item.bounds.width - inset * 2),
    height: Math.max(0, item.bounds.height - inset * 2),
  };

  context.defs.push(`<clipPath id="${id}"><rect ${rectAttributes(bounds)} /></clipPath>`);
  return id;
}

export function createShadowFilter(
  context: SvgBuildContext,
  item: PosterLayoutItem
): string | undefined {
  const shadow = getShadow(item);

  if (!shadow) {
    return undefined;
  }

  const id = context.nextId(`${item.componentId}-shadow`);
  const dx = shadow.dx ?? 0;
  const dy = shadow.dy ?? 4;
  const blur = shadow.blur ?? 12;
  const color = shadow.color ?? '#000000';
  const opacity = shadow.opacity ?? 0.25;

  context.defs.push(
    [
      `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">`,
      `<feDropShadow dx="${formatNumber(dx)}" dy="${formatNumber(dy)}" stdDeviation="${formatNumber(blur / 2)}" flood-color="${escapeXml(color)}" flood-opacity="${formatNumber(opacity)}" />`,
      '</filter>',
    ].join('')
  );

  return id;
}

export function createGradient(
  context: SvgBuildContext,
  item: PosterLayoutItem
): string | undefined {
  const gradient = getBackgroundGradient(item);

  if (!gradient) {
    return undefined;
  }

  const id = context.nextId(`${item.componentId}-gradient`);
  const stops = gradient.colors.map((color, index) => {
    const offset = gradient.colors.length === 1
      ? 0
      : (index / (gradient.colors.length - 1)) * 100;

    return `<stop offset="${formatNumber(offset)}%" stop-color="${escapeXml(color)}" />`;
  }).join('');

  if (gradient.type === 'radial') {
    context.defs.push(`<radialGradient id="${id}" cx="50%" cy="50%" r="70%">${stops}</radialGradient>`);
    return id;
  }

  const angle = gradient.angle ?? 0;
  const radians = (angle - 90) * (Math.PI / 180);
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  const x1 = formatNumber(50 - x * 50);
  const y1 = formatNumber(50 - y * 50);
  const x2 = formatNumber(50 + x * 50);
  const y2 = formatNumber(50 + y * 50);

  context.defs.push(
    `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`
  );

  return id;
}
