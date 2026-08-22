import { useEffect, useState } from 'react';
import { getTokens, watchTokens, type StoredToken } from '@/shared/storage/token-storage';

// undefined = still loading.
export function useTokens(): StoredToken[] | undefined {
  const [tokens, setTokens] = useState<StoredToken[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    getTokens().then((value) => {
      if (!cancelled) setTokens(value);
    });

    const unwatch = watchTokens(setTokens);
    return () => {
      cancelled = true;
      unwatch();
    };
  }, []);

  return tokens;
}
