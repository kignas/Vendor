import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Small info-icon tooltip. Used to explain a metric with the backend's exact
 * definition (the wording comes from the page, never invented here). Opens on
 * click/tap so it is reachable by keyboard and touch, and closes on a second
 * tap. The panel is a `role="tooltip"` so screen readers announce the text.
 */
export function InfoTip({
  label,
  text,
  className,
}: {
  /** What the tip explains, e.g. "Conversion rate". */
  label: string;
  /** The explanation, rendered verbatim. */
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded-pill text-ink-faint transition-colors hover:bg-border-soft hover:text-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute right-0 top-7 z-20 w-56 rounded-btn border border-border bg-card px-3 py-2 text-[11px] font-medium leading-snug text-ink shadow-md"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
