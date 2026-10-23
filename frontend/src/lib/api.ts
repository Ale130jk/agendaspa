import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { AuthResponse } from '../types/api';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;
const failureListeners = new Set<() => void>();

const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

function notifyAuthFailure(): void {
  accessToken = null;
  for (const listener of failureListeners) {
    listener();
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function subscribeAuthFailure(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ErrorEnvelope | undefined;
    return new ApiError(
      envelope?.error?.message ?? 'No pudimos completar la solicitud.',
      envelope?.error?.code ?? 'NETWORK_ERROR',
      error.response?.status ?? 0,
      envelope?.error?.details,
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 'UNKNOWN_ERROR', 0);
  }

  return new ApiError('No pudimos completar la solicitud.', 'UNKNOWN_ERROR', 0);
}

export async function refreshSession(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<AuthResponse>('/auth/refresh')
      .then((response) => {
        accessToken = response.data.accessToken;
        return response.data;
      })
      .catch((error: unknown) => {
        notifyAuthFailure();
        throw toApiError(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function shouldAttemptRefresh(config: RetryConfig): boolean {
  if (config._retry) {
    return false;
  }

  const url = config.url ?? '';
  return !['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some((path) =>
    url.includes(path),
  );
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 && config && shouldAttemptRefresh(config)) {
      config._retry = true;

      try {
        const session = await refreshSession();
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${session.accessToken}`,
        };
        return api.request(config);
      } catch {
        return Promise.reject(toApiError(error));
      }
    }

    return Promise.reject(toApiError(error));
  },
);
