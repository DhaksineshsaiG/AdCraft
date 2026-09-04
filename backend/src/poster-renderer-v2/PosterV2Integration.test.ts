import PosterDesignComposer from '../poster-intelligence/composer/PosterDesignComposer';
import PosterV2RendererAdapter from './PosterV2RendererAdapter';
import { DefaultSharpRenderer } from '../poster-engine/renderers';
import { PosterGenerationService } from '../poster-engine/orchestration/PosterGenerationService';
import type { PosterData } from '../poster-engine/types/data';
import type { PosterDimensions } from '../poster-engine/types/geometry';
import type { PosterTemplate } from '../poster-engine/templates/PosterTemplate';
import { ContentStatus, ContentType, IGeneratedContentDocument } from '../models/GeneratedContent';
import { IProductDocument } from '../models/Product';

describe('Renderer V2 Integration & Adapter Suite', () => {
  const composer = new PosterDesignComposer();
  const adapter = new PosterV2RendererAdapter();
  const sharpRenderer = new DefaultSharpRenderer();

  const canvas: PosterDimensions = {
    width: 1080,
    height: 1080,
    unit: 'px',
  };

  const samplePosterData: PosterData = {
    product: {
      name: 'Aurora Wireless Earbuds',
      category: 'Electronics',
      description: 'Ultra-low latency wireless earbuds with active noise cancellation.',
      image: {
        url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0icmVkIi8+PC9zdmc+',
        altText: 'Aurora Wireless Earbuds',
      },
    },
    headline: 'Experience Pure Sound',
    description: 'Ultra-low latency wireless earbuds with active noise cancellation.',
    price: {
      amount: 149,
      currency: 'USD',
      formatted: '$149.00',
    },
    cta: 'Buy Now',
  };

  const designDecision = composer.compose({
    productTitle: samplePosterData.product.name,
    productCategory: samplePosterData.product.category || 'Electronics',
    posterSize: 'square',
    campaign: 'New Arrival',
    tone: 'Technology',
    industryPack: 'Electronics',
    tags: ['audio', 'wireless', 'earbuds'],
  });

  describe('PosterV2RendererAdapter', () => {
    test('renders valid SVG with all required editor layer attributes', () => {
      const svg = adapter.render({
        posterData: samplePosterData,
        posterDesignDecision: designDecision,
        canvas,
      });

      expect(svg).toBeDefined();
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);

      // Must contain data-editor-layer="true" for editor compatibility
      expect(svg).toContain('data-editor-layer="true"');

      // Must include background layer
      expect(svg).toContain('data-layer-id="background"');
      expect(svg).toContain('data-layer-type="background"');

      // Must include product image layer
      expect(svg).toContain('data-layer-id="product_image"');
      expect(svg).toContain('data-layer-type="product_image"');

      // Must include headline layer
      expect(svg).toContain('data-layer-id="headline"');
      expect(svg).toContain('data-layer-type="headline"');

      // Must include price layer
      expect(svg).toContain('data-layer-id="price"');
      expect(svg).toContain('data-layer-type="price"');

      // Must include CTA layer
      expect(svg).toContain('data-layer-id="cta"');
      expect(svg).toContain('data-layer-type="cta"');

      // Verify coordinate and dimension attributes exist
      expect(svg).toContain('data-layer-x=');
      expect(svg).toContain('data-layer-y=');
      expect(svg).toContain('data-layer-width=');
      expect(svg).toContain('data-layer-height=');
    });

    test('successfully rasterizes generated V2 SVG to PNG via DefaultSharpRenderer', async () => {
      const svg = adapter.render({
        posterData: samplePosterData,
        posterDesignDecision: designDecision,
        canvas,
      });

      const pngBuffer = await sharpRenderer.renderPng(svg);
      expect(Buffer.isBuffer(pngBuffer)).toBe(true);
      expect(pngBuffer.length).toBeGreaterThan(100);

      // Verify PNG magic numbers: 0x89 0x50 0x4E 0x47
      expect(pngBuffer[0]).toBe(0x89);
      expect(pngBuffer[1]).toBe(0x50);
      expect(pngBuffer[2]).toBe(0x4e);
      expect(pngBuffer[3]).toBe(0x47);
    });
  });

  describe('PosterGenerationService dual-engine orchestration', () => {
    const mockProduct: IProductDocument = {
      _id: 'prod-123',
      name: 'Aurora Wireless Earbuds',
      description: 'High quality earbuds',
      shortDescription: 'High quality earbuds',
      productType: 'Electronics',
      vendor: 'AudioCorp',
      categories: ['Electronics'],
      tags: ['audio', 'earbuds'],
      images: ['https://example.com/image.png'],
      price: 149,
      processingMetadata: {},
      owner: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IProductDocument;

    const mockContent: IGeneratedContentDocument = {
      _id: 'content-123',
      owner: 'user-123',
      product: 'prod-123',
      contentType: ContentType.MARKETING_COPY,
      status: ContentStatus.APPROVED,
      productName: 'Aurora Wireless Earbuds',
      productDescription: 'High quality earbuds',
      content: {
        headline: 'Experience Pure Sound',
        tagline: 'Sound that moves you',
        bodyCopy: 'Ultra-low latency wireless earbuds.',
        callToAction: 'Shop Now',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IGeneratedContentDocument;

    const mockTemplate: PosterTemplate = {
      id: 'template-square-clean',
      name: 'Clean Square',
      version: '1.0.0',
      description: 'Square clean template',
      dimensions: { width: 1080, height: 1080, unit: 'px' },
      components: [],
      metadata: { style: 'minimalist' },
    };

    const createTestService = (overrides?: {
      v2Adapter?: PosterV2RendererAdapter;
      customRenderer?: Pick<DefaultSharpRenderer, 'renderPng'>;
    }) => {
      const mockDataMapper = {
        map: jest.fn().mockReturnValue(samplePosterData),
      };

      const mockLayout = {
        canvas: { width: 1080, height: 1080, unit: 'px' },
        items: [],
        warnings: [],
        metadata: { engine: 'v1' },
      };

      const mockLayoutEngine = {
        calculate: jest.fn().mockReturnValue(mockLayout),
      };

      const mockSvgBuilder = {
        build: jest.fn().mockReturnValue('<svg xmlns="http://www.w3.org/2000/svg"><g data-editor-layer="true">v1</g></svg>'),
      };

      const mockRenderer = overrides?.customRenderer ?? {
        renderPng: jest.fn().mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00])),
      };

      const mockStorage = {
        storePng: jest.fn().mockResolvedValue({
          publicUrl: 'https://cdn.example.com/poster.png',
          storageMetadata: {},
        }),
      };

      const mockPersistence = {
        createPending: jest.fn().mockResolvedValue({ _id: 'poster-1' }),
        markProcessing: jest.fn().mockResolvedValue({ _id: 'poster-1' }),
        markCompleted: jest.fn().mockResolvedValue({ _id: 'poster-1', posterUrl: 'https://cdn.example.com/poster.png' }),
        markFailed: jest.fn().mockResolvedValue({ _id: 'poster-1' }),
        recordContentUsage: jest.fn().mockResolvedValue(undefined),
      };

      const mockImageEnhancer = {
        enhance: jest.fn().mockResolvedValue({ data: samplePosterData, wasEnhanced: false }),
      };

      const service = new PosterGenerationService({
        dataMapper: mockDataMapper as any,
        layoutEngine: mockLayoutEngine as any,
        svgBuilder: mockSvgBuilder as any,
        renderer: mockRenderer as any,
        storage: mockStorage as any,
        persistence: mockPersistence as any,
        imageEnhancer: mockImageEnhancer as any,
        posterDesignComposer: composer,
        v2RendererAdapter: overrides?.v2Adapter ?? adapter,
      });

      // Stub private loaders
      (service as any).loadProduct = jest.fn().mockResolvedValue(mockProduct);
      (service as any).loadGeneratedContent = jest.fn().mockResolvedValue(mockContent);

      return { service, mockSvgBuilder, mockRenderer };
    };

    test('generates with v1 engine when requestedVersion is v1', async () => {
      const { service, mockSvgBuilder } = createTestService();

      const result = await service.generateFromTemplate({
        productId: 'prod-123',
        ownerId: 'user-123',
        template: mockTemplate,
        rendererVersion: 'v1',
      });

      expect(result.metadata.rendererVersion).toBe('v1');
      expect(mockSvgBuilder.build).toHaveBeenCalled();
    });

    test('generates with v2 engine when requestedVersion is v2', async () => {
      const { service, mockSvgBuilder } = createTestService();

      const result = await service.generateFromTemplate({
        productId: 'prod-123',
        ownerId: 'user-123',
        template: mockTemplate,
        rendererVersion: 'v2',
      });

      expect(result.metadata.rendererVersion).toBe('v2');
      // V1 svgBuilder should NOT be called if V2 succeeds
      expect(mockSvgBuilder.build).not.toHaveBeenCalled();
      expect(result.svg).toContain('data-editor-layer="true"');
      expect(result.svg).toContain('data-layer-id="product_image"');
    });

    test('falls back to v1 engine when v2 adapter throws during SVG generation', async () => {
      const failingV2Adapter = {
        render: jest.fn().mockImplementation(() => {
          throw new Error('Simulated V2 SVG generation failure');
        }),
      } as unknown as PosterV2RendererAdapter;

      const { service, mockSvgBuilder } = createTestService({ v2Adapter: failingV2Adapter });

      const result = await service.generateFromTemplate({
        productId: 'prod-123',
        ownerId: 'user-123',
        template: mockTemplate,
        rendererVersion: 'v2',
      });

      // Should seamlessly fall back to v1
      expect(result.metadata.rendererVersion).toBe('v1');
      expect(mockSvgBuilder.build).toHaveBeenCalled();
    });

    test('falls back to v1 engine when Sharp rasterization of v2 SVG fails', async () => {
      let callCount = 0;
      const customRenderer = {
        renderPng: jest.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            // Fail V2 SVG rasterization
            throw new Error('Sharp failed to parse complex V2 gradient');
          }
          // Succeed V1 SVG rasterization
          return Promise.resolve(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]));
        }),
      };

      const { service, mockSvgBuilder } = createTestService({ customRenderer });

      const result = await service.generateFromTemplate({
        productId: 'prod-123',
        ownerId: 'user-123',
        template: mockTemplate,
        rendererVersion: 'v2',
      });

      // Should have fallen back to v1
      expect(result.metadata.rendererVersion).toBe('v1');
      expect(mockSvgBuilder.build).toHaveBeenCalled();
      expect(customRenderer.renderPng).toHaveBeenCalledTimes(2);
    });
  });
});
