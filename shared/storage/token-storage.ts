import { storage } from 'wxt/utils/storage';
import { z } from 'zod';

const storedTokenSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(1),
  label: z.string().min(1),
  email: z.string().nullable(),
  createdAt: z.number(),
});

export type StoredToken = z.infer<typeof storedTokenSchema>;

// Local only: never sync API tokens to chrome.storage.sync (see AGENTS.md).
const tokensItem = storage.defineItem<StoredToken[]>('local:cloudflareApiTokens', {
  fallback: [],
});

export async function getTokens(): Promise<StoredToken[]> {
  const result = z.array(storedTokenSchema).safeParse(await tokensItem.getValue());
  return result.success ? result.data : [];
}

export async function addToken(params: {
  token: string;
  label: string;
  email: string | null;
}): Promise<StoredToken> {
  const newToken: StoredToken = {
    id: crypto.randomUUID(),
    token: params.token,
    label: params.label,
    email: params.email,
    createdAt: Date.now(),
  };

  const tokens = await getTokens();
  await tokensItem.setValue([...tokens, newToken]);
  return newToken;
}

export async function updateTokenLabel(id: string, label: string): Promise<void> {
  const tokens = await getTokens();
  await tokensItem.setValue(tokens.map((t) => (t.id === id ? { ...t, label } : t)));
}

export async function removeToken(id: string): Promise<void> {
  const tokens = await getTokens();
  await tokensItem.setValue(tokens.filter((t) => t.id !== id));
}

export function watchTokens(callback: (tokens: StoredToken[]) => void): () => void {
  return tokensItem.watch((value) => callback(value ?? []));
}
