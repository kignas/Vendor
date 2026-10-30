/**
 * Crossfades a number whenever it changes (Phase 3, Step 11). The value is
 * keyed so React remounts the span on change, replaying a short fade/scale-in;
 * an unchanged value keeps the same element, so a poll or refetch that returns
 * the same count does NOT re-animate (AGENTS.md: no animation on every refetch).
 *
 * Motion-only: it renders the same text a plain `<span>` would, collapsed to
 * instant under reduced motion by the global media rule.
 */
export function AnimatedCount({ value, className }: { value: number | string; className?: string }) {
  return (
    <span
      key={String(value)}
      className={className}
      // Transform/opacity only; `motion-safe:` keeps reduced-motion users static.
      data-testid="animated-count"
    >
      <span className="inline-block motion-safe:animate-fade-in">{value}</span>
    </span>
  );
}
