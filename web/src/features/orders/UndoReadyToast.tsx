import { useEffect, useState } from 'react';

/**
 * 15-second undo-ready toast. Mirrors the legacy `showUndoReadyToast`: the
 * countdown ticks once a second, the undo calls PUT /orders/:id/undo-ready, and
 * the toast removes itself when the window closes. Rendered above the bottom
 * nav so it never blocks an order action.
 */
export function UndoReadyToast({
  onUndo,
  onExpire,
}: {
  onUndo: () => void;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(15);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0) onExpire();
  }, [remaining, onExpire]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-card bg-inverse px-4 py-2.5 text-inverse-ink shadow-lg"
      >
        <span className="text-xs font-semibold">Marked ready</span>
        <button
          type="button"
          onClick={onUndo}
          className="rounded-btn bg-white/20 px-2.5 py-1 text-xs font-bold"
        >
          {remaining > 0 ? `Undo Ready (${remaining}s)` : 'Undo Ready'}
        </button>
      </div>
    </div>
  );
}
