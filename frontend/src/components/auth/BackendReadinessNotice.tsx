import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import type { BackendReadinessStatus } from '@hooks/useBackendReadiness';

interface BackendReadinessNoticeProps {
  status: BackendReadinessStatus;
  onRetry: () => void;
}

export default function BackendReadinessNotice({
  status,
  onRetry,
}: BackendReadinessNoticeProps) {
  if (status === 'ready') return null;

  if (status === 'timed-out') {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          The server is taking longer than expected. Please try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary btn-sm mt-3"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="mb-6 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800/60 dark:bg-brand-950/30"
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="sm" label="Starting server" />
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Starting the server… This may take up to a minute.
      </p>
    </div>
  );
}
