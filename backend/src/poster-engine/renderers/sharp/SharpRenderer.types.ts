import type sharp from 'sharp';

export type SharpRenderFormat = 'png' | 'jpeg' | 'webp';

export interface SharpRendererMetadataOptions {
  preserve?: boolean;
  density?: number;
}

export interface SharpRenderOptions {
  width?: number;
  height?: number;
  fit?: sharp.ResizeOptions['fit'];
  quality?: number;
  transparentBackground?: boolean;
  background?: string | { r: number; g: number; b: number; alpha?: number };
  metadata?: SharpRendererMetadataOptions;
}

export interface SharpRenderResult {
  buffer: Buffer;
  format: SharpRenderFormat;
  width?: number;
  height?: number;
  bytes: number;
}

export interface SharpRenderer {
  readonly name: string;
  readonly supportedFormats: SharpRenderFormat[];
  canRender(format: string): format is SharpRenderFormat;
  render(svg: string, format: SharpRenderFormat, options?: SharpRenderOptions): Promise<SharpRenderResult>;
  renderPng(svg: string, options?: SharpRenderOptions): Promise<Buffer>;
  renderJpeg(svg: string, options?: SharpRenderOptions): Promise<Buffer>;
  renderWebP(svg: string, options?: SharpRenderOptions): Promise<Buffer>;
}
