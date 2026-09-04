import {
  ContentStatus,
  ContentType,
  IGeneratedContentDocument,
} from '../../models/GeneratedContent';
import { IProductDocument } from '../../models/Product';
import { ForbiddenError, ValidationError } from '../../middleware/errorMiddleware';
import { getLatestContentByProduct } from '../../services/generatedContent.service';
import { getContentById } from '../../services/generatedContent.service';
import { getProductById } from '../../services/product.service';
import { IPosterDocument, PosterFormat, PosterSize } from '../../models/Poster';
import {
  DefaultPosterLayoutEngine,
  PosterLayout,
  PosterLayoutEngine,
} from '../layout';
import { DefaultSvgBuilder, SvgBuilder } from '../svg';
import { DefaultSharpRenderer, SharpRenderOptions, SharpRenderer } from '../renderers';
import { PosterTemplate } from '../templates/PosterTemplate';
import { PosterData } from '../types';
import { DefaultPosterDataMapper, PosterDataMapper } from './PosterDataMapper';
import {
  createPosterOutputStorage,
  PosterOutputStorage,
  StoredPosterOutput,
} from './PosterOutputStorage';
import {
  PrismaPosterGenerationPersistence,
  PosterGenerationPersistence,
} from './PosterGenerationPersistence';
import {
  DefaultPosterImageEnhancer,
  PosterImageEnhancer,
} from './PosterImageEnhancer';
import PosterDesignComposer from '../../poster-intelligence/composer/PosterDesignComposer';
import type { PosterDesignDecision } from '../../poster-intelligence/composer/PosterDesignTypes';
import {
  applyPosterDesignDecisionToPosterData,
  buildPosterDesignInput,
  logPosterDesignDecision,
} from './PosterDesignIntegration';
import { env } from '../../config/env';
import { PosterV2RendererAdapter } from '../../poster-renderer-v2';

export interface GeneratePosterFromTemplateInput {
  productId: string;
  ownerId: string;
  template: PosterTemplate;
  contentId?: string;
  title?: string;
  tags?: string[];
  size?: PosterSize;
  output?: SharpRenderOptions;
  save?: boolean;
  rendererVersion?: 'v1' | 'v2';
}

export interface GeneratePosterFromTemplateResult {
  posterData: PosterData;
  layout: PosterLayout;
  svg: string;
  pngBuffer: Buffer;
  metadata: {
    productId: string;
    generatedContentId: string;
    templateId: string;
    templateVersion: string;
    rendererVersion: 'v1' | 'v2';
    width: number;
    height: number;
    bytes: number;
    generationDurationMs: number;
    renderDurationMs: number;
    uploadDurationMs: number;
    saved: boolean;
  };
  poster?: IPosterDocument;
  storage?: StoredPosterOutput;
}

export interface PosterGenerationServiceDependencies {
  dataMapper: PosterDataMapper;
  layoutEngine: PosterLayoutEngine;
  svgBuilder: SvgBuilder;
  renderer: Pick<SharpRenderer, 'renderPng'>;
  storage: PosterOutputStorage;
  persistence: PosterGenerationPersistence;
  imageEnhancer: PosterImageEnhancer;
  posterDesignComposer: PosterDesignComposer;
  v2RendererAdapter?: PosterV2RendererAdapter;
}

const CONTENT_TYPE_PREFERENCE: ContentType[] = [
  ContentType.MARKETING_COPY,
  ContentType.HEADLINE,
  ContentType.PRODUCT_DESCRIPTION,
  ContentType.TAGLINE,
  ContentType.CALL_TO_ACTION,
  ContentType.PROMOTIONAL_TEXT,
];

export class PosterGenerationService {
  public constructor(
    private readonly dependencies: PosterGenerationServiceDependencies
  ) {}

  public async generateFromTemplate(
    input: GeneratePosterFromTemplateInput
  ): Promise<GeneratePosterFromTemplateResult> {
    const startedAt = Date.now();
    const product = await this.loadProduct(input.productId, input.ownerId);
    const content = await this.loadGeneratedContent(product, input.ownerId, input.contentId);
    const mappedData = this.dependencies.dataMapper.map(product, content);
    const designStartedAt = Date.now();
    const posterDesignDecision = this.composePosterDesign(product, content, input.template);
    const designDurationMs = Date.now() - designStartedAt;

    if (posterDesignDecision) {
      logPosterDesignDecision(posterDesignDecision, designDurationMs);
    }

    const enhanced = await this.dependencies.imageEnhancer.enhance(mappedData, input.template);
    const posterData = posterDesignDecision
      ? applyPosterDesignDecisionToPosterData(enhanced.data, posterDesignDecision)
      : enhanced.data;
    const layout = this.dependencies.layoutEngine.calculate(posterData, input.template, {
      canvas: input.template.dimensions,
      posterDesignDecision,
    });

    const requestedVersion = input.rendererVersion ?? env.POSTER_RENDERER_VERSION;
    let activeRendererVersion: 'v1' | 'v2' = 'v1';
    let svg = '';
    let pngBuffer: Buffer = Buffer.alloc(0);
    let renderDurationMs = 0;

    const buildV1 = async () => {
      activeRendererVersion = 'v1';
      const v1Svg = this.dependencies.svgBuilder.build(layout);
      const renderStartedAt = Date.now();
      const v1PngBuffer = await this.dependencies.renderer.renderPng(v1Svg, input.output);
      renderDurationMs = Date.now() - renderStartedAt;
      svg = v1Svg;
      pngBuffer = v1PngBuffer;
    };

    if (
      requestedVersion === 'v2' &&
      posterDesignDecision &&
      this.dependencies.v2RendererAdapter
    ) {
      try {
        const v2Svg = this.dependencies.v2RendererAdapter.render({
          posterData,
          posterDesignDecision,
          canvas: input.template.dimensions,
          template: input.template,
        });
        const renderStartedAt = Date.now();
        const v2PngBuffer = await this.dependencies.renderer.renderPng(v2Svg, input.output);
        renderDurationMs = Date.now() - renderStartedAt;
        svg = v2Svg;
        pngBuffer = v2PngBuffer;
        activeRendererVersion = 'v2';
      } catch (error) {
        console.warn(
          `[PosterGenerationService] Renderer V2 failed; falling back to Renderer V1: ${getErrorMessage(error)}`,
          error
        );
        await buildV1();
      }
    } else {
      await buildV1();
    }

    console.log(`Poster Generation Time: ${Date.now() - startedAt}ms (Engine: ${activeRendererVersion})`);

    let poster: IPosterDocument | undefined;
    let storage: StoredPosterOutput | undefined;
    let uploadDurationMs = 0;

    if (input.save !== false) {
      poster = await this.dependencies.persistence.createPending({
        product,
        content,
        ownerId: input.ownerId,
        dimensions: {
          width: layout.canvas.width,
          height: layout.canvas.height,
          unit: 'px',
        },
        title: input.title,
        tags: input.tags,
        size: input.size,
        format: PosterFormat.PNG,
      });

      poster = await this.dependencies.persistence.markProcessing(poster);

      try {
        const uploadStartedAt = Date.now();
        storage = await this.dependencies.storage.storePng({
          buffer: pngBuffer,
          ownerId: input.ownerId,
          productId: product._id.toString(),
          posterId: poster._id.toString(),
        });
        uploadDurationMs = Date.now() - uploadStartedAt;

        poster = await this.dependencies.persistence.markCompleted({
          poster,
          posterUrl: storage.publicUrl,
          storageMetadata: storage.storageMetadata,
          metrics: {
            generationDurationMs: Date.now() - startedAt,
            uploadDurationMs,
            retryCount: 0,
            estimatedCostUsd: 0,
          },
          promptSnapshot: buildPromptSnapshot(input.template, content, layout, svg, activeRendererVersion),
        });
        await this.dependencies.persistence.recordContentUsage(content, poster);
      } catch (error) {
        await this.dependencies.persistence.markFailed(poster, getErrorMessage(error));
        throw error;
      }
    }

    return {
      posterData,
      layout,
      svg,
      pngBuffer,
      metadata: {
        productId: product._id.toString(),
        generatedContentId: content._id.toString(),
        templateId: input.template.id,
        templateVersion: input.template.version,
        rendererVersion: activeRendererVersion,
        width: layout.canvas.width,
        height: layout.canvas.height,
        bytes: pngBuffer.length,
        generationDurationMs: Date.now() - startedAt,
        renderDurationMs,
        uploadDurationMs,
        saved: input.save !== false,
      },
      poster,
      storage,
    };
  }

  private async loadProduct(productId: string, ownerId: string): Promise<IProductDocument> {
    return getProductById(productId, ownerId);
  }

  private composePosterDesign(
    product: IProductDocument,
    content: IGeneratedContentDocument,
    template: PosterTemplate
  ): PosterDesignDecision | undefined {
    try {
      return this.dependencies.posterDesignComposer.compose(
        buildPosterDesignInput(product, content, template)
      );
    } catch (error) {
      console.warn(
        `PosterDesignComposer unavailable; falling back to existing renderer behaviour. ${getErrorMessage(error)}`
      );
      return undefined;
    }
  }

  private async loadGeneratedContent(
    product: IProductDocument,
    ownerId: string,
    contentId?: string
  ): Promise<IGeneratedContentDocument> {
    if (contentId) {
      return loadPinnedContent(contentId, ownerId, product._id);
    }

    const latestByType = await getLatestContentByProduct(product._id.toString(), ownerId);

    for (const type of CONTENT_TYPE_PREFERENCE) {
      const record = latestByType[type];

      if (record && isUsableContent(record)) {
        return record;
      }
    }

    const fallback = Object.values(latestByType).find(
      (record) => record && isUsableContent(record)
    );

    if (!fallback) {
      throw new ValidationError(
        'No completed generated content found for this product. Please generate content before creating a poster.'
      );
    }

    return fallback;
  }
}

export function createDefaultPosterGenerationService(): PosterGenerationService {
  return new PosterGenerationService({
    dataMapper: new DefaultPosterDataMapper(),
    layoutEngine: new DefaultPosterLayoutEngine(),
    svgBuilder: new DefaultSvgBuilder(),
    renderer: new DefaultSharpRenderer(),
    storage: createPosterOutputStorage(),
    persistence: new PrismaPosterGenerationPersistence(),
    imageEnhancer: new DefaultPosterImageEnhancer(),
    posterDesignComposer: new PosterDesignComposer(),
    v2RendererAdapter: new PosterV2RendererAdapter(),
  });
}

async function loadPinnedContent(
  contentId: string,
  ownerId: string,
  productId: string
): Promise<IGeneratedContentDocument> {
  const content = await getContentById(contentId, ownerId);

  if (content.owner.toString() !== ownerId) {
    throw new ForbiddenError('You do not have permission to use this content record.');
  }

  const contentProductId =
    typeof content.product === 'string' ? content.product : content.product._id;
  if (contentProductId !== productId) {
    throw new ValidationError('Generated content does not belong to the requested product.');
  }

  if (!isUsableContent(content)) {
    throw new ValidationError(
      `Content record must be completed or approved before use. Current status: "${content.status}".`
    );
  }

  return content;
}

function isUsableContent(content: IGeneratedContentDocument): boolean {
  return content.status === ContentStatus.COMPLETED || content.status === ContentStatus.APPROVED;
}

function buildPromptSnapshot(
  template: PosterTemplate,
  content: IGeneratedContentDocument,
  layout: PosterLayout,
  svg: string,
  rendererVersion: 'v1' | 'v2' = 'v1'
): string {
  return JSON.stringify({
    pipeline: 'poster-engine',
    rendererVersion,
    templateId: template.id,
    templateVersion: template.version,
    generatedContentId: content._id.toString(),
    contentType: content.contentType,
    composition: layout.metadata,
    layoutWarnings: layout.warnings,
    editableSvg: svg,
    editHistory: [],
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
