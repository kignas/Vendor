import { donutSegments } from '@/features/insights/analyticsDomain';
import { cn } from '@/lib/cn';

export interface DonutDatum {
  key: string;
  label: string;
  /** Count value (preferred field name). */
  value: number;
  /** Optional formatted amount shown next to the count. */
  display?: string;
}

export interface DonutChartProps {
  title: string;
  data: DonutDatum[];
  /** Unit word for the legend counts (e.g. "orders"). */
  unit?: string;
  className?: string;
}

/**
 * Inline-SVG donut with a legend and numbers. Segments come from
 * `donutSegments` (pure, unit-tested) so the geometry is verifiable without a
 * DOM. Empty data renders an honest empty message, never a hollow ring.
 */
export function DonutChart({ title, data, unit = 'orders', className }: DonutChartProps) {
  const rows = data.filter((d) => d.value > 0);
  const segments = donutSegments(rows.map((r) => ({ key: r.key, label: r.label, value: r.value })));
  const radius = 40;
  const size = 110;
  const center = size / 2;

  return (
    <section className={cn('rounded-card border border-border bg-card p-4', className)}>
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-ink-soft" role="status">
          No data for this period.
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <svg
            role="img"
            aria-label={`${title}: ${rows.map((r) => `${r.label} ${r.value}`).join(', ')}`}
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="shrink-0"
          >
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgb(var(--es-border-soft))"
              strokeWidth={14}
            />
            <g transform={`rotate(-90 ${center} ${center})`}>
              {segments.map((seg) => (
                <circle
                  key={seg.key}
                  role="presentation"
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={`rgb(var(${seg.colorVar}))`}
                  strokeWidth={14}
                  strokeDasharray={`${seg.dash} ${2 * Math.PI * radius - seg.dash}`}
                  strokeDashoffset={-seg.offset}
                />
              ))}
            </g>
          </svg>
          <ul className="min-w-0 flex-1 space-y-2">
            {rows.map((row, i) => (
              <li key={row.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-pill"
                    style={{
                      background: `rgb(var(${['--es-brand-ink', '--es-info-ink', '--es-success-ink', '--es-star'][i % 4]}))`,
                    }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-ink-soft">{row.label}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-ink">
                  {row.value} {unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
