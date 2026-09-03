import { PosterComponentType } from '../components';
import { PosterData, PosterImageData } from '../types/data';
import { PosterAlignment, PosterBounds, PosterDimensions } from '../types/geometry';
import { BoxStyle, ImageStyle, TextStyle } from '../types/style';
import type { PosterDesignDecision } from '../../poster-intelligence/composer/PosterDesignTypes';

export interface PosterLayoutOptions {
  canvas?: PosterDimensions;
  minHeadlineFontSize?: number;
  maxHeadlineFontSize?: number;
  posterDesignDecision?: PosterDesignDecision;
}

export interface CalculatedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'px';
}

export interface CalculatedTextLayout {
  text: string;
  lines: string[];
  fontSize: number;
  estimatedLines: number;
  maxLines?: number;
  style?: TextStyle;
}

export interface CalculatedImageLayout {
  image?: PosterImageData;
  renderedBounds: CalculatedBounds;
  preserveAspectRatio: boolean;
  style?: ImageStyle;
}

export interface PosterLayoutItem {
  componentId: string;
  type: PosterComponentType;
  bounds: CalculatedBounds;
  zIndex: number;
  visible: boolean;
  required: boolean;
  alignment?: PosterAlignment;
  sourceBounds: PosterBounds;
  boxStyle?: BoxStyle;
  text?: CalculatedTextLayout;
  image?: CalculatedImageLayout;
  metadata?: Record<string, unknown>;
}

export type PosterLayoutByType = {
  [Type in PosterComponentType]: PosterLayoutItem[];
};

export interface PosterLayout {
  templateId: string;
  templateVersion: string;
  canvas: PosterDimensions;
  data: PosterData;
  items: PosterLayoutItem[];
  byType: PosterLayoutByType;
  warnings: string[];
  metadata?: Record<string, unknown>;
}
