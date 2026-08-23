import { Crosshair } from 'lucide-react';
import { VersionCombobox } from '@/entrypoints/sidepanel/version-switcher/version-combobox';
import { formatPercentage } from '@/entrypoints/sidepanel/version-switcher/percentage-ladder';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/utils';
import type { VersionRole } from '@/entrypoints/sidepanel/version-switcher/version-roles';
import type { DisplayVersion } from '@/shared/worker-panel/version-row';

// Returned as a literal so callers type-check against browser.i18n.getMessage's
// generated overloads (a closed union of known message keys, not `string`) —
// same reasoning as shared/cloudflare-api/error-message-key.ts.
function roleMessageKey(role: VersionRole) {
  switch (role) {
    case 'keep':
      return 'deploymentBarRoleKeep';
    case 'new':
      return 'deploymentBarRoleNew';
    case 'unknown':
      return 'deploymentBarRoleUnknown';
  }
}

// slotColorClass mirrors the bar track: slot A (left) is always the
// teal/emerald side, slot B (right) is always the brand-orange side —
// color is tied to position, not to which version happens to be "new".
const SLOT_TEXT_COLOR: Record<'left' | 'right', string> = {
  left: 'text-emerald-700',
  right: 'text-primary',
};

interface ViewVersionSlotProps {
  mode: 'view';
  align: 'left' | 'right';
  version: DisplayVersion;
  percentage: number;
  role: VersionRole;
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

  const { version, percentage, role, isPinned, isPinBusy, previewUrl, onTogglePin } = props;
  const shortId = version.versionId.slice(0, 8);
  const idLabel = browser.i18n.getMessage('versionSwitcherVersionIdLabel', shortId);

  const pinButton = (
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
  );

  const badges = (
    <>
      <Badge variant="outline" className="shrink-0 font-mono text-[9px] font-normal">
        {browser.i18n.getMessage(roleMessageKey(role))}
      </Badge>
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
      <span
        className={cn('font-mono text-2xl leading-none font-bold', SLOT_TEXT_COLOR[props.align])}
      >
        {formatPercentage(percentage)}
        <span className="ml-0.5 text-xs font-normal opacity-60">%</span>
      </span>
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
