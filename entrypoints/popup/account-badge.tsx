import type { StoredToken } from '@/shared/storage/token-storage';

interface AccountBadgeProps {
  resolvedToken: StoredToken;
}

// Read-only — popup doesn't offer switching (that's a low-frequency
// correction, deferred to the side panel's AccountControl). Plain truncated
// text, so a long email-as-label never affects the popup's width the way the
// old native <select> did.
export function AccountBadge({ resolvedToken }: AccountBadgeProps) {
  return (
    <p className="truncate text-xs text-muted-foreground">
      {browser.i18n.getMessage('tokenSwitcherResolvedLabel', resolvedToken.label)}
    </p>
  );
}
