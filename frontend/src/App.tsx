import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import AppRouter from '@routes/index';
import { useAuthInit } from '@hooks/useAuth';

// ─── React Query client ───────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale after 5 minutes — balanced for a dashboard that syncs with the API
      staleTime: 5 * 60 * 1000,
      // Retry once on failure; avoids hammering a 401 endpoint three times
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        // Never retry auth errors — they need user action, not a retry loop
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false, // Refetch when the user returns to the tab
    },
    mutations: { //they are the functions that modify data on the server (e.g., POST, PUT, DELETE requests). They are used to create, update, or delete data and can be used to trigger side effects in your application.
      retry: 0,
    },
  },
});

// ─── Error Boundary ───────────────────────────────────────────────────────────

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState { hasError: boolean; error?: Error }

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Replace with your error tracking service (Sentry, Datadog, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.replace('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-6">
        <div className="card max-w-md w-full p-8 text-center animate-in">
          {/* Error icon */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
            <svg
              className="h-7 w-7 text-red-500"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6">
            An unexpected error occurred. Your session and data are safe.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre className="mb-5 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-left text-xs text-slate-600 dark:text-slate-400 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleReset}
            className="btn btn-primary btn-md w-full"
          >
            Reload application
          </button>
        </div>
      </div>
    );
  }
}

// ─── Theme initialiser ────────────────────────────────────────────────────────
// Reads the user's saved preference from localStorage and applies it before
// the first paint to avoid a flash of unstyled content.

function useThemeInit(): void {
  useEffect(() => {
    const saved  = localStorage.getItem('theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved === 'dark' || (!saved && system);

    document.documentElement.classList.toggle('dark', isDark);
  }, []);
}

// ─── Toast config ─────────────────────────────────────────────────────────────

const TOAST_OPTIONS = {
  duration: 4000,
  style: {
    // Overridden further in globals.css via [data-hot-toast] selector
    fontFamily: 'var(--font-sans)',
    fontSize:   '0.875rem',
    borderRadius: '0.75rem',
    boxShadow: 'var(--shadow-xl)',
    border:    '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color:      'var(--color-text-primary)',
    padding:    '10px 14px',
  },
  success: {
    iconTheme: { primary: '#16a34a', secondary: '#fff' },
  },
  error: {
    iconTheme: { primary: '#dc2626', secondary: '#fff' },
    duration: 6000,
  },
} as const;

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  useThemeInit();
  useAuthInit();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Router — renders the full page tree */}
        <AppRouter />

        {/* Global toast notifications */}
        <Toaster
          position="bottom-right"
          reverseOrder={false}
          toastOptions={TOAST_OPTIONS}
        />

        {/* React Query Devtools (dev only — tree-shaken in production build) */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
