import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApplicationStatus } from '@/services/api/applications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import type { ApplicationStatus } from '@/types/application';

const APPLICATION_ID_KEY = 'eatswada_vendor_application_id';
const STATUS_TOKEN_KEY = 'eatswada_vendor_application_status_token';

const STATUS_LABEL: Record<string, string> = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  under_review: 'UNDER REVIEW',
  pending: 'PENDING REVIEW',
  needs_changes: 'CHANGES REQUESTED',
  more_information_required: 'MORE INFORMATION REQUIRED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

function tone(status: string): 'success' | 'danger' | 'warning' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
}

/**
 * Application status lookup. Mirrors application-status.html: reads a saved
 * reference id + status token from sessionStorage, then queries
 * GET /vendor-applications/:id/status?statusToken=.
 */
export function ApplicationStatusPage() {
  const [id, setId] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setId(sessionStorage.getItem(APPLICATION_ID_KEY) || '');
    setToken(sessionStorage.getItem(STATUS_TOKEN_KEY) || '');
  }, []);

  async function check() {
    if (!id.trim() || !token.trim()) {
      setError('Application ID and status token are required.');
      setResult(null);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await fetchApplicationStatus(id.trim(), token.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check status.');
    } finally {
      setBusy(false);
    }
  }

  const key = (result?.status || 'pending').toLowerCase();
  const label = STATUS_LABEL[key] || key.replace(/_/g, ' ').toUpperCase();
  const canCorrect =
    key === 'more_information_required' || key === 'needs_changes' || key === 'rejected';

  return (
    <div className="app-column safe-x min-h-dvh px-5 py-8">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-brand">
        Eatswada Partner
      </p>
      <h1 className="mt-1 text-xl font-extrabold text-ink">Application status</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Check your restaurant application without logging in.
      </p>

      <div className="mt-5 rounded-card border border-border bg-card p-5">
        <div className="space-y-1">
          <label htmlFor="app-id" className="text-sm font-semibold text-ink">
            Application ID
          </label>
          <Input
            id="app-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Paste application ID"
          />
        </div>
        <div className="mt-3 space-y-1">
          <label htmlFor="app-token" className="text-sm font-semibold text-ink">
            Status token
          </label>
          <Input
            id="app-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your status token"
          />
        </div>
        <Button variant="brand" className="mt-4 w-full" onClick={() => void check()} disabled={busy}>
          {busy ? 'Checking…' : 'Check status'}
        </Button>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-card border-l-4 border-danger bg-danger-bg p-3 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        {result ? (
          <div
            className={cn(
              'mt-4 rounded-card border border-border border-l-4 p-3 text-sm',
              tone(key) === 'success' && 'border-l-success bg-success-bg',
              tone(key) === 'danger' && 'border-l-danger bg-danger-bg',
              tone(key) === 'warning' && 'border-l-warning bg-warning-bg',
            )}
          >
            <p className="font-bold text-ink">{label}</p>
            {result.restaurantName ? <p className="mt-1 text-ink">{result.restaurantName}</p> : null}
            {result.changeRequest ? (
              <div className="mt-2 rounded-btn border border-border bg-card p-3">
                <p className="font-semibold text-ink">Changes requested by Eatswada:</p>
                <p className="mt-1 text-ink-soft">{result.changeRequest}</p>
              </div>
            ) : null}
            {result.rejectionReason ? (
              <p className="mt-2 text-ink">
                <span className="font-semibold">Reason:</span> {result.rejectionReason}
              </p>
            ) : null}
            {canCorrect ? (
              <p className="mt-2 text-ink-soft">
                If your application is eligible for correction, continue on the{' '}
                <Link to="/apply" className="font-bold text-brand">
                  application form
                </Link>
                . Use the same email and phone number to update the existing application. Do not
                create a second application.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-xs text-ink-soft">
        <Link to="/apply" className="font-bold text-brand">
          Become a vendor
        </Link>
        {' · '}
        <Link to="/login" className="font-bold text-brand">
          Vendor login
        </Link>
      </p>
    </div>
  );
}
