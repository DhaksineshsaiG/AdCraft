import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import ProtectedRoute, { GuestRoute } from '@components/auth/ProtectedRoute';
import DashboardLayout from '@components/dashboard/DashboardLayout';
import { AppLoadingIcon } from '@components/ui/LoadingSpinner';
//import { AnimatePresence, motion } from 'framer-motion';

// ─── Page-level lazy imports ──────────────────────────────────────────────────
// Each page is its own chunk — loads only when the route is first visited.

// Auth pages (Phase 11)
const LoginPage    = lazy(() => import('@pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@pages/auth/ResetPasswordPage'));

// Dashboard pages (Phase 12+)
const DashboardPage  = lazy(() => import('@pages/dashboard/DashboardPage'));
const GrowthPage     = lazy(() => import('@pages/growth/GrowthPage'));
const StoresPage     = lazy(() => import('@pages/stores/StoresPage')); 
const ProductsPage   = lazy(() => import('@pages/products/ProductsPage')); 
const PostersPage    = lazy(() => import('@pages/posters/PostersPage')); 
const ExportsPage    = lazy(() => import('@pages/exports/ExportsPage')); 
const NotificationsPage = lazy(() => import('@pages/notifications/NotificationsPage'));
const SettingsPage   = lazy(() => import('@pages/settings/SettingsPage')); 
const NotFoundPage   = lazy(() => import('@pages/NotFoundPage')); 

// ─── Page transition variants ────────────────────────────────────────────────

// const pageVariants = {
//   initial: { opacity: 0, y: 8 },
//   animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
//   exit:    { opacity: 0, y: -4, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } },
// };

// ─── Animated page wrapper ────────────────────────────────────────────────────

// function PageTransition({ children }: { children: React.ReactNode }) {
//   return (
//     <motion.div
//       variants={pageVariants}
//       initial="initial"
//       animate="animate"
//       exit="exit"
//       style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
//     >
//       {children}
//     </motion.div>
//   );
// }

// ─── Suspense fallback ────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <AppLoadingIcon />
        <p className="text-sm text-slate-400 animate-pulse">Loading…</p>
      </div>
    </div>
  );
}

// ─── Layout: Animated outlet ──────────────────────────────────────────────────
// Wraps every route's <Outlet> so page transitions fire on navigation.
  //  function AnimatedOutlet() {
  //   return <Outlet />;
  // }
// function AnimatedOutlet() {
//   const location = useLocation();
//   return (
//     <AnimatePresence mode="wait" initial={false}>
//       <PageTransition key={location.pathname}>
//         <Outlet />
//       </PageTransition>
//     </AnimatePresence>
//   );
// }

// ─── Guard: Authenticated routes ──────────────────────────────────────────────
// Reads auth state from localStorage token presence.
// Phase 11 will replace this with the Zustand auth store.


// ─── Guard: Guest-only routes ─────────────────────────────────────────────────
// Redirect already-authenticated users away from login/register.


// ─── Lazy page wrapper ────────────────────────────────────────────────────────

function Page({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// ─── Router definition ────────────────────────────────────────────────────────

const router = createBrowserRouter([
  // ── Root redirect ──────────────────────────────────────────────────────────
  {
    index: true,
    element: <Navigate to="/dashboard" replace />,
  },

  // ── Guest-only routes (unauthenticated) ───────────────────────────────────
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: <Page component={LoginPage} />,
      },
      {
        path: '/register',
        element: <Page component={RegisterPage} />,
      },
      {
        path: '/forgot-password',
        element: <Page component={ForgotPasswordPage} />,
      },
      {
        path: '/reset-password',
        element: <Page component={ResetPasswordPage} />,
      },
    ],
  },

  // ── Protected routes (authenticated) ─────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: '/dashboard',
            element: <Page component={DashboardPage} />,
          },
          {
            path: '/growth',
            element: <Page component={GrowthPage} />,
          },
          {
            path: '/growth/:campaignId',
            element: <Page component={GrowthPage} />,
          },
          {
            path: '/stores',
            element: <Page component={StoresPage} />,
          },
          {
            path: '/products',
            element: <Page component={ProductsPage} />,
          },
          {
            path: '/posters',
            element: <Page component={PostersPage} />,
          },
          {
            path: '/exports',
            element: <Page component={ExportsPage} />,
          },
          {
            path: '/notifications',
            element: <Page component={NotificationsPage} />,
          },
          {
            path: '/settings',
            element: <Page component={SettingsPage} />,
          },
        ],
      },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────────────────────
  {
    path: '*',
    element: <Page component={NotFoundPage} />,
  },
]);

// ─── AppRouter component ──────────────────────────────────────────────────────

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
