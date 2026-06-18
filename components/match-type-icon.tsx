import type { MatchType } from "@/lib/types";
import { FemaleFigure, MaleFigure } from "@/components/gender-icon";

interface MatchTypeIconProps {
  type: MatchType;
  className?: string;
}

export function MatchTypeIcon({ type, className = "h-[1.125rem] w-[1.125rem]" }: MatchTypeIconProps) {
  if (type === "MD") {
    return (
      <svg viewBox="0 0 24 16" fill="none" className={`shrink-0 ${className}`.trim()} aria-hidden>
        <MaleFigure x={1} tone="#5b9bd5" />
        <MaleFigure x={12} tone="#89b8e8" />
      </svg>
    );
  }

  if (type === "WD") {
    return (
      <svg viewBox="0 0 24 16" fill="none" className={`shrink-0 ${className}`.trim()} aria-hidden>
        <FemaleFigure x={1} tone="#ec7eb0" hairTone="#f4a6c8" />
        <FemaleFigure x={12} tone="#f2a0c4" hairTone="#f8bdd6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 16" fill="none" className={`shrink-0 ${className}`.trim()} aria-hidden>
      <MaleFigure x={0} tone="#5b9bd5" />
      <FemaleFigure x={11} tone="#ec7eb0" hairTone="#f4a6c8" />
    </svg>
  );
}
