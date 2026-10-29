import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, UtensilsCrossed } from 'lucide-react';
import { login, verifyStoredSession } from '@/services/api/auth';
import { getToken, setSession } from '@/lib/auth';
import { orderAlarm } from '@/services/notifications/alarm';

/**
 * Login. Mirrors login.html:
 *   - on mount, a stored token is verified against a protected route; a valid
 *     session redirects straight to the dashboard
 *   - otherwise the form posts to /auth/vendor/login and persists the session
 *   - a failed login shows the server message; a network failure shows a
 *     reachability message
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!getToken()) {
        setChecking(false);
        return;
      }
      const ok = await verifyStoredSession();
      if (cancelled) return;
      if (ok) navigate('/', { replace: true });
      else setChecking(false);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return; // single-flight (AGENTS.md rule 7)
    setError(null);
    setBusy(true);
    try {
      const result = await login(email, password);
      setSession(result);
      orderAlarm.unlock();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="app-column safe-x flex min-h-dvh items-center justify-center px-6">
        <p className="text-sm text-ink-soft" role="status">
          Checking your session…
        </p>
      </div>
    );
  }

  return (
    <div className="app-column safe-x flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-card bg-brand text-ivory">
          <UtensilsCrossed className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-ink">Eatswada Restaurant Partner</h1>
        <p className="mt-1 text-sm text-ink-soft">Sign in to manage orders and stock.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-tap w-full rounded-btn border border-border bg-card px-3 text-sm text-ink outline-none focus:border-brand-ink"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-semibold text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-tap w-full rounded-btn border border-border bg-card px-3 text-sm text-ink outline-none focus:border-brand-ink"
          />
        </div>

        {error ? (
          <p className="rounded-btn bg-danger-bg px-3 py-2 text-sm font-medium text-danger-ink" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-btn bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-soft disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-soft">
        New restaurant?{' '}
        <Link to="/apply" className="font-bold text-brand-ink">
          Apply to become a vendor
        </Link>
        {' · '}
        <Link to="/application-status" className="font-bold text-brand-ink">
          Check application
        </Link>
      </p>
    </div>
  );
}
