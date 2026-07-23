import { type ReactNode, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { ToastProvider } from '@/hooks/useToast';
import { Toaster } from '@/components/ui/Toaster';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { DynamicFavicon } from '@/components/layout/DynamicFavicon';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

/** All app-wide context providers, composed once here so main.tsx and
 *  tests only ever need to reach for a single wrapper. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <TooltipProvider delayDuration={200}>
                {children}
                <DynamicFavicon />
                <Toaster />
                <CommandPalette />
              </TooltipProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
