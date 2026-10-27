import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { LogIn } from 'lucide-react';

/**
 * Placeholder login route. The real login form is built in the auth phase; for
 * now this route exists so the 401 redirect (`#/login`) has a destination.
 */
export function LoginPage() {
  return (
    <div className="app-column safe-x flex min-h-dvh flex-col justify-center px-6">
      <h1 className="mb-6 text-center text-xl font-extrabold text-ink">Eatswada Vendor</h1>
      <EmptyState
        title="Sign in is coming in a later phase"
        description="The login form and session restore will be built in the auth phase."
        icon={LogIn}
      />
      <Link
        to="/"
        className="mt-6 text-center text-sm font-semibold text-info underline-offset-2 hover:underline"
      >
        Back to app
      </Link>
    </div>
  );
}
