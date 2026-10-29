import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRushMode } from './useRushMode';

describe('useRushMode', () => {
  beforeEach(() => window.localStorage.clear());

  it('defaults to off with a 20-minute KPT', () => {
    const { result } = renderHook(() => useRushMode());
    expect(result.current.rush).toBe(false);
    expect(result.current.defaultPrepMinutes).toBe(20);
  });

  it('persists to the legacy key and adds 5 minutes', () => {
    const { result } = renderHook(() => useRushMode());
    act(() => result.current.setRushMode(true));
    expect(window.localStorage.getItem('eatswada_vendor_rush_mode')).toBe('1');
    expect(result.current.defaultPrepMinutes).toBe(25);
  });

  it('reads a stored "1" on mount', () => {
    window.localStorage.setItem('eatswada_vendor_rush_mode', '1');
    const { result } = renderHook(() => useRushMode());
    expect(result.current.rush).toBe(true);
    expect(result.current.defaultPrepMinutes).toBe(25);
  });
});
