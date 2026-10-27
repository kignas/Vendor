// @vitest-environment node

import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { API_BASE, ApiError, apiFetch } from '@/lib/api';
import { clearSession, getToken, setSession } from '@/lib/auth';
import { server } from '@/test/server';

describe('apiFetch', () => {
  beforeEach(() => {
    clearSession();
    window.location.hash = '';
  });

  it('sends the bearer token from nearbite_vendor_token', async () => {
    let seenAuth: string | null = null;
    server.use(
      http.get(`${API_BASE}/restaurant`, ({ request }) => {
        seenAuth = request.headers.get('Authorization');
        return HttpResponse.json({ success: true });
      }),
    );

    setSession({ token: 'tok-123' });
    const data = await apiFetch<{ success: boolean }>('/restaurant');

    expect(seenAuth).toBe('Bearer tok-123');
    expect(data).toEqual({ success: true });
  });

  it('prefixes the vendor base and parses JSON', async () => {
    let seenUrl = '';
    server.use(
      http.get(`${API_BASE}/orders`, ({ request }) => {
        seenUrl = new URL(request.url).pathname;
        return HttpResponse.json({ orders: [] });
      }),
    );

    await apiFetch('/orders?view=queue');
    expect(seenUrl).toBe('/api/vendor/orders');
  });

  it('JSON-encodes an object body and sets Content-Type', async () => {
    let contentType: string | null = null;
    let body: unknown = null;
    server.use(
      http.put(`${API_BASE}/orders/o1/accept`, async ({ request }) => {
        contentType = request.headers.get('Content-Type');
        body = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    await apiFetch('/orders/o1/accept', { method: 'PUT', body: { prepMinutes: 20 } });
    expect(contentType).toContain('application/json');
    expect(body).toEqual({ prepMinutes: 20 });
  });

  it('on 401 clears the session and redirects to #/login', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ message: 'Token expired' }, { status: 401 }),
      ),
    );
    setSession({ token: 'stale', user: { name: 'A' }, restaurant: { name: 'B' } });

    await expect(apiFetch('/restaurant')).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBeNull();
    expect(window.localStorage.getItem('nearbite_vendor_user')).toBeNull();
    expect(window.localStorage.getItem('nearbite_vendor_restaurant')).toBeNull();
    expect(window.location.hash).toBe('#/login');
  });

  it('surfaces status and code on an unauthorized error', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ message: 'Token expired' }, { status: 401 }),
      ),
    );
    setSession({ token: 'stale' });

    const err = await apiFetch('/restaurant').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const apiErr = err as ApiError;
    expect(apiErr.status).toBe(401);
    expect(apiErr.code).toBe('unauthorized');
  });

  it('does not redirect when skipAuthRedirect is set', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({}, { status: 401 })),
    );
    setSession({ token: 'stale' });

    await expect(
      apiFetch('/restaurant', { skipAuthRedirect: true }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(window.location.hash).toBe('');
  });

  it('throws a typed http error with the server message and code', async () => {
    server.use(
      http.put(`${API_BASE}/orders/o1/extend-prep`, () =>
        HttpResponse.json(
          { message: 'Prep extension already used', code: 'PREP_EXTENSION_ALREADY_USED' },
          { status: 409 },
        ),
      ),
    );

    const err = (await apiFetch('/orders/o1/extend-prep', { method: 'PUT' }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('http');
    expect(err.serverCode).toBe('PREP_EXTENSION_ALREADY_USED');
    expect(err.message).toBe('Prep extension already used');
  });

  it('maps a network failure to a network ApiError', async () => {
    server.use(http.get(`${API_BASE}/restaurant`, () => HttpResponse.error()));
    const err = (await apiFetch('/restaurant').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('network');
    expect(err.status).toBe(0);
  });

  it('maps an aborted request to a timeout ApiError', async () => {
    vi.useFakeTimers();
    server.use(
      http.get(`${API_BASE}/restaurant`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        return HttpResponse.json({});
      }),
    );

    const promise = apiFetch('/restaurant');
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(16_000);
    await assertion;
    vi.useRealTimers();
  });
});
