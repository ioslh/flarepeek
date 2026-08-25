export type WarningTone = 'danger' | 'caution' | 'info';

export type DeploymentBarWarningId =
  'retreat' | 'push-to-full' | 'zero-still-pinnable' | 'slot-a-changed' | 'affinity';

export interface DeploymentBarWarning {
  id: DeploymentBarWarningId;
  tone: WarningTone;
}

interface ComputeWarningsParams {
  // Slot A's live version id, if any (deployment[0]) — compared against the
  // draft's slot A to detect a full version swap rather than a gradual
  // rollout adjustment.
  liveSlotAVersionId: string | null;
  // Slot B's live percentage — 0 if there's no live slot B yet (a
  // single-version deployment). The baseline the delta/retreat check is
  // measured against.
  liveSlotBPercentage: number;
  draftSlotAVersionId: string | null;
  draftSlotBVersionId: string | null;
  draftPercentage: number;
}

// Pure derivation of which risk/info banners the edit state should show,
// given the draft the user is composing vs. what's actually live. Ported
// from the demo's warn.a/warn.w/warn.i banners.
export function computeDeploymentBarWarnings(
  params: ComputeWarningsParams,
): DeploymentBarWarning[] {
  const {
    liveSlotAVersionId,
    liveSlotBPercentage,
    draftSlotAVersionId,
    draftSlotBVersionId,
    draftPercentage,
  } = params;

  const warnings: DeploymentBarWarning[] = [];

  if (draftSlotBVersionId !== null) {
    if (draftPercentage < liveSlotBPercentage) {
      warnings.push({ id: 'retreat', tone: 'danger' });
    }
    if (draftPercentage === 100) {
      warnings.push({ id: 'push-to-full', tone: 'caution' });
    }
    if (draftPercentage === 0) {
      warnings.push({ id: 'zero-still-pinnable', tone: 'info' });
    }
  }

  if (
    liveSlotAVersionId !== null &&
    draftSlotAVersionId !== null &&
    draftSlotAVersionId !== liveSlotAVersionId
  ) {
    warnings.push({ id: 'slot-a-changed', tone: 'danger' });
  }

  // The moment traffic actually starts being split, consecutive requests
  // from one user can land on different versions. That's the point worth
  // flagging — not "you moved to two versions", since a two-version
  // deployment sitting at 0% is still serving everything from one of them.
  // So this fires on 1→2 *and* on 0%→25%, and stays quiet once a real split
  // already exists (the decision was made a deploy ago).
  const liveIsUnsplit = liveSlotBPercentage === 0 || liveSlotBPercentage === 100;
  const draftCreatesSplit =
    draftSlotBVersionId !== null && draftPercentage > 0 && draftPercentage < 100;
  if (liveIsUnsplit && draftCreatesSplit) {
    warnings.push({ id: 'affinity', tone: 'danger' });
  }

  return warnings;
}
