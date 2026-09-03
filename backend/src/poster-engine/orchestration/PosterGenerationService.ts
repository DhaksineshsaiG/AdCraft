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
    const svg = this.dependencies.svgBuilder.build(layout);
    const renderStartedAt = Date.now();
    const pngBuffer = await this.dependencies.renderer.renderPng(svg, input.output);
    const renderDurationMs = Date.now() - renderStartedAt;
    console.log(`Poster Generation Time: ${Date.now() - startedAt}ms`);

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
          promptSnapshot: buildPromptSnapshot(input.template, content, layout, svg),
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
  svg: string
): string {
  return JSON.stringify({
    pipeline: 'poster-engine',
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
