import { useEffect, useState } from 'react';
import { computeDeploymentBarWarnings } from '@/entrypoints/sidepanel/version-switcher/deployment-bar-warnings';
import type { DeploymentVersion } from '@/shared/cloudflare-api/deployments';
import type { DisplayVersion } from '@/shared/worker-panel/display-version';

function labelFor(version: DisplayVersion): string {
  return (
    version.tag ??
    browser.i18n.getMessage('versionSwitcherVersionIdLabel', version.versionId.slice(0, 8))
  );
}

interface UseDeploymentBarEditParams {
  // Currently live versions (1 or 2, or 0 for a never-deployed Worker) —
  // seeds the draft below, and is what "nothing changed yet" gets compared
  // against.
  liveVersions: DisplayVersion[];
  // Recently-uploaded versions to pick from, not yet deduped against
  // liveVersions (see pickerCandidates below).
  candidates: DisplayVersion[];
}

// The draft state behind the bar's edit mode: which version occupies each
// slot and what share of traffic slot B gets. Slot A always needs a
// version; slot B being null means "slot A gets 100%" — not a third state
// to track separately (the same action the old "Set to 100%" button did).
export function useDeploymentBarEdit({ liveVersions, candidates }: UseDeploymentBarEditParams) {
  const [slotA, setSlotA] = useState<DisplayVersion | null>(liveVersions[0] ?? null);
  const [slotB, setSlotB] = useState<DisplayVersion | null>(liveVersions[1] ?? null);
  const [draftPercentage, setDraftPercentage] = useState(liveVersions[1]?.percentage ?? 0);
  const [message, setMessage] = useState('');

  // Re-seed the draft when the *actual* live state changes (e.g. after a
  // successful deploy, or a manual refresh) — keyed on value, not
  // liveVersions' array identity, since the caller builds a fresh array
  // every render and this must not reset in-progress picks on every
  // unrelated re-render.
  const liveVersionsKey = liveVersions.map((v) => `${v.versionId}:${v.percentage}`).join(',');
  useEffect(() => {
    setSlotA(liveVersions[0] ?? null);
    setSlotB(liveVersions[1] ?? null);
    setDraftPercentage(liveVersions[1]?.percentage ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveVersionsKey is the intentional, value-based proxy for liveVersions here (see comment above)
  }, [liveVersionsKey]);

  // Picking a fresh version for slot B starts as a smoke test (0%) rather
  // than silently carrying over whatever percentage was drafted for a
  // different version.
  const selectSlotB = (version: DisplayVersion | null) => {
    setSlotB(version);
    setDraftPercentage(0);
  };

  const candidateIds = new Set(candidates.map((v) => v.versionId));
  const pickerCandidates = [
    ...liveVersions.filter((v) => !candidateIds.has(v.versionId)),
    ...candidates,
  ];

  const proposed: DeploymentVersion[] = slotA
    ? slotB
      ? [
          { versionId: slotA.versionId, percentage: 100 - draftPercentage },
          { versionId: slotB.versionId, percentage: draftPercentage },
        ]
      : [{ versionId: slotA.versionId, percentage: 100 }]
    : [];

  const liveByIdPercentage = new Map(liveVersions.map((v) => [v.versionId, v.percentage]));
  const matchesLive =
    proposed.length === liveVersions.length &&
    proposed.every((v) => liveByIdPercentage.get(v.versionId) === v.percentage);

  const warnings = computeDeploymentBarWarnings({
    liveSlotAVersionId: liveVersions[0]?.versionId ?? null,
    liveSlotBPercentage: liveVersions[1]?.percentage ?? 0,
    draftSlotAVersionId: slotA?.versionId ?? null,
    draftSlotBVersionId: slotB?.versionId ?? null,
    draftPercentage,
  });

  const versionLabels = new Map(
    [slotA, slotB]
      .filter((v): v is DisplayVersion => v !== null)
      .map((v) => [v.versionId, labelFor(v)]),
  );

  return {
    slotA,
    setSlotA,
    slotB,
    selectSlotB,
    draftPercentage,
    setDraftPercentage,
    message,
    setMessage,
    pickerCandidates,
    proposed,
    matchesLive,
    warnings,
    versionLabels,
  };
}
