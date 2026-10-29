/**
 * Vendor application module (public, unauthenticated).
 *   POST <origin>/api/vendor-applications                     submit
 *   GET  <origin>/api/vendor-applications/:id/status?statusToken=  check
 *
 * Bypasses the vendor 401 redirect (no session exists yet).
 */
import { apiFetch, API_ORIGIN } from '@/lib/api';
import type { ApplicationPayload, ApplicationResult, ApplicationStatus } from '@/types/application';

const APPLICATIONS_BASE = `${API_ORIGIN}/api/vendor-applications`;

interface SubmitResponse {
  success?: boolean;
  message?: string;
  data?: ApplicationResult;
}

export async function submitApplication(payload: ApplicationPayload): Promise<ApplicationResult> {
  const res = await apiFetch<SubmitResponse>('', {
    method: 'POST',
    base: APPLICATIONS_BASE,
    body: payload,
    skipAuthRedirect: true,
    timeoutMs: 20_000,
  });
  if (!res?.success) throw new Error(res?.message || 'Could not submit the application.');
  return res.data ?? {};
}

interface StatusResponse {
  success?: boolean;
  message?: string;
  data?: ApplicationStatus;
}

export async function fetchApplicationStatus(
  id: string,
  statusToken: string,
): Promise<ApplicationStatus> {
  const res = await apiFetch<StatusResponse>(
    `/${encodeURIComponent(id)}/status?statusToken=${encodeURIComponent(statusToken)}`,
    { base: APPLICATIONS_BASE, skipAuthRedirect: true },
  );
  if (!res?.success) throw new Error(res?.message || 'Could not check status.');
  return res.data ?? {};
}
