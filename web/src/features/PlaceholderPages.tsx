import { Home as HomeIcon, Receipt, UtensilsCrossed, BarChart3, MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Placeholder used by every route until the real screen is built in a later
 * phase. It renders a real empty state (no fake numbers).
 */
export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">{title}</h1>
      <EmptyState title={`${title} is coming in a later phase`} description={description} icon={icon} />
    </section>
  );
}

export const HomePage = () => (
  <PlaceholderPage
    title="Home"
    description="Today's KPIs, alerts and the live order queue will land here."
    icon={HomeIcon}
  />
);

export const OrdersPage = () => (
  <PlaceholderPage
    title="Orders"
    description="The new / preparing / ready / dispatch / scheduled tabs and history will land here."
    icon={Receipt}
  />
);

export const MenuPage = () => (
  <PlaceholderPage
    title="Menu"
    description="Menu items, stock toggles and restock scheduling will land here."
    icon={UtensilsCrossed}
  />
);

export const InsightsPage = () => (
  <PlaceholderPage
    title="Insights"
    description="Analytics and visit trends will land here."
    icon={BarChart3}
  />
);

export const MorePage = () => (
  <PlaceholderPage
    title="More"
    description="Finance, reviews, support and settings will land here."
    icon={MoreHorizontal}
  />
);
