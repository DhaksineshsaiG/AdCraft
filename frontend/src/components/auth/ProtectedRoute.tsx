//import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@hooks/useAuth';
import { AppLoadingIcon } from '@components/ui/LoadingSpinner';

// ─── Loading splash ───────────────────────────────────────────────────────────

function AuthSplash() {
  return (
    <motion.div
      key="auth-splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-page"
    >
      <div className="mb-6">
        <AppLoadingIcon label="Restoring your session…" />
      </div>

      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Restoring your session…
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-0.5 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <motion.div
          className="h-full bg-brand-500"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

/**
 * Wraps authenticated route groups.
 *
 * Behaviour:
 * 1. While auth status is `idle` or `loading` → show full-screen splash
 * 2. `unauthenticated` → redirect to /login, preserving `location.state.from`
 *    so the user is returned to the originally requested page after login
 * 3. `authenticated` → render children via <Outlet>
 *
 * Usage in router:
 * ```tsx
 * { element: <ProtectedRoute />, children: [...dashboardRoutes] }
 * ```
 */
export default function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading, isUnauthenticated } = useAuth();

  if (isLoading) return <AuthSplash />;

  if (isUnauthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return isAuthenticated ? <Outlet /> : null;
}

// ─── GuestRoute ───────────────────────────────────────────────────────────────

/**
 * Wraps guest-only routes (login, register).
 * Redirects authenticated users straight to the dashboard.
 */
export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <AuthSplash />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
