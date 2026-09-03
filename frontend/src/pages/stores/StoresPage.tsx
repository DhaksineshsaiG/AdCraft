import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Store as StoreIcon } from 'lucide-react';
import PageHeader   from '../../components/ui/PageHeader';
import EmptyState   from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/LoadingSpinner';
import StoreCard from '../../components/stores/StoreCard';
import ConnectStoreDialog, { type ConnectStoreFormData } from '../../components/stores/ConnectStoreDialog';
import { motionStagger, motionFadeUp } from '../../styles/theme';
import {
  useConnectStore,
  useDisconnectStore,
  useStores,
  useSyncStore,
} from '../../hooks/useStores';

// â”€â”€â”€ StoresPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StoreGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" aria-label="Loading stores">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="card space-y-4 p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StoresPage() {
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [syncingIds,    setSyncingIds]    = useState<Set<string>>(new Set());
  const storesQuery = useStores();
  const connectStoreMutation = useConnectStore();
  const syncStoreMutation = useSyncStore();
  const disconnectStoreMutation = useDisconnectStore();
  const stores = storesQuery.data ?? [];
  const showInitialSkeleton = storesQuery.isLoading && !storesQuery.data;

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function handleSync(id: string) {
    setSyncingIds((prev) => new Set(prev).add(id));
    syncStoreMutation.mutate(id, {
      onSettled: () => {
        setSyncingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      },
    });
  }

  function handleDisconnect(id: string) {
    disconnectStoreMutation.mutate(id);
  }

  async function handleConnect(data: ConnectStoreFormData) {
    await connectStoreMutation.mutateAsync(data);
  }

  return (
    <>
      <div className="page-container py-7">
        {/* Page header */}
        <PageHeader
          title="Connected Stores"
          subtitle="Manage your Shopify and WooCommerce store connections"
          icon={StoreIcon}
          actions={
            <button
              onClick={() => setDialogOpen(true)}
              className="btn btn-primary btn-md gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Connect store
            </button>
          }
        />

        {/* Content */}
        {showInitialSkeleton ? (
          <StoreGridSkeleton />
        ) : stores.length === 0 ? (
          <EmptyState
            icon={StoreIcon}
            title="No stores connected"
            description="Connect your first Shopify or WooCommerce store to start generating AI-powered product posters."
            actions={[{
              label:   'Connect a store',
              onClick: () => setDialogOpen(true),
              variant: 'primary',
              icon:    Plus,
            }]}
          />
        ) : (
          <motion.div
            variants={motionStagger()}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {stores.map((store) => (
              <motion.div key={store.id} variants={motionFadeUp}>
                <StoreCard
                  store={{ ...store, status: syncingIds.has(store.id) ? 'syncing' : store.status }}
                  onSync={handleSync}
                  onDisconnect={handleDisconnect}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Connect dialog */}
      <ConnectStoreDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleConnect}
      />
    </>
  );
}

