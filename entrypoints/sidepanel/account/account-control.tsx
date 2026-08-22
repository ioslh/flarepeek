import { ChevronDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import type { StoredToken } from '@/shared/storage/token-storage';

interface AccountControlProps {
  tokens: StoredToken[];
  forcedTokenId: string | null;
  // null while nothing has resolved yet (no tokens stored, or lookup still
  // in flight) — the chip falls back to a settings label in that case, since
  // this control is sidepanel's only settings entry point regardless of
  // whether an account has resolved.
  resolvedToken: StoredToken | null;
  onSelect: (tokenId: string | null) => void;
}

const AUTO_VALUE = '__auto__';

// Sidepanel's single entry point for "which account is this" + "switch
// account" + "manage tokens" — replaces the old TokenSwitcher (a native
// <select>, whose rendered width grows with the selected option's text —
// broke layout with long email labels) plus a separately-placed settings
// gear icon. A fixed max-width + truncate on the trigger button means a long
// label just gets clipped inside the chip instead of resizing anything.
export function AccountControl({
  tokens,
  forcedTokenId,
  resolvedToken,
  onSelect,
}: AccountControlProps) {
  const label = resolvedToken
    ? resolvedToken.label
    : browser.i18n.getMessage('sidepanelOpenSettings');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-36 shrink-0">
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {tokens.length > 0 && (
          <>
            <DropdownMenuRadioGroup
              value={forcedTokenId ?? AUTO_VALUE}
              onValueChange={(value) => onSelect(value === AUTO_VALUE ? null : value)}
            >
              <DropdownMenuRadioItem value={AUTO_VALUE}>
                {browser.i18n.getMessage('tokenSwitcherAuto')}
              </DropdownMenuRadioItem>
              {tokens.map((token) => (
                <DropdownMenuRadioItem key={token.id} value={token.id}>
                  <span className="truncate">{token.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => browser.runtime.openOptionsPage()}>
          {browser.i18n.getMessage('accountControlManageTokens')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
