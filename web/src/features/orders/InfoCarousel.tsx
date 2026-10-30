import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { caps } from '@/lib/caps';
import { useNow } from '@/hooks/useNow';
import { useAlerts } from '@/hooks/useHome';
import { useSettlementSummary } from '@/hooks/useEarnings';
import { useProfile } from '@/hooks/useProfile';
import {
  buildInfoCards,
  dismissCard,
  readDismissedCards,
  visibleInfoCards,
  type InfoCard,
  type InfoCardTone,
} from '@/features/orders/infoCards';

/** Left accent band + X tint per card tone (colour is reserved for attention). */
const TONE: Record<InfoCardTone, { band: string; close: string }> = {
  warning: { band: 'bg-warning', close: 'text-warning-ink' },
  info: { band: 'bg-info', close: 'text-info-ink' },
  brand: { band: 'bg-brand', close: 'text-brand-ink' },
};

/**
 * Info-card carousel (Phase 3, Step 6). Sits above the order list and shows only
 * cards built from real server data (alerts, settlement summary, profile). Each
 * card is horizontally scroll-snapped with a dots indicator and an X that
 * dismisses it for the day. The whole carousel is hidden when there are no
 * cards, so no empty gap or empty dots row is left behind.
 *
 * Every source query is `caps`-gated: a disabled capability (or a failed call)
 * simply contributes no card and never breaks the Orders page.
 */
export function InfoCarousel() {
  const navigate = useNavigate();
  const alerts = useAlerts();
  const settlement = useSettlementSummary();
  const profile = useProfile();

  const [dismissed, setDismissed] = useState(() => readDismissedCards());
  // Re-evaluate "dismissed today" if the page is left open across midnight.
  const now = useNow(60_000);

  const cards = useMemo(
    () =>
      buildInfoCards({
        alerts: caps.serverAlerts ? alerts.data : undefined,
        settlement: caps.settlements ? settlement.data : undefined,
        profile: profile.data,
      }),
    [alerts.data, settlement.data, profile.data],
  );

  const visible = useMemo(() => visibleInfoCards(cards, dismissed, now), [cards, dismissed, now]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setActive((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    if (active > visible.length - 1) setActive(Math.max(0, visible.length - 1));
  }, [visible.length, active]);

  if (!visible.length) return null;

  function dismiss(id: string) {
    setDismissed(dismissCard(id));
  }

  return (
    <section aria-label="Updates">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* A dismissed card fades and slides out, then the rest slide into place
              (`layout`). Stable keys mean a re-render of the same cards never
              replays the motion. */}
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((card) => (
              <motion.div
                key={card.id}
                layout
                className="w-full shrink-0 snap-center"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: DURATION.base, ease: EASE_OUT }}
              >
                <InfoCardItem card={card} onDismiss={() => dismiss(card.id)} onOpen={navigate} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      {visible.length > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
          {visible.map((card, i) => (
            <span
              key={card.id}
              data-testid="carousel-dot"
              data-active={i === active}
              className={cn(
                // The active dot stretches into a pill via a transform (scaleX),
                // never a width change; colour cross-fades via the token.
                'h-1.5 w-1.5 rounded-full motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-out',
                i === active ? 'bg-ink-soft scale-x-[2.6]' : 'bg-border scale-x-100',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** Exported for the dev-only design gallery (Step 10); the carousel is the only caller in the app. */
export function InfoCardItem({
  card,
  onDismiss,
  onOpen,
}: {
  card: InfoCard;
  onDismiss: () => void;
  onOpen: (to: string) => void;
}) {
  const tone = TONE[card.tone];
  return (
    <article
      data-card-id={card.id}
      className="relative overflow-hidden rounded-card border border-border bg-card px-4 py-3.5"
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', tone.band)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 pl-1.5">
        <h2 className="min-w-0 text-sm font-extrabold text-ink">{card.title}</h2>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss: ${card.title}`}
          className={cn(
            '-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-btn hover:bg-canvas',
            tone.close,
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-0.5 pl-1.5 text-[13px] text-ink-soft">{card.body}</p>
      <button
        type="button"
        onClick={() => onOpen(card.to)}
        className="ml-1.5 mt-3 min-h-tap rounded-btn border border-border bg-card px-4 text-sm font-bold text-ink hover:bg-canvas"
      >
        {card.actionLabel}
      </button>
    </article>
  );
}
