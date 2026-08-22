import { TokenList } from '@/entrypoints/options/token-list';
import { AddTokenForm } from '@/entrypoints/options/add-token-form';
import { useTokens } from '@/shared/storage/use-tokens';
import { CREATE_API_TOKEN_URL } from '@/shared/cloudflare-api/create-token-url';

export function OptionsApp() {
  const tokens = useTokens();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold text-neutral-900">
        {browser.i18n.getMessage('optionsHeading')}
      </h1>

      <TokenList tokens={tokens ?? []} />

      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <p className="text-sm font-medium text-neutral-900">
          {browser.i18n.getMessage('optionsAddTokenHeading')}
        </p>
        <a
          href={CREATE_API_TOKEN_URL}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-orange-600 underline"
        >
          {browser.i18n.getMessage('optionsCreateTokenLink')}
        </a>
        <p className="text-xs text-neutral-500">{browser.i18n.getMessage('optionsTokenHelp')}</p>
        <AddTokenForm />
      </div>
    </main>
  );
}
