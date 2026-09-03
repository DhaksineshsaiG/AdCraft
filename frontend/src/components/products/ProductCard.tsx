import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  Sparkles,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import StatusBadge from '../ui/StatusBadge';
import type { StatusVariant } from '../../styles/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ProductSyncStatus = 'ready' | 'pending' | 'processing' | 'failed' | 'stale';

export interface Product {
  id:         string;
  name:       string;
  price:      number;
  currency:   string;
  imageUrl?:  string;
  category?:  string;
  vendor?:    string;
  syncStatus: ProductSyncStatus;
  storeId:    string;
  storeName:  string;
  hasVariants:boolean;
  variantCount:number;
  variantSummary?: string;
  canGeneratePoster: boolean;
}

interface ProductCardProps {
  product:             Product;
  onGenerateContent:   (id: string) => void;
  onGeneratePoster:    (id: string) => void;
  onResync:            (id: string) => void;
  className?:          string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYNC_STATUS_MAP: Record<ProductSyncStatus, { variant: StatusVariant; label: string; pulse: boolean }> = {
  ready:      { variant: 'success', label: 'Ready',       pulse: false },
  pending:    { variant: 'neutral', label: 'Pending',     pulse: false },
  processing: { variant: 'info',    label: 'Processing',  pulse: true  },
  failed:     { variant: 'error',   label: 'Failed',      pulse: false },
  stale:      { variant: 'warning', label: 'Needs resync',pulse: false },
};

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

export default function ProductCard({
  product,
  onGenerateContent,
  onGeneratePoster,
  onResync,
  className,
}: ProductCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusCfg = SYNC_STATUS_MAP[product.syncStatus];
  const generateDisabled = !product.canGeneratePoster;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={cn('card group flex flex-col overflow-hidden', className)}
    >
      {/* ── Image ──────────────────────────────────────────────────────── */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" strokeWidth={1.2} />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">
          <StatusBadge
            status={statusCfg.variant}
            label={statusCfg.label}
            pulse={statusCfg.pulse}
            size="xs"
          />
        </div>

        {/* Actions overlay on hover */}
        <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/30 to-transparent">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow hover:bg-white dark:hover:bg-slate-900 transition-colors"
              aria-label="Product actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div className="dropdown-menu right-0 bottom-full mb-1 w-48">
                <button
                  className="dropdown-item w-full text-left"
                  onClick={() => { setMenuOpen(false); onGenerateContent(product.id); }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  Generate content
                </button>
                <button
                  className="dropdown-item w-full text-left"
                  onClick={() => { setMenuOpen(false); onGeneratePoster(product.id); }}
                  disabled={generateDisabled}
                >
                  <ImageIcon className="h-3.5 w-3.5 text-cyan-500" />
                  Generate poster
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  className="dropdown-item w-full text-left"
                  onClick={() => { setMenuOpen(false); onResync(product.id); }}
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                  Re-sync
                </button>
                <a
                  className="dropdown-item"
                  href="#"
                  onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  View in store
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3.5">
        {/* Name */}
        <p
          className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight"
          title={product.name}
        >
          {product.name}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.hasVariants && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {product.variantCount} variants
            </span>
          )}
        </div>

        {product.variantSummary && (
          <p
            className="text-xs text-slate-500 dark:text-slate-400 truncate"
            title={product.variantSummary}
          >
            {product.variantSummary}
          </p>
        )}

        {/* Store + category */}
        {(product.storeName || product.category) && (
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {[product.storeName, product.category].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Generate poster CTA */}
        <button
          onClick={() => onGeneratePoster(product.id)}
          disabled={generateDisabled}
          className="btn btn-secondary btn-sm w-full mt-1 gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate poster
        </button>
      </div>
    </motion.div>
  );
}
