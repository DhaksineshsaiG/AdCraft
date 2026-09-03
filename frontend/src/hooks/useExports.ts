import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  exportBulk,
  exportSingle,
  getExportAnalytics,
  getExportHistory,
} from '@services/exports.service';
import { publishNotification } from '@services/notifications.service';
import type { ExportFormat } from '@components/exports/ExportCard';
import { triggerBrowserDownload } from '../utils/download';

export const exportKeys = {
  all: ['exports'] as const,
  history: (params: { page?: number; limit?: number } = {}) =>
    [...exportKeys.all, 'history', params] as const,
  analytics: () => [...exportKeys.all, 'analytics'] as const,
};

export function useExportHistory(
  params: { page?: number; limit?: number } = { limit: 50 }
) {
  return useQuery({
    queryKey: exportKeys.history(params),
    queryFn: () => getExportHistory(params),
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
  });
}

export function useExportAnalytics() {
  return useQuery({
    queryKey: exportKeys.analytics(),
    queryFn: getExportAnalytics,
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
  });
}

export function useExportSingle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { posterId: string; format: ExportFormat }) => exportSingle(input.posterId, input.format),
    onMutate: () => toast.loading('Exporting poster...'),
    onSuccess: async (result, _input, toastId) => {
      queryClient.invalidateQueries({ queryKey: exportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['posters'] });
      try {
        await triggerBrowserDownload(result.downloadUrl, result.filename);
        toast.success('Export ready', { id: toastId });
      } catch {
        publishNotification({
          title: 'Export failed',
          description: 'The poster export was created, but the download could not start.',
          icon: 'warning',
          tone: 'error',
        });
        toast.error('Export download failed', { id: toastId });
      }
    },
    onError: (_error, _input, toastId) => {
      publishNotification({
        title: 'Export failed',
        description: 'A poster export could not be completed.',
        icon: 'warning',
        tone: 'error',
      });
      toast.error('Export failed', { id: toastId });
    },
  });
}

export function useBulkExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { posterIds: string[]; format: ExportFormat }) => exportBulk(input.posterIds, input.format),
    onMutate: () => toast.loading('Exporting posters...'),
    onSuccess: async (result, _input, toastId) => {
      queryClient.invalidateQueries({ queryKey: exportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['posters'] });
      try {
        if (result.downloadUrl) {
          await triggerBrowserDownload(result.downloadUrl, result.filename ?? 'Poster-Exports.zip');
        }
        toast.success(
          result.failed > 0
            ? `${result.succeeded} poster${result.succeeded === 1 ? '' : 's'} exported, ${result.failed} failed`
            : `${result.succeeded} poster${result.succeeded === 1 ? '' : 's'} exported successfully`,
          { id: toastId }
        );
        publishNotification({
          title: result.failed > 0 ? 'Bulk export completed with failures' : 'Bulk export completed',
          description: `${result.succeeded} poster${result.succeeded === 1 ? '' : 's'} exported${result.failed > 0 ? `, ${result.failed} failed` : ''}.`,
          icon: result.failed > 0 ? 'warning' : 'export',
          tone: result.failed > 0 ? 'warning' : 'success',
        });
      } catch {
        publishNotification({
          title: 'Export failed',
          description: 'The bulk export was created, but the download could not start.',
          icon: 'warning',
          tone: 'error',
        });
        toast.error('Bulk export download failed', { id: toastId });
      }
    },
    onError: (_error, _input, toastId) => {
      publishNotification({
        title: 'Export failed',
        description: 'A bulk export could not be completed.',
        icon: 'warning',
        tone: 'error',
      });
      toast.error('Bulk export failed', { id: toastId });
    },
  });
}
