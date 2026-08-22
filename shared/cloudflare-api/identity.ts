import Cloudflare from 'cloudflare';
import { z } from 'zod';

const userSchema = z.object({ email: z.string() });

// Requires "User Details:Read". Best-effort: a token scoped tightly enough
// to skip this permission is still perfectly usable — callers should treat a
// null result as "ask the user for a label" rather than an error.
export async function getTokenEmail(
  apiToken: string,
  createClient: (apiToken: string) => Cloudflare = (token) => new Cloudflare({ apiToken: token }),
): Promise<string | null> {
  const client = createClient(apiToken);

  try {
    const user = await client.user.get();
    return userSchema.parse(user).email;
  } catch {
    return null;
  }
}
