import { Crosshair } from 'lucide-react';
import { VersionCombobox } from '@/entrypoints/sidepanel/version-switcher/version-combobox';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/utils';
import type { VersionRole } from '@/entrypoints/sidepanel/version-switcher/version-roles';
import type { DisplayVersion } from '@/shared/worker-panel/version-row';

interface ViewVersionSlotProps {
  mode: 'view';
  align: 'left' | 'right';
  version: DisplayVersion;
  role: VersionRole;
  // false hides the ⌖ entry entirely. An override forces *your* traffic to
  // one version of the deployment, so with only one version in it there is
  // nothing to force — the control would be a no-op. Progressive disclosure:
  // the entry appears only where the action does something.
  canPin: boolean;
  // This version's own error rate over 24h, or null when unavailable. During
  // a rollout "is the new version erroring" is the real question, and the
  // panel's overall figure dilutes it — a 6% failure on a 40% slice reads as
  // 2.6% overall. See shared/cloudflare-api/version-error-rates.ts.
  errorRate: number | null;
  isPinned: boolean;
  isPinBusy: boolean;
  previewUrl: string | null;
  onTogglePin: () => void;
}

interface EditVersionSlotProps {
  mode: 'edit';
  align: 'left' | 'right';
  candidates: DisplayVersion[];
  selected: DisplayVersion | null;
  onSelect: (version: DisplayVersion | null) => void;
  allowNone: boolean;
  disabled?: boolean;
}

type VersionSlotProps = ViewVersionSlotProps | EditVersionSlotProps;

export function VersionSlot(props: VersionSlotProps) {
  const isRight = props.align === 'right';
  const slotLabelKey = isRight ? 'deploymentControlSlotB' : 'deploymentControlSlotA';

  if (props.mode === 'edit') {
    return (
      <div
        className={cn('flex min-w-0 flex-1 flex-col gap-1.5', isRight && 'items-end text-right')}
      >
        <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
          {browser.i18n.getMessage(slotLabelKey)}
        </span>
        <VersionCombobox
          ariaLabel={browser.i18n.getMessage(slotLabelKey)}
          candidates={props.candidates}
          selected={props.selected}
          onSelect={props.onSelect}
          allowNone={props.allowNone}
          disabled={props.disabled}
        />
      </div>
    );
  }

  const { version, role, canPin, errorRate, isPinned, isPinBusy, previewUrl, onTogglePin } = props;
  const shortId = version.versionId.slice(0, 8);
  const idLabel = browser.i18n.getMessage('versionSwitcherVersionIdLabel', shortId);

  const pinButton = canPin ? (
    <Button
      type="button"
      size="icon"
      variant={isPinned ? 'default' : 'outline'}
      className="size-6 shrink-0"
      disabled={isPinBusy}
      title={browser.i18n.getMessage(isPinned ? 'deploymentBarUnpin' : 'deploymentBarPin')}
      onClick={onTogglePin}
    >
      <Crosshair className="size-3.5" />
    </Button>
  ) : null;

  const badges = (
    <>
      {/* Only "new this rollout" is worth a badge. "Kept" restates the
          default expectation — the incumbent is where traffic already was —
          and "role unclear" is noise. Marking just the exception is the same
          rule the tab strip's live dot follows. */}
      {role === 'new' && (
        <Badge
          variant="outline"
          className="shrink-0 border-primary/40 bg-primary/10 font-mono text-[9px] font-normal text-primary"
        >
          {browser.i18n.getMessage('deploymentBarRoleNew')}
        </Badge>
      )}
      {isPinned && (
        <Badge className="shrink-0 bg-primary font-mono text-[9px] font-normal text-primary-foreground">
          {browser.i18n.getMessage('deploymentBarPinned')}
        </Badge>
      )}
    </>
  );

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-1', isRight && 'items-end text-right')}>
      <div className={cn('flex flex-wrap items-center gap-1.5', isRight && 'justify-end')}>
        {!isRight && pinButton}
        {!isRight && badges}
        {isRight && badges}
        {isRight && pinButton}
      </div>
      <span className="truncate text-sm font-semibold text-foreground">
        {version.tag ?? idLabel}
      </span>
      <span className="truncate font-mono text-[10px] text-muted-foreground">{idLabel}</span>
      {errorRate !== null && (
        <span
          className={cn(
            'truncate font-mono text-[10px] tabular-nums',
            errorRate > 0 ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {browser.i18n.getMessage('versionErrorRateLabel', errorRate.toFixed(1))}
        </span>
      )}
      {/* No percentage here: it's read off the deployment bar directly above,
          where the number sits on the field it describes. Repeating it at
          the same size just competed with the bar for the same glance. */}
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
  );
}
