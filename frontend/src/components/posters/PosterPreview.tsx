import { useEffect, useCallback, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Pencil,
  Type,
  Save,
  // ZoomIn,
  // ZoomOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Heart,
  Lock,
  //ExternalLink,
  Image as ImageIcon,
  Palette,
  Move,
  RotateCw,
} from 'lucide-react';
import { cn }      from '../../utils/cn';
import type { Poster } from './PosterCard';
import VisualPosterEditor from './VisualPosterEditor';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PosterPreviewProps {
  poster:       Poster | null;
  posters?:     Poster[];          // For prev/next navigation
  onClose:      () => void;
  onExport:     (id: string) => void;
  onEdit:       (id: string) => void;
  onFavourite:  (id: string) => void;
  onSaveEdit?:  (id: string, payload: { svg: string; editState?: unknown; saveAsNew?: boolean }) => Promise<void>;
  onNavigate?:  (id: string) => void;
  editMode?:    boolean;
}

interface TextEditLayer {
  id: string;
  type: string;
  label: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  opacity: number;
  imageHref: string;
  scale: number;
  rotate: number;
  shadow: number;
  glow: number;
  overlayIntensity: number;
  texture: number;
}

const TEXT_COLORS = ['#ffffff', '#111827', '#facc15', '#22c55e', '#38bdf8', '#f43f5e'];

const EMPTY_LAYER: TextEditLayer = {
  id: '',
  type: 'unknown',
  label: 'Layer',
  text: '',
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  fontSize: 24,
  color: '#ffffff',
  opacity: 1,
  imageHref: '',
  scale: 1,
  rotate: 0,
  shadow: 0,
  glow: 0,
  overlayIntensity: 0.5,
  texture: 0.2,
};

function parseEditableLayers(svg: string | undefined): TextEditLayer[] {
  if (!svg) return [];
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  const canvasWidth = numberAttr(root, 'width', numberAttr(root, 'viewBox-width', 100));
  const canvasHeight = numberAttr(root, 'height', 100);
  return Array.from(doc.querySelectorAll<SVGGElement>('[data-editor-layer="true"]')).map((group) => {
    const text = group.querySelector('text');
    const image = group.querySelector('image');
    const firstFill = group.querySelector<SVGElement>('[fill]');
    const x = numberAttr(group, 'data-edit-x', numberAttr(group, 'data-layer-x', 0));
    const y = numberAttr(group, 'data-edit-y', numberAttr(group, 'data-layer-y', 0));
    const width = numberAttr(group, 'data-layer-width', 12);
    const height = numberAttr(group, 'data-layer-height', 8);
    return {
      ...EMPTY_LAYER,
      id: group.getAttribute('data-layer-id') ?? '',
      type: group.getAttribute('data-layer-type') ?? 'unknown',
      label: group.getAttribute('data-layer-label') ?? 'Layer',
      text: text?.textContent ?? '',
      x: (x / canvasWidth) * 100,
      y: (y / canvasHeight) * 100,
      width: (width / canvasWidth) * 100,
      height: (height / canvasHeight) * 100,
      fontSize: text ? numberAttr(text, 'font-size', 24) : 24,
      color: text?.getAttribute('fill') ?? firstFill?.getAttribute('fill') ?? '#ffffff',
      opacity: numberAttr(group, 'opacity', 1),
      imageHref: image?.getAttribute('href') ?? image?.getAttribute('xlink:href') ?? '',
      scale: numberAttr(group, 'data-edit-scale', 1),
      rotate: numberAttr(group, 'data-edit-rotate', 0),
      shadow: numberAttr(group, 'data-edit-shadow', 0),
      glow: numberAttr(group, 'data-edit-glow', 0),
      overlayIntensity: numberAttr(group, 'data-edit-overlay', 0.5),
      texture: numberAttr(group, 'data-edit-texture', 0.2),
    };
  }).filter((layer) => layer.id);
}

function numberAttr(element: Element, attr: string, fallback: number): number {
  const value = Number(element.getAttribute(attr));
  return Number.isFinite(value) ? value : fallback;
}

function renderEditorSvg(svg: string, selectedLayerId: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  doc.querySelectorAll<SVGGElement>('[data-editor-layer="true"]').forEach((group) => {
    const selected = group.getAttribute('data-layer-id') === selectedLayerId;
    const style = group.getAttribute('style') ?? '';
    group.setAttribute(
      'style',
      `${style}; cursor: pointer; ${selected ? 'filter: drop-shadow(0 0 12px rgba(59,130,246,.95));' : ''}`
    );
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}

function updateSvgLayer(svg: string, layerId: string, patch: Partial<TextEditLayer>): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  const canvasWidth = numberAttr(root, 'width', 100);
  const canvasHeight = numberAttr(root, 'height', 100);
  const group = Array.from(doc.querySelectorAll<SVGGElement>('[data-editor-layer="true"]'))
    .find((node) => node.getAttribute('data-layer-id') === layerId);
  if (!group) return svg;

  if (patch.text !== undefined) {
    group.querySelectorAll('text').forEach((text) => {
      text.textContent = patch.text ?? '';
    });
  }
  if (patch.fontSize !== undefined) {
    group.querySelectorAll('text').forEach((text) => text.setAttribute('font-size', String(patch.fontSize)));
  }
  if (patch.color !== undefined) {
    if (group.getAttribute('data-layer-type') === 'background') {
      group.querySelectorAll<SVGElement>('rect, stop').forEach((node) => {
        if (node.tagName.toLowerCase() === 'stop') node.setAttribute('stop-color', patch.color!);
        else node.setAttribute('fill', patch.color!);
      });
    } else {
      group.querySelectorAll<SVGElement>('text, path, rect, circle, ellipse').forEach((node) => {
        if (node.hasAttribute('fill')) node.setAttribute('fill', patch.color!);
        if (node.hasAttribute('stroke')) node.setAttribute('stroke', patch.color!);
      });
    }
  }
  if (patch.opacity !== undefined) group.setAttribute('opacity', String(patch.opacity));
  if (patch.imageHref !== undefined) {
    group.querySelectorAll('image').forEach((image) => {
      image.setAttribute('href', patch.imageHref ?? '');
      image.setAttribute('xlink:href', patch.imageHref ?? '');
    });
  }

  const baseX = numberAttr(group, 'data-layer-x', 0);
  const baseY = numberAttr(group, 'data-layer-y', 0);
  const width = numberAttr(group, 'data-layer-width', 0);
  const height = numberAttr(group, 'data-layer-height', 0);
  const x = patch.x !== undefined
    ? (patch.x / 100) * canvasWidth
    : numberAttr(group, 'data-edit-x', baseX);
  const y = patch.y !== undefined
    ? (patch.y / 100) * canvasHeight
    : numberAttr(group, 'data-edit-y', baseY);
  const scale = patch.scale ?? numberAttr(group, 'data-edit-scale', 1);
  const rotate = patch.rotate ?? numberAttr(group, 'data-edit-rotate', 0);
  const cx = baseX + width / 2;
  const cy = baseY + height / 2;
  group.setAttribute('data-edit-x', String(x));
  group.setAttribute('data-edit-y', String(y));
  group.setAttribute('data-edit-scale', String(scale));
  group.setAttribute('data-edit-rotate', String(rotate));
  group.setAttribute(
    'transform',
    `translate(${x - baseX} ${y - baseY}) rotate(${rotate} ${cx} ${cy}) translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`
  );

  if (patch.shadow !== undefined) group.setAttribute('data-edit-shadow', String(patch.shadow));
  if (patch.glow !== undefined) group.setAttribute('data-edit-glow', String(patch.glow));
  const shadow = patch.shadow ?? numberAttr(group, 'data-edit-shadow', 0);
  const glow = patch.glow ?? numberAttr(group, 'data-edit-glow', 0);
  if (shadow > 0 || glow > 0) {
    group.setAttribute(
      'style',
      `filter: drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,.35)) drop-shadow(0 0 ${glow}px rgba(59,130,246,.7));`
    );
  }

  if (patch.overlayIntensity !== undefined) {
    group.setAttribute('data-edit-overlay', String(patch.overlayIntensity));
    Array.from(group.querySelectorAll<SVGElement>('rect')).slice(1).forEach((rect) => {
      rect.setAttribute('opacity', String(patch.overlayIntensity));
    });
  }
  if (patch.texture !== undefined) {
    group.setAttribute('data-edit-texture', String(patch.texture));
    Array.from(group.querySelectorAll<SVGElement>('rect')).slice(2).forEach((rect) => {
      rect.setAttribute('opacity', String(patch.texture));
    });
  }

  return new XMLSerializer().serializeToString(doc.documentElement);
}

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatEditableMetadata(ms: number): string {
  if (ms <= 0) return 'Editing expired';
  const minutes = Math.ceil(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) return `Editable for ${days}d ${hours}h`;
  if (hours > 0) return `Editable for ${hours}h ${mins}m`;
  return `Editable for ${mins}m`;
}

function formatEditableIndicator(ms: number): string {
  if (ms <= 0) return '';
  const minutes = Math.ceil(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

// ─── PosterPreview ────────────────────────────────────────────────────────────

export default function PosterPreview({
  poster,
  posters = [],
  onClose,
  onExport,
  onEdit,
  onFavourite,
  onSaveEdit,
  onNavigate,
  editMode = false,
}: PosterPreviewProps) {
  const [now, setNow] = useState(() => Date.now());
  const [isEditing, setIsEditing] = useState(editMode);
  const [textLayers, setTextLayers] = useState<TextEditLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [editorSvg, setEditorSvg] = useState('');
  const [originalSvg, setOriginalSvg] = useState('');
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState('');
  const currentIndex = poster ? posters.findIndex((p) => p.id === poster.id) : -1;
  const hasPrev      = currentIndex > 0;
  const hasNext      = currentIndex < posters.length - 1;
  const editableMs = poster ? poster.editableUntil.getTime() - now : 0;
  const isEditable = Boolean(poster?.isEditable && editableMs > 0);

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigate) onNavigate(posters[currentIndex - 1]!.id);
  }, [hasPrev, currentIndex, posters, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) onNavigate(posters[currentIndex + 1]!.id);
  }, [hasNext, currentIndex, posters, onNavigate]);

  const selectedLayer =
    textLayers.find((layer) => layer.id === selectedLayerId) ?? textLayers[0];

  function updateSelectedLayer(patch: Partial<TextEditLayer>) {
    if (!selectedLayer) return;
    setEditorSvg((svg) => updateSvgLayer(svg, selectedLayer.id, patch));
    setTextLayers((layers) =>
      layers.map((layer) =>
        layer.id === selectedLayer.id ? { ...layer, ...patch } : layer
      )
    );
  }

  async function handleSave(saveAsNew: boolean) {
    if (!poster || !editorSvg || !onSaveEdit) return;
    await onSaveEdit(poster.id, {
      svg: editorSvg,
      editState: { layers: textLayers },
      saveAsNew,
    });
    setIsEditing(false);
    setSaveMenuOpen(false);
  }

  function handleCancelEdit() {
    setEditorSvg(originalSvg);
    const layers = parseEditableLayers(originalSvg);
    setTextLayers(layers);
    setSelectedLayerId(layers[0]?.id ?? '');
    setIsEditing(false);
    setSaveMenuOpen(false);
  }

  function handleLayerPointerDown(event: PointerEvent<HTMLButtonElement>, layerId: string) {
    if (!isEditing) return;
    const overlay = event.currentTarget.parentElement;
    if (!overlay) return;

    event.preventDefault();
    setSelectedLayerId(layerId);

    const moveLayer = (clientX: number, clientY: number) => {
      const rect = overlay.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      setTextLayers((layers) =>
        layers.map((layer) =>
          layer.id === layerId ? { ...layer, x, y } : layer
        )
      );
      setEditorSvg((svg) => updateSvgLayer(svg, layerId, { x, y }));
    };

    moveLayer(event.clientX, event.clientY);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      moveLayer(moveEvent.clientX, moveEvent.clientY);
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function selectLayer(layerId: string) {
    selectLayer(layerId);
    const layer = textLayers.find((item) => item.id === layerId);
    setImageUrlDraft(layer?.imageHref ?? '');
  }

  // Keyboard navigation
  useEffect(() => {
    if (!poster) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')      { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowLeft')   { e.preventDefault(); handlePrev(); }
      if (e.key === 'ArrowRight')  { e.preventDefault(); handleNext(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [poster, onClose, handlePrev, handleNext]);

  // Lock body scroll
  // useEffect(() => {
  //   if (poster) {
  //     document.body.style.overflow = 'hidden';
  //     return () => { document.body.style.overflow = ''; };
  //   }
  // }, [poster]);
  useEffect(() => {
    if (!poster) return;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [poster]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setIsEditing(editMode);
  }, [editMode, poster?.id]);

  useEffect(() => {
    if (!poster) return;
    const svg = poster.editableSvg ?? '';
    setEditorSvg(svg);
    setOriginalSvg(svg);
    const layers = parseEditableLayers(svg);
    setTextLayers(layers);
    setSelectedLayerId(layers[0]?.id ?? '');
    setImageUrlDraft(layers[0]?.imageHref ?? '');
  }, [poster?.id, poster?.editableSvg]);

  const SIZE_RATIO: Record<string, string> = {
    square:      'aspect-square',
    portrait:    'aspect-[4/5]',
    landscape:   'aspect-video',
    story:       'aspect-[9/16]',
    a4_portrait: 'aspect-[1/1.414]',
  };

  const dialog = (
    <AnimatePresence>
      {poster && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Poster preview: ${poster.productName}`}
          >
            <motion.div
              key={poster.id}
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                'relative flex flex-col max-h-[90vh] w-full',
                isEditing ? 'max-w-[96vw]' : 'max-w-3xl'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top toolbar */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{poster.productName}</p>
                  <p className="text-xs text-white/60 truncate capitalize">
                    {poster.style} · {poster.format.toUpperCase()} · {poster.size.replace('_', ' ')}
                    {poster.version > 1 && ` · v${poster.version}`}
                  </p>
                  <p
                    className={cn(
                      'text-xs truncate',
                      isEditable ? 'text-white/50' : 'text-white/35'
                    )}
                    title={isEditable ? `Editable until ${formatDateTime(poster.editableUntil)}` : 'Editing expired'}
                  >
                    {formatEditableMetadata(editableMs)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onFavourite(poster.id)}
                    aria-label={poster.isFavourited ? 'Remove from favourites' : 'Favourite'}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      poster.isFavourited
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                    )}
                  >
                    <Heart className="h-4 w-4" fill={poster.isFavourited ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={() => {
                      if (!isEditable) return;
                      onEdit(poster.id);
                      setIsEditing((value) => !value);
                    }}
                    disabled={!isEditable}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      isEditable
                        ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        : 'bg-white/5 text-white/35 cursor-not-allowed'
                    )}
                    aria-label={isEditable ? 'Edit poster' : 'Editing expired'}
                    title={isEditable ? 'Edit poster' : `Editing expired on ${formatDateTime(poster.editableUntil)}`}
                  >
                    {isEditable ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => onExport(poster.id)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>

                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors ml-1"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Image area */}
              <div
                className={cn(
                  'relative flex flex-1 overflow-hidden rounded-b-2xl bg-slate-900 border-x border-b border-white/10 min-h-0',
                  isEditing ? 'items-stretch' : 'items-center justify-center'
                )}
              >
                {isEditing ? (
                  <VisualPosterEditor poster={poster} />
                ) : (
                <div className="relative flex flex-1 items-center justify-center min-w-0">

                {/* Prev / Next arrows */}
                {hasPrev && onNavigate && !isEditing && (
                  <button
                    onClick={handlePrev}
                    className="absolute left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                    aria-label="Previous poster"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {hasNext && onNavigate && !isEditing && (
                  <button
                    onClick={handleNext}
                    className="absolute right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                    aria-label="Next poster"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                {poster.posterUrl || (isEditing && editorSvg) ? (
                  <div
                    className={cn(
                      'relative max-h-[calc(90vh-80px)] max-w-full p-4',
                      SIZE_RATIO[poster.size] ?? 'aspect-square'
                    )}
                  >
                    {isEditing && editorSvg ? (
                      <div
                        className="h-full max-h-[calc(90vh-112px)] w-full max-w-full [&>svg]:h-full [&>svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: renderEditorSvg(editorSvg, selectedLayerId) }}
                      />
                    ) : (
                      <img
                        src={poster.posterUrl}
                        alt={`Poster for ${poster.productName}`}
                        className="h-full max-h-[calc(90vh-112px)] w-full max-w-full object-contain"
                      />
                    )}
                    <span
                      className={cn(
                        'pointer-events-none absolute bottom-5 right-5 z-20 inline-flex h-7 max-w-[4.5rem] items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold shadow-sm backdrop-blur-md transition-opacity duration-300',
                        isEditable
                          ? 'border-white/20 bg-slate-950/35 text-white/85'
                          : 'border-white/10 bg-slate-950/25 text-white/60 opacity-55'
                      )}
                      title={isEditable ? `Editable until ${formatDateTime(poster.editableUntil)}` : 'Editing expired'}
                    >
                      {isEditable ? <Pencil className="h-3 w-3 shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />}
                      {isEditable && <span className="truncate">{formatEditableIndicator(editableMs)}</span>}
                    </span>
                    {isEditing && editorSvg && (
                      <div className="absolute inset-4 overflow-hidden">
                        {textLayers.map((layer) => {
                          const selected = layer.id === selectedLayerId;
                          return (
                            <button
                              key={layer.id}
                              type="button"
                              onClick={() => selectLayer(layer.id)}
                              onPointerDown={(event) => handleLayerPointerDown(event, layer.id)}
                              className={cn(
                                'absolute cursor-move rounded border outline-none transition-colors',
                                selected
                                  ? 'border-brand-300 bg-brand-500/20'
                                  : 'border-white/20 bg-transparent hover:bg-white/10'
                              )}
                              style={{
                                left: `${layer.x}%`,
                                top: `${layer.y}%`,
                                width: `${Math.max(layer.width, 4)}%`,
                                height: `${Math.max(layer.height, 4)}%`,
                                transform: 'translate(0, 0)',
                              }}
                              aria-label={`Select ${layer.label}`}
                              title={layer.label}
                            />
                          );
                        })}
                      </div>
                    )}
                    {isEditing && !editorSvg && (
                      <div className="absolute inset-4 flex items-center justify-center rounded-xl bg-slate-950/70 p-6 text-center text-sm text-white/70">
                        This poster was generated before editable SVG layers were saved. Regenerate it to edit renderer layers.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/40">
                    <ImageIcon className="h-16 w-16" strokeWidth={1} />
                    <p className="text-sm">No preview available</p>
                  </div>
                )}
                </div>
                )}

                {false && isEditing && selectedLayer && (
                  <aside className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-slate-950/95 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        {selectedLayer.type === 'background'
                          ? <Palette className="h-4 w-4 text-brand-300" />
                          : selectedLayer.type.includes('image') || selectedLayer.type === 'logo'
                            ? <ImageIcon className="h-4 w-4 text-brand-300" />
                            : <Type className="h-4 w-4 text-brand-300" />
                        }
                        {selectedLayer.label}
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <span className="mb-2 block text-xs font-medium text-white/60">Layers</span>
                        <div className="max-h-36 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                          {textLayers.map((layer) => (
                            <button
                              key={layer.id}
                              type="button"
                              onClick={() => selectLayer(layer.id)}
                              className={cn(
                                'w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                                layer.id === selectedLayer.id
                                  ? 'bg-brand-500/20 text-brand-100'
                                  : 'bg-white/5 text-white/65 hover:bg-white/10'
                              )}
                            >
                              {layer.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {['headline', 'description', 'price', 'cta', 'footer', 'discount_badge'].includes(selectedLayer.type) && (
                        <>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-white/60">Text</span>
                            <textarea
                              value={selectedLayer.text}
                              onChange={(event) => updateSelectedLayer({ text: event.target.value })}
                              rows={3}
                              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-300"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-white/60">Font size</span>
                            <input
                              type="range"
                              min={10}
                              max={140}
                              value={selectedLayer.fontSize}
                              onChange={(event) => updateSelectedLayer({ fontSize: Number(event.target.value) })}
                              className="w-full accent-brand-400"
                            />
                          </label>
                        </>
                      )}

                      {(selectedLayer.type.includes('image') || selectedLayer.type === 'logo') && (
                        <>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-white/60">Replace image</span>
                            <input
                              value={imageUrlDraft}
                              onChange={(event) => setImageUrlDraft(event.target.value)}
                              onBlur={() => updateSelectedLayer({ imageHref: imageUrlDraft })}
                              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-300"
                              placeholder="https://..."
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-white/60">
                              <Move className="h-3 w-3" /> Scale
                            </span>
                            <input
                              type="range"
                              min={0.25}
                              max={2.5}
                              step={0.01}
                              value={selectedLayer.scale}
                              onChange={(event) => updateSelectedLayer({ scale: Number(event.target.value) })}
                              className="w-full accent-brand-400"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-white/60">
                              <RotateCw className="h-3 w-3" /> Rotate
                            </span>
                            <input
                              type="range"
                              min={-180}
                              max={180}
                              value={selectedLayer.rotate}
                              onChange={(event) => updateSelectedLayer({ rotate: Number(event.target.value) })}
                              className="w-full accent-brand-400"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-white/60">Shadow</span>
                            <input
                              type="range"
                              min={0}
                              max={40}
                              value={selectedLayer.shadow}
                              onChange={(event) => updateSelectedLayer({ shadow: Number(event.target.value) })}
                              className="w-full accent-brand-400"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-white/60">Glow</span>
                            <input
                              type="range"
                              min={0}
                              max={50}
                              value={selectedLayer.glow}
                              onChange={(event) => updateSelectedLayer({ glow: Number(event.target.value) })}
                              className="w-full accent-brand-400"
                            />
                          </label>
                        </>
                      )}

                      {selectedLayer.type === 'background' && (
                        <>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-white/60">Theme</span>
                            <select
                              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-brand-300"
                              onChange={(event) => updateSelectedLayer({ color: event.target.value })}
                              defaultValue=""
                            >
                              <option value="" disabled>Choose theme</option>
                              <option value="#111827">Noir</option>
                              <option value="#f8fafc">Clean</option>
                              <option value="#0f766e">Fresh</option>
                              <option value="#7c2d12">Warm</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-white/60">Overlay intensity</span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={selectedLayer.overlayIntensity}
                              onChange={(event) => updateSelectedLayer({ overlayIntensity: Number(event.target.value) })}
                              className="w-full accent-brand-400"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-medium text-white/60">Texture</span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={selectedLayer.texture}
                              onChange={(event) => updateSelectedLayer({ texture: Number(event.target.value) })}
                              className="w-full accent-brand-400"
                            />
                          </label>
                        </>
                      )}

                      <div>
                        <span className="mb-2 block text-xs font-medium text-white/60">Color</span>
                        <div className="flex flex-wrap gap-2">
                          {TEXT_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => updateSelectedLayer({ color })}
                              className={cn(
                                'h-7 w-7 rounded-full border transition-transform hover:scale-105',
                                selectedLayer.color === color ? 'border-white ring-2 ring-brand-300' : 'border-white/20'
                              )}
                              style={{ backgroundColor: color }}
                              aria-label={`Set color ${color}`}
                            />
                          ))}
                        </div>
                      </div>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-white/60">Opacity</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={selectedLayer.opacity}
                          onChange={(event) => updateSelectedLayer({ opacity: Number(event.target.value) })}
                          className="w-full accent-brand-400"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-white/60">X</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={selectedLayer.x}
                          onChange={(event) => updateSelectedLayer({ x: Number(event.target.value) })}
                          className="w-full accent-brand-400"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-white/60">Y</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={selectedLayer.y}
                          onChange={(event) => updateSelectedLayer({ y: Number(event.target.value) })}
                          className="w-full accent-brand-400"
                        />
                      </label>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setSaveMenuOpen((value) => !value)}
                          disabled={!onSaveEdit || !editorSvg}
                          className="btn btn-primary btn-sm w-full gap-1.5"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        {saveMenuOpen && (
                          <div className="dropdown-menu bottom-full mb-1 w-full">
                            <button type="button" className="dropdown-item w-full text-left" onClick={() => void handleSave(false)}>
                              Save Changes
                            </button>
                            <button type="button" className="dropdown-item w-full text-left" onClick={() => void handleSave(true)}>
                              Save As New Poster
                            </button>
                            <button type="button" className="dropdown-item w-full text-left" onClick={handleCancelEdit}>
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </aside>
                )}
              </div>

              {/* Navigation dots */}
              {posters.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {posters.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => onNavigate?.(p.id)}
                      aria-label={`Go to poster ${i + 1}`}
                      className={cn(
                        'rounded-full transition-all duration-150',
                        p.id === poster.id
                          ? 'w-4 h-1.5 bg-white'
                          : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                      )}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(dialog, document.body);
}
