import { useLocation } from 'react-router-dom';

/**
 * Animates the routed page in on navigation. Keyed by pathname so each route
 * change replays a short fade. Deliberately CSS-only (no animation library): it
 * must never delay order actions, and reduced-motion collapses it to an instant
 * swap via the global media rule.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  );
}
