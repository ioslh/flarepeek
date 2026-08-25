import { AddPanelTabPopover } from '@/entrypoints/sidepanel/tabs/add-panel-tab-popover';
import type { PinnedTab } from '@/shared/storage/pinned-tabs-storage';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/ui/utils';
import { Pin, X } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';

interface PanelTabStripProps {
  pinnedTabs: PinnedTab[];
  dynamicHostname: string | null | undefined;
  activeHostname: string | null | undefined;
  isActiveDynamic: boolean;
  onSelectPinned: (hostname: string) => void;
  onSelectDynamic: () => void;
  onUnpin: (hostname: string) => void;
  onPinDynamic: () => void;
  onAddManual: (hostname: string) => void;
}

interface TabEntryAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

interface TabEntryProps {
  hostname: string;
  isActive: boolean;
  onSelect: () => void;
  action?: TabEntryAction;
  // Marks the one tab whose content the browser drives rather than the user
  // — rendered as a small "live" dot before the hostname. Exactly one tab is
  // ever live, so marking that single exception is cheaper and reads
  // stronger than badging every pinned tab instead.
  isLive?: boolean;
}

// One tab, pinned or dynamic — deliberately near-identical rendering for
// both: plain text only, accent-colored when active, no favicon, no
// background/border at any state. The row's action (unpin's ✕, the dynamic
// tab's pin) sits *after* the text and is collapsed to zero width until
// hover, so a resting tab is nothing but its hostname (plus the live dot,
// for the dynamic one).
function TabEntry({ hostname, isActive, onSelect, action, isLive }: TabEntryProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect();
  };

  const liveLabel = browser.i18n.getMessage('panelTabLiveLabel');

  return (
    <div
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className="group flex shrink-0 cursor-pointer items-center rounded-md py-1"
    >
      {isLive && (
        <>
          {/* bg-current so the dot simply inherits whatever state the
              hostname text is in (accent when active, neutral otherwise) —
              no second color to keep in sync. The tooltip makes the marker
              self-explaining on hover; it's the styled one rather than a
              native `title` so it matches the action buttons' tooltips
              sitting right beside it in the same row. The dot itself stays
              aria-hidden — the sr-only sibling is what carries the meaning
              for assistive tech, since a decorative span isn't focusable
              and so would never announce the tooltip. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                aria-hidden="true"
                className={cn(
                  'mr-1.5 size-1.5 shrink-0 rounded-full bg-current',
                  isActive ? 'text-primary' : 'text-neutral-400 group-hover:text-neutral-600',
                )}
              />
            </TooltipTrigger>
            <TooltipContent>{liveLabel}</TooltipContent>
          </Tooltip>
          <span className="sr-only">{liveLabel}</span>
        </>
      )}
      <span
        className={cn(
          'max-w-60 truncate font-stretch-extra-condensed font-sans text-2xl tracking-tight uppercase',
          isActive ? 'text-primary' : 'text-neutral-500 group-hover:text-neutral-800',
        )}
      >
        {hostname}
      </span>
      {action && (
        // Two coordinated transitions: this wrapper animates the tab's own
        // width open (which is why it must clip its overflow), while the
        // button inside scales up from nothing — so the icon grows into the
        // space rather than appearing the instant there's room for it.
        //
        // The reveal keys off :focus-visible, not :focus-within — clicking
        // the button leaves it focused, and focus-within would then keep the
        // action stuck open after the pointer left, until something else
        // took focus. :focus-visible only matches keyboard focus, so mouse
        // users get a clean hover-only reveal while the button stays
        // reachable by Tab (a zero-width overflow-hidden element is still
        // focusable).
        <span className="flex w-0 justify-end overflow-hidden transition-[width] duration-200 ease-out group-hover:w-6 group-has-focus-visible:w-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  action.onClick();
                }}
                aria-label={action.label}
                className="flex shrink-0 scale-50 items-center justify-center text-neutral-400 transition-transform duration-200 ease-out group-hover:scale-100 hover:text-neutral-900 focus-visible:scale-100"
              >
                {action.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        </span>
      )}
    </div>
  );
}

// Always rendered, regardless of how many tabs are pinned — pinned tabs and
// the dynamic tab form one list with one styling rule, no separate
// "single-tab" presentation. See SIDEPANEL-TABS-DESIGN.md.
export function PanelTabStrip({
  pinnedTabs,
  dynamicHostname,
  activeHostname,
  isActiveDynamic,
  onSelectPinned,
  onSelectDynamic,
  onUnpin,
  onPinDynamic,
  onAddManual,
}: PanelTabStripProps) {
  // The dynamic tab collapses out of the strip entirely once it duplicates a
  // pinned host — see the state machine in panel-tabs-state.ts, which is
  // also what redirects focus away from it in that case.
  const showDynamicEntry =
    dynamicHostname != null && !pinnedTabs.some((tab) => tab.hostname === dynamicHostname);
  const showDynamicEmpty = !showDynamicEntry && dynamicHostname == null;
  // Separates "tabs you pinned" from "the one following your browser". Only
  // meaningful when both groups are actually present: with no pinned tabs
  // (the initial state) there is nothing to separate, and when the dynamic
  // slot is collapsed the rule would dangle at the end of the strip.
  const showGroupDivider = pinnedTabs.length > 0 && (showDynamicEntry || showDynamicEmpty);

  return (
    <div role="tablist" className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
      {pinnedTabs.map((tab) => (
        <TabEntry
          key={tab.hostname}
          hostname={tab.hostname}
          isActive={!isActiveDynamic && activeHostname === tab.hostname}
          onSelect={() => onSelectPinned(tab.hostname)}
          action={{
            icon: <X className="h-4" />,
            label: browser.i18n.getMessage('panelTabUnpinTooltip'),
            onClick: () => onUnpin(tab.hostname),
          }}
        />
      ))}

      {showGroupDivider && <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />}

      {showDynamicEntry && dynamicHostname && (
        <TabEntry
          hostname={dynamicHostname}
          isActive={isActiveDynamic}
          onSelect={onSelectDynamic}
          isLive
          action={{
            icon: <Pin className="h-4" />,
            label: browser.i18n.getMessage('panelTabPinTooltip'),
            onClick: onPinDynamic,
          }}
        />
      )}

      {showDynamicEmpty && (
        <span className="shrink-0 truncate py-1 font-stretch-extra-condensed font-sans text-2xl tracking-tight text-neutral-300 uppercase">
          {browser.i18n.getMessage('panelTabDynamicEmpty')}
        </span>
      )}

      <AddPanelTabPopover onAdd={onAddManual} />
    </div>
  );
}
