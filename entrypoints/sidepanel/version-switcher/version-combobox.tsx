import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/ui/utils';
import type { DisplayVersion } from '@/shared/worker-panel/version-row';

interface VersionComboboxProps {
  ariaLabel: string;
  // Recently-uploaded versions (see version-switcher.tsx) — not limited to
  // ones that have ever been deployed. If `selected` isn't found in this
  // list (e.g. it's a currently-live version older than the fetched batch),
  // the caller is responsible for prepending it — this component doesn't
  // silently lose track of the current selection.
  candidates: DisplayVersion[];
  selected: DisplayVersion | null;
  onSelect: (version: DisplayVersion | null) => void;
  // Only true for the second slot — "no second version" means "the first
  // slot gets 100%", not a third state to model separately.
  allowNone: boolean;
  // Mirrors the slot it sits in, so the trigger reads outward from the
  // boundary the way the version legs either side of the bar do.
  align?: 'left' | 'right';
  disabled?: boolean;
}

const NONE_VALUE = '__none__';

function labelFor(version: DisplayVersion): string {
  return (
    version.tag ??
    browser.i18n.getMessage('versionSwitcherVersionIdLabel', version.versionId.slice(0, 8))
  );
}

// Encodes tag/message/versionId into one searchable string so Command's
// `filter` can do the exact same case-insensitive substring match the old
// hand-rolled VersionPicker did, instead of cmdk's default fuzzy scoring
// (which could quietly change what shows up for a given query).
function searchValue(version: DisplayVersion): string {
  return [version.tag, version.message, version.versionId].filter(Boolean).join(' ');
}

// Styled to match the deployment history menu rather than shadcn's default
// combobox: a rule-underlined trigger instead of a bordered pill, and rows
// separated by hairlines instead of filled chips. The panel's language is
// type and spacing, not boxes — an outline button here read as imported from
// a different product.
//
// The one shadcn part kept is cmdk's filtering: there can be dozens of
// versions, and search is the only way through them.
export function VersionCombobox({
  ariaLabel,
  candidates,
  selected,
  onSelect,
  allowNone,
  align = 'left',
  disabled,
}: VersionComboboxProps) {
  const [open, setOpen] = useState(false);
  const isRight = align === 'right';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          'flex w-full min-w-0 items-center gap-1 border-b border-border pb-1',
          'font-mono text-sm text-foreground transition-colors',
          'hover:border-primary hover:text-primary',
          'focus-visible:border-primary focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isRight && 'flex-row-reverse',
        )}
      >
        <span className="truncate">
          {selected ? labelFor(selected) : browser.i18n.getMessage('deploymentControlNone')}
        </span>
        <ChevronDown
          className={cn('size-3 shrink-0 text-muted-foreground', !isRight && 'ml-auto')}
        />
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align={isRight ? 'end' : 'start'}>
        <Command
          filter={(value, search) => {
            if (value === NONE_VALUE) return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={browser.i18n.getMessage('deploymentControlSearchPlaceholder')}
            className="text-xs"
          />
          <CommandList className="max-h-64 p-1.5">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              {browser.i18n.getMessage('deploymentControlNoResults')}
            </CommandEmpty>
            <CommandGroup className="p-0">
              {allowNone && (
                <CommandItem
                  value={NONE_VALUE}
                  className="rounded-md px-1.5 py-2 font-mono text-xs"
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <span className="truncate text-muted-foreground">
                    {browser.i18n.getMessage('deploymentControlNone')}
                  </span>
                  <Check className={cn('ml-auto size-3.5', selected !== null && 'opacity-0')} />
                </CommandItem>
              )}

              {/* A version uploaded without a tag or message shows only a
                  hash, which tells you nothing about which build it is. The
                  upload time and author come back on the same fetch and are
                  what actually make one hash tellable from another, so every
                  row carries them; a version already taking live traffic says
                  so too, since that is the most useful thing to know while
                  picking. */}
              {candidates.map((version) => (
                <CommandItem
                  key={version.versionId}
                  value={searchValue(version)}
                  className="flex-col items-start gap-0.5 rounded-md border-t border-border/60 px-1.5 py-2 first:border-t-0"
                  onSelect={() => {
                    onSelect(version);
                    setOpen(false);
                  }}
                >
                  <div className="flex w-full items-center gap-1.5">
                    <span className="truncate font-mono text-xs text-foreground">
                      {labelFor(version)}
                    </span>
                    {version.percentage !== null && (
                      <span className="shrink-0 rounded-sm border border-primary/40 bg-primary/10 px-1 font-mono text-[8.5px] text-primary">
                        {browser.i18n.getMessage('versionComboboxLive', String(version.percentage))}
                      </span>
                    )}
                    <Check
                      className={cn(
                        'ml-auto size-3.5 shrink-0',
                        selected?.versionId !== version.versionId && 'opacity-0',
                      )}
                    />
                  </div>

                  <div className="flex w-full min-w-0 items-center gap-1.5 font-mono text-[9.5px] text-muted-foreground">
                    {version.tag && (
                      <span className="shrink-0">{version.versionId.slice(0, 8)}</span>
                    )}
                    {version.createdOn && (
                      <span className="shrink-0">
                        {new Date(version.createdOn).toLocaleString()}
                      </span>
                    )}
                    {version.authorEmail && <span className="truncate">{version.authorEmail}</span>}
                  </div>

                  {version.message && (
                    <span className="w-full truncate text-[11px] text-muted-foreground italic">
                      {version.message}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
