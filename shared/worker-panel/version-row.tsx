import type { DeploymentVersion } from '@/shared/cloudflare-api/deployments';

interface VersionRowProps {
  version: DeploymentVersion;
  isActive: boolean;
  isRequesting: boolean;
  previewUrl: string | null;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function VersionRow({
  version,
  isActive,
  isRequesting,
  previewUrl,
  onActivate,
  onDeactivate,
}: VersionRowProps) {
  return (
    <div className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2">
      <div className="flex flex-col">
        <span className="text-sm text-neutral-900">
          {browser.i18n.getMessage('versionSwitcherVersionIdLabel', version.versionId.slice(0, 8))}
        </span>
        <span className="text-xs text-neutral-500">
          {browser.i18n.getMessage('versionSwitcherPercentageLabel', String(version.percentage))}
        </span>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-orange-600 underline"
          >
            {browser.i18n.getMessage('versionSwitcherOpenPreview')}
          </a>
        )}
      </div>

      {isActive ? (
        <button
          type="button"
          onClick={onDeactivate}
          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
        >
          {browser.i18n.getMessage('versionSwitcherActive')}
        </button>
      ) : (
        <button
          type="button"
          onClick={onActivate}
          disabled={isRequesting}
          className="rounded border border-orange-600 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
        >
          {isRequesting
            ? browser.i18n.getMessage('versionSwitcherRequesting')
            : browser.i18n.getMessage('versionSwitcherActivate')}
        </button>
      )}
    </div>
  );
}
