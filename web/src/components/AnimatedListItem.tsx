import { motion } from 'framer-motion';
import { DURATION, EASE_OUT, usePrefersReducedMotion } from '@/lib/motion';

/**
 * One animated row in a list (Phase 3, Step 11). New rows fade and slide in;
 * a row that leaves (e.g. an order moved from Preparing to Ready) fades and
 * slides out before the rest close the gap (`layout`). Motion is transform +
 * opacity only, and stable `key`s on the parent mean a refetch of the SAME
 * orders never replays the entrance.
 *
 * Under reduced motion the movement is dropped and only a very short opacity
 * change remains. A row is always tappable while it animates: nothing here
 * blocks pointer events.
 */
export function AnimatedListItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      layout={!reduced}
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
