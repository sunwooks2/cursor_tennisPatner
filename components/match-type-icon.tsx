import type { MatchType } from "@/lib/types";

interface MatchTypeIconProps {
  type: MatchType;
  className?: string;
}

function MaleFigure({ x, tone }: { x: number; tone: string }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <circle cx="5" cy="4.5" r="3.2" fill={tone} />
      <path
        d="M2.2 8.2 Q5 7.2 7.8 8.2 L8.4 13.8 Q5 15.2 1.6 13.8 Z"
        fill={tone}
      />
    </g>
  );
}

function FemaleFigure({ x, tone, hairTone }: { x: number; tone: string; hairTone: string }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <circle cx="3.6" cy="2.4" r="1.15" fill={hairTone} />
      <circle cx="6.4" cy="2.4" r="1.15" fill={hairTone} />
      <circle cx="5" cy="5" r="3.2" fill={tone} />
      <path
        d="M1.8 8.5 Q5 7.6 8.2 8.5 L9.6 12.8 Q5 16.2 0.4 12.8 Z"
        fill={tone}
      />
    </g>
  );
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
