import { PosterData } from '../types/data';
import { PosterTemplate } from '../templates/PosterTemplate';

export type PosterRenderFormat = 'jpeg' | 'png' | 'webp' | 'pdf';

export interface PosterRenderOptions {
  format: PosterRenderFormat;
  quality?: number;
  metadata?: Record<string, unknown>;
}

export interface PosterRenderResult<TOutput = unknown> {
  output: TOutput;
  format: PosterRenderFormat;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
}

export interface PosterRenderer<TOutput = unknown> {
  readonly name: string;
  readonly supportedFormats: PosterRenderFormat[];
  canRender(template: PosterTemplate, options: PosterRenderOptions): boolean;
  render(
    data: PosterData,
    template: PosterTemplate,
    options: PosterRenderOptions
  ): Promise<PosterRenderResult<TOutput>>;
}
