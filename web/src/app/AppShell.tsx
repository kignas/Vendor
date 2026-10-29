import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { PageTransition } from '@/components/PageTransition';
import { useConnectionWatcher } from './useConnectionWatcher';
import { useBackButton } from '@/hooks/useBackButton';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

/**
 * App shell: a single centred 480px column, sticky top bar, fixed bottom nav,
 * and a scrollable content region. Safe-area padding comes from the utilities.
 * Owns the Android back-button hierarchy and native push wiring.
 */
export function AppShell() {
  useConnectionWatcher();
  useBackButton();
  usePushNotifications();
  useUnreadNotifications();

  return (
    <div className="min-h-full bg-canvas">
      <TopBar />
      <main className="app-column safe-x [--page-x:1rem] pb-28 pt-4">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav />
      <div id="kot-print-root" aria-hidden="true" />
    </div>
  );
}
