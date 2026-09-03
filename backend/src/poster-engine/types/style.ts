import { PosterSpacing } from './geometry';

export type ColorValue = string;

export type FontWeight =
  | 'light'
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | number;

export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none';

export interface TextStyle {
  color?: ColorValue;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface BoxStyle {
  backgroundColor?: ColorValue;
  borderColor?: ColorValue;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  padding?: PosterSpacing;
}

export interface ImageStyle extends BoxStyle {
  objectFit?: ObjectFit;
  objectPosition?: string;
}

export interface BackgroundStyle extends BoxStyle {
  gradient?: {
    type: 'linear' | 'radial';
    colors: ColorValue[];
    angle?: number;
  };
  imageUrl?: string;
}
