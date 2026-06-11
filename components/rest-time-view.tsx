interface RestTimeViewProps {
  className?: string;
}

function RestBallIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <circle cx="10" cy="10" r="8" fill="#f0ffbf" stroke="#b8e600" strokeWidth="1.2" />
      <path
        d="M10 3.5 C7 7 7 13 10 16.5"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M6.5 9.2 Q7.6 8.4 8.6 9.2"
        stroke="#5a7200"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M11.4 9.2 Q12.4 8.4 13.5 9.2"
        stroke="#5a7200"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M13.8 4.8 L14.8 3.8 M14.8 4.8 L13.8 3.8"
        stroke="#8aa4c0"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <circle cx="15.3" cy="3.3" r="0.55" fill="#8aa4c0" />
    </svg>
  );
}

export function RestTimeView({ className = "" }: RestTimeViewProps) {
  return (
    <span className={`rest-time-badge ${className}`.trim()}>
      <RestBallIcon />
      <span>휴식 타임</span>
    </span>
  );
}
