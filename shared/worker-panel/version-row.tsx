import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

export interface DisplayVersion {
  versionId: string;
  // null = not currently part of the live deployment (a "recent" row in the
  // unified versions list, see versions-list.tsx).
  percentage: number | null;
  tag: string | null;
  message: string | null;
  createdOn: string | null;
  // null = unknown — popup never fetches deployment history at all (see
  // popup-app.tsx), so it can't say either way.
  everDeployed: boolean | null;
}

interface VersionRowProps {
  version: DisplayVersion;
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
  const shortId = version.versionId.slice(0, 8);
  const idLabel = browser.i18n.getMessage('versionSwitcherVersionIdLabel', shortId);

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {version.tag ?? idLabel}
          </span>
          {version.percentage !== null && (
            <Badge variant="secondary" className="shrink-0">
              {browser.i18n.getMessage(
                'versionSwitcherPercentageLabel',
                String(version.percentage),
              )}
            </Badge>
          )}
        </div>
        {version.everDeployed === false && (
          <Badge
            variant="outline"
            title={browser.i18n.getMessage('recentVersionsNeverDeployed')}
            className="max-w-full gap-1 border-amber-300 bg-amber-50 text-amber-700"
          >
            <AlertTriangle className="size-3 shrink-0" />
            <span className="truncate">
              {browser.i18n.getMessage('recentVersionsNeverDeployed')}
            </span>
          </Badge>
        )}
        {version.tag && <span className="truncate text-xs text-muted-foreground">{idLabel}</span>}
        {version.message && (
          <span className="truncate text-xs text-muted-foreground italic">{version.message}</span>
        )}
        {version.createdOn && (
          <span className="truncate text-xs text-muted-foreground">
            {browser.i18n.getMessage(
              'versionSwitcherUploadedLabel',
              new Date(version.createdOn).toLocaleString(),
            )}
          </span>
        )}
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline"
          >
            {browser.i18n.getMessage('versionSwitcherOpenPreview')}
          </a>
        )}
      </div>

      {isActive ? (
        <Button
          size="sm"
          className="shrink-0 bg-green-600 text-white hover:bg-green-700"
          onClick={onDeactivate}
        >
          {browser.i18n.getMessage('versionSwitcherActive')}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-primary text-primary hover:text-primary"
          disabled={isRequesting}
          onClick={onActivate}
        >
          {isRequesting
            ? browser.i18n.getMessage('versionSwitcherRequesting')
            : browser.i18n.getMessage('versionSwitcherActivate')}
        </Button>
      )}
    </div>
  );
}
