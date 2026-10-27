// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { caps } from '@/lib/caps';

/**
 * The capability set is a contract with the backend. This test pins the exact
 * keys and values so an accidental edit (adding, removing or flipping a flag)
 * fails CI instead of silently enabling an unsupported request.
 */
const EXPECTED: Record<string, boolean> = {
  prepCountdown: true,
  billBreakdown: true,
  autoRestock: true,
  selfDeliveryOtp: true,
  inventoryQty: true,
  profileEdit: true,
  settlements: true,
  complaints: false,
  menuEdit: false,
  menuDelete: false,
  menuReorder: true,
  serverAlerts: true,
  serverActivity: true,
  serverDashboard: true,
  serverCapacity: true,
  onboardingConfig: true,
  policies: true,
};

describe('caps', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(caps)).toBe(true);
  });

  it('cannot be mutated at runtime', () => {
    expect(() => {
      // @ts-expect-error — proving the freeze, not a supported mutation.
      caps.complaints = true;
    }).toThrow();
    expect(caps.complaints).toBe(false);
  });

  it('exposes exactly the 17 documented flags', () => {
    expect(Object.keys(caps).sort()).toEqual(Object.keys(EXPECTED).sort());
    expect(Object.keys(caps)).toHaveLength(17);
  });

  it('pins every flag to its expected value', () => {
    expect(caps).toEqual(EXPECTED);
  });

  it('keeps the three unsupported features off', () => {
    expect(caps.complaints).toBe(false);
    expect(caps.menuEdit).toBe(false);
    expect(caps.menuDelete).toBe(false);
  });
});
