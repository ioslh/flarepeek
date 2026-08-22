import { useState, type FormEvent } from 'react';
import { useAddToken } from '@/entrypoints/options/use-add-token';
import { cloudflareErrorMessageKey } from '@/shared/cloudflare-api/error-message-key';

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
        <button
          type="button"
          onClick={() => {
            setToken('');
            setLabel('');
            reset();
          }}
          className="self-start text-sm text-orange-600 underline"
        >
          {browser.i18n.getMessage('optionsAddTokenHeading')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {state.status !== 'needs-label' && (
        <>
          <label htmlFor="new-api-token" className="text-sm font-medium text-neutral-700">
            {browser.i18n.getMessage('optionsTokenLabel')}
          </label>
          <input
            id="new-api-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={browser.i18n.getMessage('optionsTokenPlaceholder')}
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </>
      )}

      {state.status === 'needs-label' && (
        <>
          <label htmlFor="token-label" className="text-sm font-medium text-neutral-700">
            {browser.i18n.getMessage('optionsTokenNameLabel')}
          </label>
          <input
            id="token-label"
            type="text"
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={browser.i18n.getMessage('optionsTokenNamePlaceholder')}
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-neutral-500">
            {browser.i18n.getMessage('optionsTokenNameHelp')}
          </p>
        </>
      )}

      <button
        type="submit"
        disabled={
          state.status === 'verifying' ||
          (state.status === 'needs-label' ? label.trim().length === 0 : token.trim().length === 0)
        }
        className="rounded bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {state.status === 'verifying'
          ? browser.i18n.getMessage('optionsVerifying')
          : state.status === 'needs-label'
            ? browser.i18n.getMessage('optionsTokenNameSave')
            : browser.i18n.getMessage('optionsAddTokenButton')}
      </button>

      {state.status === 'error' && (
        <p className="text-sm text-red-600">
          {browser.i18n.getMessage(cloudflareErrorMessageKey(state.kind))}
        </p>
      )}
    </form>
  );
}
