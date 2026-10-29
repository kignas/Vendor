import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SuccessFlashProps {
  /** Change this to replay the flash (e.g. a message string or a counter). */
  trigger: string | number | null;
  /** Headline shown under the tick. */
  message: string;
  /** Optional second line. */
  detail?: string | null;
  /** Auto-dismiss delay in ms. */
  durationMs?: number;
  onDone?: () => void;
}

/**
 * Brief, polished confirmation flash shown ONLY after the server has confirmed
 * an order action. It is a purely additive overlay: it renders after the
 * mutation resolves, never blocks or delays the request, and auto-dismisses.
 *
 * Motion is a short scale/fade that the global `prefers-reduced-motion` rule
 * collapses to an instant state, so it is safe for reduced-motion users and on
 * low-end devices. Haptics/audio are owned by the caller (orderAlarm.tap()).
 */
export function SuccessFlash({
  trigger,
  message,
  detail,
  durationMs = 1400,
  onDone,
}: SuccessFlashProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === null) return;
    setVisible(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => window.clearTimeout(t);
    // `trigger` identity change is the replay signal; `onDone` is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, durationMs]);

  if (!visible || trigger === null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'flex max-w-xs flex-col items-center gap-2 rounded-card bg-inverse/95 px-6 py-5 text-center text-inverse-ink shadow-2xl',
          'motion-safe:animate-pop-in',
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-success">
          <Check className="h-7 w-7 text-white" aria-hidden="true" strokeWidth={3} />
        </span>
        <p className="text-sm font-extrabold">{message}</p>
        {detail ? <p className="text-xs opacity-80">{detail}</p> : null}
      </div>
    </div>
  );
}
