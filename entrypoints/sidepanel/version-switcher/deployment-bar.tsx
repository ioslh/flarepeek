import { useState } from 'react';
import { DeployConfirmDialog } from '@/entrypoints/sidepanel/version-switcher/deploy-confirm-dialog';
import { DeploymentBarTrack } from '@/entrypoints/sidepanel/version-switcher/deployment-bar-track';
import {
  type DeploymentBarWarningId,
  type WarningTone,
} from '@/entrypoints/sidepanel/version-switcher/deployment-bar-warnings';
import {
  formatPercentage,
  PERCENTAGE_LADDER,
} from '@/entrypoints/sidepanel/version-switcher/percentage-ladder';
import { useDeploymentBarEdit } from '@/entrypoints/sidepanel/version-switcher/use-deployment-bar-edit';
import { VersionSlot } from '@/entrypoints/sidepanel/version-switcher/version-slot';
import { computeVersionRoles } from '@/entrypoints/sidepanel/version-switcher/version-roles';
import { useDeploymentActions } from '@/entrypoints/sidepanel/version-switcher/use-deployment-actions';
import { useRecentVersions } from '@/entrypoints/sidepanel/version-switcher/use-recent-versions';
import { useDeploymentVersions } from '@/shared/worker-panel/use-deployment-versions';
import { usePreviewUrlConfig } from '@/shared/worker-panel/use-preview-url-config';
import { useVersionOverride } from '@/shared/worker-panel/use-version-override';
import { buildVersionPreviewUrl } from '@/shared/cloudflare-api/preview-url';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { PanelSection } from '@/entrypoints/sidepanel/panel-section';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';
import { VersionCombobox } from '@/entrypoints/sidepanel/version-switcher/version-combobox';
import { cn } from '@/shared/ui/utils';
import type { DisplayVersion } from '@/shared/worker-panel/version-row';
import type { ResolvedWorker } from '@/shared/worker-panel/use-worker-lookup';

interface DeploymentBarProps {
  resolved: ResolvedWorker;
  // Pinned hostname (not necessarily the live tab's) — see use-pinned-hostname.ts.
  hostname: string | null | undefined;
  refreshKey: number;
  onRefresh: () => void;
}

// Returned as a literal so callers type-check against browser.i18n.getMessage's
// generated overloads (a closed union of known message keys, not `string`) —
// same reasoning as shared/cloudflare-api/error-message-key.ts.
function warningMessageKey(id: DeploymentBarWarningId) {
  switch (id) {
    case 'retreat':
      return 'deploymentBarWarningRetreat';
    case 'push-to-full':
      return 'deploymentBarWarningPushToFull';
    case 'zero-still-pinnable':
      return 'deploymentBarWarningZeroPinnable';
    case 'slot-a-changed':
      return 'deploymentBarWarningSlotAChanged';
  }
}

const WARNING_TONE_CLASS: Record<WarningTone, string> = {
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  caution: 'border-primary/30 bg-primary/10 text-primary',
  info: 'border-border bg-muted text-muted-foreground',
};

export function DeploymentBar({ resolved, hostname, refreshKey, onRefresh }: DeploymentBarProps) {
  const deployment = useDeploymentVersions(resolved, refreshKey);
  const override = useVersionOverride(hostname ?? null);
  const previewConfig = usePreviewUrlConfig(resolved);
  const recentVersions = useRecentVersions(resolved);
  const deploymentActions = useDeploymentActions(resolved, onRefresh);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const live = deployment.status === 'ready' ? deployment.versions : [];
  const previous = deployment.status === 'ready' ? deployment.previousVersions : null;
  const boundaryTrail = deployment.status === 'ready' ? deployment.boundaryTrail : [];

  const metaById = new Map(
    recentVersions.status === 'ready' ? recentVersions.versions.map((v) => [v.id, v]) : [],
  );
  const liveDisplay: DisplayVersion[] = live.map((version) => {
    const meta = metaById.get(version.versionId);
    return {
      versionId: version.versionId,
      percentage: version.percentage,
      tag: meta?.tag ?? null,
      message: meta?.message ?? null,
      createdOn: meta?.createdOn ?? null,
      everDeployed: true,
    };
  });
  const candidateVersions: DisplayVersion[] =
    recentVersions.status === 'ready'
      ? recentVersions.versions.map((version) => ({
          versionId: version.id,
          percentage: null,
          tag: version.tag,
          message: version.message,
          createdOn: version.createdOn,
          everDeployed: version.everDeployed,
        }))
      : [];

  const roles = computeVersionRoles(live, previous);
  const editState = useDeploymentBarEdit({
    liveVersions: liveDisplay,
    candidates: candidateVersions,
  });

  const trimmedMessage = editState.message.trim() || null;

  if (deployment.status === 'loading' || deployment.status === 'idle') {
    return (
      <PanelSection>
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-14 flex-1" />
          <Skeleton className="h-14 flex-1" />
        </div>
      </PanelSection>
    );
  }

  if (deployment.status === 'error') {
    return (
      <PanelSection>
        <Alert variant="destructive">
          <AlertDescription>
            {browser.i18n.getMessage(cloudflareErrorMessageKey(deployment.kind))}
          </AlertDescription>
        </Alert>
      </PanelSection>
    );
  }

  // Never-deployed Worker: no split to view or drag, just a single-slot
  // picker that makes the first deployment at 100%.
  if (live.length === 0) {
    return (
      <PanelSection>
        <div>
          <p className="text-sm font-medium text-foreground">
            {browser.i18n.getMessage('deploymentBarEmptyTitle')}
          </p>
          <p className="text-xs text-muted-foreground">
            {browser.i18n.getMessage('deploymentBarEmptyDescription')}
          </p>
        </div>
        <VersionCombobox
          ariaLabel={browser.i18n.getMessage('deploymentControlSlotA')}
          candidates={editState.pickerCandidates}
          selected={editState.slotA}
          onSelect={editState.setSlotA}
          allowNone={false}
          disabled={deploymentActions.state.status === 'submitting'}
        />
        <Button
          disabled={deploymentActions.state.status === 'submitting' || !editState.slotA}
          onClick={() => setConfirmOpen(true)}
        >
          {browser.i18n.getMessage('deploymentControlDeploy')}
        </Button>
        <DeployConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          proposed={editState.proposed}
          versionLabels={editState.versionLabels}
          message={trimmedMessage}
          isSubmitting={deploymentActions.state.status === 'submitting'}
          onConfirm={() => {
            void deploymentActions.applySplit(editState.proposed, trimmedMessage);
            setConfirmOpen(false);
          }}
        />
        {deploymentActions.state.status === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>
              {browser.i18n.getMessage(cloudflareErrorMessageKey(deploymentActions.state.kind))}
            </AlertDescription>
          </Alert>
        )}
      </PanelSection>
    );
  }

  // live.length is 1 or 2 here — the 0 case returned above — so index 0
  // is always present; index 1 may or may not be, per hasSlotB.
  const slotALive = live[0]!;
  const slotBLive = live[1];
  const slotADisplay = liveDisplay[0]!;
  const slotBDisplay = liveDisplay[1];
  const roleA = roles[0]!;
  const roleB = roles[1];

  const hasSlotB = slotBLive !== undefined;
  const liveSlotBPercentage = slotBLive?.percentage ?? 0;
  const delta =
    mode === 'edit' && editState.slotB ? editState.draftPercentage - liveSlotBPercentage : 0;

  const headingKey =
    mode === 'edit'
      ? 'deploymentBarHeadingEdit'
      : hasSlotB
        ? 'deploymentBarHeadingDouble'
        : 'deploymentBarHeadingSingle';

  return (
    <PanelSection
      title={browser.i18n.getMessage(headingKey)}
      titleTone={mode === 'edit' ? 'accent' : 'default'}
      className="gap-3"
    >
      <DeploymentBarTrack
        percentageB={
          mode === 'edit'
            ? editState.slotB
              ? editState.draftPercentage
              : null
            : hasSlotB
              ? liveSlotBPercentage
              : null
        }
        boundaryTrail={boundaryTrail}
        editable={mode === 'edit'}
        disabled={deploymentActions.state.status === 'submitting'}
        onChangePercentageB={editState.setDraftPercentage}
      />

      <div className="flex items-start gap-3">
        {mode === 'edit' ? (
          <VersionSlot
            mode="edit"
            align="left"
            candidates={editState.pickerCandidates}
            selected={editState.slotA}
            onSelect={editState.setSlotA}
            allowNone={false}
            disabled={deploymentActions.state.status === 'submitting'}
          />
        ) : (
          <VersionSlot
            mode="view"
            align="left"
            version={slotADisplay}
            role={roleA}
            isPinned={override.activeVersionId === slotALive.versionId}
            isPinBusy={override.activation.status === 'requesting'}
            previewUrl={
              previewConfig ? buildVersionPreviewUrl(previewConfig, slotALive.versionId) : null
            }
            onTogglePin={() =>
              override.activeVersionId === slotALive.versionId
                ? void override.deactivate()
                : void override.activate(resolved.worker.scriptName, slotALive.versionId)
            }
          />
        )}

        {(mode === 'edit' || hasSlotB) &&
          (mode === 'edit' ? (
            <VersionSlot
              mode="edit"
              align="right"
              candidates={editState.pickerCandidates}
              selected={editState.slotB}
              onSelect={editState.selectSlotB}
              allowNone
              disabled={deploymentActions.state.status === 'submitting'}
            />
          ) : (
            // This branch only renders when hasSlotB is true (see the
            // `mode === 'edit' || hasSlotB` guard above), so slot B is
            // always present here even though TS can't see that through
            // the nested ternary.
            <VersionSlot
              mode="view"
              align="right"
              version={slotBDisplay!}
              role={roleB!}
              isPinned={override.activeVersionId === slotBLive!.versionId}
              isPinBusy={override.activation.status === 'requesting'}
              previewUrl={
                previewConfig ? buildVersionPreviewUrl(previewConfig, slotBLive!.versionId) : null
              }
              onTogglePin={() =>
                override.activeVersionId === slotBLive!.versionId
                  ? void override.deactivate()
                  : void override.activate(resolved.worker.scriptName, slotBLive!.versionId)
              }
            />
          ))}
      </div>

      {mode === 'view' && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {override.activeVersionId
            ? browser.i18n.getMessage('deploymentBarNotePinned')
            : hasSlotB
              ? browser.i18n.getMessage('deploymentBarNoteRandom')
              : browser.i18n.getMessage('deploymentBarNoteSingle')}
        </p>
      )}

      {mode === 'view' && override.activation.status === 'permission-denied' && (
        <p className="text-xs text-destructive">
          {browser.i18n.getMessage('versionSwitcherPermissionDenied')}
        </p>
      )}
      {mode === 'view' && override.activation.status === 'error' && (
        <p className="text-xs text-destructive">
          {browser.i18n.getMessage('versionSwitcherActivationError')}
        </p>
      )}

      {mode === 'edit' && editState.slotB && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
          <div className="flex flex-wrap gap-1.5">
            {PERCENTAGE_LADDER.map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={editState.draftPercentage === value ? 'default' : 'outline'}
                className="h-7 px-2 font-mono text-xs"
                disabled={deploymentActions.state.status === 'submitting'}
                onClick={() => editState.setDraftPercentage(value)}
              >
                {formatPercentage(value)}%
              </Button>
            ))}
          </div>

          <div className="font-mono text-xs">
            <span
              className={cn(
                delta > 0 && 'text-primary',
                delta < 0 && 'text-destructive',
                delta === 0 && 'text-muted-foreground',
              )}
            >
              {delta > 0
                ? browser.i18n.getMessage('deploymentBarDeltaAdvance', formatPercentage(delta))
                : delta < 0
                  ? browser.i18n.getMessage('deploymentBarDeltaRetreat', formatPercentage(-delta))
                  : browser.i18n.getMessage('deploymentBarDeltaNone')}
            </span>
            <span className="text-muted-foreground">
              {' · '}
              {delta === 0
                ? browser.i18n.getMessage('deploymentBarDeltaNoChange')
                : browser.i18n.getMessage(
                    'deploymentBarDeltaAffected',
                    formatPercentage(Math.abs(delta)),
                  )}
            </span>
          </div>

          {editState.warnings.map((warning) => (
            <div
              key={warning.id}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs leading-relaxed',
                WARNING_TONE_CLASS[warning.tone],
              )}
            >
              {browser.i18n.getMessage(warningMessageKey(warning.id))}
            </div>
          ))}
        </div>
      )}

      {mode === 'edit' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deployment-bar-message">
            {browser.i18n.getMessage('deploymentSplitMessagePlaceholder')}
          </Label>
          <Input
            id="deployment-bar-message"
            value={editState.message}
            disabled={deploymentActions.state.status === 'submitting'}
            onChange={(event) => editState.setMessage(event.target.value)}
            placeholder={browser.i18n.getMessage('deploymentSplitMessagePlaceholder')}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        {mode === 'edit' && (
          <Button
            disabled={
              deploymentActions.state.status === 'submitting' ||
              !editState.slotA ||
              editState.matchesLive
            }
            onClick={() => setConfirmOpen(true)}
          >
            {browser.i18n.getMessage('deploymentControlDeploy')}
          </Button>
        )}
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-xs text-muted-foreground"
          onClick={() => setMode((current) => (current === 'view' ? 'edit' : 'view'))}
        >
          {browser.i18n.getMessage(
            mode === 'edit' ? 'deploymentBarCollapse' : 'deploymentBarToggleEdit',
          )}
        </Button>
      </div>

      {deploymentActions.state.status === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>
            {browser.i18n.getMessage(cloudflareErrorMessageKey(deploymentActions.state.kind))}
          </AlertDescription>
        </Alert>
      )}

      <DeployConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        proposed={editState.proposed}
        versionLabels={editState.versionLabels}
        message={trimmedMessage}
        isSubmitting={deploymentActions.state.status === 'submitting'}
        onConfirm={() => {
          void deploymentActions.applySplit(editState.proposed, trimmedMessage);
          setConfirmOpen(false);
        }}
      />
    </PanelSection>
  );
}
