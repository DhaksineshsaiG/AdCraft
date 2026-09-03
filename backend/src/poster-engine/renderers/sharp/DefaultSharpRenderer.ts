import sharp from 'sharp';
import {
  SharpRenderFormat,
  SharpRenderer,
  SharpRenderOptions,
  SharpRenderResult,
} from './SharpRenderer.types';

// Poster templates declare pixel dimensions. Rendering them at 72 DPI preserves
// that 1 SVG unit = 1 output pixel contract (for example, 1080 × 1080 remains
// 1080 × 1080). Higher density is still available explicitly for print output.
const DEFAULT_DENSITY = 72;
const DEFAULT_QUALITY = 90;
const DEFAULT_BACKGROUND = '#ffffff';

export class DefaultSharpRenderer implements SharpRenderer {
  public readonly name = 'sharp';
  public readonly supportedFormats: SharpRenderFormat[] = ['png', 'jpeg', 'webp'];

  public canRender(format: string): format is SharpRenderFormat {
    return this.supportedFormats.includes(format as SharpRenderFormat);
  }

  public async render(
    svg: string,
    format: SharpRenderFormat,
    options: SharpRenderOptions = {}
  ): Promise<SharpRenderResult> {
    const pipeline = this.createPipeline(svg, options);
    const output = this.applyFormat(pipeline, format, options);
    const { data, info } = await output.toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      format,
      width: info.width,
      height: info.height,
      bytes: data.length,
    };
  }

  public async renderPng(svg: string, options: SharpRenderOptions = {}): Promise<Buffer> {
    return this.renderToBuffer(svg, 'png', options);
  }

  public async renderJpeg(svg: string, options: SharpRenderOptions = {}): Promise<Buffer> {
    return this.renderToBuffer(svg, 'jpeg', options);
  }

  public async renderWebP(svg: string, options: SharpRenderOptions = {}): Promise<Buffer> {
    return this.renderToBuffer(svg, 'webp', options);
  }

  private async renderToBuffer(
    svg: string,
    format: SharpRenderFormat,
    options: SharpRenderOptions
  ): Promise<Buffer> {
    const result = await this.render(svg, format, options);
    return result.buffer;
  }

  private createPipeline(svg: string, options: SharpRenderOptions): sharp.Sharp {
    const pipeline = sharp(Buffer.from(svg), {
      density: options.metadata?.density ?? DEFAULT_DENSITY,
    });

    return this.applyCommonTransforms(pipeline, options);
  }

  private applyCommonTransforms(pipeline: sharp.Sharp, options: SharpRenderOptions): sharp.Sharp {
    let transformed = pipeline;

    if (options.width || options.height) {
      transformed = transformed.resize({
        width: options.width,
        height: options.height,
        fit: options.fit ?? 'fill',
        withoutEnlargement: false,
      });
    }

    if (!options.transparentBackground) {
      transformed = transformed.flatten({
        background: options.background ?? DEFAULT_BACKGROUND,
      });
    }

    if (options.metadata?.preserve) {
      transformed = transformed.withMetadata();
    }

    return transformed;
  }

  private applyFormat(
    pipeline: sharp.Sharp,
    format: SharpRenderFormat,
    options: SharpRenderOptions
  ): sharp.Sharp {
    const quality = options.quality ?? DEFAULT_QUALITY;

    switch (format) {
      case 'png':
        return pipeline.png({
          quality,
          compressionLevel: 9,
          adaptiveFiltering: true,
        });
      case 'jpeg': {
        const jpegPipeline = options.transparentBackground
          ? pipeline.flatten({ background: options.background ?? DEFAULT_BACKGROUND })
          : pipeline;

        return jpegPipeline.jpeg({
          quality,
          mozjpeg: true,
        });
      }
      case 'webp':
        return pipeline.webp({
          quality,
        });
      default:
        return assertNever(format);
    }
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported Sharp render format: ${String(value)}`);
}
