import * as PosterService from '../../services/poster.service';
import { PosterFormat, PosterSize } from '../../models/Poster';
import { PosterStyle } from '../../services/promptBuilder.service';

export interface GeneratePosterToolInput {
  productId: string;
  ownerId: string;
  title: string;
  style?: PosterStyle;
  size?: PosterSize;
  format?: PosterFormat;
  contentId?: string;
  tags?: string[];
}

export interface GeneratePosterToolOutput {
  success: boolean;
  posterId?: string;
  posterUrl?: string;
  dimensions?: { width: number; height: number; unit: 'px' | 'mm' | 'in' };
  error?: string;
}

/**
 * PosterGeneratorTool
 * 
 * Reusable agent tool adapter wrapping AdCraft's existing PosterService.
 * Calls the existing poster generation engine and active renderer without
 * modifying or duplicating any rendering/layout internals.
 */
export class PosterGeneratorTool {
  public async generateCampaignPoster(
    input: GeneratePosterToolInput
  ): Promise<GeneratePosterToolOutput> {
    console.info(
      `[PosterGeneratorTool] Poster generation requested for productId: ${input.productId}, title: "${input.title}"`
    );

    try {
      const posterDoc = await PosterService.generatePoster(
        input.productId,
        input.ownerId,
        {
          style: input.style ?? PosterStyle.BOLD,
          size: input.size ?? PosterSize.SQUARE,
          format: input.format ?? PosterFormat.PNG,
          title: input.title,
          tags: input.tags ?? ['campaign', 'growth-agent'],
          contentId: input.contentId,
        }
      );

      console.info(
        `[PosterGeneratorTool] Poster generated successfully: ${posterDoc._id} (URL: ${posterDoc.posterUrl})`
      );

      return {
        success: true,
        posterId: posterDoc._id,
        posterUrl: posterDoc.posterUrl,
        dimensions: posterDoc.dimensions,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[PosterGeneratorTool] Poster generation failed: ${message}`);

      return {
        success: false,
        error: message,
      };
    }
  }
}

export default PosterGeneratorTool;
