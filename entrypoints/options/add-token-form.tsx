import { useState, type FormEvent } from 'react';
import { useAddToken } from '@/entrypoints/options/use-add-token';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';

export function AddTokenForm() {
  const [token, setToken] = useState('');
  const [label, setLabel] = useState('');
  const { state, submitToken, confirmLabel, reset } = useAddToken();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (state.status === 'needs-label') {
      void confirmLabel(label.trim());
      return;
    }

    void submitToken(token);
  };

  if (state.status === 'success') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-green-600">
          {browser.i18n.getMessage('optionsAddTokenSuccess')}
        </p>
        <Button
          type="button"
          variant="link"
          className="h-auto self-start p-0"
          onClick={() => {
            setToken('');
            setLabel('');
            reset();
          }}
        >
          {browser.i18n.getMessage('optionsAddTokenHeading')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {state.status !== 'needs-label' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-api-token">{browser.i18n.getMessage('optionsTokenLabel')}</Label>
          <Input
            id="new-api-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={browser.i18n.getMessage('optionsTokenPlaceholder')}
          />
        </div>
      )}

      {state.status === 'needs-label' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="token-label">{browser.i18n.getMessage('optionsTokenNameLabel')}</Label>
          <Input
            id="token-label"
            type="text"
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={browser.i18n.getMessage('optionsTokenNamePlaceholder')}
          />
          <p className="text-xs text-muted-foreground">
            {browser.i18n.getMessage('optionsTokenNameHelp')}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={
          state.status === 'verifying' ||
          (state.status === 'needs-label' ? label.trim().length === 0 : token.trim().length === 0)
        }
      >
        {state.status === 'verifying'
          ? browser.i18n.getMessage('optionsVerifying')
          : state.status === 'needs-label'
            ? browser.i18n.getMessage('optionsTokenNameSave')
            : browser.i18n.getMessage('optionsAddTokenButton')}
      </Button>

      {state.status === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>
            {browser.i18n.getMessage(cloudflareErrorMessageKey(state.kind))}
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
