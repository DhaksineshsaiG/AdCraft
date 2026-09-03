export type MeasurementUnit = 'px' | 'percent';

export interface PosterDimensions {
  width: number;
  height: number;
  unit: 'px';
}

export interface PosterPoint {
  x: number;
  y: number;
  unit: MeasurementUnit;
}

export interface PosterSize {
  width: number;
  height: number;
  unit: MeasurementUnit;
}

export interface PosterBounds extends PosterPoint, PosterSize {}

export interface PosterSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: MeasurementUnit;
}

export type HorizontalAlignment = 'left' | 'center' | 'right';

export type VerticalAlignment = 'top' | 'middle' | 'bottom';

export interface PosterAlignment {
  horizontal: HorizontalAlignment;
  vertical: VerticalAlignment;
}
