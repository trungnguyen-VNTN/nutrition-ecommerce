import { useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IconContext } from '@phosphor-icons/react';

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
        {children}
      </IconContext.Provider>
    </QueryClientProvider>
  );
}
