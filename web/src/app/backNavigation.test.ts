import { beforeEach, describe, expect, it } from 'vitest';
import { decideBack } from './backNavigation';
import { closeTopOverlay, overlayCount, pushOverlay, resetOverlays } from './overlayStack';

describe('decideBack', () => {
  it('closes an overlay before anything else', () => {
    expect(decideBack({ overlayClosed: true, hasHistory: true, exitArmed: false })).toBe('overlay');
    expect(decideBack({ overlayClosed: true, hasHistory: false, exitArmed: false })).toBe('overlay');
  });

  it('walks back through history when no overlay is open', () => {
    expect(decideBack({ overlayClosed: false, hasHistory: true, exitArmed: false })).toBe('history');
  });

  it('arms exit on the first root press and exits on the second', () => {
    expect(decideBack({ overlayClosed: false, hasHistory: false, exitArmed: false })).toBe(
      'confirm-exit',
    );
    expect(decideBack({ overlayClosed: false, hasHistory: false, exitArmed: true })).toBe('exit');
  });
});

describe('overlayStack', () => {
  beforeEach(() => {
    resetOverlays();
  });

  it('closes the most recently pushed overlay first (LIFO)', () => {
    const order: string[] = [];
    pushOverlay(() => order.push('first'));
    pushOverlay(() => order.push('second'));

    expect(overlayCount()).toBe(2);
    expect(closeTopOverlay()).toBe(true);
    expect(order).toEqual(['second']);
    // Simulate the closed sheet unregistering itself.
    resetOverlays();
    expect(closeTopOverlay()).toBe(false);
  });

  it('returns false when nothing is open', () => {
    expect(closeTopOverlay()).toBe(false);
  });

  it('unregisters on cleanup so a closed sheet is not re-closed', () => {
    const unregister = pushOverlay(() => undefined);
    expect(overlayCount()).toBe(1);
    unregister();
    expect(overlayCount()).toBe(0);
    expect(closeTopOverlay()).toBe(false);
  });
});
