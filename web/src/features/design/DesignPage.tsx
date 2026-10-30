import { useState } from 'react';
import { toast } from 'sonner';
import { Inbox, Plus } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { KpiCard } from '@/components/KpiCard';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { StorefrontIllustration } from '@/components/StorefrontIllustration';
import { ordersEmptyCopy } from '@/features/orders/ordersEmptyState';
import { OrderChips } from '@/features/orders/OrderChips';
import { ErrorState } from '@/components/ErrorState';
import { ChartCard } from '@/components/ChartCard';
import { BottomSheet } from '@/components/BottomSheet';
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonList } from '@/components/Skeletons';
import { OrderCard } from '@/features/orders/OrderCard';
import { AcceptOrderSheet } from '@/features/orders/AcceptOrderSheet';
import { NewOrderBanner } from '@/features/orders/NewOrderBanner';
import { InfoCardItem } from '@/features/orders/InfoCarousel';
import { ProfileNudgeBar } from '@/features/restaurant/ProfileNudge';
import type { InfoCard } from '@/features/orders/infoCards';
import type { Order } from '@/types/order';
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

/** Sample orders for the gallery. Shapes mirror real server payloads. */
const PREPARING_ORDER: Order = {
  _id: 'design-1',
  publicOrderId: 'SW-4821',
  status: 'preparing',
  customerName: 'Asha Rao',
  createdAt: new Date().toISOString(),
  prepStartedAt: new Date().toISOString(),
  items: [
    { name: 'Masala Dosa', quantity: 2, isVeg: true, price: 130 },
    { name: 'Filter Coffee', quantity: 1, isVeg: true, price: 60 },
  ],
  total: 320,
  paymentStatus: 'paid',
  vendorBill: { itemSubtotal: 320, commission: 48, restaurantNetAmount: 272 },
};

const PLACED_ORDER: Order = {
  ...PREPARING_ORDER,
  _id: 'design-2',
  publicOrderId: 'SW-4822',
  status: 'placed',
  restaurantResponseDeadline: new Date(Date.now() + 4 * 60_000).toISOString(),
  items: [
    { name: 'Butter Chicken', quantity: 1, isVeg: false, price: 280 },
    { name: 'Garlic Naan', quantity: 3, isVeg: true, price: 45 },
  ],
  sendCutlery: false,
};

/** The InfoCard shapes the carousel can build (one per tone). */
const INFO_CARDS: InfoCard[] = [
  {
    id: 'design:warning',
    tone: 'warning',
    title: '3 items out of stock',
    body: 'Customers cannot order these items right now.',
    actionLabel: 'View stock',
    to: '/inventory?seg=stock',
  },
  {
    id: 'design:info',
    tone: 'info',
    title: '2 items awaiting review',
    body: 'Eatswada is reviewing these items.',
    actionLabel: 'View menu',
    to: '/inventory',
  },
  {
    id: 'design:brand',
    tone: 'brand',
    title: '₹12,400 available to withdraw',
    body: 'Move your balance to your bank account.',
    actionLabel: 'Withdraw',
    to: '/business?seg=finance',
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ink-soft">{title}</h2>
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
  const [activeChip, setActiveChip] = useState('preparing');
  const [acceptOpen, setAcceptOpen] = useState(false);
  const connection = useUiStore((s) => s.connection);
  const CHIPS = [
    { id: 'preparing', label: 'Preparing', count: 3 },
    { id: 'ready', label: 'Ready', count: 1 },
    { id: 'dispatch', label: 'Picked up', count: 0 },
  ];

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

      <Section title="Order chips">
        <OrderChips chips={CHIPS} active={activeChip} onSelect={setActiveChip} />
        <p className="text-[13px] text-ink-soft">
          Active chip = brand crimson outline with tinted text; the rest are neutral.
        </p>
      </Section>

      <Section title="New-order bar (fixed, above the nav)">
        <div className="relative h-16 overflow-hidden rounded-card border border-border bg-canvas">
          <NewOrderBanner orders={[PLACED_ORDER]} onStop={() => undefined} />
        </div>
        <div className="relative h-16 overflow-hidden rounded-card border border-border bg-canvas">
          <NewOrderBanner
            orders={[PLACED_ORDER, { ...PLACED_ORDER, _id: 'design-3', publicOrderId: 'SW-4823' }]}
            onStop={() => undefined}
          />
        </div>
        <p className="text-[13px] text-ink-soft">
          Green bar with chevron-up; tap or swipe up opens the accept sheet. Hidden when nothing is
          waiting.
        </p>
      </Section>

      <Section title="Order card (normal / busy)">
        <OrderCard
          order={PREPARING_ORDER}
          onAccept={() => undefined}
          onReject={() => undefined}
          onAdvance={() => undefined}
          onReady={() => undefined}
          onExtendPrep={() => undefined}
          onVerifyOtp={() => undefined}
        />
        <OrderCard
          order={PREPARING_ORDER}
          busy
          onAccept={() => undefined}
          onReject={() => undefined}
          onAdvance={() => undefined}
          onReady={() => undefined}
          onExtendPrep={() => undefined}
          onVerifyOtp={() => undefined}
        />
      </Section>

      <Section title="Info carousel cards (one per tone)">
        <div className="space-y-2">
          {INFO_CARDS.map((card) => (
            <InfoCardItem
              key={card.id}
              card={card}
              onDismiss={() => undefined}
              onOpen={() => undefined}
            />
          ))}
        </div>
      </Section>

      <Section title="Profile nudge (fixed, above the nav)">
        <div className="relative h-16 overflow-hidden rounded-card border border-border bg-canvas">
          <ProfileNudgeBar
            content={{ id: 'email', title: 'Missing email address', body: "Don't miss important updates" }}
            onDismiss={() => undefined}
          />
        </div>
      </Section>

      <Section title="Accept order sheet">
        <button
          type="button"
          onClick={() => setAcceptOpen(true)}
          className="inline-flex min-h-tap items-center rounded-btn bg-success px-4 text-sm font-bold text-white"
        >
          Open accept sheet
        </button>
        <AcceptOrderSheet
          order={acceptOpen ? PLACED_ORDER : null}
          busy={false}
          index={0}
          total={1}
          onAccept={() => setAcceptOpen(false)}
          onReject={() => setAcceptOpen(false)}
          onClose={() => setAcceptOpen(false)}
        />
      </Section>

      <Section title="Typography">
        <p className="text-base font-bold text-ink">ID: 7500 — order id (16px bold)</p>
        <p className="text-[15px] font-semibold tabular-nums text-ink">₹1,240 — price (15px semibold)</p>
        <p className="text-[13px] text-ink-soft">Secondary text (13px, ink-soft)</p>
        <p className="text-sm text-ink-soft">Body text stays at 14px minimum.</p>
      </Section>

      <Section title="Actions (colour by meaning)">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-tap rounded-btn bg-info px-4 text-sm font-bold text-white"
          >
            Order ready
          </button>
          <button
            type="button"
            className="min-h-tap rounded-btn bg-success px-4 text-sm font-bold text-white"
          >
            Accept
          </button>
          <button
            type="button"
            className="min-h-tap rounded-btn border-2 border-danger px-4 text-sm font-bold text-danger-ink"
          >
            Reject
          </button>
        </div>
        <p className="text-[13px] text-ink-soft">
          Forward actions use info blue, accept uses success green, reject is a danger outline.
        </p>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toast.success('Order accepted · 17 min')}
            className="min-h-tap rounded-btn bg-inverse px-4 text-sm font-semibold text-inverse-ink"
          >
            Success
          </button>
          <button
            type="button"
            onClick={() => toast.error('Kitchen is closed')}
            className="min-h-tap rounded-btn bg-inverse px-4 text-sm font-semibold text-inverse-ink"
          >
            Error
          </button>
          <button
            type="button"
            onClick={() => toast('Order already accepted')}
            className="min-h-tap rounded-btn bg-inverse px-4 text-sm font-semibold text-inverse-ink"
          >
            Neutral
          </button>
        </div>
        <p className="text-[13px] text-ink-soft">
          Dark rounded pill with a leading icon, above the nav, nudge and new-order bar.
        </p>
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
              className="inline-flex min-h-tap items-center gap-2 rounded-btn bg-inverse px-4 text-sm font-semibold text-inverse-ink"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add item
            </button>
          }
        />
      </Section>

      <Section title="Storefront illustration">
        <div className="grid grid-cols-2 gap-3">
          {(['open', 'busy', 'paused', 'closed', 'neutral'] as const).map((v) => (
            <div
              key={v}
              className="flex flex-col items-center gap-2 rounded-card border border-border bg-card p-3"
            >
              <StorefrontIllustration variant={v} size={120} />
              <span className="text-xs font-semibold text-ink-soft">{v}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Orders empty states">
        {(['open', 'busy', 'temporarily_closed', 'closed_today', null] as const).map((s) => {
          const copy = ordersEmptyCopy(s, s === 'temporarily_closed' ? 'Kitchen maintenance' : null);
          return (
            <EmptyState
              key={s ?? 'unknown'}
              title={copy.title}
              description={copy.body}
              illustration={<StorefrontIllustration variant={copy.variant} />}
              action={
                copy.action ? (
                  <button
                    type="button"
                    className="inline-flex min-h-tap items-center gap-2 rounded-btn bg-success px-5 text-sm font-bold text-white"
                  >
                    {copy.action === 'resume' ? 'Resume orders' : 'Turn on Online'}
                  </button>
                ) : undefined
              }
            />
          );
        })}
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
                <Bar dataKey="orders" fill="rgb(var(--es-brand-ink))" radius={[4, 4, 0, 0]} />
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
          className="inline-flex min-h-tap items-center rounded-btn bg-inverse px-4 text-sm font-semibold text-inverse-ink"
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
            className="mt-4 inline-flex min-h-tap w-full items-center justify-center rounded-btn bg-inverse px-4 text-sm font-semibold text-inverse-ink"
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
