import { Flag } from 'lucide-react';
import { Button } from '@/shared/ui/button';

interface OverrideModeBarProps {
  // Label of the version this tab is pinned to — tag when there is one,
  // otherwise the short id.
  versionLabel: string;
  onClear: () => void;
}

// A pinned override changes what every panel below is describing: you are no
// longer seeing what production does, you are seeing one chosen version. That
// is a *mode*, and a mode has to stay visible for as long as it is on — the
// previous treatment (a sentence of explanatory text under the version legs)
// was far too easy to set and then forget.
export function OverrideModeBar({ versionLabel, onClear }: OverrideModeBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
      <Flag className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 leading-relaxed">
        {browser.i18n.getMessage('overrideModeBarPinned', versionLabel)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-6 shrink-0 border-primary/40 bg-transparent px-2 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
        onClick={onClear}
      >
        {browser.i18n.getMessage('overrideModeBarClear')}
      </Button>
    </div>
  );
}
