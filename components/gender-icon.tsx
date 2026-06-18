interface FigureProps {
  x: number;
  tone: string;
  hairTone?: string;
}

export function MaleFigure({ x, tone }: FigureProps) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <circle cx="5" cy="4.5" r="3.2" fill={tone} />
      <path d="M2.2 8.2 Q5 7.2 7.8 8.2 L8.4 13.8 Q5 15.2 1.6 13.8 Z" fill={tone} />
    </g>
  );
}

export function FemaleFigure({ x, tone, hairTone }: FigureProps & { hairTone: string }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <circle cx="3.6" cy="2.4" r="1.15" fill={hairTone} />
      <circle cx="6.4" cy="2.4" r="1.15" fill={hairTone} />
      <circle cx="5" cy="5" r="3.2" fill={tone} />
      <path d="M1.8 8.5 Q5 7.6 8.2 8.5 L9.6 12.8 Q5 16.2 0.4 12.8 Z" fill={tone} />
    </g>
  );
}

interface GenderIconProps {
  gender: "male" | "female";
  className?: string;
}

export function GenderIcon({ gender, className = "h-4 w-[0.625rem]" }: GenderIconProps) {
  if (gender === "male") {
    return (
      <svg viewBox="0 0 10 16" fill="none" className={`shrink-0 ${className}`.trim()} aria-hidden>
        <MaleFigure x={0} tone="#5b9bd5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 10 16" fill="none" className={`shrink-0 ${className}`.trim()} aria-hidden>
      <FemaleFigure x={0} tone="#ec7eb0" hairTone="#f4a6c8" />
    </svg>
  );
}
