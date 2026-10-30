import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

export interface TrendSeries {
  key: string;
  label: string;
  /** CSS custom property (without `var()`) used for the stroke, e.g. `--es-brand-ink`. */
  colorVar: string;
  /** One value per x-label; must align with `labels` by index. */
  values: number[];
  /** Pre-formatted value for the tooltip / table. */
  displays: string[];
}

export interface TrendChartProps {
  /** Shared x labels (one per point). */
  labels: string[];
  series: TrendSeries[];
  ariaLabel: string;
  height?: number;
  className?: string;
}

/**
 * Multi-series inline-SVG line chart with a legend, a selectable point and an
 * accessible table alternative. Geometry is presentation only — every value is
 * rendered exactly as supplied. No chart library (the panel uses inline SVG).
 */
export function TrendChart({ labels, series, ariaLabel, height = 150, className }: TrendChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 320;
  const padY = 14;
  const count = labels.length;

  if (count < 2 || series.length === 0) return null;

  const allValues = series.flatMap((s) => s.values);
  const min = Math.min(0, ...allValues);
  const max = Math.max(1, ...allValues);
  const span = max - min || 1;
  const stepX = width / (count - 1);

  const toY = (v: number): number => height - padY - ((v - min) / span) * (height - padY * 2);
  const toX = (i: number): number => i * stepX;

  const paths = series.map((s) => ({
    key: s.key,
    colorVar: s.colorVar,
    d: s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(' '),
  }));

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex flex-wrap gap-3">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
            <span
              className="h-2 w-2 rounded-pill"
              style={{ backgroundColor: `rgb(var(${s.colorVar}))` }}
              aria-hidden="true"
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg
          role="img"
          aria-label={ariaLabel}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          width="100%"
          height={height}
        >
          <defs>
            <linearGradient id={`trend-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--es-brand-ink))" stopOpacity={0.28} />
              <stop offset="100%" stopColor="rgb(var(--es-brand-ink))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {/* Area fill under the FIRST series only, to keep the two lines legible. */}
          {series[0] ? (
            <path
              d={`${paths[0].d} L${width},${height} L0,${height} Z`}
              fill={`url(#trend-${gradientId})`}
            />
          ) : null}
          {paths.map((p) => (
            <path
              key={p.key}
              d={p.d}
              fill="none"
              stroke={`rgb(var(${p.colorVar}))`}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {activeIndex !== null
            ? series.map((s) => (
                <circle
                  key={s.key}
                  cx={toX(activeIndex)}
                  cy={toY(s.values[activeIndex] ?? 0)}
                  r={3}
                  fill={`rgb(var(${s.colorVar}))`}
                />
              ))
            : null}
        </svg>

        {/* Invisible per-point hit targets so each day is tappable and focusable. */}
        <div className="absolute inset-0 flex" role="group" aria-label={ariaLabel}>
          {labels.map((label, i) => (
            <button
              key={label + i}
              type="button"
              aria-label={`${label}: ${series.map((s) => `${s.label} ${s.displays[i] ?? ''}`).join(', ')}`}
              aria-pressed={activeIndex === i}
              onClick={() => setActiveIndex((k) => (k === i ? null : i))}
              className="h-full flex-1 rounded-sm"
            />
          ))}
        </div>

        {activeIndex !== null ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-btn border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-sm"
          >
            <span className="block text-ink-soft">{labels[activeIndex]}</span>
            {series.map((s) => (
              <span key={s.key} className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-pill"
                  style={{ backgroundColor: `rgb(var(${s.colorVar}))` }}
                  aria-hidden="true"
                />
                {s.label}: {s.displays[activeIndex]}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-ink-soft" aria-hidden="true">
        <span>{labels[0]}</span>
        <span>{labels[count - 1]}</span>
      </div>

      {/* Text/table alternative for screen readers and low-vision users. */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={label + i}>
              <th scope="row">{label}</th>
              {series.map((s) => (
                <td key={s.key}>{s.displays[i]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
