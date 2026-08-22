import { Separator } from '@/shared/ui/separator';
import { VersionRow, type DisplayVersion } from '@/shared/worker-panel/version-row';
import { buildVersionPreviewUrl, type PreviewUrlConfig } from '@/shared/cloudflare-api/preview-url';

interface VersionsListProps {
  live: DisplayVersion[];
  recent: DisplayVersion[];
  activeVersionId: string | null;
  isActivationRequesting: boolean;
  previewConfig: PreviewUrlConfig | null;
  onActivate: (versionId: string) => void;
  onDeactivate: () => void;
}

// One unified list — a version is either currently live (grouped under a
// "Live now" label, with a traffic-percentage badge) or just a recent
// upload (no badge). Deliberately not two separate lists/cards: this is the
// whole point of the redesign — "deployed" and "not yet deployed" are both
// just versions, not two different kinds of thing.
export function VersionsList({
  live,
  recent,
  activeVersionId,
  isActivationRequesting,
  previewConfig,
  onActivate,
  onDeactivate,
}: VersionsListProps) {
  const renderRow = (version: DisplayVersion) => (
    <VersionRow
      key={version.versionId}
      version={version}
      isActive={activeVersionId === version.versionId}
      isRequesting={isActivationRequesting}
      previewUrl={previewConfig ? buildVersionPreviewUrl(previewConfig, version.versionId) : null}
      onActivate={() => onActivate(version.versionId)}
      onDeactivate={onDeactivate}
    />
  );

  return (
    <div className="flex flex-col gap-2">
      {live.length > 0 && (
        <>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {browser.i18n.getMessage('versionsListLiveHeading')}
          </p>
          {live.map(renderRow)}
          {recent.length > 0 && <Separator />}
        </>
      )}
      {recent.map(renderRow)}
    </div>
  );
}
