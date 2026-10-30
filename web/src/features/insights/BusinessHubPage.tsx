import { useSearchParams } from 'react-router-dom';
import { SegmentedControl } from '@/components/SegmentedControl';
import { InsightsPage } from '@/features/insights/InsightsPage';
import { FinancePage } from '@/features/finance/FinancePage';

type Segment = 'insights' | 'finance';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'insights', label: 'Insights' },
  { id: 'finance', label: 'Finance' },
];

/**
 * Business tab. Insights (growth/analytics) and Finance (earnings/settlements)
 * share one bottom-nav destination and a segmented control switches between the
 * existing InsightsPage and FinancePage bodies. The segment lives in the URL
 * (`?seg=finance`) so the old `/insights` and `/finance` routes redirect here
 * with the right segment selected.
 */
export function BusinessHubPage() {
  const [params, setParams] = useSearchParams();
  const seg: Segment = params.get('seg') === 'finance' ? 'finance' : 'insights';

  return (
    <section className="space-y-4">
      <SegmentedControl
        label="Business view"
        options={SEGMENTS}
        value={seg}
        onChange={(next) => setParams(next === 'insights' ? {} : { seg: next }, { replace: true })}
      />
      {seg === 'insights' ? <InsightsPage /> : <FinancePage />}
    </section>
  );
}
