import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { useUiStore } from '@/app/uiStore';

/**
 * App-wide providers. TanStack Query wraps everything; sonner provides toasts
 * (bottom sheets are used for anything modal). The persisted theme is applied to
 * <html> on mount so dark mode survives reloads.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{ style: { fontFamily: 'Manrope, system-ui, sans-serif' } }}
      />
    </QueryClientProvider>
  );
}
