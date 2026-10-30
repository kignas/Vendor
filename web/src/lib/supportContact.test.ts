import { afterEach, describe, expect, it, vi } from 'vitest';
import { supportPhone } from './supportContact';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('supportPhone', () => {
  it('is null when no number is configured (the default)', () => {
    vi.stubEnv('VITE_SUPPORT_PHONE', '');
    expect(supportPhone()).toBeNull();
  });

  it('strips formatting so the value is dialable', () => {
    vi.stubEnv('VITE_SUPPORT_PHONE', '+91 98765-43210');
    expect(supportPhone()).toBe('+919876543210');
  });

  it('rejects a placeholder / non-numeric value', () => {
    vi.stubEnv('VITE_SUPPORT_PHONE', 'call-us');
    expect(supportPhone()).toBeNull();
  });
});
