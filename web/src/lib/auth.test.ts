// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  RESTAURANT_KEY,
  TOKEN_KEY,
  USER_KEY,
  clearSession,
  getRestaurant,
  getToken,
  getUser,
  isAuthenticated,
  setSession,
} from '@/lib/auth';

describe('auth storage', () => {
  it('uses the exact fixed localStorage keys', () => {
    expect(TOKEN_KEY).toBe('nearbite_vendor_token');
    expect(USER_KEY).toBe('nearbite_vendor_user');
    expect(RESTAURANT_KEY).toBe('nearbite_vendor_restaurant');
  });

  it('setSession writes only the three keys', () => {
    setSession({ token: 't1', user: { name: 'A' }, restaurant: { name: 'B' } });
    expect(window.localStorage.getItem('nearbite_vendor_token')).toBe('t1');
    expect(getUser()).toEqual({ name: 'A' });
    expect(getRestaurant()).toEqual({ name: 'B' });
    expect(window.localStorage.length).toBe(3);
  });

  it('clearSession removes the whole session', () => {
    setSession({ token: 't1', user: { name: 'A' }, restaurant: { name: 'B' } });
    clearSession();
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
    expect(getRestaurant()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated reflects the token', () => {
    setSession({ token: 't1' });
    expect(isAuthenticated()).toBe(true);
  });

  it('tolerates corrupt JSON in the user/restaurant keys', () => {
    window.localStorage.setItem('nearbite_vendor_user', '{not json');
    expect(getUser()).toBeNull();
  });
});
