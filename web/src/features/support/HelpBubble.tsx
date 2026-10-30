import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, HelpCircle, LifeBuoy, Phone } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useOverlayOpen } from '@/hooks/useOverlayOpen';
import { supportPhone } from '@/lib/supportContact';
import { BUBBLE_BOTTOM } from '@/app/bottomStack';

/**
 * Floating help bubble (Phase 3, Step 7). A 48px green circle on the right edge
 * that opens a small sheet with Support tickets, an optional Call support, and
 * Notifications.
 *
 * It sits above the bottom nav, the profile nudge and the new-order bar (their
 * heights are published as CSS variables), and it hides itself entirely while
 * any sheet/dialog is open so it can never cover an Accept / Order ready button.
 * "Call support" is shown ONLY when a real number is configured; there is no
 * support-contact endpoint in the contract, so no number is ever invented.
 */
export function HelpBubble() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const overlayOpen = useOverlayOpen();
  const phone = supportPhone();

  // Hide while some OTHER overlay is open. Excluding our own sheet avoids a
  // feedback loop (hiding unmounts our sheet, which would re-show the bubble).
  const hidden = overlayOpen && !open;
  if (hidden) return null;

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Help and support"
        aria-haspopup="dialog"
        className="press fixed right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-success text-white shadow-[0_6px_16px_rgba(0,0,0,0.24)]"
        style={{ bottom: BUBBLE_BOTTOM }}
      >
        <HelpCircle className="h-6 w-6" aria-hidden="true" />
      </button>

      {open ? (
        <Sheet onClose={() => setOpen(false)} title="Need help?" description="We're here for you.">
          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => go('/support')}
                className="press flex min-h-tap w-full items-center gap-3 rounded-btn border border-border bg-card px-3 text-left text-sm font-semibold text-ink"
              >
                <LifeBuoy className="h-4 w-4 text-brand-ink" aria-hidden="true" />
                Support tickets
              </button>
            </li>
            {phone ? (
              <li>
                <a
                  href={`tel:${phone}`}
                  className="press flex min-h-tap w-full items-center gap-3 rounded-btn border border-border bg-card px-3 text-left text-sm font-semibold text-ink"
                >
                  <Phone className="h-4 w-4 text-brand-ink" aria-hidden="true" />
                  Call support
                </a>
              </li>
            ) : null}
            <li>
              <button
                type="button"
                onClick={() => go('/notifications')}
                className="press flex min-h-tap w-full items-center gap-3 rounded-btn border border-border bg-card px-3 text-left text-sm font-semibold text-ink"
              >
                <Bell className="h-4 w-4 text-brand-ink" aria-hidden="true" />
                Notifications
              </button>
            </li>
          </ul>
        </Sheet>
      ) : null}
    </>
  );
}
