import { useRecentVersions } from '@/entrypoints/sidepanel/version-switcher/use-recent-versions';
import { SectionCard } from '@/entrypoints/sidepanel/section-card';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { buildVersionPreviewUrl, type PreviewUrlConfig } from '@/shared/cloudflare-api/preview-url';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';
import type { DeploymentVersionsState } from '@/shared/worker-panel/use-deployment-versions';

interface RecentVersionsPanelProps {
  resolved: ResolvedWorker;
  deployment: DeploymentVersionsState;
  previewConfig: PreviewUrlConfig | null;
}

export function RecentVersionsPanel({
  resolved,
  deployment,
  previewConfig,
}: RecentVersionsPanelProps) {
  const state = useRecentVersions(resolved, deployment);

  if (state.status === 'error') {
    return (
      <p className="text-sm text-red-600">
        {browser.i18n.getMessage(cloudflareErrorMessageKey(state.kind))}
      </p>
    );
  }

  // Nothing extra beyond what's already shown in the deployed versions list.
  if (state.status !== 'ready' || state.versions.length === 0) {
    return null;
  }

  return (
    <SectionCard tone="muted">
      <p className="text-xs font-medium text-neutral-400 uppercase">
        {browser.i18n.getMessage('recentVersionsHeading')}
      </p>
      <ul className="flex flex-col gap-1.5">
        {state.versions.map((version) => {
          const previewUrl = previewConfig
            ? buildVersionPreviewUrl(previewConfig, version.id)
            : null;

          return (
            <li
              key={version.id}
              className="flex items-center justify-between rounded border border-neutral-200 px-2 py-1.5"
            >
              <div className="flex flex-col">
                <span className="text-xs text-neutral-900">
                  {browser.i18n.getMessage('versionSwitcherVersionIdLabel', version.id.slice(0, 8))}
                </span>
                {version.authorEmail && (
                  <span className="text-xs text-neutral-500">{version.authorEmail}</span>
                )}
                {!version.everDeployed && (
                  <span className="text-xs text-amber-600">
                    {browser.i18n.getMessage('recentVersionsNeverDeployed')}
                  </span>
                )}
              </div>

              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-orange-600 underline"
                >
                  {browser.i18n.getMessage('versionSwitcherOpenPreview')}
                </a>
              ) : (
                <span className="text-xs text-neutral-400">
                  {browser.i18n.getMessage('recentVersionsNoPreview')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
