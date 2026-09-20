'use client';

import { ReactNode, useMemo, createContext, useContext } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

interface ConvexState {
  isConfigured: boolean;
  deploymentUrl: string | null;
}

const ConvexStateContext = createContext<ConvexState>({
  isConfigured: false,
  deploymentUrl: null,
});

export function useConvexConfig() {
  return useContext(ConvexStateContext);
}

const rawConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const isConfigured = Boolean(
  rawConvexUrl &&
    rawConvexUrl.startsWith('http') &&
    !rawConvexUrl.includes('your-deployment-name')
);

// Fallback client URL used when a live deployment is not yet connected
const activeUrl = isConfigured
  ? rawConvexUrl!
  : 'https://placeholder.convex.cloud';

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    return new ConvexReactClient(activeUrl);
  }, []);

  const stateValue = useMemo(
    () => ({
      isConfigured,
      deploymentUrl: isConfigured ? rawConvexUrl! : null,
    }),
    []
  );

  return (
    <ConvexStateContext.Provider value={stateValue}>
      <ConvexProvider client={client}>{children}</ConvexProvider>
    </ConvexStateContext.Provider>
  );
}
