import sharp from 'sharp';
import { PosterData, PosterColorPalette, PremiumPosterTheme } from '../types';
import { PosterTemplate } from '../templates/PosterTemplate';

const SAMPLE_SIZE = 72;
const EMBED_MAX_SIZE = 1400;

export interface EnhancedPosterAssets {
  data: PosterData;
  palette: PosterColorPalette;
  theme: PremiumPosterTheme;
}

export interface PosterImageEnhancer {
  enhance(data: PosterData, template: PosterTemplate): Promise<EnhancedPosterAssets>;
}

export class DefaultPosterImageEnhancer implements PosterImageEnhancer {
  public async enhance(
    data: PosterData,
    template: PosterTemplate
  ): Promise<EnhancedPosterAssets> {
    const theme = resolveTheme(template, data);
    const fallback = createPalette(defaultThemeColor(theme), theme);
    const imageUrl = data.product.image?.url;

    if (!imageUrl) {
      return enrich(data, fallback, theme);
    }

    try {
      const response = await fetch(toRenderSizedImageUrl(imageUrl), {
        signal: AbortSignal.timeout(12_000),
        headers: { 'User-Agent': 'PosterAI-Renderer/1.0' },
      });

      if (!response.ok) {
        return enrich(data, fallback, theme);
      }

      const sourceBuffer = Buffer.from(await response.arrayBuffer());
      const [palette, embedded] = await Promise.all([
        extractPalette(sourceBuffer, theme),
        createIntegratedProductImage(sourceBuffer, theme),
      ]);

      return enrich({
        ...data,
        product: {
          ...data.product,
          image: {
            ...data.product.image,
            url: `data:image/png;base64,${embedded.toString('base64')}`,
          },
        },
      }, palette, theme, imageUrl);
    } catch {
      return enrich(data, fallback, theme);
    }
  }
}

async function createIntegratedProductImage(
  sourceBuffer: Buffer,
  theme: PremiumPosterTheme
): Promise<Buffer> {
  const { data, info } = await sharp(sourceBuffer)
    .rotate()
    .resize({
      width: EMBED_MAX_SIZE,
      height: EMBED_MAX_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const originalData = Buffer.from(data);
  const background = sampleCornerColor(data, info.width, info.height, info.channels);
  const threshold = estimateBackgroundThreshold(
    data,
    info.width,
    info.height,
    info.channels,
    background
  );
  const segmentation = selectBestSegmentation(
    data,
    info.width,
    info.height,
    info.channels,
    background,
    threshold
  );
  const connectedBackground = segmentation.background;
  const foregroundRatio = segmentation.foregroundRatio;
  const backgroundBrightness = (background.r + background.g + background.b) / 3;
  const foregroundContamination = calculateForegroundContamination(
    data,
    connectedBackground,
    info.channels,
    background,
    threshold * 1.35
  );
  const neutralBrightRatio = calculateNeutralBrightRatio(data, info.channels);
  const preserveTransparentDetail =
    theme === 'fragrance' &&
    backgroundBrightness > 165 &&
    (
      neutralBrightRatio > 0.24 ||
      foregroundContamination > 0.10 ||
      segmentation.confidence < 0.42
    );

  const lowConfidenceCutout =
    foregroundRatio < 0.045 ||
    foregroundRatio > 0.82 ||
    segmentation.confidence < 0.24 ||
    foregroundContamination > 0.42;

  if (
    preserveTransparentDetail ||
    lowConfidenceCutout ||
    (backgroundBrightness > 210 && neutralBrightRatio > 0.72)
  ) {
    return createLifestyleCrop(
      originalData,
      info.width,
      info.height,
      info.channels
    );
  }

  removeSmallForegroundFragments(connectedBackground, info.width, info.height);
  restoreThinForegroundDetails(
    data,
    connectedBackground,
    info.width,
    info.height,
    info.channels
  );
  closeSmallMaskGaps(connectedBackground, info.width, info.height);
  applyFeatheredAlpha(data, connectedBackground, info.width, info.height, info.channels);

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .trim({
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 6,
    })
    .png({ compressionLevel: 8 })
    .toBuffer();
}

interface SegmentationAttempt {
  background: Uint8Array;
  confidence: number;
  foregroundRatio: number;
}

interface SegmentationConfig {
  edgeThresholdScale: number;
  propagationThresholdScale: number;
  minimumPropagationThreshold: number;
  localGradientThreshold: number;
}

const SEGMENTATION_ATTEMPTS: readonly SegmentationConfig[] = [
  {
    edgeThresholdScale: 0.72,
    propagationThresholdScale: 1.45,
    minimumPropagationThreshold: 42,
    localGradientThreshold: 15,
  },
  {
    edgeThresholdScale: 0.92,
    propagationThresholdScale: 1.75,
    minimumPropagationThreshold: 58,
    localGradientThreshold: 20,
  },
  {
    edgeThresholdScale: 1.12,
    propagationThresholdScale: 2.05,
    minimumPropagationThreshold: 76,
    localGradientThreshold: 25,
  },
];

function selectBestSegmentation(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  backgroundColor: Rgb,
  estimatedThreshold: number
): SegmentationAttempt {
  const attempts = SEGMENTATION_ATTEMPTS.map((config) => {
    const mask = buildConnectedBackgroundMask(
      data,
      width,
      height,
      channels,
      backgroundColor,
      estimatedThreshold,
      config
    );
    return scoreSegmentation(mask, width, height);
  });

  return attempts.reduce((best, attempt) =>
    attempt.confidence > best.confidence ? attempt : best
  );
}

function calculateForegroundContamination(
  data: Buffer,
  backgroundMask: Uint8Array,
  channels: number,
  backgroundColor: Rgb,
  similarityThreshold: number
): number {
  let foreground = 0;
  let backgroundLikeForeground = 0;

  for (let index = 0; index < backgroundMask.length; index += 1) {
    if (backgroundMask[index]) continue;
    foreground += 1;
    if (
      colorDistanceAt(data, index, channels, backgroundColor) <=
      similarityThreshold
    ) {
      backgroundLikeForeground += 1;
    }
  }

  return backgroundLikeForeground / Math.max(1, foreground);
}

function calculateNeutralBrightRatio(data: Buffer, channels: number): number {
  let neutralBright = 0;
  const pixels = Math.floor(data.length / channels);

  for (let index = 0; index < pixels; index += 1) {
    const offset = index * channels;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const maximum = Math.max(r, g, b);
    const minimum = Math.min(r, g, b);

    if (maximum >= 170 && maximum - minimum <= 28) {
      neutralBright += 1;
    }
  }

  return neutralBright / Math.max(1, pixels);
}

function buildConnectedBackgroundMask(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  backgroundColor: Rgb,
  estimatedThreshold: number,
  config: SegmentationConfig
): Uint8Array {
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const edgeThreshold = estimatedThreshold * config.edgeThresholdScale;
  const propagationThreshold = Math.max(
    config.minimumPropagationThreshold,
    estimatedThreshold * config.propagationThresholdScale
  );
  let head = 0;
  let tail = 0;

  const enqueue = (index: number, sourceIndex?: number): void => {
    if (background[index]) return;
    if (
      sourceIndex !== undefined &&
      colorDistanceBetween(data, sourceIndex, index, channels) >
        config.localGradientThreshold
    ) {
      return;
    }

    const threshold = sourceIndex === undefined
      ? edgeThreshold
      : propagationThreshold;
    if (!matchesBackground(data, index, channels, backgroundColor, threshold)) return;

    background[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++]!;
    const x = index % width;
    const y = Math.floor(index / width);

    if (x > 0) enqueue(index - 1, index);
    if (x < width - 1) enqueue(index + 1, index);
    if (y > 0) enqueue(index - width, index);
    if (y < height - 1) enqueue(index + width, index);
  }

  return background;
}

function scoreSegmentation(
  background: Uint8Array,
  width: number,
  height: number
): SegmentationAttempt {
  const pixels = width * height;
  let foreground = 0;
  let foregroundOnEdge = 0;
  let foregroundInCenter = 0;
  let centerPixels = 0;
  const centerLeft = width * 0.16;
  const centerRight = width * 0.84;
  const centerTop = height * 0.10;
  const centerBottom = height * 0.90;

  for (let index = 0; index < pixels; index += 1) {
    const x = index % width;
    const y = Math.floor(index / width);
    const isCenter =
      x >= centerLeft &&
      x <= centerRight &&
      y >= centerTop &&
      y <= centerBottom;
    if (isCenter) centerPixels += 1;
    if (background[index]) continue;

    foreground += 1;
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
      foregroundOnEdge += 1;
    }
    if (isCenter) foregroundInCenter += 1;
  }

  const foregroundRatio = foreground / Math.max(1, pixels);
  const edgeRatio = foregroundOnEdge / Math.max(1, 2 * width + 2 * height - 4);
  const centerDensity = foregroundInCenter / Math.max(1, centerPixels);
  const ratioScore = foregroundRatio < 0.035 || foregroundRatio > 0.82
    ? 0
    : 1 - Math.min(1, Math.abs(foregroundRatio - 0.30) / 0.52);
  const confidence = Math.max(
    0,
    ratioScore * 0.68 +
      Math.min(1, centerDensity * 2.2) * 0.32 -
      Math.min(1, edgeRatio * 2.5) * 0.72
  );

  return { background, confidence, foregroundRatio };
}

interface ForegroundComponent {
  label: number;
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function removeSmallForegroundFragments(
  background: Uint8Array,
  width: number,
  height: number
): void {
  const labels = new Int32Array(background.length);
  labels.fill(-1);
  const queue = new Int32Array(background.length);
  const components: ForegroundComponent[] = [];

  for (let start = 0; start < background.length; start += 1) {
    if (background[start] || labels[start] >= 0) continue;

    let head = 0;
    let tail = 0;
    const label = components.length;
    labels[start] = label;
    queue[tail++] = start;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (head < tail) {
      const index = queue[head++]!;
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (x > 0 && !background[index - 1] && labels[index - 1] < 0) {
        labels[index - 1] = label;
        queue[tail++] = index - 1;
      }
      if (x < width - 1 && !background[index + 1] && labels[index + 1] < 0) {
        labels[index + 1] = label;
        queue[tail++] = index + 1;
      }
      if (y > 0 && !background[index - width] && labels[index - width] < 0) {
        labels[index - width] = label;
        queue[tail++] = index - width;
      }
      if (y < height - 1 && !background[index + width] && labels[index + width] < 0) {
        labels[index + width] = label;
        queue[tail++] = index + width;
      }
    }

    components.push({ label, area: tail, minX, minY, maxX, maxY });
  }

  const main = components.reduce<ForegroundComponent | undefined>(
    (largest, component) =>
      !largest || component.area > largest.area ? component : largest,
    undefined
  );
  if (!main) return;

  const minimumArea = Math.max(120, Math.round(background.length * 0.00065));
  const proximityX = width * 0.055;
  const proximityY = height * 0.055;
  const keepLabels = new Set<number>([main.label]);

  for (const component of components) {
    if (component.label === main.label) continue;
    const componentWidth = component.maxX - component.minX + 1;
    const componentHeight = component.maxY - component.minY + 1;
    const aspectRatio = Math.max(
      componentWidth / Math.max(1, componentHeight),
      componentHeight / Math.max(1, componentWidth)
    );
    const nearMain =
      component.maxX >= main.minX - proximityX &&
      component.minX <= main.maxX + proximityX &&
      component.maxY >= main.minY - proximityY &&
      component.minY <= main.maxY + proximityY;

    if (
      component.area >= minimumArea ||
      (component.area >= 24 && nearMain && aspectRatio <= 8)
    ) {
      keepLabels.add(component.label);
    }
  }

  for (let index = 0; index < background.length; index += 1) {
    if (!background[index] && !keepLabels.has(labels[index]!)) {
      background[index] = 1;
    }
  }
}

function closeSmallMaskGaps(
  background: Uint8Array,
  width: number,
  height: number
): void {
  const original = Uint8Array.from(background);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!original[index]) continue;

      let foregroundNeighbours = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighbour = index + offsetY * width + offsetX;
          if (!original[neighbour]) foregroundNeighbours += 1;
        }
      }

      if (foregroundNeighbours >= 6) {
        background[index] = 0;
      }
    }
  }
}

function restoreThinForegroundDetails(
  data: Buffer,
  background: Uint8Array,
  width: number,
  height: number,
  channels: number
): void {
  for (let pass = 0; pass < 3; pass += 1) {
    const original = Uint8Array.from(background);

    for (let y = 2; y < height - 2; y += 1) {
      for (let x = 2; x < width - 2; x += 1) {
        const index = y * width + x;
        if (!original[index]) continue;

        const horizontal = colorDistanceBetween(data, index - 1, index + 1, channels);
        const vertical = colorDistanceBetween(data, index - width, index + width, channels);
        if (horizontal + vertical < 42) continue;

        let nearForeground = false;
        for (let offsetY = -2; offsetY <= 2 && !nearForeground; offsetY += 1) {
          for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
            if (!original[index + offsetY * width + offsetX]) {
              nearForeground = true;
              break;
            }
          }
        }

        if (nearForeground) {
          background[index] = 0;
        }
      }
    }
  }
}

async function createLifestyleCrop(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): Promise<Buffer> {
  const crop = findSalientCrop(data, width, height, channels);
  const { data: cropped, info } = await sharp(data, {
    raw: { width, height, channels: channels as 1 | 2 | 3 | 4 },
  })
    .extract(crop)
    .resize({
      width: EMBED_MAX_SIZE,
      height: EMBED_MAX_SIZE,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  applyLifestyleVignette(cropped, info.width, info.height, info.channels);

  return sharp(cropped, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 8 })
    .toBuffer();
}

function findSalientCrop(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): { left: number; top: number; width: number; height: number } {
  const columns = new Float64Array(width);
  const rows = new Float64Array(height);
  let total = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const index = y * width + x;
      const horizontal = colorDistanceBetween(data, index - 1, index + 1, channels);
      const vertical = colorDistanceBetween(data, index - width, index + width, channels);
      const weight = Math.max(0, horizontal + vertical - 12);

      if (weight === 0) continue;
      columns[x] += weight;
      rows[y] += weight;
      total += weight;
    }
  }

  if (total === 0) {
    return { left: 0, top: 0, width, height };
  }

  const xStart = weightedQuantile(columns, total, 0.08);
  const xEnd = weightedQuantile(columns, total, 0.92);
  const yStart = weightedQuantile(rows, total, 0.08);
  const yEnd = weightedQuantile(rows, total, 0.92);
  const subjectWidth = Math.max(1, xEnd - xStart + 1);
  const subjectHeight = Math.max(1, yEnd - yStart + 1);
  const cropWidth = Math.min(width, Math.max(width * 0.64, subjectWidth * 1.8));
  const cropHeight = Math.min(height, Math.max(height * 0.72, subjectHeight * 1.75));
  const centerX = (xStart + xEnd) / 2;
  const centerY = (yStart + yEnd) / 2;
  const left = Math.round(Math.max(0, Math.min(width - cropWidth, centerX - cropWidth / 2)));
  const top = Math.round(Math.max(0, Math.min(height - cropHeight, centerY - cropHeight / 2)));

  return {
    left,
    top,
    width: Math.max(1, Math.round(cropWidth)),
    height: Math.max(1, Math.round(cropHeight)),
  };
}

function weightedQuantile(
  buckets: Uint32Array | Float64Array,
  total: number,
  quantile: number
): number {
  const target = total * quantile;
  let cumulative = 0;

  for (let index = 0; index < buckets.length; index += 1) {
    cumulative += buckets[index] ?? 0;
    if (cumulative >= target) return index;
  }

  return buckets.length - 1;
}

function applyLifestyleVignette(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): void {
  const alphaChannel = channels - 1;
  const centerX = width * 0.52;
  const centerY = height * 0.54;
  const radiusX = width * 0.58;
  const radiusY = height * 0.62;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const normalizedX = (x - centerX) / radiusX;
      const normalizedY = (y - centerY) / radiusY;
      const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
      const opacity = distance <= 0.48
        ? 1
        : Math.max(0, 1 - (distance - 0.48) / 0.52);
      const offset = (y * width + x) * channels + alphaChannel;
      data[offset] = Math.round((data[offset] ?? 255) * opacity * opacity);
    }
  }
}

function sampleCornerColor(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): Rgb {
  const sampleWidth = Math.max(3, Math.floor(width * 0.035));
  const sampleHeight = Math.max(3, Math.floor(height * 0.035));
  const corners = [
    [0, 0],
    [width - sampleWidth, 0],
    [0, height - sampleHeight],
    [width - sampleWidth, height - sampleHeight],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (const [startX, startY] of corners) {
    for (let y = startY!; y < startY! + sampleHeight; y += 1) {
      for (let x = startX!; x < startX! + sampleWidth; x += 1) {
        const offset = (y * width + x) * channels;
        r += data[offset] ?? 0;
        g += data[offset + 1] ?? 0;
        b += data[offset + 2] ?? 0;
        count += 1;
      }
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

function estimateBackgroundThreshold(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  background: Rgb
): number {
  const samples: number[] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 90));

  for (let x = 0; x < width; x += step) {
    samples.push(colorDistanceAt(data, x, channels, background));
    samples.push(colorDistanceAt(data, (height - 1) * width + x, channels, background));
  }
  for (let y = step; y < height - step; y += step) {
    samples.push(colorDistanceAt(data, y * width, channels, background));
    samples.push(colorDistanceAt(data, y * width + width - 1, channels, background));
  }

  const average = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length);
  const variance = samples.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    Math.max(1, samples.length);
  const brightness = (background.r + background.g + background.b) / 3;
  const minimum = brightness > 215 ? 14 : brightness < 38 ? 26 : 30;
  const maximum = brightness > 215 ? 32 : brightness < 38 ? 54 : 72;
  const base = brightness > 215 ? 15 : brightness < 38 ? 28 : 32;

  return Math.max(minimum, Math.min(maximum, base + Math.sqrt(variance) * 1.15));
}

function matchesBackground(
  data: Buffer,
  index: number,
  channels: number,
  background: Rgb,
  threshold: number
): boolean {
  return colorDistanceAt(data, index, channels, background) <= threshold;
}

function colorDistanceAt(
  data: Buffer,
  index: number,
  channels: number,
  background: Rgb
): number {
  const offset = index * channels;
  const dr = (data[offset] ?? 0) - background.r;
  const dg = (data[offset + 1] ?? 0) - background.g;
  const db = (data[offset + 2] ?? 0) - background.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function colorDistanceBetween(
  data: Buffer,
  firstIndex: number,
  secondIndex: number,
  channels: number
): number {
  const firstOffset = firstIndex * channels;
  const secondOffset = secondIndex * channels;
  const dr = (data[firstOffset] ?? 0) - (data[secondOffset] ?? 0);
  const dg = (data[firstOffset + 1] ?? 0) - (data[secondOffset + 1] ?? 0);
  const db = (data[firstOffset + 2] ?? 0) - (data[secondOffset + 2] ?? 0);
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function applyFeatheredAlpha(
  data: Buffer,
  background: Uint8Array,
  width: number,
  height: number,
  channels: number
): void {
  const alphaChannel = channels - 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const alphaOffset = index * channels + alphaChannel;

      if (background[index]) {
        data[alphaOffset] = 0;
        continue;
      }

      let backgroundNeighbours = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighbourX = x + offsetX;
          const neighbourY = y + offsetY;
          if (
            neighbourX < 0 ||
            neighbourX >= width ||
            neighbourY < 0 ||
            neighbourY >= height ||
            background[neighbourY * width + neighbourX]
          ) {
            backgroundNeighbours += 1;
          }
        }
      }

      const featheredAlpha = backgroundNeighbours === 0
        ? 255
        : Math.max(205, 255 - backgroundNeighbours * 7);
      data[alphaOffset] = Math.min(data[alphaOffset] ?? 255, featheredAlpha);
    }
  }
}

function toRenderSizedImageUrl(imageUrl: string): string {
  const url = new URL(imageUrl);

  if (url.hostname === 'images.unsplash.com') {
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'max');
    url.searchParams.set('w', String(EMBED_MAX_SIZE));
    url.searchParams.set('q', '86');
  }

  return url.toString();
}

async function extractPalette(
  buffer: Buffer,
  theme: PremiumPosterTheme
): Promise<PosterColorPalette> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buckets = new Map<
    string,
    { score: number; samples: number; r: number; g: number; b: number }
  >();

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = relativeLuminance(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    if (luminance > 0.96 || luminance < 0.025 || saturation < 0.08) continue;

    const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
    const bucket = buckets.get(key) ?? {
      score: 0,
      samples: 0,
      r: 0,
      g: 0,
      b: 0,
    };
    bucket.score += 1 + saturation * 2;
    bucket.samples += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  const colors = [...buckets.values()]
    .sort((a, b) => b.score - a.score)
    .map((bucket) => ({
      r: Math.round(bucket.r / Math.max(1, bucket.samples)),
      g: Math.round(bucket.g / Math.max(1, bucket.samples)),
      b: Math.round(bucket.b / Math.max(1, bucket.samples)),
    }))
    .filter((color) => color.r <= 255 && color.g <= 255 && color.b <= 255);
  const dominant = colors[0] ?? hexToRgb(defaultThemeColor(theme));
  const vibrant = colors
    .slice(0, 12)
    .sort((a, b) => colorfulness(b) - colorfulness(a))[0] ?? dominant;

  return createPalette(rgbToHex(dominant), theme, rgbToHex(vibrant));
}

function enrich(
  data: PosterData,
  palette: PosterColorPalette,
  theme: PremiumPosterTheme,
  sourceImageUrl?: string
): EnhancedPosterAssets {
  const enriched = {
    ...data,
    metadata: {
      ...data.metadata,
      palette,
      theme,
      sourceImageUrl,
    },
  };

  return { data: enriched, palette, theme };
}

function resolveTheme(template: PosterTemplate, data: PosterData): PremiumPosterTheme {
  const context = [
    data.product.category,
    data.product.vendor,
    data.product.name,
    data.product.description,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/coffee|espresso|café|cafe|mug|tea|drinkware|roast|ceramic/.test(context)) return 'coffee';
  if (/perfume|fragrance|cologne|eau de|scent|parfum/.test(context)) return 'fragrance';
  if (/furniture|chair|sofa|table|lamp|interior|decor|home furnishing/.test(context)) return 'interior';
  if (/shoe|sneaker|sport|fitness|running|training|outdoor|athletic/.test(context)) return 'sports';
  if (/phone|smartphone|electronic|laptop|tablet|device|tech|camera|audio/.test(context)) return 'tech';
  if (/fashion|apparel|clothing|jewelry|accessor|handbag|beauty|cosmetic/.test(context)) return 'fashion';

  const style = String(template.metadata?.['style'] ?? '').toLowerCase();

  if (style === 'elegant' || style === 'vintage') return 'luxury';
  if (style === 'minimalist') return 'minimal';
  if (style === 'professional') return 'tech';
  if (style === 'bold') return 'sports';
  if (style === 'playful') return 'fashion';
  return 'modern';
}

function createPalette(
  dominantHex: string,
  theme: PremiumPosterTheme,
  vibrantHex: string = dominantHex
): PosterColorPalette {
  const dominant = hexToRgb(dominantHex);
  const vibrant = hexToRgb(vibrantHex);
  const accent = theme === 'coffee'
    ? hexToRgb('#D99A58')
    : theme === 'fragrance'
      ? hexToRgb('#D8BC7A')
      : boostSaturation(vibrant, theme === 'luxury' ? 0.25 : 0.45);
  const darkTheme =
    theme === 'tech' ||
    theme === 'sports' ||
    theme === 'luxury' ||
    theme === 'fragrance';
  const background = darkTheme
    ? rgbToHex(mix(dominant, { r: 7, g: 10, b: 20 }, 0.78))
    : theme === 'minimal' || theme === 'interior'
      ? '#F7F8FA'
      : theme === 'coffee'
        ? rgbToHex(mix(dominant, { r: 44, g: 22, b: 12 }, 0.58))
      : rgbToHex(mix(dominant, { r: 248, g: 250, b: 252 }, 0.86));
  const backgroundAlt = darkTheme
    ? rgbToHex(mix(vibrant, { r: 16, g: 20, b: 38 }, 0.68))
    : theme === 'coffee'
      ? rgbToHex(mix(vibrant, { r: 154, g: 91, b: 47 }, 0.55))
    : rgbToHex(mix(vibrant, { r: 235, g: 241, b: 248 }, 0.78));
  const text = darkTheme || theme === 'coffee' ? '#FFF9F1' : '#111827';

  return {
    dominant: rgbToHex(dominant),
    vibrant: rgbToHex(vibrant),
    accent: rgbToHex(accent),
    background,
    backgroundAlt,
    surface: darkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.72)',
    text,
    mutedText: theme === 'coffee'
      ? '#EAD8C5'
      : darkTheme
        ? '#D5D9E3'
        : '#536071',
    glow: rgbToHex(mix(accent, { r: 255, g: 255, b: 255 }, 0.18)),
  };
}

function defaultThemeColor(theme: PremiumPosterTheme): string {
  const colors: Record<PremiumPosterTheme, string> = {
    luxury: '#A98244',
    modern: '#476CFF',
    minimal: '#94A3B8',
    tech: '#36C5F0',
    sports: '#FF4D35',
    fashion: '#E94E9A',
    coffee: '#B66A38',
    fragrance: '#C7A66A',
    interior: '#7D8B7A',
  };
  return colors[theme];
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return {
    r: Math.round(a.r * (1 - amount) + b.r * amount),
    g: Math.round(a.g * (1 - amount) + b.g * amount),
    b: Math.round(a.b * (1 - amount) + b.b * amount),
  };
}

function boostSaturation(color: Rgb, amount: number): Rgb {
  const average = (color.r + color.g + color.b) / 3;
  return {
    r: clamp(Math.round(color.r + (color.r - average) * amount)),
    g: clamp(Math.round(color.g + (color.g - average) * amount)),
    b: clamp(Math.round(color.b + (color.b - average) * amount)),
  };
}

function colorfulness(color: Rgb): number {
  return Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

interface Rgb { r: number; g: number; b: number }

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16) || 0,
    g: parseInt(normalized.slice(2, 4), 16) || 0,
    b: parseInt(normalized.slice(4, 6), 16) || 0,
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}
