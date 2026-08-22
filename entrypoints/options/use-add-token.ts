import { useCallback, useState } from 'react';
import { addToken } from '@/shared/storage/token-storage';
import { verifyApiToken } from '@/shared/cloudflare-api/verify-token';
import { getTokenEmail } from '@/shared/cloudflare-api/identity';
import type { CloudflareApiErrorKind } from '@/shared/cloudflare-api/errors';

type AddTokenState =
  | { status: 'idle' }
  | { status: 'verifying' }
  | { status: 'needs-label' }
  | { status: 'error'; kind: CloudflareApiErrorKind }
  | { status: 'success' };

export function useAddToken() {
  const [state, setState] = useState<AddTokenState>({ status: 'idle' });
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // Verifies the token, then tries to auto-detect an identity for it. Found
  // one -> save immediately. Didn't -> hand back to the caller to collect a
  // manual label via confirmLabel.
  const submitToken = useCallback(async (rawToken: string) => {
    const token = rawToken.trim();
    setState({ status: 'verifying' });

    const result = await verifyApiToken(token);
    if (!result.ok) {
      setState({ status: 'error', kind: result.error.kind });
      return;
    }

    const email = await getTokenEmail(token);
    if (email) {
      await addToken({ token, label: email, email });
      setState({ status: 'success' });
      return;
    }

    setPendingToken(token);
    setState({ status: 'needs-label' });
  }, []);

  const confirmLabel = useCallback(
    async (label: string) => {
      if (!pendingToken) return;
      await addToken({ token: pendingToken, label, email: null });
      setPendingToken(null);
      setState({ status: 'success' });
    },
    [pendingToken],
  );

  const reset = useCallback(() => {
    setPendingToken(null);
    setState({ status: 'idle' });
  }, []);

  return { state, submitToken, confirmLabel, reset };
}
