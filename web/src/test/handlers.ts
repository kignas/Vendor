import { http, HttpResponse } from 'msw';
import { API_BASE } from '@/lib/api';

/**
 * Default MSW handlers. Only routes the contract documents are mocked; a test
 * that needs a different response calls `server.use(...)` locally.
 */
export const handlers = [
  // Happy-path restaurant profile.
  http.get(`${API_BASE}/restaurant`, () =>
    HttpResponse.json({ success: true, restaurant: { _id: 'r1', name: 'Test Kitchen' } }),
  ),

  // Any unknown vendor route 404s rather than silently returning an empty body.
  http.all(`${API_BASE}/*`, () =>
    HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 }),
  ),
];
