import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  approveCampaign,
  createCampaign,
  getCampaign,
  listStoreCampaigns,
  type CreateCampaignPayload,
} from '@services/campaign.service';

export const campaignKeys = {
  all: ['campaigns'] as const,
  store: (storeId?: string) => [...campaignKeys.all, 'store', storeId ?? 'none'] as const,
  detail: (campaignId?: string) => [...campaignKeys.all, 'detail', campaignId ?? 'none'] as const,
};

export function useStoreCampaigns(storeId?: string) {
  return useQuery({
    queryKey: campaignKeys.store(storeId),
    queryFn: () => listStoreCampaigns(storeId!),
    enabled: Boolean(storeId),
    staleTime: 60_000,
  });
}

export function useCampaign(campaignId?: string) {
  return useQuery({
    queryKey: campaignKeys.detail(campaignId),
    queryFn: () => getCampaign(campaignId!),
    enabled: Boolean(campaignId),
    staleTime: 60_000,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) => createCampaign(payload),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.store(campaign.storeId) });
      queryClient.setQueryData(campaignKeys.detail(campaign.id), campaign);
      toast.success('Campaign created successfully!');
    },
  });
}

export function useApproveCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => approveCampaign(campaignId),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.store(campaign.storeId) });
      queryClient.setQueryData(campaignKeys.detail(campaign.id), campaign);
      toast.success('Campaign approved!');
    },
  });
}
