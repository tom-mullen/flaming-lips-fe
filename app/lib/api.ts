export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || `HTTP ${res.status}`);
  }

  const text = await res.text();
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, `Unexpected response from API`);
  }
}

export async function api<T = void>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (_accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${_accessToken}`);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  return handleResponse<T>(res);
}

export async function apiPost<T = void>(
  path: string,
  body: unknown,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return api<T>(path, {
    method: "POST",
    ...options,
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T = void>(
  path: string,
  body: unknown,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return api<T>(path, {
    method: "PATCH",
    ...options,
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T = void>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return api<T>(path, { method: "DELETE", ...options });
}

/**
 * Upload FormData (no Content-Type header — browser sets multipart boundary).
 */
export async function apiUpload<T = void>(
  path: string,
  body: FormData,
): Promise<T> {
  return api<T>(path, { method: "POST", body });
}

/**
 * Build a WebSocket URL from an API path.
 * Appends the bearer token as a query parameter since the browser
 * WebSocket API does not support custom headers.
 */
export function wsUrl(path: string): string {
  const protocol = API_URL.startsWith("https") ? "wss" : "ws";
  const host = API_URL.replace(/^https?:\/\//, "");
  if (!_accessToken) {
    return `${protocol}://${host}${path}`;
  }
  // Pick "?" vs "&" based on whether the path already carries a query
  // string. Callers can pass e.g. "/batches/{id}/stream?after_seq=42"
  // without having to know we're about to tack on a jwt parameter.
  const separator = path.includes("?") ? "&" : "?";
  const tokenParam = `${separator}jwt=${encodeURIComponent(_accessToken)}`;
  return `${protocol}://${host}${path}${tokenParam}`;
}
