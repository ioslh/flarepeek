import type Cloudflare from 'cloudflare';
import { z } from 'zod';

const settingsSchema = z.object({
  observability: z
    .object({
      enabled: z.boolean(),
      logs: z.object({ enabled: z.boolean() }).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type ObservabilityStatus = 'enabled' | 'disabled' | 'unknown';

// A Worker with Observability/Logs turned off returns zero events for every
// query — indistinguishable from "no errors" unless we check this first.
// Only ever returns 'disabled' when confident; anything ambiguous (missing
// permission, unexpected shape) resolves to 'unknown' so callers don't block
// on a guess.
export async function getObservabilityStatus(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
): Promise<ObservabilityStatus> {
  try {
    const settings = await client.workers.scripts.settings.get(scriptName, {
      account_id: accountId,
    });
    const parsed = settingsSchema.safeParse(settings);
    if (!parsed.success) return 'unknown';

    const observability = parsed.data.observability;
    if (!observability || !observability.enabled) return 'disabled';
    if (observability.logs && !observability.logs.enabled) return 'disabled';
    return 'enabled';
  } catch {
    return 'unknown';
  }
}
