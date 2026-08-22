import type Cloudflare from 'cloudflare';
import { z } from 'zod';

const zoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  account: z.object({ id: z.string() }).optional(),
});

export interface MatchedZone {
  zoneId: string;
  zoneName: string;
  accountId: string;
}

// A zone name is a registrable domain, so we can't derive it from a hostname by
// stripping a single label (e.g. "app.example.co.uk" -> "example.co.uk" needs
// two labels stripped). Instead we try progressively shorter suffixes of the
// hostname as exact zone-name candidates until one resolves.
export async function findZoneForHostname(
  client: Cloudflare,
  hostname: string,
): Promise<MatchedZone | null> {
  const labels = hostname.split('.');

  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.');
    const page = await client.zones.list({ name: candidate });
    const zone = zoneSchema.safeParse(page.result[0]);

    if (zone.success && zone.data.account?.id) {
      return {
        zoneId: zone.data.id,
        zoneName: zone.data.name,
        accountId: zone.data.account.id,
      };
    }
  }

  return null;
}
