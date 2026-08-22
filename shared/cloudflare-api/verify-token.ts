import Cloudflare from 'cloudflare';
import { z } from 'zod';
import {
  classifyCloudflareError,
  type ClassifiedCloudflareError,
} from '@/shared/cloudflare-api/errors';

const tokenVerifyResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'disabled', 'expired']),
});

export type TokenVerifyResult =
  | { ok: true; status: z.infer<typeof tokenVerifyResponseSchema>['status'] }
  | { ok: false; error: ClassifiedCloudflareError };

// Calls GET /user/tokens/verify. Used by the options page before persisting a
// pasted API token, so we never save something that can't authenticate.
export async function verifyApiToken(apiToken: string): Promise<TokenVerifyResult> {
  const client = new Cloudflare({ apiToken });

  try {
    const response = await client.user.tokens.verify();
    const parsed = tokenVerifyResponseSchema.parse(response);
    return { ok: true, status: parsed.status };
  } catch (error) {
    return { ok: false, error: classifyCloudflareError(error) };
  }
}
