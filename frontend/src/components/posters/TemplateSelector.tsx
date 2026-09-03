import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn }    from '../../utils/cn';
import type { PosterFormat, PosterSize, PosterStyle } from './PosterCard';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateConfig {
  style:  PosterStyle;
  size:   PosterSize;
  format: PosterFormat;
}

interface TemplateSelectorProps {
  value:    TemplateConfig;
  onChange: (config: TemplateConfig) => void;
  className?:string;
}

// ─── Option data ──────────────────────────────────────────────────────────────

const STYLES: Array<{ value: PosterStyle; label: string; description: string; bg: string }> = [
  { value: 'modern',       label: 'Modern',       description: 'Clean, minimal, contemporary',          bg: 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700'   },
  { value: 'bold',         label: 'Bold',         description: 'High-impact, strong typography',        bg: 'from-slate-900 to-slate-700 dark:from-slate-950 dark:to-slate-800'   },
  { value: 'elegant',      label: 'Elegant',      description: 'Luxury, refined, premium feel',         bg: 'from-amber-50  to-amber-100  dark:from-amber-950  dark:to-amber-900' },
  { value: 'playful',      label: 'Playful',      description: 'Fun, vibrant, colourful',               bg: 'from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900'},
  { value: 'minimalist',   label: 'Minimalist',   description: 'Ultra-clean, maximum white space',      bg: 'from-white    to-slate-50    dark:from-slate-900  dark:to-slate-800'  },
  { value: 'vintage',      label: 'Vintage',      description: 'Retro aesthetic, classic typography',   bg: 'from-amber-100 to-orange-100 dark:from-amber-900  dark:to-orange-900'},
  { value: 'professional', label: 'Professional', description: 'B2B, corporate, trust-focused',         bg: 'from-blue-50   to-blue-100   dark:from-blue-950   dark:to-blue-900'  },
];

const SIZES: Array<{ value: PosterSize; label: string; ratio: string; icon: string }> = [
  { value: 'square',      label: 'Square',    ratio: '1:1',       icon: '▪' },
  { value: 'portrait',    label: 'Portrait',  ratio: '4:5',       icon: '▯' },
  { value: 'landscape',   label: 'Landscape', ratio: '16:9',      icon: '▭' },
  { value: 'story',       label: 'Story',     ratio: '9:16',      icon: '▮' },
  { value: 'a4_portrait', label: 'A4 Print',  ratio: '1:1.41',    icon: '▯' },
];

const SIZE_PRESENTATION: Record<PosterSize, { label: string; description: string }> = {
  square:      { label: 'Instagram Post', description: '1080 × 1080 (1:1)' },
  portrait:    { label: 'Instagram Portrait', description: '1080 × 1350 (4:5)' },
  landscape:   { label: 'Website Banner', description: '1920 × 1080 (16:9)' },
  story:       { label: 'Instagram Story', description: '1080 × 1920 (9:16)' },
  a4_portrait: { label: 'A4 Print', description: '2480 × 3508' },
};

const FORMATS: Array<{ value: PosterFormat; label: string; description: string }> = [
  { value: 'jpeg', label: 'JPEG', description: 'Best for photos, smallest size'    },
  { value: 'png',  label: 'PNG',  description: 'Lossless, supports transparency'   },
  { value: 'webp', label: 'WEBP', description: 'Modern format, excellent quality'  },
  { value: 'pdf',  label: 'PDF',  description: 'Best for print production'         },
];

type Tab = 'style' | 'size' | 'format';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'style',  label: 'Style'  },
  { value: 'size',   label: 'Size'   },
  { value: 'format', label: 'Format' },
];

// ─── TemplateSelector ─────────────────────────────────────────────────────────

export default function TemplateSelector({
  value,
  onChange,
  className,
}: TemplateSelectorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('style');

  function update<K extends keyof TemplateConfig>(key: K, val: TemplateConfig[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className={cn('rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden', className)}>
      {/* Tab bar */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 px-2 pt-2 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'relative px-3 py-2 text-xs font-medium rounded-t-lg transition-colors duration-150',
              activeTab === tab.value
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab.label}
            {activeTab === tab.value && (
              <motion.div
                layoutId="template-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-500 rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="p-3">
        {/* Style */}
        {activeTab === 'style' && (
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map((style) => {
              const selected = value.style === style.value;
              return (
                <button
                  key={style.value}
                  onClick={() => update('style', style.value)}
                  className={cn(
                    'relative flex flex-col items-start rounded-xl border-2 p-2.5 text-left transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-brand-500 outline-none',
                    selected
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/15'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  {/* Mini preview swatch */}
                  <div className={cn(
                    'w-full h-10 rounded-lg bg-gradient-to-br mb-2',
                    style.bg
                  )} />
                  <p className={cn(
                    'text-xs font-semibold',
                    selected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'
                  )}>
                    {style.label}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                    {style.description}
                  </p>
                  {selected && (
                    <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Size */}
        {activeTab === 'size' && (
          <div className="space-y-1.5">
            {SIZES.map((size) => {
              const selected = value.size === size.value;
              const presentation = SIZE_PRESENTATION[size.value];
              return (
                <button
                  key={size.value}
                  onClick={() => update('size', size.value)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-brand-500 outline-none',
                    selected
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/15'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold shrink-0',
                    selected
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  )}>
                    {size.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn(
                      'text-xs font-semibold',
                      selected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'
                    )}>
                      {presentation.label}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{presentation.description}</p>
                  </div>
                  {selected && <Check className="h-4 w-4 text-brand-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Format */}
        {activeTab === 'format' && (
          <div className="space-y-1.5">
            {FORMATS.map((fmt) => {
              const selected = value.format === fmt.value;
              return (
                <button
                  key={fmt.value}
                  onClick={() => update('format', fmt.value)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition-all duration-150',
                    'focus-visible:ring-2 focus-visible:ring-brand-500 outline-none',
                    selected
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/15'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0',
                    selected
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  )}>
                    {fmt.label}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn(
                      'text-xs font-semibold',
                      selected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'
                    )}>
                      {fmt.label}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{fmt.description}</p>
                  </div>
                  {selected && <Check className="h-4 w-4 text-brand-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selection summary */}
      <div className="flex items-center gap-2 px-3 pb-3 flex-wrap">
        {[
          { label: value.style,              accent: 'badge-brand'   },
          { label: SIZE_PRESENTATION[value.size]?.label ?? value.size, accent: 'badge-neutral' },
          { label: value.format.toUpperCase(), accent: 'badge-neutral' },
        ].map((chip) => (
          <span key={chip.label} className={cn('badge text-xs', chip.accent)}>
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  );
}
