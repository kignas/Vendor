import { cva } from 'class-variance-authority';

/**
 * Status-pill tone variants. Kept in a non-component module so the component
 * file only exports components (react-refresh requirement).
 */
export const statusPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold leading-none',
  {
    variants: {
      tone: {
        neutral: 'bg-border-soft text-ink-soft',
        success: 'bg-success-bg text-success-ink',
        warning: 'bg-warning-bg text-warning-ink',
        danger: 'bg-danger-bg text-danger-ink',
        info: 'bg-info-bg text-info-ink',
        brand: 'bg-brand/10 text-brand-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);
