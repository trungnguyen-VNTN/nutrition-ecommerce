import { useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IconContext } from '@phosphor-icons/react';
import { ToastProvider } from '@/components/ui/toast';

// One icon family, one stroke weight; icons scale with text and are decorative by default.
const iconDefaults = {
  size: '1.25em',
  weight: 'regular',
  className: 'icon',
  'aria-hidden': true,
} as const;

export function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <IconContext.Provider value={iconDefaults}>
        <ToastProvider>{children}</ToastProvider>
      </IconContext.Provider>
    </QueryClientProvider>
  );
}
