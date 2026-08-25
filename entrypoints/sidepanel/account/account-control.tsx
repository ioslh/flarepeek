import { KeyRound } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/ui/utils';
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
// account" + "manage tokens", sitting to the right of the tab strip in the
// shared header.
//
// Styled to share the tab strip's interaction grammar rather than just its
// palette: at rest it collapses to a bare monogram so the full width goes to
// the tabs, and hovering expands the account name leftward with the same
// width transition the tabs' hover actions use — that shared *motion* is
// what makes the two read as one system. Locked (user-forced) vs
// auto-detected is carried by the monogram's color, reusing the same
// "you decided vs the system decided" vocabulary as the tab strip's live dot.
export function AccountControl({
  tokens,
  forcedTokenId,
  resolvedToken,
  onSelect,
}: AccountControlProps) {
  const label = resolvedToken
    ? resolvedToken.label
    : browser.i18n.getMessage('sidepanelOpenSettings');
  const isLocked = forcedTokenId !== null;
  const monogram = resolvedToken?.label.trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={browser.i18n.getMessage(
            isLocked ? 'accountControlLockedLabel' : 'accountControlAutoLabel',
            label,
          )}
          className="group/account flex shrink-0 cursor-pointer items-center rounded-md outline-none"
        >
          {/* The 0fr→1fr grid trick animates to the label's *natural* width,
              which a fixed w-* target can't do for names of unknown length.
              Stays expanded while the menu is open (data-state) so the label
              doesn't collapse out from under the user mid-choice. */}
          <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-200 ease-out group-hover/account:grid-cols-[1fr] group-focus-visible/account:grid-cols-[1fr] group-data-[state=open]/account:grid-cols-[1fr]">
            <span className="min-w-0 overflow-hidden">
              <span
                className={cn(
                  'block max-w-40 truncate pr-1.5 font-stretch-extra-condensed font-sans text-xs tracking-tight uppercase',
                  isLocked ? 'text-primary' : 'text-neutral-500',
                )}
              >
                {label}
              </span>
            </span>
          </span>
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors',
              isLocked
                ? 'bg-primary text-primary-foreground'
                : 'bg-neutral-200 text-neutral-600 group-hover/account:bg-neutral-300',
            )}
          >
            {monogram ?? <KeyRound className="size-3" />}
          </span>
        </button>
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
