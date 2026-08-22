import { useEffect, useState } from 'react';
import { ConfirmButton } from '@/entrypoints/sidepanel/version-switcher/confirm-button';
import type { DeploymentVersion } from '@/shared/cloudflare-api/deployments';

interface DeploymentSplitControlProps {
  versions: DeploymentVersion[];
  isSubmitting: boolean;
  onApply: (versions: DeploymentVersion[]) => void;
}

const applyButtonClass =
  'rounded border border-orange-600 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50';
const confirmButtonClass =
  'rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50';

// Meaningful only for an active two-version split; renders nothing otherwise.
// Every button here writes real production traffic — see
// shared/cloudflare-api/deployments.ts and use-deployment-actions.ts.
export function DeploymentSplitControl({
  versions,
  isSubmitting,
  onApply,
}: DeploymentSplitControlProps) {
  const [first, second] = versions;
  return first && second ? (
    <DeploymentSplitControlBody
      first={first}
      second={second}
      isSubmitting={isSubmitting}
      onApply={onApply}
    />
  ) : null;
}

interface DeploymentSplitControlBodyProps {
  first: DeploymentVersion;
  second: DeploymentVersion;
  isSubmitting: boolean;
  onApply: (versions: DeploymentVersion[]) => void;
}

function DeploymentSplitControlBody({
  first,
  second,
  isSubmitting,
  onApply,
}: DeploymentSplitControlBodyProps) {
  const [primaryPercentage, setPrimaryPercentage] = useState(first.percentage);

  useEffect(() => {
    setPrimaryPercentage(first.percentage);
  }, [first.percentage]);

  return (
    <div className="flex flex-col gap-2 border-t border-neutral-200 pt-2">
      <p className="text-xs font-medium text-neutral-400 uppercase">
        {browser.i18n.getMessage('deploymentSplitHeading')}
      </p>

      <input
        type="range"
        min={0}
        max={100}
        value={primaryPercentage}
        disabled={isSubmitting}
        onChange={(event) => setPrimaryPercentage(Number(event.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-neutral-600">
        <span>
          {browser.i18n.getMessage('versionSwitcherVersionIdLabel', first.versionId.slice(0, 8))}:{' '}
          {primaryPercentage}%
        </span>
        <span>
          {browser.i18n.getMessage('versionSwitcherVersionIdLabel', second.versionId.slice(0, 8))}:{' '}
          {100 - primaryPercentage}%
        </span>
      </div>

      <ConfirmButton
        label={browser.i18n.getMessage('deploymentSplitApply')}
        confirmLabel={browser.i18n.getMessage('deploymentSplitConfirm')}
        disabled={isSubmitting || primaryPercentage === first.percentage}
        onConfirm={() =>
          onApply([
            { versionId: first.versionId, percentage: primaryPercentage },
            { versionId: second.versionId, percentage: 100 - primaryPercentage },
          ])
        }
        className={applyButtonClass}
        confirmClassName={confirmButtonClass}
      />

      <div className="flex gap-2">
        <ConfirmButton
          label={browser.i18n.getMessage('deploymentSplitSetFull', first.versionId.slice(0, 8))}
          confirmLabel={browser.i18n.getMessage('deploymentSplitConfirm')}
          disabled={isSubmitting}
          onConfirm={() => onApply([{ versionId: first.versionId, percentage: 100 }])}
          className={applyButtonClass}
          confirmClassName={confirmButtonClass}
        />
        <ConfirmButton
          label={browser.i18n.getMessage('deploymentSplitSetFull', second.versionId.slice(0, 8))}
          confirmLabel={browser.i18n.getMessage('deploymentSplitConfirm')}
          disabled={isSubmitting}
          onConfirm={() => onApply([{ versionId: second.versionId, percentage: 100 }])}
          className={applyButtonClass}
          confirmClassName={confirmButtonClass}
        />
      </div>
    </div>
  );
}
