import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  AuthUser,
  getMe,
  login as apiLogin,
  googleAuth as apiGoogleAuth,
  logout as apiLogout,
  register as apiRegister,
  clearTokens,
  getAccessToken,
  RegisterPayload,
  LoginPayload,
  GoogleAuthPayload,
  extractApiError,
} from '@services/auth.service';

// ─── State shape ──────────────────────────────────────────────────────────────

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user:   AuthUser | null;
  status: AuthStatus;
  error:  string | null;

  // Actions
  initialize:  () => Promise<void>;
  login:       (payload: LoginPayload)    => Promise<void>;
  googleAuth:  (payload: GoogleAuthPayload) => Promise<void>;
  register:    (payload: RegisterPayload) => Promise<void>;
  logout:      () => Promise<void>;
  clearError:  () => void;
  setUser:     (user: AuthUser) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    user:   null,
    status: 'idle',
    error:  null,

    // ── initialize ────────────────────────────────────────────────────────────
    // Called once on app mount. If an access token exists in localStorage,
    // fetch /auth/me to restore the user session without prompting for login.

    initialize: async () => {
      if (get().status !== 'idle') return;

      const token = getAccessToken();

      if (!token) {
        set({ status: 'unauthenticated' });
        return;
      }

      set({ status: 'loading' });

      try {
        const user = await getMe();
        set({ user, status: 'authenticated', error: null });
      } catch {
        // Token is stale / invalid — clear and treat as logged out
        clearTokens();
        set({ user: null, status: 'unauthenticated' });
      }
    },

    // ── login ─────────────────────────────────────────────────────────────────

    login: async (payload: LoginPayload) => {
      set({ status: 'loading', error: null });

      try {
        const response = await apiLogin(payload);
        // Tokens are already stored inside apiLogin()
        set({ user: response.data.user, status: 'authenticated', error: null });
      } catch (error) {
        const { message } = extractApiError(error);
        set({ status: 'unauthenticated', error: message });
        throw error; // Re-throw so the form can also handle field-level errors
      }
    },

    googleAuth: async (payload: GoogleAuthPayload) => {
      set({ status: 'loading', error: null });

      try {
        const response = await apiGoogleAuth(payload);
        set({ user: response.data.user, status: 'authenticated', error: null });
      } catch (error) {
        const { message } = extractApiError(error);
        set({ status: 'unauthenticated', error: message });
        throw error;
      }
    },

    // ── register ──────────────────────────────────────────────────────────────

    register: async (payload: RegisterPayload) => {
      set({ status: 'loading', error: null });

      try {
        const response = await apiRegister(payload);
        set({ user: response.data.user, status: 'authenticated', error: null });
      } catch (error) {
        const { message } = extractApiError(error);
        set({ status: 'unauthenticated', error: message });
        throw error;
      }
    },

    // ── logout ────────────────────────────────────────────────────────────────

    logout: async () => {
      set({ status: 'loading' });

      try {
        await apiLogout();
      } finally {
        set({ user: null, status: 'unauthenticated', error: null });
      }
    },

    // ── helpers ───────────────────────────────────────────────────────────────

    clearError: () => set({ error: null }),

    setUser: (user: AuthUser) => set({ user }),
  }))
);

// ─── Bootstrap helper ─────────────────────────────────────────────────────────
// Called in App.tsx (or ProtectedRoute) to rehydrate auth on every page load.

export function initializeAuth(): Promise<void> {
  return useAuthStore.getState().initialize();
}

// ─── Global logout listener ───────────────────────────────────────────────────
// The Axios interceptor dispatches 'auth:logout' when a refresh fails.
// This handler ensures the Zustand store is wiped even if the user hasn't
// actively interacted with the app.

if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.setState({ user: null, status: 'unauthenticated', error: null });
  });
}
