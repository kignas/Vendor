import { useId } from 'react';

/**
 * Storefront illustration (Phase 3, Step 8). Original inline SVG — our own
 * artwork, not a copy of any other app's — of a small shop front: a striped
 * awning, a glazed door with a sign, and a pair of plants.
 *
 * Every colour is a theme token, so the same markup reads correctly in light
 * and dark mode. There are no external files or images, the whole thing is
 * `aria-hidden` (it is decorative and always paired with real copy), and the
 * `variant` changes the mood:
 *   - `open`    — green sign, sign reads "OPEN".
 *   - `busy`    — amber sign, sign reads "BUSY" (the outlet still takes orders).
 *   - `paused`  — amber sign, sign reads "PAUSED".
 *   - `closed`  — muted greys, sign reads "CLOSED".
 *   - `neutral` — the default, brand-toned, no state claim (used while the
 *                 availability status is still loading or unknown).
 *
 * The sign text is presentational only: the SVG is `aria-hidden`, and consumers
 * must never rely on it as the accessible name for a state.
 */
export type StorefrontVariant = 'open' | 'busy' | 'closed' | 'paused' | 'neutral';

const SIGN_TEXT: Record<StorefrontVariant, string> = {
  open: 'OPEN',
  busy: 'BUSY',
  paused: 'PAUSED',
  closed: 'CLOSED',
  neutral: 'EATSWADA',
};

export interface StorefrontIllustrationProps {
  variant?: StorefrontVariant;
  /** Rendered size in px (square). Defaults to 132. */
  size?: number;
  className?: string;
}

export function StorefrontIllustration({
  variant = 'neutral',
  size = 132,
  className,
}: StorefrontIllustrationProps) {
  // Unique per instance so several illustrations on one page never share a
  // clip-path id (duplicate ids are invalid and can mis-clip in some browsers).
  const clipId = useId();

  // Accent + sign colours per variant, all from theme tokens.
  const accent =
    variant === 'open'
      ? 'rgb(var(--es-success))'
      : variant === 'busy' || variant === 'paused'
        ? 'rgb(var(--es-warning))'
        : variant === 'closed'
          ? 'rgb(var(--es-ink-faint))'
          : 'rgb(var(--es-brand-ink))';

  const signBg =
    variant === 'open'
      ? 'rgb(var(--es-success-bg))'
      : variant === 'busy' || variant === 'paused'
        ? 'rgb(var(--es-warning-bg))'
        : variant === 'closed'
          ? 'rgb(var(--es-border-soft))'
          : 'rgb(var(--es-info-bg))';

  const signInk =
    variant === 'open'
      ? 'rgb(var(--es-success-ink))'
      : variant === 'busy' || variant === 'paused'
        ? 'rgb(var(--es-warning-ink))'
        : variant === 'closed'
          ? 'rgb(var(--es-ink-soft))'
          : 'rgb(var(--es-info-ink))';

  const surface = 'rgb(var(--es-card))';
  const line = 'rgb(var(--es-border))';
  const soft = 'rgb(var(--es-border-soft))';

  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground shadow */}
      <ellipse cx="80" cy="139" rx="52" ry="6" fill={soft} />

      {/* Body of the shop */}
      <rect x="30" y="66" width="100" height="72" rx="6" fill={surface} stroke={line} strokeWidth="2" />

      {/* Awning: a scalloped canopy with alternating stripes */}
      <path
        d="M24 66h112l-8-20a6 6 0 0 0-5.7-4.2H37.7A6 6 0 0 0 32 46z"
        fill={surface}
        stroke={line}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${clipId})`}>
        {[0, 2, 4, 6].map((i) => (
          <rect key={i} x={32 + i * 12} y={42} width={12} height={24} fill={accent} opacity="0.85" />
        ))}
      </g>
      <clipPath id={clipId}>
        <path d="M32 46a6 6 0 0 1 5.7-4.2h84.6A6 6 0 0 1 128 46l6 20H26z" />
      </clipPath>
      {/* Scalloped edge of the awning */}
      <path
        d="M26 66a7 7 0 0 0 14 0 7 7 0 0 0 14 0 7 7 0 0 0 14 0 7 7 0 0 0 14 0 7 7 0 0 0 14 0 7 7 0 0 0 14 0 7 7 0 0 0 14 0"
        fill={surface}
        stroke={line}
        strokeWidth="2"
      />

      {/* Door with glass panes */}
      <rect x="62" y="90" width="40" height="48" rx="4" fill={surface} stroke={line} strokeWidth="2" />
      <rect x="68" y="96" width="12" height="16" rx="2" fill={soft} stroke={line} strokeWidth="1.5" />
      <rect x="84" y="96" width="12" height="16" rx="2" fill={soft} stroke={line} strokeWidth="1.5" />
      <rect x="68" y="118" width="12" height="14" rx="2" fill={soft} stroke={line} strokeWidth="1.5" />
      <rect x="84" y="118" width="12" height="14" rx="2" fill={soft} stroke={line} strokeWidth="1.5" />
      <circle cx="96" cy="112" r="2.4" fill={accent} />

      {/* Side window */}
      <rect x="38" y="92" width="18" height="22" rx="3" fill={soft} stroke={line} strokeWidth="2" />
      <line x1="47" y1="92" x2="47" y2="114" stroke={line} strokeWidth="1.5" />

      {/* Hanging sign over the door */}
      <line x1="82" y1="80" x2="82" y2="84" stroke={line} strokeWidth="2" />
      <rect x="62" y="78" width="40" height="16" rx="5" fill={signBg} stroke={signInk} strokeWidth="1.5" />
      <text
        x="82"
        y="89.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        letterSpacing="0.4"
        fill={signInk}
        fontFamily="Manrope, system-ui, sans-serif"
      >
        {SIGN_TEXT[variant]}
      </text>

      {/* Plants in pots, one each side */}
      <g>
        <path d="M44 138h14l-2-12H46z" fill={accent} opacity="0.9" />
        <path d="M51 126c-6 0-9-4-9-9 5 0 9 3 9 9z" fill={accent} />
        <path d="M51 126c0-6 3-10 9-11 0 6-3 10-9 11z" fill={accent} opacity="0.75" />
      </g>
      <g>
        <path d="M102 138h14l-2-12h-10z" fill={accent} opacity="0.9" />
        <path d="M109 126c-6 0-9-4-9-9 5 0 9 3 9 9z" fill={accent} opacity="0.75" />
        <path d="M109 126c0-6 3-10 9-11 0 6-3 10-9 11z" fill={accent} />
      </g>
    </svg>
  );
}
