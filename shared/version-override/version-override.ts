import { hostnameToRuleId } from '@/shared/version-override/rule-id';

// See https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/
const VERSION_OVERRIDE_HEADER = 'Cloudflare-Workers-Version-Overrides';

const OVERRIDE_RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
  chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
  chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
  chrome.declarativeNetRequest.ResourceType.STYLESHEET,
  chrome.declarativeNetRequest.ResourceType.SCRIPT,
  chrome.declarativeNetRequest.ResourceType.IMAGE,
  chrome.declarativeNetRequest.ResourceType.FONT,
  chrome.declarativeNetRequest.ResourceType.OBJECT,
  chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
  chrome.declarativeNetRequest.ResourceType.PING,
  chrome.declarativeNetRequest.ResourceType.CSP_REPORT,
  chrome.declarativeNetRequest.ResourceType.MEDIA,
  chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
  chrome.declarativeNetRequest.ResourceType.OTHER,
];

export interface ActiveOverride {
  workerName: string;
  versionId: string;
}

function buildHeaderValue(workerName: string, versionId: string): string {
  return `${workerName}="${versionId}"`;
}

function parseHeaderValue(value: string): ActiveOverride | null {
  const match = /^([^=]+)="([^"]+)"$/.exec(value);
  if (!match) return null;

  const [, workerName, versionId] = match;
  if (!workerName || !versionId) return null;

  return { workerName, versionId };
}

// Host permission for the target origin is required before a modifyHeaders
// rule for it will take effect. Must be called from inside a user gesture
// handler (e.g. a button's onClick), not after an unrelated await chain.
export function requestOverrideHostPermission(hostname: string): Promise<boolean> {
  return chrome.permissions.request({ origins: [`*://${hostname}/*`] });
}

export async function getActiveOverride(hostname: string): Promise<ActiveOverride | null> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules({
    ruleIds: [hostnameToRuleId(hostname)],
  });
  const headerValue = rules[0]?.action.requestHeaders?.find(
    (header) => header.header === VERSION_OVERRIDE_HEADER,
  )?.value;

  return headerValue ? parseHeaderValue(headerValue) : null;
}

// Assumes requestOverrideHostPermission(hostname) has already resolved to true.
export async function enableVersionOverride(params: {
  hostname: string;
  workerName: string;
  versionId: string;
}): Promise<void> {
  const { hostname, workerName, versionId } = params;
  const ruleId = hostnameToRuleId(hostname);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
    addRules: [
      {
        id: ruleId,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: VERSION_OVERRIDE_HEADER,
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: buildHeaderValue(workerName, versionId),
            },
          ],
        },
        condition: {
          requestDomains: [hostname],
          resourceTypes: OVERRIDE_RESOURCE_TYPES,
        },
      },
    ],
  });
}

export async function disableVersionOverride(hostname: string): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [hostnameToRuleId(hostname)],
  });
}
