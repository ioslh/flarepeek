import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

// Identical data + identical interaction in both popup and sidepanel (open
// Options) — belongs here per shared/worker-panel/'s own rule rather than
// staying duplicated inline in each entrypoint's root component.
export function NoTokenEmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{browser.i18n.getMessage('sidepanelTokenMissingTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {browser.i18n.getMessage('sidepanelTokenMissingBody')}
        </p>
        <Button className="self-start" onClick={() => browser.runtime.openOptionsPage()}>
          {browser.i18n.getMessage('sidepanelOpenSettings')}
        </Button>
      </CardContent>
    </Card>
  );
}
