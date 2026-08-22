import { useBindings } from '@/entrypoints/sidepanel/bindings/use-bindings';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { bindingDashboardUrl } from '@/shared/cloudflare-api/dashboard-links';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface BindingsPanelProps {
  resolved: ResolvedWorker;
}

// Collapsed by default (<details>, no JS state needed) — useful reference,
// not something worth taking up popup space on every open.
export function BindingsPanel({ resolved }: BindingsPanelProps) {
  const state = useBindings(resolved);

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
    <details className="flex flex-col gap-2">
      <summary className="cursor-pointer text-xs font-medium text-neutral-400 uppercase">
        {browser.i18n.getMessage('bindingsHeading', String(state.bindings.length))}
      </summary>
      <ul className="flex flex-col gap-1">
        {state.bindings.map((binding, index) => {
          const dashboardUrl = bindingDashboardUrl(resolved.worker.accountId, binding);

          return (
            <li key={`${binding.type}-${binding.name}-${index}`} className="text-xs">
              {dashboardUrl ? (
                <a
                  href={dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-neutral-900 hover:underline"
                >
                  <span>{binding.name}</span>
                  <span className="text-neutral-500">{binding.type.replace(/_/g, ' ')}</span>
                </a>
              ) : (
                <div className="flex items-center justify-between text-neutral-900">
                  <span>{binding.name}</span>
                  <span className="text-neutral-500">{binding.type.replace(/_/g, ' ')}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
