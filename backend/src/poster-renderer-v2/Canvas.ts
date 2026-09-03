import type { SafeMargins } from '../poster-intelligence/layout/LayoutTypes';

export interface CanvasSize {
  width: number;
  height: number;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
  role?: string;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  padding?: number;
  zIndex?: number;
}

export interface GridCell extends Region {
  row: number;
  column: number;
}

export class Canvas {
  public readonly width: number;

  public readonly height: number;

  public readonly safeMargins: SafeMargins;

  constructor(size: CanvasSize, safeMargins: SafeMargins) {
    this.width = size.width;
    this.height = size.height;
    this.safeMargins = safeMargins;
  }

  get aspectRatio(): number {
    return this.width / this.height;
  }

  get contentBounds(): Region {
    const left = this.percentX(this.safeMargins.left);
    const top = this.percentY(this.safeMargins.top);
    const right = this.percentX(this.safeMargins.right);
    const bottom = this.percentY(this.safeMargins.bottom);

    return {
      x: left,
      y: top,
      width: Math.max(1, this.width - left - right),
      height: Math.max(1, this.height - top - bottom),
    };
  }

  percentX(value: number): number {
    return Math.round(this.width * (value / 100));
  }

  percentY(value: number): number {
    return Math.round(this.height * (value / 100));
  }

  minDimension(percent: number): number {
    return Math.round(Math.min(this.width, this.height) * (percent / 100));
  }

  inset(region: Region, insetPercent: number): Region {
    const insetX = Math.round(region.width * (insetPercent / 100));
    const insetY = Math.round(region.height * (insetPercent / 100));

    return this.insetPx(region, Math.min(insetX, insetY));
  }

  insetPx(region: Region, inset: number): Region {
    return {
      ...region,
      x: region.x + inset,
      y: region.y + inset,
      width: Math.max(1, region.width - inset * 2),
      height: Math.max(1, region.height - inset * 2),
    };
  }

  pad(region: Region, padding: number): Region {
    return {
      ...this.insetPx(region, padding),
      padding,
    };
  }

  clampRegion(region: Region, bounds: Region = { x: 0, y: 0, width: this.width, height: this.height }): Region {
    const width = Math.min(region.width, bounds.width);
    const height = Math.min(region.height, bounds.height);

    return {
      ...region,
      width,
      height,
      x: Math.max(bounds.x, Math.min(region.x, bounds.x + bounds.width - width)),
      y: Math.max(bounds.y, Math.min(region.y, bounds.y + bounds.height - height)),
    };
  }

  alignWithin(
    bounds: Region,
    width: number,
    height: number,
    horizontal: 'left' | 'center' | 'right',
    vertical: 'top' | 'middle' | 'bottom',
    role?: string
  ): Region {
    const x = horizontal === 'left'
      ? bounds.x
      : horizontal === 'right'
        ? bounds.x + bounds.width - width
        : bounds.x + (bounds.width - width) / 2;
    const y = vertical === 'top'
      ? bounds.y
      : vertical === 'bottom'
        ? bounds.y + bounds.height - height
        : bounds.y + (bounds.height - height) / 2;

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      role,
      alignment: horizontal,
      verticalAlignment: vertical,
    };
  }

  centerOf(region: Region): { x: number; y: number } {
    return {
      x: region.x + region.width / 2,
      y: region.y + region.height / 2,
    };
  }

  grid(columns: number, rows: number, gap = 0, bounds: Region = this.contentBounds): GridCell[] {
    const cellWidth = (bounds.width - gap * Math.max(0, columns - 1)) / columns;
    const cellHeight = (bounds.height - gap * Math.max(0, rows - 1)) / rows;
    const cells: GridCell[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        cells.push({
          row,
          column,
          x: Math.round(bounds.x + column * (cellWidth + gap)),
          y: Math.round(bounds.y + row * (cellHeight + gap)),
          width: Math.round(cellWidth),
          height: Math.round(cellHeight),
        });
      }
    }

    return cells;
  }
}

export default Canvas;
