import { cn } from '@/lib/cn';

export interface GradientBarChartProps {
  /** Bars in order; each needs a value and an accessible label. */
  data: { label: string; value: number }[];
  /** Accessible description of the whole chart. */
  ariaLabel: string;
  height?: number;
  className?: string;
}

/**
 * Lightweight inline-SVG bar chart used for the highlighted "orders this week"
 * card. No chart library — bars are simple rects in a fixed viewBox scaled to
 * the container. The tallest bar is the brand accent; the rest are a muted
 * tint, matching the reference layout while keeping our dark palette.
 */
export function GradientBarChart({ data, ariaLabel, height = 120, className }: GradientBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const count = Math.max(1, data.length);
  const gap = 6;
  const barWidth = 100 / count;
  const width = 100;

  return (
    <div className={cn('w-full', className)}>
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
      >
        <defs>
          <linearGradient id="barAccent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--es-brand-ink))" stopOpacity={1} />
            <stop offset="100%" stopColor="rgb(var(--es-brand-ink))" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 6);
          const x = i * barWidth + gap / 2;
          const w = Math.max(1, barWidth - gap);
          const isMax = d.value === max && max > 0;
          return (
            <rect
              key={d.label + i}
              role="presentation"
              x={x}
              y={height - h}
              width={w}
              height={Math.max(d.value > 0 ? 2 : 0, h)}
              rx={2}
              fill={isMax ? 'url(#barAccent)' : 'rgb(var(--es-brand-ink) / 0.28)'}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink-faint" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.label + i} className="flex-1 text-center">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
