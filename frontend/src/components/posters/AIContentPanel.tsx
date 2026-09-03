import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCheck,
  Wand2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ContentType =
  | 'headline'
  | 'tagline'
  | 'cta'
  | 'description'
  | 'marketing_copy';

export interface ContentVariant {
  index:      number;
  text:       string;
  isSelected: boolean;
}

export interface ContentBlock {
  id?:        string;
  type:       ContentType;
  label:      string;
  variants:   ContentVariant[];
  isLoading:  boolean;
}

interface AIContentPanelProps {
  blocks:            ContentBlock[];
  onSelectVariant:   (type: ContentType, index: number) => void;
  onRegenerateBlock: (type: ContentType) => void;
  onRegenerateAll:   () => void;
  isGeneratingAll?:  boolean;
  className?:        string;
}

// ─── Label config ─────────────────────────────────────────────────────────────

const CONTENT_META: Record<ContentType, { description: string; maxChars: number }> = {
  headline:       { description: 'Main attention-grabbing headline',     maxChars: 80  },
  tagline:        { description: 'Short memorable brand tagline',        maxChars: 60  },
  cta:            { description: 'Call to action text',                  maxChars: 30  },
  description:    { description: 'Benefit-focused product description',  maxChars: 200 },
  marketing_copy: { description: 'Full poster marketing copy',           maxChars: 400 },
};

// ─── Copy-to-clipboard button ─────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        void handleCopy();
      }}
      type="button"
      className="btn btn-ghost btn-icon-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      aria-label="Copy to clipboard"
    >
      {copied
        ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
        : <Copy       className="h-3.5 w-3.5" />
      }
    </button>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function ContentSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2 py-1" aria-label="Loading content" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-3.5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse',
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

// ─── Single content block ─────────────────────────────────────────────────────

function ContentBlockRow({
  block,
  onSelectVariant,
  onRegenerate,
  disabled = false,
}: {
  block:           ContentBlock;
  onSelectVariant: (index: number) => void;
  onRegenerate:    () => void;
  disabled?:        boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta      = CONTENT_META[block.type];
  //const selected  = block.variants.find((v) => v.isSelected) ?? block.variants[0];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Block header */}
      <div className="flex w-full items-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center justify-between px-3.5 py-2.5 text-left"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-brand-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {block.label}
            </span>
            {block.variants.length > 1 && (
              <span className="badge badge-brand text-xs py-0">
                {block.variants.length} variants
              </span>
            )}
          </div>
          {expanded
            ? <ChevronUp   className="h-3.5 w-3.5 text-slate-400" />
            : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          }
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="btn btn-ghost btn-icon-sm mr-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
          aria-label={`Regenerate ${block.label}`}
          disabled={disabled || block.isLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', block.isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Block body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 py-3 space-y-2">
              {block.isLoading ? (
                <ContentSkeleton lines={block.type === 'marketing_copy' ? 4 : 2} />
              ) : block.variants.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                  Click regenerate to create content for this block.
                </p>
              ) : (
                block.variants.map((variant) => (
                  <div
                    key={variant.index}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectVariant(variant.index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectVariant(variant.index);
                      }
                    }}
                    className={cn(
                      'group relative w-full rounded-lg border p-2.5 text-left transition-all duration-150',
                      'focus-visible:ring-2 focus-visible:ring-brand-500 outline-none',
                      variant.isSelected
                        ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/15 dark:border-brand-700'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-xs leading-relaxed flex-1',
                        variant.isSelected
                          ? 'text-brand-800 dark:text-brand-200'
                          : 'text-slate-700 dark:text-slate-300'
                      )}>
                        {variant.text}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {variant.isSelected && (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton text={variant.text} />
                        </div>
                      </div>
                    </div>
                    {variant.text.length > 60 && (
                      <div className="mt-1 flex items-center gap-1">
                        <div
                          className="h-0.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-1"
                        >
                          <div
                            className="h-full bg-brand-400 rounded-full"
                            style={{ width: `${Math.min((variant.text.length / meta.maxChars) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                          {variant.text.length}/{meta.maxChars}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Block description */}
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-0.5">
                {meta.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AIContentPanel ───────────────────────────────────────────────────────────

export default function AIContentPanel({
  blocks,
  onSelectVariant,
  onRegenerateBlock,
  onRegenerateAll,
  isGeneratingAll = false,
  className,
}: AIContentPanelProps) {
  const selectedCount = blocks.filter((b) =>
    b.variants.some((v) => v.isSelected)
  ).length;

  return (
    <div className={cn(
      'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-card',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              AI Content
            </h2>
            {selectedCount > 0 && (
              <span className="badge badge-success text-xs py-0">
                {selectedCount}/{blocks.length} selected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select the best variant for each content type
          </p>
        </div>
        <button
          onClick={onRegenerateAll}
          disabled={isGeneratingAll}
          className={cn(
            'btn btn-secondary btn-sm gap-1.5',
            isGeneratingAll && 'btn-loading'
          )}
        >
          {!isGeneratingAll && <Sparkles className="h-3.5 w-3.5" />}
          {!isGeneratingAll && 'Regenerate all'}
        </button>
      </div>

      {/* Content blocks */}
      <div className="p-4 space-y-3">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/20 mb-3">
              <Sparkles className="h-5 w-5 text-brand-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No content generated yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Select a product and click Generate.
            </p>
          </div>
        ) : (
          blocks.map((block) => (
            <ContentBlockRow
              key={block.type}
              block={{ ...block, isLoading: block.isLoading || isGeneratingAll }}
              onSelectVariant={(index) => onSelectVariant(block.type, index)}
              onRegenerate={() => onRegenerateBlock(block.type)}
              disabled={isGeneratingAll}
            />
          ))
        )}
      </div>
    </div>
  );
}
