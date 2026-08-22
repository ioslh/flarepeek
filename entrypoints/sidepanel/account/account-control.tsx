import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const label = resolvedToken
    ? resolvedToken.label
    : browser.i18n.getMessage('sidepanelOpenSettings');

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex max-w-36 items-center gap-1 rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        <span className="truncate">{label}</span>
        <ChevronIcon />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {tokens.length > 0 && (
            <>
              <MenuItem
                selected={forcedTokenId === null}
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
              >
                {browser.i18n.getMessage('tokenSwitcherAuto')}
              </MenuItem>
              {tokens.map((token) => (
                <MenuItem
                  key={token.id}
                  selected={forcedTokenId === token.id}
                  onClick={() => {
                    onSelect(token.id);
                    setIsOpen(false);
                  }}
                >
                  {token.label}
                </MenuItem>
              ))}
              <div className="my-1 border-t border-neutral-100" />
            </>
          )}
          <MenuItem
            onClick={() => {
              browser.runtime.openOptionsPage();
              setIsOpen(false);
            }}
          >
            {browser.i18n.getMessage('accountControlManageTokens')}
          </MenuItem>
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  children: ReactNode;
  onClick: () => void;
  selected?: boolean;
}

function MenuItem({ children, onClick, selected }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-50"
    >
      <span className="w-3 shrink-0 text-orange-600">{selected ? '✓' : ''}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-neutral-400"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
