import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent, type PointerEvent, type WheelEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlignHorizontalSpaceAround,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  BoxSelect,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Italic,
  Layers,
  Lock,
  Maximize2,
  MousePointer2,
  Move,
  Palette,
  RotateCw,
  Scan,
  Square,
  Type,
  Underline,
  Unlock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Poster } from './PosterCard';
import { savePosterEdit } from '../../services/posters.service';

type BaseVisualLayerId =
  | 'product'
  | 'headline'
  | 'subheadline'
  | 'description'
  | 'cta'
  | 'price'
  | 'logo'
  | 'background'
  | 'decorations';
type VisualLayerId = BaseVisualLayerId | `duplicate-${string}`;
type ResizeHandle = 'top-left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left';
type TextAlign = 'left' | 'center' | 'right';
type CropHandle = 'move' | 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
type BackgroundGradientType = 'linear' | 'radial';
type BackgroundImageMode = 'fit' | 'fill' | 'stretch' | 'center';
type DecorationKind = 'circle' | 'rectangle' | 'line' | 'arrow' | 'star' | 'triangle' | 'hexagon' | 'svg';
type DecorationCategory = 'Luxury' | 'Technology' | 'Sports' | 'Fashion' | 'Coffee' | 'Nature' | 'Minimal' | 'Business' | 'Gaming';
type ClipboardPayload =
  | { type: 'decorations'; decorations: DecorationItem[] }
  | { type: 'layers'; layers: VisualLayer[] };
type ContextMenuState = { x: number; y: number; scope: 'canvas' | 'layer' | 'decoration' } | null;
type AlignAction = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'middle' | 'distribute-h' | 'distribute-v';

interface TextStyle {
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing: number;
  lineHeight: number;
  align: TextAlign;
  uppercase: boolean;
  italic: boolean;
  underline: boolean;
}

interface LayerTextState {
  content: string;
  style: TextStyle;
}

interface CropState {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

interface ImageEditState {
  src?: string;
  fileName?: string;
  scale: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  shadow: number;
  glow: number;
  borderRadius: number;
  crop: CropState;
}

interface GradientStop {
  id: string;
  color: string;
  position: number;
  opacity: number;
}

interface BackgroundEditState {
  preset: string;
  solidColor: string;
  gradientEnabled: boolean;
  gradientType: BackgroundGradientType;
  gradientAngle: number;
  gradientStops: GradientStop[];
  imageSrc?: string;
  imageName?: string;
  imageMode: BackgroundImageMode;
  imageX: number;
  imageY: number;
  imageScale: number;
  imageRotation: number;
  blur: number;
  brightness: number;
  contrast: number;
  saturation: number;
  overlayColor: string;
  overlayOpacity: number;
  noise: number;
  textureStrength: number;
  vignette: number;
  shadow: number;
}

interface DecorationItem {
  id: string;
  name: string;
  kind: DecorationKind;
  category: DecorationCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  gradient: boolean;
  gradientFrom: string;
  gradientTo: string;
  shadow: number;
  glow: number;
  blur: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
  hidden: boolean;
  groupId?: string;
  svgMarkup?: string;
}

interface DecorationGroup {
  id: string;
  name: string;
  memberIds: string[];
}

interface LayerMeta {
  label: string;
  hidden: boolean;
  locked: boolean;
}

interface VisualLayer {
  id: VisualLayerId;
  sourceId?: VisualLayerId;
  label: string;
  type: 'text' | 'image' | 'shape' | 'background';
  bounds: LayerBounds;
  rotation: number;
  fontScale: number;
  textContent: string;
  textStyle: TextStyle;
}

interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayerTransform extends Partial<LayerBounds> {
  rotation?: number;
  fontScale?: number;
}

interface GuideLine {
  id: string;
  orientation: 'vertical' | 'horizontal';
  position: number;
  label?: string;
}

interface AlignmentIndicator {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  canvasRect: DOMRect;
  startTransforms: Record<VisualLayerId, LayerTransform>;
  selectedIds: VisualLayerId[];
  duplicated?: boolean;
  historyBefore: EditorSnapshot;
}

interface SelectionBoxSession {
  pointerId: number;
  canvasRect: DOMRect;
  startX: number;
  startY: number;
}

interface ResizeSession {
  pointerId: number;
  handle: ResizeHandle;
  canvasRect: DOMRect;
  startPoint: { x: number; y: number };
  startGroup: LayerBounds;
  startTransforms: Record<VisualLayerId, LayerTransform>;
  selectedIds: VisualLayerId[];
  historyBefore: EditorSnapshot;
}

interface RotationSession {
  pointerId: number;
  canvasRect: DOMRect;
  center: { x: number; y: number };
  startAngle: number;
  startTransforms: Record<VisualLayerId, LayerTransform>;
  selectedIds: VisualLayerId[];
  historyBefore: EditorSnapshot;
}

interface CropSession {
  pointerId: number;
  layerId: VisualLayerId;
  handle: CropHandle;
  canvasRect: DOMRect;
  startPoint: { x: number; y: number };
  startCrop: CropState;
  layerBounds: LayerBounds;
  historyBefore: EditorSnapshot;
}

interface DecorationDragSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  canvasRect: DOMRect;
  selectedIds: string[];
  startItems: Record<string, DecorationItem>;
  historyBefore: EditorSnapshot;
}

interface EditorSnapshot {
  layerTransforms: Partial<Record<VisualLayerId, LayerTransform>>;
  layerText: Partial<Record<VisualLayerId, LayerTextState>>;
  imageEdits: Partial<Record<VisualLayerId, ImageEditState>>;
  backgroundEdit: BackgroundEditState;
  decorations: DecorationItem[];
  selectedDecorationIds: string[];
  decorationGroups: DecorationGroup[];
  decorationCategory: DecorationCategory;
  layerMeta: Record<BaseVisualLayerId, LayerMeta>;
  duplicatedLayers: VisualLayer[];
  selectedLayerIds: VisualLayerId[];
}

interface EditorDocumentState {
  layerTransforms: Partial<Record<VisualLayerId, LayerTransform>>;
  layerText: Partial<Record<VisualLayerId, LayerTextState>>;
  imageEdits: Partial<Record<VisualLayerId, ImageEditState>>;
  backgroundEdit: BackgroundEditState;
  decorations: DecorationItem[];
  decorationGroups: DecorationGroup[];
  decorationCategory: DecorationCategory;
  layerMeta: Record<BaseVisualLayerId, LayerMeta>;
  duplicatedLayers: VisualLayer[];
}

interface EditorVersion {
  id: string;
  label: string;
  timestamp: string;
  state: EditorDocumentState;
}

interface PersistedEditorState {
  schemaVersion: 1;
  savedAt?: string;
  state: EditorDocumentState;
  versionHistory: EditorVersion[];
}

interface RecoverySession {
  hash: string;
  savedAt: string;
  state: EditorDocumentState;
}

interface HistoryEntry {
  id: string;
  label: string;
  before: EditorSnapshot;
  after: EditorSnapshot;
  createdAt: number;
}

interface TransformFeedback {
  type: 'size' | 'rotation';
  x: number;
  y: number;
  label: string;
}

interface VisualPosterEditorProps {
  poster: Poster;
}

const PANEL_LAYERS: Array<{ id: BaseVisualLayerId; label: string }> = [
  { id: 'background', label: 'Background' },
  { id: 'decorations', label: 'Decorations' },
  { id: 'product', label: 'Product' },
  { id: 'headline', label: 'Headline' },
  { id: 'subheadline', label: 'Subheadline' },
  { id: 'description', label: 'Description' },
  { id: 'cta', label: 'CTA' },
  { id: 'price', label: 'Price' },
  { id: 'logo', label: 'Logo' },
];

const LAYER_SECTIONS: Array<{ id: string; label: string; layerIds: BaseVisualLayerId[] }> = [
  { id: 'background', label: 'Background', layerIds: ['background'] },
  { id: 'images', label: 'Images', layerIds: ['product', 'logo'] },
  { id: 'text', label: 'Text', layerIds: ['headline', 'subheadline', 'description', 'cta', 'price'] },
  { id: 'decorations', label: 'Decorations', layerIds: ['decorations'] },
];

const PROPERTY_GROUPS = [
  'Position',
  'Size',
  'Rotation',
  'Opacity',
  'Color',
  'Font',
  'Spacing',
  'Image',
];

const HISTORY_LIMIT = 100;
const AUTOSAVE_DELAY_MS = 5_000;
const SNAP_DISTANCE_PX = 8;
const POSTER_SAFE_MARGIN = 2;
const MIN_TEXT_FONT_SIZE = 14;
const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 32,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: 0,
  lineHeight: 1.1,
  align: 'left',
  uppercase: false,
  italic: false,
  underline: false,
};
const DEFAULT_IMAGE_STATE: ImageEditState = {
  scale: 1,
  flipX: false,
  flipY: false,
  opacity: 1,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  shadow: 0,
  glow: 0,
  borderRadius: 0,
  crop: {
    enabled: false,
    x: 8,
    y: 8,
    width: 84,
    height: 84,
    zoom: 1,
  },
};
const DEFAULT_BACKGROUND_STATE: BackgroundEditState = {
  preset: 'Minimal',
  solidColor: '#f8fafc',
  gradientEnabled: true,
  gradientType: 'linear',
  gradientAngle: 135,
  gradientStops: [
    { id: 'start', color: '#f8fafc', position: 0, opacity: 1 },
    { id: 'end', color: '#e2e8f0', position: 100, opacity: 1 },
  ],
  imageMode: 'fill',
  imageX: 50,
  imageY: 50,
  imageScale: 1,
  imageRotation: 0,
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  overlayColor: '#000000',
  overlayOpacity: 0,
  noise: 0,
  textureStrength: 0,
  vignette: 0,
  shadow: 0,
};

const BACKGROUND_PRESETS: Record<string, Partial<BackgroundEditState>> = {
  Luxury: {
    solidColor: '#111827',
    gradientEnabled: true,
    gradientType: 'radial',
    gradientAngle: 120,
    gradientStops: [
      { id: 'start', color: '#312e81', position: 0, opacity: 0.95 },
      { id: 'end', color: '#020617', position: 100, opacity: 1 },
    ],
    overlayColor: '#facc15',
    overlayOpacity: 0.08,
    vignette: 45,
  },
  Minimal: {
    solidColor: '#f8fafc',
    gradientEnabled: true,
    gradientType: 'linear',
    gradientAngle: 135,
    gradientStops: [
      { id: 'start', color: '#ffffff', position: 0, opacity: 1 },
      { id: 'end', color: '#e2e8f0', position: 100, opacity: 1 },
    ],
  },
  Technology: { solidColor: '#020617', gradientEnabled: true, gradientAngle: 145, gradientStops: [{ id: 'start', color: '#0ea5e9', position: 0, opacity: 0.55 }, { id: 'end', color: '#111827', position: 100, opacity: 1 }], noise: 10 },
  Coffee: { solidColor: '#2f1d16', gradientEnabled: true, gradientAngle: 120, gradientStops: [{ id: 'start', color: '#92400e', position: 0, opacity: 0.75 }, { id: 'end', color: '#1c120d', position: 100, opacity: 1 }], textureStrength: 25 },
  Sports: { solidColor: '#052e16', gradientEnabled: true, gradientAngle: 35, gradientStops: [{ id: 'start', color: '#22c55e', position: 0, opacity: 0.65 }, { id: 'end', color: '#0f172a', position: 100, opacity: 1 }], contrast: 115 },
  Fashion: { solidColor: '#831843', gradientEnabled: true, gradientType: 'radial', gradientStops: [{ id: 'start', color: '#f9a8d4', position: 0, opacity: 0.45 }, { id: 'end', color: '#4a044e', position: 100, opacity: 1 }], vignette: 30 },
  Editorial: { solidColor: '#fafafa', gradientEnabled: false, overlayColor: '#111827', overlayOpacity: 0.02, noise: 6 },
  Furniture: { solidColor: '#57534e', gradientEnabled: true, gradientAngle: 90, gradientStops: [{ id: 'start', color: '#d6d3d1', position: 0, opacity: 0.9 }, { id: 'end', color: '#44403c', position: 100, opacity: 1 }], textureStrength: 16 },
  Gaming: { solidColor: '#18002b', gradientEnabled: true, gradientAngle: 145, gradientStops: [{ id: 'start', color: '#a855f7', position: 0, opacity: 0.7 }, { id: 'end', color: '#020617', position: 100, opacity: 1 }], noise: 14 },
  Nature: { solidColor: '#14532d', gradientEnabled: true, gradientType: 'radial', gradientStops: [{ id: 'start', color: '#86efac', position: 0, opacity: 0.6 }, { id: 'end', color: '#064e3b', position: 100, opacity: 1 }], saturation: 115 },
};

const EDITABLE_LAYER_IDS: BaseVisualLayerId[] = [
  'product',
  'headline',
  'subheadline',
  'description',
  'cta',
  'price',
  'logo',
  'decorations',
];

const FALLBACK_LAYERS: VisualLayer[] = [
  { id: 'background', label: 'Background', type: 'background', bounds: { x: 0, y: 0, width: 100, height: 100 }, rotation: 0, fontScale: 1, textContent: '', textStyle: DEFAULT_TEXT_STYLE },
  { id: 'decorations', label: 'Decorations', type: 'shape', bounds: { x: 68, y: 68, width: 22, height: 18 }, rotation: 0, fontScale: 1, textContent: '', textStyle: DEFAULT_TEXT_STYLE },
  { id: 'product', label: 'Product', type: 'image', bounds: { x: 54, y: 24, width: 34, height: 42 }, rotation: 0, fontScale: 1, textContent: '', textStyle: DEFAULT_TEXT_STYLE },
  { id: 'headline', label: 'Headline', type: 'text', bounds: { x: 10, y: 12, width: 58, height: 12 }, rotation: 0, fontScale: 1, textContent: 'Your headline', textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 44, fontWeight: 800 } },
  { id: 'subheadline', label: 'Subheadline', type: 'text', bounds: { x: 10, y: 27, width: 50, height: 8 }, rotation: 0, fontScale: 1, textContent: 'A sharp supporting message', textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 22, fontWeight: 500 } },
  { id: 'description', label: 'Description', type: 'text', bounds: { x: 10, y: 36, width: 46, height: 12 }, rotation: 0, fontScale: 1, textContent: '', textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 18, fontWeight: 400, lineHeight: 1.25 } },
  { id: 'price', label: 'Price', type: 'text', bounds: { x: 10, y: 42, width: 24, height: 11 }, rotation: 0, fontScale: 1, textContent: '$99', textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 38, fontWeight: 800 } },
  { id: 'cta', label: 'CTA', type: 'text', bounds: { x: 10, y: 72, width: 34, height: 10 }, rotation: 0, fontScale: 1, textContent: 'Shop now', textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 24, fontWeight: 700, align: 'center' } },
  { id: 'logo', label: 'Logo', type: 'image', bounds: { x: 76, y: 8, width: 14, height: 10 }, rotation: 0, fontScale: 1, textContent: '', textStyle: DEFAULT_TEXT_STYLE },
];

const DECORATION_CATEGORIES: DecorationCategory[] = ['Luxury', 'Technology', 'Sports', 'Fashion', 'Coffee', 'Nature', 'Minimal', 'Business', 'Gaming'];
const DECORATION_TOOLS: Array<{ kind: DecorationKind; label: string }> = [
  { kind: 'circle', label: 'Circle' },
  { kind: 'rectangle', label: 'Rectangle' },
  { kind: 'line', label: 'Line' },
  { kind: 'arrow', label: 'Arrow' },
  { kind: 'star', label: 'Star' },
  { kind: 'triangle', label: 'Triangle' },
  { kind: 'hexagon', label: 'Hexagon' },
  { kind: 'svg', label: 'SVG Icon' },
];

const CATEGORY_COLORS: Record<DecorationCategory, { fill: string; stroke: string; gradientTo: string }> = {
  Luxury: { fill: '#facc15', stroke: '#fef3c7', gradientTo: '#7c2d12' },
  Technology: { fill: '#38bdf8', stroke: '#bae6fd', gradientTo: '#1d4ed8' },
  Sports: { fill: '#22c55e', stroke: '#bbf7d0', gradientTo: '#14532d' },
  Fashion: { fill: '#f472b6', stroke: '#fbcfe8', gradientTo: '#831843' },
  Coffee: { fill: '#a16207', stroke: '#fde68a', gradientTo: '#422006' },
  Nature: { fill: '#84cc16', stroke: '#d9f99d', gradientTo: '#166534' },
  Minimal: { fill: '#f8fafc', stroke: '#94a3b8', gradientTo: '#cbd5e1' },
  Business: { fill: '#60a5fa', stroke: '#bfdbfe', gradientTo: '#1e3a8a' },
  Gaming: { fill: '#a855f7', stroke: '#e9d5ff', gradientTo: '#312e81' },
};

const DEFAULT_LAYER_META: Record<BaseVisualLayerId, LayerMeta> = PANEL_LAYERS.reduce((acc, layer) => {
  acc[layer.id] = { label: layer.label, hidden: false, locked: false };
  return acc;
}, {} as Record<BaseVisualLayerId, LayerMeta>);

const DEFAULT_DECORATIONS: DecorationItem[] = [
  {
    id: 'deco-spark',
    name: 'Accent Star',
    kind: 'star',
    category: 'Luxury',
    x: 76,
    y: 17,
    width: 8,
    height: 8,
    rotation: 12,
    fill: '#facc15',
    stroke: '#fef3c7',
    strokeWidth: 1,
    opacity: 0.9,
    gradient: true,
    gradientFrom: '#fef3c7',
    gradientTo: '#f59e0b',
    shadow: 8,
    glow: 12,
    blur: 0,
    flipX: false,
    flipY: false,
    locked: false,
    hidden: false,
  },
  {
    id: 'deco-line',
    name: 'Accent Line',
    kind: 'line',
    category: 'Minimal',
    x: 10,
    y: 66,
    width: 34,
    height: 3,
    rotation: 0,
    fill: '#ffffff',
    stroke: '#ffffff',
    strokeWidth: 4,
    opacity: 0.65,
    gradient: false,
    gradientFrom: '#ffffff',
    gradientTo: '#cbd5e1',
    shadow: 0,
    glow: 0,
    blur: 0,
    flipX: false,
    flipY: false,
    locked: false,
    hidden: false,
  },
];

const LAYER_ICON: Record<VisualLayer['type'], typeof ImageIcon> = {
  background: Palette,
  image: ImageIcon,
  shape: Square,
  text: Type,
};

const RESIZE_HANDLES: Array<{ id: ResizeHandle; className: string; cursor: string }> = [
  { id: 'top-left', className: '-left-1.5 -top-1.5', cursor: 'cursor-nwse-resize' },
  { id: 'top', className: 'left-1/2 -top-1.5 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  { id: 'top-right', className: '-right-1.5 -top-1.5', cursor: 'cursor-nesw-resize' },
  { id: 'right', className: '-right-1.5 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
  { id: 'bottom-right', className: '-bottom-1.5 -right-1.5', cursor: 'cursor-nwse-resize' },
  { id: 'bottom', className: '-bottom-1.5 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  { id: 'bottom-left', className: '-bottom-1.5 -left-1.5', cursor: 'cursor-nesw-resize' },
  { id: 'left', className: '-left-1.5 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
];

function numberAttr(element: Element, attr: string, fallback: number): number {
  const value = Number(element.getAttribute(attr));
  return Number.isFinite(value) ? value : fallback;
}

function numericStyle(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(String(value).replace('px', ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textStyleFromSvg(text: SVGTextElement | null, fallbackType: BaseVisualLayerId): TextStyle {
  const fallback = FALLBACK_LAYERS.find((layer) => layer.id === fallbackType)?.textStyle ?? DEFAULT_TEXT_STYLE;
  if (!text) return fallback;
  const fontWeight = text.getAttribute('font-weight') ?? '';
  return {
    ...fallback,
    fontSize: numericStyle(text.getAttribute('font-size'), fallback.fontSize),
    fontWeight: fontWeight === 'bold' ? 700 : numericStyle(fontWeight, fallback.fontWeight),
    color: text.getAttribute('fill') ?? fallback.color,
    letterSpacing: numericStyle(text.getAttribute('letter-spacing'), fallback.letterSpacing),
    lineHeight: fallback.lineHeight,
    align: text.getAttribute('text-anchor') === 'middle'
      ? 'center'
      : text.getAttribute('text-anchor') === 'end'
        ? 'right'
        : fallback.align,
    italic: text.getAttribute('font-style') === 'italic',
    underline: text.getAttribute('text-decoration') === 'underline',
  };
}

function normalizeLayerId(type: string, label: string): BaseVisualLayerId | undefined {
  const value = `${type} ${label}`.toLowerCase();
  if (value.includes('product')) return 'product';
  if (value.includes('headline') || value.includes('title')) return 'headline';
  if (value.includes('description') || value.includes('body copy')) return 'description';
  if (value.includes('subheadline') || value.includes('tagline')) return 'subheadline';
  if (value.includes('cta') || value.includes('call')) return 'cta';
  if (value.includes('price')) return 'price';
  if (value.includes('logo') || value.includes('brand')) return 'logo';
  if (value.includes('background')) return 'background';
  if (value.includes('decoration') || value.includes('badge') || value.includes('shape')) return 'decorations';
  return undefined;
}

function parseSvgLayers(svg: string | undefined): VisualLayer[] {
  if (!svg) return [];

  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  const canvasWidth = numberAttr(root, 'width', 100);
  const canvasHeight = numberAttr(root, 'height', 100);
  const byId = new Map<VisualLayerId, VisualLayer>();

  doc.querySelectorAll<SVGGElement>('[data-editor-layer="true"]').forEach((group) => {
    const rawType = group.getAttribute('data-layer-type') ?? '';
    const rawLabel = group.getAttribute('data-layer-label') ?? rawType;
    const id = normalizeLayerId(rawType, rawLabel);
    if (!id || byId.has(id)) return;

    const x = numberAttr(group, 'data-edit-x', numberAttr(group, 'data-layer-x', 0));
    const y = numberAttr(group, 'data-edit-y', numberAttr(group, 'data-layer-y', 0));
    const width = Math.max(numberAttr(group, 'data-layer-width', 0), canvasWidth * 0.04);
    const height = Math.max(numberAttr(group, 'data-layer-height', 0), canvasHeight * 0.04);
    const hasImage = Boolean(group.querySelector('image'));
    const text = group.querySelector('text');
    const hasText = Boolean(text);
    const fallbackLayer = FALLBACK_LAYERS.find((layer) => layer.id === id);

    byId.set(id, {
      id,
      label: PANEL_LAYERS.find((layer) => layer.id === id)?.label ?? rawLabel,
      type: id === 'background' ? 'background' : hasImage ? 'image' : hasText ? 'text' : 'shape',
      bounds: {
        x: (x / canvasWidth) * 100,
        y: (y / canvasHeight) * 100,
        width: (width / canvasWidth) * 100,
        height: (height / canvasHeight) * 100,
      },
      rotation: 0,
      fontScale: 1,
      textContent: text?.textContent?.trim() || fallbackLayer?.textContent || '',
      textStyle: textStyleFromSvg(text, id),
    });
  });

  return PANEL_LAYERS.map(({ id }) => byId.get(id) ?? FALLBACK_LAYERS.find((layer) => layer.id === id))
    .filter((layer): layer is VisualLayer => Boolean(layer));
}

function clampZoom(value: number): number {
  return Math.min(2, Math.max(0.25, value));
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function clampBounds(bounds: LayerBounds): LayerBounds {
  const width = Math.min(100, Math.max(0, bounds.width));
  const height = Math.min(100, Math.max(0, bounds.height));
  return {
    x: Math.min(100 - width, Math.max(0, bounds.x)),
    y: Math.min(100 - height, Math.max(0, bounds.y)),
    width,
    height,
  };
}

function clampLayerBounds(layer: VisualLayer | undefined, bounds: LayerBounds): LayerBounds {
  const clamped = clampBounds(bounds);
  if (layer?.type !== 'image') return clamped;

  const maxX = Math.max(POSTER_SAFE_MARGIN, 100 - POSTER_SAFE_MARGIN - clamped.width);
  const maxY = Math.max(POSTER_SAFE_MARGIN, 100 - POSTER_SAFE_MARGIN - clamped.height);
  return {
    ...clamped,
    x: Math.min(maxX, Math.max(POSTER_SAFE_MARGIN, clamped.x)),
    y: Math.min(maxY, Math.max(POSTER_SAFE_MARGIN, clamped.y)),
  };
}

function getCenter(bounds: LayerBounds): { x: number; y: number } {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

function getGroupBounds(layers: VisualLayer[]): LayerBounds {
  const left = Math.min(...layers.map((layer) => layer.bounds.x));
  const top = Math.min(...layers.map((layer) => layer.bounds.y));
  const right = Math.max(...layers.map((layer) => layer.bounds.x + layer.bounds.width));
  const bottom = Math.max(...layers.map((layer) => layer.bounds.y + layer.bounds.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function getBoundsFromTransform(layer: VisualLayer, transform?: LayerTransform): LayerBounds {
  return {
    x: transform?.x ?? layer.bounds.x,
    y: transform?.y ?? layer.bounds.y,
    width: transform?.width ?? layer.bounds.width,
    height: transform?.height ?? layer.bounds.height,
  };
}

function getLayerRotation(layer: VisualLayer, transform?: LayerTransform): number {
  return transform?.rotation ?? layer.rotation;
}

function getMinimumSize(rect: DOMRect): { width: number; height: number } {
  return {
    width: Math.min(100, (24 / Math.max(rect.width, 1)) * 100),
    height: Math.min(100, (24 / Math.max(rect.height, 1)) * 100),
  };
}

function normalizeAngle(angle: number): number {
  return Math.round((((angle % 360) + 540) % 360) - 180);
}

function intersects(a: SelectionBox, b: LayerBounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function formatZoom(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function getPosterRatio(size: Poster['size']): string {
  switch (size) {
    case 'portrait':
      return '4 / 5';
    case 'landscape':
      return '16 / 9';
    case 'story':
      return '9 / 16';
    case 'a4_portrait':
      return '1 / 1.414';
    case 'square':
    default:
      return '1 / 1';
  }
}

export default function VisualPosterEditor({ poster }: VisualPosterEditorProps) {
  const [selectedLayerIds, setSelectedLayerIds] = useState<VisualLayerId[]>(['product']);
  const [hoveredLayerId, setHoveredLayerId] = useState<VisualLayerId | null>(null);
  const [layerTransforms, setLayerTransforms] = useState<Partial<Record<VisualLayerId, LayerTransform>>>({});
  const [layerText, setLayerText] = useState<Partial<Record<VisualLayerId, LayerTextState>>>({});
  const [imageEdits, setImageEdits] = useState<Partial<Record<VisualLayerId, ImageEditState>>>({});
  const [backgroundEdit, setBackgroundEdit] = useState<BackgroundEditState>(DEFAULT_BACKGROUND_STATE);
  const [decorations, setDecorations] = useState<DecorationItem[]>(DEFAULT_DECORATIONS);
  const [selectedDecorationIds, setSelectedDecorationIds] = useState<string[]>([]);
  const [decorationGroups, setDecorationGroups] = useState<DecorationGroup[]>([]);
  const [decorationCategory, setDecorationCategory] = useState<DecorationCategory>('Luxury');
  const [layerMeta, setLayerMeta] = useState<Record<BaseVisualLayerId, LayerMeta>>(DEFAULT_LAYER_META);
  const [duplicatedLayers, setDuplicatedLayers] = useState<VisualLayer[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [redoEntries, setRedoEntries] = useState<HistoryEntry[]>([]);
  const [activePosterId, setActivePosterId] = useState(poster.id);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving' | 'failed'>('saved');
  const [lastSavedHash, setLastSavedHash] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [versionHistory, setVersionHistory] = useState<EditorVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [recoverySession, setRecoverySession] = useState<RecoverySession | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [clipboard, setClipboard] = useState<ClipboardPayload | null>(null);
  const [layerSearch, setLayerSearch] = useState('');
  const [panelLayerOrder, setPanelLayerOrder] = useState<BaseVisualLayerId[]>(PANEL_LAYERS.map((layer) => layer.id));
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [spacePanActive, setSpacePanActive] = useState(false);
  const [layersCollapsed, setLayersCollapsed] = useState(() => window.localStorage.getItem('visual-editor:layers-collapsed') === 'true');
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(() => window.localStorage.getItem('visual-editor:properties-collapsed') === 'true');
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [alignmentIndicators, setAlignmentIndicators] = useState<AlignmentIndicator[]>([]);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [transformFeedback, setTransformFeedback] = useState<TransformFeedback | null>(null);
  const [editingTextLayerId, setEditingTextLayerId] = useState<VisualLayerId | null>(null);
  const [dragOverImageLayerId, setDragOverImageLayerId] = useState<VisualLayerId | null>(null);
  const [dragOverBackground, setDragOverBackground] = useState(false);
  const [propertyPanelOpen, setPropertyPanelOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const resizeSessionRef = useRef<ResizeSession | null>(null);
  const rotationSessionRef = useRef<RotationSession | null>(null);
  const cropSessionRef = useRef<CropSession | null>(null);
  const decorationDragSessionRef = useRef<DecorationDragSession | null>(null);
  const selectionBoxSessionRef = useRef<SelectionBoxSession | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const rotationFrameRef = useRef<number | null>(null);
  const decorationDragFrameRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const pendingResizeRef = useRef<{ clientX: number; clientY: number; altKey: boolean; shiftKey: boolean } | null>(null);
  const pendingRotationRef = useRef<{ clientX: number; clientY: number; shiftKey: boolean } | null>(null);
  const pendingDecorationDragRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const duplicateCounterRef = useRef(0);
  const decorationCounterRef = useRef(DEFAULT_DECORATIONS.length);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const svgInputRef = useRef<HTMLInputElement | null>(null);
  const editableTextRefs = useRef<Partial<Record<VisualLayerId, HTMLDivElement | null>>>({});
  const panStartRef = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 });
  const snapshotRef = useRef<EditorSnapshot | null>(null);
  const pendingHistoryRef = useRef<{ label: string; before: EditorSnapshot } | null>(null);
  const historyTimerRef = useRef<number | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const isRestoringHistoryRef = useRef(false);
  const isInitializingRef = useRef(false);
  const isSavingRef = useRef(false);
  const textEditHistoryRef = useRef<{ layerId: VisualLayerId; label: string; before: EditorSnapshot } | null>(null);

  const baseLayers = useMemo(() => parseSvgLayers(poster.editableSvg), [poster.editableSvg]);
  const layers = useMemo(
    () =>
      [...baseLayers, ...duplicatedLayers].map((layer) => {
        const transform = layerTransforms[layer.id];
        const text = layerText[layer.id];
        return transform
          ? {
              ...layer,
              label: !layer.id.startsWith('duplicate-') ? layerMeta[layer.id as BaseVisualLayerId]?.label ?? layer.label : layer.label,
              bounds: getBoundsFromTransform(layer, transform),
              rotation: transform.rotation ?? layer.rotation,
              fontScale: transform.fontScale ?? layer.fontScale,
              textContent: text?.content ?? layer.textContent,
              textStyle: text?.style ?? layer.textStyle,
            }
          : {
              ...layer,
              label: !layer.id.startsWith('duplicate-') ? layerMeta[layer.id as BaseVisualLayerId]?.label ?? layer.label : layer.label,
              textContent: text?.content ?? layer.textContent,
              textStyle: text?.style ?? layer.textStyle,
            };
      }),
    [baseLayers, duplicatedLayers, layerMeta, layerText, layerTransforms]
  );
  const selectedLayer = selectedLayerIds.length === 1
    ? layers.find((layer) => layer.id === selectedLayerIds[0])
    : undefined;
  const selectedLayers = layers.filter((layer) => selectedLayerIds.includes(layer.id));
  const selectedGroupBounds = selectedLayers.length > 0 ? getGroupBounds(selectedLayers) : null;
  const selectedGroupRotation = selectedLayers.length === 1 ? selectedLayers[0]?.rotation ?? 0 : 0;
  const selectedTextState = selectedLayer?.type === 'text' ? getTextState(selectedLayer) : null;
  const selectedImageState = selectedLayer?.type === 'image' ? getImageState(selectedLayer.id) : null;
  const selectedBackgroundState = selectedLayer?.id === 'background' ? backgroundEdit : null;
  const decorationMode = selectedLayerIds.includes('decorations');
  const selectedDecorations = useMemo(
    () => decorations.filter((decoration) => selectedDecorationIds.includes(decoration.id)),
    [decorations, selectedDecorationIds]
  );
  const activeDecoration = selectedDecorations.length === 1 ? selectedDecorations[0] : undefined;
  const visibleDecorations = useMemo(
    () => decorations.filter((decoration) => !decoration.hidden && !layerMeta.decorations.hidden),
    [decorations, layerMeta.decorations.hidden]
  );
  const panelLayers = useMemo(() => {
    const query = layerSearch.trim().toLowerCase();
    return panelLayerOrder
      .map((id) => PANEL_LAYERS.find((layer) => layer.id === id))
      .filter((item): item is { id: BaseVisualLayerId; label: string } => Boolean(item))
      .filter((item) => {
        if (!query) return true;
        const meta = layerMeta[item.id];
        return item.label.toLowerCase().includes(query) || meta.label.toLowerCase().includes(query);
      });
  }, [layerMeta, layerSearch, panelLayerOrder]);
  const layerSections = useMemo(
    () =>
      LAYER_SECTIONS.map((section) => ({
        ...section,
        layers: panelLayers.filter((item) => section.layerIds.includes(item.id)),
      })).filter((section) => section.layers.length > 0),
    [panelLayers]
  );

  function cloneSnapshot<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function getEditorSnapshot(): EditorSnapshot {
    return cloneSnapshot({
      layerTransforms,
      layerText,
      imageEdits,
      backgroundEdit,
      decorations,
      selectedDecorationIds,
      decorationGroups,
      decorationCategory,
      layerMeta,
      duplicatedLayers,
      selectedLayerIds,
    });
  }

  function getEditorDocumentState(): EditorDocumentState {
    return cloneSnapshot({
      layerTransforms,
      layerText,
      imageEdits,
      backgroundEdit,
      decorations,
      decorationGroups,
      decorationCategory,
      layerMeta,
      duplicatedLayers,
    });
  }

  function documentHash(state = getEditorDocumentState()): string {
    return JSON.stringify(state);
  }

  function applyEditorDocumentState(state: EditorDocumentState) {
    isInitializingRef.current = true;
    setLayerTransforms(state.layerTransforms ?? {});
    setLayerText(state.layerText ?? {});
    setImageEdits(state.imageEdits ?? {});
    setBackgroundEdit(state.backgroundEdit ?? DEFAULT_BACKGROUND_STATE);
    setDecorations(state.decorations ?? DEFAULT_DECORATIONS);
    setDecorationGroups(state.decorationGroups ?? []);
    setDecorationCategory(state.decorationCategory ?? 'Luxury');
    setLayerMeta(state.layerMeta ?? DEFAULT_LAYER_META);
    setDuplicatedLayers(state.duplicatedLayers ?? []);
    window.setTimeout(() => {
      isInitializingRef.current = false;
    }, 0);
  }

  function isEditorDocumentState(value: unknown): value is EditorDocumentState {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<EditorDocumentState>;
    return Boolean(candidate.backgroundEdit && candidate.layerMeta && Array.isArray(candidate.decorations));
  }

  function parsePersistedEditorState(value: unknown): PersistedEditorState | null {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<PersistedEditorState>;
    if (candidate.schemaVersion === 1 && isEditorDocumentState(candidate.state)) {
      return {
        schemaVersion: 1,
        savedAt: typeof candidate.savedAt === 'string' ? candidate.savedAt : undefined,
        state: candidate.state,
        versionHistory: Array.isArray(candidate.versionHistory) ? candidate.versionHistory.filter((version) => isEditorDocumentState(version?.state)) : [],
      };
    }
    if (isEditorDocumentState(value)) {
      return { schemaVersion: 1, state: value, versionHistory: [] };
    }
    return null;
  }

  function recoveryKey(id = activePosterId): string {
    return `visual-poster-editor:${id}:recovery`;
  }

  function readRecoverySession(id: string): RecoverySession | null {
    try {
      const raw = window.localStorage.getItem(recoveryKey(id));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<RecoverySession>;
      if (typeof parsed.hash === 'string' && typeof parsed.savedAt === 'string' && isEditorDocumentState(parsed.state)) {
        return { hash: parsed.hash, savedAt: parsed.savedAt, state: parsed.state };
      }
    } catch {
      return null;
    }
    return null;
  }

  function writeRecoverySession(hash: string, state: EditorDocumentState) {
    try {
      window.localStorage.setItem(recoveryKey(), JSON.stringify({ hash, state, savedAt: new Date().toISOString() }));
    } catch {
      // Local recovery is best effort; failed browser storage should not block editing.
    }
  }

  function clearRecoverySession(id = activePosterId) {
    try {
      window.localStorage.removeItem(recoveryKey(id));
    } catch {
      // Best effort.
    }
  }

  function buildFallbackEditableSvg(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><g data-editor-layer="true" data-layer-type="background" data-layer-label="Background" data-edit-x="0" data-edit-y="0" data-layer-width="1000" data-layer-height="1000"><rect width="1000" height="1000" fill="#ffffff"/></g></svg>';
  }

  function buildSaveSvg(): string {
    return poster.editableSvg?.trim() || buildFallbackEditableSvg();
  }

  function buildPersistedEditorState(state: EditorDocumentState, versions: EditorVersion[], savedAt: string): PersistedEditorState {
    return {
      schemaVersion: 1,
      savedAt,
      state,
      versionHistory: versions.slice(-HISTORY_LIMIT),
    };
  }

  function applyEditorSnapshot(snapshot: EditorSnapshot) {
    isRestoringHistoryRef.current = true;
    setLayerTransforms(snapshot.layerTransforms);
    setLayerText(snapshot.layerText);
    setImageEdits(snapshot.imageEdits);
    setBackgroundEdit(snapshot.backgroundEdit);
    setDecorations(snapshot.decorations);
    setSelectedDecorationIds(snapshot.selectedDecorationIds);
    setDecorationGroups(snapshot.decorationGroups);
    setDecorationCategory(snapshot.decorationCategory);
    setLayerMeta(snapshot.layerMeta);
    setDuplicatedLayers(snapshot.duplicatedLayers);
    setSelectedLayerIds(snapshot.selectedLayerIds);
    setGuides([]);
    setAlignmentIndicators([]);
    setSelectionBox(null);
    setTransformFeedback(null);
    setEditingTextLayerId(null);
    setPropertyPanelOpen(false);
    window.setTimeout(() => {
      isRestoringHistoryRef.current = false;
    }, 0);
  }

  function sameSnapshot(a: EditorSnapshot, b: EditorSnapshot): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function pushHistory(label: string, before: EditorSnapshot, after?: EditorSnapshot) {
    const nextAfter = after ?? snapshotRef.current ?? getEditorSnapshot();
    if (isRestoringHistoryRef.current || sameSnapshot(before, nextAfter)) return;
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      before: cloneSnapshot(before),
      after: cloneSnapshot(nextAfter),
      createdAt: Date.now(),
    };
    setHistoryEntries((current) => [entry, ...current].slice(0, HISTORY_LIMIT));
    setRedoEntries([]);
  }

  function flushPendingHistory() {
    const pending = pendingHistoryRef.current;
    if (!pending) return;
    pendingHistoryRef.current = null;
    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    pushHistory(pending.label, pending.before);
  }

  function queueHistory(label: string, delay = 350) {
    if (isRestoringHistoryRef.current) return;
    if (!pendingHistoryRef.current) {
      pendingHistoryRef.current = { label, before: getEditorSnapshot() };
    } else {
      pendingHistoryRef.current.label = label;
    }
    if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(flushPendingHistory, delay);
  }

  function pushHistoryAfterRender(label: string, before: EditorSnapshot) {
    window.setTimeout(() => pushHistory(label, before), 0);
  }

  function undoHistory() {
    flushPendingHistory();
    const entry = historyEntries[0];
    if (!entry) return;
    applyEditorSnapshot(entry.before);
    setHistoryEntries((current) => current.slice(1));
    setRedoEntries((current) => [entry, ...current]);
  }

  function redoHistory() {
    flushPendingHistory();
    const entry = redoEntries[0];
    if (!entry) return;
    applyEditorSnapshot(entry.after);
    setRedoEntries((current) => current.slice(1));
    setHistoryEntries((current) => [entry, ...current].slice(0, HISTORY_LIMIT));
  }

  async function saveCurrentPoster(saveAsNew = false) {
    flushPendingHistory();
    const state = getEditorDocumentState();
    const hash = documentHash(state);
    if (!saveAsNew && hash === lastSavedHash) {
      setSaveStatus('saved');
      return;
    }
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setSaveStatus('saving');
    const savedAt = new Date().toISOString();
    const nextVersion: EditorVersion = {
      id: `version-${Date.now()}`,
      label: `Version ${versionHistory.length + 1}`,
      timestamp: savedAt,
      state,
    };
    const nextVersions = [...versionHistory, nextVersion].slice(-HISTORY_LIMIT);

    try {
      const savedPoster = await savePosterEdit(activePosterId, {
        svg: buildSaveSvg(),
        editState: buildPersistedEditorState(state, nextVersions, savedAt),
        saveAsNew,
      });
      if (saveAsNew) setActivePosterId(savedPoster.id);
      setVersionHistory(nextVersions);
      setLastSavedHash(hash);
      setLastSavedAt(new Date(savedAt));
      setSaveStatus('saved');
      setRecoverySession(null);
      clearRecoverySession(activePosterId);
    } catch (error) {
      console.error('[VisualPosterEditor] Save failed', error);
      setSaveStatus('failed');
    } finally {
      isSavingRef.current = false;
    }
  }

  function restoreVersion(version: EditorVersion) {
    applyEditorDocumentState(version.state);
    setSaveStatus('dirty');
    setShowVersionHistory(false);
    window.setTimeout(() => {
      const state = cloneSnapshot(version.state);
      writeRecoverySession(documentHash(state), state);
    }, 0);
  }

  function restoreRecoverySession() {
    if (!recoverySession) return;
    applyEditorDocumentState(recoverySession.state);
    setSaveStatus('dirty');
    setRecoverySession(null);
  }

  function discardRecoverySession() {
    clearRecoverySession(poster.id);
    setRecoverySession(null);
  }

  useEffect(() => {
    if (isInitializingRef.current || isRestoringHistoryRef.current) return;
    if (!lastSavedHash) return;
    const state = getEditorDocumentState();
    const hash = documentHash(state);

    if (hash === lastSavedHash) {
      if (saveStatus !== 'saving') setSaveStatus('saved');
      clearRecoverySession();
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    if (saveStatus !== 'saving' && saveStatus !== 'failed') setSaveStatus('dirty');
    writeRecoverySession(hash, state);
    if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      void saveCurrentPoster(false);
    }, AUTOSAVE_DELAY_MS);
  }, [
    backgroundEdit,
    decorationCategory,
    decorationGroups,
    decorations,
    duplicatedLayers,
    imageEdits,
    lastSavedHash,
    layerMeta,
    layerText,
    layerTransforms,
    saveStatus,
  ]);

  useEffect(() => {
    snapshotRef.current = getEditorSnapshot();
  }, [
    backgroundEdit,
    decorationCategory,
    decorationGroups,
    decorations,
    duplicatedLayers,
    imageEdits,
    layerMeta,
    layerText,
    layerTransforms,
    selectedDecorationIds,
    selectedLayerIds,
  ]);

  useEffect(() => {
    window.localStorage.setItem('visual-editor:layers-collapsed', String(layersCollapsed));
  }, [layersCollapsed]);

  useEffect(() => {
    window.localStorage.setItem('visual-editor:properties-collapsed', String(propertiesCollapsed));
  }, [propertiesCollapsed]);

  useEffect(() => {
    const persisted = parsePersistedEditorState(poster.editState);
    const initialDocumentState = persisted?.state ?? cloneSnapshot({
      layerTransforms: {},
      layerText: {},
      imageEdits: {},
      backgroundEdit: DEFAULT_BACKGROUND_STATE,
      decorations: DEFAULT_DECORATIONS,
      decorationGroups: [],
      decorationCategory: 'Luxury',
      layerMeta: DEFAULT_LAYER_META,
      duplicatedLayers: [],
    } satisfies EditorDocumentState);
    const initialHash = documentHash(initialDocumentState);
    const recovery = readRecoverySession(poster.id);

    isInitializingRef.current = true;
    setActivePosterId(poster.id);
    setSelectedLayerIds(['product']);
    setHoveredLayerId(null);
    setLayerTransforms(initialDocumentState.layerTransforms);
    setLayerText(initialDocumentState.layerText);
    setImageEdits(initialDocumentState.imageEdits);
    setBackgroundEdit(initialDocumentState.backgroundEdit);
    setDecorations(initialDocumentState.decorations);
    setSelectedDecorationIds([]);
    setDecorationGroups(initialDocumentState.decorationGroups);
    setDecorationCategory(initialDocumentState.decorationCategory);
    setLayerMeta(initialDocumentState.layerMeta);
    setDuplicatedLayers(initialDocumentState.duplicatedLayers);
    setVersionHistory(persisted?.versionHistory ?? []);
    setLastSavedHash(initialHash);
    setLastSavedAt(persisted?.savedAt ? new Date(persisted.savedAt) : null);
    setSaveStatus('saved');
    setRecoverySession(recovery && recovery.hash !== initialHash ? recovery : null);
    setContextMenu(null);
    setClipboard(null);
    setLayerSearch('');
    setPanelLayerOrder(PANEL_LAYERS.map((layer) => layer.id));
    setCollapsedGroupIds([]);
    setSpacePanActive(false);
    setHistoryEntries([]);
    setRedoEntries([]);
    pendingHistoryRef.current = null;
    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
    setGuides([]);
    setAlignmentIndicators([]);
    setSelectionBox(null);
    setTransformFeedback(null);
    setEditingTextLayerId(null);
    setDragOverImageLayerId(null);
    setDragOverBackground(false);
    setPropertyPanelOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    window.setTimeout(() => {
      isInitializingRef.current = false;
    }, 0);
  }, [poster.id]);

  useEffect(() => {
    return () => {
      if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
      if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current);
      if (rotationFrameRef.current !== null) window.cancelAnimationFrame(rotationFrameRef.current);
      if (decorationDragFrameRef.current !== null) window.cancelAnimationFrame(decorationDragFrameRef.current);
      if (historyTimerRef.current !== null) window.clearTimeout(historyTimerRef.current);
      if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  function isEditableLayer(id: VisualLayerId): boolean {
    return id.startsWith('duplicate-') || EDITABLE_LAYER_IDS.includes(id as BaseVisualLayerId);
  }

  function isLayerLocked(id: VisualLayerId): boolean {
    if (id.startsWith('duplicate-')) return false;
    return Boolean(layerMeta[id as BaseVisualLayerId]?.locked);
  }

  function isLayerHidden(id: VisualLayerId): boolean {
    if (id.startsWith('duplicate-')) return false;
    return Boolean(layerMeta[id as BaseVisualLayerId]?.hidden);
  }

  function getLayerById(id: VisualLayerId): VisualLayer | undefined {
    return layers.find((layer) => layer.id === id);
  }

  function getLayerBounds(id: VisualLayerId, transforms = layerTransforms): LayerBounds | undefined {
    const layer = [...baseLayers, ...duplicatedLayers].find((item) => item.id === id);
    if (!layer) return undefined;
    return getBoundsFromTransform(layer, transforms[id]);
  }

  function getLayerTransform(id: VisualLayerId, transforms = layerTransforms): LayerTransform | undefined {
    const layer = [...baseLayers, ...duplicatedLayers].find((item) => item.id === id);
    if (!layer) return undefined;
    return {
      x: transforms[id]?.x ?? layer.bounds.x,
      y: transforms[id]?.y ?? layer.bounds.y,
      width: transforms[id]?.width ?? layer.bounds.width,
      height: transforms[id]?.height ?? layer.bounds.height,
      rotation: getLayerRotation(layer, transforms[id]),
      fontScale: transforms[id]?.fontScale ?? layer.fontScale,
    };
  }

  function commitLayerTransforms(nextTransforms: Partial<Record<VisualLayerId, LayerTransform>>, historyLabel?: string | false) {
    if (historyLabel) queueHistory(historyLabel);
    setLayerTransforms((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(nextTransforms).map(([id, transform]) => [
          id,
          { ...current[id as VisualLayerId], ...transform },
        ])
      ),
    }));
  }

  function getTextState(layer: VisualLayer): LayerTextState {
    return layerText[layer.id] ?? { content: layer.textContent, style: layer.textStyle };
  }

  function getImageState(layerId: VisualLayerId): ImageEditState {
    return imageEdits[layerId] ?? DEFAULT_IMAGE_STATE;
  }

  function updateImageState(layerId: VisualLayerId, patch: Partial<Omit<ImageEditState, 'crop'>> & { crop?: Partial<CropState> }, historyLabel: string | false = 'Changed Image') {
    if (historyLabel) queueHistory(historyLabel);
    setImageEdits((current) => {
      const existing = current[layerId] ?? DEFAULT_IMAGE_STATE;
      return {
        ...current,
        [layerId]: {
          ...existing,
          ...patch,
          crop: { ...existing.crop, ...patch.crop },
        },
      };
    });
  }

  function isSupportedImage(file: File): boolean {
    return ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type);
  }

  function readImageFile(layerId: VisualLayerId, file: File) {
    if (!isSupportedImage(file)) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateImageState(layerId, {
        src: typeof reader.result === 'string' ? reader.result : undefined,
        fileName: file.name,
        scale: 1,
        flipX: false,
        flipY: false,
        opacity: 1,
        crop: DEFAULT_IMAGE_STATE.crop,
      }, `Uploaded ${getLayerById(layerId)?.label ?? 'Image'}`);
      setSelectedLayerIds([layerId]);
      setPropertyPanelOpen(true);
    };
    reader.readAsDataURL(file);
  }

  function handleImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && selectedLayer?.type === 'image') readImageFile(selectedLayer.id, file);
    event.currentTarget.value = '';
  }

  function resetCrop(layerId: VisualLayerId) {
    updateImageState(layerId, { crop: DEFAULT_IMAGE_STATE.crop }, 'Reset Image Crop');
  }

  function getPointInLayer(clientX: number, clientY: number, rect: DOMRect, bounds: LayerBounds): { x: number; y: number } {
    const canvasPoint = getPointInCanvas(clientX, clientY, rect);
    return {
      x: clampPercent(((canvasPoint.x - bounds.x) / Math.max(bounds.width, 0.001)) * 100),
      y: clampPercent(((canvasPoint.y - bounds.y) / Math.max(bounds.height, 0.001)) * 100),
    };
  }

  function handleCropPointerDown(event: PointerEvent<HTMLElement>, layer: VisualLayer, handle: CropHandle) {
    event.stopPropagation();
    if (event.button !== 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const imageState = getImageState(layer.id);
    cropSessionRef.current = {
      pointerId: event.pointerId,
      layerId: layer.id,
      handle,
      canvasRect: rect,
      startPoint: getPointInLayer(event.clientX, event.clientY, rect, layer.bounds),
      startCrop: imageState.crop,
      layerBounds: layer.bounds,
      historyBefore: getEditorSnapshot(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCropPointerMove(event: PointerEvent<HTMLElement>) {
    const session = cropSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = getPointInLayer(event.clientX, event.clientY, session.canvasRect, session.layerBounds);
    const deltaX = point.x - session.startPoint.x;
    const deltaY = point.y - session.startPoint.y;
    const crop = session.startCrop;
    let next = { ...crop };

    if (session.handle === 'move') {
      next.x = Math.min(100 - crop.width, Math.max(0, crop.x + deltaX));
      next.y = Math.min(100 - crop.height, Math.max(0, crop.y + deltaY));
    } else {
      const min = 12;
      let left = crop.x;
      let top = crop.y;
      let right = crop.x + crop.width;
      let bottom = crop.y + crop.height;
      if (session.handle.includes('left')) left += deltaX;
      if (session.handle.includes('right')) right += deltaX;
      if (session.handle.includes('top')) top += deltaY;
      if (session.handle.includes('bottom')) bottom += deltaY;
      left = clampPercent(left);
      top = clampPercent(top);
      right = clampPercent(right);
      bottom = clampPercent(bottom);
      next = {
        ...crop,
        x: Math.min(left, right - min),
        y: Math.min(top, bottom - min),
        width: Math.max(min, right - left),
        height: Math.max(min, bottom - top),
      };
    }

    updateImageState(session.layerId, { crop: next }, false);
  }

  function handleCropPointerEnd(event: PointerEvent<HTMLElement>) {
    const session = cropSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    cropSessionRef.current = null;
    pushHistoryAfterRender('Changed Image Crop', session.historyBefore);
  }

  function handleImageDrop(event: DragEvent<HTMLButtonElement>, layerId: VisualLayerId) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverImageLayerId(null);
    const file = event.dataTransfer.files?.[0];
    if (file) readImageFile(layerId, file);
  }

  function updateBackgroundState(patch: Partial<BackgroundEditState>, historyLabel: string | false = 'Changed Background') {
    if (historyLabel) queueHistory(historyLabel);
    setBackgroundEdit((current) => ({
      ...current,
      ...patch,
      gradientStops: patch.gradientStops ?? current.gradientStops,
    }));
  }

  function applyBackgroundPreset(name: string) {
    const preset = BACKGROUND_PRESETS[name];
    if (!preset) return;
    queueHistory(`Applied ${name} Background`, 0);
    setBackgroundEdit((current) => ({
      ...current,
      ...preset,
      preset: name,
      gradientStops: preset.gradientStops ?? current.gradientStops,
    }));
  }

  function readBackgroundFile(file: File) {
    if (!isSupportedImage(file)) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateBackgroundState({
        imageSrc: typeof reader.result === 'string' ? reader.result : undefined,
        imageName: file.name,
      }, 'Uploaded Background');
      setSelectedLayerIds(['background']);
      setPropertyPanelOpen(true);
    };
    reader.readAsDataURL(file);
  }

  function handleBackgroundInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) readBackgroundFile(file);
    event.currentTarget.value = '';
  }

  function handleBackgroundDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverBackground(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readBackgroundFile(file);
  }

  function updateGradientStop(id: string, patch: Partial<GradientStop>) {
    queueHistory('Changed Background Gradient');
    updateBackgroundState({
      gradientStops: backgroundEdit.gradientStops.map((stop) =>
        stop.id === id ? { ...stop, ...patch } : stop
      ),
    }, false);
  }

  function backgroundGradient(state: BackgroundEditState): string {
    const stops = state.gradientStops
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((stop) => `${hexToRgba(stop.color, stop.opacity)} ${stop.position}%`)
      .join(', ');
    return state.gradientType === 'radial'
      ? `radial-gradient(circle at center, ${stops})`
      : `linear-gradient(${state.gradientAngle}deg, ${stops})`;
  }

  function hexToRgba(hex: string, opacity: number): string {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
      ? normalized.split('').map((char) => `${char}${char}`).join('')
      : normalized;
    const int = Number.parseInt(value, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  function backgroundObjectFit(mode: BackgroundImageMode): 'cover' | 'contain' | 'fill' | 'none' {
    if (mode === 'fit') return 'contain';
    if (mode === 'stretch') return 'fill';
    if (mode === 'center') return 'none';
    return 'cover';
  }

  function backgroundHasChanges(state: BackgroundEditState): boolean {
    return JSON.stringify(state) !== JSON.stringify(DEFAULT_BACKGROUND_STATE);
  }

  function getDecorationBounds(decoration: DecorationItem): LayerBounds {
    return { x: decoration.x, y: decoration.y, width: decoration.width, height: decoration.height };
  }

  function clampDecorationBounds(bounds: LayerBounds): LayerBounds {
    const width = Math.min(100, Math.max(1, bounds.width));
    const height = Math.min(100, Math.max(1, bounds.height));
    return {
      x: Math.min(100 - width, Math.max(0, bounds.x)),
      y: Math.min(100 - height, Math.max(0, bounds.y)),
      width,
      height,
    };
  }

  function selectLayerFromPanel(id: BaseVisualLayerId) {
    setSelectedLayerIds([id]);
    setSelectedDecorationIds(id === 'decorations' ? selectedDecorationIds : []);
    setPropertyPanelOpen(false);
  }

  function updateLayerMeta(id: BaseVisualLayerId, patch: Partial<LayerMeta>, historyLabel?: string | false) {
    const label = historyLabel
      ?? (patch.label !== undefined
        ? 'Renamed Layer'
        : patch.locked !== undefined
          ? `${patch.locked ? 'Locked' : 'Unlocked'} Layer`
          : patch.hidden !== undefined
            ? `${patch.hidden ? 'Hid' : 'Showed'} Layer`
            : 'Changed Layer');
    if (label) queueHistory(label);
    setLayerMeta((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function updateDecoration(id: string, patch: Partial<DecorationItem>, historyLabel: string | false = 'Changed Decoration') {
    if (historyLabel) queueHistory(historyLabel);
    setDecorations((current) =>
      current.map((decoration) =>
        decoration.id === id ? { ...decoration, ...patch } : decoration
      )
    );
  }

  function updateSelectedDecorations(patch: Partial<DecorationItem>, historyLabel: string | false = 'Changed Decoration') {
    if (historyLabel) queueHistory(historyLabel);
    setDecorations((current) =>
      current.map((decoration) =>
        selectedDecorationIds.includes(decoration.id) && !decoration.locked
          ? { ...decoration, ...patch }
          : decoration
      )
    );
  }

  function addDecoration(kind: DecorationKind, category = decorationCategory) {
    const historyBefore = getEditorSnapshot();
    decorationCounterRef.current += 1;
    const colors = CATEGORY_COLORS[category];
    const id = `deco-${kind}-${decorationCounterRef.current}`;
    const isLine = kind === 'line' || kind === 'arrow';
    const decoration: DecorationItem = {
      id,
      name: `${category} ${DECORATION_TOOLS.find((tool) => tool.kind === kind)?.label ?? 'Decoration'}`,
      kind,
      category,
      x: 38 + (decorationCounterRef.current % 5) * 3,
      y: 38 + (decorationCounterRef.current % 4) * 3,
      width: isLine ? 24 : 14,
      height: isLine ? 5 : 14,
      rotation: 0,
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: isLine ? 5 : 2,
      opacity: 1,
      gradient: kind !== 'line',
      gradientFrom: colors.fill,
      gradientTo: colors.gradientTo,
      shadow: 0,
      glow: 0,
      blur: 0,
      flipX: false,
      flipY: false,
      locked: false,
      hidden: false,
      svgMarkup: kind === 'svg'
        ? '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 2l2.9 6.8 7.1.6-5.4 4.7 1.6 6.9L12 17.4 5.8 21l1.6-6.9L2 9.4l7.1-.6L12 2z"/></svg>'
        : undefined,
    };
    setDecorations((current) => [...current, decoration]);
    setSelectedLayerIds(['decorations']);
    setSelectedDecorationIds([id]);
    setPropertyPanelOpen(true);
    pushHistoryAfterRender(`Added ${DECORATION_TOOLS.find((tool) => tool.kind === kind)?.label ?? 'Decoration'}`, historyBefore);
  }

  function duplicateDecorations() {
    if (selectedDecorationIds.length === 0) return;
    const historyBefore = getEditorSnapshot();
    const copies = decorations
      .filter((decoration) => selectedDecorationIds.includes(decoration.id) && !decoration.locked)
      .map((decoration) => {
        decorationCounterRef.current += 1;
        return {
          ...decoration,
          id: `${decoration.id}-copy-${decorationCounterRef.current}`,
          name: `${decoration.name} copy`,
          x: Math.min(100 - decoration.width, decoration.x + 3),
          y: Math.min(100 - decoration.height, decoration.y + 3),
        };
      });
    if (copies.length === 0) return;
    setDecorations((current) => [...current, ...copies]);
    setSelectedDecorationIds(copies.map((copy) => copy.id));
    setSelectedLayerIds(['decorations']);
    pushHistoryAfterRender('Duplicated Decoration', historyBefore);
  }

  function deleteSelectedDecorations() {
    if (selectedDecorationIds.length === 0) return;
    const historyBefore = getEditorSnapshot();
    setDecorations((current) =>
      current.filter((decoration) => !selectedDecorationIds.includes(decoration.id) || decoration.locked)
    );
    setDecorationGroups((current) =>
      current
        .map((group) => ({ ...group, memberIds: group.memberIds.filter((id) => !selectedDecorationIds.includes(id)) }))
        .filter((group) => group.memberIds.length > 1)
    );
    setSelectedDecorationIds([]);
    pushHistoryAfterRender('Deleted Decoration', historyBefore);
  }

  function orderSelectedDecorations(action: 'forward' | 'backward' | 'front' | 'back') {
    if (selectedDecorationIds.length === 0) return;
    const historyBefore = getEditorSnapshot();
    setDecorations((current) => {
      const next = [...current];
      const moveOne = (from: number, to: number) => {
        const [item] = next.splice(from, 1);
        if (item) next.splice(to, 0, item);
      };

      if (action === 'front') {
        return [...next.filter((item) => !selectedDecorationIds.includes(item.id)), ...next.filter((item) => selectedDecorationIds.includes(item.id))];
      }
      if (action === 'back') {
        return [...next.filter((item) => selectedDecorationIds.includes(item.id)), ...next.filter((item) => !selectedDecorationIds.includes(item.id))];
      }
      if (action === 'forward') {
        for (let index = next.length - 2; index >= 0; index -= 1) {
          if (selectedDecorationIds.includes(next[index]!.id) && !selectedDecorationIds.includes(next[index + 1]!.id)) moveOne(index, index + 1);
        }
      }
      if (action === 'backward') {
        for (let index = 1; index < next.length; index += 1) {
          if (selectedDecorationIds.includes(next[index]!.id) && !selectedDecorationIds.includes(next[index - 1]!.id)) moveOne(index, index - 1);
        }
      }
      return next;
    });
    pushHistoryAfterRender('Changed Layer Order', historyBefore);
  }

  function groupSelectedDecorations() {
    if (selectedDecorationIds.length < 2) return;
    const historyBefore = getEditorSnapshot();
    const id = `group-${Date.now()}`;
    setDecorationGroups((current) => [...current, { id, name: `Group ${current.length + 1}`, memberIds: selectedDecorationIds }]);
    updateSelectedDecorations({ groupId: id }, false);
    pushHistoryAfterRender('Grouped Decorations', historyBefore);
  }

  function ungroupSelectedDecorations() {
    const groupIds = new Set(selectedDecorations.map((decoration) => decoration.groupId).filter(Boolean));
    if (groupIds.size === 0) return;
    const historyBefore = getEditorSnapshot();
    setDecorationGroups((current) => current.filter((group) => !groupIds.has(group.id)));
    setDecorations((current) =>
      current.map((decoration) =>
        decoration.groupId && groupIds.has(decoration.groupId)
          ? { ...decoration, groupId: undefined }
          : decoration
      )
    );
    pushHistoryAfterRender('Ungrouped Decorations', historyBefore);
  }

  function duplicateSelectedObjects() {
    if (decorationMode && selectedDecorationIds.length > 0) {
      duplicateDecorations();
      return;
    }
    const ids = selectedLayerIds.filter((id) => isEditableLayer(id) && !isLayerLocked(id) && !isLayerHidden(id));
    if (ids.length === 0) return;
    const historyBefore = getEditorSnapshot();
    duplicateSelection(ids);
    pushHistoryAfterRender('Duplicated Selection', historyBefore);
  }

  function deleteSelectedObjects() {
    if (decorationMode && selectedDecorationIds.length > 0) {
      deleteSelectedDecorations();
      return;
    }
    const duplicateIds = selectedLayerIds.filter((id) => id.startsWith('duplicate-'));
    const baseIds = selectedLayerIds.filter((id): id is BaseVisualLayerId => !id.startsWith('duplicate-') && isEditableLayer(id));
    if (duplicateIds.length === 0 && baseIds.length === 0) return;
    const historyBefore = getEditorSnapshot();
    if (duplicateIds.length > 0) {
      setDuplicatedLayers((current) => current.filter((layer) => !duplicateIds.includes(layer.id)));
    }
    baseIds.forEach((id) => updateLayerMeta(id, { hidden: true }, false));
    setSelectedLayerIds([]);
    pushHistoryAfterRender('Deleted Selection', historyBefore);
  }

  function copySelection(cut = false) {
    if (decorationMode && selectedDecorationIds.length > 0) {
      setClipboard({
        type: 'decorations',
        decorations: cloneSnapshot(decorations.filter((decoration) => selectedDecorationIds.includes(decoration.id))),
      });
      if (cut) deleteSelectedDecorations();
      return;
    }

    const selected = selectedLayers.filter((layer) => isEditableLayer(layer.id) && !isLayerHidden(layer.id));
    if (selected.length === 0) return;
    setClipboard({ type: 'layers', layers: cloneSnapshot(selected) });
    if (cut) deleteSelectedObjects();
  }

  function pasteClipboard() {
    if (!clipboard) return;
    const historyBefore = getEditorSnapshot();
    if (clipboard.type === 'decorations') {
      const copies = clipboard.decorations.map((decoration) => {
        decorationCounterRef.current += 1;
        return {
          ...decoration,
          id: `${decoration.id}-paste-${decorationCounterRef.current}`,
          name: `${decoration.name} copy`,
          x: Math.min(100 - decoration.width, decoration.x + 4),
          y: Math.min(100 - decoration.height, decoration.y + 4),
          groupId: undefined,
          locked: false,
          hidden: false,
        };
      });
      setDecorations((current) => [...current, ...copies]);
      setSelectedLayerIds(['decorations']);
      setSelectedDecorationIds(copies.map((copy) => copy.id));
      pushHistoryAfterRender('Pasted Decoration', historyBefore);
      return;
    }

    const copies = clipboard.layers.map((layer) => {
      duplicateCounterRef.current += 1;
      const id: VisualLayerId = `duplicate-${layer.sourceId ?? layer.id}-${duplicateCounterRef.current}`;
      return {
        ...layer,
        id,
        sourceId: layer.sourceId ?? layer.id,
        label: `${layer.label} copy`,
        bounds: {
          ...layer.bounds,
          x: Math.min(100 - layer.bounds.width, layer.bounds.x + 4),
          y: Math.min(100 - layer.bounds.height, layer.bounds.y + 4),
        },
      };
    });
    setDuplicatedLayers((current) => [...current, ...copies]);
    setSelectedLayerIds(copies.map((copy) => copy.id));
    setSelectedDecorationIds([]);
    pushHistoryAfterRender('Pasted Selection', historyBefore);
  }

  function setSelectedLocked(locked: boolean) {
    const historyBefore = getEditorSnapshot();
    if (decorationMode && selectedDecorationIds.length > 0) {
      updateSelectedDecorations({ locked }, false);
    } else {
      selectedLayerIds
        .filter((id): id is BaseVisualLayerId => !id.startsWith('duplicate-'))
        .forEach((id) => updateLayerMeta(id, { locked }, false));
    }
    pushHistoryAfterRender(locked ? 'Locked Selection' : 'Unlocked Selection', historyBefore);
  }

  function setSelectedHidden(hidden: boolean) {
    const historyBefore = getEditorSnapshot();
    if (decorationMode && selectedDecorationIds.length > 0) {
      updateSelectedDecorations({ hidden }, false);
    } else {
      selectedLayerIds
        .filter((id): id is BaseVisualLayerId => !id.startsWith('duplicate-'))
        .forEach((id) => updateLayerMeta(id, { hidden }, false));
    }
    pushHistoryAfterRender(hidden ? 'Hid Selection' : 'Unhid Selection', historyBefore);
  }

  function reorderPanelLayer(draggedId: BaseVisualLayerId, targetId: BaseVisualLayerId) {
    if (draggedId === targetId) return;
    setPanelLayerOrder((current) => {
      const next = current.filter((id) => id !== draggedId);
      const targetIndex = next.indexOf(targetId);
      next.splice(Math.max(targetIndex, 0), 0, draggedId);
      return next;
    });
  }

  function alignSelection(action: AlignAction) {
    const historyBefore = getEditorSnapshot();
    if (decorationMode && selectedDecorationIds.length > 0) {
      const selected = decorations.filter((decoration) => selectedDecorationIds.includes(decoration.id) && !decoration.locked);
      if (selected.length === 0) return;
      const left = Math.min(...selected.map((item) => item.x));
      const right = Math.max(...selected.map((item) => item.x + item.width));
      const top = Math.min(...selected.map((item) => item.y));
      const bottom = Math.max(...selected.map((item) => item.y + item.height));
      const center = left + (right - left) / 2;
      const middle = top + (bottom - top) / 2;
      const sortedX = [...selected].sort((a, b) => a.x - b.x);
      const sortedY = [...selected].sort((a, b) => a.y - b.y);
      setDecorations((current) => current.map((decoration) => {
        if (!selectedDecorationIds.includes(decoration.id) || decoration.locked) return decoration;
        let next = { ...decoration };
        if (action === 'left') next.x = left;
        if (action === 'right') next.x = right - decoration.width;
        if (action === 'top') next.y = top;
        if (action === 'bottom') next.y = bottom - decoration.height;
        if (action === 'center') next.x = center - decoration.width / 2;
        if (action === 'middle') next.y = middle - decoration.height / 2;
        if (action === 'distribute-h' && sortedX.length > 2) {
          const index = sortedX.findIndex((item) => item.id === decoration.id);
          const gap = (right - left) / (sortedX.length - 1);
          next.x = left + gap * index - decoration.width / 2;
        }
        if (action === 'distribute-v' && sortedY.length > 2) {
          const index = sortedY.findIndex((item) => item.id === decoration.id);
          const gap = (bottom - top) / (sortedY.length - 1);
          next.y = top + gap * index - decoration.height / 2;
        }
        return { ...next, ...clampDecorationBounds(getDecorationBounds(next)) };
      }));
      pushHistoryAfterRender('Aligned Decorations', historyBefore);
      return;
    }

    const editableIds = selectedLayerIds.filter((id) => isEditableLayer(id) && !isLayerLocked(id) && !isLayerHidden(id));
    const selected = editableIds.map((id) => getLayerById(id)).filter((layer): layer is VisualLayer => Boolean(layer));
    if (selected.length === 0) return;
    const group = getGroupBounds(selected);
    const center = group.x + group.width / 2;
    const middle = group.y + group.height / 2;
    const sortedX = [...selected].sort((a, b) => a.bounds.x - b.bounds.x);
    const sortedY = [...selected].sort((a, b) => a.bounds.y - b.bounds.y);
    const nextTransforms: Partial<Record<VisualLayerId, LayerTransform>> = {};
    selected.forEach((layer) => {
      const transform = getLayerTransform(layer.id) ?? {};
      let x = layer.bounds.x;
      let y = layer.bounds.y;
      if (action === 'left') x = group.x;
      if (action === 'right') x = group.x + group.width - layer.bounds.width;
      if (action === 'top') y = group.y;
      if (action === 'bottom') y = group.y + group.height - layer.bounds.height;
      if (action === 'center') x = center - layer.bounds.width / 2;
      if (action === 'middle') y = middle - layer.bounds.height / 2;
      if (action === 'distribute-h' && sortedX.length > 2) {
        const index = sortedX.findIndex((item) => item.id === layer.id);
        const gap = group.width / (sortedX.length - 1);
        x = group.x + gap * index - layer.bounds.width / 2;
      }
      if (action === 'distribute-v' && sortedY.length > 2) {
        const index = sortedY.findIndex((item) => item.id === layer.id);
        const gap = group.height / (sortedY.length - 1);
        y = group.y + gap * index - layer.bounds.height / 2;
      }
      const clamped = clampLayerBounds(layer, { ...layer.bounds, x, y });
      nextTransforms[layer.id] = { ...transform, x: clamped.x, y: clamped.y };
    });
    commitLayerTransforms(nextTransforms, false);
    pushHistoryAfterRender('Aligned Selection', historyBefore);
  }

  function openContextMenu(event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>, scope: 'canvas' | 'layer' | 'decoration') {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, scope });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  function readSvgFile(file: File) {
    if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const markup = typeof reader.result === 'string' ? reader.result : '';
      if (!markup.includes('<svg')) return;
      const target = activeDecoration?.kind === 'svg' ? activeDecoration.id : undefined;
      if (target) {
        updateDecoration(target, { svgMarkup: markup, name: file.name, kind: 'svg' }, 'Uploaded SVG');
      } else {
        addDecoration('svg', decorationCategory);
        window.requestAnimationFrame(() => {
          setDecorations((current) => {
            const last = current[current.length - 1];
            return last ? current.map((decoration) => decoration.id === last.id ? { ...decoration, svgMarkup: markup, name: file.name } : decoration) : current;
          });
        });
      }
      setSelectedLayerIds(['decorations']);
      setPropertyPanelOpen(true);
    };
    reader.readAsText(file);
  }

  function handleSvgInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) readSvgFile(file);
    event.currentTarget.value = '';
  }

  function recolorSvgMarkup(markup: string, color: string): string {
    return markup
      .replace(/fill="(?!none)[^"]*"/gi, `fill="${color}"`)
      .replace(/stroke="(?!none)[^"]*"/gi, `stroke="${color}"`);
  }

  function getDecorationDragIds(decoration: DecorationItem, additive: boolean): string[] {
    const group = decoration.groupId ? decorationGroups.find((item) => item.id === decoration.groupId) : undefined;
    const groupIds = group?.memberIds.filter((id) => decorations.some((item) => item.id === id && !item.locked && !item.hidden)) ?? [];
    const baseIds = groupIds.length > 1 ? groupIds : [decoration.id];
    if (additive) {
      const set = new Set(selectedDecorationIds);
      baseIds.forEach((id) => {
        if (set.has(id)) set.delete(id);
        else set.add(id);
      });
      return Array.from(set);
    }
    if (selectedDecorationIds.includes(decoration.id)) return selectedDecorationIds;
    return baseIds;
  }

  function snapDecorationMovement(
    movingItems: DecorationItem[],
    canvasRect: DOMRect
  ): { items: DecorationItem[]; guides: GuideLine[]; indicators: AlignmentIndicator[] } {
    if (movingItems.length === 0) return { items: movingItems, guides: [], indicators: [] };
    const thresholdX = (SNAP_DISTANCE_PX / Math.max(canvasRect.width, 1)) * 100;
    const thresholdY = (SNAP_DISTANCE_PX / Math.max(canvasRect.height, 1)) * 100;
    const groupBounds = getGroupBounds(movingItems.map((item) => ({
      id: item.id as VisualLayerId,
      label: item.name,
      type: 'shape',
      bounds: getDecorationBounds(item),
      rotation: item.rotation,
      fontScale: 1,
      textContent: '',
      textStyle: DEFAULT_TEXT_STYLE,
    })));
    const groupCenter = getCenter(groupBounds);
    const canvasTargetsX = [
      { value: 0, source: groupBounds.x, label: 'Canvas left' },
      { value: 50, source: groupCenter.x, label: 'Canvas center' },
      { value: 100, source: groupBounds.x + groupBounds.width, label: 'Canvas right' },
    ];
    const canvasTargetsY = [
      { value: 0, source: groupBounds.y, label: 'Canvas top' },
      { value: 50, source: groupCenter.y, label: 'Canvas center' },
      { value: 100, source: groupBounds.y + groupBounds.height, label: 'Canvas bottom' },
    ];
    let adjustX = 0;
    let adjustY = 0;
    const nextGuides: GuideLine[] = [];
    const xSnap = canvasTargetsX.find((target) => Math.abs(target.source - target.value) <= thresholdX);
    const ySnap = canvasTargetsY.find((target) => Math.abs(target.source - target.value) <= thresholdY);
    if (xSnap) {
      adjustX = xSnap.value - xSnap.source;
      nextGuides.push({ id: `deco-canvas-x-${xSnap.value}`, orientation: 'vertical', position: xSnap.value, label: xSnap.label });
    }
    if (ySnap) {
      adjustY = ySnap.value - ySnap.source;
      nextGuides.push({ id: `deco-canvas-y-${ySnap.value}`, orientation: 'horizontal', position: ySnap.value, label: ySnap.label });
    }

    const adjusted = movingItems.map((item) => {
      const bounds = clampDecorationBounds({ ...getDecorationBounds(item), x: item.x + adjustX, y: item.y + adjustY });
      return { ...item, x: bounds.x, y: bounds.y };
    });
    const staticTargets = [
      ...layers
        .filter((layer) => !isLayerHidden(layer.id) && layer.id !== 'background' && layer.id !== 'decorations')
        .map((layer) => ({ id: layer.id, label: layer.label, bounds: layer.bounds })),
      ...decorations
        .filter((item) => !selectedDecorationIds.includes(item.id) && !item.hidden)
        .map((item) => ({ id: item.id, label: item.name, bounds: getDecorationBounds(item) })),
    ];
    const nextIndicators: AlignmentIndicator[] = [];
    adjusted.forEach((moving) => {
      const movingBounds = getDecorationBounds(moving);
      const movingCenter = getCenter(movingBounds);
      staticTargets.forEach((target) => {
        const targetCenter = getCenter(target.bounds);
        const centerX = Math.abs(movingCenter.x - targetCenter.x) <= thresholdX;
        const centerY = Math.abs(movingCenter.y - targetCenter.y) <= thresholdY;
        const left = Math.abs(movingBounds.x - target.bounds.x) <= thresholdX;
        const top = Math.abs(movingBounds.y - target.bounds.y) <= thresholdY;
        if (centerX) nextGuides.push({ id: `deco-target-x-${moving.id}-${target.id}`, orientation: 'vertical', position: targetCenter.x, label: 'Centers match' });
        if (centerY) nextGuides.push({ id: `deco-target-y-${moving.id}-${target.id}`, orientation: 'horizontal', position: targetCenter.y, label: 'Centers match' });
        if (left) nextGuides.push({ id: `deco-left-${moving.id}-${target.id}`, orientation: 'vertical', position: target.bounds.x, label: 'Aligned' });
        if (top) nextGuides.push({ id: `deco-top-${moving.id}-${target.id}`, orientation: 'horizontal', position: target.bounds.y, label: 'Aligned' });
        if (centerX || centerY || left || top) {
          nextIndicators.push({
            id: `deco-indicator-${moving.id}-${target.id}`,
            x: clampPercent((movingCenter.x + targetCenter.x) / 2),
            y: clampPercent((movingCenter.y + targetCenter.y) / 2),
            label: target.id === 'product' ? 'Product alignment' : 'Decoration snap',
          });
        }
      });
    });

    return {
      items: adjusted,
      guides: nextGuides.slice(0, 14),
      indicators: nextIndicators.slice(0, 6),
    };
  }

  function applyDecorationDragFrame() {
    decorationDragFrameRef.current = null;
    const session = decorationDragSessionRef.current;
    const pending = pendingDecorationDragRef.current;
    if (!session || !pending) return;

    const deltaX = ((pending.clientX - session.startClientX) / Math.max(session.canvasRect.width, 1)) * 100;
    const deltaY = ((pending.clientY - session.startClientY) / Math.max(session.canvasRect.height, 1)) * 100;
    const moving = session.selectedIds
      .map((id) => session.startItems[id])
      .filter((item): item is DecorationItem => Boolean(item))
      .map((item) => {
        const bounds = clampDecorationBounds({ ...getDecorationBounds(item), x: item.x + deltaX, y: item.y + deltaY });
        return { ...item, x: bounds.x, y: bounds.y };
      });
    const snapped = snapDecorationMovement(moving, session.canvasRect);
    const byId = new Map(snapped.items.map((item) => [item.id, item]));
    setDecorations((current) => current.map((item) => byId.get(item.id) ?? item));
    setGuides(snapped.guides);
    setAlignmentIndicators(snapped.indicators);
  }

  function queueDecorationDragFrame(clientX: number, clientY: number) {
    pendingDecorationDragRef.current = { clientX, clientY };
    if (decorationDragFrameRef.current !== null) return;
    decorationDragFrameRef.current = window.requestAnimationFrame(applyDecorationDragFrame);
  }

  function handleDecorationPointerDown(event: PointerEvent<HTMLButtonElement>, decoration: DecorationItem) {
    event.stopPropagation();
    if (event.button !== 0 || decoration.locked || layerMeta.decorations.locked) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const additive = event.ctrlKey || event.metaKey;
    const ids = getDecorationDragIds(decoration, additive);
    setSelectedLayerIds(['decorations']);
    setSelectedDecorationIds(ids);
    const startItems = ids.reduce<Record<string, DecorationItem>>((acc, id) => {
      const item = decorations.find((candidate) => candidate.id === id);
      if (item && !item.locked) acc[id] = item;
      return acc;
    }, {});
    decorationDragSessionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      canvasRect,
      selectedIds: ids,
      startItems,
      historyBefore: getEditorSnapshot(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    queueDecorationDragFrame(event.clientX, event.clientY);
  }

  function handleDecorationPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const session = decorationDragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    queueDecorationDragFrame(event.clientX, event.clientY);
  }

  function handleDecorationPointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const session = decorationDragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (pendingDecorationDragRef.current) applyDecorationDragFrame();
    event.currentTarget.releasePointerCapture(event.pointerId);
    decorationDragSessionRef.current = null;
    pendingDecorationDragRef.current = null;
    if (decorationDragFrameRef.current !== null) {
      window.cancelAnimationFrame(decorationDragFrameRef.current);
      decorationDragFrameRef.current = null;
    }
    setGuides([]);
    setAlignmentIndicators([]);
    pushHistoryAfterRender(`Moved ${session.selectedIds.length > 1 ? 'Decorations' : decorations.find((item) => item.id === session.selectedIds[0])?.name ?? 'Decoration'}`, session.historyBefore);
  }

  function updateTextState(layerId: VisualLayerId, patch: { content?: string; style?: Partial<TextStyle> }, historyLabel: string | false = 'Changed Typography') {
    const layer = getLayerById(layerId);
    if (!layer) return;
    if (historyLabel) queueHistory(historyLabel);
    setLayerText((current) => {
      const existing = current[layerId] ?? { content: layer.textContent, style: layer.textStyle };
      return {
        ...current,
        [layerId]: {
          content: patch.content ?? existing.content,
          style: { ...existing.style, ...patch.style },
        },
      };
    });
  }

  function fitHeadlineFont(layerId: VisualLayerId, content: string, style: TextStyle) {
    const layer = getLayerById(layerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!layer || !rect || !(layer.id === 'headline' || layer.label.toLowerCase().includes('headline'))) return style.fontSize;

    const widthPx = Math.max(24, (layer.bounds.width / 100) * rect.width);
    const heightPx = Math.max(24, (layer.bounds.height / 100) * rect.height);
    const words = content.trim().length;
    let size = style.fontSize;
    while (size > MIN_TEXT_FONT_SIZE) {
      const charsPerLine = Math.max(4, Math.floor(widthPx / (size * 0.56)));
      const lines = Math.max(1, Math.ceil(words / charsPerLine));
      if (lines * size * style.lineHeight <= heightPx * 1.05) break;
      size -= 1;
    }
    return Math.max(MIN_TEXT_FONT_SIZE, size);
  }

  function growTextBoxIfNeeded(layerId: VisualLayerId, element: HTMLDivElement) {
    const layer = getLayerById(layerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!layer || !rect || element.scrollHeight <= element.clientHeight + 2) return;

    const neededHeight = (element.scrollHeight / Math.max(rect.height, 1)) * 100;
    const maxHeight = 100 - layer.bounds.y;
    const nextHeight = Math.min(maxHeight, Math.max(layer.bounds.height, neededHeight));
    if (nextHeight > layer.bounds.height) {
      commitLayerTransforms({ [layerId]: { height: nextHeight } });
    }
  }

  function enterTextEdit(layerId: VisualLayerId) {
    const layer = getLayerById(layerId);
    if (!layer || layer.type !== 'text') return;
    textEditHistoryRef.current = {
      layerId,
      label: `Edited ${layer.label}`,
      before: getEditorSnapshot(),
    };
    setSelectedLayerIds([layerId]);
    setPropertyPanelOpen(true);
    setEditingTextLayerId(layerId);
    window.requestAnimationFrame(() => {
      const node = editableTextRefs.current[layerId];
      node?.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      if (node && selection) {
        range.selectNodeContents(node);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  }

  function finishTextEdit(layerId: VisualLayerId) {
    const pending = textEditHistoryRef.current;
    setEditingTextLayerId((current) => current === layerId ? null : current);
    if (!pending || pending.layerId !== layerId) return;
    textEditHistoryRef.current = null;
    pushHistoryAfterRender(pending.label, pending.before);
  }

  function selectLayer(id: VisualLayerId, additive: boolean) {
    if (id !== 'decorations') setSelectedDecorationIds([]);
    if (!additive) {
      setSelectedLayerIds([id]);
      return [id];
    }

    const nextSelection = selectedLayerIds.includes(id)
      ? selectedLayerIds.filter((item) => item !== id)
      : [...selectedLayerIds, id];
    setSelectedLayerIds(nextSelection);
    return nextSelection;
  }

  function duplicateSelection(ids: VisualLayerId[]): { ids: VisualLayerId[]; startTransforms: Record<VisualLayerId, LayerTransform> } {
    const copies = ids
      .map((id) => getLayerById(id))
      .filter((layer): layer is VisualLayer => layer !== undefined && isEditableLayer(layer.id) && !isLayerLocked(layer.id) && !isLayerHidden(layer.id))
      .map((layer) => {
        duplicateCounterRef.current += 1;
        const duplicateId: VisualLayerId = `duplicate-${layer.id}-${duplicateCounterRef.current}`;
        return {
          ...layer,
          id: duplicateId,
          sourceId: layer.id,
          label: `${layer.label} copy`,
          bounds: { ...layer.bounds, x: Math.min(100 - layer.bounds.width, layer.bounds.x + 2), y: Math.min(100 - layer.bounds.height, layer.bounds.y + 2) },
        };
      });

    if (copies.length === 0) {
      const startTransforms = ids.reduce<Record<VisualLayerId, LayerTransform>>((acc, id) => {
        const transform = getLayerTransform(id);
        if (transform) acc[id] = transform;
        return acc;
      }, {} as Record<VisualLayerId, LayerTransform>);
      return { ids, startTransforms };
    }

    setDuplicatedLayers((current) => [...current, ...copies]);
    const copyIds = copies.map((copy) => copy.id);
    setSelectedLayerIds(copyIds);
    const startTransforms = copies.reduce<Record<VisualLayerId, LayerTransform>>((acc, copy) => {
      acc[copy.id] = {
        x: copy.bounds.x,
        y: copy.bounds.y,
        width: copy.bounds.width,
        height: copy.bounds.height,
        rotation: copy.rotation,
        fontScale: copy.fontScale,
      };
      return acc;
    }, {} as Record<VisualLayerId, LayerTransform>);
    return { ids: copyIds, startTransforms };
  }

  function buildAlignmentHelpers(
    candidateLayers: VisualLayer[],
    staticLayers: VisualLayer[],
    thresholdX: number,
    thresholdY: number
  ): { guides: GuideLine[]; indicators: AlignmentIndicator[] } {
    const nextGuides: GuideLine[] = [];
    const nextIndicators: AlignmentIndicator[] = [];

    candidateLayers.forEach((moving) => {
      const movingCenter = getCenter(moving.bounds);
      staticLayers.forEach((target) => {
        const targetCenter = getCenter(target.bounds);
        const pair = new Set([moving.id, target.id]);
        const textText = moving.type === 'text' && target.type === 'text';
        const productText = pair.has('product') && (moving.type === 'text' || target.type === 'text');
        const ctaPrice = pair.has('cta') && pair.has('price');
        const centersMatchX = Math.abs(movingCenter.x - targetCenter.x) <= thresholdX;
        const centersMatchY = Math.abs(movingCenter.y - targetCenter.y) <= thresholdY;
        const leftAlign = Math.abs(moving.bounds.x - target.bounds.x) <= thresholdX;
        const topAlign = Math.abs(moving.bounds.y - target.bounds.y) <= thresholdY;

        if (!(textText || productText || ctaPrice || centersMatchX || centersMatchY)) return;

        const label = centersMatchX || centersMatchY
          ? 'Centers match'
          : ctaPrice
            ? 'CTA aligns with price'
            : productText
              ? 'Product aligns with text'
              : 'Text alignment';

        if (leftAlign || centersMatchX) {
          nextGuides.push({
            id: `align-x-${moving.id}-${target.id}`,
            orientation: 'vertical',
            position: centersMatchX ? targetCenter.x : target.bounds.x,
            label,
          });
        }
        if (topAlign || centersMatchY) {
          nextGuides.push({
            id: `align-y-${moving.id}-${target.id}`,
            orientation: 'horizontal',
            position: centersMatchY ? targetCenter.y : target.bounds.y,
            label,
          });
        }

        if (leftAlign || topAlign || centersMatchX || centersMatchY) {
          nextIndicators.push({
            id: `indicator-${moving.id}-${target.id}`,
            x: clampPercent((movingCenter.x + targetCenter.x) / 2),
            y: clampPercent((movingCenter.y + targetCenter.y) / 2),
            label,
          });
        }
      });
    });

    return { guides: nextGuides, indicators: nextIndicators };
  }

  function snapMovement(
    movingLayerIds: VisualLayerId[],
    proposedTransforms: Partial<Record<VisualLayerId, LayerTransform>>,
    canvasRect: DOMRect
  ): {
    transforms: Partial<Record<VisualLayerId, LayerTransform>>;
    guides: GuideLine[];
    indicators: AlignmentIndicator[];
  } {
    const thresholdX = (SNAP_DISTANCE_PX / Math.max(canvasRect.width, 1)) * 100;
    const thresholdY = (SNAP_DISTANCE_PX / Math.max(canvasRect.height, 1)) * 100;
    const movingLayers = movingLayerIds
      .map((id) => {
        const bounds = getLayerBounds(id, proposedTransforms);
        const layer = getLayerById(id);
        return bounds && layer ? { ...layer, bounds } : undefined;
      })
      .filter((layer): layer is VisualLayer => Boolean(layer));

    if (movingLayers.length === 0) return { transforms: proposedTransforms, guides: [], indicators: [] };

    const groupBounds = getGroupBounds(movingLayers);
    const groupCenter = getCenter(groupBounds);
    let adjustX = 0;
    let adjustY = 0;
    const nextGuides: GuideLine[] = [];

    const xTargets = [
      { value: 0, source: groupBounds.x, label: 'Left edge' },
      { value: 50, source: groupCenter.x, label: 'Canvas center' },
      { value: 100, source: groupBounds.x + groupBounds.width, label: 'Right edge' },
    ];
    const yTargets = [
      { value: 0, source: groupBounds.y, label: 'Top edge' },
      { value: 50, source: groupCenter.y, label: 'Canvas center' },
      { value: 100, source: groupBounds.y + groupBounds.height, label: 'Bottom edge' },
    ];

    const xSnap = xTargets.find((target) => Math.abs(target.source - target.value) <= thresholdX);
    const ySnap = yTargets.find((target) => Math.abs(target.source - target.value) <= thresholdY);

    if (xSnap) {
      adjustX = xSnap.value - xSnap.source;
      nextGuides.push({ id: `canvas-x-${xSnap.value}`, orientation: 'vertical', position: xSnap.value, label: xSnap.label });
    }
    if (ySnap) {
      adjustY = ySnap.value - ySnap.source;
      nextGuides.push({ id: `canvas-y-${ySnap.value}`, orientation: 'horizontal', position: ySnap.value, label: ySnap.label });
    }

    const adjustedTransforms = { ...proposedTransforms };
    movingLayerIds.forEach((id) => {
      const bounds = getLayerBounds(id, proposedTransforms);
      if (!bounds) return;
      const clamped = clampLayerBounds(getLayerById(id), { ...bounds, x: bounds.x + adjustX, y: bounds.y + adjustY });
      adjustedTransforms[id] = { ...adjustedTransforms[id], x: clamped.x, y: clamped.y };
    });

    const adjustedMovingLayers = movingLayerIds
      .map((id) => {
        const bounds = getLayerBounds(id, adjustedTransforms);
        const layer = getLayerById(id);
        return bounds && layer ? { ...layer, bounds } : undefined;
      })
      .filter((layer): layer is VisualLayer => Boolean(layer));
    const staticLayers = layers.filter((layer) => !movingLayerIds.includes(layer.id) && isEditableLayer(layer.id));
    const alignment = buildAlignmentHelpers(adjustedMovingLayers, staticLayers, thresholdX, thresholdY);

    return {
      transforms: adjustedTransforms,
      guides: [...nextGuides, ...alignment.guides].slice(0, 10),
      indicators: alignment.indicators.slice(0, 6),
    };
  }

  function applyDragFrame() {
    dragFrameRef.current = null;
    const session = dragSessionRef.current;
    const pending = pendingDragRef.current;
    if (!session || !pending) return;

    const deltaX = ((pending.clientX - session.startClientX) / Math.max(session.canvasRect.width, 1)) * 100;
    const deltaY = ((pending.clientY - session.startClientY) / Math.max(session.canvasRect.height, 1)) * 100;
    const proposedTransforms: Partial<Record<VisualLayerId, LayerTransform>> = {};

    session.selectedIds.forEach((id) => {
      const layer = getLayerById(id);
      const start = session.startTransforms[id];
      if (!layer || !start) return;
      const next = clampLayerBounds(layer, {
        ...layer.bounds,
        x: (start.x ?? layer.bounds.x) + deltaX,
        y: (start.y ?? layer.bounds.y) + deltaY,
      });
      proposedTransforms[id] = { ...start, x: next.x, y: next.y };
    });

    const snapped = snapMovement(session.selectedIds, proposedTransforms, session.canvasRect);
    commitLayerTransforms(snapped.transforms);
    setGuides(snapped.guides);
    setAlignmentIndicators(snapped.indicators);
  }

  function queueDragFrame(clientX: number, clientY: number) {
    pendingDragRef.current = { clientX, clientY };
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = window.requestAnimationFrame(applyDragFrame);
  }

  function handleLayerPointerDown(event: PointerEvent<HTMLButtonElement>, layerId: VisualLayerId) {
    event.stopPropagation();
    if ((event.target as HTMLElement).closest('[data-text-editor="true"]')) return;
    if (event.button !== 0) return;

    const layer = getLayerById(layerId);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!layer || !canvasRect) return;

    const additive = event.ctrlKey || event.metaKey;
    const wasSelected = selectedLayerIds.includes(layerId);
    const nextSelection = wasSelected && !additive
      ? selectedLayerIds
      : selectLayer(layerId, additive);

    if (additive && wasSelected) {
      const historyBefore = getEditorSnapshot();
      const duplicated = duplicateSelection(nextSelection);
      dragSessionRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        canvasRect,
        startTransforms: duplicated.startTransforms,
        selectedIds: duplicated.ids,
        duplicated: true,
        historyBefore,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      queueDragFrame(event.clientX, event.clientY);
      return;
    }
    if (!isEditableLayer(layerId)) return;
    if (isLayerLocked(layerId) || isLayerHidden(layerId)) return;

    const dragIds = nextSelection.filter((id) => isEditableLayer(id) && !isLayerLocked(id) && !isLayerHidden(id));
    if (dragIds.length === 0) return;

    const startTransforms = dragIds.reduce<Record<VisualLayerId, LayerTransform>>((acc, id) => {
      const transform = getLayerTransform(id);
      if (transform) acc[id] = transform;
      return acc;
    }, {} as Record<VisualLayerId, LayerTransform>);

    event.currentTarget.setPointerCapture(event.pointerId);
    dragSessionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      canvasRect,
      startTransforms,
      selectedIds: dragIds,
      historyBefore: getEditorSnapshot(),
    };
    queueDragFrame(event.clientX, event.clientY);
  }

  function handleLayerPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    queueDragFrame(event.clientX, event.clientY);
  }

  function handleLayerPointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (pendingDragRef.current) applyDragFrame();
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragSessionRef.current = null;
    pendingDragRef.current = null;
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    setGuides([]);
    setAlignmentIndicators([]);
    pushHistoryAfterRender(session.duplicated ? 'Duplicated Selection' : `Moved ${session.selectedIds.length > 1 ? 'Selection' : getLayerById(session.selectedIds[0]!)?.label ?? 'Layer'}`, session.historyBefore);
  }

  function buildResizedGroup(
    session: ResizeSession,
    clientX: number,
    clientY: number,
    altKey: boolean,
    shiftKey: boolean
  ): LayerBounds {
    const point = getPointInCanvas(clientX, clientY, session.canvasRect);
    const deltaX = point.x - session.startPoint.x;
    const deltaY = point.y - session.startPoint.y;
    const minimum = getMinimumSize(session.canvasRect);
    const start = session.startGroup;
    let left = start.x;
    let top = start.y;
    let right = start.x + start.width;
    let bottom = start.y + start.height;
    const horizontal = session.handle.includes('left') || session.handle.includes('right');
    const vertical = session.handle.includes('top') || session.handle.includes('bottom');

    if (session.handle.includes('left')) left += deltaX;
    if (session.handle.includes('right')) right += deltaX;
    if (session.handle.includes('top')) top += deltaY;
    if (session.handle.includes('bottom')) bottom += deltaY;

    if (altKey) {
      if (session.handle.includes('left')) right -= deltaX;
      if (session.handle.includes('right')) left -= deltaX;
      if (session.handle.includes('top')) bottom -= deltaY;
      if (session.handle.includes('bottom')) top -= deltaY;
    }

    let width = Math.max(minimum.width, right - left);
    let height = Math.max(minimum.height, bottom - top);
    const singleLayer = session.selectedIds.length === 1 ? getLayerById(session.selectedIds[0]!) : undefined;
    const lockAspect = shiftKey || (singleLayer?.type === 'image' && !altKey);

    if (lockAspect && start.height > 0) {
      const ratio = start.width / start.height;
      if (horizontal && !vertical) {
        height = Math.max(minimum.height, width / ratio);
      } else if (vertical && !horizontal) {
        width = Math.max(minimum.width, height * ratio);
      } else if (Math.abs(width - start.width) >= Math.abs(height - start.height)) {
        height = Math.max(minimum.height, width / ratio);
      } else {
        width = Math.max(minimum.width, height * ratio);
      }
    }

    if (session.handle.includes('left') && !session.handle.includes('right')) left = start.x + start.width - width;
    if (session.handle.includes('top') && !session.handle.includes('bottom')) top = start.y + start.height - height;
    if (altKey) {
      left = start.x + start.width / 2 - width / 2;
      top = start.y + start.height / 2 - height / 2;
    }

    return clampBounds({ x: left, y: top, width, height });
  }

  function applyResizeFrame() {
    resizeFrameRef.current = null;
    const session = resizeSessionRef.current;
    const pending = pendingResizeRef.current;
    if (!session || !pending) return;

    const nextGroup = buildResizedGroup(session, pending.clientX, pending.clientY, pending.altKey, pending.shiftKey);
    const scaleX = nextGroup.width / Math.max(session.startGroup.width, 0.001);
    const scaleY = nextGroup.height / Math.max(session.startGroup.height, 0.001);
    const nextTransforms = session.selectedIds.reduce<Partial<Record<VisualLayerId, LayerTransform>>>((acc, id) => {
      const start = session.startTransforms[id];
      if (!start) return acc;
      const startBounds = {
        x: start.x ?? 0,
        y: start.y ?? 0,
        width: start.width ?? 1,
        height: start.height ?? 1,
      };
      const layer = getLayerById(id);
      const resized = clampLayerBounds(layer, {
        x: nextGroup.x + (startBounds.x - session.startGroup.x) * scaleX,
        y: nextGroup.y + (startBounds.y - session.startGroup.y) * scaleY,
        width: Math.max(startBounds.width * scaleX, getMinimumSize(session.canvasRect).width),
        height: Math.max(startBounds.height * scaleY, getMinimumSize(session.canvasRect).height),
      });
      acc[id] = {
        ...start,
        ...resized,
        fontScale: layer?.type === 'text'
          ? (start.fontScale ?? 1) * Math.max(0.1, (Math.abs(scaleX) + Math.abs(scaleY)) / 2)
          : start.fontScale,
      };
      return acc;
    }, {});

    commitLayerTransforms(nextTransforms);
    setTransformFeedback({
      type: 'size',
      x: clampPercent(nextGroup.x + nextGroup.width),
      y: clampPercent(nextGroup.y),
      label: `${Math.round((nextGroup.width / 100) * session.canvasRect.width)} x ${Math.round((nextGroup.height / 100) * session.canvasRect.height)}`,
    });
  }

  function queueResizeFrame(clientX: number, clientY: number, altKey: boolean, shiftKey: boolean) {
    pendingResizeRef.current = { clientX, clientY, altKey, shiftKey };
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = window.requestAnimationFrame(applyResizeFrame);
  }

  function handleResizePointerDown(event: PointerEvent<HTMLButtonElement>, handle: ResizeHandle) {
    event.stopPropagation();
    if (event.button !== 0 || !selectedGroupBounds) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const selectedIds = selectedLayerIds.filter(isEditableLayer);
    const startTransforms = selectedIds.reduce<Record<VisualLayerId, LayerTransform>>((acc, id) => {
      const transform = getLayerTransform(id);
      if (transform) acc[id] = transform;
      return acc;
    }, {} as Record<VisualLayerId, LayerTransform>);

    resizeSessionRef.current = {
      pointerId: event.pointerId,
      handle,
      canvasRect,
      startPoint: getPointInCanvas(event.clientX, event.clientY, canvasRect),
      startGroup: selectedGroupBounds,
      startTransforms,
      selectedIds,
      historyBefore: getEditorSnapshot(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    queueResizeFrame(event.clientX, event.clientY, event.altKey, event.shiftKey);
  }

  function handleResizePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    queueResizeFrame(event.clientX, event.clientY, event.altKey, event.shiftKey);
  }

  function handleResizePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (pendingResizeRef.current) applyResizeFrame();
    event.currentTarget.releasePointerCapture(event.pointerId);
    resizeSessionRef.current = null;
    pendingResizeRef.current = null;
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    }
    setTransformFeedback(null);
    pushHistoryAfterRender(`Resized ${session.selectedIds.length > 1 ? 'Selection' : getLayerById(session.selectedIds[0]!)?.label ?? 'Layer'}`, session.historyBefore);
  }

  function pointerAngle(clientX: number, clientY: number, session: RotationSession): number {
    const point = getPointInCanvas(clientX, clientY, session.canvasRect);
    return Math.atan2(point.y - session.center.y, point.x - session.center.x) * (180 / Math.PI);
  }

  function applyRotationFrame() {
    rotationFrameRef.current = null;
    const session = rotationSessionRef.current;
    const pending = pendingRotationRef.current;
    if (!session || !pending) return;

    const rawAngle = pointerAngle(pending.clientX, pending.clientY, session);
    const delta = rawAngle - session.startAngle;
    const nextTransforms = session.selectedIds.reduce<Partial<Record<VisualLayerId, LayerTransform>>>((acc, id) => {
      const start = session.startTransforms[id];
      if (!start) return acc;
      const nextAngle = normalizeAngle((start.rotation ?? 0) + delta);
      acc[id] = {
        ...start,
        rotation: pending.shiftKey ? Math.round(nextAngle / 15) * 15 : nextAngle,
      };
      return acc;
    }, {});
    commitLayerTransforms(nextTransforms);

    const first = session.selectedIds[0];
    const angle = first ? normalizeAngle(nextTransforms[first]?.rotation ?? 0) : 0;
    setTransformFeedback({
      type: 'rotation',
      x: session.center.x,
      y: clampPercent(session.center.y - 10),
      label: `${angle} deg`,
    });
  }

  function queueRotationFrame(clientX: number, clientY: number, shiftKey: boolean) {
    pendingRotationRef.current = { clientX, clientY, shiftKey };
    if (rotationFrameRef.current !== null) return;
    rotationFrameRef.current = window.requestAnimationFrame(applyRotationFrame);
  }

  function handleRotatePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (event.button !== 0 || !selectedGroupBounds) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const selectedIds = selectedLayerIds.filter(isEditableLayer);
    const center = getCenter(selectedGroupBounds);
    const startTransforms = selectedIds.reduce<Record<VisualLayerId, LayerTransform>>((acc, id) => {
      const transform = getLayerTransform(id);
      if (transform) acc[id] = transform;
      return acc;
    }, {} as Record<VisualLayerId, LayerTransform>);

    const session: RotationSession = {
      pointerId: event.pointerId,
      canvasRect,
      center,
      startAngle: 0,
      startTransforms,
      selectedIds,
      historyBefore: getEditorSnapshot(),
    };
    session.startAngle = pointerAngle(event.clientX, event.clientY, session);
    rotationSessionRef.current = session;
    event.currentTarget.setPointerCapture(event.pointerId);
    queueRotationFrame(event.clientX, event.clientY, event.shiftKey);
  }

  function handleRotatePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const session = rotationSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    queueRotationFrame(event.clientX, event.clientY, event.shiftKey);
  }

  function handleRotatePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const session = rotationSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (pendingRotationRef.current) applyRotationFrame();
    event.currentTarget.releasePointerCapture(event.pointerId);
    rotationSessionRef.current = null;
    pendingRotationRef.current = null;
    if (rotationFrameRef.current !== null) {
      window.cancelAnimationFrame(rotationFrameRef.current);
      rotationFrameRef.current = null;
    }
    setTransformFeedback(null);
    pushHistoryAfterRender(`Rotated ${session.selectedIds.length > 1 ? 'Selection' : getLayerById(session.selectedIds[0]!)?.label ?? 'Layer'}`, session.historyBefore);
  }

  function getPointInCanvas(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
    return {
      x: clampPercent(((clientX - rect.left) / Math.max(rect.width, 1)) * 100),
      y: clampPercent(((clientY - rect.top) / Math.max(rect.height, 1)) * 100),
    };
  }

  function handleCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (spacePanActive) return;
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const start = getPointInCanvas(event.clientX, event.clientY, rect);
    selectionBoxSessionRef.current = {
      pointerId: event.pointerId,
      canvasRect: rect,
      startX: start.x,
      startY: start.y,
    };
    setSelectionBox({ x: start.x, y: start.y, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: PointerEvent<HTMLDivElement>) {
    const session = selectionBoxSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const point = getPointInCanvas(event.clientX, event.clientY, session.canvasRect);
    const x = Math.min(session.startX, point.x);
    const y = Math.min(session.startY, point.y);
    setSelectionBox({
      x,
      y,
      width: Math.abs(point.x - session.startX),
      height: Math.abs(point.y - session.startY),
    });
  }

  function handleCanvasPointerEnd(event: PointerEvent<HTMLDivElement>) {
    const session = selectionBoxSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    const point = getPointInCanvas(event.clientX, event.clientY, session.canvasRect);
    const box = {
      x: Math.min(session.startX, point.x),
      y: Math.min(session.startY, point.y),
      width: Math.abs(point.x - session.startX),
      height: Math.abs(point.y - session.startY),
    };
    selectionBoxSessionRef.current = null;
    setSelectionBox(null);

    if (box.width < 0.8 && box.height < 0.8) {
      setSelectedLayerIds([]);
      setSelectedDecorationIds([]);
      setPropertyPanelOpen(false);
      return;
    }

    if (decorationMode) {
      const selectedDecorationsInBox = decorations
        .filter((decoration) => !decoration.hidden && !decoration.locked && intersects(box, getDecorationBounds(decoration)))
        .map((decoration) => decoration.id);
      setSelectedLayerIds(selectedDecorationsInBox.length > 0 ? ['decorations'] : []);
      setSelectedDecorationIds(selectedDecorationsInBox);
      setPropertyPanelOpen(false);
      return;
    }

    const selected = layers
      .filter((layer) => isEditableLayer(layer.id) && !isLayerHidden(layer.id) && !isLayerLocked(layer.id) && intersects(box, layer.bounds))
      .map((layer) => layer.id);
    setSelectedLayerIds(selected);
    setSelectedDecorationIds([]);
    setPropertyPanelOpen(false);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === ' ') {
        event.preventDefault();
        setSpacePanActive(true);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoHistory();
        else undoHistory();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        copySelection(false);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        copySelection(true);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        pasteClipboard();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelectedObjects();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        if (decorationMode) {
          setSelectedLayerIds(['decorations']);
          setSelectedDecorationIds(decorations.filter((decoration) => !decoration.hidden && !decoration.locked).map((decoration) => decoration.id));
        } else {
          setSelectedLayerIds(EDITABLE_LAYER_IDS.filter((id) => layers.some((layer) => layer.id === id) && !isLayerHidden(id) && !isLayerLocked(id)));
          setSelectedDecorationIds([]);
        }
        setPropertyPanelOpen(false);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedLayerIds([]);
        setSelectedDecorationIds([]);
        setGuides([]);
        setAlignmentIndicators([]);
        setSelectionBox(null);
        setPropertyPanelOpen(false);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedObjects();
        return;
      }

      const direction: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      const vector = direction[event.key];
      if (!vector || (selectedLayerIds.length === 0 && selectedDecorationIds.length === 0)) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const stepX = ((step * zoom) / Math.max(rect.width, 1)) * 100;
      const stepY = ((step * zoom) / Math.max(rect.height, 1)) * 100;
      if (decorationMode && selectedDecorationIds.length > 0) {
        queueHistory('Moved Decoration');
        setDecorations((current) =>
          current.map((decoration) => {
            if (!selectedDecorationIds.includes(decoration.id) || decoration.locked) return decoration;
            const bounds = clampDecorationBounds({
              ...getDecorationBounds(decoration),
              x: decoration.x + vector.x * stepX,
              y: decoration.y + vector.y * stepY,
            });
            return { ...decoration, x: bounds.x, y: bounds.y };
          })
        );
        return;
      }
      queueHistory('Moved Layer');
      setLayerTransforms((current) => {
        const next = { ...current };
        selectedLayerIds.filter((id) => isEditableLayer(id) && !isLayerLocked(id) && !isLayerHidden(id)).forEach((id) => {
          const bounds = getLayerBounds(id, current);
          if (!bounds) return;
          const moved = clampLayerBounds(getLayerById(id), {
            ...bounds,
            x: bounds.x + vector.x * stepX,
            y: bounds.y + vector.y * stepY,
          });
          next[id] = { ...next[id], x: moved.x, y: moved.y };
        });
        return next;
      });
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === ' ') setSpacePanActive(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    const closeFloatingMenus = () => {
      closeContextMenu();
      setSaveMenuOpen(false);
    };
    document.addEventListener('click', closeFloatingMenus);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('click', closeFloatingMenus);
    };
  }, [clipboard, decorationMode, decorations, historyEntries, layers, redoEntries, selectedDecorationIds, selectedLayerIds, zoom]);

  function setZoomLevel(value: number) {
    setZoom(clampZoom(value));
  }

  function fitScreen() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((value) => clampZoom(Number((value + direction).toFixed(2))));
  }

  function handlePanStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (!spacePanActive && event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panStartRef.current = { clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y };
    setIsPanning(true);
  }

  function handlePanMove(event: PointerEvent<HTMLDivElement>) {
    if (!isPanning) return;
    setPan({
      x: panStartRef.current.x + event.clientX - panStartRef.current.clientX,
      y: panStartRef.current.y + event.clientY - panStartRef.current.clientY,
    });
  }

  function handlePanEnd(event: PointerEvent<HTMLDivElement>) {
    if (!isPanning) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsPanning(false);
  }

  function saveStatusText(): string {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'failed') return 'Save Failed';
    if (saveStatus === 'dirty') return '● Unsaved Changes';
    return '✓ Saved';
  }

  function saveStatusClass(): string {
    if (saveStatus === 'saving') return 'border-blue-400/40 bg-blue-500/10 text-blue-100';
    if (saveStatus === 'failed') return 'border-red-400/40 bg-red-500/10 text-red-100';
    if (saveStatus === 'dirty') return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
    return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
  }

  function renderDecorationShape(decoration: DecorationItem) {
    const gradientId = `gradient-${decoration.id}`;
    const fill = decoration.gradient ? `url(#${gradientId})` : decoration.fill;
    const common = {
      fill,
      stroke: decoration.stroke,
      strokeWidth: decoration.strokeWidth,
      vectorEffect: 'non-scaling-stroke' as const,
    };

    if (decoration.kind === 'svg' && decoration.svgMarkup) {
      return (
        <div
          className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
          style={{ color: decoration.fill }}
          dangerouslySetInnerHTML={{ __html: recolorSvgMarkup(decoration.svgMarkup, decoration.fill) }}
        />
      );
    }

    return (
      <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" aria-hidden="true">
        {decoration.gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={decoration.gradientFrom} />
              <stop offset="100%" stopColor={decoration.gradientTo} />
            </linearGradient>
          </defs>
        )}
        {decoration.kind === 'circle' && <ellipse cx="50" cy="50" rx="43" ry="43" {...common} />}
        {decoration.kind === 'rectangle' && <rect x="10" y="14" width="80" height="72" rx="8" {...common} />}
        {decoration.kind === 'line' && <line x1="8" y1="50" x2="92" y2="50" stroke={decoration.stroke} strokeWidth={decoration.strokeWidth} strokeLinecap="round" />}
        {decoration.kind === 'arrow' && (
          <>
            <line x1="8" y1="50" x2="82" y2="50" stroke={decoration.stroke} strokeWidth={decoration.strokeWidth} strokeLinecap="round" />
            <path d="M80 28 L96 50 L80 72" fill="none" stroke={decoration.stroke} strokeWidth={decoration.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {decoration.kind === 'star' && <polygon points="50,6 61,36 93,37 67,56 76,88 50,70 24,88 33,56 7,37 39,36" {...common} />}
        {decoration.kind === 'triangle' && <polygon points="50,8 92,86 8,86" {...common} />}
        {decoration.kind === 'hexagon' && <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" {...common} />}
      </svg>
    );
  }

  return (
    <div
      className="grid min-h-[72vh] flex-1 grid-cols-1 overflow-hidden bg-[#141518] text-white lg:grid-cols-[var(--layers-width)_minmax(0,1fr)_var(--properties-width)]"
      style={{
        ['--layers-width' as string]: layersCollapsed ? '64px' : '220px',
        ['--properties-width' as string]: propertiesCollapsed ? '56px' : '300px',
      }}
    >
      <motion.aside
        layout
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'order-2 overflow-hidden border-t border-white/10 bg-[#1d1f24]/95 p-3 shadow-xl shadow-black/20 lg:order-1 lg:border-r lg:border-t-0',
          layersCollapsed && 'p-2'
        )}
      >
        <div className={cn('mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/55', layersCollapsed && 'flex-col justify-center gap-2')}>
          <Layers className="h-4 w-4" />
          {!layersCollapsed && <span>Layers</span>}
          <button
            type="button"
            onClick={() => setLayersCollapsed((current) => !current)}
            className={cn(
              'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white',
              layersCollapsed ? 'mx-auto' : 'ml-auto'
            )}
            title={layersCollapsed ? 'Expand layers' : 'Collapse layers'}
            aria-label={layersCollapsed ? 'Expand layers panel' : 'Collapse layers panel'}
          >
            {layersCollapsed ? '>' : '<'}
          </button>
        </div>
        {!layersCollapsed && <label className="mb-2 block">
          <span className="sr-only">Search layers</span>
          <input
            value={layerSearch}
            onChange={(event) => setLayerSearch(event.target.value)}
            placeholder="Search layers"
            className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-2.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-blue-400"
          />
        </label>}
        <div className="grid grid-cols-1 gap-3">
          {layerSections.map((section) => {
            const sectionKey = `section:${section.id}`;
            const sectionCollapsed = collapsedGroupIds.includes(sectionKey);
            return (
              <div key={section.id} className="min-w-0">
                {!layersCollapsed && (
                  <button
                    type="button"
                    onClick={() => setCollapsedGroupIds((current) => sectionCollapsed ? current.filter((id) => id !== sectionKey) : [...current, sectionKey])}
                    className="mb-1 flex w-full items-center gap-1.5 rounded px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/45 hover:bg-white/5 hover:text-white/70"
                    aria-expanded={!sectionCollapsed}
                  >
                    {sectionCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <span>{section.label}</span>
                    <span className="ml-auto rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] text-white/35">{section.layers.length}</span>
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {(!sectionCollapsed || layersCollapsed) && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="grid grid-cols-1 gap-1.5 overflow-hidden"
                    >
                      {section.layers.map((item) => {
                        const layer = layers.find((candidate) => candidate.id === item.id);
                        const Icon = layer ? LAYER_ICON[layer.type] : BoxSelect;
                        const selected = selectedLayerIds.includes(item.id);
                        const meta = layerMeta[item.id];
                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(event) => event.dataTransfer.setData('text/plain', item.id)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              const draggedId = event.dataTransfer.getData('text/plain') as BaseVisualLayerId;
                              if (PANEL_LAYERS.some((layerItem) => layerItem.id === draggedId)) reorderPanelLayer(draggedId, item.id);
                            }}
                            className={cn(
                              'grid items-center gap-1 rounded-lg p-1 transition-all duration-150',
                              layersCollapsed ? 'grid-cols-1 justify-items-center' : 'grid-cols-[1fr_auto_auto]',
                              selected
                                ? 'bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/60'
                                : 'bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => selectLayerFromPanel(item.id)}
                              onMouseEnter={() => setHoveredLayerId(item.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                              className={cn(
                                'flex min-w-0 items-center rounded-md text-left text-xs outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-300',
                                layersCollapsed ? 'h-9 w-9 justify-center' : 'w-full gap-2 px-1.5 py-1'
                              )}
                              aria-label={`Select ${meta.label}`}
                              title={layersCollapsed ? meta.label : undefined}
                            >
                              {!layersCollapsed && <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/25" />}
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10',
                                  item.id === 'background' && 'bg-gradient-to-br from-slate-200 to-slate-500',
                                  item.id === 'decorations' && 'bg-fuchsia-400/60',
                                  item.id === 'product' && 'bg-blue-400/60',
                                  layer?.type === 'text' && 'bg-white/75 text-slate-950',
                                  layer?.type === 'image' && 'bg-sky-400/60'
                                )}
                                aria-hidden="true"
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              {!layersCollapsed && (
                                <input
                                  value={meta.label}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) => updateLayerMeta(item.id, { label: event.target.value || item.label })}
                                  className="min-w-0 flex-1 truncate bg-transparent text-xs font-medium text-inherit outline-none"
                                  aria-label={`Rename ${item.label}`}
                                />
                              )}
                            </button>
                            {!layersCollapsed && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateLayerMeta(item.id, { hidden: !meta.hidden });
                                }}
                                className={cn('flex h-7 w-7 items-center justify-center rounded-md', meta.hidden ? 'bg-white/10 text-white/35' : 'bg-white/8 text-white/65 hover:bg-white/12 hover:text-white')}
                                title={meta.hidden ? 'Show layer' : 'Hide layer'}
                                aria-label={meta.hidden ? `Show ${meta.label}` : `Hide ${meta.label}`}
                              >
                                {meta.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            {!layersCollapsed && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateLayerMeta(item.id, { locked: !meta.locked });
                                }}
                                className={cn('flex h-7 w-7 items-center justify-center rounded-md', meta.locked ? 'bg-fuchsia-500/20 text-fuchsia-100' : 'bg-white/8 text-white/65 hover:bg-white/12 hover:text-white')}
                                title={meta.locked ? 'Unlock layer' : 'Lock layer'}
                                aria-label={meta.locked ? `Unlock ${meta.label}` : `Lock ${meta.label}`}
                              >
                                {meta.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            {!layersCollapsed && item.id === 'decorations' && decorationGroups.length > 0 && (
                              <div className="col-span-3 ml-8 mt-1 space-y-1">
                                {decorationGroups.map((group) => {
                                  const collapsed = collapsedGroupIds.includes(group.id);
                                  return (
                                    <div key={group.id} className="rounded-md border border-white/10 bg-white/[0.03]">
                                      <button
                                        type="button"
                                        onClick={() => setCollapsedGroupIds((current) => collapsed ? current.filter((id) => id !== group.id) : [...current, group.id])}
                                        className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold text-white/65 hover:bg-white/10"
                                      >
                                        <span>{group.name}</span>
                                        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      </button>
                                      {!collapsed && (
                                        <div className="px-2 pb-1 text-[10px] text-white/40">
                                          {group.memberIds.length} decorations
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.aside>

      <main className="order-1 flex min-h-[72vh] min-w-0 flex-col bg-[#18191d] lg:order-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#202228]/95 px-4 py-3 shadow-sm shadow-black/20">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1">
            <button type="button" onClick={() => setZoomLevel(zoom - 0.25)} className="flex h-7 w-7 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white" aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-14 text-center text-xs font-semibold text-white/80">{formatZoom(zoom)}</span>
            <button type="button" onClick={() => setZoomLevel(zoom + 0.25)} className="flex h-7 w-7 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white" aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <div className="mr-1 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1" role="toolbar" aria-label="Alignment tools">
              {([
                ['left', 'L'],
                ['right', 'R'],
                ['top', 'T'],
                ['bottom', 'B'],
                ['center', 'C'],
                ['middle', 'M'],
                ['distribute-h', 'DH'],
                ['distribute-v', 'DV'],
              ] as Array<[AlignAction, string]>).map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => alignSelection(action)}
                  className="flex h-7 min-w-7 items-center justify-center rounded px-1 text-[10px] font-bold text-white/65 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-300"
                  title={{
                    left: 'Align Left',
                    right: 'Align Right',
                    top: 'Align Top',
                    bottom: 'Align Bottom',
                    center: 'Align Center',
                    middle: 'Align Middle',
                    'distribute-h': 'Distribute Horizontally',
                    'distribute-v': 'Distribute Vertically',
                  }[action]}
                  aria-label={{
                    left: 'Align Left',
                    right: 'Align Right',
                    top: 'Align Top',
                    bottom: 'Align Bottom',
                    center: 'Align Center',
                    middle: 'Align Middle',
                    'distribute-h': 'Distribute Horizontally',
                    'distribute-v': 'Distribute Vertically',
                  }[action]}
                >
                  {label}
                </button>
              ))}
            </div>
            <span
              className={cn('mr-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold', saveStatusClass())}
              title={lastSavedAt ? `Last saved ${lastSavedAt.toLocaleString()}` : 'Not saved in this editor session'}
            >
              {saveStatusText()}
            </span>
            <div className="relative" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setSaveMenuOpen((current) => !current)}
                className="h-8 rounded-md bg-blue-500 px-3 text-xs font-semibold text-white shadow-sm shadow-blue-950/30 hover:bg-blue-600"
              >
                Save v
              </button>
              <AnimatePresence>
                {saveMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 z-[100] mt-2 w-44 rounded-xl border border-white/10 bg-[#252831] p-1.5 shadow-2xl shadow-black/40"
                  >
                    {[
                      ['Save', () => void saveCurrentPoster(false), saveStatus !== 'saving' && saveStatus !== 'saved'],
                      ['Save As New', () => void saveCurrentPoster(true), saveStatus !== 'saving'],
                      ['Restore', restoreRecoverySession, Boolean(recoverySession)],
                      ['Version History', () => setShowVersionHistory((current) => !current), true],
                    ].map(([label, action, enabled]) => (
                      <button
                        key={label as string}
                        type="button"
                        disabled={!enabled}
                        onClick={() => {
                          (action as () => void)();
                          setSaveMenuOpen(false);
                        }}
                        className="flex w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-white/75 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:text-white/30"
                      >
                        {label as string}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="button" onClick={fitScreen} className="flex h-8 items-center gap-1.5 rounded-md bg-white/8 px-2.5 text-xs font-medium text-white/70 hover:bg-white/12 hover:text-white">
              <Maximize2 className="h-3.5 w-3.5" />
              Fit Screen
            </button>
          </div>
        </div>

        {recoverySession && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-50">
            <span className="font-medium">Recovered unsaved editor changes from {new Date(recoverySession.savedAt).toLocaleString()}.</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={restoreRecoverySession} className="rounded-md bg-amber-400 px-2.5 py-1.5 font-semibold text-slate-950 hover:bg-amber-300">
                Restore Previous Session
              </button>
              <button type="button" onClick={discardRecoverySession} className="rounded-md border border-amber-200/30 px-2.5 py-1.5 font-semibold text-amber-50 hover:bg-amber-400/10">
                Discard Session
              </button>
            </div>
          </div>
        )}

          <div
            className={cn(
              'relative flex flex-1 touch-none items-center justify-center overflow-hidden bg-[#17181b] p-8',
              isPanning ? 'cursor-grabbing' : spacePanActive ? 'cursor-grab' : 'cursor-default'
            )}
            onWheel={handleWheel}
            onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onPointerCancel={handlePanEnd}
        >
          <div
            ref={canvasRef}
            className="relative w-[min(78vw,820px)] min-w-[280px] max-w-full shrink-0 rounded-sm shadow-2xl shadow-black/60 transition-transform duration-150 ease-out"
            style={{
              aspectRatio: getPosterRatio(poster.size),
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
            }}
          >
            {poster.posterUrl ? (
              <img
                src={poster.posterUrl}
                alt={`Poster for ${poster.productName}`}
                className="h-full w-full select-none object-contain"
                draggable={false}
              />
            ) : poster.editableSvg ? (
              <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: poster.editableSvg }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-900 text-sm text-white/45">
                No preview available
              </div>
            )}

            {!layerMeta.background.hidden && (selectedLayer?.id === 'background' || backgroundHasChanges(backgroundEdit)) && (
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 z-10 overflow-hidden transition-opacity duration-150',
                  dragOverBackground && 'ring-2 ring-fuchsia-300 ring-inset'
                )}
                style={{
                  backgroundColor: backgroundEdit.solidColor,
                  backgroundImage: backgroundEdit.gradientEnabled ? backgroundGradient(backgroundEdit) : undefined,
                  boxShadow: backgroundEdit.shadow > 0 ? `inset 0 0 ${backgroundEdit.shadow * 2}px rgba(0,0,0,.35)` : undefined,
                }}
              >
                {backgroundEdit.imageSrc && (
                  <img
                    src={backgroundEdit.imageSrc}
                    alt={backgroundEdit.imageName ?? 'Background'}
                    className="h-full w-full select-none"
                    draggable={false}
                    style={{
                      objectFit: backgroundObjectFit(backgroundEdit.imageMode),
                      objectPosition: `${backgroundEdit.imageX}% ${backgroundEdit.imageY}%`,
                      transform: `scale(${backgroundEdit.imageScale}) rotate(${backgroundEdit.imageRotation}deg)`,
                      filter: `blur(${backgroundEdit.blur}px) brightness(${backgroundEdit.brightness}%) contrast(${backgroundEdit.contrast}%) saturate(${backgroundEdit.saturation}%)`,
                    }}
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: hexToRgba(backgroundEdit.overlayColor, backgroundEdit.overlayOpacity) }}
                />
                <div
                  className="absolute inset-0 mix-blend-overlay"
                  style={{
                    opacity: backgroundEdit.noise / 100,
                    backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,.8) 0 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(0,0,0,.45) 0 1px, transparent 1px)',
                    backgroundSize: '12px 12px, 10px 10px',
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    opacity: backgroundEdit.textureStrength / 100,
                    backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,.25) 25%, transparent 25%, transparent 50%, rgba(0,0,0,.18) 50%, rgba(0,0,0,.18) 75%, transparent 75%)',
                    backgroundSize: '18px 18px',
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    opacity: backgroundEdit.vignette / 100,
                    backgroundImage: 'radial-gradient(circle at center, transparent 45%, rgba(0,0,0,.85) 100%)',
                  }}
                />
              </div>
            )}

            <div
              className="absolute inset-0"
              onContextMenu={(event) => openContextMenu(event, 'canvas')}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerEnd}
              onPointerCancel={handleCanvasPointerEnd}
            >
              {guides.map((guide) => (
                <div
                  key={guide.id}
                  className={cn(
                    'pointer-events-none absolute z-30 bg-fuchsia-400/90 shadow-[0_0_12px_rgba(217,70,239,0.75)] transition-all duration-100 ease-out',
                    guide.orientation === 'vertical' ? 'top-0 h-full w-px' : 'left-0 h-px w-full'
                  )}
                  style={
                    guide.orientation === 'vertical'
                      ? { left: `${guide.position}%` }
                      : { top: `${guide.position}%` }
                  }
                >
                  {guide.label && (
                    <span
                      className={cn(
                        'absolute rounded bg-fuchsia-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm',
                        guide.orientation === 'vertical' ? 'left-1 top-2' : 'left-2 top-1'
                      )}
                    >
                      {guide.label}
                    </span>
                  )}
                </div>
              ))}

              {alignmentIndicators.map((indicator) => (
                <span
                  key={indicator.id}
                  className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded bg-fuchsia-500 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-95 shadow-sm transition-all duration-100 ease-out"
                  style={{ left: `${indicator.x}%`, top: `${indicator.y}%` }}
                >
                  {indicator.label}
                </span>
              ))}

              {visibleDecorations.map((decoration) => {
                const active = selectedDecorationIds.includes(decoration.id);
                const groupActive = decoration.groupId && selectedDecorations.some((item) => item.groupId === decoration.groupId);
                const controlsVisible = decorationMode && (active || groupActive);
                return (
                  <button
                    key={decoration.id}
                    type="button"
                    onContextMenu={(event) => {
                      setSelectedLayerIds(['decorations']);
                      setSelectedDecorationIds([decoration.id]);
                      openContextMenu(event, 'decoration');
                    }}
                    onPointerDown={(event) => handleDecorationPointerDown(event, decoration)}
                    onPointerMove={handleDecorationPointerMove}
                    onPointerUp={handleDecorationPointerEnd}
                    onPointerCancel={handleDecorationPointerEnd}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      setSelectedLayerIds(['decorations']);
                      setSelectedDecorationIds([decoration.id]);
                      setPropertyPanelOpen(true);
                    }}
                    className={cn(
                      'absolute rounded-sm outline-none transition-[border-color,box-shadow,opacity] duration-100',
                      decorationMode ? 'pointer-events-auto z-30 cursor-move' : 'pointer-events-none z-[18]',
                      controlsVisible ? 'border border-fuchsia-300 bg-fuchsia-400/10 shadow-[0_0_0_1px_rgba(255,255,255,0.45)_inset]' : 'border border-transparent',
                      decoration.locked && 'cursor-not-allowed opacity-70'
                    )}
                    style={{
                      left: `${decoration.x}%`,
                      top: `${decoration.y}%`,
                      width: `${decoration.width}%`,
                      height: `${decoration.height}%`,
                      opacity: decoration.opacity,
                      transform: `rotate(${decoration.rotation}deg) scaleX(${decoration.flipX ? -1 : 1}) scaleY(${decoration.flipY ? -1 : 1})`,
                      transformOrigin: 'center',
                      filter: [
                        decoration.blur > 0 ? `blur(${decoration.blur}px)` : '',
                        decoration.glow > 0 ? `drop-shadow(0 0 ${decoration.glow}px ${decoration.fill})` : '',
                        decoration.shadow > 0 ? `drop-shadow(0 ${decoration.shadow / 2}px ${decoration.shadow}px rgba(0,0,0,.45))` : '',
                      ].filter(Boolean).join(' '),
                    }}
                    aria-label={`Select ${decoration.name}`}
                    title={decoration.name}
                  >
                    {controlsVisible && (
                      <span className="pointer-events-none absolute -top-7 left-0 rounded bg-fuchsia-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                        {decoration.groupId ? decorationGroups.find((group) => group.id === decoration.groupId)?.name ?? decoration.name : decoration.name}
                      </span>
                    )}
                    {renderDecorationShape(decoration)}
                  </button>
                );
              })}

              {layers.map((layer) => {
                if (isLayerHidden(layer.id)) return null;
                const active = selectedLayerIds.includes(layer.id);
                const hovered = layer.id === hoveredLayerId;
                const showControls = active || hovered;
                const imageState = layer.type === 'image' ? getImageState(layer.id) : null;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onContextMenu={(event) => {
                      setSelectedLayerIds([layer.id]);
                      setSelectedDecorationIds([]);
                      openContextMenu(event, 'layer');
                    }}
                    onPointerDown={(event) => handleLayerPointerDown(event, layer.id)}
                    onPointerMove={handleLayerPointerMove}
                    onPointerUp={handleLayerPointerEnd}
                    onPointerCancel={handleLayerPointerEnd}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (layer.type === 'text') enterTextEdit(layer.id);
                      else {
                        setSelectedLayerIds([layer.id]);
                        setPropertyPanelOpen(true);
                      }
                    }}
                    onMouseEnter={() => setHoveredLayerId(layer.id)}
                    onMouseLeave={() => setHoveredLayerId(null)}
                    onDragOver={(event) => {
                      if (layer.id === 'background') {
                        event.preventDefault();
                        setDragOverBackground(true);
                        return;
                      }
                      if (layer.type !== 'image') return;
                      event.preventDefault();
                      setDragOverImageLayerId(layer.id);
                    }}
                    onDragLeave={() => {
                      if (layer.id === 'background') setDragOverBackground(false);
                      setDragOverImageLayerId((current) => current === layer.id ? null : current);
                    }}
                    onDrop={(event) => {
                      if (layer.id === 'background') handleBackgroundDrop(event);
                      if (layer.type === 'image') handleImageDrop(event, layer.id);
                    }}
                    className={cn(
                      'group absolute rounded-sm outline-none transition-colors',
                      layer.id === 'background' ? 'z-[11]' : 'z-20',
                      showControls ? 'border border-blue-400 bg-blue-500/5' : 'border border-transparent bg-transparent',
                      (layer.type === 'image' || layer.id === 'background') && 'overflow-hidden',
                      isLayerLocked(layer.id) && 'cursor-not-allowed opacity-75'
                    )}
                    style={{
                      left: `${layer.bounds.x}%`,
                      top: `${layer.bounds.y}%`,
                      width: `${Math.max(layer.bounds.width, 4)}%`,
                      height: `${Math.max(layer.bounds.height, 4)}%`,
                      transform: `rotate(${layer.rotation}deg)`,
                      transformOrigin: 'center',
                    }}
                    aria-label={`Select ${layer.label}`}
                    title={layer.label}
                  >
                    {showControls && (
                      <>
                        <span className="absolute -top-7 left-0 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                          {layer.label}
                        </span>
                      </>
                    )}
                    {imageState && (
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-0 overflow-hidden',
                          dragOverImageLayerId === layer.id && 'ring-2 ring-fuchsia-300 ring-inset'
                        )}
                        style={{
                          opacity: imageState.opacity,
                          borderRadius: `${imageState.borderRadius}px`,
                          clipPath: imageState.crop.enabled
                            ? `inset(${imageState.crop.y}% ${100 - imageState.crop.x - imageState.crop.width}% ${100 - imageState.crop.y - imageState.crop.height}% ${imageState.crop.x}%)`
                            : undefined,
                          boxShadow: [
                            imageState.shadow > 0 ? `0 ${imageState.shadow}px ${imageState.shadow * 2}px rgba(0,0,0,.35)` : '',
                            imageState.glow > 0 ? `0 0 ${imageState.glow}px rgba(59,130,246,.8)` : '',
                          ].filter(Boolean).join(', '),
                        }}
                      >
                        {imageState.src ? (
                          <img
                            src={imageState.src}
                            alt={imageState.fileName ?? layer.label}
                            draggable={false}
                            className="h-full w-full select-none object-cover"
                            style={{
                              transform: `scale(${imageState.scale * imageState.crop.zoom}) scaleX(${imageState.flipX ? -1 : 1}) scaleY(${imageState.flipY ? -1 : 1})`,
                              filter: `brightness(${imageState.brightness}%) contrast(${imageState.contrast}%) saturate(${imageState.saturation}%) blur(${imageState.blur}px)`,
                              transformOrigin: `${imageState.crop.x + imageState.crop.width / 2}% ${imageState.crop.y + imageState.crop.height / 2}%`,
                            }}
                          />
                        ) : active ? (
                          <div className="flex h-full w-full items-center justify-center rounded-sm bg-slate-950/35 px-2 text-center text-[10px] font-semibold text-white/70 ring-1 ring-white/20 ring-inset">
                            Drop or upload image
                          </div>
                        ) : null}
                      </div>
                    )}
                    {imageState?.crop.enabled && imageState.src && active && (
                      <div
                        className="absolute z-[60] border border-fuchsia-300 bg-fuchsia-400/10 shadow-[0_0_0_999px_rgba(15,23,42,.35)]"
                        style={{
                          left: `${imageState.crop.x}%`,
                          top: `${imageState.crop.y}%`,
                          width: `${imageState.crop.width}%`,
                          height: `${imageState.crop.height}%`,
                        }}
                        onPointerDown={(event) => handleCropPointerDown(event, layer, 'move')}
                        onPointerMove={handleCropPointerMove}
                        onPointerUp={handleCropPointerEnd}
                        onPointerCancel={handleCropPointerEnd}
                      >
                        {(['top-left', 'top-right', 'bottom-right', 'bottom-left'] as CropHandle[]).map((handle) => (
                          <span
                            key={handle}
                            className={cn(
                              'absolute h-2.5 w-2.5 rounded-full border border-white bg-fuchsia-500',
                              handle === 'top-left' && '-left-1 -top-1 cursor-nwse-resize',
                              handle === 'top-right' && '-right-1 -top-1 cursor-nesw-resize',
                              handle === 'bottom-right' && '-bottom-1 -right-1 cursor-nwse-resize',
                              handle === 'bottom-left' && '-bottom-1 -left-1 cursor-nesw-resize'
                            )}
                            onPointerDown={(event) => handleCropPointerDown(event, layer, handle)}
                            onPointerMove={handleCropPointerMove}
                            onPointerUp={handleCropPointerEnd}
                            onPointerCancel={handleCropPointerEnd}
                          />
                        ))}
                      </div>
                    )}
                    {layer.type === 'text' && (
                      <div
                        ref={(node) => {
                          editableTextRefs.current[layer.id] = node;
                        }}
                        data-text-editor="true"
                        contentEditable={editingTextLayerId === layer.id}
                        suppressContentEditableWarning
                        spellCheck={false}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedLayerIds([layer.id]);
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          enterTextEdit(layer.id);
                        }}
                        onInput={(event) => {
                          const singleLine = layer.id === 'cta' || layer.id === 'price' || layer.label.toLowerCase().includes('logo');
                          const rawText = event.currentTarget.innerText;
                          const content = singleLine ? rawText.replace(/\n/g, ' ') : rawText;
                          if (singleLine && rawText !== content) event.currentTarget.innerText = content;
                          const nextStyle = getTextState(layer).style;
                          updateTextState(layer.id, {
                            content,
                            style: { fontSize: fitHeadlineFont(layer.id, content, nextStyle) },
                          }, false);
                          growTextBoxIfNeeded(layer.id, event.currentTarget);
                        }}
                        onKeyDown={(event) => {
                          const singleLine = layer.id === 'cta' || layer.id === 'price' || layer.label.toLowerCase().includes('logo');
                          if (singleLine && event.key === 'Enter') event.preventDefault();
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            finishTextEdit(layer.id);
                            event.currentTarget.blur();
                          }
                        }}
                        onBlur={() => finishTextEdit(layer.id)}
                        className={cn(
                          'h-full w-full overflow-hidden outline-none',
                          editingTextLayerId === layer.id ? 'cursor-text select-text' : 'cursor-text select-none'
                        )}
                        style={{
                          color: layer.textStyle.color,
                          fontSize: `${Math.max(MIN_TEXT_FONT_SIZE, layer.textStyle.fontSize * layer.fontScale)}px`,
                          fontWeight: layer.textStyle.fontWeight,
                          fontStyle: layer.textStyle.italic ? 'italic' : 'normal',
                          letterSpacing: `${layer.textStyle.letterSpacing}px`,
                          lineHeight: layer.textStyle.lineHeight,
                          textAlign: layer.textStyle.align,
                          textDecoration: layer.textStyle.underline ? 'underline' : 'none',
                          textTransform: layer.textStyle.uppercase ? 'uppercase' : 'none',
                          whiteSpace: layer.id === 'cta' || layer.id === 'price' ? 'nowrap' : 'pre-wrap',
                          overflowWrap: 'anywhere',
                          textOverflow: 'ellipsis',
                          caretColor: layer.textStyle.color,
                        }}
                      >
                        {layer.textContent}
                      </div>
                    )}
                  </button>
                );
              })}

              <AnimatePresence>
                {selectedGroupBounds && (selectedLayer || selectedDecorationIds.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute z-[80] flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-xl border border-white/10 bg-[#252831]/95 p-1.5 text-xs text-white shadow-2xl shadow-black/40 backdrop-blur"
                    style={{
                      left: `${clampPercent(selectedGroupBounds.x + selectedGroupBounds.width / 2)}%`,
                      top: `${Math.max(2, selectedGroupBounds.y - 2)}%`,
                    }}
                  >
                    {selectedTextState && (
                      <>
                        <button type="button" onClick={() => selectedLayer && updateTextState(selectedLayer.id, { style: { fontWeight: selectedTextState.style.fontWeight >= 700 ? 400 : 700 } })} className="rounded-lg px-2 py-1 font-bold hover:bg-white/10" title="Bold">B</button>
                        <button type="button" onClick={() => selectedLayer && updateTextState(selectedLayer.id, { style: { italic: !selectedTextState.style.italic } })} className="rounded-lg px-2 py-1 italic hover:bg-white/10" title="Italic">I</button>
                        <button type="button" onClick={() => selectedLayer && updateTextState(selectedLayer.id, { style: { align: selectedTextState.style.align === 'center' ? 'left' : 'center' } })} className="rounded-lg px-2 py-1 hover:bg-white/10" title="Alignment">Align</button>
                        <input type="color" value={selectedTextState.style.color} onChange={(event) => selectedLayer && updateTextState(selectedLayer.id, { style: { color: event.target.value } })} className="h-7 w-8 rounded border border-white/10 bg-transparent p-0.5" title="Text color" />
                        <input type="number" min={MIN_TEXT_FONT_SIZE} max={160} value={selectedTextState.style.fontSize} onChange={(event) => selectedLayer && updateTextState(selectedLayer.id, { style: { fontSize: Number(event.target.value) } })} className="h-7 w-14 rounded-lg border border-white/10 bg-white/5 px-1 text-xs outline-none" title="Font size" />
                      </>
                    )}
                    {selectedImageState && selectedLayer && (
                      <>
                        <button type="button" onClick={() => updateImageState(selectedLayer.id, { crop: { enabled: !selectedImageState.crop.enabled } })} className="rounded-lg px-2 py-1 hover:bg-white/10" title="Crop">Crop</button>
                        <button type="button" onClick={() => imageInputRef.current?.click()} className="rounded-lg px-2 py-1 hover:bg-white/10" title="Replace image">Replace</button>
                        <button type="button" onClick={() => updateImageState(selectedLayer.id, { flipX: !selectedImageState.flipX })} className="rounded-lg px-2 py-1 hover:bg-white/10" title="Flip">Flip</button>
                      </>
                    )}
                    {decorationMode && selectedDecorationIds.length > 0 && (
                      <>
                        <input type="color" value={activeDecoration?.fill ?? '#ffffff'} onChange={(event) => updateSelectedDecorations({ fill: event.target.value, gradientFrom: event.target.value })} className="h-7 w-8 rounded border border-white/10 bg-transparent p-0.5" title="Fill color" />
                        <button type="button" onClick={() => orderSelectedDecorations('front')} className="rounded-lg px-2 py-1 hover:bg-white/10" title="Bring to front">Front</button>
                      </>
                    )}
                    <span className="mx-1 h-5 w-px bg-white/10" />
                    <button type="button" onClick={duplicateSelectedObjects} className="rounded-lg px-2 py-1 hover:bg-white/10" title="Duplicate">Duplicate</button>
                    <button type="button" onClick={deleteSelectedObjects} className="rounded-lg px-2 py-1 text-red-100 hover:bg-red-500/20" title="Delete">Delete</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {selectedGroupBounds && selectedLayerIds.some(isEditableLayer) && !(decorationMode && selectedDecorationIds.length > 0) && (
                <div
                  className="pointer-events-none absolute z-50 rounded-md border-2 border-blue-400/95 bg-blue-500/5 shadow-[0_0_0_1px_rgba(255,255,255,0.8)_inset,0_0_22px_rgba(59,130,246,0.22)] transition-all duration-150 ease-out"
                  style={{
                    left: `${selectedGroupBounds.x}%`,
                    top: `${selectedGroupBounds.y}%`,
                    width: `${Math.max(selectedGroupBounds.width, 1)}%`,
                    height: `${Math.max(selectedGroupBounds.height, 1)}%`,
                    transform: `rotate(${selectedGroupRotation}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  {RESIZE_HANDLES.map((handle) => (
                    <button
                      key={handle.id}
                      type="button"
                      aria-label={`Resize ${handle.id}`}
                      title={`Resize ${handle.id}`}
                      onPointerDown={(event) => handleResizePointerDown(event, handle.id)}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerEnd}
                      onPointerCancel={handleResizePointerEnd}
                      className={cn(
                        'pointer-events-auto absolute h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-md shadow-blue-950/30 transition-transform duration-150 hover:scale-125',
                        handle.className,
                        handle.cursor
                      )}
                    />
                  ))}
                  <span className="absolute left-1/2 top-0 h-10 w-0.5 -translate-x-1/2 -translate-y-10 bg-blue-400" />
                  <button
                    type="button"
                    aria-label="Rotate selection"
                    title="Rotate selection"
                    onPointerDown={handleRotatePointerDown}
                    onPointerMove={handleRotatePointerMove}
                    onPointerUp={handleRotatePointerEnd}
                    onPointerCancel={handleRotatePointerEnd}
                    className="pointer-events-auto absolute left-1/2 top-0 flex h-8 w-8 -translate-x-1/2 -translate-y-16 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-white shadow-lg shadow-blue-950/30 transition-transform duration-150 hover:scale-110"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {transformFeedback && (
                <span
                  className="pointer-events-none absolute z-[70] -translate-x-1/2 -translate-y-full rounded bg-slate-950/95 px-2 py-1 text-[11px] font-semibold text-white shadow-lg ring-1 ring-white/15 transition-all duration-100 ease-out"
                  style={{ left: `${transformFeedback.x}%`, top: `${transformFeedback.y}%` }}
                >
                  {transformFeedback.label}
                </span>
              )}

              {selectionBox && (
                <div
                  className="pointer-events-none absolute z-50 rounded-sm border border-blue-300 bg-blue-400/15 shadow-[0_0_0_1px_rgba(255,255,255,0.25)_inset]"
                  style={{
                    left: `${selectionBox.x}%`,
                    top: `${selectionBox.y}%`,
                    width: `${selectionBox.width}%`,
                    height: `${selectionBox.height}%`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <motion.aside
        layout
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'order-3 overflow-hidden border-t border-white/10 bg-[#1d1f24]/95 p-4 shadow-xl shadow-black/20 transition-colors lg:border-l lg:border-t-0',
          propertyPanelOpen && 'border-blue-400/50 bg-[#20232b]',
          propertiesCollapsed && 'p-2'
        )}
      >
        <div className={cn('mb-3 flex items-center gap-2', propertiesCollapsed && 'flex-col justify-center gap-2')}>
          <MousePointer2 className={cn('h-4 w-4 shrink-0', propertyPanelOpen ? 'text-fuchsia-300' : 'text-blue-300')} />
          {!propertiesCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Properties</p>
              <p className="truncate text-xs text-white/45">
                {selectedLayer?.label ?? (selectedLayers.length > 1 ? `${selectedLayers.length} layers selected` : 'No layer selected')}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setPropertiesCollapsed((current) => !current)}
            className={cn(
              'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white',
              propertiesCollapsed ? 'mx-auto' : 'ml-auto'
            )}
            title={propertiesCollapsed ? 'Expand properties' : 'Collapse properties'}
            aria-label={propertiesCollapsed ? 'Expand properties panel' : 'Collapse properties panel'}
          >
            {propertiesCollapsed ? '<' : '>'}
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleImageInputChange}
        />
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleBackgroundInputChange}
        />
        <input
          ref={svgInputRef}
          type="file"
          accept="image/svg+xml,.svg"
          className="hidden"
          onChange={handleSvgInputChange}
        />

        {!propertiesCollapsed && (
          <>
        {showVersionHistory && (
          <div className="mb-4 rounded-md border border-fuchsia-400/20 bg-fuchsia-500/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-100">Version History</p>
                <p className="text-[11px] text-white/45">{versionHistory.length} saved versions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionHistory(false)}
                className="rounded px-2 py-1 text-[11px] font-semibold text-white/60 hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
              {versionHistory.length > 0 ? (
                versionHistory.slice().reverse().map((version, index) => (
                  <div key={version.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/85">{version.label || `Version ${versionHistory.length - index}`}</p>
                      <p className="text-[10px] text-white/40">{new Date(version.timestamp).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => restoreVersion(version)}
                      className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-[11px] font-semibold text-white/75 hover:bg-white/12 hover:text-white"
                    >
                      Restore
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] px-3 py-3 text-xs text-white/45">
                  Versions appear here after saving.
                </div>
              )}
            </div>
          </div>
        )}

        {decorationMode ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Category</span>
              <select
                value={decorationCategory}
                onChange={(event) => setDecorationCategory(event.target.value as DecorationCategory)}
                className="w-full rounded-md border border-white/10 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none focus:border-fuchsia-400"
              >
                {DECORATION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/60">Add Decorations</span>
              <div className="grid grid-cols-2 gap-1.5">
                {DECORATION_TOOLS.map((tool) => (
                  <button
                    key={tool.kind}
                    type="button"
                    onClick={() => tool.kind === 'svg' ? svgInputRef.current?.click() : addDecoration(tool.kind)}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={duplicateDecorations} disabled={selectedDecorationIds.length === 0} className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-40">
                Duplicate
              </button>
              <button type="button" onClick={deleteSelectedDecorations} disabled={selectedDecorationIds.length === 0} className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-40">
                Delete
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                ['Bring Forward', 'forward'],
                ['Send Backward', 'backward'],
                ['Bring To Front', 'front'],
                ['Send To Back', 'back'],
              ].map(([label, action]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => orderSelectedDecorations(action as 'forward' | 'backward' | 'front' | 'back')}
                  disabled={selectedDecorationIds.length === 0}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-semibold text-white hover:bg-white/10 disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={groupSelectedDecorations} disabled={selectedDecorationIds.length < 2} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40">
                Group
              </button>
              <button type="button" onClick={ungroupSelectedDecorations} disabled={!selectedDecorations.some((item) => item.groupId)} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40">
                Ungroup
              </button>
            </div>

            {activeDecoration ? (
              <div className="space-y-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-white/60">Name</span>
                  <input
                    value={activeDecoration.name}
                    onChange={(event) => updateDecoration(activeDecoration.id, { name: event.target.value })}
                    className="w-full rounded-md border border-white/10 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none focus:border-fuchsia-400"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => updateDecoration(activeDecoration.id, { hidden: !activeDecoration.hidden })} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">
                    {activeDecoration.hidden ? 'Show' : 'Hide'}
                  </button>
                  <button type="button" onClick={() => updateDecoration(activeDecoration.id, { locked: !activeDecoration.locked })} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">
                    {activeDecoration.locked ? 'Unlock' : 'Lock'}
                  </button>
                </div>

                {activeDecoration.kind === 'svg' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => svgInputRef.current?.click()} className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600">
                      Replace SVG
                    </button>
                    <button type="button" onClick={() => svgInputRef.current?.click()} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">
                      Upload SVG
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="mb-1 block text-[11px] text-white/45">Fill Color</span>
                    <input type="color" value={activeDecoration.fill} onChange={(event) => updateSelectedDecorations({ fill: event.target.value, gradientFrom: event.target.value })} className="h-8 w-full rounded border border-white/10 bg-white/5 p-1" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] text-white/45">Stroke Color</span>
                    <input type="color" value={activeDecoration.stroke} onChange={(event) => updateSelectedDecorations({ stroke: event.target.value })} className="h-8 w-full rounded border border-white/10 bg-white/5 p-1" />
                  </label>
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/70">Gradient Fill</span>
                    <button
                      type="button"
                      onClick={() => updateSelectedDecorations({ gradient: !activeDecoration.gradient })}
                      className={cn('rounded px-2 py-1 text-[11px] font-semibold', activeDecoration.gradient ? 'bg-fuchsia-500/20 text-fuchsia-100' : 'bg-white/10 text-white/70')}
                    >
                      {activeDecoration.gradient ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="color" value={activeDecoration.gradientFrom} onChange={(event) => updateSelectedDecorations({ gradientFrom: event.target.value, gradient: true })} className="h-8 w-full rounded border border-white/10 bg-white/5 p-1" />
                    <input type="color" value={activeDecoration.gradientTo} onChange={(event) => updateSelectedDecorations({ gradientTo: event.target.value, gradient: true })} className="h-8 w-full rounded border border-white/10 bg-white/5 p-1" />
                  </div>
                </div>

                {[
                  ['X', 'x', 0, 100, 0.1],
                  ['Y', 'y', 0, 100, 0.1],
                  ['Width', 'width', 1, 100, 0.1],
                  ['Height', 'height', 1, 100, 0.1],
                  ['Rotate', 'rotation', -180, 180, 1],
                  ['Stroke Width', 'strokeWidth', 0, 16, 0.5],
                  ['Opacity', 'opacity', 0, 1, 0.01],
                  ['Shadow', 'shadow', 0, 48, 1],
                  ['Glow', 'glow', 0, 48, 1],
                  ['Blur', 'blur', 0, 20, 0.1],
                ].map(([label, key, min, max, step]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={activeDecoration[key as keyof DecorationItem] as number}
                      onChange={(event) => updateSelectedDecorations({ [key]: Number(event.target.value) })}
                      className="w-full accent-fuchsia-400"
                    />
                  </label>
                ))}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSelectedDecorations({ flipX: !activeDecoration.flipX })}
                    className={cn('rounded-md border px-3 py-2 text-xs font-semibold text-white', activeDecoration.flipX ? 'border-fuchsia-400 bg-fuchsia-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10')}
                  >
                    Flip Horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedDecorations({ flipY: !activeDecoration.flipY })}
                    className={cn('rounded-md border px-3 py-2 text-xs font-semibold text-white', activeDecoration.flipY ? 'border-fuchsia-400 bg-fuchsia-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10')}
                  >
                    Flip Vertical
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
                Select one decoration on the canvas to edit color, effects, SVG, transform, and layer order.
              </div>
            )}
          </div>
        ) : selectedLayer && selectedBackgroundState ? (
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/60">Presets</span>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.keys(BACKGROUND_PRESETS).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => applyBackgroundPreset(name)}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-xs font-semibold text-white transition-colors',
                      selectedBackgroundState.preset === name ? 'border-fuchsia-400 bg-fuchsia-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Solid Color</span>
              <input
                type="color"
                value={selectedBackgroundState.solidColor}
                onChange={(event) => updateBackgroundState({ solidColor: event.target.value, preset: 'Custom' })}
                className="h-9 w-full rounded-md border border-white/10 bg-white/5 p-1"
              />
            </label>

            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/70">Gradient</span>
                <button
                  type="button"
                  onClick={() => updateBackgroundState({ gradientEnabled: !selectedBackgroundState.gradientEnabled, preset: 'Custom' })}
                  className={cn('rounded px-2 py-1 text-[11px] font-semibold', selectedBackgroundState.gradientEnabled ? 'bg-fuchsia-500/20 text-fuchsia-100' : 'bg-white/10 text-white/70')}
                >
                  {selectedBackgroundState.gradientEnabled ? 'On' : 'Off'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['linear', 'radial'] as BackgroundGradientType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateBackgroundState({ gradientType: type, gradientEnabled: true, preset: 'Custom' })}
                    className={cn('rounded-md border px-2 py-1.5 text-xs font-semibold capitalize text-white', selectedBackgroundState.gradientType === type ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-white/5')}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs text-white/50">Angle</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={selectedBackgroundState.gradientAngle}
                  onChange={(event) => updateBackgroundState({ gradientAngle: Number(event.target.value), preset: 'Custom' })}
                  className="w-full accent-fuchsia-400"
                />
              </label>
              {selectedBackgroundState.gradientStops.map((stop, index) => (
                <div key={stop.id} className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
                  <label>
                    <span className="mb-1 block text-[11px] text-white/45">Stop {index + 1}</span>
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(event) => updateGradientStop(stop.id, { color: event.target.value })}
                      className="h-8 w-full rounded border border-white/10 bg-white/5 p-1"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] text-white/45">Opacity</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={stop.opacity}
                      onChange={(event) => updateGradientStop(stop.id, { opacity: Number(event.target.value) })}
                      className="w-full accent-fuchsia-400"
                    />
                  </label>
                  <label className="col-span-2">
                    <span className="mb-1 block text-[11px] text-white/45">Position</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={stop.position}
                      onChange={(event) => updateGradientStop(stop.id, { position: Number(event.target.value) })}
                      className="w-full accent-fuchsia-400"
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => backgroundInputRef.current?.click()} className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600">
                Replace Background
              </button>
              <button type="button" onClick={() => backgroundInputRef.current?.click()} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">
                Upload Background
              </button>
            </div>
            <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
              Drag PNG, JPG, JPEG, or WEBP onto the background.
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Mode</span>
              <select
                value={selectedBackgroundState.imageMode}
                onChange={(event) => updateBackgroundState({ imageMode: event.target.value as BackgroundImageMode })}
                className="w-full rounded-md border border-white/10 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none focus:border-blue-400"
              >
                <option value="fit">Fit</option>
                <option value="fill">Fill</option>
                <option value="stretch">Stretch</option>
                <option value="center">Center</option>
              </select>
            </label>

            {[
              ['Move X', 'imageX', 0, 100, 1],
              ['Move Y', 'imageY', 0, 100, 1],
              ['Scale', 'imageScale', 0.25, 3, 0.01],
              ['Rotate', 'imageRotation', -180, 180, 1],
              ['Blur', 'blur', 0, 30, 0.1],
              ['Brightness', 'brightness', 0, 200, 1],
              ['Contrast', 'contrast', 0, 200, 1],
              ['Saturation', 'saturation', 0, 200, 1],
              ['Overlay Opacity', 'overlayOpacity', 0, 1, 0.01],
              ['Noise', 'noise', 0, 100, 1],
              ['Texture Strength', 'textureStrength', 0, 100, 1],
              ['Vignette', 'vignette', 0, 100, 1],
              ['Shadow', 'shadow', 0, 60, 1],
            ].map(([label, key, min, max, step]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={selectedBackgroundState[key as keyof BackgroundEditState] as number}
                  onChange={(event) => updateBackgroundState({ [key]: Number(event.target.value) })}
                  className="w-full accent-blue-400"
                />
              </label>
            ))}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Overlay Color</span>
              <input
                type="color"
                value={selectedBackgroundState.overlayColor}
                onChange={(event) => updateBackgroundState({ overlayColor: event.target.value })}
                className="h-9 w-full rounded-md border border-white/10 bg-white/5 p-1"
              />
            </label>
          </div>
        ) : selectedLayer && selectedImageState ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
              >
                Replace Image
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Upload Image
              </button>
            </div>
            <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
              Drag PNG, JPG, JPEG, or WEBP onto the selected image layer.
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Scale</span>
              <input
                type="range"
                min={0.25}
                max={3}
                step={0.01}
                value={selectedImageState.scale}
                onChange={(event) => updateImageState(selectedLayer.id, { scale: Number(event.target.value) })}
                className="w-full accent-blue-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Rotation</span>
              <input
                type="range"
                min={-180}
                max={180}
                value={selectedLayer.rotation}
                onChange={(event) => commitLayerTransforms({ [selectedLayer.id]: { rotation: Number(event.target.value) } }, `Rotated ${selectedLayer.label}`)}
                className="w-full accent-blue-400"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateImageState(selectedLayer.id, { flipX: !selectedImageState.flipX })}
                className={cn('rounded-md border px-3 py-2 text-xs font-semibold text-white', selectedImageState.flipX ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10')}
              >
                Flip Horizontal
              </button>
              <button
                type="button"
                onClick={() => updateImageState(selectedLayer.id, { flipY: !selectedImageState.flipY })}
                className={cn('rounded-md border px-3 py-2 text-xs font-semibold text-white', selectedImageState.flipY ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10')}
              >
                Flip Vertical
              </button>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Opacity</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={selectedImageState.opacity}
                onChange={(event) => updateImageState(selectedLayer.id, { opacity: Number(event.target.value) })}
                className="w-full accent-blue-400"
              />
            </label>

            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/70">Crop</span>
                <button
                  type="button"
                  onClick={() => updateImageState(selectedLayer.id, { crop: { enabled: !selectedImageState.crop.enabled } })}
                  className={cn('rounded px-2 py-1 text-[11px] font-semibold', selectedImageState.crop.enabled ? 'bg-fuchsia-500/20 text-fuchsia-100' : 'bg-white/10 text-white/70')}
                >
                  {selectedImageState.crop.enabled ? 'Done' : 'Crop Mode'}
                </button>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/50">Zoom Crop</span>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.01}
                  value={selectedImageState.crop.zoom}
                  onChange={(event) => updateImageState(selectedLayer.id, { crop: { zoom: Number(event.target.value) } })}
                  className="w-full accent-fuchsia-400"
                />
              </label>
              <button
                type="button"
                onClick={() => resetCrop(selectedLayer.id)}
                className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
              >
                Reset Crop
              </button>
            </div>

            {[
              ['Brightness', 'brightness', 0, 200, 1],
              ['Contrast', 'contrast', 0, 200, 1],
              ['Saturation', 'saturation', 0, 200, 1],
              ['Blur', 'blur', 0, 20, 0.1],
              ['Shadow', 'shadow', 0, 40, 1],
              ['Glow', 'glow', 0, 50, 1],
              ['Border Radius', 'borderRadius', 0, 80, 1],
            ].map(([label, key, min, max, step]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={selectedImageState[key as keyof ImageEditState] as number}
                  onChange={(event) => updateImageState(selectedLayer.id, { [key]: Number(event.target.value) })}
                  className="w-full accent-blue-400"
                />
              </label>
            ))}
          </div>
        ) : selectedLayer && selectedTextState ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Font Size</span>
              <input
                type="range"
                min={MIN_TEXT_FONT_SIZE}
                max={160}
                value={selectedTextState.style.fontSize}
                onChange={(event) => updateTextState(selectedLayer.id, { style: { fontSize: Number(event.target.value) } })}
                className="w-full accent-blue-400"
              />
              <span className="mt-1 block text-xs text-white/45">{selectedTextState.style.fontSize}px</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Font Weight</span>
              <select
                value={selectedTextState.style.fontWeight}
                onChange={(event) => updateTextState(selectedLayer.id, { style: { fontWeight: Number(event.target.value) } })}
                className="w-full rounded-md border border-white/10 bg-slate-900 px-2.5 py-2 text-sm text-white outline-none focus:border-blue-400"
              >
                <option value={300}>Light</option>
                <option value={400}>Regular</option>
                <option value={500}>Medium</option>
                <option value={600}>Semibold</option>
                <option value={700}>Bold</option>
                <option value={800}>Extra Bold</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Text Color</span>
              <input
                type="color"
                value={selectedTextState.style.color}
                onChange={(event) => updateTextState(selectedLayer.id, { style: { color: event.target.value } })}
                className="h-9 w-full rounded-md border border-white/10 bg-white/5 p-1"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Letter Spacing</span>
              <input
                type="range"
                min={-2}
                max={12}
                step={0.1}
                value={selectedTextState.style.letterSpacing}
                onChange={(event) => updateTextState(selectedLayer.id, { style: { letterSpacing: Number(event.target.value) } })}
                className="w-full accent-blue-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Line Height</span>
              <input
                type="range"
                min={0.8}
                max={2}
                step={0.05}
                value={selectedTextState.style.lineHeight}
                onChange={(event) => updateTextState(selectedLayer.id, { style: { lineHeight: Number(event.target.value) } })}
                className="w-full accent-blue-400"
              />
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/60">Text Alignment</span>
              <div className="grid grid-cols-3 gap-1">
                {([
                  ['left', AlignLeft],
                  ['center', AlignCenter],
                  ['right', AlignRight],
                ] as Array<[TextAlign, typeof AlignLeft]>).map(([align, Icon]) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => updateTextState(selectedLayer.id, { style: { align } })}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-md border text-white transition-colors',
                      selectedTextState.style.align === align
                        ? 'border-blue-400 bg-blue-500/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                    aria-label={`Align ${align}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[
                { key: 'uppercase' as const, label: 'TT', active: selectedTextState.style.uppercase },
                { key: 'italic' as const, icon: Italic, active: selectedTextState.style.italic },
                { key: 'underline' as const, icon: Underline, active: selectedTextState.style.underline },
                { key: 'bold' as const, icon: Bold, active: selectedTextState.style.fontWeight >= 700 },
              ].map((item) => {
                const Icon = 'icon' in item ? item.icon : undefined;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.key === 'bold') {
                        updateTextState(selectedLayer.id, { style: { fontWeight: selectedTextState.style.fontWeight >= 700 ? 400 : 700 } });
                      } else {
                        updateTextState(selectedLayer.id, { style: { [item.key]: !item.active } });
                      }
                    }}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-md border text-xs font-semibold text-white transition-colors',
                      item.active ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                    aria-label={item.key}
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {PROPERTY_GROUPS.map((property) => (
              <button
                key={property}
                type="button"
                disabled
                className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 text-left text-xs font-medium text-white/45"
              >
                <span>{property}</span>
                {property === 'Position' && <Move className="h-3.5 w-3.5" />}
                {property === 'Size' && <Scan className="h-3.5 w-3.5" />}
                {property === 'Rotation' && <RotateCw className="h-3.5 w-3.5" />}
                {property === 'Opacity' && <AlignHorizontalSpaceAround className="h-3.5 w-3.5" />}
                {property === 'Color' && <Palette className="h-3.5 w-3.5" />}
                {property === 'Font' && <Type className="h-3.5 w-3.5" />}
                {property === 'Spacing' && <Baseline className="h-3.5 w-3.5" />}
                {property === 'Image' && <ImageIcon className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">History</p>
              <p className="text-xs text-white/45">{historyEntries.length} actions in this session</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={undoHistory}
                disabled={historyEntries.length === 0}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={redoHistory}
                disabled={redoEntries.length === 0}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Redo
              </button>
            </div>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {historyEntries.length > 0 ? (
              historyEntries.map((entry) => (
                <div key={entry.id} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2">
                  <p className="truncate text-xs font-semibold text-white/80">{entry.label}</p>
                  <p className="text-[10px] text-white/35">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] px-3 py-3 text-xs text-white/45">
                Edits you make in this session will appear here.
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </motion.aside>

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[9999] min-w-48 rounded-xl border border-white/10 bg-[#202228]/98 p-1.5 text-xs text-white shadow-2xl shadow-black/60 backdrop-blur"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
            aria-label="Editor context menu"
            onClick={(event) => event.stopPropagation()}
          >
            {[
            ['Cut', () => copySelection(true), Boolean(selectedLayerIds.length || selectedDecorationIds.length)],
            ['Copy', () => copySelection(false), Boolean(selectedLayerIds.length || selectedDecorationIds.length)],
            ['Paste', pasteClipboard, Boolean(clipboard)],
            ['Duplicate', duplicateSelectedObjects, Boolean(selectedLayerIds.length || selectedDecorationIds.length)],
            ['Delete', deleteSelectedObjects, Boolean(selectedLayerIds.length || selectedDecorationIds.length)],
            ['Bring Forward', () => orderSelectedDecorations('forward'), decorationMode && selectedDecorationIds.length > 0],
            ['Send Backward', () => orderSelectedDecorations('backward'), decorationMode && selectedDecorationIds.length > 0],
            ['Bring To Front', () => orderSelectedDecorations('front'), decorationMode && selectedDecorationIds.length > 0],
            ['Send To Back', () => orderSelectedDecorations('back'), decorationMode && selectedDecorationIds.length > 0],
            ['Lock', () => setSelectedLocked(true), Boolean(selectedLayerIds.length || selectedDecorationIds.length)],
            ['Unlock', () => setSelectedLocked(false), Boolean(selectedLayerIds.length || selectedDecorationIds.length)],
            ['Hide', () => setSelectedHidden(true), Boolean(selectedLayerIds.length || selectedDecorationIds.length)],
            ['Unhide', () => setSelectedHidden(false), Boolean(selectedLayerIds.length || selectedDecorationIds.length)],
            ['Group', groupSelectedDecorations, decorationMode && selectedDecorationIds.length > 1],
            ['Ungroup', ungroupSelectedDecorations, decorationMode && selectedDecorations.some((item) => item.groupId)],
          ].map(([label, action, enabled]) => (
            <button
              key={label as string}
              type="button"
              disabled={!enabled}
              role="menuitem"
              onClick={() => {
                (action as () => void)();
                closeContextMenu();
              }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:text-white/25"
            >
              {label as string}
            </button>
          ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
