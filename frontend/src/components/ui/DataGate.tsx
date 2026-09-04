import { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import PageDataLoader from './PageDataLoader';

export interface DataGateProps {
  /** Whether the query is in an initial loading / pending state without existing data */
  isLoading: boolean;
  /** Whether the query failed */
  isError?: boolean;
  /** Error object if available */
  error?: Error | unknown;
  /** Whether the successfully fetched data is empty */
  isEmpty?: boolean;
  /** Custom empty state to render when isEmpty is true */
  emptyState?: ReactNode;
  /** Custom error state to render when isError is true */
  errorState?: ReactNode;
  /** Primary loading title passed to PageDataLoader */
  loadingMessage?: string;
  /** Secondary loading subtitle passed to PageDataLoader */
  loadingDescription?: string;
  /** Optional custom skeleton or loader to render instead of PageDataLoader */
  loaderComponent?: ReactNode;
  /** Retry callback for error states */
  onRetry?: () => void;
  /** Actual page content to render once data is successfully loaded and non-empty */
  children: ReactNode;
}

export default function DataGate({
  isLoading,
  isError = false,
  error,
  isEmpty = false,
  emptyState,
  errorState,
  loadingMessage = 'Loading data…',
  loadingDescription = 'Preparing your workspace',
  loaderComponent,
  onRetry,
  children,
}: DataGateProps) {
  // 1. Initial Cold Loading State
  if (isLoading) {
    if (loaderComponent) {
      return <>{loaderComponent}</>;
    }
    return (
      <PageDataLoader
        message={loadingMessage}
        description={loadingDescription}
      />
    );
  }

  // 2. Error State
  if (isError) {
    if (errorState) {
      return <>{errorState}</>;
    }
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to load data. Please check your connection and try again.';

    return (
      <div className="card border-red-200 bg-red-50/70 p-6 text-center text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300 my-4 max-w-xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/40">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Unable to load data</h3>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 max-w-sm mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-secondary btn-sm gap-1.5 mt-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Success + Empty State
  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  // 4. Success + Data
  return <>{children}</>;
}
