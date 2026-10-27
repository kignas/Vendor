import type { SVGProps } from 'react';

/**
 * Minimal local `cn`-compatible spinner used by skeletons/loading states.
 * Kept dependency-free (no shadcn spinner primitive exists upstream).
 */
export function Spinner({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      {...props}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
