import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

export interface LinePoint {
  /** Stable key (e.g. an ISO day). */
  key: string;
  /** Human label shown in the tooltip. */
  label: string;
  value: number;
  /** Pre-formatted value for the tooltip. */
  display: string;
}

export interface LineChartProps {
  points: LinePoint[];
  ariaLabel: string;
  height?: number;
  className?: string;
}

/**
 * Inline-SVG line chart with a selectable point that reveals a tooltip.
 * Each point is a real button (keyboard + screen-reader reachable); selecting
 * one draws a marker and a tooltip. No chart library, no external assets.
 */
export function LineChart({ points, ariaLabel, height = 130, className }: LineChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const width = 300;
  const padY = 12;

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const xy = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : width / 2;
    const y = span === 0 ? height / 2 : height - padY - ((p.value - min) / span) * (height - padY * 2);
    return { x, y };
  });
  const path = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const activeIndex = points.findIndex((p) => p.key === activeKey);
  const active = activeIndex >= 0 ? { point: points[activeIndex], at: xy[activeIndex] } : null;

  return (
    <div className={cn('w-full', className)}>
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
            <linearGradient id={`line-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--es-brand-ink))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgb(var(--es-brand-ink))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#line-${gradientId})`} />
          <path d={path} fill="none" stroke="rgb(var(--es-brand-ink))" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          {active ? (
            <circle cx={active.at.x} cy={active.at.y} r={3.5} fill="rgb(var(--es-brand-ink))" />
          ) : null}
        </svg>

        {/* Invisible hit targets, one per point, so each is tappable and focusable. */}
        <div className="absolute inset-0 flex" role="group" aria-label={ariaLabel}>
          {points.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-label={`${p.label}: ${p.display}`}
              aria-pressed={p.key === activeKey}
              onClick={() => setActiveKey((k) => (k === p.key ? null : p.key))}
              className="h-full flex-1 rounded-sm"
            />
          ))}
        </div>

        {active ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-btn border border-border bg-card px-2 py-1 text-[11px] font-semibold text-ink shadow-sm"
          >
            {active.point.label} · {active.point.display}
          </div>
        ) : null}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-faint" aria-hidden="true">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
