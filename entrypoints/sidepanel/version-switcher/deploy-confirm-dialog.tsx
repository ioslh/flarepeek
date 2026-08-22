import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import type { DeploymentVersion } from '@/shared/cloudflare-api/deployments';

interface DeployConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposed: DeploymentVersion[];
  // versionId -> tag-or-hash label, so the dialog can show something more
  // meaningful than a raw version id in its summary.
  versionLabels: Map<string, string>;
  message: string | null;
  isSubmitting: boolean;
  onConfirm: () => void;
}

// Replaces the old ConfirmButton (click once to arm, click again within 3s
// to actually fire) — that pattern deliberately avoided window.confirm()
// because a native dialog could steal focus and close the extension popup,
// but this control only ever lives in the sidepanel (a persistent page, not
// a popup that closes on blur), and AlertDialog is an in-app Radix overlay,
// not a native modal — so a real confirmation dialog is safe here and gives
// a clearer summary of what's about to change than a relabeled button did.
export function DeployConfirmDialog({
  open,
  onOpenChange,
  proposed,
  versionLabels,
  message,
  isSubmitting,
  onConfirm,
}: DeployConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {browser.i18n.getMessage('deploymentSplitConfirmDialogTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {browser.i18n.getMessage('deploymentSplitConfirmDialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="flex flex-col gap-1 text-sm">
          {proposed.map((version) => (
            <li key={version.versionId} className="flex items-center justify-between gap-2">
              <span className="truncate text-foreground">
                {versionLabels.get(version.versionId) ?? version.versionId}
              </span>
              <span className="shrink-0 font-medium text-foreground">{version.percentage}%</span>
            </li>
          ))}
        </ul>
        {message && <p className="text-sm text-muted-foreground italic">{message}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel>
            {browser.i18n.getMessage('deploymentSplitConfirmDialogCancel')}
          </AlertDialogCancel>
          <AlertDialogAction disabled={isSubmitting} onClick={onConfirm}>
            {browser.i18n.getMessage('deploymentSplitConfirmDialogConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
