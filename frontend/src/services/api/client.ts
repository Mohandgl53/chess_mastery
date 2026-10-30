export class ApiError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, status = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      // Required for session cookie to be sent with every request
      credentials: 'include'
    });

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let message = data?.error?.message || response.statusText || 'API request failed';
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        message = retryAfter
          ? `Server is temporarily busy. Please wait ${retryAfter} second${Number(retryAfter) === 1 ? '' : 's'} before retrying.`
          : 'Server is temporarily busy. Please wait a moment and try again.';
      }
      const code = data?.error?.code || `HTTP_${response.status}`;
      throw new ApiError(message, response.status, code, data?.error?.details);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }

    const anyErr = err as { name?: string; message?: string };

    // Handle Network / Connection refused errors
    const isNetworkError =
      anyErr.name === 'TypeError' ||
      anyErr.message?.includes('Failed to fetch') ||
      anyErr.message?.includes('NetworkError') ||
      anyErr.message?.includes('network');

    if (isNetworkError) {
      throw new ApiError(
        `Cannot connect to backend server at ${BASE_URL}. Please ensure the server is running.`,
        0,
        'NETWORK_UNAVAILABLE',
        err
      );
    }

    throw new ApiError(anyErr.message || 'Unknown network error occurred', 500, 'UNKNOWN_ERROR', err);
  }
}
