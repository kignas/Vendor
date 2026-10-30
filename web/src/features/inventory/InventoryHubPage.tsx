import { useSearchParams } from 'react-router-dom';
import { SegmentedControl } from '@/components/SegmentedControl';
import { MenuPage } from '@/features/menu/MenuPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';

type Segment = 'menu' | 'stock';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'menu', label: 'Menu' },
  { id: 'stock', label: 'Stock' },
];

/**
 * Inventory tab. Menu and Stock are two views of the same underlying menu
 * document, so they share one bottom-nav destination and a segmented control
 * switches between the existing MenuPage and InventoryPage bodies. The selected
 * segment lives in the URL (`?seg=stock`) so the choice survives reloads and the
 * old `/menu` route can deep-link straight into the Menu segment.
 */
export function InventoryHubPage() {
  const [params, setParams] = useSearchParams();
  const seg: Segment = params.get('seg') === 'stock' ? 'stock' : 'menu';

  return (
    <section className="space-y-4">
      <SegmentedControl
        label="Inventory view"
        options={SEGMENTS}
        value={seg}
        onChange={(next) => setParams(next === 'menu' ? {} : { seg: next }, { replace: true })}
      />
      {seg === 'menu' ? <MenuPage /> : <InventoryPage />}
    </section>
  );
}
