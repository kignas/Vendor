import { sparklinePath } from '@/features/insights/analyticsDomain';

export interface SparklineProps {
  values: number[];
  /** Accessible description of the trend. */
  ariaLabel: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Tiny inline-SVG sparkline for a table row. Geometry is the pure, unit-tested
 * `sparklinePath`; fewer than two points renders nothing rather than a dot.
 */
export function Sparkline({ values, ariaLabel, width = 64, height = 20, className }: SparklineProps) {
  const path = sparklinePath(values, width - 2, height - 4);
  if (!path) return null;
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <path
        d={path}
        transform="translate(1 2)"
        fill="none"
        stroke="rgb(var(--es-brand-ink))"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
