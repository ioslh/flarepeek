import type Cloudflare from 'cloudflare';
import { z } from 'zod';
import { findZoneForHostname } from '@/shared/cloudflare-api/zones';
import { matchesRoutePattern } from '@/shared/cloudflare-api/route-pattern-utils';

const domainSchema = z.object({
  hostname: z.string(),
  service: z.string(),
});

const routeSchema = z.object({
  pattern: z.string(),
  script: z.string().optional(),
});

export interface WorkerForHostname {
  accountId: string;
  zoneId: string;
  zoneName: string;
  scriptName: string;
}

// Custom Domains map a hostname to a Worker 1:1, so they're checked first and,
// when present, are authoritative. Routes can be more specific ("*.example.com"
// vs "example.com"), so among matching routes we prefer the one with the
// longest (most specific) host pattern.
export async function findWorkerForHostname(
  client: Cloudflare,
  hostname: string,
): Promise<WorkerForHostname | null> {
  const zone = await findZoneForHostname(client, hostname);
  if (!zone) return null;

  const domainsPage = await client.workers.domains.list({
    account_id: zone.accountId,
    hostname,
  });
  const domainMatch = domainSchema.safeParse(domainsPage.result[0]);
  if (domainMatch.success) {
    return { ...zone, scriptName: domainMatch.data.service };
  }

  const routesPage = await client.workers.routes.list({ zone_id: zone.zoneId });
  const routes = routesPage.result
    .map((route) => routeSchema.safeParse(route))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data)
    .filter((route) => route.script && matchesRoutePattern(route.pattern, hostname))
    .sort((a, b) => b.pattern.length - a.pattern.length);

  const bestRoute = routes[0];
  if (bestRoute?.script) {
    return { ...zone, scriptName: bestRoute.script };
  }

  return null;
}
