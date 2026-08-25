import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

interface ManualDetectionPendingProps {
  onDetect: () => void;
}

// Shown in the dynamic tab's content area instead of VersionSwitcher while
// manual-detection mode is on and this hostname hasn't been checked yet —
// see entrypoints/sidepanel/tabs/panel-tab-pane.tsx. Mirrors
// shared/worker-panel/no-token-empty-state.tsx's structure. onDetect is the
// exact same handler the header's RefreshButton uses in this state — this
// button is a second, more visible entry point to it, not a separate action.
export function ManualDetectionPending({ onDetect }: ManualDetectionPendingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{browser.i18n.getMessage('manualDetectionPendingTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {browser.i18n.getMessage('manualDetectionPendingBody')}
        </p>
        <Button className="self-start" onClick={onDetect}>
          {browser.i18n.getMessage('manualDetectionPendingButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
