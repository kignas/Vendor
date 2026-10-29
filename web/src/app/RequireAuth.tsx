import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated } from '@/lib/auth';

/**
 * Route guard. Any authenticated route is wrapped by this; a missing token
 * redirects to /login (preserving the attempted path so we can return later).
 * The api client also forces this on any 401.
 */
export function RequireAuth() {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
