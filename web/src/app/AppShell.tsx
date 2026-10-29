import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { useConnectionWatcher } from './useConnectionWatcher';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

/**
 * App shell: a single centred 480px column, sticky top bar, fixed bottom nav,
 * and a scrollable content region. Safe-area padding comes from the utilities.
 */
export function AppShell() {
  useConnectionWatcher();
  usePushNotifications();
  useUnreadNotifications();

  return (
    <div className="min-h-full bg-canvas">
      <TopBar />
      <main className="app-column safe-x px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
