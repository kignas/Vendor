import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { applyTheme, useUiStore, watchSystemTheme } from '@/app/uiStore';
import { AppToaster } from '@/app/AppToaster';

/**
 * App-wide providers. TanStack Query wraps everything; sonner provides toasts
 * (bottom sheets are used for anything modal). The persisted theme is applied to
 * <html> on mount (belt-and-braces with the inline script in index.html) and the
 * system preference is watched while the user is on `system`.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => watchSystemTheme(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <AppToaster />
    </QueryClientProvider>
  );
}
