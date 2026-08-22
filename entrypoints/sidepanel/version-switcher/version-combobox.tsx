import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
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

export function VersionCombobox({
  ariaLabel,
  candidates,
  selected,
  onSelect,
  allowNone,
  disabled,
}: VersionComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className="w-full min-w-0 justify-between font-normal"
        >
          <span className="truncate">
            {selected ? labelFor(selected) : browser.i18n.getMessage('deploymentControlNone')}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command
          filter={(value, search) => {
            if (value === NONE_VALUE) return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={browser.i18n.getMessage('deploymentControlSearchPlaceholder')}
          />
          <CommandList className="max-h-56">
            <CommandEmpty>{browser.i18n.getMessage('deploymentControlNoResults')}</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value={NONE_VALUE}
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">
                    {browser.i18n.getMessage('deploymentControlNone')}
                  </span>
                  <Check className={cn('ml-auto size-4', selected !== null && 'opacity-0')} />
                </CommandItem>
              )}
              {candidates.map((version) => (
                <CommandItem
                  key={version.versionId}
                  value={searchValue(version)}
                  onSelect={() => {
                    onSelect(version);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{labelFor(version)}</span>
                  <Check
                    className={cn(
                      'ml-auto size-4',
                      selected?.versionId !== version.versionId && 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
