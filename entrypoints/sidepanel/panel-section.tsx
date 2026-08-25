import type { ReactNode } from 'react';
import { cn } from '@/shared/ui/utils';

// The one heading treatment every content section shares. Small condensed
// uppercase — the same type family as the tab strip's hostnames, shrunk and
// greyed so it reads as a label under them rather than competing with them.
// Exported for the few places that need to put this style on their own
// element (e.g. an accordion trigger that *is* the heading).
export const PANEL_SECTION_HEADING_CLASS =
  'font-stretch-extra-condensed font-sans text-[10px] tracking-wider uppercase';

interface PanelSectionProps {
  title?: string;
  // Replaces `title` outright when the heading needs to be interactive —
  // the deployment section's heading is a button that opens its history.
  titleSlot?: ReactNode;
  // Turns the heading into a link to the Cloudflare dashboard.
  titleHref?: string;
  // 'accent' marks a section that's in an active/editing state — currently
  // just the deployment bar while composing a change.
  titleTone?: 'default' | 'accent';
  // Rendered opposite the heading, e.g. a refresh or expand control.
  action?: ReactNode;
  // Rendered full-width *above* the heading. For state that qualifies
  // everything in the section — currently the override mode bar.
  banner?: ReactNode;
  children: ReactNode;
  className?: string;
}

// Replaces the per-panel shadcn Card. The sidepanel's content is a single
// scrolling document, not a stack of boxes: sections are separated by the
// thin rules that version-switcher.tsx draws between them (`divide-y`) plus
// this component's own vertical padding, so nothing needs a border of its
// own. That keeps the deployment bar's dark track as the only heavy block
// on the page.
export function PanelSection({
  title,
  titleSlot,
  titleHref,
  titleTone = 'default',
  action,
  banner,
  children,
  className,
}: PanelSectionProps) {
  const toneClass = titleTone === 'accent' ? 'text-primary' : 'text-neutral-400';

  return (
    <section className={cn('flex flex-col gap-2 py-4', className)}>
      {banner}
      {(title || titleSlot || action) && (
        <div className="flex items-center justify-between gap-2">
          {titleSlot}
          {title &&
            (titleHref ? (
              <a
                href={titleHref}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  PANEL_SECTION_HEADING_CLASS,
                  toneClass,
                  'w-fit transition-colors hover:text-neutral-700',
                )}
              >
                {title}
              </a>
            ) : (
              <span className={cn(PANEL_SECTION_HEADING_CLASS, toneClass)}>{title}</span>
            ))}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
