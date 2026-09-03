import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  MoreHorizontal,
  Unplug,
  ExternalLink,
  Package,
  Clock,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import StatusBadge from '../ui/StatusBadge';
import ConfirmDialog from '../ui/ConfirmDialog';
import type { StatusVariant } from '../../styles/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type StorePlatform = 'shopify' | 'woocommerce';
export type StoreStatus   = 'active' | 'syncing' | 'error' | 'disconnected';

export interface Store {
  id:              string;
  name:            string;
  platform:        StorePlatform;
  status:          StoreStatus;
  url:             string;
  totalProducts:   number;
  lastSyncAt:      Date | null;
  currency:        string;
  createdAt:       Date;
  updatedAt:       Date;
}

interface StoreCardProps {
  store:         Store;
  onSync:        (id: string) => void;
  onDisconnect:  (id: string) => void;
  className?:    string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<StoreStatus, { variant: StatusVariant; label: string; pulse: boolean }> = {
  active:       { variant: 'success', label: 'Active',       pulse: false },
  syncing:      { variant: 'info',    label: 'Syncing…',     pulse: true  },
  error:        { variant: 'error',   label: 'Error',        pulse: false },
  disconnected: { variant: 'neutral', label: 'Disconnected', pulse: false },
};

const PLATFORM_LABEL: Record<StorePlatform, string> = {
  shopify:     'Shopify',
  woocommerce: 'WooCommerce',
};

// Minimal SVG platform logos to avoid external image dependencies
function PlatformIcon({ platform, className }: { platform: StorePlatform; className?: string }) {
  if (platform === 'shopify') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.337 23.979l5.25-1.136L18.5 2.5s-.834-.055-1.248.33c-.3.28-.493.79-.493.79s-.358-.97-1.196-1.456c-.663-.387-1.504-.355-2.208-.008l-.264.134S12.5 1.5 11 1.5C8.5 1.5 7 4 7 4s-1.5.5-2.5 1.5C3 6.8 3 8 3 8L2 22l13.337 1.979zM13 4.5c-.5 0-1 .3-1.5.5 0-.5.1-1.3.8-1.8.6-.5 1.4-.5 2-.2-.3.6-.8 1.1-1.3 1.5zm-2.8 1.2c.7-.4 1.5-.6 2.3-.5-.5.4-1 1-1.3 1.7L9 7.3c.1-.6.5-1.1 1.2-1.6zm-.7 2.8l3.5-.5-.5 3-3 .5.5-3H9.5zm5.5 10l-7-1L7 12l8 1-1 5.5z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9V8h2v9zm4 0h-2V8h2v9z" />
    </svg>
  );
}

function relativeTime(date: Date): string {
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── StoreCard ────────────────────────────────────────────────────────────────

export default function StoreCard({
  store,
  onSync,
  onDisconnect,
  className,
}: StoreCardProps) {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const statusCfg = STATUS_MAP[store.status];

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0  }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn('card group p-5 flex flex-col gap-4', className)}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          {/* Platform icon + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <PlatformIcon
                platform={store.platform}
                className={cn(
                  'h-5 w-5',
                  store.platform === 'shopify'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {store.name}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {PLATFORM_LABEL[store.platform]}
              </p>
            </div>
          </div>

          {/* Status badge + menu */}
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge
              status={statusCfg.variant}
              label={statusCfg.label}
              pulse={statusCfg.pulse}
              size="xs"
            />

            {/* Action menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="btn btn-ghost btn-icon-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Store actions"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="dropdown-menu right-0 top-full mt-1 w-44 z-20">
                  <button
                    className="dropdown-item w-full text-left"
                    disabled={store.status === 'syncing'}
                    onClick={() => { setMenuOpen(false); onSync(store.id); }}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5 text-slate-400', store.status === 'syncing' && 'animate-spin')} />
                    {store.status === 'syncing' ? 'Syncing...' : 'Sync now'}
                  </button>
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    Open store
                  </a>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    className="dropdown-item dropdown-item-danger w-full text-left"
                    onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {store.totalProducts.toLocaleString()}
              </span>{' '}
              products
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {store.lastSyncAt
                ? relativeTime(store.lastSyncAt)
                : 'Never synced'}
            </span>
          </div>
        </div>

        {/* ── Footer actions ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => onSync(store.id)}
            disabled={store.status === 'syncing'}
            className="btn btn-secondary btn-sm flex-1 gap-1.5"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', store.status === 'syncing' && 'animate-spin')} />
            {store.status === 'syncing' ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </motion.div>

      {/* Disconnect confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); onDisconnect(store.id); }}
        variant="danger"
        title={`Disconnect "${store.name}"?`}
        description="Your products and posters will be retained, but the store connection will be removed. You can reconnect at any time."
        confirmLabel="Disconnect"
      />
    </>
  );
}
