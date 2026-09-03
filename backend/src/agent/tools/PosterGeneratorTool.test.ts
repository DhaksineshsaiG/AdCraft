const mockGeneratePoster = jest.fn();

jest.mock('../../services/poster.service', () => ({
  generatePoster: mockGeneratePoster,
}));

import PosterGeneratorTool from './PosterGeneratorTool';
import { PosterFormat, PosterSize } from '../../models/Poster';
import { PosterStyle } from '../../services/promptBuilder.service';

describe('PosterGeneratorTool', () => {
  let tool: PosterGeneratorTool;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = new PosterGeneratorTool();
  });

  test('successfully invokes PosterService and returns poster details', async () => {
    mockGeneratePoster.mockResolvedValue({
      _id: 'poster-uuid-1',
      posterUrl: 'https://storage.example.com/posters/poster-1.png',
      dimensions: { width: 1080, height: 1080, unit: 'px' },
      generationStatus: 'completed',
    });

    const result = await tool.generateCampaignPoster({
      productId: 'prod-uuid-1',
      ownerId: 'user-uuid-1',
      title: 'Summer Sale',
      style: PosterStyle.BOLD,
      size: PosterSize.SQUARE,
      format: PosterFormat.PNG,
    });

    expect(result.success).toBe(true);
    expect(result.posterId).toBe('poster-uuid-1');
    expect(result.posterUrl).toBe('https://storage.example.com/posters/poster-1.png');
    expect(mockGeneratePoster).toHaveBeenCalledWith(
      'prod-uuid-1',
      'user-uuid-1',
      expect.objectContaining({
        title: 'Summer Sale',
        style: PosterStyle.BOLD,
        size: PosterSize.SQUARE,
        format: PosterFormat.PNG,
      })
    );
  });

  test('safely catches poster generation error and returns failure output', async () => {
    mockGeneratePoster.mockRejectedValue(
      new Error('Image processing failed: buffer corrupt')
    );

    const result = await tool.generateCampaignPoster({
      productId: 'prod-uuid-1',
      ownerId: 'user-uuid-1',
      title: 'Failed Campaign',
    });

    expect(result.success).toBe(false);
    expect(result.posterId).toBeUndefined();
    expect(result.error).toContain('Image processing failed: buffer corrupt');
  });
});
