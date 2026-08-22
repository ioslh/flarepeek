import { useEffect, useState } from 'react';
import { DeployConfirmDialog } from '@/entrypoints/sidepanel/version-switcher/deploy-confirm-dialog';
import { VersionCombobox } from '@/entrypoints/sidepanel/version-switcher/version-combobox';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Slider } from '@/shared/ui/slider';
import type { DeploymentVersion } from '@/shared/cloudflare-api/deployments';
import type { DisplayVersion } from '@/shared/worker-panel/version-row';

interface DeploymentControlProps {
  // Currently live versions (1 or 2, or 0 for a Worker that's never been
  // deployed) — seeds the two slots below, and is what "nothing changed yet"
  // gets compared against to decide whether Deploy is enabled.
  liveVersions: DisplayVersion[];
  // Recently-uploaded versions to pick from — not limited to ones that have
  // ever been deployed (see version-switcher.tsx: this is the same fetch
  // that feeds the unified versions list, reused here rather than a second
  // request).
  candidates: DisplayVersion[];
  isSubmitting: boolean;
  onApply: (versions: DeploymentVersion[], message: string | null) => void;
}

function labelFor(version: DisplayVersion): string {
  return (
    version.tag ??
    browser.i18n.getMessage('versionSwitcherVersionIdLabel', version.versionId.slice(0, 8))
  );
}

// Replaces the old "Apply split" control (fixed to whichever two versions
// happened to already be live) with one that can compose *any* 1-2 of the
// last ~100 eligible versions — confirmed against a real account that
// deployments.create() has no requirement that either slot overlap with
// what's currently deployed. Slot A always needs a version chosen; Slot B
// can be "None", meaning "Slot A gets 100%" — that's the same action the old
// "Set to 100%" buttons did, now just a state of this one control instead of
// a separate button.
export function DeploymentControl({
  liveVersions,
  candidates,
  isSubmitting,
  onApply,
}: DeploymentControlProps) {
  const [slotA, setSlotA] = useState<DisplayVersion | null>(liveVersions[0] ?? null);
  const [slotB, setSlotB] = useState<DisplayVersion | null>(liveVersions[1] ?? null);
  const [primaryPercentage, setPrimaryPercentage] = useState(liveVersions[0]?.percentage ?? 100);
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Re-seed the slots when the *actual* live state changes (e.g. after a
  // successful deploy, or a manual refresh) — keyed on value, not the
  // `liveVersions` array's object identity, since version-switcher.tsx
  // builds a fresh array every render and this must NOT reset the user's
  // in-progress picks on every unrelated re-render of that parent.
  const liveVersionsKey = liveVersions.map((v) => `${v.versionId}:${v.percentage}`).join(',');
  useEffect(() => {
    setSlotA(liveVersions[0] ?? null);
    setSlotB(liveVersions[1] ?? null);
    setPrimaryPercentage(liveVersions[0]?.percentage ?? 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveVersionsKey is the intentional, value-based proxy for liveVersions here (see comment above)
  }, [liveVersionsKey]);

  // Candidates should always include whatever's actually live, even if it
  // fell outside the fetched "recent ~40" batch — otherwise the combobox
  // could show a selection with no matching entry to display as checked.
  const candidateIds = new Set(candidates.map((v) => v.versionId));
  const pickerCandidates = [
    ...liveVersions.filter((v) => !candidateIds.has(v.versionId)),
    ...candidates,
  ];

  const trimmedMessage = message.trim() || null;
  const proposed: DeploymentVersion[] = slotA
    ? slotB
      ? [
          { versionId: slotA.versionId, percentage: primaryPercentage },
          { versionId: slotB.versionId, percentage: 100 - primaryPercentage },
        ]
      : [{ versionId: slotA.versionId, percentage: 100 }]
    : [];

  const liveByIdPercentage = new Map(liveVersions.map((v) => [v.versionId, v.percentage]));
  const matchesLive =
    proposed.length === liveVersions.length &&
    proposed.every((v) => liveByIdPercentage.get(v.versionId) === v.percentage);

  const versionLabels = new Map(
    [slotA, slotB]
      .filter((v): v is DisplayVersion => v !== null)
      .map((v) => [v.versionId, labelFor(v)]),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>{browser.i18n.getMessage('deploymentControlSlotA')}</Label>
        <VersionCombobox
          ariaLabel={browser.i18n.getMessage('deploymentControlSlotA')}
          candidates={pickerCandidates}
          selected={slotA}
          onSelect={setSlotA}
          allowNone={false}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{browser.i18n.getMessage('deploymentControlSlotB')}</Label>
        <VersionCombobox
          ariaLabel={browser.i18n.getMessage('deploymentControlSlotB')}
          candidates={pickerCandidates}
          selected={slotB}
          onSelect={setSlotB}
          allowNone
          disabled={isSubmitting}
        />
      </div>

      {slotA && slotB && (
        <div className="flex flex-col gap-2">
          <Slider
            value={[primaryPercentage]}
            min={0}
            max={100}
            step={1}
            disabled={isSubmitting}
            onValueChange={([value]) => setPrimaryPercentage(value ?? primaryPercentage)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{primaryPercentage}%</span>
            <span>{100 - primaryPercentage}%</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="deployment-message">
          {browser.i18n.getMessage('deploymentSplitMessagePlaceholder')}
        </Label>
        <Input
          id="deployment-message"
          value={message}
          disabled={isSubmitting}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={browser.i18n.getMessage('deploymentSplitMessagePlaceholder')}
        />
      </div>

      <Button disabled={isSubmitting || !slotA || matchesLive} onClick={() => setConfirmOpen(true)}>
        {browser.i18n.getMessage('deploymentControlDeploy')}
      </Button>

      <DeployConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        proposed={proposed}
        versionLabels={versionLabels}
        message={trimmedMessage}
        isSubmitting={isSubmitting}
        onConfirm={() => {
          onApply(proposed, trimmedMessage);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
