import { TokenListItem } from '@/entrypoints/options/token-list-item';
import type { StoredToken } from '@/shared/storage/token-storage';

interface TokenListProps {
  tokens: StoredToken[];
}

export function TokenList({ tokens }: TokenListProps) {
  if (tokens.length === 0) {
    return <p className="text-sm text-neutral-500">{browser.i18n.getMessage('optionsNoTokens')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {tokens.map((token) => (
        <TokenListItem key={token.id} token={token} />
      ))}
    </ul>
  );
}
