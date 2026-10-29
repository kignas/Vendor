/**
 * Auth endpoint module. Login + session restore.
 *
 * Login:  POST <origin>/api/auth/vendor/login  { email, password }
 *   -> { success, token, user?, restaurant? }
 * Restore: GET <origin>/api/vendor/restaurant with a stored token; success
 *   means the session is still valid.
 *
 * These calls deliberately bypass the automatic 401 redirect
 * (`skipAuthRedirect`), because a failed login / stale token is an expected
 * state on the login screen, not a mid-session expiry.
 */
import { apiFetch, API_BASE, API_ORIGIN } from '@/lib/api';
import type { StoredRestaurant, StoredUser } from '@/lib/auth';

const AUTH_BASE = `${API_ORIGIN}/api/auth`;

export interface LoginResult {
  token: string;
  user?: StoredUser | undefined;
  restaurant?: StoredRestaurant | undefined;
}

interface LoginResponse {
  success?: boolean;
  token?: string;
  message?: string;
  user?: StoredUser;
  restaurant?: StoredRestaurant;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const body = await apiFetch<LoginResponse>('/vendor/login', {
    method: 'POST',
    base: AUTH_BASE,
    body: { email: email.trim(), password },
    skipAuthRedirect: true,
  });
  if (!body || !body.success || !body.token) {
    throw new Error(body?.message || 'Something went wrong. Please try again.');
  }
  return { token: body.token, user: body.user, restaurant: body.restaurant };
}

/** True when a stored token is still accepted by a protected resource. */
export async function verifyStoredSession(): Promise<boolean> {
  try {
    await apiFetch('/restaurant', { base: API_BASE, skipAuthRedirect: true });
    return true;
  } catch {
    return false;
  }
}
