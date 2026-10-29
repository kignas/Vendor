/**
 * Lightweight bottom sheet used for order actions. Mirrors the legacy sheet
 * markup (backdrop button + slide-up panel) and keeps a 44px+ close target.
 */
export function Sheet({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-scrim/60"
      />
      <div className="app-column safe-bottom relative z-10 rounded-t-card bg-card p-5 animate-slide-up">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-xs text-ink-soft">{description}</p> : null}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
