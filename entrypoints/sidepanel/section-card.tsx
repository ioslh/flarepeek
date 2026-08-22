import type { ReactNode } from 'react';

interface SectionCardProps {
  children: ReactNode;
  // 'default' (unstyled param, current white-card look) for content that
  // deserves normal visual weight on its own (e.g. Recent Errors — diagnostic
  // signal, not just reference material). 'primary' marks the single
  // highest-frequency action area (version switching). 'muted' de-emphasizes
  // pure reference/lookup content (Recent Versions, Bindings) so the page
  // reads as operate-first, reference-second instead of one flat stack of
  // identical cards.
  tone?: 'default' | 'primary' | 'muted';
}

const TONE_CLASSES: Record<NonNullable<SectionCardProps['tone']>, string> = {
  default: 'border-neutral-200 bg-white',
  primary: 'border-neutral-200 border-l-2 border-l-orange-500 bg-white',
  muted: 'border-neutral-100 bg-neutral-50',
};

export function SectionCard({ children, tone = 'default' }: SectionCardProps) {
  return (
    <section className={`flex flex-col gap-2 rounded-lg border p-3 ${TONE_CLASSES[tone]}`}>
      {children}
    </section>
  );
}
