import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { RequireAuth } from './RequireAuth';
import { HomePage } from '@/features/home/HomePage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { MenuPage } from '@/features/menu/MenuPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { FinancePage } from '@/features/finance/FinancePage';
import { ReviewsPage } from '@/features/reviews/ReviewsPage';
import { SupportPage } from '@/features/support/SupportPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ProfilePage } from '@/features/restaurant/ProfilePage';
import { MorePage } from '@/features/settings/MorePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { ApplyPage } from '@/features/apply/ApplyPage';
import { ApplicationStatusPage } from '@/features/apply/ApplicationStatusPage';
import { SkeletonList } from '@/components/Skeletons';

/**
 * Growth pulls in Recharts (~250 kB), which the order-workflow screens never
 * need. Loading it lazily keeps the initial APK bundle small on low-end phones.
 */
const InsightsPage = lazy(() =>
  import('@/features/insights/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);

const DesignPage = lazy(() =>
  import('@/features/design/DesignPage').then((m) => ({ default: m.DesignPage })),
);

function RouteFallback() {
  return (
    <div className="py-6">
      <SkeletonList rows={3} />
    </div>
  );
}

/**
 * Router. HashRouter is required for the Capacitor APK shell (AGENTS.md).
 * Authenticated routes sit behind RequireAuth; the login route is public.
 */
export function AppRouter() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/application-status" element={<ApplicationStatusPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route
              path="insights"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <InsightsPage />
                </Suspense>
              }
            />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="more" element={<MorePage />} />
            {import.meta.env.DEV ? (
              <Route
                path="design"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <DesignPage />
                  </Suspense>
                }
              />
            ) : null}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
