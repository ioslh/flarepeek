import { getTokens, addToken } from '@/shared/storage/token-storage';
import { verifyApiToken } from '@/shared/cloudflare-api/verify-token';
import { getTokenEmail } from '@/shared/cloudflare-api/identity';

// Dev-only convenience: `pnpm dev` + reloading the unpacked extension often
// starts chrome.storage.local empty again, which means re-pasting one or
// more API tokens by hand after every reload. Put a comma-separated list in
// WXT_DEV_CF_API_TOKENS inside .env.development.local (gitignored — see
// .env.example) and this seeds all of them once, going through the same
// verify-then-add path as the options page form (use-add-token.ts) so a
// seeded token is stored identically to a manually pasted one — useful for
// pre-loading more than one account to test token-switching without pasting
// each in by hand.
//
// The `.development.local` suffix (not plain `.env.local`) is deliberate:
// Vite only loads it in dev mode, so the token literal never even enters
// import.meta.env during `wxt build`/`wxt zip` — this doesn't rely on
// import.meta.env.DEV's dead-code elimination as the only safety net. Never
// logs a token value itself (see AGENTS.md).
export async function seedDevApiTokens(): Promise<void> {
  if (!import.meta.env.DEV) return;

  const raw = import.meta.env.WXT_DEV_CF_API_TOKENS;
  if (!raw) return;

  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return;

  // Only ever seeds into empty storage — never overwrites or duplicates
  // whatever's already there, whether that's a previous seed that survived
  // an HMR-only reload or tokens added manually for something this
  // shouldn't clobber.
  const existing = await getTokens();
  if (existing.length > 0) return;

  let seeded = 0;
  for (const token of tokens) {
    const result = await verifyApiToken(token);
    if (!result.ok) {
      console.warn(
        '[flarepeek] a WXT_DEV_CF_API_TOKENS entry failed verification:',
        result.error.kind,
      );
      continue; // one bad token in the list shouldn't block seeding the rest
    }

    const email = await getTokenEmail(token);
    await addToken({ token, label: email ?? 'Dev token (.env.development.local)', email });
    seeded++;
  }
  if (seeded > 0) {
    console.log(`[flarepeek] seeded ${seeded} API token(s) from WXT_DEV_CF_API_TOKENS`);
  }
}
