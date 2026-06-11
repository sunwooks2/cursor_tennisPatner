interface TennisBallIconProps {
  className?: string;
  animated?: boolean;
}

export function TennisBallIcon({ className = "h-5 w-5", animated = false }: TennisBallIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={`shrink-0 ${animated ? "generation-toast-ball" : ""} ${className}`.trim()}
      aria-hidden
    >
      <circle cx="16" cy="16" r="13.5" fill="#b8e600" />
      <circle cx="16" cy="16" r="12.5" fill="#ccff00" stroke="#5a7200" strokeWidth="1.5" />
      <path
        d="M16 4.5 C10 10.5 10 21.5 16 27.5"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <path
        d="M16 4.5 C22 10.5 22 21.5 16 27.5"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <ellipse cx="12.5" cy="11" rx="3.5" ry="2" fill="white" opacity="0.35" transform="rotate(-25 12.5 11)" />
    </svg>
  );
}
