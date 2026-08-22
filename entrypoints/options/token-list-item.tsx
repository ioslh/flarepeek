import { useState } from 'react';
import { removeToken, updateTokenLabel, type StoredToken } from '@/shared/storage/token-storage';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';

interface TokenListItemProps {
  token: StoredToken;
}

export function TokenListItem({ token }: TokenListItemProps) {
  const [label, setLabel] = useState(token.label);

  const handleBlur = () => {
    const trimmed = label.trim();
    if (trimmed && trimmed !== token.label) {
      void updateTokenLabel(token.id, trimmed);
    } else {
      setLabel(token.label);
    }
  };

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={handleBlur}
          className="h-auto border-transparent px-1 py-0 text-sm font-medium shadow-none hover:border-input focus-visible:border-input"
        />
        {token.email && (
          <span className="truncate px-1 text-xs text-muted-foreground">{token.email}</span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 text-destructive hover:text-destructive"
        onClick={() => void removeToken(token.id)}
      >
        {browser.i18n.getMessage('optionsRemoveToken')}
      </Button>
    </li>
  );
}
