import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore, initializeAuth } from '@stores/auth.store';
import type { GoogleAuthPayload, LoginPayload, RegisterPayload } from '@services/auth.service';
import { extractApiError } from '@services/auth.service';

// ─── Main hook ────────────────────────────────────────────────────────────────

/**
 * Primary auth hook. Use in any component that needs auth state or actions.
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth() {
  const {
    user,
    status,
    error,
    login:    storeLogin,
    googleAuth: storeGoogleAuth,
    register: storeRegister,
    logout:   storeLogout,
    clearError,
  } = useAuthStore();

  const isAuthenticated  = status === 'authenticated';
  const isLoading        = status === 'loading' || status === 'idle';
  const isUnauthenticated = status === 'unauthenticated';

  // ── Wrapped login with toast feedback ───────────────────────────────────
  async function login(payload: LoginPayload): Promise<boolean> {
    try {
      await storeLogin(payload);
      toast.success('Welcome back!');
      return true;
    } catch (error) {
      const { message, details } = extractApiError(error);
      // Show first field-level error if present, else show the top-level message
      const toastMessage = details?.[0]
        ? `${details[0].field}: ${details[0].message}`
        : message;
      toast.error(toastMessage);
      return false;
    }
  }

  // ── Wrapped register with toast feedback ─────────────────────────────────
  async function register(payload: RegisterPayload): Promise<boolean> {
    try {
      await storeRegister(payload);
      toast.success('Account created! Welcome aboard 🎉');
      return true;
    } catch (error) {
      const { message, details } = extractApiError(error);
      const toastMessage = details?.[0]
        ? `${details[0].field}: ${details[0].message}`
        : message;
      toast.error(toastMessage);
      return false;
    }
  }

  async function googleAuth(payload: GoogleAuthPayload): Promise<boolean> {
    try {
      await storeGoogleAuth(payload);
      toast.success('Welcome!');
      return true;
    } catch (error) {
      const { message } = extractApiError(error);
      toast.error(message);
      return false;
    }
  }

  // ── Wrapped logout with toast feedback ───────────────────────────────────
  async function logout(): Promise<void> {
    await storeLogout();
    toast.success('You have been signed out.');
  }

  return {
    user,
    status,
    error,
    isAuthenticated,
    isLoading,
    isUnauthenticated,
    login,
    googleAuth,
    register,
    logout,
    clearError,
  };
}

// ─── Initialization hook ──────────────────────────────────────────────────────

/**
 * Triggers session restoration from localStorage on first mount.
 * Place this in a top-level component that renders before any route is shown.
 *
 * @example
 * // In App.tsx or a layout wrapper:
 * useAuthInit();
 */
export function useAuthInit(): { isInitializing: boolean } {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'idle') {
      initializeAuth();
    }
  }, [status]);

  return { isInitializing: status === 'idle' || status === 'loading' };
}

// ─── Redirect hooks ───────────────────────────────────────────────────────────

/**
 * Redirects the user to `to` after a successful login/register.
 * Reads `location.state.from` set by ProtectedRoute, falls back to `/dashboard`.
 */
export function usePostLoginRedirect() {
  const navigate = useNavigate();

  return function redirectAfterLogin(from?: string) {
    navigate(from ?? '/dashboard', { replace: true });
  };
}

/**
 * Redirect already-authenticated users away from guest-only pages.
 * Call inside LoginPage / RegisterPage.
 */
export function useRedirectIfAuthenticated(to: string = '/dashboard') {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(to, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, to]);
}
