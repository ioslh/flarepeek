import { useEffect, useState } from 'react';

const ARM_TIMEOUT_MS = 3000;

interface ConfirmButtonProps {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  className: string;
  confirmClassName: string;
}

// Two-step confirm for actions that change real production traffic: first
// click arms it (label swaps to a warning state for a few seconds), second
// click within that window actually fires. Deliberately not window.confirm()
// — a native dialog can steal focus and close the extension popup.
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  className,
  confirmClassName,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={armed ? confirmClassName : className}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
