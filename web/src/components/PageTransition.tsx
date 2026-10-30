import { useLocation } from 'react-router-dom';

/**
 * Animates the routed page in on navigation. Keyed by pathname so each route
 * change replays a short fade + 8px rise. Deliberately CSS-only (no animation
 * library): it must never delay order actions, and reduced-motion skips it
 * entirely via `motion-safe:` (the page just appears).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="motion-safe:animate-slide-up">
      {children}
    </div>
  );
}
