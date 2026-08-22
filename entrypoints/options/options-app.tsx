import { TokenList } from '@/entrypoints/options/token-list';
import { AddTokenForm } from '@/entrypoints/options/add-token-form';
import { useTokens } from '@/shared/storage/use-tokens';
import { CREATE_API_TOKEN_URL } from '@/shared/cloudflare-api/create-token-url';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

export function OptionsApp() {
  const tokens = useTokens();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold text-foreground">
        {browser.i18n.getMessage('optionsHeading')}
      </h1>

      <Card className="py-4">
        <CardContent className="px-4">
          <TokenList tokens={tokens ?? []} />
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle>{browser.i18n.getMessage('optionsAddTokenHeading')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-4">
          <a
            href={CREATE_API_TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            {browser.i18n.getMessage('optionsCreateTokenLink')}
          </a>
          <p className="text-xs text-muted-foreground">
            {browser.i18n.getMessage('optionsTokenHelp')}
          </p>
          <AddTokenForm />
        </CardContent>
      </Card>
    </main>
  );
}
