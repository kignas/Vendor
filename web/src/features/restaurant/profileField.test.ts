import { describe, expect, it } from 'vitest';
import { profileNudgeFor } from './profileField';

describe('profileNudgeFor', () => {
  it('nudges when email is present but blank', () => {
    const nudge = profileNudgeFor({ name: 'Test Kitchen', email: '' });
    expect(nudge).not.toBeNull();
    expect(nudge?.title).toBe('Missing email address');
    expect(nudge?.body).toBe("Don't miss important updates");
  });

  it('treats a whitespace-only email as missing', () => {
    expect(profileNudgeFor({ email: '   ' })).not.toBeNull();
  });

  it('does not nudge when email is filled in', () => {
    expect(profileNudgeFor({ email: 'kitchen@example.com' })).toBeNull();
  });

  it('does not nudge when the field is not returned by the endpoint', () => {
    // The field being absent means "not part of the response", not "missing".
    expect(profileNudgeFor({ name: 'Test Kitchen', phone: '9999999999' })).toBeNull();
  });

  it('returns nothing for a null / undefined profile', () => {
    expect(profileNudgeFor(null)).toBeNull();
    expect(profileNudgeFor(undefined)).toBeNull();
  });
});
