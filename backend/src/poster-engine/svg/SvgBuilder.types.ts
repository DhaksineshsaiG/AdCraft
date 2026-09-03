import { PosterLayout, PosterLayoutItem } from '../layout';

export interface SvgSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SvgBuilderOptions {
  includeXmlDeclaration?: boolean;
  safeArea?: SvgSafeArea;
  clipToSafeArea?: boolean;
  showSafeArea?: boolean;
  title?: string;
  description?: string;
}

export interface SvgShadow {
  dx?: number;
  dy?: number;
  blur?: number;
  color?: string;
  opacity?: number;
}

export interface SvgBuildContext {
  layout: PosterLayout;
  options: Required<Omit<SvgBuilderOptions, 'safeArea' | 'title' | 'description'>> &
    Pick<SvgBuilderOptions, 'safeArea' | 'title' | 'description'>;
  defs: string[];
  usedIds: Set<string>;
  nextId(prefix: string): string;
  createClipPath(item: PosterLayoutItem, inset?: number): string;
  createShadowFilter(item: PosterLayoutItem): string | undefined;
  createGradient(item: PosterLayoutItem): string | undefined;
}

export interface SvgBuilder {
  build(layout: PosterLayout, options?: SvgBuilderOptions): string;
}
