import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

/**
 * Insights. The dashboard's analytics endpoints (GET /analytics,
 * /analytics/visits) are not part of the documented vendor contract used by the
 * ported screens, so this screen states the gap rather than charting fabricated
 * data (AGENTS.md rule 5).
 */
export function InsightsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Insights</h1>
      <EmptyState
        title="Analytics is not available yet"
        description="Sales and visit analytics will appear here once the backend exposes a documented vendor analytics contract. No figures are shown until then."
        icon={BarChart3}
      />
    </section>
  );
}
