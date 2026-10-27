import { useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ChartCard } from '@/components/ChartCard';
import { BottomSheet } from '@/components/BottomSheet';
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonList } from '@/components/Skeletons';
import { useUiStore } from '@/app/uiStore';

const CHART_DATA = [
  { day: 'Mon', orders: 12 },
  { day: 'Tue', orders: 19 },
  { day: 'Wed', orders: 8 },
  { day: 'Thu', orders: 24 },
  { day: 'Fri', orders: 31 },
  { day: 'Sat', orders: 40 },
  { day: 'Sun', orders: 27 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Dev-only component gallery. Every shared component is shown in every state
 * (default, loading, empty, error) so the design language can be verified
 * without the real screens. Excluded from production builds.
 */
export function DesignPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const connection = useUiStore((s) => s.connection);

  return (
    <div className="space-y-8 pb-10">
      <header>
        <h1 className="text-lg font-extrabold text-ink">Design system</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Dev-only gallery of every shared component and state. Route: <code>#/design</code>.
        </p>
      </header>

      <Section title="KpiCard">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Today" value="₹12,480" delta="+12%" />
          <KpiCard label="Orders" value="48" delta="-3%" />
          <KpiCard label="No data" value={null} />
          <KpiCard label="Loading" value={null} loading />
        </div>
      </Section>

      <Section title="StatusPill">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral">Neutral</StatusPill>
          <StatusPill tone="success" dot>
            Delivered
          </StatusPill>
          <StatusPill tone="warning" dot>
            Preparing
          </StatusPill>
          <StatusPill tone="danger" dot>
            Cancelled
          </StatusPill>
          <StatusPill tone="info">Support</StatusPill>
          <StatusPill tone="brand">New</StatusPill>
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          title="No orders right now"
          description="New orders will appear here the moment they are placed."
          icon={Inbox}
        />
        <EmptyState
          title="With an action"
          description="Empty state with a primary action."
          action={
            <button
              type="button"
              className="inline-flex min-h-tap items-center gap-2 rounded-btn bg-ink px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add item
            </button>
          }
        />
      </Section>

      <Section title="ErrorState">
        <ErrorState />
        <ErrorState message="Could not load the menu." onRetry={() => undefined} />
        <ErrorState message="Retrying…" onRetry={() => undefined} retrying />
      </Section>

      <Section title="Skeletons">
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonList rows={2} />
        <SkeletonChart />
        <Skeleton className="h-10 w-full" />
      </Section>

      <Section title="ChartCard">
        <ChartCard title="Orders this week">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis hide />
                <Bar dataKey="orders" fill="#18181B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Loading chart" loading />
        <ChartCard title="Empty chart" empty />
      </Section>

      <Section title="BottomSheet">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex min-h-tap items-center rounded-btn bg-ink px-4 text-sm font-semibold text-white"
        >
          Open bottom sheet
        </button>
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Bottom sheet"
          description="Drag down or tap the overlay to dismiss."
        >
          <p className="text-sm text-ink-soft">
            Bottom sheets replace modals across the app. Content is scrollable and safe-area aware.
          </p>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="mt-4 inline-flex min-h-tap w-full items-center justify-center rounded-btn bg-ink px-4 text-sm font-semibold text-white"
          >
            Close
          </button>
        </BottomSheet>
      </Section>

      <Section title="Connection pill (live)">
        <p className="text-sm text-ink-soft">
          Current state: <strong className="text-ink">{connection}</strong>. Toggle your network to
          see it change.
        </p>
      </Section>
    </div>
  );
}
