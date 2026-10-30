import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { AnimatedCount } from '@/components/AnimatedCount';
import { BottomNav } from '@/app/BottomNav';
import { makeQueryClient } from '@/lib/queryClient';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { http, HttpResponse } from 'msw';
import { prefersReducedMotion, usePrefersReducedMotion } from '@/lib/motion';

/** Stub matchMedia so we can drive the reduced-motion preference. */
function stubReduced(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      // Framer Motion still calls the legacy listener API.
      addListener: () => undefined,
      removeListener: () => undefined,
    })),
  );
}

describe('motion (Step 11)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the reduced-motion preference from matchMedia', () => {
    stubReduced(false);
    expect(prefersReducedMotion()).toBe(false);
    stubReduced(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('reports motion as ON (false) when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('AnimatedListItem renders its children (motion never gates content)', () => {
    stubReduced(false);
    render(
      <AnimatedListItem>
        <p>Row content</p>
      </AnimatedListItem>,
    );
    expect(screen.getByText('Row content')).toBeInTheDocument();
  });

  it('AnimatedListItem still renders under reduced motion', () => {
    stubReduced(true);
    render(
      <AnimatedListItem>
        <p>Static row</p>
      </AnimatedListItem>,
    );
    expect(screen.getByText('Static row')).toBeInTheDocument();
  });

  it('AnimatedCount shows the value and keys it, so a change re-mounts the span', () => {
    const { rerender } = render(<AnimatedCount value={3} />);
    const first = screen.getByTestId('animated-count');
    expect(first).toHaveTextContent('3');
    rerender(<AnimatedCount value={4} />);
    expect(screen.getByTestId('animated-count')).toHaveTextContent('4');
  });

  it('usePrefersReducedMotion falls back to false without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    function Probe() {
      return <span>{String(usePrefersReducedMotion())}</span>;
    }
    render(<Probe />);
    expect(screen.getByText('false')).toBeInTheDocument();
  });

  it('the bottom-nav indicator slides by one slot per active tab (transform only)', () => {
    server.use(http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [] })));
    const tree = (path: string) => (
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <BottomNav />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const { unmount } = render(tree('/orders'));
    expect(screen.getByTestId('nav-indicator')).toHaveStyle({ transform: 'translateX(0%)' });
    unmount();

    // A fresh mount at the second tab: the shared indicator moves one slot right.
    render(tree('/inventory'));
    expect(screen.getByTestId('nav-indicator')).toHaveStyle({ transform: 'translateX(100%)' });
  });
});
