/**
 * Profile-completion nudge (Phase 3, Step 7). Decides which profile field — if
 * any — is genuinely missing, using ONLY the fields the contract returns.
 *
 * The email check is deliberately strict: the field has to be an actual string
 * that is present but blank (or whitespace). If the field is absent from the
 * response (i.e. the endpoint does not return it) the nudge is NOT shown, so a
 * field we cannot verify is never reported as "missing".
 *
 * See docs/rebuild/OPEN_QUESTIONS.md (Q21) for the profile-email caveat.
 */
export interface ProfileNudgeContent {
  /** Stable id for dismissal bookkeeping. */
  id: string;
  /** Bold first line, e.g. "Missing email address". */
  title: string;
  /** Smaller second line. */
  body: string;
}

/** `GET /vendor/profile` returns these fields (backend select string). */
const EMAIL_FIELD = 'email';

function isBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() === '';
}

/**
 * Return the nudge to show, or null. Only a field that is present-but-empty
 * counts as missing; an absent field means "not returned", which is not the
 * vendor's fault and must not be shown as incomplete.
 */
export function profileNudgeFor(profile: Record<string, unknown> | null | undefined): ProfileNudgeContent | null {
  if (!profile) return null;

  const hasEmail = Object.prototype.hasOwnProperty.call(profile, EMAIL_FIELD);
  if (hasEmail && isBlankString(profile[EMAIL_FIELD])) {
    return {
      id: 'email',
      title: 'Missing email address',
      body: "Don't miss important updates",
    };
  }

  return null;
}
