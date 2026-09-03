import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  connectStore,
  disconnectStore,
  listStores,
  syncStore,
  testStore,
} from '@services/stores.service';
import { publishNotification } from '@services/notifications.service';
import { productKeys } from './useProducts';

export const storeKeys = {
  all: ['stores'] as const,
};

export function useStores() {
  return useQuery({
    queryKey: storeKeys.all,
    queryFn: listStores,
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
  });
}

export function useConnectStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectStore,
    onSuccess: async (store) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: storeKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
      publishNotification({
        id: `store-connected-${store.id}`,
        title: 'Store connected',
        description: `${store.name} is connected and ready to sync products.`,
        icon: 'store',
        tone: 'success',
      });
      toast.success('Store connected.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to connect store.'),
  });
}

export function useSyncStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncStore,
    onMutate: () => toast.loading('Syncing store...'),
    onSuccess: async (_result, _storeId, toastId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: storeKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
      toast.success('Store synced successfully', { id: toastId });
    },
    onError: (_error, _storeId, toastId) => {
      toast.error('Store sync failed', { id: toastId });
    },
  });
}

export function useTestStore() {
  return useMutation({
    mutationFn: testStore,
    onSuccess: (result) => toast.success(result.connected ? 'Connection test passed.' : 'Connection test failed.'),
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Connection test failed.'),
  });
}

export function useDisconnectStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectStore,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: storeKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
      publishNotification({
        title: 'Store disconnected',
        description: 'A store connection was removed from your account.',
        icon: 'store',
        tone: 'neutral',
      });
      toast.success('Store disconnected.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to disconnect store.'),
  });
}
