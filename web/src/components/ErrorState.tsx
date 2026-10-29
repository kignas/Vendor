import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ErrorStateProps {
  /** Human-readable message. Defaults to a neutral network message. */
  message?: string | undefined;
  /** Retry handler. When omitted the Retry button is not rendered. */
  onRetry?: (() => void) | undefined;
  /** Disable the Retry button while a retry is in flight. */
  retrying?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Error state with a Retry button — mandatory on every data screen
 * (AGENTS.md rule 5 / definition of done).
 */
export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-border bg-card px-6 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-danger-bg">
        <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      </span>
      <p className="max-w-xs text-sm font-medium text-ink">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className={cn(
            'mt-4 inline-flex min-h-tap items-center gap-2 rounded-btn border border-border bg-card px-4 text-sm font-semibold text-ink transition-colors',
            'hover:bg-border-soft disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <RefreshCw
            className={cn('h-4 w-4', retrying && 'animate-spin motion-reduce:animate-none')}
            aria-hidden="true"
          />
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      ) : null}
    </div>
  );
}
