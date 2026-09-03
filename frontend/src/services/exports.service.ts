import api from './auth.service';
import type { ApiResponse, Pagination } from './api.types';
import { toExportRecord, type BackendExportRecord } from './mappers';
import type { ExportFormat, ExportRecord } from '@components/exports/ExportCard';

export interface ExportAnalytics {
  totalExports: number;
  totalDownloads: number;
  exportsLast7Days: number;
  exportsLast30Days: number;
  exportsByFormat: Record<ExportFormat, number>;
}

export interface ExportHistoryResult {
  records: ExportRecord[];
  pagination: Pagination;
}

export async function getExportHistory(params: { page?: number; limit?: number; format?: ExportFormat } = {}): Promise<ExportHistoryResult> {
  const { data } = await api.get<ApiResponse<{ records: BackendExportRecord[]; pagination: Pagination }>>('/export/history', { params });
  return {
    records: data.data.records.map(toExportRecord),
    pagination: data.data.pagination,
  };
}

export async function getExportAnalytics(): Promise<ExportAnalytics> {
  const { data } = await api.get<ApiResponse<{ analytics: ExportAnalytics }>>('/export/analytics');
  return data.data.analytics;
}

export async function exportSingle(
  posterId: string,
  format: ExportFormat
): Promise<{ downloadUrl: string; filename?: string; format?: ExportFormat }> {
  const { data } = await api.post<ApiResponse<{ downloadUrl: string; filename?: string; format?: ExportFormat }>>(
    `/export/${posterId}`,
    { format }
  );
  return data.data;
}

export interface BulkExportResult {
  downloadUrl?: string;
  filename?: string;
  results: Array<{ posterId: string; downloadUrl?: string; filename?: string; error?: string }>;
  succeeded: number;
  failed: number;
}

export async function exportBulk(posterIds: string[], format: ExportFormat): Promise<BulkExportResult> {
  const { data } = await api.post<ApiResponse<BulkExportResult>>('/export/bulk', {
    posterIds,
    format,
  });
  return data.data;
}
