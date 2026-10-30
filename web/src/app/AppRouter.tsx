import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { RequireAuth } from './RequireAuth';
import { HomePage } from '@/features/home/HomePage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { OrderHistoryPage } from '@/features/orders/OrderHistoryPage';
import { InventoryHubPage } from '@/features/inventory/InventoryHubPage';
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
 * Business (Insights + Finance) pulls in Recharts (~250 kB), which the
 * order-workflow screens never need. Loading the whole hub lazily keeps the
 * initial APK bundle small on low-end phones.
 */
const BusinessHubPage = lazy(() =>
  import('@/features/insights/BusinessHubPage').then((m) => ({ default: m.BusinessHubPage })),
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
            <Route index element={<Navigate to="/orders" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="history" element={<OrderHistoryPage />} />
            {/* Inventory hub: Menu | Stock segmented control. */}
            <Route path="inventory" element={<InventoryHubPage />} />
            {/* Old /menu route deep-links into the Menu segment. */}
            <Route path="menu" element={<Navigate to="/inventory" replace />} />
            {/* Business hub: Insights | Finance segmented control (lazy: Recharts). */}
            <Route
              path="business"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <BusinessHubPage />
                </Suspense>
              }
            />
            {/* Old routes redirect into the Business hub with the right segment. */}
            <Route path="insights" element={<Navigate to="/business" replace />} />
            <Route path="finance" element={<Navigate to="/business?seg=finance" replace />} />
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
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </HashRouter>
  );
}
