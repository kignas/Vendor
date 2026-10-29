import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { RequireAuth } from './RequireAuth';
import { HomePage } from '@/features/home/HomePage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { MenuPage } from '@/features/menu/MenuPage';
import { FinancePage } from '@/features/finance/FinancePage';
import { InsightsPage } from '@/features/insights/InsightsPage';
import { ReviewsPage } from '@/features/reviews/ReviewsPage';
import { MorePage } from '@/features/settings/MorePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { DesignPage } from '@/features/design/DesignPage';

/**
 * Router. HashRouter is required for the Capacitor APK shell (AGENTS.md).
 * Authenticated routes sit behind RequireAuth; the login route is public.
 */
export function AppRouter() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="more" element={<MorePage />} />
            {import.meta.env.DEV ? <Route path="design" element={<DesignPage />} /> : null}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
