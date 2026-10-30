import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { profileNudgeFor } from '@/features/restaurant/profileField';
import { NUDGE_BOTTOM, NUDGE_VAR, useMeasuredStackVar } from '@/app/bottomStack';

/** Session-only dismissal. Cleared when the app is closed and reopened. */
const DISMISS_KEY = 'eatswada_vendor_profile_nudge_dismissed';

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* Storage may be unavailable (private mode); the nudge just stays visible. */
  }
}

/**
 * Profile-completion nudge (Phase 3, Step 7). A thin bar fixed above the bottom
 * nav (and below the new-order bar when both show) that prompts the vendor to
 * finish a genuinely missing profile field.
 *
 * The data comes from the existing `useProfile` hook (`GET /vendor/profile`,
 * with a `/restaurant` fallback) — no new request is added. The bar is hidden
 * while that query is loading or errored, and when the field is not part of the
 * contract, so a number or a field is never invented. Dismissal lasts for the
 * session only and is stored under a NEW key; the auth localStorage keys are
 * untouched.
 */
export function ProfileNudge() {
  const profile = useProfile();
  const [dismissed, setDismissed] = useState(readDismissed);

  // Only a successfully loaded profile can tell us a field is missing.
  const content = profile.isSuccess ? profileNudgeFor(profile.data as Record<string, unknown> | null) : null;
  const visible = !dismissed && content !== null;

  // Publish this bar's measured height so the new-order bar and help bubble
  // stack above it. Hook runs before the early return (hooks are unconditional).
  const measureRef = useMeasuredStackVar(NUDGE_VAR, visible);

  if (!visible || !content) return null;

  function dismiss() {
    writeDismissed();
    setDismissed(true);
  }

  return (
    <div
      ref={measureRef}
      role="status"
      aria-label={content.title}
      className="fixed inset-x-0 z-20 border-t border-border bg-info-bg"
      style={{ bottom: NUDGE_BOTTOM }}
    >
      <div className="app-column safe-x flex min-h-tap items-center gap-2 py-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-ink">{content.title}</p>
          <p className="truncate text-[11px] text-ink-soft">{content.body}</p>
        </div>
        <Link
          to="/profile"
          className="press shrink-0 rounded-btn bg-info px-3 py-2 text-xs font-extrabold uppercase text-white"
        >
          Add now
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss profile reminder"
          className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-ink-soft hover:bg-card"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
