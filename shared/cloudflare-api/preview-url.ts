import type Cloudflare from 'cloudflare';
import { z } from 'zod';

const accountSubdomainSchema = z.object({ subdomain: z.string() });
const scriptSubdomainSchema = z.object({ previews_enabled: z.boolean() });

export interface PreviewUrlConfig {
  enabled: boolean;
  scriptName: string;
  accountSubdomain: string;
}

// Preview URLs only exist on the account's workers.dev subdomain — a Worker
// reachable only via a custom domain/route can still have them, but only if
// "Preview URLs" wasn't explicitly turned off (a common thing to do once a
// custom domain is set up). Fetched once per Worker, then reused to build
// every version's URL locally with no further API calls.
export async function getPreviewUrlConfig(
  client: Cloudflare,
  accountId: string,
  scriptName: string,
): Promise<PreviewUrlConfig | null> {
  const [accountSubdomainResponse, scriptSubdomainResponse] = await Promise.all([
    client.workers.subdomains.get({ account_id: accountId }),
    client.workers.scripts.subdomain.get(scriptName, { account_id: accountId }),
  ]);

  const accountSubdomain = accountSubdomainSchema.safeParse(accountSubdomainResponse);
  const scriptSubdomain = scriptSubdomainSchema.safeParse(scriptSubdomainResponse);
  if (!accountSubdomain.success || !scriptSubdomain.success) return null;

  return {
    enabled: scriptSubdomain.data.previews_enabled,
    scriptName,
    accountSubdomain: accountSubdomain.data.subdomain,
  };
}

// See https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/
// Format: <VERSION_PREFIX>-<WORKER_NAME>.<SUBDOMAIN>.workers.dev, where the
// prefix is the version id's first 8 characters.
export function buildVersionPreviewUrl(config: PreviewUrlConfig, versionId: string): string | null {
  if (!config.enabled) return null;
  const prefix = versionId.slice(0, 8);
  return `https://${prefix}-${config.scriptName}.${config.accountSubdomain}.workers.dev`;
}
