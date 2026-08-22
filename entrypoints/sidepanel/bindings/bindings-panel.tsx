import { useState } from 'react';
import { useBindings } from '@/entrypoints/sidepanel/bindings/use-bindings';
import {
  useBindingUsage,
  type BindingUsage,
} from '@/entrypoints/sidepanel/bindings/use-binding-usage';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { bindingDashboardUrl } from '@/shared/cloudflare-api/dashboard-links';
import type { WorkerBinding } from '@/shared/cloudflare-api/bindings';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface BindingsPanelProps {
  resolved: ResolvedWorker;
}

// Collapsed by default (<details>, no JS state needed for the collapse
// itself) — useful reference, not something worth taking up popup space on
// every open. Usage numbers (see use-binding-usage.ts) follow the same
// philosophy one level further: not fetched until the user actually expands
// this section.
export function BindingsPanel({ resolved }: BindingsPanelProps) {
  const state = useBindings(resolved);
  const [isOpen, setIsOpen] = useState(false);
  const usageByKey = useBindingUsage(
    resolved,
    state.status === 'ready' ? state.bindings : [],
    isOpen,
  );

  if (state.status === 'error') {
    return (
      <p className="text-sm text-red-600">
        {browser.i18n.getMessage(cloudflareErrorMessageKey(state.kind))}
      </p>
    );
  }

  if (state.status !== 'ready' || state.bindings.length === 0) {
    return null;
  }

  return (
    <details
      className="flex flex-col gap-2"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-xs font-medium text-neutral-400 uppercase">
        {browser.i18n.getMessage('bindingsHeading', String(state.bindings.length))}
      </summary>
      <ul className="flex flex-col gap-1">
        {state.bindings.map((binding, index) => {
          const dashboardUrl = bindingDashboardUrl(resolved.worker.accountId, binding);
          const usage = usageByKey[`${binding.type}:${binding.name}`];

          return (
            <li key={`${binding.type}-${binding.name}-${index}`} className="text-xs">
              {dashboardUrl ? (
                <a
                  href={dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col text-neutral-900 hover:underline"
                >
                  <BindingRow binding={binding} />
                </a>
              ) : (
                <div className="flex flex-col text-neutral-900">
                  <BindingRow binding={binding} />
                </div>
              )}
              {usage && <UsageLine usage={usage} />}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function BindingRow({ binding }: { binding: WorkerBinding }) {
  return (
    <div className="flex items-center justify-between">
      <span>{binding.name}</span>
      <span className="text-neutral-500">{binding.type.replace(/_/g, ' ')}</span>
    </div>
  );
}

function UsageLine({ usage }: { usage: BindingUsage }) {
  if (usage.kind === 'kv') {
    return (
      <p className="text-neutral-400">
        {browser.i18n.getMessage('bindingUsageKv', [
          usage.usage.requests.toLocaleString(),
          usage.usage.storedKeys.toLocaleString(),
          formatBytes(usage.usage.storedBytes),
        ])}
      </p>
    );
  }
  if (usage.kind === 'd1') {
    const { readQueries, writeQueries, storageBytes } = usage.usage;
    return (
      <p className="text-neutral-400">
        {storageBytes !== null
          ? browser.i18n.getMessage('bindingUsageD1WithStorage', [
              readQueries.toLocaleString(),
              writeQueries.toLocaleString(),
              formatBytes(storageBytes),
            ])
          : browser.i18n.getMessage('bindingUsageD1', [
              readQueries.toLocaleString(),
              writeQueries.toLocaleString(),
            ])}
      </p>
    );
  }
  return (
    <p className="text-neutral-400">
      {browser.i18n.getMessage('bindingUsageR2', [
        usage.usage.classAOperations.toLocaleString(),
        usage.usage.classBOperations.toLocaleString(),
        formatBytes(usage.usage.storageBytes),
      ])}
    </p>
  );
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[exponent]}`;
}
