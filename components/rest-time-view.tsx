interface RestTimeViewProps {
  className?: string;
}

export function RestTimeView({ className = "" }: RestTimeViewProps) {
  return (
    <span className={`text-sm text-[var(--muted)] ${className}`.trim()}>
      휴식 타임
    </span>
  );
}
