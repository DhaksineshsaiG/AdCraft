import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  deletePoster,
  exportPoster,
  generatePoster,
  getTemplates,
  listPosters,
  previewPoster,
  regeneratePoster,
  savePosterEdit,
  toggleFavourite,
  type GeneratePosterRequest,
  type PosterListResult,
  type PosterListParams,
  type SavePosterEditRequest,
} from '@services/posters.service';
import { publishNotification } from '@services/notifications.service';
import type { Poster, PosterFormat, PosterStyle } from '@components/posters/PosterCard';
import { triggerBrowserDownload } from '../utils/download';

export const posterKeys = {
  all: ['posters'] as const,
  lists: () => [...posterKeys.all, 'list'] as const,
  list: (params: PosterListParams = {}) => [...posterKeys.all, 'list', params] as const,
  templates: (style?: PosterStyle) => [...posterKeys.all, 'templates', style ?? 'all'] as const,
  preview: (posterId?: string) => [...posterKeys.all, 'preview', posterId ?? 'none'] as const,
};

export function usePosters(params: PosterListParams = {}) {
  return useQuery({
    queryKey: posterKeys.list(params),
    queryFn: () => listPosters(params),
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
  });
}

export function usePosterTemplates(style?: PosterStyle) {
  return useQuery({
    queryKey: posterKeys.templates(style),
    queryFn: () => getTemplates(style),
  });
}

export function usePosterPreview(posterId?: string) {
  return useQuery({
    queryKey: posterKeys.preview(posterId),
    queryFn: () => previewPoster(posterId!),
    enabled: Boolean(posterId),
    placeholderData: (previousData) => previousData,
  });
}

export function useGeneratePoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generatePoster,
    onMutate: () => toast.loading('Generating poster...'),
    onSuccess: (result, _input, toastId) => {
      upsertPosterInListCaches(queryClient, result);
      queryClient.invalidateQueries({ queryKey: posterKeys.all });
      toast.success('Poster generated successfully', { id: toastId });
    },
    onError: (error, _input, toastId) => {
      publishNotification({
        title: 'Poster generation failed',
        description: error instanceof Error ? error.message : 'A poster could not be generated.',
        icon: 'warning',
        tone: 'error',
      });
      toast.error(error instanceof Error ? error.message : 'Poster generation failed', { id: toastId });
    },
  });
}

export function useRegeneratePoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { posterId: string; body?: Partial<Omit<GeneratePosterRequest, 'productId'>> }) =>
      regeneratePoster(input.posterId, input.body),
    onMutate: () => toast.loading('Generating poster...'),
    onSuccess: (result, _input, toastId) => {
      upsertPosterInListCaches(queryClient, result);
      queryClient.invalidateQueries({ queryKey: posterKeys.all });
      toast.success('Poster generated successfully', { id: toastId });
    },
    onError: (error, _input, toastId) => {
      publishNotification({
        title: 'Poster generation failed',
        description: error instanceof Error ? error.message : 'A poster could not be regenerated.',
        icon: 'warning',
        tone: 'error',
      });
      toast.error(error instanceof Error ? error.message : 'Poster generation failed', { id: toastId });
    },
  });
}

export function useTogglePosterFavourite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleFavourite,
    onMutate: async (posterId) => {
      await queryClient.cancelQueries({ queryKey: posterKeys.lists() });
      const snapshots = getPosterListSnapshots(queryClient);
      const sourcePoster = snapshots
        .flatMap(([, data]) => data?.posters ?? [])
        .find((poster) => poster.id === posterId);

      if (sourcePoster) {
        updateFavouriteCaches(
          queryClient,
          snapshots,
          posterId,
          !sourcePoster.isFavourited,
          sourcePoster
        );
      }

      return { snapshots };
    },
    onSuccess: (updatedPoster, posterId, context) => {
      const snapshots = getPosterListSnapshots(queryClient);
      const sourcePoster = [...(context?.snapshots ?? []), ...snapshots]
        .flatMap(([, data]) => data?.posters ?? [])
        .find((poster) => poster.id === posterId);
      updateFavouriteCaches(
        queryClient,
        snapshots,
        posterId,
        updatedPoster.isFavourited,
        mergePoster(sourcePoster, updatedPoster)
      );
      queryClient.invalidateQueries({ queryKey: posterKeys.lists() });
    },
    onError: (error, _posterId, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(error instanceof Error ? error.message : 'Could not update favourite.');
    },
  });
}

function mergePoster(sourcePoster: Poster | undefined, updatedPoster: Poster): Poster {
  return sourcePoster ? { ...sourcePoster, ...updatedPoster } : updatedPoster;
}

function getPosterListSnapshots(
  queryClient: ReturnType<typeof useQueryClient>
): Array<[readonly unknown[], PosterListResult | undefined]> {
  return queryClient
    .getQueriesData<PosterListResult>({ queryKey: posterKeys.lists() })
    .filter((entry): entry is [readonly unknown[], PosterListResult] =>
      isPosterListResult(entry[1])
    );
}

function isPosterListResult(data: unknown): data is PosterListResult {
  return Boolean(
    data &&
    typeof data === 'object' &&
    Array.isArray((data as PosterListResult).posters) &&
    Array.isArray((data as PosterListResult).rawPosters) &&
    (data as PosterListResult).pagination &&
    typeof (data as PosterListResult).pagination === 'object'
  );
}

function updateFavouriteCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  caches: Array<[readonly unknown[], PosterListResult | undefined]>,
  posterId: string,
  isFavourited: boolean,
  sourcePoster?: PosterListResult['posters'][number]
): void {
  caches.forEach(([key, data]) => {
    if (!isPosterListResult(data)) return;
    const params = (key[2] ?? {}) as PosterListParams;
    const existingIndex = data.posters.findIndex((poster) => poster.id === posterId);
    let posters = data.posters;
    let totalDelta = 0;

    if (params.isFavourited) {
      if (!isFavourited && existingIndex >= 0) {
        posters = data.posters.filter((poster) => poster.id !== posterId);
        totalDelta = -1;
      } else if (isFavourited && existingIndex < 0 && sourcePoster) {
        posters = [{ ...sourcePoster, isFavourited: true }, ...data.posters];
        totalDelta = 1;
      } else if (existingIndex >= 0) {
        posters = data.posters.map((poster) =>
          poster.id === posterId ? { ...poster, isFavourited } : poster
        );
      }
    } else if (existingIndex >= 0) {
      posters = data.posters.map((poster) =>
        poster.id === posterId ? { ...poster, isFavourited } : poster
      );
    }

    queryClient.setQueryData<PosterListResult>(key, {
      ...data,
      posters,
      pagination: {
        ...data.pagination,
        total: Math.max(0, data.pagination.total + totalDelta),
      },
    });
  });
}

export function useExportPoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { posterId: string; format: PosterFormat }) => exportPoster(input.posterId, input.format),
    onMutate: () => toast.loading('Exporting poster...'),
    onSuccess: async (result, _input, toastId) => {
      queryClient.invalidateQueries({ queryKey: posterKeys.all });
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      try {
        await triggerBrowserDownload(result.downloadUrl, result.filename);
        toast.success('Poster export ready', { id: toastId });
      } catch {
        publishNotification({
          title: 'Export failed',
          description: 'The poster export was created, but the download could not start.',
          icon: 'warning',
          tone: 'error',
        });
        toast.error('Poster export download failed', { id: toastId });
      }
    },
    onError: (_error, _input, toastId) => {
      publishNotification({
        title: 'Export failed',
        description: 'A poster export could not be completed.',
        icon: 'warning',
        tone: 'error',
      });
      toast.error('Poster export failed', { id: toastId });
    },
  });
}

function upsertPosterInListCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  poster: Poster
): void {
  queryClient
    .getQueriesData<PosterListResult>({ queryKey: posterKeys.lists() })
    .forEach(([key, data]) => {
      if (!isPosterListResult(data)) return;
      const params = (key[2] ?? {}) as PosterListParams;
      const existingIndex = data.posters.findIndex((item) => item.id === poster.id);
      const belongsInCache = posterMatchesListParams(poster, params);

      if (!belongsInCache && existingIndex < 0) return;

      const posters = belongsInCache
        ? existingIndex >= 0
          ? data.posters.map((item) => (item.id === poster.id ? poster : item))
          : [poster, ...data.posters]
        : data.posters.filter((item) => item.id !== poster.id);

      queryClient.setQueryData<PosterListResult>(key, {
        ...data,
        posters,
        pagination: {
          ...data.pagination,
          total:
            existingIndex >= 0
              ? data.pagination.total
              : belongsInCache
                ? data.pagination.total + 1
                : data.pagination.total,
        },
      });
    });
}

function posterMatchesListParams(poster: Poster, params: PosterListParams): boolean {
  if (params.generationStatus && poster.generationStatus !== params.generationStatus) return false;
  if (params.size && poster.size !== params.size) return false;
  if (params.format && poster.format !== params.format) return false;
  if (params.isFavourited !== undefined && poster.isFavourited !== params.isFavourited) return false;
  return true;
}

export function useSavePosterEdit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { posterId: string; body: SavePosterEditRequest }) =>
      savePosterEdit(input.posterId, input.body),
    onMutate: () => toast.loading('Saving poster...'),
    onSuccess: (poster, _input, toastId) => {
      queryClient.invalidateQueries({ queryKey: posterKeys.all });
      publishNotification({
        title: 'Poster saved',
        description: `${poster.productName} was saved successfully.`,
        icon: 'edit',
        tone: 'info',
      });
      toast.success('Poster saved', { id: toastId });
    },
    onError: (error, _input, toastId) => {
      toast.error(error instanceof Error ? error.message : 'Could not save poster.', { id: toastId });
    },
  });
}

export function useDeletePoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePoster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posterKeys.all });
      publishNotification({
        title: 'Poster deleted',
        description: 'A poster was removed from your library.',
        icon: 'trash',
        tone: 'neutral',
      });
      toast.success('Poster deleted.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not delete poster.'),
  });
}
