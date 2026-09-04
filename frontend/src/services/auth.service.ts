import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken:            string;
  refreshToken:           string;
  accessTokenExpiresAt:   string;
  refreshTokenExpiresAt:  string;
}

export interface AuthUser {
  _id:             string;
  name:            string;
  email:           string;
  role:            string;
  status:          string;
  avatarUrl?:      string;
  isEmailVerified: boolean;
  loginCount:      number;
  lastLoginAt?:    string;
  stores:          string[];
  createdAt:       string;
  updatedAt:       string;
}

export interface RegisterPayload {
  name:            string;
  email:           string;
  password:        string;
  confirmPassword: string;
}

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface GoogleAuthPayload {
  credential: string;
}

export interface ChangePasswordPayload {
  currentPassword:    string;
  newPassword:        string;
  confirmNewPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user:   AuthUser;
    tokens: AuthTokens;
  };
}

export interface MeResponse {
  success: boolean;
  data: { user: AuthUser };
}

export interface ApiError {
  success: false;
  error: {
    message:    string;
    code?:      string;
    statusCode: number;
    details?:   Array<{ field: string; message: string }>;
  };
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const TOKEN_KEY   = 'accessToken';
export const REFRESH_KEY = 'refreshToken';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const AUTH_REQUEST_TIMEOUT_MS = 90_000;

// ─── Axios instance ───────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: API_ORIGIN + '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach Bearer token ────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 globally ───────────────────────────────

let isRefreshing  = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string): void {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      // Don't retry the refresh endpoint itself
      !originalRequest.url?.includes('/auth/refresh-token') &&
      !originalRequest.url?.includes('/auth/reset-password')
    ) {
      const refreshToken = localStorage.getItem(REFRESH_KEY);

      if (!refreshToken) {
        clearTokens();
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request until the refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post<{ success: boolean; data: { tokens: AuthTokens } }>(
          '/auth/refresh-token',
          { refreshToken }
        );
        const { accessToken, refreshToken: newRefresh } = data.data.tokens;
        storeTokens({ ...data.data.tokens, accessToken, refreshToken: newRefresh } as AuthTokens);
        processQueue(accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch {
        clearTokens();
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Token helpers ────────────────────────────────────────────────────────────

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY,   tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function checkBackendHealth(
  timeout: number = 12_000,
  signal?: AbortSignal
): Promise<boolean> {
  const response = await api.get<{ status: string }>('/health', {
    baseURL: API_ORIGIN,
    timeout,
    signal,
    validateStatus: () => true,
  });
  return response.status === 200 && response.data.status === 'ok';
}

// ─── Auth API methods ─────────────────────────────────────────────────────────

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload, {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
  });
  storeTokens(data.data.tokens);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload, {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
  });
  storeTokens(data.data.tokens);
  return data;
}

export async function googleAuth(payload: GoogleAuthPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/google', payload, {
    timeout: AUTH_REQUEST_TIMEOUT_MS,
  });
  storeTokens(data.data.tokens);
  return data;
}

export async function logout(refreshToken?: string): Promise<void> {
  try {
    const token = refreshToken ?? localStorage.getItem(REFRESH_KEY);
    await api.post('/auth/logout', { refreshToken: token });
  } finally {
    clearTokens();
  }
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<MeResponse>('/auth/me');
  return data.data.user;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<string> {
  const { data } = await api.post<{ success: boolean; message: string; data: { tokens: AuthTokens } }>(
    '/auth/change-password',
    payload
  );
  storeTokens(data.data.tokens);
  return data.message;
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<string> {
  const { data } = await api.post<{ success: boolean; message: string }>(
    '/auth/forgot-password',
    payload,
    { timeout: AUTH_REQUEST_TIMEOUT_MS }
  );
  return data.message;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<string> {
  const { data } = await api.post<{ success: boolean; message: string }>(
    '/auth/reset-password',
    payload,
    { timeout: AUTH_REQUEST_TIMEOUT_MS }
  );
  return data.message;
}

// ─── Error shape extractor ────────────────────────────────────────────────────

/**
 * Extracts a human-readable error message from an Axios error.
 * Returns field-level details when the backend sends a validation error array.
 */
export function extractApiError(error: unknown): {
  message: string;
  details?: Array<{ field: string; message: string }>;
} {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.error) {
      return {
        message: data.error.message,
        details: data.error.details,
      };
    }
    if (error.message === 'Network Error') {
      return { message: 'Unable to reach the server. Check your connection.' };
    }
  }
  return { message: 'An unexpected error occurred. Please try again.' };
}

export default api;
