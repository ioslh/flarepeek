import { useState } from 'react';
import { Plus } from 'lucide-react';
import { parseHostnameInput } from '@/entrypoints/sidepanel/tabs/parse-hostname-input';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

interface AddPanelTabPopoverProps {
  onAdd: (hostname: string) => void;
}

// Only rendered once the tab strip itself exists (≥1 pinned tab) — see
// SIDEPANEL-TABS-DESIGN.md's progressive-disclosure rule. Lets the user pin
// a hostname they haven't actually navigated to yet (e.g. to debug it),
// unlike the dynamic tab's pin button which can only ever pin what the
// active browser tab is currently showing.
export function AddPanelTabPopover({ onAdd }: AddPanelTabPopoverProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const parsed = parseHostnameInput(value);
  const showError = value.trim() !== '' && !parsed;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setValue('');
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              aria-label={browser.i18n.getMessage('panelTabAddTooltip')}
            >
              <Plus className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{browser.i18n.getMessage('panelTabAddTooltip')}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-64">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!parsed) return;
            onAdd(parsed);
            setValue('');
            setOpen(false);
          }}
        >
          <Label htmlFor="add-panel-tab-hostname">
            {browser.i18n.getMessage('panelTabAddLabel')}
          </Label>
          <Input
            id="add-panel-tab-hostname"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={browser.i18n.getMessage('panelTabAddPlaceholder')}
          />
          {showError && (
            <p className="text-xs text-destructive">
              {browser.i18n.getMessage('panelTabAddInvalid')}
            </p>
          )}
          <Button type="submit" size="sm" disabled={!parsed}>
            {browser.i18n.getMessage('panelTabAddSubmit')}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
