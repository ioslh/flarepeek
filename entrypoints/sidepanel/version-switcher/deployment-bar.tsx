import { useState } from 'react';
import { DeploymentHistoryMenu } from '@/entrypoints/sidepanel/version-switcher/deployment-history-menu';
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
import { HoldToConfirmButton } from '@/entrypoints/sidepanel/version-switcher/hold-to-confirm-button';
import { OverrideModeBar } from '@/entrypoints/sidepanel/version-switcher/override-mode-bar';
import { VersionSlot } from '@/entrypoints/sidepanel/version-switcher/version-slot';
import { computeVersionRoles } from '@/entrypoints/sidepanel/version-switcher/version-roles';
import { useDeploymentActions } from '@/entrypoints/sidepanel/version-switcher/use-deployment-actions';
import { useRecentVersions } from '@/shared/worker-panel/use-recent-versions';
import { useVersionErrorRates } from '@/entrypoints/sidepanel/version-switcher/use-version-error-rates';
import { useDeploymentVersions } from '@/shared/worker-panel/use-deployment-versions';
import { usePreviewUrlConfig } from '@/shared/worker-panel/use-preview-url-config';
import { useVersionOverride } from '@/shared/worker-panel/use-version-override';
import { buildVersionPreviewUrl } from '@/shared/cloudflare-api/preview-url';
import { workerDeploymentHistoryUrl } from '@/shared/cloudflare-api/dashboard-links';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { PanelSection } from '@/entrypoints/sidepanel/panel-section';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/ui/utils';
import type { DisplayVersion } from '@/shared/worker-panel/display-version';
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
    case 'affinity':
      return 'deploymentBarWarningAffinity';
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
  const versionErrorRates = useVersionErrorRates(resolved, refreshKey);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const live = deployment.status === 'ready' ? deployment.versions : [];
  const previous = deployment.status === 'ready' ? deployment.previousVersions : null;
  const boundaryTrail = deployment.status === 'ready' ? deployment.boundaryTrail : [];
  const history = deployment.status === 'ready' ? deployment.history : [];

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
      authorEmail: meta?.authorEmail ?? null,
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
          authorEmail: version.authorEmail,
        }))
      : [];

  const errorRateByVersion = new Map(
    (versionErrorRates?.byVersion ?? []).map((entry) => [entry.versionId, entry.errorRate]),
  );

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

  // Never-deployed Worker: there is no split to show, but the way *out* of
  // that state is the same edit surface as any other change — two pickers
  // with slot B optional — rather than a one-off single-picker form. Same
  // controls, same hold-to-confirm gate, one code path to reason about.
  if (live.length === 0) {
    return (
      <PanelSection className="gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {browser.i18n.getMessage('deploymentBarEmptyTitle')}
          </p>
          <p className="text-xs text-muted-foreground">
            {browser.i18n.getMessage('deploymentBarEmptyDescription')}
          </p>
        </div>

        <div className="flex items-start gap-3">
          <VersionSlot
            mode="edit"
            align="left"
            candidates={editState.pickerCandidates}
            selected={editState.slotA}
            onSelect={editState.setSlotA}
            allowNone={false}
            disabled={deploymentActions.state.status === 'submitting'}
          />
          <VersionSlot
            mode="edit"
            align="right"
            candidates={editState.pickerCandidates}
            selected={editState.slotB}
            onSelect={editState.selectSlotB}
            allowNone
            disabled={deploymentActions.state.status === 'submitting'}
          />
        </div>

        <HoldToConfirmButton
          label={browser.i18n.getMessage('deploymentBarHoldDeploy')}
          ariaLabel={browser.i18n.getMessage('deploymentControlDeploy')}
          disabled={deploymentActions.state.status === 'submitting' || !editState.slotA}
          onConfirm={() => void deploymentActions.applySplit(editState.proposed, trimmedMessage)}
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

  const pinnedDisplay =
    override.activeVersionId === null
      ? null
      : (liveDisplay.find((version) => version.versionId === override.activeVersionId) ?? null);

  return (
    <PanelSection
      titleSlot={
        <DeploymentHistoryMenu
          history={history}
          currentId={history[0]?.id ?? ''}
          historyHref={workerDeploymentHistoryUrl(
            resolved.worker.accountId,
            resolved.worker.scriptName,
          )}
          tone={mode === 'edit' ? 'accent' : 'default'}
        />
      }
      action={
        mode === 'view' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode('edit')}
          >
            {browser.i18n.getMessage('deploymentBarToggleEdit')}
          </Button>
        ) : null
      }
      className="gap-3"
      banner={
        pinnedDisplay && (
          <OverrideModeBar
            versionLabel={pinnedDisplay.tag ?? pinnedDisplay.versionId.slice(0, 8)}
            onClear={() => void override.deactivate()}
          />
        )
      }
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
            canPin={hasSlotB}
            errorRate={errorRateByVersion.get(slotALive.versionId) ?? null}
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
              canPin
              errorRate={errorRateByVersion.get(slotBLive!.versionId) ?? null}
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

      {/* Where these numbers come from, stated plainly. The per-version
          rates and the 24h totals below them come from different datasets
          with different sampling, so they need not add up — printing them
          side by side without saying so would invite exactly the wrong
          inference. */}
      {mode === 'view' && versionErrorRates !== null && (
        <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">
          {browser.i18n.getMessage('versionErrorRateSource')}
          {versionErrorRates.unattributedRate >= 1 &&
            ` ${browser.i18n.getMessage(
              'versionErrorRateUnattributed',
              versionErrorRates.unattributedRate.toFixed(0),
            )}`}
        </p>
      )}

      {/* The pinned case is carried by OverrideModeBar above, so this only
          covers the two unpinned states. Single-version says nothing about
          pinning at all — with one version there is nothing to pin to, and
          the ⌖ buttons are hidden for the same reason. */}
      {mode === 'view' && !override.activeVersionId && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {hasSlotB
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
        <Input
          aria-label={browser.i18n.getMessage('deploymentSplitMessagePlaceholder')}
          value={editState.message}
          disabled={deploymentActions.state.status === 'submitting'}
          onChange={(event) => editState.setMessage(event.target.value)}
          placeholder={browser.i18n.getMessage('deploymentSplitMessagePlaceholder')}
        />
      )}

      {/* Discard sits beside the deploy button, not up in the heading: the
          only way out of an edit that will change live traffic belongs next
          to the decision, and "discard" says what it does where "collapse"
          made it sound like folding a panel away. */}
      {mode === 'edit' && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deploymentActions.state.status === 'submitting'}
            onClick={() => setMode('view')}
          >
            {browser.i18n.getMessage('deploymentBarDiscard')}
          </Button>
          <HoldToConfirmButton
            label={browser.i18n.getMessage(
              delta < 0 ? 'deploymentBarHoldRetreat' : 'deploymentBarHoldDeploy',
            )}
            ariaLabel={browser.i18n.getMessage('deploymentControlDeploy')}
            danger={delta < 0}
            disabled={
              deploymentActions.state.status === 'submitting' ||
              !editState.slotA ||
              editState.matchesLive
            }
            onConfirm={() => {
              void deploymentActions.applySplit(editState.proposed, trimmedMessage);
              setMode('view');
            }}
          />
        </div>
      )}

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
