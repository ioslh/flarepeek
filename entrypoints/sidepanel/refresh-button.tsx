interface RefreshButtonProps {
  onClick: () => void;
}

// Manually bypasses the worker-lookup cache (see
// shared/worker-panel/use-worker-lookup.ts) for the pinned hostname — the
// panel otherwise never refetches an already-resolved worker on its own.
export function RefreshButton({ onClick }: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={browser.i18n.getMessage('refreshButtonLabel')}
      className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 4v6h-6" />
      </svg>
    </button>
  );
}
