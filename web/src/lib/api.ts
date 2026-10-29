/**
 * Typed API client.
 *
 * Every vendor call goes through `apiFetch`. It:
 *   - prefixes the path with `<VITE_API_ORIGIN>/api/vendor`
 *   - sends `Authorization: Bearer <nearbite_vendor_token>`
 *   - parses JSON (tolerating an empty body)
 *   - on HTTP 401: clears the session and redirects to `#/login`
 *   - throws a typed `ApiError` carrying `status` and the server `code`
 *
 * The base URL comes from `VITE_API_ORIGIN` (default https://api.eatswada.com),
 * per AGENTS.md rule 9. No page hardcodes a URL.
 */
import { clearSession, getToken } from './auth';

export const API_ORIGIN: string = (
  import.meta.env.VITE_API_ORIGIN ?? 'https://api.eatswada.com'
).replace(/\/+$/, '');

export const API_BASE: string = `${API_ORIGIN}/api/vendor`;
export const NOTIFICATIONS_BASE: string = `${API_ORIGIN}/api/notifications`;
export const PLATFORM_BASE: string = `${API_ORIGIN}/api/platform`;

/** Matches the legacy 15 s AbortController timeout in fetchJson(). */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Client-side classification of the failure. */
export type ApiErrorCode = 'unauthorized' | 'timeout' | 'network' | 'http';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  /** The backend's own machine code when it sent one (e.g. PREP_EXTENSION_ALREADY_USED). */
  readonly serverCode: string | null;
  readonly payload: unknown;

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode,
    payload?: unknown,
    serverCode?: string | null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.serverCode = serverCode ?? null;
    this.payload = payload;
  }
}

interface ServerErrorBody {
  message?: string;
  error?: string;
  code?: string;
}

function serverMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const b = body as ServerErrorBody;
    if (typeof b.message === 'string' && b.message) return b.message;
    if (typeof b.error === 'string' && b.error) return b.error;
  }
  return fallback;
}

/** Redirect target for an expired session. HashRouter, so the route is `#/login`. */
const LOGIN_ROUTE = '#/login';

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.hash === LOGIN_ROUTE) return;
  window.location.hash = LOGIN_ROUTE;
}

/**
 * Called on any 401: clear the token + cached user/restaurant, then send the
 * vendor to login. Kept as a named export so callers/tests can assert it.
 */
export function handleUnauthorized(): void {
  clearSession();
  redirectToLogin();
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Plain object (JSON-encoded) or a raw BodyInit (FormData, Blob, string). */
  body?: unknown;
  /** Override the base; defaults to the vendor base. */
  base?: string;
  /** Skip the automatic 401 redirect (used by the login/restore calls). */
  skipAuthRedirect?: boolean;
  /** Per-request timeout override (defaults to REQUEST_TIMEOUT_MS). */
  timeoutMs?: number;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    (typeof FormData !== 'undefined' && value instanceof FormData) ||
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams) ||
    (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)
  );
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    body,
    base = API_BASE,
    skipAuthRedirect = false,
    timeoutMs = REQUEST_TIMEOUT_MS,
    headers,
    ...rest
  } = options;

  const token = getToken();
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

  let encodedBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (isBodyInit(body)) {
      encodedBody = body;
    } else {
      encodedBody = JSON.stringify(body);
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
      }
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...rest,
      headers: requestHeaders,
      ...(encodedBody !== undefined ? { body: encodedBody } : {}),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', 0, 'timeout');
    }
    throw new ApiError('Could not reach the server. Check your connection.', 0, 'network');
  } finally {
    clearTimeout(timeout);
  }

  let parsed: unknown = null;
  const text = await response.text().catch(() => '');
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = null;
    }
  }

  if (response.status === 401) {
    if (!skipAuthRedirect) handleUnauthorized();
    throw new ApiError(
      serverMessage(parsed, 'Your session has expired.'),
      401,
      'unauthorized',
      parsed,
    );
  }

  if (!response.ok) {
    const serverCode =
      parsed && typeof parsed === 'object' && typeof (parsed as ServerErrorBody).code === 'string'
        ? (parsed as ServerErrorBody).code
        : null;
    throw new ApiError(
      serverMessage(parsed, `Request failed (${response.status})`),
      response.status,
      'http',
      parsed,
      serverCode,
    );
  }

  return parsed as T;
}
