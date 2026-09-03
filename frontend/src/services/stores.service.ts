import api from './auth.service';
import type { ApiResponse } from './api.types';
import { toStore, type BackendStore } from './mappers';
import type { Store } from '@components/stores/StoreCard';
import type { ConnectStoreFormData } from '@components/stores/ConnectStoreDialog';

export async function listStores(): Promise<Store[]> {
  const { data } = await api.get<ApiResponse<{ stores: BackendStore[] }>>('/stores');
  return data.data.stores.map(toStore);
}

export async function connectStore(form: ConnectStoreFormData): Promise<Store> {
  if (form.platform === 'shopify') {
    const { data } = await api.post<ApiResponse<{ store: BackendStore }>>('/stores/connect/shopify', {
      name: form.storeName,
      shopDomain: form.shopDomain,
      accessToken: form.accessToken,
    });
    return toStore(data.data.store);
  }

  const { data } = await api.post<ApiResponse<{ store: BackendStore }>>('/stores/connect/woocommerce', {
    name: form.storeName,
    storeUrl: form.storeUrl,
    consumerKey: form.consumerKey,
    consumerSecret: form.consumerSecret,
  });
  return toStore(data.data.store);
}

export async function syncStore(storeId: string): Promise<void> {
  await api.post(`/stores/${storeId}/sync`);
}

export async function testStore(storeId: string): Promise<{ connected: boolean }> {
  const { data } = await api.post<ApiResponse<{ connected: boolean }>>(`/stores/${storeId}/test`);
  return data.data;
}

export async function disconnectStore(storeId: string): Promise<void> {
  await api.delete(`/stores/${storeId}`);
}
