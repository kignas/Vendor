/**
 * Auth storage. The three localStorage keys are fixed by AGENTS.md rule 6 and
 * must not change: existing logged-in vendors must stay logged in after cutover.
 */
export const TOKEN_KEY = 'nearbite_vendor_token' as const;
export const USER_KEY = 'nearbite_vendor_user' as const;
export const RESTAURANT_KEY = 'nearbite_vendor_restaurant' as const;

export interface StoredUser {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface StoredRestaurant {
  _id?: string;
  name?: string;
  [key: string]: unknown;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Storage may be unavailable (private mode, quota); the app stays usable. */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readJson<T>(key: string): T | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return safeGet(TOKEN_KEY);
}

export function setToken(token: string): void {
  safeSet(TOKEN_KEY, token);
}

export function getUser(): StoredUser | null {
  return readJson<StoredUser>(USER_KEY);
}

export function setUser(user: StoredUser): void {
  safeSet(USER_KEY, JSON.stringify(user));
}

export function getRestaurant(): StoredRestaurant | null {
  return readJson<StoredRestaurant>(RESTAURANT_KEY);
}

export function setRestaurant(restaurant: StoredRestaurant): void {
  safeSet(RESTAURANT_KEY, JSON.stringify(restaurant));
}

export interface Session {
  token: string;
  user?: StoredUser | undefined;
  restaurant?: StoredRestaurant | undefined;
}

/** Persist a login response. Only the three fixed keys are ever written. */
export function setSession(session: Session): void {
  setToken(session.token);
  if (session.user) setUser(session.user);
  if (session.restaurant) setRestaurant(session.restaurant);
}

/** Clear the whole session. Used by logout and by every HTTP 401. */
export function clearSession(): void {
  safeRemove(TOKEN_KEY);
  safeRemove(USER_KEY);
  safeRemove(RESTAURANT_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
