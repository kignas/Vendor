import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import {
  HomePage,
  InsightsPage,
  MenuPage,
  MorePage,
  OrdersPage,
} from '@/features/PlaceholderPages';
import { LoginPage } from '@/features/auth/LoginPage';
import { DesignPage } from '@/features/design/DesignPage';

/**
 * Router. HashRouter is required for the Capacitor APK shell (AGENTS.md).
 * `/design` is a dev-only component gallery and is excluded from production.
 */
export function AppRouter() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="more" element={<MorePage />} />
          {import.meta.env.DEV ? <Route path="design" element={<DesignPage />} /> : null}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
