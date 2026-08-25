import { ChevronDown } from 'lucide-react';
import { PANEL_SECTION_HEADING_CLASS } from '@/entrypoints/sidepanel/panel-section';
import { formatPercentage } from '@/entrypoints/sidepanel/version-switcher/percentage-ladder';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/ui/utils';
import type { DeploymentHistoryEntry } from '@/shared/cloudflare-api/deployments';

interface DeploymentHistoryMenuProps {
  history: DeploymentHistoryEntry[];
  // Short id of the deployment currently serving traffic — always
  // history[0] in practice, passed explicitly so the trigger renders
  // correctly even if the list came back empty.
  currentId: string;
  // Deep link to the Worker's full deployment history in the dashboard —
  // this menu only shows what one API page returned.
  historyHref: string;
  tone: 'default' | 'accent';
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

// The deployment id is the section's heading: it's the identity you can
// cross-reference against wrangler and the dashboard, whereas the old
// "· two versions" restated what the bar already shows.
//
// The menu is strictly read-only. Making a row clickable would mean
// "roll back to this", and a production traffic change has no business
// hiding inside a reference dropdown — rollback belongs in the edit surface
// where it gets the same hold-to-confirm gate as any other deploy.
export function DeploymentHistoryMenu({
  history,
  currentId,
  historyHref,
  tone,
}: DeploymentHistoryMenuProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          PANEL_SECTION_HEADING_CLASS,
          'flex min-w-0 flex-1 items-center gap-1 rounded-sm text-left tracking-normal normal-case',
          'font-mono text-xs',
          tone === 'accent' ? 'text-primary' : 'text-foreground hover:text-primary',
        )}
      >
        <span className="truncate">
          {browser.i18n.getMessage('deploymentBarHeadingCurrent', shortId(currentId))}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent align="start" className="max-h-72 w-72 overflow-y-auto p-1.5">
        <div className="flex items-baseline justify-between gap-2 px-1.5 pt-1 pb-2">
          <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">
            {browser.i18n.getMessage('deploymentHistoryCaption')}
          </p>
          <a
            href={historyHref}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[10px] text-muted-foreground hover:text-primary hover:underline"
          >
            {browser.i18n.getMessage('deploymentHistoryOpenAll')}
          </a>
        </div>

        {history.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              'rounded-md border-t border-border/60 px-1.5 py-2 first-of-type:border-t-0',
              entry.id === currentId && 'bg-muted',
            )}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[11px] text-foreground">{shortId(entry.id)}</span>
              {entry.id === currentId && (
                <span className="rounded-sm border border-primary/40 bg-primary/10 px-1 font-mono text-[8.5px] text-primary">
                  {browser.i18n.getMessage('deploymentHistoryCurrent')}
                </span>
              )}
              {entry.createdOn && (
                <span className="ml-auto shrink-0 font-mono text-[9.5px] text-muted-foreground">
                  {new Date(entry.createdOn).toLocaleString()}
                </span>
              )}
            </div>

            {entry.message && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{entry.message}</p>
            )}

            {/* A miniature of the deployment bar, same two colours, so the
                rollout's trajectory reads down the list at a glance. */}
            <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-muted">
              {entry.versions.map((version, index) => (
                <span
                  key={version.versionId}
                  className={cn('h-full', index === 0 ? 'bg-neutral-700' : 'bg-primary')}
                  style={{ width: `${version.percentage}%` }}
                />
              ))}
            </div>

            <p className="mt-1 font-mono text-[9px] text-muted-foreground">
              {entry.versions
                .map((v) => `${shortId(v.versionId)} ${formatPercentage(v.percentage)}%`)
                .join('  ·  ')}
            </p>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
