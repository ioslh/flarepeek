import { useState } from 'react';
import { removeToken, updateTokenLabel, type StoredToken } from '@/shared/storage/token-storage';

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
    <li className="flex items-center justify-between gap-2 rounded border border-neutral-200 px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={handleBlur}
          className="truncate rounded border border-transparent px-1 text-sm font-medium text-neutral-900 hover:border-neutral-300 focus:border-neutral-300 focus:outline-none"
        />
        {token.email && (
          <span className="truncate px-1 text-xs text-neutral-500">{token.email}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => void removeToken(token.id)}
        className="shrink-0 text-xs text-red-600 hover:underline"
      >
        {browser.i18n.getMessage('optionsRemoveToken')}
      </button>
    </li>
  );
}
